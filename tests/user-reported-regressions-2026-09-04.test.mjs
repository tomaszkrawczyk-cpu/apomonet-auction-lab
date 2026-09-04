import test from "node:test";
import assert from "node:assert/strict";
import {
  adjudicateRecognition,
  analysisFromRecognition,
  conditionFromRaw,
  localReferenceCandidates,
  rankEvidenceCandidates,
} from "../lib/recognition-core.mjs";

const candidates = localReferenceCandidates();
const condition = { band: "vf", confidence: 70 };

function card(raw, recognition) {
  return analysisFromRecognition(raw, recognition, conditionFromRaw({ condition }));
}

test("Jan Kazimierz exact visual match keeps country and authority while weight withholds denomination", () => {
  const doubleThaler = candidates.find((item) => item.id === "mnk:384397");
  assert.ok(doubleThaler);
  const rival = {
    ...doubleThaler,
    id: "test:jan-kazimierz-talar-rival",
    title: "Jan Kazimierz, talar gdański, Gdańsk, 1650",
    nominal: "Talar",
    weightGrams: 28.8,
  };
  const raw = {
    imageUsable: true,
    objectKind: "coin",
    observations: {
      objectKind: "coin",
      countryReading: "Rzeczpospolita Obojga Narodów",
      issuerReading: "Rzeczpospolita Obojga Narodów",
      rulerReading: "IOAN CASIM — Jan Kazimierz",
      depictedPersonReading: "Jan II Kazimierz",
      yearReading: "1650",
      denominationReading: "Dwutalar",
      denominationEvidence: "zgodny układ obu stron",
      mintReading: "GEDANENS — Gdańsk",
      metalAppearance: "srebro",
      shape: "okrągła",
      portrait: "półpostać króla",
      historicalEvidence: ["IOAN CASIM", "herb Gdańska"],
      historicalTypeConfidence: 92,
      obverseLegendFragments: ["IOAN CASIM"],
      reverseLegendFragments: ["GEDANENS", "1650"],
      mintMarks: [],
    },
    decision: {
      selectedCandidateId: doubleThaler.id,
      candidateFit: 99,
      supportingFeatures: ["obie strony zgodne z rekordem muzealnym"],
      contradictions: [],
    },
    condition,
  };

  const recognition = adjudicateRecognition(raw, [doubleThaler, rival], {});
  const result = card(raw, recognition);

  assert.equal(recognition.status, "candidate-only");
  assert.equal(result.country, "Rzeczpospolita Obojga Narodów");
  assert.equal(result.issuer, "Rzeczpospolita Obojga Narodów");
  assert.equal(result.ruler, "Jan II Kazimierz");
  assert.equal(result.mint, "Gdańsk");
  assert.equal(result.nominal, "Nie ustalono");
});

test("Jan III Sobieski 1685 is not discarded by an unsupported pattern guess", () => {
  const thaler = candidates.find((item) => item.id === "ans-meta:23d66bf3493e8cd21881");
  assert.ok(thaler);
  const raw = {
    imageUsable: true,
    objectKind: "pattern",
    observations: {
      objectKind: "pattern",
      countryReading: "Polska",
      issuerReading: "Rzeczpospolita Obojga Narodów",
      rulerReading: "IOAN III — Jan III Sobieski",
      depictedPersonReading: "Jan III Sobieski",
      yearReading: "1685",
      denominationReading: "Talar",
      denominationEvidence: "układ talarowy",
      mintReading: "Gdańsk",
      metalAppearance: "srebro",
      shape: "okrągła",
      portrait: "popiersie Jana III",
      historicalEvidence: ["IOAN III", "data 1685", "herb Gdańska"],
      historicalTypeConfidence: 88,
      obverseLegendFragments: ["IOAN III"],
      reverseLegendFragments: ["1685"],
      mintMarks: [],
    },
    decision: {
      selectedCandidateId: thaler.id,
      candidateFit: 88,
      supportingFeatures: ["IOAN III", "1685", "Gdańsk"],
      contradictions: [],
    },
    condition,
  };

  const recognition = adjudicateRecognition(raw, [thaler], {});
  const result = card(raw, recognition);

  assert.notEqual(recognition.status, "unresolved");
  assert.equal(result.ruler, "Jan III Sobieski");
  assert.equal(result.year, "1685");
  assert.equal(result.mint, "Gdańsk");
});

