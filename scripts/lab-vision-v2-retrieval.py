#!/usr/bin/env python3
"""APOMONET Vision v2 retrieval bake-off.

This is an isolated laboratory runner.  It reuses the frozen, rights-gated
cross-specimen manifest from 2026-09-10, but does not rerun the historical
HOG/ResNet/SIFT baseline.  Query and reference images always come from
different source records.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import os
import re
import statistics
import sys
import time
import unicodedata
from collections import Counter, defaultdict
from dataclasses import asdict
from pathlib import Path

import cv2
import numpy as np
import timm
import torch


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "lab/corpus/visual-corpus-manifest-2026-09-10.json"
DEFAULT_CACHE = ROOT / ".lab-image-cache"
DEFAULT_FEATURE_CACHE = ROOT / ".lab-feature-cache"
DEFAULT_OUTPUT = ROOT / "lab/results/vision-v2-retrieval-2026-09-30.json"
HF_HOME = str(ROOT.parent / ".hf-cache")
os.environ.setdefault("HF_HOME", HF_HOME)

MODEL_SPECS = {
    "dinov2_small": {
        "name": "vit_small_patch14_dinov2.lvd142m",
        "license": "Apache-2.0",
        "modes": ["original", "normalized", "cutout"],
        "batch": 32,
    },
    "dinov3_small": {
        "name": "vit_small_patch16_dinov3.lvd1689m",
        "license": "DINOv3 License (Meta custom)",
        "modes": ["original", "normalized", "cutout"],
        "batch": 32,
    },
    "siglip2_base": {
        "name": "vit_base_patch16_siglip_224.v2_webli",
        "license": "Apache-2.0 code; checkpoint terms recorded separately",
        "modes": ["original", "normalized", "cutout"],
        "batch": 16,
    },
    "mobilenetv4_small": {
        "name": "mobilenetv4_conv_small.e1200_r224_in1k",
        "license": "Apache-2.0 implementation; checkpoint provenance recorded separately",
        "modes": ["normalized"],
        "batch": 48,
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--feature-cache-dir", type=Path, default=DEFAULT_FEATURE_CACHE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--models", default=",".join(MODEL_SPECS))
    parser.add_argument("--max-types", type=int, default=500)
    parser.add_argument("--threads", type=int, default=max(1, min(8, os.cpu_count() or 1)))
    return parser.parse_args()


def load_baseline_module():
    path = ROOT / "scripts/lab-cross-specimen-visual.py"
    spec = importlib.util.spec_from_file_location("apomonet_visual_baseline", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def norm_text(value: object) -> str:
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def year_number(value: object) -> int | None:
    match = re.search(r"(?:^|\D)(9\d{2}|1\d{3}|20\d{2})(?:\D|$)", str(value or ""))
    return int(match.group(1)) if match else None


def detailed_period(item: dict) -> str:
    year = year_number(item.get("query", {}).get("year"))
    if year is None:
        broad = item.get("period")
        return {
            "contemporary": "III RP",
            "people-republic": "PRL",
            "second-republic-and-war": "II RP i wojna",
            "partitions": "Zabory i powstania",
            "royal": "Monarchia elekcyjna",
            "medieval": "Średniowiecze",
        }.get(broad, "Nieustalony")
    if year <= 1385:
        return "Średniowiecze"
    if year <= 1572:
        return "Jagiellonowie"
    if year <= 1795:
        return "Monarchia elekcyjna"
    if year <= 1918:
        return "Zabory i powstania"
    if year <= 1945:
        return "II RP i wojna"
    if year <= 1989:
        return "PRL"
    return "III RP"


def cache_path(cache_dir: Path, url: str) -> Path:
    return cache_dir / (hashlib.sha256(url.encode("utf-8")).hexdigest() + ".img")


def read_rgb(path: Path) -> np.ndarray:
    raw = np.fromfile(path, dtype=np.uint8)
    bgr = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError(f"cannot decode {path.name}")
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def border_background(rgb: np.ndarray) -> np.ndarray:
    height, width = rgb.shape[:2]
    border = max(3, round(min(height, width) * 0.05))
    pixels = np.concatenate([
        rgb[:border].reshape(-1, 3),
        rgb[-border:].reshape(-1, 3),
        rgb[:, :border].reshape(-1, 3),
        rgb[:, -border:].reshape(-1, 3),
    ])
    return np.median(pixels.astype(np.float32), axis=0)


def letterbox(rgb: np.ndarray, size: int, occupancy: float = 0.90) -> np.ndarray:
    height, width = rgb.shape[:2]
    background = border_background(rgb)
    scale = min(size * occupancy / max(1, width), size * occupancy / max(1, height))
    target_w = max(1, round(width * scale))
    target_h = max(1, round(height * scale))
    interpolation = cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC
    resized = cv2.resize(rgb, (target_w, target_h), interpolation=interpolation)
    canvas = np.empty((size, size, 3), dtype=np.uint8)
    canvas[:] = np.uint8(np.clip(background, 0, 255))
    x = (size - target_w) // 2
    y = (size - target_h) // 2
    canvas[y:y + target_h, x:x + target_w] = resized
    return canvas


def foreground_mask(rgb: np.ndarray) -> tuple[np.ndarray, dict]:
    """Conservative local mask used only for the cutout ablation."""
    height, width = rgb.shape[:2]
    scale = min(1.0, 720.0 / max(height, width))
    work = cv2.resize(rgb, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA) if scale < 1 else rgb.copy()
    h, w = work.shape[:2]
    background = border_background(work)
    distance = np.linalg.norm(work.astype(np.float32) - background, axis=2)
    border = max(3, round(min(h, w) * 0.05))
    border_values = np.concatenate([distance[:border].ravel(), distance[-border:].ravel(), distance[:, :border].ravel(), distance[:, -border:].ravel()])
    threshold = max(14.0, float(np.percentile(border_values, 97)) + 8.0)
    mask = np.uint8(distance > threshold) * 255
    radius = max(2, round(min(h, w) * 0.012))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (radius * 2 + 1, radius * 2 + 1))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(mask, 8)
    best = None
    center = np.asarray([w / 2, h / 2])
    for label in range(1, count):
        x, y, bw, bh, area = stats[label]
        ratio = area / float(h * w)
        if not 0.02 <= ratio <= 0.94:
            continue
        centrality = 1.0 - min(1.0, np.linalg.norm(centroids[label] - center) / max(h, w))
        score = ratio * (0.45 + centrality)
        if best is None or score > best[0]:
            best = (score, label, (x, y, bw, bh), ratio, centrality)
    if best is None:
        return np.ones((height, width), np.uint8) * 255, {"reliable": False, "reason": "no-component"}
    selected = np.uint8(labels == best[1]) * 255
    selected = cv2.morphologyEx(selected, cv2.MORPH_CLOSE, kernel, iterations=1)
    if scale != 1:
        selected = cv2.resize(selected, (width, height), interpolation=cv2.INTER_NEAREST)
    x, y, bw, bh = cv2.boundingRect(selected)
    touches = x <= 1 or y <= 1 or x + bw >= width - 1 or y + bh >= height - 1
    reliable = best[3] >= 0.04 and best[4] >= 0.55 and not touches
    return selected, {
        "reliable": bool(reliable),
        "reason": "central-component" if reliable else "unsafe-component",
        "area_ratio": round(float(best[3]), 4),
        "centrality": round(float(best[4]), 4),
    }


def cutout_normalized(rgb: np.ndarray, size: int) -> tuple[np.ndarray, dict]:
    mask, diagnostics = foreground_mask(rgb)
    if not diagnostics["reliable"]:
        return letterbox(rgb, size), diagnostics
    x, y, w, h = cv2.boundingRect(mask)
    pad = round(max(w, h) * 0.10)
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(rgb.shape[1], x + w + pad), min(rgb.shape[0], y + h + pad)
    crop = rgb[y0:y1, x0:x1]
    crop_mask = mask[y0:y1, x0:x1].astype(np.float32)[..., None] / 255.0
    neutral = np.full_like(crop, 127)
    composed = np.uint8(crop * crop_mask + neutral * (1.0 - crop_mask))
    return letterbox(composed, size, 0.86), diagnostics


def prepare_image(rgb: np.ndarray, mode: str, size: int, baseline) -> tuple[np.ndarray, dict]:
    if mode == "original":
        return letterbox(rgb, size), {"fallback": False}
    if mode == "normalized":
        return baseline.normalize_coin(rgb, size), {"fallback": False}
    if mode == "cutout":
        image, diagnostics = cutout_normalized(rgb, size)
        return image, {"fallback": not diagnostics.get("reliable", False), **diagnostics}
    raise ValueError(mode)


def load_frozen_rows(manifest_path: Path, cache_dir: Path, max_types: int, baseline):
    selected, entries, diagnostics = baseline.load_manifest(manifest_path, max_types, 2)
    rows = []
    missing = []
    for entry in entries:
        path = cache_path(cache_dir, entry.url)
        if not path.exists():
            missing.append(entry.url)
            continue
        try:
            rows.append({"entry": entry, "path": path, "rgb": read_rgb(path)})
        except Exception:
            missing.append(entry.url)
    by_type = defaultdict(lambda: {"query": [], "reference": []})
    for row in rows:
        by_type[row["entry"].type_id][row["entry"].role].append(row)
    usable = [item for item in selected if by_type[item["typeId"]]["query"] and by_type[item["typeId"]]["reference"]]
    allowed_ids = {item["typeId"] for item in usable}
    rows = [row for row in rows if row["entry"].type_id in allowed_ids]
    diagnostics.update({
        "usable_types": len(usable),
        "usable_images": len(rows),
        "missing_or_invalid_images": len(missing),
        "query_reference_record_separation": True,
        "exact_url_leakage_removed": True,
    })
    return usable, rows, by_type, diagnostics


def model_features(model_name: str, rows: list[dict], mode: str, batch_size: int, baseline):
    started_load = time.perf_counter()
    model = timm.create_model(model_name, pretrained=True, num_classes=0)
    model.eval()
    config = timm.data.resolve_model_data_config(model)
    input_size = int(config.get("input_size", (3, 224, 224))[-1])
    mean = torch.tensor(config.get("mean", (0.485, 0.456, 0.406)), dtype=torch.float32).view(1, 3, 1, 1)
    std = torch.tensor(config.get("std", (0.229, 0.224, 0.225)), dtype=torch.float32).view(1, 3, 1, 1)
    load_seconds = time.perf_counter() - started_load
    outputs = []
    preprocess_ms = []
    fallback_count = 0
    inference_batches_ms = []
    with torch.inference_mode():
        for start in range(0, len(rows), batch_size):
            images = []
            for row in rows[start:start + batch_size]:
                tick = time.perf_counter()
                image, diagnostics = prepare_image(row["rgb"], mode, input_size, baseline)
                preprocess_ms.append((time.perf_counter() - tick) * 1000)
                fallback_count += int(diagnostics.get("fallback", False))
                images.append(image)
            tensor = torch.from_numpy(np.stack(images).astype(np.float32) / 255.0).permute(0, 3, 1, 2)
            tensor = (tensor - mean) / std
            tick = time.perf_counter()
            output = model(tensor)
            inference_batches_ms.append((time.perf_counter() - tick) * 1000)
            if isinstance(output, (tuple, list)):
                output = output[0]
            if output.ndim > 2:
                output = output.mean(dim=tuple(range(2, output.ndim)))
            array = output.detach().cpu().numpy().astype(np.float32)
            array /= np.maximum(np.linalg.norm(array, axis=1, keepdims=True), 1e-8)
            outputs.append(array)
            print(f"{model_name}/{mode}: {min(start + batch_size, len(rows))}/{len(rows)}", flush=True)
    vectors = np.concatenate(outputs)
    batch_sizes = [batch_size] * (len(inference_batches_ms) - 1)
    if inference_batches_ms:
        batch_sizes.append(len(rows) - batch_size * (len(inference_batches_ms) - 1))
    per_image_ms = [elapsed / max(1, size) for elapsed, size in zip(inference_batches_ms, batch_sizes)]
    timing = {
        "model_load_seconds": round(load_seconds, 3),
        "preprocess_p50_ms": round(float(np.percentile(preprocess_ms, 50)), 3),
        "preprocess_p90_ms": round(float(np.percentile(preprocess_ms, 90)), 3),
        "inference_p50_ms_per_image": round(float(np.percentile(per_image_ms, 50)), 3),
        "inference_p90_ms_per_image": round(float(np.percentile(per_image_ms, 90)), 3),
        "fallback_images": fallback_count,
        "input_size": input_size,
        "embedding_dimensions": int(vectors.shape[1]),
        "parameters": int(sum(parameter.numel() for parameter in model.parameters())),
    }
    del model
    return vectors, timing


def score_matrix(types: list[dict], rows: list[dict], vectors: np.ndarray):
    grouped = defaultdict(lambda: {"query": [], "reference": []})
    for row, vector in zip(rows, vectors, strict=True):
        grouped[row["entry"].type_id][row["entry"].role].append(vector)
    references = []
    reference_owner = []
    for index, item in enumerate(types):
        for vector in grouped[item["typeId"]]["reference"]:
            references.append(vector)
            reference_owner.append(index)
    reference_matrix = np.stack(references)
    owner = np.asarray(reference_owner)
    by_type = [np.flatnonzero(owner == index) for index in range(len(types))]
    scores = np.empty((len(types), len(types)), dtype=np.float32)
    ranking_ms = []
    for query_index, item in enumerate(types):
        tick = time.perf_counter()
        query = np.stack(grouped[item["typeId"]]["query"])
        pairwise = query @ reference_matrix.T
        for reference_index, image_indices in enumerate(by_type):
            scores[query_index, reference_index] = float(np.mean(np.max(pairwise[:, image_indices], axis=1)))
        ranking_ms.append((time.perf_counter() - tick) * 1000)
    return scores, ranking_ms, grouped


def ranks_from_scores(scores: np.ndarray) -> np.ndarray:
    order = np.argsort(-scores, axis=1, kind="stable")
    target = np.arange(len(scores))[:, None]
    return np.argmax(order == target, axis=1) + 1


def accuracy_summary(scores: np.ndarray, periods: list[str], ranking_ms: list[float] | None = None, indices: np.ndarray | None = None):
    all_ranks = ranks_from_scores(scores)
    indices = np.arange(len(all_ranks)) if indices is None else np.asarray(indices)
    ranks = all_ranks[indices]
    result = {
        "queries": len(ranks),
        "top1": round(float(np.mean(ranks <= 1) * 100), 2),
        "top3": round(float(np.mean(ranks <= 3) * 100), 2),
        "top5": round(float(np.mean(ranks <= 5) * 100), 2),
        "median_rank": round(float(np.median(ranks)), 2),
    }
    if ranking_ms:
        result.update({
            "ranking_p50_ms": round(float(np.percentile(ranking_ms, 50)), 3),
            "ranking_p90_ms": round(float(np.percentile(ranking_ms, 90)), 3),
        })
    per_period = []
    for period in sorted(set(periods)):
        period_indices = indices[np.asarray(periods)[indices] == period]
        period_ranks = all_ranks[period_indices]
        per_period.append({
            "period": period,
            "queries": len(period_indices),
            "top1": round(float(np.mean(period_ranks <= 1) * 100), 2),
            "top3": round(float(np.mean(period_ranks <= 3) * 100), 2),
            "top5": round(float(np.mean(period_ranks <= 5) * 100), 2),
        })
    result["by_period"] = per_period
    return result


def token_similarity(left: object, right: object) -> float:
    a, b = set(norm_text(left).split()), set(norm_text(right).split())
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def metadata_feature_matrices(types: list[dict]):
    n = len(types)
    names = ["year", "nominal", "mint", "ruler", "metal", "period"]
    matrices = {name: np.zeros((n, n), np.float32) for name in names}
    periods = [detailed_period(item) for item in types]
    for i, item in enumerate(types):
        query = item["query"]
        q_year = year_number(query.get("year"))
        for j, candidate in enumerate(types):
            reference = candidate["reference"]
            r_year = year_number(reference.get("year"))
            if q_year is not None and r_year is not None:
                delta = abs(q_year - r_year)
                matrices["year"][i, j] = 1.0 if delta == 0 else 0.55 if delta <= 1 else 0.18 if delta <= 5 else 0.0
            matrices["nominal"][i, j] = token_similarity(query.get("nominal"), reference.get("nominal"))
            matrices["mint"][i, j] = token_similarity(query.get("mint"), reference.get("mint"))
            matrices["ruler"][i, j] = token_similarity(query.get("ruler"), reference.get("ruler"))
            matrices["metal"][i, j] = token_similarity(query.get("metal"), reference.get("metal"))
            matrices["period"][i, j] = float(periods[i] == periods[j])
    return matrices


def row_z(matrix: np.ndarray) -> np.ndarray:
    mean = matrix.mean(axis=1, keepdims=True)
    std = matrix.std(axis=1, keepdims=True)
    return (matrix - mean) / np.maximum(std, 1e-7)


def compose_metadata(matrices: dict[str, np.ndarray], exclude: str | None = None):
    weights = {"year": 0.24, "nominal": 0.23, "mint": 0.12, "ruler": 0.20, "metal": 0.08, "period": 0.13}
    if exclude:
        weights[exclude] = 0.0
    total = sum(weights.values()) or 1.0
    return sum((weight / total) * matrices[name] for name, weight in weights.items())


def tune_visual_weight(visual: np.ndarray, metadata: np.ndarray, indices: np.ndarray):
    best = None
    for weight in np.arange(0.50, 0.96, 0.05):
        combined = weight * row_z(visual) + (1.0 - weight) * row_z(metadata)
        ranks = ranks_from_scores(combined)[indices]
        candidate = (float(np.mean(ranks <= 1)), float(np.mean(ranks <= 3)), float(weight))
        if best is None or candidate[:2] > best[:2]:
            best = candidate
    return best[2]


def metadata_noise(types: list[dict], field: str, seed: int = 20260930):
    rng = np.random.default_rng(seed + sum(ord(ch) for ch in field))
    values = [item["query"].get(field) for item in types]
    order = rng.permutation(len(values))
    clone = json.loads(json.dumps(types))
    for index, replacement in enumerate(order):
        clone[index]["query"][field] = values[int(replacement)]
    return clone


def confidence_metrics(scores: np.ndarray):
    n = len(scores)
    calibration = np.arange(n) % 5 == 0
    evaluation = ~calibration
    ordered = np.argsort(-scores, axis=1, kind="stable")
    top1 = ordered[:, 0]
    top2 = ordered[:, 1]
    top_score = scores[np.arange(n), top1]
    margin = top_score - scores[np.arange(n), top2]
    correct = top1 == np.arange(n)

    unknown_top_score = np.empty(n, np.float32)
    unknown_margin = np.empty(n, np.float32)
    for index in range(n):
        masked = scores[index].copy()
        masked[index] = -np.inf
        candidate = np.argsort(-masked, kind="stable")[:2]
        unknown_top_score[index] = masked[candidate[0]]
        unknown_margin[index] = masked[candidate[0]] - masked[candidate[1]]

    score_grid = np.quantile(top_score[calibration], np.linspace(0.20, 0.95, 20))
    margin_grid = np.quantile(margin[calibration], np.linspace(0.20, 0.98, 24))
    best = None
    for score_threshold in score_grid:
        for margin_threshold in margin_grid:
            accept = (top_score >= score_threshold) & (margin >= margin_threshold)
            false_known = np.mean(accept[calibration] & ~correct[calibration])
            false_unknown = np.mean((unknown_top_score[calibration] >= score_threshold) & (unknown_margin[calibration] >= margin_threshold))
            correct_coverage = np.mean(accept[calibration] & correct[calibration])
            feasible = false_known <= 0.02 and false_unknown <= 0.05
            candidate = (feasible, correct_coverage, -false_unknown, -false_known, float(score_threshold), float(margin_threshold))
            if best is None or candidate[:4] > best[:4]:
                best = candidate
    _, _, _, _, score_threshold, margin_threshold = best
    accept = (top_score >= score_threshold) & (margin >= margin_threshold)
    unknown_accept = (unknown_top_score >= score_threshold) & (unknown_margin >= margin_threshold)
    return {
        "calibration_queries": int(calibration.sum()),
        "evaluation_queries": int(evaluation.sum()),
        "score_threshold": round(score_threshold, 6),
        "margin_threshold": round(margin_threshold, 6),
        "known_correct_accepted": round(float(np.mean(accept[evaluation] & correct[evaluation]) * 100), 2),
        "known_false_confident": round(float(np.mean(accept[evaluation] & ~correct[evaluation]) * 100), 2),
        "known_abstention": round(float(np.mean(~accept[evaluation]) * 100), 2),
        "out_of_catalog_correct_abstention": round(float(np.mean(~unknown_accept[evaluation]) * 100), 2),
        "out_of_catalog_false_accept": round(float(np.mean(unknown_accept[evaluation]) * 100), 2),
    }


class Projection(torch.nn.Module):
    def __init__(self, dimensions: int, output: int = 128):
        super().__init__()
        hidden = min(384, dimensions)
        self.layers = torch.nn.Sequential(
            torch.nn.Linear(dimensions, hidden, bias=False),
            torch.nn.ReLU(),
            torch.nn.Linear(hidden, output, bias=False),
        )

    def forward(self, values):
        return torch.nn.functional.normalize(self.layers(values), dim=1)


def metric_learning(types: list[dict], grouped: dict, periods: list[str], seed: int = 20260930):
    torch.manual_seed(seed)
    type_query = []
    type_reference = []
    for item in types:
        query = np.mean(grouped[item["typeId"]]["query"], axis=0)
        reference = np.mean(grouped[item["typeId"]]["reference"], axis=0)
        query /= max(1e-8, np.linalg.norm(query))
        reference /= max(1e-8, np.linalg.norm(reference))
        type_query.append(query)
        type_reference.append(reference)
    queries = np.stack(type_query).astype(np.float32)
    references = np.stack(type_reference).astype(np.float32)
    hashes = np.asarray([int(hashlib.sha1(item["typeId"].encode()).hexdigest()[:8], 16) for item in types])
    train = np.flatnonzero(hashes % 5 != 0)
    test = np.flatnonzero(hashes % 5 == 0)
    raw_test = queries[test] @ references[test].T
    raw_ranks = np.argmax(np.argsort(-raw_test, axis=1) == np.arange(len(test))[:, None], axis=1) + 1

    model = Projection(queries.shape[1])
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-4)
    q_tensor = torch.from_numpy(queries[train])
    r_tensor = torch.from_numpy(references[train])
    order = torch.arange(len(train))
    losses = []
    started = time.perf_counter()
    model.train()
    for epoch in range(120):
        permutation = order[torch.randperm(len(order))]
        for start in range(0, len(order), 64):
            batch = permutation[start:start + 64]
            q = model(q_tensor[batch])
            r = model(r_tensor[batch])
            logits = q @ r.T / 0.08
            labels = torch.arange(len(batch))
            loss = (torch.nn.functional.cross_entropy(logits, labels) + torch.nn.functional.cross_entropy(logits.T, labels)) / 2
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            losses.append(float(loss.detach()))
    training_seconds = time.perf_counter() - started
    model.eval()
    with torch.inference_mode():
        projected_q = model(torch.from_numpy(queries[test])).numpy()
        projected_r = model(torch.from_numpy(references[test])).numpy()
    learned_scores = projected_q @ projected_r.T
    learned_ranks = np.argmax(np.argsort(-learned_scores, axis=1) == np.arange(len(test))[:, None], axis=1) + 1

    def summarize(ranks):
        return {
            "queries": len(ranks),
            "top1": round(float(np.mean(ranks <= 1) * 100), 2),
            "top3": round(float(np.mean(ranks <= 3) * 100), 2),
            "top5": round(float(np.mean(ranks <= 5) * 100), 2),
        }

    period_rows = []
    test_periods = np.asarray(periods)[test]
    for period in sorted(set(test_periods)):
        indices = np.flatnonzero(test_periods == period)
        period_rows.append({
            "period": period,
            "queries": len(indices),
            "raw_top1": round(float(np.mean(raw_ranks[indices] <= 1) * 100), 2),
            "learned_top1": round(float(np.mean(learned_ranks[indices] <= 1) * 100), 2),
        })
    return {
        "protocol": "Frozen embeddings; 80% identity-disjoint train types, 20% unseen test types; query/reference remain different specimens.",
        "train_types": len(train),
        "test_types": len(test),
        "epochs": 120,
        "training_seconds_cpu": round(training_seconds, 2),
        "final_loss": round(statistics.mean(losses[-10:]), 5),
        "raw_embedding": summarize(raw_ranks),
        "learned_projection": summarize(learned_ranks),
        "by_period": period_rows,
    }


def main():
    args = parse_args()
    torch.set_num_threads(args.threads)
    baseline = load_baseline_module()
    types, rows, _, corpus = load_frozen_rows(args.manifest, args.cache_dir, args.max_types, baseline)
    if len(types) < 100:
        raise SystemExit(f"Only {len(types)} usable types in cache; complete the legal image download first.")
    periods = [detailed_period(item) for item in types]
    metadata = metadata_feature_matrices(types)
    metadata_clean = compose_metadata(metadata)
    model_keys = [key.strip() for key in args.models.split(",") if key.strip()]
    results = []
    matrices = {}
    grouped_vectors = {}
    args.feature_cache_dir.mkdir(parents=True, exist_ok=True)
    for key in model_keys:
        spec = MODEL_SPECS[key]
        for mode in spec["modes"]:
            feature_cache = args.feature_cache_dir / f"{key}-{mode}-{len(rows)}.npz"
            if feature_cache.exists():
                cached = np.load(feature_cache, allow_pickle=False)
                vectors = cached["vectors"]
                timing = json.loads(str(cached["timing"].item()))
                print(f"feature cache: {key}/{mode} ({len(vectors)} images)", flush=True)
            else:
                vectors, timing = model_features(spec["name"], rows, mode, spec["batch"], baseline)
                np.savez_compressed(feature_cache, vectors=vectors, timing=json.dumps(timing, ensure_ascii=False))
            scores, ranking_ms, grouped = score_matrix(types, rows, vectors)
            label = f"{key}:{mode}"
            matrices[label] = scores
            grouped_vectors[label] = grouped
            summary = accuracy_summary(scores, periods, ranking_ms)
            summary.update({
                "strategy": label,
                "model": spec["name"],
                "license": spec["license"],
                "representation": mode,
                "timing": timing,
                "confidence": confidence_metrics(scores),
            })
            results.append(summary)

    representation_fusions = []
    for key in model_keys:
        original_label = f"{key}:original"
        normalized_label = f"{key}:normalized"
        if original_label not in matrices or normalized_label not in matrices:
            continue
        fused_scores = 0.5 * row_z(matrices[original_label]) + 0.5 * row_z(matrices[normalized_label])
        label = f"{key}:original+normalized"
        matrices[label] = fused_scores
        summary = accuracy_summary(fused_scores, periods)
        summary.update({
            "strategy": label,
            "model": MODEL_SPECS[key]["name"],
            "license": MODEL_SPECS[key]["license"],
            "representation": "score fusion of ORIGINAL and NORMALIZED",
            "timing": {"additional_fusion_cost": "ranking-only; two embeddings required"},
            "confidence": confidence_metrics(fused_scores),
        })
        results.append(summary)
        representation_fusions.append(label)

    best_visual = max(results, key=lambda row: (row["top1"], row["top3"], row["top5"]))
    visual_scores = matrices[best_visual["strategy"]]
    calibration = np.arange(len(types)) % 5 == 0
    evaluation = ~calibration
    global_weight = tune_visual_weight(visual_scores, metadata_clean, np.flatnonzero(calibration))
    global_hybrid = global_weight * row_z(visual_scores) + (1.0 - global_weight) * row_z(metadata_clean)

    period_weights = {}
    routed = np.empty_like(global_hybrid)
    for period in sorted(set(periods)):
        indices = np.flatnonzero(np.asarray(periods) == period)
        calibration_indices = indices[calibration[indices]]
        weight = global_weight if len(calibration_indices) < 8 else tune_visual_weight(visual_scores, metadata_clean, calibration_indices)
        period_weights[period] = round(float(weight), 2)
        routed[indices] = weight * row_z(visual_scores)[indices] + (1.0 - weight) * row_z(metadata_clean)[indices]

    hybrid_results = []
    for name, matrix in [("catalog_metadata_ceiling_global", global_hybrid), ("catalog_metadata_ceiling_period_routed", routed)]:
        summary = accuracy_summary(matrix, periods, indices=np.flatnonzero(evaluation))
        summary.update({"strategy": name, "confidence": confidence_metrics(matrix)})
        hybrid_results.append(summary)

    ablations = []
    for feature in metadata:
        ablated = compose_metadata(metadata, exclude=feature)
        matrix = global_weight * row_z(visual_scores) + (1.0 - global_weight) * row_z(ablated)
        ranks = ranks_from_scores(matrix)
        for period in sorted(set(periods)):
            indices = np.flatnonzero((np.asarray(periods) == period) & evaluation)
            if not len(indices):
                continue
            ablations.append({
                "removed_signal": feature,
                "period": period,
                "queries": len(indices),
                "top1": round(float(np.mean(ranks[indices] <= 1) * 100), 2),
            })

    noise_results = []
    for field in ("year", "nominal", "mint"):
        noisy_types = metadata_noise(types, field)
        noisy_metadata = compose_metadata(metadata_feature_matrices(noisy_types))
        matrix = global_weight * row_z(visual_scores) + (1.0 - global_weight) * row_z(noisy_metadata)
        summary = accuracy_summary(matrix, periods, indices=np.flatnonzero(evaluation))
        summary.update({"scenario": f"wrong-{field}"})
        noise_results.append(summary)

    metric_source = next((row["strategy"] for row in results if row["strategy"] == "dinov3_small:normalized"), best_visual["strategy"])
    metric = metric_learning(types, grouped_vectors[metric_source], periods)

    baseline_result = json.loads((ROOT / "lab/results/visual-cross-specimen-500-2026-09-10.json").read_text(encoding="utf-8"))
    payload = {
        "schema_version": 1,
        "generated_at": "2026-09-30",
        "purpose": "Frozen cross-specimen Vision v2 retrieval bake-off; no production wiring.",
        "base_commit": "6d6a0e25f021123a7a8630cc471150db02d672c1",
        "branch": "codex/vision-lab-20260930",
        "corpus": {
            **corpus,
            "usable_by_detailed_period": dict(sorted(Counter(periods).items())),
            "historical_availability_delta": {
                "historical_usable_types": baseline_result["corpus"]["usable_types"],
                "current_usable_types": len(types),
                "historical_downloaded_images": baseline_result["download"]["downloaded"],
                "current_usable_images": len(rows),
                "reason": "same frozen manifest; source-host availability changed; historical baseline was not rerun",
            },
        },
        "historical_baseline_reused_not_rerun": {
            "visual_summaries": baseline_result["visual_summaries"],
            "best_soft_hybrid": next(row for row in baseline_result["hybrid_summaries"] if row["strategy"] == "visual_soft_metadata" and row["scenario"] == "clean"),
        },
        "environment": {
            "python": sys.version.split()[0],
            "torch": torch.__version__,
            "timm": timm.__version__,
            "opencv": cv2.__version__,
            "cpu_threads": args.threads,
            "device": "cpu",
            "hf_home": "external temporary cache; not committed",
        },
        "visual_results": results,
        "representation_fusions": representation_fusions,
        "best_visual": best_visual["strategy"],
        "hybrid": {
            "clean_catalog_metadata_is_an_upper_bound_not_measured_ocr": True,
            "visual_source": best_visual["strategy"],
            "global_visual_weight": round(float(global_weight), 2),
            "period_visual_weights": period_weights,
            "results": hybrid_results,
            "wrong_metadata_resilience": noise_results,
            "signal_ablation_evaluation_split": ablations,
        },
        "metric_learning": {"source": metric_source, **metric},
        "limitations": [
            "The candidate universe is the usable subset of the frozen 500-type manifest, not the complete APOMONET catalog.",
            "Museum metadata defines identity groups and can contain cataloguing errors.",
            "PRL has zero usable identity-separated cross-specimen types in this open corpus, so PRL recognition accuracy is not estimable without new legal pairs.",
            "OCR is represented as controlled metadata evidence/noise; mobile OCR itself is not benchmarked in this runner.",
            "CPU latency is reproducible laboratory latency, not a physical-phone measurement.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "usable_types": len(types),
        "best_visual": best_visual["strategy"],
        "best_visual_top1": best_visual["top1"],
        "hybrid_top1": hybrid_results[-1]["top1"],
        "metric_raw_top1": metric["raw_embedding"]["top1"],
        "metric_learned_top1": metric["learned_projection"]["top1"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
