import test from "node:test";
import assert from "node:assert/strict";
import {
  adjudicateRecognition,
  analysisFromRecognition,
  conditionFromRaw,
  localReferenceCandidates,
  reconcileDirectDenominationEvidence,
} from "../lib/recognition-core.mjs";
import { orchestrateRecognitionCandidates } from "../lib/recognition-orchestrator.mjs";

const candidates = localReferenceCandidates();

function decisionFor(observations, confidence = 86) {
  const ranked = orchestrateRecognitionCandidates(observations, candidates, {});
  const raw = {
    imageUsable: true,
    sameObject: true,
    objectKind: observations.objectKind || "coin",
    confidence,
    observations,
    decision: {
      selectedCandidateId: ranked.selected?.candidate?.id || "",
      candidateFit: ranked.selected?.score || 0,
      supportingFeatures: ranked.selected?.reasons || [],
      contradictions: [],
    },
    condition: {
      band: "uncertain",
      confidence: 0,
      wear: "",
      strike: "",
      surface: "",
      damage: "",
    },
  };
  const recognition = adjudicateRecognition(
    raw,
    ranked.ranked.map((item) => item.candidate),
    {},
  );
  return {
    ranked,
    recognition,
    analysis: analysisFromRecognition(raw, recognition, conditionFromRaw(raw)),
  };
}

test("a literal 5 ZŁOTYCH legend corrects a remembered 10 zł Piłsudski denomination", () => {
  const observations = reconcileDirectDenominationEvidence({
    objectKind: "coin",
    countryReading: "Polska",
    issuerReading: "Rzeczpospolita Polska",
    rulerReading: "Nie dotyczy — emisja państwowa",
    depictedPersonReading: "Józef Piłsudski",
    yearReading: "1934",
    denominationReading: "10 zł",
    denominationEvidence: "Na rewersie czytelne 5 ZŁOTYCH",
    mintReading: "Warszawa",
    metalAppearance: "srebro",
    shape: "okrągła",
    portrait: "profil Józefa Piłsudskiego",
    periodReading: "II Rzeczpospolita",
    historicalTypeHypothesis: "5 zł Józef Piłsudski",
    historicalTypeConfidence: 90,
    historicalEvidence: ["portret Józefa Piłsudskiego", "napis 5 ZŁOTYCH"],
    heraldry: ["orzeł"],
    mintMarks: ["Warszawa"],
    obverseLegendFragments: ["JÓZEF PIŁSUDSKI"],
    reverseLegendFragments: ["5 ZŁOTYCH", "1934"],
  });
  const result = decisionFor(observations, 90);
  assert.equal(observations.denominationReading, "5 zł");
  assert.equal(result.ranked.selected.candidate.nominal, "5 zł");
  assert.equal(result.analysis.nominal, "5 zł");
  assert.equal(result.analysis.ruler, "Nie dotyczy — emisja państwowa");
});

test("a two-feature visual type reading resolves the Batory 1580 talar from Olkusz", () => {
  const observations = {
    objectKind: "coin",
    countryReading: "Polska",
    issuerReading: "Korona Królestwa Polskiego",
    rulerReading: "Stefan Batory",
    depictedPersonReading: "Stefan Batory",
    yearReading: "1580",
    denominationReading: "Talar",
    denominationEvidence: "Układ talara rozpoznany niezależnie na obu stemplach",
    mintReading: "Olkusz",
    metalAppearance: "srebro",
    shape: "okrągła",
    portrait: "popiersie króla w koronie",
    periodReading: "monarchia elekcyjna",
    historicalTypeHypothesis: "talar koronny",
    historicalTypeConfidence: 86,
    historicalEvidence: [
      "układ popiersia w koronie",
      "Pogoń i tarcze na rewersie",
    ],
    heraldry: ["Pogoń", "tarcza herbowa", "korona"],
    mintMarks: ["znaki Olkusza"],
    obverseLegendFragments: ["STEPHANVS D G REX POL"],
    reverseLegendFragments: ["1580"],
  };
  const result = decisionFor(observations);
  assert.equal(result.recognition.status, "confirmed-candidate");
  assert.equal(result.analysis.ruler, "Stefan Batory");
  assert.equal(result.analysis.year, "1580");
  assert.equal(result.analysis.nominal, "Talar");
  assert.equal(result.analysis.mint, "Olkusz");
});
