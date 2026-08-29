import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveVisualComparison,
  shouldCompareVisualReferences,
  visualRecognitionPolicy,
  visualReferenceShortlist,
} from "../lib/recognition-visual.mjs";
import { localReferenceCandidates } from "../lib/recognition-core.mjs";
import { orchestrateRecognitionCandidates } from "../lib/recognition-orchestrator.mjs";

function rankedItem(id, score, images, hardConflicts = []) {
  return {
    score,
    hardConflicts,
    candidate: {
      id,
      title: id,
      images,
    },
  };
}

test("Stage 1 visual shortlist accepts a legal record with one reference image", () => {
  const ranked = {
    ranked: [rankedItem("single-image", 81, ["https://museum.example/coin.jpg"])],
    selected: null,
    engineConflict: true,
    gap: 0,
  };
  const shortlist = visualReferenceShortlist(ranked);
  assert.equal(shortlist.length, 1);
  assert.equal(shortlist[0].candidate.id, "single-image");
  assert.deepEqual(shortlist[0].referenceImages, ["https://museum.example/coin.jpg"]);
  assert.equal(shouldCompareVisualReferences(ranked, shortlist), true);
});

test("visual challenger keeps the fifth metadata candidate and compares up to eight types", () => {
  const ranked = {
    ranked: Array.from({ length: 10 }, (_, index) =>
      rankedItem(`candidate-${index + 1}`, 90 - index, [
        `https://museum.example/${index + 1}-a.jpg`,
        `https://museum.example/${index + 1}-b.jpg`,
      ]),
    ),
    selected: null,
    engineConflict: true,
    gap: 1,
  };
  const shortlist = visualReferenceShortlist(ranked);
  assert.equal(shortlist.length, visualRecognitionPolicy.maxReferenceTypes);
  assert.ok(shortlist.some((item) => item.candidate.id === "candidate-5"));
  assert.ok(!shortlist.some((item) => item.candidate.id === "candidate-9"));
});

test("visual challenger rejects conflicting, weak and non-https references", () => {
  const ranked = {
    ranked: [
      rankedItem("conflict", 90, ["https://museum.example/conflict.jpg"], ["wrong year"]),
      rankedItem("weak", 34, ["https://museum.example/weak.jpg"]),
      rankedItem("unsafe", 88, ["http://museum.example/unsafe.jpg"]),
      rankedItem("eligible", 80, ["https://museum.example/eligible.jpg"]),
    ],
    selected: null,
    engineConflict: true,
    gap: 0,
  };
  assert.deepEqual(
    visualReferenceShortlist(ranked).map((item) => item.candidate.id),
    ["eligible"],
  );
});

test("strong deterministic identity does not pay for an unnecessary visual rerank", () => {
  const top = rankedItem("certain", 96, ["https://museum.example/certain.jpg"]);
  const ranked = {
    ranked: [top, rankedItem("rival", 70, ["https://museum.example/rival.jpg"])],
    selected: top,
    engineConflict: false,
    gap: 26,
  };
  assert.equal(shouldCompareVisualReferences(ranked), false);
});

test("per-candidate visual scores can confirm an exact specimen even when the model abstains globally", () => {
  const shortlist = [
    { candidate: { id: "wrong-year" } },
    { candidate: { id: "exact-1551" } },
  ];
  const result = resolveVisualComparison({
    selectedCandidateId: "",
    candidateFit: 62,
    comparisons: [
      {
        candidateId: "wrong-year",
        visualFit: 61,
        sameType: true,
        sameSpecimen: false,
        matchedSides: "obverse",
        decisiveFeatures: ["podobny portret"],
        contradictions: [],
      },
      {
        candidateId: "exact-1551",
        visualFit: 91,
        sameType: true,
        sameSpecimen: true,
        matchedSides: "obverse",
        decisiveFeatures: ["identyczny stempel i ślady powierzchni"],
        contradictions: [],
      },
    ],
  }, shortlist);
  assert.equal(result.selectedCandidateId, "exact-1551");
  assert.equal(result.selectionBasis, "same-specimen");
  assert.equal(result.candidateFit, 91);
});

