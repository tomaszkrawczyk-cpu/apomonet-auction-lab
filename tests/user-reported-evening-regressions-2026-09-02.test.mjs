import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { analysisFromRecognition, conditionFromRaw } from "../lib/recognition-core.mjs";

test("failed background removal falls back to originals and continues album selection", async () => {
  const source = await readFile(new URL("../album-photo-prep.js", import.meta.url), "utf8");
  assert.match(source, /backgroundRemovalFailed: true/);
  assert.match(source, /mode: "original"/);
  assert.match(source, /dialog\.status\.textContent = msg\("fallback"\);[\s\S]*finish\(\);/);
});

test("album success is shown only after the stored assignment is verified", async () => {
  const source = await readFile(new URL("../analyze.html", import.meta.url), "utf8");
  assert.match(source, /const stored = c\?\.id \? ApoMonet\.getCoin\(c\.id\) : null/);
  assert.match(source, /identity\.photoSignature\(storedImages\) !== identity\.photoSignature\(imgs\)/);
  assert.match(source, /assigned\?\.albumIds\?\.includes\(b\.dataset\.id\)/);
  assert.match(source, /\[album-save\]/);
});

test("Stage 2 separates a Kopicki candidate from a confirmed reference", async () => {
  const [api, page, guardSource] = await Promise.all([
    readFile(new URL("../api/analyze-detail.js", import.meta.url), "utf8"),
    readFile(new URL("../analyze.html", import.meta.url), "utf8"),
    readFile(new URL("../derived-analysis-invalidation.js", import.meta.url), "utf8"),
  ]);
  for (const field of [
    "kopickiCandidateReference",
    "kopickiCandidateRarity",
    "kopickiCandidateBasis",
  ]) {
    assert.match(api, new RegExp(`${field}: \\{ type: \\"string\\" \\}`));
  }
  assert.match(page, /Kandydat Kopicki — do weryfikacji/);
  assert.match(page, /Kandydat rzadkości — niepotwierdzony/);

  const context = {
    console,
    document: { readyState: "loading", addEventListener() {} },
    window: null,
  };
  context.window = context;
  vm.runInNewContext(guardSource, context);
  const result = context.ApoDerivedInvalidation.gateCatalogEvidence({
    variant: "Nie ustalono",
    confidence: 73,
    diagnosticFeatures: ["czytelny typ tarczy"],
    kopickiReference: "",
    kopickiRarity: "",
    kopickiCandidateReference: "Kop. 1234",
    kopickiCandidateRarity: "R3",
    kopickiCandidateBasis: "zgodny typ, odmiana interpunkcji nieczytelna",
  });
  assert.equal(result.kopickiReference, "");
  assert.equal(result.kopickiRarity, "");
  assert.equal(result.catalogEvidenceStatus, "unconfirmed");
  assert.equal(result.catalogCandidate.reference, "Kop. 1234");
  assert.equal(result.catalogCandidate.rarity, "R3");
});

test("a supported medieval iconographic hypothesis is visible but not promoted to identity", () => {
  const raw = {
    imageUsable: true,
    objectKind: "coin",
    observations: {
      rulerReading: "Nie ustalono",
      yearReading: "Nie ustalono",
      denominationReading: "Nie ustalono",
      denominationEvidence: "brak oznaczenia nominału",
      mintReading: "Nie ustalono",
      metalAppearance: "srebro",
      portrait: "brak portretu",
      obverseLegendFragments: ["HLVDOVVICVS IMP"],
      reverseLegendFragments: ["XPISTIANA RELIGIO"],
      historicalTypeHypothesis: "denar typu Christiana Religio",
      historicalTypeConfidence: 82,
      historicalEvidence: ["fasada świątyni", "krzyż w polu", "fragment XPISTIANA RELIGIO"],
    },
    condition: { band: "uncertain", confidence: 0 },
  };
  const recognition = {
    status: "unresolved",
    confidence: 0,
    selected: null,
    observations: raw.observations,
    contradictions: ["brak zgodnej pozycji katalogowej"],
    cautionNotes: [],
    followUpQuestions: [],
    measurements: {},
    candidates: [],
    partialIdentity: { populatedFields: [], fieldConfidence: {}, blockedFields: [] },
  };
  const result = analysisFromRecognition(raw, recognition, conditionFromRaw(raw));
  assert.equal(result.ruler, "Nie ustalono");
  assert.equal(result.year, "Nie ustalono");
  assert.equal(result.historicalHypothesis.label, "denar typu Christiana Religio");
  assert.equal(result.historicalHypothesis.status, "unconfirmed-iconographic-hypothesis");
  assert.match(result.fullDescription, /Hipoteza ikonograficzna \(niepotwierdzona katalogiem\)/);
});

test("a weak medieval guess remains hidden", () => {
  const raw = {
    imageUsable: true,
    objectKind: "coin",
    observations: {
      metalAppearance: "srebro",
      historicalTypeHypothesis: "jakiś denar średniowieczny",
      historicalTypeConfidence: 55,
      historicalEvidence: ["krzyż"],
    },
    condition: { band: "uncertain", confidence: 0 },
  };
  const recognition = {
    status: "unresolved",
    confidence: 0,
    selected: null,
    observations: raw.observations,
    contradictions: [],
    cautionNotes: [],
    followUpQuestions: [],
    measurements: {},
    candidates: [],
    partialIdentity: { populatedFields: [], fieldConfidence: {}, blockedFields: [] },
  };
  const result = analysisFromRecognition(raw, recognition, conditionFromRaw(raw));
  assert.equal(result.historicalHypothesis, null);
  assert.doesNotMatch(result.fullDescription, /jakiś denar/);
});
