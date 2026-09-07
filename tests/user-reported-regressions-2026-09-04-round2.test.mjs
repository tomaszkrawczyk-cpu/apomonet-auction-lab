import test from "node:test";
import assert from "node:assert/strict";
import {
  applyEvidenceSignature,
  adjudicateRecognition,
  analysisFromRecognition,
  conditionFromRaw,
  localReferenceCandidates,
  mergeEvidenceSignatureReview,
  mergeMedievalSpecialistObservations,
  needsEvidenceSignatureReview,
  needsMedievalSpecialistReview,
} from "../lib/recognition-core.mjs";
import {
  orchestrateRecognitionCandidates,
  retrieveCandidatesWithEngines,
} from "../lib/recognition-orchestrator.mjs";
import { visualReferenceShortlist } from "../lib/recognition-visual.mjs";

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

test("THORVNIA siege evidence keeps the 1629 brandtalar in visual review despite OCR year 1658", () => {
  const observations = {
    objectKind: "medal",
    countryReading: "Toruń; historycznie obszar Rzeczypospolitej Obojga Narodów",
    issuerReading: "Toruń (THORVNIA); dokładnego emitenta nie ustalono",
    rulerReading: "Nie dotyczy — emisja miejska lub okolicznościowa",
    depictedPersonReading: "Nie ustalono; brak wyraźnego portretu konkretnej osoby",
    yearReading: "1658 (odczyt prawdopodobny)",
    denominationReading: "Brak widocznego nominału",
    mintReading: "Nie ustalono",
    metalAppearance: "Srebrzystoszary metal z brązowawą patyną lub nalotem",
    shape: "Okrągły",
    portrait: "Brak portretu; napis THORVNIA i panorama miasta",
    historicalTypeHypothesis: "Medal okolicznościowy odnoszący się do oblężenia lub obrony Torunia w 1658 roku",
    historicalTypeConfidence: 82,
    historicalEvidence: [
      "Widoczna nazwa THORVNIA",
      "Prawdopodobna data 1658",
      "Panorama ufortyfikowanego miasta",
      "Widoczne działa i ostrzał skierowany ku miastu",
      "Tekst zawiera prawdopodobne fragmenty HOSTILITER OPPVGNATA oraz CIVIBVS DEFENSA",
    ],
    obverseLegendFragments: ["THORVNIA", "HOSTILITER OPPVGNATA"],
    reverseLegendFragments: ["CIVIBVS DEFENSA", "1658"],
    mintMarks: [],
  };
  const ranked = orchestrateRecognitionCandidates(observations, catalog);
  const exact = ranked.ranked.find((entry) => entry.candidate.id === "mnk:447205");
  assert.ok(exact, "1629 Toruń siege thaler must survive chronology filtering");
  assert.ok(exact.score >= 30, "exact brandtalar must retain a meaningful evidence score");
  assert.ok(exact.selectionConflicts.some((item) => /roku/i.test(item)));
  assert.equal(ranked.selected?.candidate.id === exact.candidate.id, false);
  const visual = visualReferenceShortlist(ranked, { limit: 5, minimumScore: 35 });
  const exactVisual = visual.find((entry) => entry.candidate.id === "mnk:447205");
  assert.ok(exactVisual);
  assert.equal(exact.candidate.visualReferenceSpecimenCount, 4);
  assert.equal(exact.candidate.visualReferenceImages.length, 8);
  assert.equal(exactVisual.referenceImages.length, 8);
  assert.ok(exactVisual.referenceImages.some((url) => url.includes("6e7140e8430f66ce939d473dc06cd8d3")));
});

test("the unique Brandtalar legend corrects a noisy 1658 OCR reading without an image guess", () => {
  const observations = {
    objectKind: "medal",
    countryReading: "Toruń",
    issuerReading: "Toruń (THORVNIA)",
    rulerReading: "Nie dotyczy — emisja miejska/medalowa",
    depictedPersonReading: "Nie ustalono; brak portretu",
    yearReading: "Prawdopodobnie 1658",
    denominationReading: "Nie ustalono",
    mintReading: "Nie ustalono",
    metalAppearance: "srebro",
    shape: "okrągła",
    historicalTypeHypothesis: "Medal związany z oblężeniem Torunia",
    historicalTypeConfidence: 78,
    historicalEvidence: [
      "THORVNIA",
      "HOSTILITER OPPVGNATA",
      "FORTITER A CIVIBVS DEFENSA",
      "panorama płonącego miasta",
    ],
    obverseLegendFragments: ["THORVNIA", "HOSTILITER OPPVGNATA"],
    reverseLegendFragments: ["CIVIB DEFENSA", "1658"],
    heraldry: ["herb Torunia"],
    mintMarks: [],
  };
  const signature = applyEvidenceSignature(observations, catalog);
  assert.equal(signature.matched, true);
  assert.equal(signature.signatureId, "legend:brandtalar-thorvnia-1629");
  assert.equal(signature.observations.objectKind, "coin");
  assert.equal(signature.observations.rulerReading, "Zygmunt III Waza");
  assert.equal(signature.observations.yearReading, "1629");
  assert.equal(signature.observations.denominationReading, "Talar");
  assert.equal(signature.observations.mintReading, "Toruń");

  const ranked = orchestrateRecognitionCandidates(signature.observations, catalog);
  assert.ok(ranked.selected);
  const raw = rawFrom(signature.observations, {
    selectedCandidateId: ranked.selected.candidate.id,
    candidateFit: Math.min(100, ranked.selected.score),
    supportingFeatures: [`catalog-signature:${signature.signatureId}`],
  });
  raw.objectKind = signature.observations.objectKind;
  const result = card(raw, adjudicateRecognition(
    raw,
    ranked.ranked.map((entry) => entry.candidate),
    {},
  ));
  assert.equal(result.ruler, "Zygmunt III Waza");
  assert.equal(result.year, "1629");
  assert.equal(result.nominal, "Talar");
  assert.equal(result.mint, "Toruń");
  assert.match(result.title, /talar toruński oblężniczy|brandtalar/i);
});

