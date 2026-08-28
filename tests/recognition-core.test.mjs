import test from "node:test";
import assert from "node:assert/strict";
import {
  adjudicateRecognition,
  analysisFromRecognition,
  conditionFromRaw,
  localReferenceCandidates,
  rankEvidenceCandidates,
  recognitionCatalogPolicy,
  searchNumistaByImage,
} from "../lib/recognition-core.mjs";
import sourceRegistry from "../data/recognition/source-registry-v1.json" with { type: "json" };

const candidates = localReferenceCandidates();

function janKazimierzDecision(id = "mnk:87323") {
  return {
    imageUsable: true,
    observations: {
      rulerReading: "Jan II Kazimierz",
      yearReading: "1651",
      denominationReading: "Dwutalar",
      denominationEvidence: "klipa i znaki pola",
      mintReading: "Elbląg",
      metalAppearance: "srebro",
      shape: "square-klippe",
      portrait: "król w koronie i zbroi",
      heraldry: ["herb Elbląga z aniołem"],
      mintMarks: ["W-VE"],
      obverseLegendFragments: ["IOAN", "CASIM", "REX POL"],
      reverseLegendFragments: ["CIVITATIS", "ELBINGENSIS", "1651"],
    },
    decision: {
      selectedCandidateId: id,
      candidateFit: 96,
      supportingFeatures: ["portret", "herb Elbląga", "W-VE"],
      contradictions: [],
    },
    condition: {
      band: "vf",
      confidence: 74,
      wear: "umiarkowane",
      strike: "pełny",
      surface: "naturalna patyna",
      damage: "brak oczywistych",
    },
  };
}

function batoryDecision({ noisyOcr = false, selected = "curated:batory-ducat-gdansk-1587" } = {}) {
  return {
    imageUsable: true,
    observations: {
      rulerReading: noisyOcr ? "Nie ustalono — brak skali na zdjęciu." : "STEPHANVS",
      yearReading: noisyOcr ? "1600" : "1587",
      denominationReading: noisyOcr ? "Nie ustalono" : "Dukat",
      denominationEvidence: "złota moneta o masie około 3,57 g",
      mintReading: "Fragment GEDAN; herb Gdańska z dwoma krzyżami i lwami",
      metalAppearance: "Żółtozłote",
      shape: "Okrągła",
      portrait: "koronowane popiersie króla w prawo, w zbroi",
      heraldry: ["Koronowana tarcza z dwoma krzyżami", "Dwa lwy podtrzymujące tarczę"],
      mintMarks: [],
      obverseLegendFragments: noisyOcr
        ? ["SIG III D G", "REX POL", "M D L"]
        : ["STEPHANVS", "D G", "REX POL"],
      reverseLegendFragments: noisyOcr
        ? ["1600", "MONETA", "GEDAN"]
        : ["MONE", "AVR", "GEDANENSIS", "87"],
    },
    decision: {
      selectedCandidateId: selected,
      candidateFit: noisyOcr ? 68 : 96,
      supportingFeatures: ["herb Gdańska", "masa dukata", "legenda GEDANENSIS"],
      contradictions: [],
    },
    condition: {
      band: "vf",
      confidence: 65,
      wear: "umiarkowane",
      strike: "czytelny",
      surface: "bez oceny autentyczności",
      damage: "brak oczywistych",
    },
  };
}

test("curated catalogue only exposes records with explicit accepted rights and provenance", () => {
  assert.equal(recognitionCatalogPolicy.recordCount, 5);
  assert.equal(recognitionCatalogPolicy.provenanceRequired, true);
  assert.equal(candidates.length, 5);
  for (const candidate of candidates.filter((candidate) => candidate.sourceType === "museum")) {
    assert.equal(candidate.rights, "Domena publiczna");
    assert.match(candidate.sourceUrl, /^https:\/\/zbiory\.mnk\.pl\/pl\/katalog\/\d+$/);
    assert.match(candidate.sourceReference, /^MNK /);
  }
  const batory = candidates.find((candidate) => candidate.id === "curated:batory-ducat-gdansk-1587");
  assert.equal(batory.sourceType, "curated-fact");
  assert.equal(batory.images.length, 0);
  assert.match(batory.rights, /bez kopiowania zdjęć/);
  assert.equal(batory.source.provenance.length, 3);
});

