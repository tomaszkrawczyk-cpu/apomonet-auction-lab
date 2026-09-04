import test from "node:test";
import assert from "node:assert/strict";
import {
  adjudicateRecognition,
  analysisFromRecognition,
  conditionFromRaw,
  localReferenceCandidates,
} from "../lib/recognition-core.mjs";
import {
  orchestrateRecognitionCandidates,
  retrieveCandidatesWithEngines,
} from "../lib/recognition-orchestrator.mjs";

const catalog = localReferenceCandidates();
const condition = { band: "vf", confidence: 70 };
const card = (raw, recognition) =>
  analysisFromRecognition(raw, recognition, conditionFromRaw({ condition }));

function rawFrom(observations, decision = {}) {
  return {
    imageUsable: true,
    objectKind: observations.objectKind || "coin",
    observations,
    decision: {
      selectedCandidateId: "",
      candidateFit: 0,
      supportingFeatures: [],
      contradictions: [],
      ...decision,
    },
    condition,
  };
}

test("a weak catalogue shortlist cannot erase visible Jan III, 1685 and Gdansk", () => {
  const exact = catalog.find((candidate) => candidate.id === "ans-meta:23d66bf3493e8cd21881");
  const unrelated = catalog.find((candidate) =>
    candidate.id !== exact?.id && candidate.ruler === "Jan III Sobieski" && candidate.year !== "1685",
  );
  assert.ok(exact);
  assert.ok(unrelated);
  const raw = rawFrom({
    objectKind: "coin",
    countryReading: "Polska / Rzeczpospolita Obojga Narodów",
    issuerReading: "Miasto Gdańsk / CIVITATIS GEDANENSIS",
    rulerReading: "IOAN III REX POL — Jan III Sobieski",
    depictedPersonReading: "Jan III Sobieski",
    yearReading: "1685",
    denominationReading: "Nie ustalono",
    mintReading: "Gdańsk",
    metalAppearance: "srebro",
    shape: "okrągła",
    portrait: "popiersie Jana III Sobieskiego",
    historicalTypeHypothesis: "Emisja gdańska Jana III Sobieskiego",
    historicalTypeConfidence: 92,
    historicalEvidence: ["IOAN III REX POL", "data 1685", "herb Gdańska"],
    obverseLegendFragments: ["IOAN III REX POL"],
    reverseLegendFragments: ["CIVITATIS GEDANENSIS", "1685"],
    mintMarks: [],
  });
  const recognition = adjudicateRecognition(raw, [unrelated, exact], {});
  const result = card(raw, recognition);

  assert.equal(result.ruler, "Jan III Sobieski");
  assert.equal(result.depictedPerson, "Jan III Sobieski");
  assert.equal(result.year, "1685");
  assert.equal(result.mint, "Gdańsk");
  assert.equal(result.nominal, "Nie ustalono");
});

test("an unrelated medieval consensus cannot turn Ludwik Pobozny into another Ludwik", () => {
  const unrelated = catalog.filter((candidate) =>
    /Ludwik/i.test(candidate.ruler) && !/Pobożny/i.test(candidate.ruler),
  ).slice(0, 3);
  assert.ok(unrelated.length >= 2);
  const raw = rawFrom({
    objectKind: "coin",
    countryReading: "Państwo Frankijskie / imperium karolińskie",
    issuerReading: "Władza cesarska imperium karolińskiego",
    rulerReading: "Ludwik Pobożny / HLVDOVVICVS IMP",
    depictedPersonReading: "Nie ustalono — brak przedstawienia osoby",
    yearReading: "Nie ustalono",
    denominationReading: "Nie ustalono",
    mintReading: "Nie ustalono",
    metalAppearance: "srebro",
    shape: "okrągła",
    portrait: "krzyż oraz fasada świątyni",
    periodReading: "wczesne średniowiecze, epoka karolińska",
    historicalTypeHypothesis: "Typ Christiana Religio Ludwika Pobożnego",
    historicalTypeConfidence: 91,
    historicalEvidence: ["HLVDOVVICVS IMP", "krzyż", "XPISTIANA RELIGIO", "fasada świątyni"],
    obverseLegendFragments: ["HLVDOVVICVS IMP"],
    reverseLegendFragments: ["XPISTIANA RELIGIO"],
    mintMarks: [],
  });
  const recognition = adjudicateRecognition(raw, unrelated, {});
  const result = card(raw, recognition);

  assert.equal(result.country, "Państwo Frankijskie / imperium karolińskie");
  assert.equal(result.issuer, "Władza cesarska imperium karolińskiego");
  assert.equal(result.ruler, "Ludwik Pobożny");
  assert.equal(result.year, "Nie ustalono");
  assert.equal(result.mint, "Nie ustalono");
  assert.equal(result.historicalHypothesis.label, "Typ Christiana Religio Ludwika Pobożnego");
});