test("a generic Torun siege mention cannot trigger the Brandtalar signature", () => {
  const result = applyEvidenceSignature({
    historicalEvidence: ["THORVNIA", "oblężenie miasta"],
    obverseLegendFragments: ["THORVNIA"],
    reverseLegendFragments: [],
  }, catalog);
  assert.equal(result.matched, false);
  assert.deepEqual(result.correctedFields, []);
});

test("THORVNIA plus a visible city panorama requests one evidence-only legend reread", () => {
  const observations = {
    portrait: "Brak portretu; rozbudowana panorama ufortyfikowanego miasta",
    historicalTypeHypothesis: "Medal pamiątkowy związany z Toruniem",
    historicalEvidence: ["Czytelny centralny napis THORVNIA", "panorama miasta"],
    obverseLegendFragments: ["THORVNIA"],
    reverseLegendFragments: [],
  };
  assert.equal(needsEvidenceSignatureReview(observations), true);
  assert.equal(needsEvidenceSignatureReview({
    ...observations,
    portrait: "Nie ustalono",
    historicalTypeHypothesis: "Nie ustalono",
    historicalEvidence: ["THORVNIA"],
  }), false);
});

test("a focused legend reread can complete the signature but cannot alter identity fields itself", () => {
  const base = {
    objectKind: "medal",
    rulerReading: "Nie ustalono",
    yearReading: "Nie ustalono",
    denominationReading: "Nie ustalono",
    obverseLegendFragments: ["THORVNIA"],
    reverseLegendFragments: [],
  };
  const merged = mergeEvidenceSignatureReview(base, {
    obverseLegendFragments: ["HOSTILITER", "OPPVGNATA", "CIVIB", "DEFENSA"],
    reverseLegendFragments: [],
  });
  assert.equal(merged.observations.rulerReading, "Nie ustalono");
  assert.equal(merged.observations.yearReading, "Nie ustalono");
  assert.equal(merged.observations.denominationReading, "Nie ustalono");
  const signature = applyEvidenceSignature(merged.observations, catalog);
  assert.equal(signature.matched, true);
  assert.equal(signature.observations.rulerReading, "Zygmunt III Waza");
  assert.equal(signature.observations.yearReading, "1629");
  assert.equal(signature.observations.denominationReading, "Talar");
});

test("a focused medieval reread upgrades Ludwik only with explicit legend evidence", () => {
  const base = {
    objectKind: "coin",
    countryReading: "Państwo Franków / obszar karoliński",
    issuerReading: "Nie ustalono",
    rulerReading: "Nie ustalono",
    periodReading: "wczesne średniowiecze, okres karoliński",
    historicalTypeHypothesis: "Karolińska moneta z krzyżem i fasadą świątyni",
    historicalTypeConfidence: 72,
    historicalEvidence: ["krzyż", "fasada świątyni"],
    obverseLegendFragments: ["nieczytelne"],
    reverseLegendFragments: ["RELIGIO"],
  };
  assert.equal(needsMedievalSpecialistReview(base), true);
  const merged = mergeMedievalSpecialistObservations(base, {
    countryReading: "Państwo Frankijskie / imperium karolińskie",
    issuerReading: "Władza cesarska imperium karolińskiego",
    rulerReading: "Ludwik Pobożny / HLVDOVVICVS IMP",
    periodReading: "wczesne średniowiecze, epoka karolińska",
    historicalTypeHypothesis: "Typ Christiana Religio Ludwika Pobożnego",
    historicalTypeConfidence: 91,
    historicalEvidence: ["HLVDOVVICVS IMP", "XPISTIANA RELIGIO", "krzyż", "fasada świątyni"],
    heraldry: ["krzyż"],
    mintMarks: [],
    obverseLegendFragments: ["HLVDOVVICVS IMP"],
    reverseLegendFragments: ["XPISTIANA RELIGIO"],
  });
  assert.equal(merged.observations.rulerReading, "Ludwik Pobożny / HLVDOVVICVS IMP");
  assert.equal(merged.observations.historicalTypeConfidence, 91);
  assert.ok(merged.improvedFields.includes("rulerReading"));
  assert.equal(needsMedievalSpecialistReview(merged.observations), false);
});