test("auction and community sources cannot become identity ground truth", () => {
  const auction = sourceRegistry.sources.find((source) => source.id === "auction-archives");
  const community = sourceRegistry.sources.find((source) => source.id === "community");
  assert.equal(auction.tier, "C");
  assert.match(auction.identityRole, /only$/);
  assert.equal(community.tier, "D");
  assert.match(community.identityRole, /^lead/);
  const curated = sourceRegistry.sources.find((source) => source.id === "apomonet-curated-facts");
  assert.equal(curated.tier, "B");
  assert.match(curated.rightsGate, /never copy protected photos or descriptions/);
});

test("Jan Kazimierz Elblag klippe abstains between 1.5 thaler and double thaler without weight", () => {
  const result = adjudicateRecognition(janKazimierzDecision(), candidates, {});
  assert.equal(result.status, "candidate-only");
  assert.equal(result.selected.id, "mnk:87323");
  assert.match(result.followUpQuestions.join(" "), /57\.74 g/);
  assert.match(result.followUpQuestions.join(" "), /43\.266 g/);
});

test("matching weight resolves the Jan Kazimierz double-thaler candidate", () => {
  const result = adjudicateRecognition(janKazimierzDecision(), candidates, {
    weightGrams: "57,7",
    diameterMm: "46,6",
  });
  assert.equal(result.status, "confirmed-candidate");
  assert.equal(result.selected.nominal, "Dwutalar");
  assert.equal(result.selected.mint, "Elbląg");
  assert.ok(result.confidence >= 88);
});

test("Latin mint legend and descriptive Polish klippe shape match the Elblag catalogue record", () => {
  const raw = janKazimierzDecision();
  raw.observations.rulerReading = "W legendzie widoczne IOAN CASIM...";
  raw.observations.yearReading = "Widoczne cyfry 1669 w narożnikach oraz 1651 w legendzie";
  raw.observations.denominationReading = "Brak czytelnego oznaczenia nominału.";
  raw.observations.mintReading = "ELBINGENSIS";
  raw.observations.shape = "Kwadratowa klipa z okrągłym odciskiem stempla";
  raw.decision.candidateFit = 80;
  raw.decision.contradictions = [
    "Nie widać napisu PRÓBA.",
    "Cyfry 1669 są dodatkowym markerem wybranego kandydata.",
  ];

  const result = adjudicateRecognition(raw, candidates, {
    weightGrams: 57.74,
    diameterMm: 46.5,
  });

  assert.equal(result.status, "confirmed-candidate");
  assert.equal(result.selected.id, "mnk:87323");
  assert.deepEqual(result.contradictions, []);
  assert.equal(result.cautionNotes.length, 2);
});

test("evidence ranking normalizes Jan Kazimierz and keeps neighboring denominations as rivals", () => {
  const observations = janKazimierzDecision().observations;
  const ranked = rankEvidenceCandidates(observations, candidates);
  assert.equal(ranked.selected.candidate.id, "mnk:87323");
  assert.equal(ranked.ranked[1].candidate.id, "mnk:87256");
  assert.ok(ranked.selected.score >= 90);
});

test("Batory ducat survives noisy OCR because mint, heraldry, metal and 3.57 g agree", () => {
  const raw = batoryDecision({ noisyOcr: true, selected: "" });
  const ranked = rankEvidenceCandidates(raw.observations, candidates, {
    weightGrams: 3.57,
  });

  assert.equal(ranked.selected.candidate.id, "curated:batory-ducat-gdansk-1587");
  assert.equal(ranked.selected.hardConflicts.length, 0);
  assert.ok(ranked.selected.score >= 65);
  assert.match(ranked.selected.reasons.join(" "), /masa: 3\.57 g/);
});

