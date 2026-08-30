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
    "field-index", "legend-token", "chronology", "metrology", "source-consensus", "controlled-confusion-family",
  ]);
  assert.equal(recognitionEnginePolicy.confusionFamilies.length, 7);
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

test("II RP Warsaw mint aliases consolidate source specimens without merging foreign mints", () => {
  const aliases = [
    {
      id: "warsaw-a", title: "5 groszy 1923", ruler: "Rzeczpospolita Polska", year: "1923",
      nominal: "5 groszy", mint: "Warszawa", objectKind: "coin", sourceName: "Źródło A", images: [],
    },
    {
      id: "warsaw-b", title: "5 groszy 1923", ruler: "Rzeczpospolita Polska", year: "1923",
      nominal: "5 groszy", mint: "Państwowa (1924-1994)", objectKind: "coin", sourceName: "Źródło B", images: [],
    },
    {
      id: "kings-norton", title: "5 groszy 1923", ruler: "Rzeczpospolita Polska", year: "1923",
      nominal: "5 groszy", mint: "Kings Norton", objectKind: "coin", sourceName: "Źródło C", images: [],
    },
  ];
  const result = retrieveCandidatesWithEngines({
    rulerReading: "Rzeczpospolita Polska", yearReading: "1923", denominationReading: "5 groszy",
    mintReading: "Warszawa", obverseLegendFragments: [], reverseLegendFragments: [],
  }, aliases);
  assert.equal(result.shortlist.length, 2);
  const warsaw = result.shortlist.find((candidate) => candidate.id !== "kings-norton");
  const foreign = result.shortlist.find((candidate) => candidate.id === "kings-norton");
  assert.equal(warsaw.sourceConsensus, 2);
  assert.equal(warsaw.supportingSourceRecords, 2);
  assert.equal(foreign.sourceConsensus, 1);
});

test("controlled II RP family abstains when otherwise equal candidates differ by mint", () => {
  const peers = [
    { id: "warsaw", coinTypeId: "type-w", issueId: "issue-w", title: "1 złoty 1925", ruler: "Rzeczpospolita Polska", year: "1925", periodId: "second-republic-and-war", nominal: "1 złoty", mint: "Warszawa", metal: "srebro", objectKind: "coin", sourceName: "A", images: [] },
    { id: "philadelphia", coinTypeId: "type-p", issueId: "issue-p", title: "1 złoty 1925", ruler: "Rzeczpospolita Polska", year: "1925", periodId: "second-republic-and-war", nominal: "1 złoty", mint: "Filadelfia", metal: "srebro", objectKind: "coin", sourceName: "B", images: [] },
  ];
  const result = orchestrateRecognitionCandidates({
    rulerReading: "Rzeczpospolita Polska", yearReading: "1925", denominationReading: "1 złoty",
    mintReading: "Nie ustalono", metalAppearance: "srebro", obverseLegendFragments: [], reverseLegendFragments: [],
  }, peers);
  assert.equal(result.selected, null);
  assert.equal(result.controlledConflict.blocked, true);
  assert.ok(result.controlledConflict.activeFamilies.includes("second-republic-mint-mark"));
});

test("a visible counterstamp blocks a regular host-coin lookalike", () => {
  const regularIssue = candidates.filter((candidate) =>
    candidate.coinTypeId === "type_058114093d8ab885",
  );
  assert.ok(regularIssue.length > 0);
  const result = orchestrateRecognitionCandidates({
    rulerReading: "SIGIS AVG",
    yearReading: "1564",
    denominationReading: "talar",
    mintReading: "Nie ustalono",
    metalAppearance: "srebro",
    portrait: "popiersie Filipa II na monecie gospodarzu",
    heraldry: ["tarcza neapolitańska"],
    mintMarks: ["kontrmarka: ukoronowany monogram SA, data 15-64"],
    obverseLegendFragments: ["PHILIPPVS"],
    reverseLegendFragments: ["15", "64"],
  }, regularIssue, { weightGrams: 29.04, diameterMm: 41.25 });
  assert.equal(result.selected, null);
  assert.equal(result.controlledConflict.blocked, true);
  assert.ok(result.controlledConflict.activeFamilies.includes("counterstamped-host-coin"));
  assert.match(result.controlledConflict.reason, /kontrmarka/i);
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
