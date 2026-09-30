#!/usr/bin/env python3
"""Local OCR evidence benchmark for the frozen APOMONET Vision v2 corpus."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import statistics
import subprocess
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "lab/corpus/visual-corpus-manifest-2026-09-10.json"
DEFAULT_CACHE = ROOT / ".lab-image-cache"
DEFAULT_FEATURES = ROOT / ".lab-feature-cache/siglip2_base-normalized-1971.npz"
DEFAULT_OCR_CACHE = ROOT / ".lab-feature-cache/tesseract-ocr-2026-09-30.json"
DEFAULT_OUTPUT = ROOT / "lab/results/vision-v2-ocr-2026-09-30.json"


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    parser.add_argument("--feature-cache", type=Path, default=DEFAULT_FEATURES)
    parser.add_argument("--ocr-cache", type=Path, default=DEFAULT_OCR_CACHE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--max-types", type=int, default=500)
    return parser.parse_args()


def load_helper():
    path = ROOT / "scripts/lab-vision-v2-retrieval.py"
    spec = importlib.util.spec_from_file_location("apomonet_vision_v2_retrieval", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def normalize_ocr_image(rgb: np.ndarray):
    height, width = rgb.shape[:2]
    scale = min(2.5, 1100.0 / max(height, width))
    resized = cv2.resize(rgb, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_CUBIC)
    gray = cv2.cvtColor(resized, cv2.COLOR_RGB2GRAY)
    gray = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
    return cv2.addWeighted(gray, 1.55, cv2.GaussianBlur(gray, (0, 0), 1.2), -0.55, 0)


def tesseract_text(rgb: np.ndarray):
    prepared = normalize_ocr_image(rgb)
    texts = []
    timings = []
    for turns in range(4):
        rotated = np.rot90(prepared, turns).copy()
        ok, encoded = cv2.imencode(".png", rotated)
        if not ok:
            continue
        started = time.perf_counter()
        completed = subprocess.run(
            ["tesseract", "stdin", "stdout", "-l", "eng", "--oem", "1", "--psm", "11"],
            input=encoded.tobytes(),
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            check=False,
        )
        timings.append((time.perf_counter() - started) * 1000)
        if completed.returncode == 0:
            texts.append(completed.stdout.decode("utf-8", errors="ignore"))
    text = " ".join(texts)
    text = re.sub(r"\s+", " ", text).strip()
    return text, sum(timings)


def plausible_years(text: str):
    years = set()
    for token in re.findall(r"(?<!\d)(\d{3,4})(?!\d)", text):
        year = int(token)
        if 900 <= year <= 2026:
            years.add(year)
    return sorted(years)


def lexical_tokens(helper, value: object):
    return {token for token in helper.norm_text(value).split() if len(token) >= 2}


def reference_text(item: dict):
    reference = item["reference"]
    fields = ("name", "title", "nominal", "ruler", "mint", "issuer", "legend", "metal")
    return " ".join(str(reference.get(field) or "") for field in fields)


def ocr_matrix(types: list[dict], texts: list[str], helper):
    n = len(types)
    matrix = np.zeros((n, n), np.float32)
    for query_index, text in enumerate(texts):
        years = plausible_years(text)
        tokens = lexical_tokens(helper, text)
        for candidate_index, item in enumerate(types):
            reference = item["reference"]
            candidate_year = helper.year_number(reference.get("year"))
            if candidate_year is not None and years:
                delta = min(abs(candidate_year - year) for year in years)
                year_score = 1.0 if delta == 0 else 0.45 if delta == 1 else 0.12 if delta <= 5 else 0.0
            else:
                year_score = 0.0
            candidate_tokens = lexical_tokens(helper, reference_text(item))
            lexical = len(tokens & candidate_tokens) / max(1, len(candidate_tokens))
            matrix[query_index, candidate_index] = 0.72 * year_score + 0.28 * min(1.0, lexical)
    return matrix


def main():
    args = parse_args()
    helper = load_helper()
    baseline = helper.load_baseline_module()
    types, rows, _, corpus = helper.load_frozen_rows(args.manifest, args.cache_dir, args.max_types, baseline)
    if not args.feature_cache.exists():
        raise SystemExit(f"Missing feature cache: {args.feature_cache}")
    cached_features = np.load(args.feature_cache, allow_pickle=False)["vectors"]
    visual_scores, _, _ = helper.score_matrix(types, rows, cached_features)

    cached_ocr = {}
    if args.ocr_cache.exists():
        cached_ocr = json.loads(args.ocr_cache.read_text(encoding="utf-8"))
    query_rows = defaultdict(list)
    for row in rows:
        if row["entry"].role == "query":
            query_rows[row["entry"].type_id].append(row)
    texts = []
    timing_ms = []
    for index, item in enumerate(types):
        type_id = item["typeId"]
        if type_id in cached_ocr:
            record = cached_ocr[type_id]
        else:
            chosen = query_rows[type_id][0]
            text, elapsed = tesseract_text(chosen["rgb"])
            record = {"text": text, "elapsed_ms": elapsed}
            cached_ocr[type_id] = record
            if (index + 1) % 20 == 0:
                args.ocr_cache.parent.mkdir(parents=True, exist_ok=True)
                args.ocr_cache.write_text(json.dumps(cached_ocr, ensure_ascii=False), encoding="utf-8")
        texts.append(record["text"])
        timing_ms.append(float(record["elapsed_ms"]))
        print(f"ocr {index + 1}/{len(types)}", flush=True)
    args.ocr_cache.parent.mkdir(parents=True, exist_ok=True)
    args.ocr_cache.write_text(json.dumps(cached_ocr, ensure_ascii=False), encoding="utf-8")

    evidence = ocr_matrix(types, texts, helper)
    periods = [helper.detailed_period(item) for item in types]
    calibration = np.arange(len(types)) % 5 == 0
    evaluation = ~calibration
    evaluation_indices = np.flatnonzero(evaluation)
    visual_z = helper.row_z(visual_scores)
    evidence_z = helper.row_z(evidence)
    best = None
    for visual_weight in np.arange(0.60, 1.001, 0.05):
        combined = visual_weight * visual_z + (1.0 - visual_weight) * evidence_z
        ranks = helper.ranks_from_scores(combined)[calibration]
        candidate = (float(np.mean(ranks <= 1)), float(np.mean(ranks <= 3)), float(visual_weight))
        if best is None or candidate[:2] > best[:2]:
            best = candidate
    visual_weight = best[2]
    hybrid = visual_weight * visual_z + (1.0 - visual_weight) * evidence_z

    year_rows = []
    ocr_only_ranks = helper.ranks_from_scores(evidence)
    hybrid_ranks = helper.ranks_from_scores(hybrid)
    visual_ranks = helper.ranks_from_scores(visual_scores)
    for index, (item, text) in enumerate(zip(types, texts, strict=True)):
        truth_year = helper.year_number(item["query"].get("year"))
        years = plausible_years(text)
        year_rows.append({
            "period": periods[index],
            "year_available": bool(years),
            "year_exact": bool(truth_year is not None and truth_year in years),
            "year_wrong": bool(years and (truth_year is None or truth_year not in years)),
            "ocr_only_rank": int(ocr_only_ranks[index]),
            "visual_rank": int(visual_ranks[index]),
            "hybrid_rank": int(hybrid_ranks[index]),
        })

    def period_summary(period: str):
        indices = [i for i in evaluation_indices if periods[i] == period]
        rows_for_period = [year_rows[i] for i in indices]
        return {
            "period": period,
            "queries": len(indices),
            "year_available_percent": round(100 * statistics.mean(row["year_available"] for row in rows_for_period), 2),
            "year_exact_percent": round(100 * statistics.mean(row["year_exact"] for row in rows_for_period), 2),
            "year_wrong_percent": round(100 * statistics.mean(row["year_wrong"] for row in rows_for_period), 2),
            "ocr_only_top1": round(100 * statistics.mean(row["ocr_only_rank"] <= 1 for row in rows_for_period), 2),
            "visual_top1": round(100 * statistics.mean(row["visual_rank"] <= 1 for row in rows_for_period), 2),
            "visual_ocr_top1": round(100 * statistics.mean(row["hybrid_rank"] <= 1 for row in rows_for_period), 2),
        }

    exact = [row["year_exact"] for row in year_rows]
    wrong = [row["year_wrong"] for row in year_rows]
    payload = {
        "schema_version": 1,
        "generated_at": "2026-09-30",
        "purpose": "Real local OCR evidence benchmark; no API calls and no hard filtering.",
        "branch": "codex/vision-lab-20260930",
        "corpus": corpus,
        "engine": {
            "name": "Tesseract",
            "version": "5.3.4",
            "language": "eng",
            "page_segmentation_mode": 11,
            "rotations": [0, 90, 180, 270],
            "query_images_per_type": 1,
            "device": "CPU",
            "local_only": True,
        },
        "timing_ms_per_type": {
            "p50": round(float(np.percentile(timing_ms, 50)), 2),
            "p90": round(float(np.percentile(timing_ms, 90)), 2),
        },
        "year_reading": {
            "available_percent": round(100 * float(np.mean([bool(plausible_years(text)) for text in texts])), 2),
            "exact_percent": round(100 * float(np.mean(exact)), 2),
            "wrong_percent": round(100 * float(np.mean(wrong)), 2),
        },
        "visual_source": "siglip2_base:normalized",
        "visual_weight": round(float(visual_weight), 2),
        "visual_evaluation": helper.accuracy_summary(visual_scores, periods, indices=evaluation_indices),
        "ocr_only_evaluation": helper.accuracy_summary(evidence, periods, indices=evaluation_indices),
        "visual_ocr_soft_evaluation": helper.accuracy_summary(hybrid, periods, indices=evaluation_indices),
        "visual_ocr_confidence": helper.confidence_metrics(hybrid),
        "by_period": [period_summary(period) for period in sorted(set(periods))],
        "limitations": [
            "Tesseract is a generic baseline, not a curved-legend coin OCR model.",
            "Only the first query image is read; reference identities remain different specimens.",
            "The corpus includes many medieval coins with no machine-readable Arabic year.",
            "OCR evidence is soft-scored and is never a veto.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "year_exact_percent": payload["year_reading"]["exact_percent"],
        "visual_top1": payload["visual_evaluation"]["top1"],
        "visual_ocr_top1": payload["visual_ocr_soft_evaluation"]["top1"],
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
