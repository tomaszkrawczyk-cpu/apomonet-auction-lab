import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { TextEncoder } from "node:util";
import circulationCatalog from "../data/recognition/nbp-circulation-types-v1.json" with { type: "json" };
import {
  adjudicateRecognition,
  analysisFromRecognition,
  conditionFromRaw,
  localReferenceCandidates,
} from "../lib/recognition-core.mjs";
import { orchestrateRecognitionCandidates } from "../lib/recognition-orchestrator.mjs";

const candidates = localReferenceCandidates();

function modernRaw(observations) {
  const ranking = orchestrateRecognitionCandidates(observations, candidates, {});
  const raw = {
    imageUsable: true,
    observations,
    decision: {
      selectedCandidateId: ranking.selected?.candidate.id || "",
      candidateFit: ranking.selected?.score || 0,
      supportingFeatures: ranking.selected?.reasons || [],
      contradictions: [],
    },
    condition: { band: "uncertain", confidence: 0 },
  };
  return { raw, ranking };
}

test("official NBP standard-circulation layer covers nine denominations without copied images", () => {
  assert.equal(circulationCatalog.stats.standardDenominations, 9);
  assert.equal(circulationCatalog.records.length, 12);
  assert.equal(new Set(circulationCatalog.records.map((record) => record.nominal)).size, 9);
  for (const record of circulationCatalog.records) {
    assert.deepEqual(record.images, []);
    assert.equal(record.source.name, "Narodowy Bank Polski");
    assert.equal(record.source.rightsCode, "factual-metadata-only");
    assert.match(record.source.url, /^https:\/\/nbp\.pl\//);
  }
});

test("user-reported 2 zloty 2016 reaches and confirms the official circulation type", () => {
  const { raw, ranking } = modernRaw({
    rulerReading: "Nie ustalono",
    yearReading: "2016",
    denominationReading: "2 ZŁOTE",
    mintReading: "Nie ustalono",
    metalAppearance: "Obiekt bimetaliczny: pierścień o złocistej barwie i środek o srebrzystej barwie.",
    shape: "okrągła",
    portrait: "orzeł w koronie",
    heraldry: ["orzeł"],
    obverseLegendFragments: ["RZECZPOSPOLITA POLSKA", "2016"],
    reverseLegendFragments: ["2 ZŁOTE"],
  });
  assert.equal(ranking.ranked[0].candidate.id, "nbp-circulation:2-zl-1995-family");
  const recognition = adjudicateRecognition(raw, ranking.ranked.map((entry) => entry.candidate), {});
  const analysis = analysisFromRecognition(raw, recognition, conditionFromRaw(raw));
  assert.equal(recognition.status, "confirmed-candidate");
  assert.equal(analysis.nominal, "2 złote");
  assert.equal(analysis.year, "2016");
});

test("user-reported 20 groszy 2026 reaches and confirms the official circulation type", () => {
  const { raw, ranking } = modernRaw({
    rulerReading: "Nie ustalono",
    yearReading: "2026",
    denominationReading: "20 GROSZY",
    mintReading: "Nie ustalono",
    metalAppearance: "Srebrzysty, silnie połyskliwy metal",
    shape: "okrągła",
    portrait: "orzeł w koronie",
    heraldry: ["orzeł"],
    obverseLegendFragments: ["RZECZPOSPOLITA POLSKA", "2026"],
    reverseLegendFragments: ["20 GROSZY"],
  });
  assert.equal(ranking.ranked[0].candidate.id, "nbp-circulation:20-gr-1995-family");
  const recognition = adjudicateRecognition(raw, ranking.ranked.map((entry) => entry.candidate), {});
  const analysis = analysisFromRecognition(raw, recognition, conditionFromRaw(raw));
  assert.equal(recognition.status, "confirmed-candidate");
  assert.equal(analysis.nominal, "20 groszy");
  assert.equal(analysis.year, "2026");
});

test("production dwutalar evidence keeps the correct candidate and useful partial identity without weight", () => {
  const ids = new Set(["mnk:504150", "mnk:268896", "mnk:127042", "mnk:384397", "mnk:130097"]);
  const shortlist = candidates.filter((candidate) => ids.has(candidate.id));
  const raw = {
    imageUsable: true,
    observations: {
      rulerReading: "IOAN CASIM",
      yearReading: "1650",
      denominationReading: "Dwutalar",
      denominationEvidence: "Zgodny projekt obu stron",
      mintReading: "GEDANENSIS — Gdańsk",
      metalAppearance: "Srebrzystoszary metal z ciemniejszą patyną",
      shape: "okrągła",
      portrait: "Półpostać króla ze sceptrem i jabłkiem",
      heraldry: ["herb Gdańska trzymany przez lwy"],
      mintMarks: ["G-R"],
      obverseLegendFragments: ["IOAN CASIM"],
      reverseLegendFragments: ["GEDANENSIS", "1650"],
    },
    decision: {
      selectedCandidateId: "mnk:384397",
      candidateFit: 98,
      supportingFeatures: ["Zgodność obu stron jednoznacznie wskazuje dwutalar gdański z 1650 roku."],
      contradictions: [],
    },
    condition: { band: "vf", confidence: 70 },
  };
  const recognition = adjudicateRecognition(raw, shortlist, {});
  const analysis = analysisFromRecognition(raw, recognition, conditionFromRaw(raw));
  assert.equal(recognition.status, "candidate-only");
  assert.equal(recognition.selected.id, "mnk:384397");
  assert.equal(analysis.ruler, "Jan II Kazimierz");
  assert.equal(analysis.year, "1650");
  assert.equal(analysis.mint, "Gdańsk");
  assert.match(analysis.summary, /dwutalar gdański/i);
  assert.match(recognition.followUpQuestions.join(" "), /masę/i);
});

test("new photos cannot reuse an old album record id", async () => {
  const source = await readFile(new URL("../analysis-record-identity.js", import.meta.url), "utf8");
  const context = { window: null };
  context.window = context;
  vm.runInNewContext(source, context);
  const identity = context.ApoAnalysisRecordIdentity;
  const oldImages = ["data:image/jpeg;base64,OLD-A", "data:image/jpeg;base64,OLD-R"];
  const newImages = ["data:image/jpeg;base64,NEW-A", "data:image/jpeg;base64,NEW-R"];
  const signature = identity.photoSignature(oldImages);
  assert.equal(identity.reusableId({ id: "coin-old", savedSignature: signature, images: oldImages }), "coin-old");
  assert.equal(identity.reusableId({ id: "coin-old", savedSignature: signature, images: newImages }), undefined);
});

test("analysis uses the safe cropper, clears same-scope identity and reveals Stage 2", async () => {
  const source = await readFile(new URL("../analyze.html", import.meta.url), "utf8");
  assert.match(source, /const processor = window\.ApoImagePipeline\?\.processCoin \|\| legacyProcessCoin/);
  assert.match(source, /resetRecordForNewPhotos\(\);[\s\S]{0,240}const processor/);
  assert.match(source, /savedSignature: savedPhotoSignature/);
  assert.match(source, /id: reusableId/);
  assert.match(source, /deepPanel"\)\.scrollIntoView/);
  assert.match(source, /persistAnalysisSession\(\);[\s\S]{0,160}deepPanel/);
});

test("XLSX package builds eight records synchronously and returns a valid ZIP envelope", async () => {
  const context = { window: null, TextEncoder, Uint8Array, Math, Date, console, localStorage: { getItem: () => "pl" } };
  context.window = context;
  vm.createContext(context);
  for (const file of ["zip-store.js", "xlsx-sheet.js", "xlsx-sheet-canonical.js", "xlsx-package.js"]) {
    vm.runInContext(await readFile(new URL(`../${file}`, import.meta.url), "utf8"), context);
  }
  const coins = Array.from({ length: 8 }, (_, index) => ({
    id: `coin-${index}`,
    title: `Moneta ${index}`,
    country: "Polska",
    ruler: "Jan II Kazimierz",
    year: "1650",
    nominal: "Dwutalar",
    mint: "Gdańsk",
    description: "Opis testowy",
  }));
  const started = performance.now();
  const bytes = context.ApoXLSXPackage.build(coins);
  assert.ok(performance.now() - started < 1000);
  assert.ok(bytes.byteLength > 500);
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.deepEqual([...bytes.slice(-22, -18)], [0x50, 0x4b, 0x05, 0x06]);
});

test("export translation is idempotent and stale correction text is localized", async () => {
  const [i18n, correction, home] = await Promise.all([
    readFile(new URL("../export-i18n.js", import.meta.url), "utf8"),
    readFile(new URL("../correction-consistency.js", import.meta.url), "utf8"),
    readFile(new URL("../home-core-i18n.js", import.meta.url), "utf8"),
  ]);
  assert.match(i18n, /if\(e\.textContent!==next\)e\.textContent=next/);
  assert.doesNotMatch(correction, /Requires reanalysis after user-corrected identification data/);
  assert.match(correction, /Wymaga ponownej analizy po korekcie danych identyfikacyjnych/);
  assert.match(home, /replace\(\/\\s\+\/g, " "\)/);
  assert.match(home, /ApoHomeCoreI18n/);
});
