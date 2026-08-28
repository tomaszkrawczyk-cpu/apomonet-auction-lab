import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { orchestrateRecognitionCandidates, retrieveCandidatesWithEngines } from "../lib/recognition-orchestrator.mjs";

function candidate(overrides = {}) {
  return {
    id: overrides.id || "candidate",
    title: overrides.title || "candidate",
    objectKind: "coin",
    country: "Rzeczpospolita Obojga Narodów",
    ruler: "Zygmunt II August",
    year: "1551",
    nominal: "Dukat",
    metal: "Złoto",
    mint: "Gdańsk",
    shape: "round",
    weightGrams: 3.5,
    diameterMm: 22,
    portrait: "",
    obverseLegend: "SIGIS AVG REX POLONI M D LIT 1551",
    reverseLegend: "MONE NO AVR CIVI GEDANEN",
    diagnosticMarkers: ["herb Gdańska z lwami"],
    images: [],
    sourceName: "test",
    sourceReference: "test",
    sourceUrl: "https://example.com",
    sourceType: "curated-fact",
    ...overrides,
  };
}

const august1551 = {
  rulerReading: "Stefan Batory",
  yearReading: "1551",
  denominationReading: "Dukat",
  mintReading: "Gdańsk",
  metalAppearance: "złoty",
  portrait: "portret króla",
  heraldry: ["herb Gdańska z lwami"],
  mintMarks: [],
  obverseLegendFragments: ["SIGIS AVG", "REX POLONI", "1551"],
  reverseLegendFragments: ["MONE NO AVR", "CIVI GEDANEN"],
};

test("SIGIS AVG overrides a wrong Stefan Batory portrait hypothesis", () => {
  const result = orchestrateRecognitionCandidates(august1551, [
    candidate({ id: "august-1551" }),
    candidate({ id: "batory-grosz", ruler: "Stefan Batory", year: "1582", nominal: "Grosz", metal: "Srebro" }),
    candidate({ id: "batory-5", ruler: "Stefan Batory", year: "1585", nominal: "Donatywa 5 dukatów", weightGrams: 17.5, diameterMm: 39 }),
    candidate({ id: "batory-10", ruler: "Stefan Batory", year: "1582", nominal: "Donatywa 10 dukatów", weightGrams: 35, diameterMm: 45 }),
  ]);
  assert.equal(result.selected?.candidate.id, "august-1551");
  assert.equal(result.ranked[0].candidate.ruler, "Zygmunt II August");
  assert.equal(result.ranked[0].candidate.year, "1551");
  assert.equal(result.ranked[0].candidate.nominal, "Dukat");
});

test("a characteristic matching legend keeps a yearless metadata record in the sieve", () => {
  const yearless = candidate({ id: "august-yearless", year: "", weightGrams: null, diameterMm: null });
  const result = retrieveCandidatesWithEngines(august1551, [yearless, candidate({ id: "wrong-year", year: "1554" })]);
  assert.ok(result.shortlist.some((item) => item.id === "august-yearless"));
  assert.ok(!result.shortlist.some((item) => item.id === "wrong-year"));
});

test("gold evidence independently removes a silver candidate", () => {
  const result = retrieveCandidatesWithEngines(august1551, [
    candidate({ id: "gold" }),
    candidate({ id: "silver", metal: "Srebro" }),
  ]);
  assert.deepEqual(result.shortlist.map((item) => item.id), ["gold"]);
  assert.ok(result.diagnostics.materialEngine.rejected >= 1);
});

test("28.4 g and 41.2 mm propagate across specimens and leave only the 1577 siege thaler scale", () => {
  const observations = {
    rulerReading: "Nie ustalono",
    yearReading: "1577",
    denominationReading: "Nie ustalono",
    mintReading: "GEDANENSIS",
    metalAppearance: "Srebro",
    portrait: "Chrystus z jabłkiem królewskim",
    heraldry: ["herb Gdańska z lwami"],
    mintMarks: [],
    obverseLegendFragments: ["DEFENDE NOS CHRISTE SALVATOR"],
    reverseLegendFragments: ["MONETA NOVA CIVITATIS GEDANENSIS", "1577"],
  };
  const common = {
    ruler: "Stefan Batory",
    year: "1577",
    mint: "Gdańsk",
    metal: "Srebro",
    obverseLegend: "DEFENDE NOS CHRISTE SALVATOR",
    reverseLegend: "MONETA NOVA CIVITATIS GEDANENSIS 1577",
  };
  const result = retrieveCandidatesWithEngines(observations, [
    candidate({ ...common, id: "thaler-reference", title: "Talar oblężniczy Gdańska 1577", nominal: "Talar", weightGrams: 28.4, diameterMm: 41.2 }),
    candidate({ ...common, id: "thaler-without-measures", title: "Talar oblężniczy Gdańska 1577 — drugi rekord", nominal: "Talar", weightGrams: null, diameterMm: null }),
    candidate({ ...common, id: "grosz-reference", title: "Grosz Gdańsk 1577", nominal: "Grosz", weightGrams: 1.9, diameterMm: 21 }),
    candidate({ ...common, id: "grosz-without-measures", title: "Grosz Gdańsk 1577 — drugi rekord", nominal: "Grosz", weightGrams: null, diameterMm: null }),
    candidate({ ...common, id: "szelag", title: "Szeląg Gdańsk 1577", nominal: "Szeląg", weightGrams: null, diameterMm: null }),
  ], { weightGrams: 28.4, diameterMm: 41.2 });
  assert.ok(result.shortlist.length >= 1);
  assert.ok(result.shortlist.every((item) => item.nominal === "Talar"));
  assert.ok(result.diagnostics.metrologyEngine.rejected >= 3);
});

test("saving owner measurements immediately reruns Stage 1", async () => {
  const source = await readFile(new URL("../analysis-owner-measurements.js", import.meta.url), "utf8");
  assert.match(source, /basicWeight/);
  assert.match(source, /basicDiameter/);
  assert.match(source, /go\.click/);
  assert.match(source, /Przeliczam identyfikację Etapu 1/);
});