test("visual score gate abstains when similar types have no decisive margin", () => {
  const shortlist = [
    { candidate: { id: "year-a" } },
    { candidate: { id: "year-b" } },
  ];
  const result = resolveVisualComparison({
    selectedCandidateId: "",
    candidateFit: 70,
    comparisons: [
      { candidateId: "year-a", visualFit: 84, sameType: true, sameSpecimen: false, matchedSides: "obverse", decisiveFeatures: [], contradictions: [] },
      { candidateId: "year-b", visualFit: 82, sameType: true, sameSpecimen: false, matchedSides: "obverse", decisiveFeatures: [], contradictions: [] },
    ],
  }, shortlist);
  assert.equal(result.selectedCandidateId, "");
  assert.equal(result.selectionBasis, "abstained");
});

test("zlocisty appearance removes silver candidates before visual comparison", () => {
  const observations = {
    rulerReading: "Zygmunt II August",
    yearReading: "Nie ustalono",
    denominationReading: "Nie ustalono",
    mintReading: "Gdańsk",
    metalAppearance: "Złocisty metal",
    shape: "okrągła",
    portrait: "koronowany król",
    heraldry: ["herb Gdańska"],
    mintMarks: [],
    obverseLegendFragments: ["SIGIS AVG"],
    reverseLegendFragments: ["MONE NO AVR", "CIVI GEDANEN"],
  };
  const ranked = orchestrateRecognitionCandidates(observations, localReferenceCandidates());
  const shortlist = visualReferenceShortlist(ranked);
  assert.ok(shortlist.length > 0);
  assert.ok(shortlist.every((item) => !/srebro/i.test(item.candidate.metal)));
  assert.ok(shortlist.some((item) => item.candidate.id === "mnw:721631"));
});

test("the real 1551 Gdansk ducat reaches the visual challenger despite tied neighboring years", () => {
  const observations = {
    rulerReading: "Zygmunt II August",
    yearReading: "Nie ustalono",
    denominationReading: "Nie ustalono",
    mintReading: "Gdańsk",
    metalAppearance: "metal o złotej barwie",
    shape: "okrągła",
    portrait: "koronowany król w prawo",
    heraldry: ["herb Gdańska podtrzymywany przez dwa lwy"],
    mintMarks: [],
    obverseLegendFragments: ["SIGIS AVG", "REX POLONI"],
    reverseLegendFragments: ["MONE NO AVR", "CIVI GEDANEN"],
  };
  const ranked = orchestrateRecognitionCandidates(
    observations,
    localReferenceCandidates(),
  );
  const shortlist = visualReferenceShortlist(ranked);
  assert.equal(ranked.selected, null);
  assert.ok(shortlist.some((item) => item.candidate.id === "mnw:721631"));
  assert.equal(
    shortlist.find((item) => item.candidate.id === "mnw:721631").referenceImages.length,
    1,
  );
});

test("the real 1577 Gdansk siege thaler reference reaches the visual challenger", () => {
  const observations = {
    rulerReading: "Nie ustalono",
    yearReading: "1577",
    denominationReading: "Nie ustalono",
    mintReading: "GEDANENSIS",
    metalAppearance: "srebro",
    shape: "okrągła",
    portrait: "Chrystus trzymający jabłko z krzyżem",
    heraldry: ["herb Gdańska podtrzymywany przez dwa lwy"],
    mintMarks: [],
    obverseLegendFragments: ["DEFENDE NOS CHRISTE SALVATOR"],
    reverseLegendFragments: ["MONETA NOVA CIVITATIS GEDANENSIS", "1577"],
  };
  const ranked = orchestrateRecognitionCandidates(
    observations,
    localReferenceCandidates(),
  );
  const shortlist = visualReferenceShortlist(ranked);
  assert.ok(shortlist.some((item) => item.candidate.id === "mnk:210590"));
  assert.equal(
    shortlist.find((item) => item.candidate.id === "mnk:210590").referenceImages.length,
    2,
  );
});
