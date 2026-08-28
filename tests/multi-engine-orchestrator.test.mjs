import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { localReferenceCandidates } from "../lib/recognition-core.mjs";
import {
  orchestrateRecognitionCandidates,
  recognitionEnginePolicy,
  retrieveCandidatesWithEngines,
} from "../lib/recognition-orchestrator.mjs";

const candidates = localReferenceCandidates();
const batoryObservation = {
  rulerReading: "STEPHANVS D G REX POL",
  yearReading: "1587",
  denominationReading: "Dukat",
  mintReading: "GEDANENSIS Gdańsk",
  portrait: "koronowane popiersie króla w zbroi",
  heraldry: ["herb Gdańska z dwoma krzyżami i lwami"],
  mintMarks: [],
  obverseLegendFragments: ["STEPHANVS", "D G", "REX POL"],
  reverseLegendFragments: ["MONE", "AVR", "GEDANENSIS", "87"],
};

test("the orchestrator coordinates five independent evidence engines", () => {
  assert.equal(recognitionEnginePolicy.version, "multi-engine-orchestrator-v1");
  assert.deepEqual(recognitionEnginePolicy.engines, [
    "field-index", "legend-token", "chronology", "metrology", "source-consensus",
  ]);
  assert.equal(recognitionEnginePolicy.abstainsOnConflict, true);
  const result = retrieveCandidatesWithEngines(batoryObservation, candidates, { weightGrams: 3.57 });
  assert.ok(result.shortlist.length > 0);
  assert.ok(result.shortlist.length <= recognitionEnginePolicy.maxShortlist);
  assert.ok(result.diagnostics.fieldEngine.matches > 0);
  assert.ok(result.diagnostics.legendEngine.matches > 0);
  assert.ok(result.diagnostics.consensusEngine.groups > 0);
});

test("basic evidence identifies the Batory ducat and does not confuse it with a thaler", () => {
  const result = orchestrateRecognitionCandidates(batoryObservation, candidates, {
    weightGrams: 3.57,
    diameterMm: 22,
  });
  assert.ok(result.ranked.length > 0);
  assert.equal(result.ranked[0].candidate.id, "curated:batory-ducat-gdansk-1587");
  assert.equal(result.ranked[0].candidate.nominal, "Dukat");
  assert.doesNotMatch(result.ranked[0].candidate.nominal, /talar/i);
});

test("a warm 30k-record local comparison remains below one second", () => {
  const scale = 30_000;
  const stressCandidates = Array.from({ length: scale }, (_, index) => {
    const original = candidates[index % candidates.length];
    return { ...original, id: `${original.id}:stress:${index}` };
  });
  retrieveCandidatesWithEngines(batoryObservation, stressCandidates, { weightGrams: 3.57 });
  const durations = [];
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const started = performance.now();
    const result = retrieveCandidatesWithEngines(batoryObservation, stressCandidates, { weightGrams: 3.57 });
    durations.push(performance.now() - started);
    assert.ok(result.shortlist.length <= recognitionEnginePolicy.maxShortlist);
  }
  durations.sort((a, b) => a - b);
  const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
  assert.ok(p95 < 1_000, `30k warm lookup p95=${p95.toFixed(2)} ms`);
});