test("THORVNIA 1629 and a missing nominal retrieve the exact Torun siege thaler", () => {
  const exact = catalog.find((candidate) => candidate.id === "mnk:447205");
  assert.ok(exact);
  const observations = {
    objectKind: "medal",
    countryReading: "Toruń / THORVNIA",
    issuerReading: "Miasto Toruń",
    rulerReading: "Nie ustalono",
    depictedPersonReading: "Nie dotyczy — brak przedstawienia osoby",
    yearReading: "M·DC·XXIX (1629)",
    denominationReading: "Brak oznaczenia nominału",
    mintReading: "Nie ustalono",
    metalAppearance: "srebro",
    shape: "okrągła",
    portrait: "widok miasta i tekst THORVNIA",
    historicalTypeHypothesis: "Emisja upamiętniająca obronę Torunia w 1629 roku",
    historicalTypeConfidence: 92,
    historicalEvidence: ["THORVNIA", "M·DC·XXIX", "panorama Torunia"],
    obverseLegendFragments: ["THORVNIA", "M·DC·XXIX"],
    reverseLegendFragments: ["FIDES", "panorama miasta"],
    mintMarks: [],
  };
  const retrieval = retrieveCandidatesWithEngines(observations, catalog);
  assert.ok(retrieval.shortlist.some((candidate) => candidate.id === exact.id));

  const raw = rawFrom({ ...observations, denominationReading: "Talar" }, {
    selectedCandidateId: exact.id,
    candidateFit: 96,
    supportingFeatures: ["visual-reference:same-type", "THORVNIA", "1629"],
  });
  const recognition = adjudicateRecognition(raw, [exact], {});
  const result = card(raw, recognition);
  assert.equal(recognition.status, "confirmed-candidate");
  assert.equal(result.ruler, "Zygmunt III Waza");
  assert.equal(result.year, "1629");
  assert.equal(result.nominal, "Talar");
  assert.equal(result.mint, "Toruń");
  assert.match(result.title, /talar toruński oblężniczy/i);
});

test("a blurred 1-zloty reading cannot remove the exact 5-zloty 1936 klippe", () => {
  const exact = catalog.find((candidate) => candidate.id === "mnk:89516");
  assert.ok(exact);
  const observations = {
    objectKind: "pattern",
    countryReading: "Polska",
    issuerReading: "Rzeczpospolita Polska",
    rulerReading: "Nie dotyczy — emisja państwowa",
    depictedPersonReading: "Nie dotyczy — brak przedstawienia osoby",
    yearReading: "1936",
    denominationReading: "Prawdopodobnie 1 złoty",
    mintReading: "Nie ustalono",
    metalAppearance: "srebro",
    shape: "kwadratowa klipa",
    portrait: "żaglowiec w romboidalnym polu",
    heraldry: ["orzeł państwowy"],
    historicalTypeHypothesis: "Polska klipa próbna z żaglowcem, 1936",
    historicalTypeConfidence: 90,
    historicalEvidence: ["kwadratowa klipa", "żaglowiec", "orzeł", "1936"],
    obverseLegendFragments: ["ZŁOTYCH", "żaglowiec"],
    reverseLegendFragments: ["RZECZPOSPOLITA POLSKA", "1936"],
    mintMarks: [],
  };
  const retrieval = orchestrateRecognitionCandidates(observations, catalog);
  assert.ok(retrieval.ranked.some((entry) => entry.candidate.id === exact.id));

  const corrected = { ...observations, denominationReading: "5 ZŁOTYCH" };
  const raw = rawFrom(corrected, {
    selectedCandidateId: exact.id,
    candidateFit: 98,
    supportingFeatures: ["visual-reference:same-specimen", "5 ZŁOTYCH", "1936"],
  });
  const recognition = adjudicateRecognition(raw, [exact], {});
  const result = card(raw, recognition);
  assert.equal(recognition.status, "confirmed-candidate");
  assert.equal(result.nominal, "5 zł");
  assert.equal(result.year, "1936");
  assert.equal(result.objectKind, "pattern");
});