test("verified legend and measurements confirm the Stefan Batory Gdansk ducat", () => {
  const raw = batoryDecision();
  const result = adjudicateRecognition(raw, candidates, {
    weightGrams: 3.57,
    diameterMm: 22,
  });

  assert.equal(result.status, "confirmed-candidate");
  assert.equal(result.selected.ruler, "Stefan Batory");
  assert.equal(result.selected.nominal, "Dukat");
  assert.equal(result.selected.mint, "Gdańsk");
  assert.deepEqual(result.contradictions, []);
});

test("visible 87 is accepted as a partial 1587 date and rejected thalers stay hidden", () => {
  const raw = batoryDecision();
  raw.observations.rulerReading = "Nie ustalono";
  raw.observations.yearReading = "Końcowe cyfry 87 widoczne na rewersie; pełna data nie jest jednoznaczna.";
  raw.observations.denominationReading = "Brak widocznego oznaczenia nominału.";
  raw.decision.candidateFit = 89;

  const result = adjudicateRecognition(raw, candidates, { weightGrams: 3.57 });

  assert.equal(result.status, "confirmed-candidate");
  assert.deepEqual(result.contradictions, []);
  assert.deepEqual(result.candidates.map((candidate) => candidate.id), [
    "curated:batory-ducat-gdansk-1587",
  ]);
});

test("unresolved results never fall back to unrelated Jan Kazimierz records", () => {
  const raw = batoryDecision({ noisyOcr: true, selected: "" });
  const janOnly = candidates.filter((candidate) => candidate.ruler.includes("Kazimierz"));
  const result = adjudicateRecognition(raw, janOnly, { weightGrams: 3.57 });

  assert.equal(result.status, "unresolved");
  assert.deepEqual(result.candidates, []);
  assert.match(result.followUpQuestions[0], /aktualnie podłączonych katalogach/);
});

test("a 1.5-thaler weight blocks a false double-thaler verdict", () => {
  const result = adjudicateRecognition(janKazimierzDecision(), candidates, {
    weightGrams: 43.3,
  });
  assert.notEqual(result.status, "confirmed-candidate");
  assert.match(result.contradictions.join(" "), /Masa 43\.3 g nie pasuje/);
});

test("final basic card is populated only after the evidence gate confirms a catalogue candidate", () => {
  const raw = janKazimierzDecision();
  const condition = conditionFromRaw(raw);
  const unresolved = adjudicateRecognition(raw, candidates, {});
  const unresolvedCard = analysisFromRecognition(raw, unresolved, condition);
  assert.equal(unresolvedCard.nominal, "Nie ustalono");
  assert.equal(unresolvedCard.estimateLow, 0);
  assert.equal(unresolvedCard.analysisVersion, "retrieval-first-v2");

  const confirmed = adjudicateRecognition(raw, candidates, { weightGrams: 57.74 });
  const confirmedCard = analysisFromRecognition(raw, confirmed, condition);
  assert.equal(confirmedCard.nominal, "Dwutalar");
  assert.equal(confirmedCard.ruler, "Jan II Kazimierz");
  assert.equal(confirmedCard.recognition.status, "confirmed-candidate");
  assert.equal(confirmedCard.condition.engineVersion, "condition-v1-independent");
  assert.equal(confirmedCard.weight, 57.74);
});

test("condition engine withholds a grade when its own confidence is too low", () => {
  const raw = janKazimierzDecision();
  raw.condition.band = "xf";
  raw.condition.confidence = 8;

  const condition = conditionFromRaw(raw);

  assert.equal(condition.band, "Nie ustalono");
  assert.equal(condition.bandCode, "uncertain");
  assert.equal(condition.confidence, 8);
});

test("Numista image retrieval stays disabled without a configured server key", async () => {
  const result = await searchNumistaByImage("", ["data:image/jpeg;base64,AA=="]);
  assert.deepEqual(result, { available: false, candidates: [], reason: "missing-key" });
});
