#!/usr/bin/env python3
"""Synthetic, rights-gated photo/segmentation benchmark for APOMONET Vision v2.

Legal museum coin images from the frozen Visual Lab manifest are converted into
high-confidence foreground specimens and composited on controlled backgrounds.
Only aggregate metrics are persisted; source image bytes and generated frames
remain in the ignored temporary cache.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import os
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import cv2
import numpy as np
import torch


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "lab/corpus/visual-corpus-manifest-2026-09-10.json"
DEFAULT_CACHE = ROOT / ".lab-image-cache"
DEFAULT_OUTPUT = ROOT / "lab/results/vision-v2-segmentation-2026-09-30.json"
DEFAULT_PROGRESS = ROOT / ".lab-feature-cache/segmentation-progress-2026-09-30.json"
DEPS = ROOT.parent / "vision_deps"
SCENARIOS = (
    "plain-light",
    "plain-dark",
    "patterned",
    "shadow",
    "glare",
    "overexposed",
    "slight-angle",
    "strong-angle",
    "blurred",
    "cropped-rim",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--progress", type=Path, default=DEFAULT_PROGRESS)
    parser.add_argument("--samples", type=int, default=28)
    parser.add_argument("--skip-mobile-sam", action="store_true")
    parser.add_argument("--skip-sam2", action="store_true")
    return parser.parse_args()


def load_retrieval_module():
    path = ROOT / "scripts/lab-vision-v2-retrieval.py"
    spec = importlib.util.spec_from_file_location("apomonet_vision_v2_retrieval", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def cache_path(cache_dir: Path, url: str) -> Path:
    return cache_dir / (hashlib.sha256(url.encode("utf-8")).hexdigest() + ".img")


def read_rgb(path: Path) -> np.ndarray:
    raw = np.fromfile(path, dtype=np.uint8)
    bgr = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError(path.name)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def contour_properties(mask: np.ndarray):
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
    contour = max(contours, key=cv2.contourArea)
    area = float(cv2.contourArea(contour))
    perimeter = float(cv2.arcLength(contour, True))
    x, y, w, h = cv2.boundingRect(contour)
    roundness = 4 * math.pi * area / max(1.0, perimeter * perimeter)
    solidity = area / max(1.0, float(cv2.contourArea(cv2.convexHull(contour))))
    return {"area": area, "perimeter": perimeter, "bbox": (x, y, w, h), "roundness": roundness, "solidity": solidity}


def extract_coin(rgb: np.ndarray, helper):
    mask, diagnostics = helper.foreground_mask(rgb)
    properties = contour_properties(mask)
    if not diagnostics.get("reliable") or not properties:
        return None
    x, y, w, h = properties["bbox"]
    area_ratio = properties["area"] / float(mask.shape[0] * mask.shape[1])
    if area_ratio < 0.04 or area_ratio > 0.88 or properties["solidity"] < 0.52:
        return None
    pad = round(max(w, h) * 0.02)
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(rgb.shape[1], x + w + pad), min(rgb.shape[0], y + h + pad)
    coin = rgb[y0:y1, x0:x1]
    alpha = mask[y0:y1, x0:x1]
    if min(coin.shape[:2]) < 90:
        return None
    return coin, alpha, properties


def select_specimens(manifest_path: Path, cache_dir: Path, count: int, helper):
    payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    candidates = []
    for item in payload["corpus"]:
        images = item["query"].get("images", [])
        if not images:
            continue
        path = cache_path(cache_dir, images[0]["url"])
        if not path.exists():
            continue
        try:
            extracted = extract_coin(read_rgb(path), helper)
        except Exception:
            extracted = None
        if not extracted:
            continue
        coin, alpha, properties = extracted
        pixels = coin[alpha > 127]
        luminance = float(np.mean(cv2.cvtColor(pixels.reshape(-1, 1, 3), cv2.COLOR_RGB2GRAY))) if len(pixels) else 128.0
        candidates.append({
            "type_id": item["typeId"],
            "period": helper.detailed_period(item),
            "coin": coin,
            "alpha": alpha,
            "roundness": properties["roundness"],
            "shape": "irregular" if properties["roundness"] < 0.70 else "round",
            "metal": str(item["query"].get("metal") or "unknown"),
            "appearance": "dark" if luminance < 85 else "bright" if luminance > 170 else "mid",
        })
    selected = []
    used = set()
    periods = sorted({row["period"] for row in candidates})
    per_period = max(2, (count - 4) // max(1, len(periods)))
    for period in periods:
        rows = [row for row in candidates if row["period"] == period]
        rows.sort(key=lambda row: row["roundness"])
        take = []
        if rows:
            take.extend(rows[: max(1, per_period // 2)])
            take.extend(rows[-max(1, per_period - len(take)):])
        for row in take:
            if row["type_id"] not in used and len(selected) < count:
                selected.append(row)
                used.add(row["type_id"])
    diversity = (
        lambda row: row["appearance"] == "dark",
        lambda row: row["appearance"] == "bright",
        lambda row: "srebr" in helper.norm_text(row["metal"]) or "silver" in helper.norm_text(row["metal"]),
        lambda row: "zlot" in helper.norm_text(row["metal"]) or "gold" in helper.norm_text(row["metal"]),
    )
    for predicate in diversity:
        candidate = next((row for row in candidates if row["type_id"] not in used and predicate(row)), None)
        if candidate and len(selected) < count:
            selected.append(candidate)
            used.add(candidate["type_id"])
    for row in sorted(candidates, key=lambda item: (item["shape"] != "irregular", item["type_id"])):
        if len(selected) >= count:
            break
        if row["type_id"] not in used:
            selected.append(row)
            used.add(row["type_id"])
    return selected


def procedural_background(kind: str, size: int, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:size, 0:size]
    if kind == "plain-light":
        return np.full((size, size, 3), 232, np.uint8)
    if kind == "plain-dark":
        return np.full((size, size, 3), 24, np.uint8)
    if kind == "patterned":
        base = 120 + 45 * np.sin(xx / 13.0) + 28 * np.cos(yy / 19.0) + 22 * ((xx // 36 + yy // 36) % 2)
        noise = rng.normal(0, 10, (size, size))
        first = np.clip(base + noise, 0, 255)
        return np.stack([first, np.clip(first * 0.78, 0, 255), np.clip(170 - first * 0.35, 0, 255)], axis=2).astype(np.uint8)
    tone = 160 if kind in ("shadow", "glare", "overexposed", "slight-angle", "strong-angle") else 145
    noise = rng.normal(0, 4, (size, size, 1))
    return np.uint8(np.clip(np.full((size, size, 3), tone, np.float32) + noise, 0, 255))


def compose(specimen: dict, scenario: str, seed: int, size: int = 512):
    rng = np.random.default_rng(seed)
    background = procedural_background(scenario, size, seed)
    coin = specimen["coin"]
    alpha = specimen["alpha"]
    target = int(size * rng.uniform(0.48, 0.66))
    scale = target / max(coin.shape[:2])
    width = max(1, round(coin.shape[1] * scale))
    height = max(1, round(coin.shape[0] * scale))
    coin = cv2.resize(coin, (width, height), interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)
    alpha = cv2.resize(alpha, (width, height), interpolation=cv2.INTER_NEAREST)

    if scenario in ("slight-angle", "strong-angle"):
        inset_fraction = 0.09 if scenario == "slight-angle" else 0.24
        inset = max(3, round(width * inset_fraction))
        source = np.float32([[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]])
        target_points = np.float32([[inset, 0], [width - 1 - inset, 7], [width - 1, height - 8], [0, height - 1]])
        matrix = cv2.getPerspectiveTransform(source, target_points)
        coin = cv2.warpPerspective(coin, matrix, (width, height), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT)
        alpha = cv2.warpPerspective(alpha, matrix, (width, height), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT)

    x = (size - width) // 2 + int(rng.integers(-28, 29))
    y = (size - height) // 2 + int(rng.integers(-28, 29))
    if scenario == "cropped-rim":
        x = -max(5, round(width * 0.07))
    full_coin = np.zeros((size, size, 3), np.uint8)
    full_mask = np.zeros((size, size), np.uint8)
    src_x0, src_y0 = max(0, -x), max(0, -y)
    dst_x0, dst_y0 = max(0, x), max(0, y)
    copy_w = min(width - src_x0, size - dst_x0)
    copy_h = min(height - src_y0, size - dst_y0)
    if copy_w > 0 and copy_h > 0:
        full_coin[dst_y0:dst_y0 + copy_h, dst_x0:dst_x0 + copy_w] = coin[src_y0:src_y0 + copy_h, src_x0:src_x0 + copy_w]
        full_mask[dst_y0:dst_y0 + copy_h, dst_x0:dst_x0 + copy_w] = alpha[src_y0:src_y0 + copy_h, src_x0:src_x0 + copy_w]

    if scenario == "shadow":
        shadow = cv2.GaussianBlur(full_mask, (0, 0), 13)
        shifted = np.zeros_like(shadow)
        shifted[18:, 15:] = shadow[:-18, :-15]
        darkness = (shifted.astype(np.float32) / 255.0 * 85.0)[..., None]
        background = np.uint8(np.clip(background.astype(np.float32) - darkness, 0, 255))

    matte = full_mask.astype(np.float32)[..., None] / 255.0
    image = np.uint8(full_coin.astype(np.float32) * matte + background.astype(np.float32) * (1.0 - matte))
    if scenario in ("glare", "overexposed"):
        glare = np.zeros((size, size), np.uint8)
        center = (max(0, x + int(width * 0.62)), max(0, y + int(height * 0.30)))
        axes = (max(8, width // (3 if scenario == "overexposed" else 5)), max(5, height // (5 if scenario == "overexposed" else 15)))
        cv2.ellipse(glare, center, axes, -28, 0, 360, 255, -1)
        glare = cv2.GaussianBlur(glare, (0, 0), 9)
        glare_strength = 0.92 if scenario == "overexposed" else 0.62
        strength = (glare.astype(np.float32) / 255.0 * glare_strength * matte[..., 0])[..., None]
        image = np.uint8(np.clip(image.astype(np.float32) * (1 - strength) + 255 * strength, 0, 255))
    if scenario == "blurred":
        image = cv2.GaussianBlur(image, (0, 0), 4.2)
        image = np.uint8(np.clip(image.astype(np.float32) + rng.normal(0, 5, image.shape), 0, 255))
    return image, np.uint8(full_mask > 127) * 255


def detect_local(image: np.ndarray, helper):
    started = time.perf_counter()
    mask, diagnostics = helper.foreground_mask(image)
    if diagnostics.get("reliable") and cv2.countNonZero(mask):
        x, y, w, h = cv2.boundingRect(mask)
        pad = round(max(w, h) * 0.055)
        box = np.asarray([max(0, x - pad), max(0, y - pad), min(image.shape[1] - 1, x + w + pad), min(image.shape[0] - 1, y + h + pad)], np.float32)
    else:
        height, width = image.shape[:2]
        box = np.asarray([width * 0.10, height * 0.10, width * 0.90, height * 0.90], np.float32)
    return mask, box, diagnostics, (time.perf_counter() - started) * 1000


def grabcut(image: np.ndarray, box: np.ndarray):
    started = time.perf_counter()
    x0, y0, x1, y1 = [int(round(value)) for value in box]
    rect = (max(0, x0), max(0, y0), max(2, x1 - x0), max(2, y1 - y0))
    mask = np.zeros(image.shape[:2], np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    try:
        cv2.grabCut(cv2.cvtColor(image, cv2.COLOR_RGB2BGR), mask, rect, bgd, fgd, 4, cv2.GC_INIT_WITH_RECT)
        result = np.uint8((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)) * 255
    except cv2.error:
        result = np.zeros(image.shape[:2], np.uint8)
    return result, (time.perf_counter() - started) * 1000


def load_mobile_sam():
    from mobile_sam import SamPredictor, sam_model_registry
    checkpoint = DEPS / "MobileSAM/weights/mobile_sam.pt"
    model = sam_model_registry["vit_t"](checkpoint=str(checkpoint))
    model.to(device="cpu")
    model.eval()
    return SamPredictor(model)


def load_sam2():
    from sam2.build_sam import build_sam2
    from sam2.sam2_image_predictor import SAM2ImagePredictor
    checkpoint = DEPS / "sam2/checkpoints/sam2.1_hiera_tiny.pt"
    model = build_sam2("configs/sam2.1/sam2.1_hiera_t.yaml", str(checkpoint), device="cpu")
    model.eval()
    return SAM2ImagePredictor(model)


def sam_predict_many(predictor, image: np.ndarray, boxes: dict[str, np.ndarray], kind: str):
    encode_started = time.perf_counter()
    predictor.set_image(image)
    encode_ms = (time.perf_counter() - encode_started) * 1000
    results = {}
    for name, box in boxes.items():
        decode_started = time.perf_counter()
        if kind == "mobile_sam":
            masks, scores, _ = predictor.predict(box=box, multimask_output=True)
        else:
            masks, scores, _ = predictor.predict(box=box[None, :], multimask_output=True)
        decode_ms = (time.perf_counter() - decode_started) * 1000
        results[name] = (np.uint8(masks[int(np.argmax(scores))]) * 255, encode_ms + decode_ms)
    return results


def mask_metrics(predicted: np.ndarray, truth: np.ndarray):
    pred = predicted > 0
    gt = truth > 0
    intersection = np.count_nonzero(pred & gt)
    union = np.count_nonzero(pred | gt)
    gt_pixels = max(1, np.count_nonzero(gt))
    background_pixels = max(1, np.count_nonzero(~gt))
    eroded = cv2.erode(np.uint8(gt), np.ones((7, 7), np.uint8), iterations=1) > 0
    rim = gt & ~eroded
    rim_pixels = max(1, np.count_nonzero(rim))
    return {
        "iou": intersection / max(1, union),
        "foreground_recall": intersection / gt_pixels,
        "rim_recall": np.count_nonzero(pred & rim) / rim_pixels,
        "background_left": np.count_nonzero(pred & ~gt) / background_pixels,
        "rim_loss": float(np.count_nonzero(pred & rim) / rim_pixels < 0.98),
    }


def detection_metrics(box: np.ndarray, truth: np.ndarray):
    gt = truth > 0
    x0, y0, x1, y1 = [int(round(value)) for value in box]
    inside = np.zeros_like(gt)
    inside[max(0, y0):min(gt.shape[0], y1 + 1), max(0, x0):min(gt.shape[1], x1 + 1)] = True
    recall = np.count_nonzero(gt & inside) / max(1, np.count_nonzero(gt))
    tx, ty, tw, th = cv2.boundingRect(np.uint8(gt))
    predicted_area = max(1, (x1 - x0 + 1) * (y1 - y0 + 1))
    truth_box_area = max(1, tw * th)
    return {
        "coin_containment": recall,
        "full_rim_preserved": float(recall >= 0.995),
        "box_area_over_truth_box": predicted_area / truth_box_area,
    }


def oracle_prompt_box(truth: np.ndarray):
    x, y, width, height = cv2.boundingRect(np.uint8(truth > 0))
    pad = round(max(width, height) * 0.03)
    return np.asarray([
        max(0, x - pad),
        max(0, y - pad),
        min(truth.shape[1] - 1, x + width + pad),
        min(truth.shape[0] - 1, y + height + pad),
    ], np.float32)


def quality_signals(image: np.ndarray, box: np.ndarray, local_mask: np.ndarray):
    x0, y0, x1, y1 = [int(round(value)) for value in box]
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(image.shape[1] - 1, x1), min(image.shape[0] - 1, y1)
    roi = image[y0:y1 + 1, x0:x1 + 1]
    gray = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY) if roi.size else np.zeros((1, 1), np.uint8)
    focus = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    highlight = float(np.mean(np.max(roi, axis=2) >= 250)) if roi.size else 1.0
    touches = x0 <= 2 or y0 <= 2 or x1 >= image.shape[1] - 3 or y1 >= image.shape[0] - 3
    coverage = ((x1 - x0 + 1) * (y1 - y0 + 1)) / float(image.shape[0] * image.shape[1])
    properties = contour_properties(local_mask)
    if properties:
        _, _, mask_width, mask_height = properties["bbox"]
        perspective_ratio = min(mask_width, mask_height) / max(1, max(mask_width, mask_height))
    else:
        perspective_ratio = 0.0
    reject = touches or focus < 35 or coverage < 0.08 or coverage > 0.92 or highlight > 0.22 or perspective_ratio < 0.60
    warning = reject or highlight > 0.16 or focus < 70
    return {
        "focus": focus,
        "highlight": highlight,
        "touches_frame": touches,
        "coverage": coverage,
        "perspective_ratio": perspective_ratio,
        "reject": reject,
        "warning": warning,
        "auto_capture_ready": not warning,
    }


def aggregate(rows: list[dict], field: str):
    values = [float(row[field]) for row in rows]
    return {
        "mean": round(float(np.mean(values)), 4),
        "p50": round(float(np.percentile(values, 50)), 4),
        "p90": round(float(np.percentile(values, 90)), 4),
    }


def summarize_method(rows: list[dict]):
    return {
        "frames": len(rows),
        "iou": aggregate(rows, "iou"),
        "foreground_recall": aggregate(rows, "foreground_recall"),
        "rim_recall": aggregate(rows, "rim_recall"),
        "background_left": aggregate(rows, "background_left"),
        "rim_loss_rate_percent": round(float(np.mean([row["rim_loss"] for row in rows]) * 100), 2),
        "latency_ms": {
            "p50": round(float(np.percentile([row["latency_ms"] for row in rows], 50)), 2),
            "p90": round(float(np.percentile([row["latency_ms"] for row in rows], 90)), 2),
        },
    }


def main():
    args = parse_args()
    helper = load_retrieval_module()
    specimens = select_specimens(args.manifest, args.cache_dir, args.samples, helper)
    if len(specimens) < 12:
        raise SystemExit(f"Only {len(specimens)} high-confidence legal specimens are available")

    predictors = {}
    load_errors = {}
    if not args.skip_mobile_sam:
        try:
            tick = time.perf_counter()
            predictors["mobile_sam"] = load_mobile_sam()
            load_errors["mobile_sam_load_seconds"] = round(time.perf_counter() - tick, 2)
        except Exception as exc:
            load_errors["mobile_sam"] = f"{type(exc).__name__}: {str(exc)[:240]}"
    if not args.skip_sam2:
        try:
            tick = time.perf_counter()
            predictors["sam2.1_tiny"] = load_sam2()
            load_errors["sam2.1_tiny_load_seconds"] = round(time.perf_counter() - tick, 2)
        except Exception as exc:
            load_errors["sam2.1_tiny"] = f"{type(exc).__name__}: {str(exc)[:240]}"

    method_rows = defaultdict(list)
    detection_rows = []
    quality_rows = []
    progress = json.loads(args.progress.read_text(encoding="utf-8")) if args.progress.exists() else {}
    total = len(specimens) * len(SCENARIOS)
    counter = 0
    for specimen_index, specimen in enumerate(specimens):
        for scenario_index, scenario in enumerate(SCENARIOS):
            progress_key = f"{specimen['type_id']}::{scenario}"
            if progress_key in progress:
                stored = progress[progress_key]
                detection_rows.append(stored["detection"])
                quality_rows.append(stored["quality"])
                for method_name, method_record in stored["methods"].items():
                    method_rows[method_name].append(method_record)
                counter += 1
                print(f"segmentation {counter}/{total} (cache)", flush=True)
                continue
            image, truth = compose(specimen, scenario, 20260930 + specimen_index * 101 + scenario_index)
            local_mask, box, diagnostics, local_ms = detect_local(image, helper)
            detection = detection_metrics(box, truth)
            detection_record = {
                "scenario": scenario,
                "period": specimen["period"],
                "shape": specimen["shape"],
                "latency_ms": local_ms,
                "fallback": not diagnostics.get("reliable", False),
                **detection,
            }
            detection_rows.append(detection_record)
            signals = quality_signals(image, box, local_mask)
            expected_reject = scenario in ("overexposed", "strong-angle", "blurred", "cropped-rim")
            quality_record = {
                "scenario": scenario,
                "expected_reject": expected_reject,
                "correct": bool(signals["reject"] == expected_reject),
                **signals,
            }
            quality_rows.append(quality_record)

            metrics = mask_metrics(local_mask, truth)
            frame_methods = {}
            frame_methods["apomonet_local_cv"] = {
                "scenario": scenario, "period": specimen["period"], "shape": specimen["shape"], "appearance": specimen["appearance"], "latency_ms": local_ms, **metrics,
            }
            method_rows["apomonet_local_cv"].append(frame_methods["apomonet_local_cv"])
            grab_mask, grab_ms = grabcut(image, box)
            frame_methods["opencv_grabcut"] = {
                "scenario": scenario, "period": specimen["period"], "shape": specimen["shape"], "appearance": specimen["appearance"], "latency_ms": local_ms + grab_ms, **mask_metrics(grab_mask, truth),
            }
            method_rows["opencv_grabcut"].append(frame_methods["opencv_grabcut"])
            for name, predictor in predictors.items():
                prompt_boxes = {"local_box": box, "oracle_box": oracle_prompt_box(truth)}
                try:
                    predictions = sam_predict_many(predictor, image, prompt_boxes, "mobile_sam" if name == "mobile_sam" else "sam2")
                except Exception as exc:
                    load_errors.setdefault(f"{name}_runtime_examples", []).append(f"{type(exc).__name__}: {str(exc)[:180]}")
                    continue
                for prompt_name, (predicted, elapsed) in predictions.items():
                    try:
                        method_record = {
                            "scenario": scenario,
                            "period": specimen["period"],
                            "shape": specimen["shape"],
                            "appearance": specimen["appearance"],
                            "latency_ms": (local_ms if prompt_name == "local_box" else 0.0) + elapsed,
                            **mask_metrics(predicted, truth),
                        }
                        method_rows[f"{name}_{prompt_name}"].append(method_record)
                        frame_methods[f"{name}_{prompt_name}"] = method_record
                    except Exception as exc:
                        load_errors.setdefault(f"{name}_{prompt_name}_runtime_examples", []).append(f"{type(exc).__name__}: {str(exc)[:180]}")
            counter += 1
            progress[progress_key] = {"detection": detection_record, "quality": quality_record, "methods": frame_methods}
            if counter % 5 == 0:
                args.progress.parent.mkdir(parents=True, exist_ok=True)
                args.progress.write_text(json.dumps(progress, ensure_ascii=False), encoding="utf-8")
            print(f"segmentation {counter}/{total}", flush=True)

    args.progress.parent.mkdir(parents=True, exist_ok=True)
    args.progress.write_text(json.dumps(progress, ensure_ascii=False), encoding="utf-8")

    methods = {}
    for name, rows in method_rows.items():
        by_scenario = {}
        for scenario in SCENARIOS:
            subset = [row for row in rows if row["scenario"] == scenario]
            if subset:
                by_scenario[scenario] = summarize_method(subset)
        by_shape = {}
        for shape in ("round", "irregular"):
            subset = [row for row in rows if row["shape"] == shape]
            if subset:
                by_shape[shape] = summarize_method(subset)
        by_appearance = {}
        for appearance in ("dark", "mid", "bright"):
            subset = [row for row in rows if row["appearance"] == appearance]
            if subset:
                by_appearance[appearance] = summarize_method(subset)
        methods[name] = {**summarize_method(rows), "by_scenario": by_scenario, "by_shape": by_shape, "by_appearance": by_appearance}

    detection_summary = {
        "frames": len(detection_rows),
        "coin_containment": aggregate(detection_rows, "coin_containment"),
        "box_area_over_truth_box": aggregate(detection_rows, "box_area_over_truth_box"),
        "full_rim_preserved_rate_percent": round(float(np.mean([row["full_rim_preserved"] for row in detection_rows]) * 100), 2),
        "fallback_rate_percent": round(float(np.mean([row["fallback"] for row in detection_rows]) * 100), 2),
        "latency_ms": {
            "p50": round(float(np.percentile([row["latency_ms"] for row in detection_rows], 50)), 2),
            "p90": round(float(np.percentile([row["latency_ms"] for row in detection_rows], 90)), 2),
        },
    }
    quality_summary = {
        "frames": len(quality_rows),
        "overall_decision_accuracy_percent": round(float(np.mean([row["correct"] for row in quality_rows]) * 100), 2),
        "bad_frame_recall_percent": round(float(np.mean([row["reject"] for row in quality_rows if row["expected_reject"]]) * 100), 2),
        "good_frame_accept_percent": round(float(np.mean([not row["reject"] for row in quality_rows if not row["expected_reject"]]) * 100), 2),
        "auto_capture_ready_rate_percent": round(float(np.mean([row["auto_capture_ready"] for row in quality_rows]) * 100), 2),
        "by_scenario": {
            scenario: {
                "frames": len([row for row in quality_rows if row["scenario"] == scenario]),
                "reject_rate_percent": round(float(np.mean([row["reject"] for row in quality_rows if row["scenario"] == scenario]) * 100), 2),
                "warning_rate_percent": round(float(np.mean([row["warning"] for row in quality_rows if row["scenario"] == scenario]) * 100), 2),
            }
            for scenario in SCENARIOS
        },
    }

    payload = {
        "schema_version": 1,
        "generated_at": "2026-09-30",
        "purpose": "Controlled photo, crop, quality and segmentation bake-off; no production wiring.",
        "base_commit": "6d6a0e25f021123a7a8630cc471150db02d672c1",
        "branch": "codex/vision-lab-20260930",
        "protocol": {
            "source": "Frozen rights-gated Visual Lab manifest",
            "source_specimens": len(specimens),
            "frames": total,
            "scenarios": list(SCENARIOS),
            "periods": dict(sorted(Counter(row["period"] for row in specimens).items())),
            "shapes": dict(sorted(Counter(row["shape"] for row in specimens).items())),
            "appearance": dict(sorted(Counter(row["appearance"] for row in specimens).items())),
            "metals": dict(sorted(Counter(row["metal"] for row in specimens).items())),
            "ground_truth": "High-confidence central foreground masks transformed with exact synthetic geometry; no source or synthetic images persisted in results.",
            "three_representations": {
                "ORIGINAL": "Source frame remains immutable.",
                "NORMALIZED": "Detection box plus safe margin; background is retained for recognition.",
                "DISPLAY_CUTOUT": "Independent aesthetic mask; never replaces ORIGINAL or NORMALIZED.",
            },
        },
        "models": {
            "apomonet_local_cv": {"license": "Project code", "runtime": "local", "prompt": "none"},
            "opencv_grabcut": {"license": "Apache-2.0", "runtime": "local/on-device capable", "prompt": "local detection box"},
            "mobile_sam": {"license": "Apache-2.0", "runtime": "local; ONNX export supported", "prompt": "measured with local detection box and oracle ceiling box"},
            "sam2.1_tiny": {"license": "Apache-2.0", "runtime": "local server/desktop; mobile cost requires device test", "prompt": "measured with local detection box and oracle ceiling box"},
        },
        "load_and_runtime_notes": load_errors,
        "detection_and_safe_crop": detection_summary,
        "quality_gate": quality_summary,
        "segmentation": methods,
        "limitations": [
            "Controlled composites isolate background, glare, blur, shadow, mild perspective and clipping; they do not replace a blind physical-phone benchmark.",
            "Ground truth is accepted only from high-confidence source masks and therefore under-represents the hardest unsegmentable originals.",
            "CPU latency is a reproducible laboratory number, not Android/iPhone latency.",
            "SAM 3.1 is not run because official checkpoints require authenticated access and the official setup requires a CUDA GPU.",
            "Apple Vision and Android ML Kit are native-device candidates and cannot be fairly timed in this Linux laboratory.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ranking = sorted(methods.items(), key=lambda item: (item[1]["rim_recall"]["mean"], item[1]["iou"]["mean"]), reverse=True)
    print(json.dumps({
        "output": str(args.output),
        "frames": total,
        "models_completed": list(methods),
        "best_rim_method": ranking[0][0] if ranking else None,
        "best_rim_recall": ranking[0][1]["rim_recall"]["mean"] if ranking else None,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