test("a generic Ludwik or Ludwik III result remains eligible for the focused medieval reread", () => {
  assert.equal(needsMedievalSpecialistReview({
    objectKind: "coin",
    rulerReading: "Ludwik III",
    periodReading: "wczesne średniowiecze, okres karoliński",
    historicalTypeHypothesis: "moneta karolińska z krzyżem i świątynią",
    historicalTypeConfidence: 91,
    historicalEvidence: ["krzyż", "fasada świątyni", "RELIGIO"],
    obverseLegendFragments: ["LVD..."],
    reverseLegendFragments: ["RELIGIO"],
  }), true);
});

test("a medieval reread without legend proof cannot invent Ludwik", () => {
  const merged = mergeMedievalSpecialistObservations({
    rulerReading: "Nie ustalono",
    historicalTypeConfidence: 72,
    historicalEvidence: ["krzyż", "fasada świątyni"],
  }, {
    rulerReading: "Ludwik Pobożny",
    historicalTypeConfidence: 90,
    historicalEvidence: ["krzyż", "fasada świątyni"],
    obverseLegendFragments: [],
    reverseLegendFragments: [],
  });
  assert.equal(merged.observations.rulerReading, "Nie ustalono");
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
    shape: "rombowa czworokątna forma",
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

test("a partial 193? year and wrong 10-zloty OCR retain the exact 5-zloty 1936 klippe for images", () => {
  const observations = {
    objectKind: "pattern",
    countryReading: "Polska",
    issuerReading: "Rzeczpospolita Polska",
    rulerReading: "Nie dotyczy — emisja państwowa",
    depictedPersonReading: "Nie ustalono",
    yearReading: "193?; ostatnia cyfra nieczytelna",
    denominationReading: "10 ZŁOTYCH",
    mintReading: "Nie ustalono",
    metalAppearance: "srebrzystoszary metal",
    shape: "kwadratowa klipa",
    portrait: "żaglowiec w romboidalnym polu",
    heraldry: ["orzeł państwowy"],
    historicalTypeHypothesis: "Polska próbna emisja klipowa z żaglowcem",
    historicalTypeConfidence: 78,
    historicalEvidence: ["kwadratowa klipa", "żaglowiec", "orzeł", "193?"],
    obverseLegendFragments: ["ZŁOTYCH", "żaglowiec"],
    reverseLegendFragments: ["RZECZPOSPOLITA POLSKA", "193?"],
    mintMarks: [],
  };
  const ranked = orchestrateRecognitionCandidates(observations, catalog);
  const exact = ranked.ranked.find((entry) => entry.candidate.id === "mnk:89516");
  assert.ok(exact);
  assert.ok(exact.selectionConflicts.some((item) => /nominału/i.test(item)));
  assert.equal(ranked.selected?.candidate.id === exact.candidate.id, false);
  const visual = visualReferenceShortlist(ranked, { limit: 5, minimumScore: 35 });
  assert.ok(visual.some((entry) => entry.candidate.id === exact.candidate.id));
});

test("a wrong 1933 and 15-zloty OCR still sends the ship klippe to the exact 5-zloty image gate", () => {
  const observations = {
    objectKind: "pattern",
    countryReading: "Polska",
    issuerReading: "Rzeczpospolita Polska",
    rulerReading: "Nie dotyczy — emisja państwowa",
    depictedPersonReading: "Nie ustalono",
    yearReading: "1933 (odczyt niepewny z powodu rozmycia)",
    denominationReading: "15 złotych",
    mintReading: "Nie ustalono",
    metalAppearance: "Srebrzystoszary metal",
    shape: "Kwadratowa klipa ustawiona narożnikiem ku górze",
    portrait: "Żaglowiec jako główny motyw",
    heraldry: ["Orzeł państwowy"],
    historicalTypeHypothesis: "Polska wzorcowa klipa z żaglowcem",
    historicalTypeConfidence: 78,
    historicalEvidence: ["kwadratowa klipa", "żaglowiec", "orzeł państwowy"],
    obverseLegendFragments: ["15 ZŁOTYCH"],
    reverseLegendFragments: ["RZECZPOSPOLITA POLSKA"],
    mintMarks: [],
  };
  const ranked = orchestrateRecognitionCandidates(observations, catalog);
  const exact = ranked.ranked.find((entry) => entry.candidate.id === "mnk:89516");
  assert.ok(exact);
  assert.ok(exact.selectionConflicts.some((item) => /roku/i.test(item)));
  assert.ok(exact.selectionConflicts.some((item) => /nominału/i.test(item)));
  assert.equal(ranked.selected?.candidate.id === exact.candidate.id, false);
  const visual = visualReferenceShortlist(ranked);
  assert.ok(visual.some((entry) => entry.candidate.id === exact.candidate.id));
});