test("medieval evidence preserves a cautious broad identity without a catalogue number", () => {
  const raw = {
    imageUsable: true,
    objectKind: "coin",
    observations: {
      objectKind: "coin",
      countryReading: "Cesarstwo Karolińskie",
      issuerReading: "Państwo Franków",
      rulerReading: "HLVDOVVICVS IMP — Ludwik Pobożny",
      depictedPersonReading: "Nie ustalono",
      yearReading: "Nie ustalono",
      denominationReading: "Nie ustalono",
      mintReading: "Nie ustalono",
      metalAppearance: "srebro",
      shape: "okrągła",
      portrait: "Nie ustalono",
      periodReading: "średniowiecze — epoka karolińska",
      historicalTypeHypothesis: "Typ Christiana Religio, prawdopodobnie Ludwik Pobożny",
      historicalTypeConfidence: 89,
      historicalEvidence: ["HLVDOVVICVS IMP", "krzyż", "fasada świątyni"],
      obverseLegendFragments: ["HLVDOVVICVS IMP"],
      reverseLegendFragments: ["XPISTIANA RELIGIO"],
      mintMarks: [],
    },
    decision: { selectedCandidateId: "", candidateFit: 0, supportingFeatures: [], contradictions: [] },
    condition,
  };

  const recognition = adjudicateRecognition(raw, [], {});
  const result = card(raw, recognition);

  assert.equal(recognition.status, "unresolved");
  assert.equal(result.country, "Cesarstwo Karolińskie");
  assert.equal(result.issuer, "Państwo Franków");
  assert.match(result.ruler, /Ludwik Pobożny/);
  assert.equal(result.nominal, "Nie ustalono");
  assert.equal(result.historicalHypothesis.status, "unconfirmed-iconographic-hypothesis");
});

test("modern state issue never copies NBP into ruler or depicted person", () => {
  const raw = {
    imageUsable: true,
    objectKind: "coin",
    observations: {
      objectKind: "coin",
      countryReading: "Polska",
      issuerReading: "Narodowy Bank Polski",
      rulerReading: "Nie dotyczy — emisja państwowa",
      depictedPersonReading: "Tadeusz Kościuszko",
      yearReading: "1971",
      denominationReading: "10 zł",
      denominationEvidence: "czytelne 10 ZŁ",
      mintReading: "Mennica Państwowa",
      metalAppearance: "miedzionikiel",
      shape: "okrągła",
      portrait: "portret Tadeusza Kościuszki",
      periodReading: "Polska Rzeczpospolita Ludowa",
      historicalTypeHypothesis: "10 zł Tadeusz Kościuszko",
      historicalTypeConfidence: 94,
      historicalEvidence: ["portret Tadeusza Kościuszki", "10 ZŁ", "1971"],
      obverseLegendFragments: ["POLSKA RZECZPOSPOLITA LUDOWA", "1971"],
      reverseLegendFragments: ["10 ZŁ"],
      mintMarks: [],
    },
    decision: { selectedCandidateId: "", candidateFit: 0, supportingFeatures: [], contradictions: [] },
    condition,
  };

  const recognition = adjudicateRecognition(raw, [], {});
  const result = card(raw, recognition);

  assert.equal(result.country, "Polska");
  assert.equal(result.issuer, "Narodowy Bank Polski");
  assert.equal(result.ruler, "Nie dotyczy — emisja państwowa");
  assert.equal(result.depictedPerson, "Tadeusz Kościuszko");
});

test("portrait evidence ranks the correct 1971 type above same-year same-nominal PRL types", () => {
  const kosciuszko = candidates.find((item) => item.id === "prl-open:cfb4cb65fd08fa38");
  const rivals = candidates.filter((item) =>
    item.id !== kosciuszko?.id && item.year === "1971" && item.nominal === "10 zł",
  ).slice(0, 4);
  assert.ok(kosciuszko);
  assert.ok(rivals.length >= 2);
  const ranked = rankEvidenceCandidates({
    objectKind: "coin",
    countryReading: "Polska",
    issuerReading: "Narodowy Bank Polski",
    rulerReading: "Nie dotyczy — emisja państwowa",
    depictedPersonReading: "Tadeusz Kościuszko",
    yearReading: "1971",
    denominationReading: "10 zł",
    mintReading: "Mennica Państwowa",
    metalAppearance: "miedzionikiel",
    shape: "okrągła",
    portrait: "Tadeusz Kościuszko",
    historicalTypeHypothesis: "10 zł Tadeusz Kościuszko",
  }, [kosciuszko, ...rivals], {});

  assert.equal(ranked.ranked[0].candidate.id, kosciuszko.id);
  assert.ok(ranked.ranked[0].score > ranked.ranked[1].score);
});

test("Wolne Miasto Krakow catalogue metadata is mapped to country, issuer and Vienna mint", () => {
  const record = candidates.find((item) => item.id === "mnk:550503");
  assert.ok(record);
  assert.equal(record.country, "Wolne Miasto Kraków");
  assert.equal(record.issuer, "Wolne Miasto Kraków");
  assert.equal(record.ruler, "");
  assert.equal(record.mint, "Wiedeń");
});
