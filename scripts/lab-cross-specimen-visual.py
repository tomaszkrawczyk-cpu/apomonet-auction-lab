#!/usr/bin/env python3
"""Rights-gated, cross-specimen visual retrieval benchmark for ApoMonet.

The script is deliberately isolated from production. It downloads only images
already admitted by the catalog rights gate, keeps them in a temporary cache,
uses a different museum record for query and reference, and writes aggregate
metrics without redistributing source images.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import math
import os
import re
import shutil
import statistics
import time
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

import cv2
import numpy as np
import requests
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "lab/corpus/visual-corpus-manifest-2026-09-10.json"
DEFAULT_OUTPUT = ROOT / "lab/results/visual-cross-specimen-500-2026-09-10.json"
DEFAULT_REPORT = ROOT / "lab/results/visual-cross-specimen-500-2026-09-10.md"
ACCEPTED_RIGHTS = {"public-domain", "explicit-open-license"}
USER_AGENT = "ApoMonetResearchLab/1.0 (non-production benchmark; contact via repository)"


@dataclass(frozen=True)
class ImageEntry:
    type_id: str
    period: str
    role: str
    source_name: str
    source_record_id: str
    title: str
    url: str
    side: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--cache-dir", type=Path, default=ROOT / ".lab-image-cache")
    parser.add_argument("--max-types", type=int, default=500)
    parser.add_argument("--images-per-record", type=int, default=2)
    parser.add_argument("--download-workers", type=int, default=10)
    parser.add_argument("--local-rerank", type=int, default=20)
    parser.add_argument("--retain-cache", action="store_true")
    parser.add_argument("--skip-resnet", action="store_true")
    return parser.parse_args()


def norm_text(value: object) -> str:
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def year_number(value: object) -> int | None:
    match = re.search(r"(?:^|\D)(9\d{2}|1\d{3}|20\d{2})(?:\D|$)", str(value or ""))
    return int(match.group(1)) if match else None


def percentile(values: list[float], q: float) -> float:
    return float(np.percentile(np.asarray(values, dtype=np.float64), q)) if values else 0.0


def rounded(value: float, digits: int = 1) -> float:
    return round(float(value), digits)


def safe_z(values: np.ndarray) -> np.ndarray:
    finite = np.isfinite(values)
    if not finite.any():
        return np.full_like(values, -10.0, dtype=np.float32)
    valid = values[finite]
    std = float(valid.std())
    out = np.full_like(values, -10.0, dtype=np.float32)
    out[finite] = (valid - float(valid.mean())) / (std if std > 1e-7 else 1.0)
    return out


def load_manifest(path: Path, max_types: int, images_per_record: int) -> tuple[list[dict], list[ImageEntry], dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    selected = payload["corpus"][:max_types]
    entries: list[ImageEntry] = []
    for item in selected:
        for role in ("reference", "query"):
            record = item[role]
            accepted = [
                image for image in record.get("images", [])
                if image.get("rightsCode") in ACCEPTED_RIGHTS and str(image.get("url", "")).startswith("https://")
            ][:images_per_record]
            for image in accepted:
                entries.append(ImageEntry(
                    type_id=item["typeId"],
                    period=item["period"],
                    role=role,
                    source_name=record.get("sourceName", ""),
                    source_record_id=record.get("sourceRecordId", ""),
                    title=record.get("title", ""),
                    url=image["url"],
                    side=image.get("side", ""),
                ))

    requested_images = len(entries)
    # Prevent exact-file leakage and ambiguous references across identities.
    query_owners: dict[str, set[str]] = defaultdict(set)
    reference_owners: dict[str, set[str]] = defaultdict(set)
    for entry in entries:
        (query_owners if entry.role == "query" else reference_owners)[entry.url].add(entry.type_id)
    contaminated = {
        url for url, owners in reference_owners.items()
        if len(owners) > 1 or url in query_owners
    } | {
        url for url, owners in query_owners.items() if len(owners) > 1
    }
    entries = [entry for entry in entries if entry.url not in contaminated]
    diagnostics = {
        "manifest_types": len(selected),
        "requested_images": requested_images,
        "removed_contaminated_urls": len(contaminated),
    }
    return selected, entries, diagnostics


def cache_path(cache_dir: Path, url: str) -> Path:
    return cache_dir / (hashlib.sha256(url.encode("utf-8")).hexdigest() + ".img")


def validate_image_bytes(data: bytes) -> bool:
    if not data or len(data) > 20 * 1024 * 1024:
        return False
    try:
        image = Image.open(__import__("io").BytesIO(data))
        image.verify()
        return image.width >= 80 and image.height >= 80
    except Exception:
        return False


def download_one(entry: ImageEntry, cache_dir: Path) -> dict:
    destination = cache_path(cache_dir, entry.url)
    if destination.exists() and destination.stat().st_size > 0:
        return {"entry": entry, "path": destination, "ok": True, "cached": True, "bytes": destination.stat().st_size}
    error = "unknown"
    for attempt in range(3):
        try:
            response = requests.get(entry.url, headers={"User-Agent": USER_AGENT}, timeout=(10, 30), allow_redirects=True)
            response.raise_for_status()
            if not validate_image_bytes(response.content):
                raise ValueError("response is not a usable image")
            destination.write_bytes(response.content)
            return {"entry": entry, "path": destination, "ok": True, "cached": False, "bytes": len(response.content)}
        except Exception as exc:  # noqa: BLE001 - errors are aggregated, not hidden
            error = f"{type(exc).__name__}: {str(exc)[:160]}"
            if attempt < 2:
                time.sleep(0.7 * (attempt + 1))
    return {"entry": entry, "path": destination, "ok": False, "cached": False, "bytes": 0, "error": error}


def download_images(entries: list[ImageEntry], cache_dir: Path, workers: int) -> tuple[list[dict], dict]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    unique: dict[str, ImageEntry] = {}
    for entry in entries:
        unique.setdefault(entry.url, entry)
    started = time.perf_counter()
    results: list[dict] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(download_one, entry, cache_dir) for entry in unique.values()]
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            results.append(future.result())
            if index % 100 == 0 or index == len(futures):
                print(f"download {index}/{len(futures)}", flush=True)
    by_host: dict[str, Counter] = defaultdict(Counter)
    for row in results:
        by_host[urlparse(row["entry"].url).netloc]["ok" if row["ok"] else "failed"] += 1
    summary = {
        "requested_unique_urls": len(unique),
        "downloaded": sum(row["ok"] for row in results),
        "failed": sum(not row["ok"] for row in results),
        "bytes": sum(row["bytes"] for row in results if row["ok"]),
        "elapsed_seconds": rounded(time.perf_counter() - started, 2),
        "by_host": {host: dict(counts) for host, counts in sorted(by_host.items())},
        "failure_examples": [
            {"host": urlparse(row["entry"].url).netloc, "error": row.get("error", "")}
            for row in results if not row["ok"]
        ][:10],
    }
    paths = {row["entry"].url: row["path"] for row in results if row["ok"]}
    expanded = [{"entry": entry, "path": paths[entry.url]} for entry in entries if entry.url in paths]
    return expanded, summary


def read_rgb(path: Path) -> np.ndarray:
    raw = np.fromfile(path, dtype=np.uint8)
    bgr = cv2.imdecode(raw, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("OpenCV could not decode image")
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def normalize_coin(rgb: np.ndarray, size: int = 224) -> np.ndarray:
    height, width = rgb.shape[:2]
    scale = min(1.0, 640.0 / max(height, width))
    if scale < 1.0:
        rgb = cv2.resize(rgb, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_AREA)
    height, width = rgb.shape[:2]
    border = max(3, round(min(height, width) * 0.05))
    border_pixels = np.concatenate([
        rgb[:border].reshape(-1, 3), rgb[-border:].reshape(-1, 3),
        rgb[:, :border].reshape(-1, 3), rgb[:, -border:].reshape(-1, 3),
    ])
    background = np.median(border_pixels.astype(np.float32), axis=0)
    distance = np.linalg.norm(rgb.astype(np.float32) - background, axis=2)
    border_distance = np.linalg.norm(border_pixels.astype(np.float32) - background, axis=1)
    threshold = max(18.0, float(np.percentile(border_distance, 95)) + 10.0)
    mask = np.uint8(distance > threshold) * 255
    kernel = np.ones((7, 7), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    selected = None
    center = np.array([width / 2, height / 2])
    best = -1.0
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        area_ratio = (w * h) / float(width * height)
        if not 0.03 <= area_ratio <= 0.95:
            continue
        contour_center = np.array([x + w / 2, y + h / 2])
        centrality = 1.0 - min(1.0, np.linalg.norm(contour_center - center) / max(width, height))
        score = area_ratio * (0.5 + centrality)
        if score > best:
            best, selected = score, (x, y, w, h)
    if selected is None:
        side = min(height, width)
        selected = ((width - side) // 2, (height - side) // 2, side, side)
    x, y, w, h = selected
    pad = round(max(w, h) * 0.07)
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(width, x + w + pad), min(height, y + h + pad)
    crop = rgb[y0:y1, x0:x1]
    side = max(crop.shape[:2])
    canvas = np.empty((side, side, 3), dtype=np.uint8)
    canvas[:] = np.uint8(np.clip(background, 0, 255))
    oy = (side - crop.shape[0]) // 2
    ox = (side - crop.shape[1]) // 2
    canvas[oy:oy + crop.shape[0], ox:ox + crop.shape[1]] = crop
    return cv2.resize(canvas, (size, size), interpolation=cv2.INTER_AREA if side > size else cv2.INTER_CUBIC)


HOG = cv2.HOGDescriptor((128, 128), (16, 16), (8, 8), (8, 8), 9)
SIFT = cv2.SIFT_create(nfeatures=100, contrastThreshold=0.025, edgeThreshold=12)
BF = cv2.BFMatcher(cv2.NORM_L2)


def phash_feature(rgb: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(cv2.resize(rgb, (32, 32)), cv2.COLOR_RGB2GRAY).astype(np.float32)
    coeff = cv2.dct(gray)[:8, :8].reshape(-1)
    bits = np.where(coeff > np.median(coeff[1:]), 1.0, -1.0).astype(np.float32)
    return bits / math.sqrt(len(bits))


def hog_feature(rgb: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(cv2.resize(rgb, (128, 128)), cv2.COLOR_RGB2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    vector = HOG.compute(gray).reshape(-1).astype(np.float32)
    norm = float(np.linalg.norm(vector))
    return vector / norm if norm else vector


def sift_feature(rgb: np.ndarray) -> np.ndarray | None:
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    _, descriptors = SIFT.detectAndCompute(gray, None)
    return descriptors.astype(np.float32) if descriptors is not None and len(descriptors) >= 4 else None


def load_resnet(skip: bool):
    if skip:
        return None, None
    try:
        import torch
        from torchvision.models import ResNet18_Weights, resnet18

        weights = ResNet18_Weights.DEFAULT
        model = resnet18(weights=weights)
        model.fc = torch.nn.Identity()
        model.eval()
        return model, torch
    except Exception as exc:  # noqa: BLE001
        print(f"ResNet unavailable: {type(exc).__name__}: {exc}", flush=True)
        return None, None


def resnet_features(images: list[np.ndarray], model, torch_module, batch_size: int = 32) -> tuple[list[np.ndarray], float]:
    if model is None:
        return [], 0.0
    means = torch_module.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1)
    stds = torch_module.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1)
    rows: list[np.ndarray] = []
    started = time.perf_counter()
    with torch_module.inference_mode():
        for start in range(0, len(images), batch_size):
            batch = np.stack(images[start:start + batch_size]).astype(np.float32) / 255.0
            tensor = torch_module.from_numpy(batch).permute(0, 3, 1, 2)
            tensor = (tensor - means) / stds
            output = model(tensor).cpu().numpy().astype(np.float32)
            output /= np.maximum(np.linalg.norm(output, axis=1, keepdims=True), 1e-8)
            rows.extend(output)
    return rows, time.perf_counter() - started


def prepare_features(downloaded: list[dict], skip_resnet: bool) -> tuple[list[dict], dict, object, object]:
    prepared: list[dict] = []
    classical_ms: list[float] = []
    failures = []
    for index, row in enumerate(downloaded, 1):
        try:
            started = time.perf_counter()
            rgb = normalize_coin(read_rgb(row["path"]))
            prepared.append({
                "entry": row["entry"], "rgb": rgb,
                "phash": phash_feature(rgb), "hog": hog_feature(rgb), "sift": sift_feature(rgb),
            })
            classical_ms.append((time.perf_counter() - started) * 1000)
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{type(exc).__name__}: {str(exc)[:120]}")
        if index % 100 == 0 or index == len(downloaded):
            print(f"features {index}/{len(downloaded)}", flush=True)

    model, torch_module = load_resnet(skip_resnet)
    resnet_rows, resnet_seconds = resnet_features([row["rgb"] for row in prepared], model, torch_module)
    if resnet_rows:
        for row, vector in zip(prepared, resnet_rows, strict=True):
            row["resnet18"] = vector

    timing = {
        "classical_feature_p50_ms_per_image": rounded(percentile(classical_ms, 50), 2),
        "classical_feature_p90_ms_per_image": rounded(percentile(classical_ms, 90), 2),
        "resnet_batch_seconds": rounded(resnet_seconds, 2),
        "resnet_batch_ms_per_image": rounded(1000 * resnet_seconds / max(1, len(resnet_rows)), 2),
        "decode_failures": len(failures),
        "decode_failure_examples": failures[:5],
    }
    return prepared, timing, model, torch_module


def build_type_maps(types: list[dict], prepared: list[dict]) -> tuple[list[dict], dict[str, dict[str, list[dict]]]]:
    rows: dict[str, dict[str, list[dict]]] = defaultdict(lambda: {"query": [], "reference": []})
    for row in prepared:
        entry: ImageEntry = row["entry"]
        rows[entry.type_id][entry.role].append(row)
    usable = [item for item in types if rows[item["typeId"]]["query"] and rows[item["typeId"]]["reference"]]
    return usable, rows


def global_score_matrix(types: list[dict], rows: dict, method: str) -> tuple[np.ndarray, list[float]]:
    reference_vectors = []
    reference_type_indices = []
    for type_index, item in enumerate(types):
        for row in rows[item["typeId"]]["reference"]:
            reference_vectors.append(row[method])
            reference_type_indices.append(type_index)
    matrix = np.stack(reference_vectors)
    by_type = [np.flatnonzero(np.asarray(reference_type_indices) == index) for index in range(len(types))]
    output = np.empty((len(types), len(types)), dtype=np.float32)
    latencies = []
    for query_index, item in enumerate(types):
        started = time.perf_counter()
        query_vectors = np.stack([row[method] for row in rows[item["typeId"]]["query"]])
        image_scores = query_vectors @ matrix.T
        for reference_index, image_indices in enumerate(by_type):
            output[query_index, reference_index] = float(np.mean(np.max(image_scores[:, image_indices], axis=1)))
        latencies.append((time.perf_counter() - started) * 1000)
    return output, latencies


def sift_pair_score(query_rows: list[dict], reference_rows: list[dict]) -> float:
    side_scores = []
    for query in query_rows:
        best = 0.0
        qd = query["sift"]
        if qd is None:
            side_scores.append(0.0)
            continue
        for reference in reference_rows:
            rd = reference["sift"]
            if rd is None:
                continue
            matches = BF.knnMatch(qd, rd, k=2)
            good = sum(1 for pair in matches if len(pair) == 2 and pair[0].distance < 0.76 * pair[1].distance)
            best = max(best, good / max(8.0, math.sqrt(len(qd) * len(rd))))
        side_scores.append(best)
    return float(statistics.mean(side_scores)) if side_scores else 0.0


def local_rerank(types: list[dict], rows: dict, global_scores: np.ndarray, top_k: int) -> tuple[np.ndarray, list[float]]:
    output = np.full_like(global_scores, -np.inf)
    latencies = []
    for query_index, item in enumerate(types):
        started = time.perf_counter()
        candidates = np.argsort(-global_scores[query_index], kind="stable")[:top_k]
        local = np.asarray([
            sift_pair_score(rows[item["typeId"]]["query"], rows[types[index]["typeId"]]["reference"])
            for index in candidates
        ], dtype=np.float32)
        combined = 0.72 * safe_z(global_scores[query_index, candidates]) + 0.28 * safe_z(local)
        output[query_index, candidates] = combined + 5.0
        latencies.append((time.perf_counter() - started) * 1000)
    return output, latencies


def token_similarity(a: object, b: object) -> float:
    left, right = set(norm_text(a).split()), set(norm_text(b).split())
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def scalar_similarity(a: object, b: object, tolerance: float) -> float:
    try:
        left, right = float(a), float(b)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, 1.0 - abs(left - right) / max(tolerance, abs(left) * 0.12, 1e-6))


def mutate_query(query: dict, scenario: str, types: list[dict], index: int) -> dict:
    changed = dict(query)
    field = {"wrong-nominal": "nominal", "wrong-mint": "mint", "wrong-year": "year"}.get(scenario)
    if not field:
        return changed
    for offset in range(1, len(types)):
        candidate = types[(index + offset * 73) % len(types)]["reference"].get(field)
        if candidate and norm_text(candidate) != norm_text(changed.get(field)):
            changed[field] = candidate
            break
    return changed


def metadata_scores(query: dict, types: list[dict], period: str, period_aware: bool) -> np.ndarray:
    default = {"ruler": .28, "year": .24, "nominal": .22, "mint": .12, "metal": .08, "diameterMm": .06}
    period_weights = {
        "medieval": {"ruler": .22, "year": .16, "nominal": .18, "mint": .08, "metal": .16, "diameterMm": .20},
        "royal": {"ruler": .20, "year": .18, "nominal": .18, "mint": .18, "metal": .08, "diameterMm": .18},
        "partitions": {"ruler": .18, "year": .24, "nominal": .24, "mint": .12, "metal": .10, "diameterMm": .12},
        "second-republic-and-war": {"ruler": .12, "year": .28, "nominal": .28, "mint": .10, "metal": .10, "diameterMm": .12},
        "people-republic": {"ruler": .08, "year": .30, "nominal": .32, "mint": .08, "metal": .10, "diameterMm": .12},
        "contemporary": {"ruler": .08, "year": .30, "nominal": .32, "mint": .08, "metal": .10, "diameterMm": .12},
    }
    weights = period_weights.get(period, default) if period_aware else default
    scores = []
    for item in types:
        candidate = item["reference"]
        parts = {
            "ruler": token_similarity(query.get("ruler"), candidate.get("ruler")),
            "year": 1.0 if year_number(query.get("year")) == year_number(candidate.get("year")) and year_number(query.get("year")) else 0.0,
            "nominal": token_similarity(query.get("nominal"), candidate.get("nominal")),
            "mint": token_similarity(query.get("mint"), candidate.get("mint")),
            "metal": token_similarity(query.get("metal"), candidate.get("metal")),
            "diameterMm": scalar_similarity(query.get("diameterMm"), candidate.get("diameterMm"), 4.0),
        }
        scores.append(sum(weights[field] * parts[field] for field in weights))
    return np.asarray(scores, dtype=np.float32)


def hard_gate_scores(visual: np.ndarray, query: dict, types: list[dict]) -> np.ndarray:
    output = visual.copy()
    q_year = year_number(query.get("year"))
    q_nominal = norm_text(query.get("nominal"))
    q_mint = norm_text(query.get("mint"))
    for index, item in enumerate(types):
        candidate = item["reference"]
        conflicts = (
            (q_year and year_number(candidate.get("year")) and q_year != year_number(candidate.get("year")))
            or (q_nominal and norm_text(candidate.get("nominal")) and q_nominal != norm_text(candidate.get("nominal")))
            or (q_mint and norm_text(candidate.get("mint")) and q_mint != norm_text(candidate.get("mint")))
        )
        if conflicts:
            output[index] = -np.inf
    return output


def confidence_threshold(score_matrix: np.ndarray) -> float:
    margins = []
    for index in range(0, len(score_matrix), 5):
        finite = np.flatnonzero(np.isfinite(score_matrix[index]))
        if len(finite) < 2:
            continue
        order = finite[np.argsort(-score_matrix[index, finite], kind="stable")]
        margin = float(score_matrix[index, order[0]] - score_matrix[index, order[1]])
        margins.append((margin, order[0] == index))
    if not margins:
        return float("inf")
    candidates = sorted({margin for margin, _ in margins}) + [float("inf")]
    best_threshold, best_correct = float("inf"), -1
    denominator = max(1, len(margins))
    for threshold in candidates:
        confirmed = [(margin, correct) for margin, correct in margins if margin >= threshold]
        unsafe = sum(not correct for _, correct in confirmed) / denominator
        correct_count = sum(correct for _, correct in confirmed)
        if unsafe <= 0.01 and correct_count > best_correct:
            best_threshold, best_correct = threshold, correct_count
    return best_threshold


def summarize_scores(name: str, score_matrix: np.ndarray, periods: list[str], latencies: list[float] | None = None) -> tuple[dict, list[dict]]:
    threshold = confidence_threshold(score_matrix)
    records = []
    for index, scores in enumerate(score_matrix):
        finite = np.flatnonzero(np.isfinite(scores))
        order = finite[np.argsort(-scores[finite], kind="stable")] if len(finite) else np.asarray([], dtype=np.int64)
        top1 = int(order[0]) if len(order) else -1
        margin = float(scores[order[0]] - scores[order[1]]) if len(order) >= 2 else 0.0
        records.append({
            "index": index, "period": periods[index], "top1": top1,
            "correct_top1": bool(top1 == index), "correct_top5": bool(index in order[:5]),
            "margin": margin, "confirmed": bool(len(order) >= 2 and margin >= threshold),
            "no_candidates": bool(len(order) == 0),
        })
    evaluation = [row for row in records if row["index"] % 5 != 0]
    summary = {
        "strategy": name,
        "queries": len(records),
        "top1_accuracy": rounded(100 * statistics.mean(row["correct_top1"] for row in records)),
        "top5_accuracy": rounded(100 * statistics.mean(row["correct_top5"] for row in records)),
        "calibrated_margin_threshold": None if math.isinf(threshold) else rounded(threshold, 5),
        "evaluation_queries": len(evaluation),
        "confirmed_correct_coverage": rounded(100 * sum(row["confirmed"] and row["correct_top1"] for row in evaluation) / max(1, len(evaluation))),
        "unsafe_high_confidence_rate": rounded(100 * sum(row["confirmed"] and not row["correct_top1"] for row in evaluation) / max(1, len(evaluation))),
        "abstention_rate": rounded(100 * sum(not row["confirmed"] for row in evaluation) / max(1, len(evaluation))),
        "no_candidate_rate": rounded(100 * sum(row["no_candidates"] for row in evaluation) / max(1, len(evaluation))),
    }
    if latencies:
        summary.update({"p50_ranking_ms": rounded(percentile(latencies, 50), 2), "p90_ranking_ms": rounded(percentile(latencies, 90), 2)})
    return summary, records


def period_summary(name: str, records: list[dict]) -> list[dict]:
    result = []
    for period in sorted({row["period"] for row in records}):
        subset = [row for row in records if row["period"] == period]
        result.append({
            "strategy": name, "period": period, "queries": len(subset),
            "top1_accuracy": rounded(100 * statistics.mean(row["correct_top1"] for row in subset)),
            "top5_accuracy": rounded(100 * statistics.mean(row["correct_top5"] for row in subset)),
        })
    return result


def create_report(path: Path, payload: dict) -> None:
    visual = {row["strategy"]: row for row in payload["visual_summaries"]}
    hybrid = {(row["scenario"], row["strategy"]): row for row in payload["hybrid_summaries"]}
    lines = [
        "# ApoMonet — test wizualny różnych egzemplarzy (500 typów)", "",
        f"Data: {payload['generated_at']}", "",
        "## Zakres", "",
        f"- Typy w manifeście: {payload['corpus']['manifest_types']}",
        f"- Typy użyte po pobraniu i kontroli separacji: {payload['corpus']['usable_types']}",
        f"- Pobrane obrazy: {payload['download']['downloaded']} / {payload['download']['requested_unique_urls']}",
        "- Zapytanie i referencja pochodzą z różnych rekordów muzealnych.",
        "- Zdjęcia były przetwarzane tymczasowo i nie są częścią raportu ani artefaktu.", "",
        "## Strategie wizualne", "",
        "| Strategia | Top-1 | Top-5 | Pewny poprawny wynik | Pewny błąd | p50 rankingu |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for key in ["phash", "hog", "resnet18", "global_fusion", "sift_rerank"]:
        row = visual.get(key)
        if not row:
            continue
        lines.append(f"| {key} | {row['top1_accuracy']}% | {row['top5_accuracy']}% | {row['confirmed_correct_coverage']}% | {row['unsafe_high_confidence_rate']}% | {row.get('p50_ranking_ms', '—')} ms |")
    lines += ["", "## Hybryda obrazu i metadanych", "",
        "| Scenariusz | Twarde filtry Top-1 | Miękka hybryda Top-1 | Hybryda okresowa Top-1 |",
        "|---|---:|---:|---:|",
    ]
    for scenario in ["clean", "wrong-nominal", "wrong-mint", "wrong-year"]:
        hard = hybrid.get((scenario, "visual_hard_filters"), {})
        soft = hybrid.get((scenario, "visual_soft_metadata"), {})
        period = hybrid.get((scenario, "visual_period_metadata"), {})
        lines.append(f"| {scenario} | {hard.get('top1_accuracy', '—')}% | {soft.get('top1_accuracy', '—')}% | {period.get('top1_accuracy', '—')}% |")
    lines += ["", "## Werdykt automatyczny", "", payload["verdict"], "",
        "Pełne dane maszynowe, wyniki według okresów i przykłady pomyłek znajdują się w pliku JSON wygenerowanym razem z raportem.", ""]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    args = parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    types, entries, manifest_diagnostics = load_manifest(args.manifest, args.max_types, args.images_per_record)
    downloaded, download_summary = download_images(entries, args.cache_dir, args.download_workers)
    try:
        prepared, feature_timing, _model, _torch = prepare_features(downloaded, args.skip_resnet)
        usable_types, rows = build_type_maps(types, prepared)
        if len(usable_types) < 50:
            raise RuntimeError(f"Only {len(usable_types)} types have both query and reference images")
        periods = [item["period"] for item in usable_types]
        print(f"usable cross-specimen types: {len(usable_types)}", flush=True)

        matrices: dict[str, np.ndarray] = {}
        method_latencies: dict[str, list[float]] = {}
        for method in ["phash", "hog"] + (["resnet18"] if "resnet18" in prepared[0] else []):
            matrices[method], method_latencies[method] = global_score_matrix(usable_types, rows, method)
            print(f"ranked {method}", flush=True)

        fusion_parts = [("phash", .15), ("hog", .30)]
        if "resnet18" in matrices:
            fusion_parts.append(("resnet18", .55))
        weight_sum = sum(weight for _, weight in fusion_parts)
        fusion = np.stack([
            sum(weight * safe_z(matrices[name][index]) for name, weight in fusion_parts) / weight_sum
            for index in range(len(usable_types))
        ])
        matrices["global_fusion"] = fusion
        method_latencies["global_fusion"] = [sum(method_latencies[name][i] for name, _ in fusion_parts) for i in range(len(usable_types))]
        matrices["sift_rerank"], sift_ms = local_rerank(usable_types, rows, fusion, args.local_rerank)
        method_latencies["sift_rerank"] = [method_latencies["global_fusion"][i] + sift_ms[i] for i in range(len(usable_types))]

        visual_summaries, all_period_summaries, visual_records = [], [], {}
        for name, matrix in matrices.items():
            summary, records = summarize_scores(name, matrix, periods, method_latencies.get(name))
            visual_summaries.append(summary)
            all_period_summaries.extend(period_summary(name, records))
            visual_records[name] = records

        hybrid_summaries = []
        hybrid_records: dict[tuple[str, str], list[dict]] = {}
        base_visual = matrices["sift_rerank"]
        for scenario in ["clean", "wrong-nominal", "wrong-mint", "wrong-year"]:
            hard_rows, soft_rows, period_rows = [], [], []
            for index, item in enumerate(usable_types):
                query = mutate_query(item["query"], scenario, usable_types, index)
                hard_rows.append(hard_gate_scores(base_visual[index], query, usable_types))
                metadata = metadata_scores(query, usable_types, item["period"], False)
                period_metadata = metadata_scores(query, usable_types, item["period"], True)
                soft_rows.append(.74 * safe_z(base_visual[index]) + .26 * safe_z(metadata))
                period_rows.append(.70 * safe_z(base_visual[index]) + .30 * safe_z(period_metadata))
            for name, matrix in [
                ("visual_hard_filters", np.stack(hard_rows)),
                ("visual_soft_metadata", np.stack(soft_rows)),
                ("visual_period_metadata", np.stack(period_rows)),
            ]:
                summary, records = summarize_scores(name, matrix, periods)
                summary["scenario"] = scenario
                hybrid_summaries.append(summary)
                all_period_summaries.extend([{**row, "scenario": scenario} for row in period_summary(name, records)])
                hybrid_records[(scenario, name)] = records

        best_visual = max(visual_summaries, key=lambda row: (row["top5_accuracy"], row["top1_accuracy"]))
        best_soft = next(row for row in hybrid_summaries if row["scenario"] == "clean" and row["strategy"] == "visual_soft_metadata")
        verdict = (
            f"Najlepszy czysty shortlist wizualny: {best_visual['strategy']} "
            f"(Top-1 {best_visual['top1_accuracy']}%, Top-5 {best_visual['top5_accuracy']}%). "
            f"Miękka hybryda osiągnęła Top-1 {best_soft['top1_accuracy']}% i Top-5 {best_soft['top5_accuracy']}%. "
            "Twarde filtry należy odrzucić, jeżeli pod zakłóceniem roku, nominału lub mennicy tracą prawidłowego kandydata."
        )

        confusion_source = visual_records[best_visual["strategy"]]
        confusions = []
        for row in confusion_source:
            if row["correct_top1"]:
                continue
            expected, predicted = usable_types[row["index"]], usable_types[row["top1"]]
            confusions.append({
                "period": row["period"],
                "expected_type_id": expected["typeId"],
                "expected_title": expected["query"].get("title", ""),
                "predicted_type_id": predicted["typeId"],
                "predicted_title": predicted["reference"].get("title", ""),
                "margin": rounded(row["margin"], 5),
            })

        payload = {
            "schema_version": 1,
            "generated_at": date.today().isoformat(),
            "purpose": "Cross-specimen visual and hybrid retrieval benchmark; no production wiring.",
            "corpus": {
                **manifest_diagnostics,
                "usable_types": len(usable_types),
                "usable_by_period": dict(sorted(Counter(periods).items())),
                "query_reference_record_separation": True,
                "exact_url_leakage_removed": True,
            },
            "download": download_summary,
            "timing": feature_timing,
            "visual_summaries": visual_summaries,
            "hybrid_summaries": hybrid_summaries,
            "period_summaries": all_period_summaries,
            "confusion_examples": confusions[:40],
            "confidence_calibration": "Every fifth query calibrated the margin threshold; remaining queries evaluated safety.",
            "verdict": verdict,
            "limits": [
                "The candidate universe contains the usable subset of 500 selected identities, not every catalog identity.",
                "Museum metadata defines identity groups and can itself contain cataloging errors.",
                "PRL has too few cross-specimen open-image groups for a stable period estimate.",
                "Pretrained ResNet18 is generic and not a coin-specific embedding model.",
                "OCR is represented by controlled metadata evidence/noise, not by a production OCR engine.",
            ],
        }
        args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        create_report(args.report, payload)
        print(json.dumps({"output": str(args.output), "report": str(args.report), "verdict": verdict}, ensure_ascii=False, indent=2), flush=True)
    finally:
        if not args.retain_cache and args.cache_dir.exists():
            shutil.rmtree(args.cache_dir)


if __name__ == "__main__":
    main()
