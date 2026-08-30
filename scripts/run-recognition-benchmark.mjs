#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  adjudicateRecognition,
  localReferenceCandidates,
  normalized,
} from "../lib/recognition-core.mjs";
import { orchestrateRecognitionCandidates } from "../lib/recognition-orchestrator.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = resolve(ROOT, "data/benchmarks/recognition-stage1-v1.json");
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const candidates = localReferenceCandidates();
const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || fallback) : fallback;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function percent(value, total) {
  return total ? Number(((value / total) * 100).toFixed(1)) : 0;
}

function diagnosticText(candidate) {
  return normalized([
    candidate?.title,
    candidate?.nominal,
    candidate?.mint,
    candidate?.diagnosticMarkers,
    candidate?.obverseLegend,
    candidate?.reverseLegend,
  ].flat(Infinity).filter(Boolean).join(" "));
}

function hasExpectedTokens(candidate, expectedTokens = []) {
  const text = diagnosticText(candidate);
  return expectedTokens.every((token) => text.includes(normalized(token)));
}

const results = [];
for (const entry of fixture.cases) {
  const target = entry.targetId ? candidateById.get(entry.targetId) : null;
  if (entry.targetId && !target) throw new Error(`Benchmark target missing: ${entry.targetId}`);
  const orchestration = orchestrateRecognitionCandidates(
    entry.observations,
    candidates,
    entry.measurements || {},
  );
  const ranked = orchestration.ranked.slice(0, 5);
  const top = ranked[0]?.candidate || null;
  const top3 = ranked.slice(0, 3).map((item) => item.candidate);
  // The synthetic decision must respect the same abstention gate as runtime.
  // Falling back to the top candidate hid controlled-family conflicts and made
  // the benchmark report a confident answer after the orchestrator said stop.
  const modelSelectedId = orchestration.engineConflict
    ? ""
    : orchestration.selected?.candidate?.id || top?.id || "";
  const raw = {
    objectKind: entry.objectKind || "coin",
    observations: entry.observations,
    decision: {
      selectedCandidateId: modelSelectedId,
      candidateFit: Math.max(0, Math.min(100, Number(ranked[0]?.score) || 0)),
      contradictions: [],
      supportingFeatures: ranked[0]?.reasons || [],
    },
  };
  const recognition = adjudicateRecognition(
    raw,
    orchestration.ranked.map((item) => item.candidate),
    entry.measurements || {},
  );
  const selectedCandidate = recognition.selected || null;
  const expectedAbstain = entry.expectAbstain === true;
  const correctAbstention = expectedAbstain && recognition.status !== "confirmed-candidate";
  const falseConfidentSelection = expectedAbstain && recognition.status === "confirmed-candidate";
  results.push({
    id: entry.id,
    category: entry.category,
    expectedAbstain,
    targetId: entry.targetId || null,
    targetCoinTypeId: target?.coinTypeId || null,
    topCandidateId: top?.id || null,
    topCoinTypeId: top?.coinTypeId || null,
    top1CoinType: Boolean(target && top?.coinTypeId === target.coinTypeId),
    top3CoinType: Boolean(target && top3.some((candidate) => candidate.coinTypeId === target.coinTypeId)),
    diagnosticFamily: Boolean(target && hasExpectedTokens(top, entry.expectedTokens)),
    correctAbstention,
    falseConfidentSelection,
    recognitionStatus: recognition.status,
    selectedCandidateId: selectedCandidate?.id || null,
    candidateCount: orchestration.retrieval.groupedCandidateCount,
    localDurationMs: orchestration.timings.totalLocalMs,
  });
}

const positive = results.filter((entry) => !entry.expectedAbstain);
const abstention = results.filter((entry) => entry.expectedAbstain);
const durations = results.map((entry) => entry.localDurationMs);
const summary = {
  schemaVersion: fixture.schemaVersion,
  label: argument("--label", "run"),
  generatedAt: new Date().toISOString(),
  catalogRecords: candidates.length,
  cases: results.length,
  positiveCases: positive.length,
  abstentionCases: abstention.length,
  top1CoinType: percent(positive.filter((entry) => entry.top1CoinType).length, positive.length),
  top3CoinType: percent(positive.filter((entry) => entry.top3CoinType).length, positive.length),
  diagnosticFamily: percent(positive.filter((entry) => entry.diagnosticFamily).length, positive.length),
  correctAbstention: percent(abstention.filter((entry) => entry.correctAbstention).length, abstention.length),
  falseConfidentSelection: percent(abstention.filter((entry) => entry.falseConfidentSelection).length, abstention.length),
  localP50Ms: percentile(durations, 0.5),
  localP90Ms: percentile(durations, 0.9),
  aiUsage: {
    measured: false,
    inputTokens: 0,
    outputTokens: 0,
    note: "Benchmark lokalny nie wywołuje modelu ani nie udaje kosztu API. Koszt end-to-end wymaga kontrolowanej próby wdrożonego Stage 1."
  }
};

const report = { summary, results };
const output = argument("--output");
if (output) {
  const outputPath = resolve(ROOT, output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report, null, 2));
