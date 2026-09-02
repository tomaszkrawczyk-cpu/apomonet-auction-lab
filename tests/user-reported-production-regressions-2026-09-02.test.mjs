import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import {
  adjudicateRecognition,
  analysisFromRecognition,
  conditionFromRaw,
  localReferenceCandidates,
} from "../lib/recognition-core.mjs";
import {
  resolveVisualComparison,
  shouldCompareVisualReferences,
} from "../lib/recognition-visual.mjs";

test("a visual rejection blocks the contradicted Batory identity from the result card", () => {
  const candidate = localReferenceCandidates().find((item) => item.id === "mnw:720079");
  assert.ok(candidate);
  const raw = {
    imageUsable: true,
    objectKind: "coin",
    observations: {
      objectKind: "coin",
      rulerReading: "STEPHANVS / Stefan Batory",
      yearReading: "1583",
      denominationReading: "Nie ustalono",
      denominationEvidence: "Brak jednoznacznego odczytu nominału.",
      mintReading: "Nie ustalono",
      metalAppearance: "Złoty, żółty metal",
      shape: "okrągła",
      portrait: "popiersie króla",
      heraldry: ["wielopolowy herb"],
      mintMarks: [],
      obverseLegendFragments: ["SIGIS AVG"],
      reverseLegendFragments: ["1563"],
    },
    decision: {
      selectedCandidateId: "",
      candidateFit: 0,
      supportingFeatures: [],
      contradictions: [],
      rejectedCandidateIds: [candidate.id],
      blockedIdentityFields: ["ruler", "year", "mint"],
    },
    condition: { band: "uncertain", confidence: 0 },
  };

  const recognition = adjudicateRecognition(raw, [candidate], {});
  const card = analysisFromRecognition(raw, recognition, conditionFromRaw(raw));

  assert.equal(recognition.status, "unresolved");
  assert.equal(card.ruler, "Nie ustalono");
  assert.equal(card.issuer, "Nie ustalono");
  assert.equal(card.depictedPerson, "Nie ustalono");
  assert.equal(card.year, "Nie ustalono");
  assert.equal(card.visibleDateReading, "Nie ustalono");
  assert.doesNotMatch(card.title, /Batory|1583/i);
});

test("the visual challenger returns rejected ids and structured conflicting fields", () => {
  const shortlist = [{ candidate: { id: "mnw:720079" } }];
  const result = resolveVisualComparison({
    selectedCandidateId: "",
    candidateFit: 0,
    comparisons: [{
      candidateId: "mnw:720079",
      visualFit: 0,
      sameType: false,
      sameSpecimen: false,
      matchedSides: "obverse",
      decisiveFeatures: ["SIGIS AVG zamiast STEPHANVS"],
      contradictions: ["Inny władca i data"],
      conflictingFields: ["ruler", "depictedPerson", "year", "design"],
      specimenDifferences: [],
      limitations: ["brak rewersu referencji"],
    }],
  }, shortlist);

  assert.deepEqual(result.rejectedCandidateIds, ["mnw:720079"]);
  assert.deepEqual(result.blockedIdentityFields, ["ruler", "depictedPerson", "year"]);
  assert.equal(result.selectedCandidateId, "");
});

test("Stage 1 skips a slow visual rerank when close contenders share the same basic identity", () => {
  const common = {
    country: "Polska",
    ruler: "Narodowy Bank Polski",
    year: "1949",
    nominal: "10 gr",
  };
  const ranked = {
    selected: null,
    engineConflict: true,
    gap: 0,
    ranked: [
      { score: 84, hardConflicts: [], candidate: { id: "al", ...common, images: ["https://example.test/al.jpg"] } },
      { score: 84, hardConflicts: [], candidate: { id: "mn", ...common, images: ["https://example.test/mn.jpg"] } },
      { score: 40, hardConflicts: [], candidate: { id: "remote", country: "Polska", ruler: "", year: "1949", nominal: "10 gr", images: ["https://example.test/remote.jpg"] } },
    ],
  };

  assert.equal(shouldCompareVisualReferences(ranked), false);
});

test("a coin observation hard-rejects a pattern candidate", () => {
  const observations = {
    objectKind: "coin",
    rulerReading: "Narodowy Bank Polski",
    yearReading: "1949",
    denominationReading: "10 gr",
    mintReading: "Nie ustalono",
    metalAppearance: "Nie ustalono",
    shape: "okrągła",
  };
  const pattern = {
    id: "pattern",
    objectKind: "pattern",
    country: "Polska",
    ruler: "Narodowy Bank Polski",
    year: "1949",
    nominal: "10 gr",
    shape: "okrągła",
    sourceType: "open-data",
    sourceName: "test",
  };
  const raw = {
    imageUsable: true,
    objectKind: "coin",
    observations,
    decision: { selectedCandidateId: "pattern", candidateFit: 90, supportingFeatures: [], contradictions: [] },
    condition: { band: "uncertain", confidence: 0 },
  };

  const recognition = adjudicateRecognition(raw, [pattern], {});
  assert.equal(recognition.status, "unresolved");
  assert.equal(recognition.selected, null);
});

test("record reuse and save binding require a complete matching photo pair", async () => {
  const source = await readFile(new URL("../analysis-record-identity.js", import.meta.url), "utf8");
  const context = { window: null };
  context.window = context;
  vm.runInNewContext(source, context);
  const identity = context.ApoAnalysisRecordIdentity;
  const images = ["data:image/jpeg;base64,AWERS", "data:image/jpeg;base64,REWERS"];
  const signature = identity.photoSignature(images);

  assert.equal(identity.hasPhotoPair(images), true);
  assert.equal(identity.hasPhotoPair([images[0], null]), false);
  assert.equal(identity.analysisMatchesPhotos({ analysisSignature: signature, images }), true);
  assert.equal(identity.analysisMatchesPhotos({ analysisSignature: signature, images: [images[0], null] }), false);
  assert.equal(identity.reusableId({ id: "old", savedSignature: identity.photoSignature([null, null]), images: [null, null] }), undefined);
});

test("mobile flow keeps original previews and rejects stale analysis responses before save", async () => {
  const [pipeline, page, api] = await Promise.all([
    readFile(new URL("../analysis-image-pipeline.js", import.meta.url), "utf8"),
    readFile(new URL("../analyze.html", import.meta.url), "utf8"),
    readFile(new URL("../api/analyze.js", import.meta.url), "utf8"),
  ]);

  assert.match(pipeline, /displayRect=fullFrame\(source\)/);
  assert.match(pipeline, /previewMode:displayRect\.mode/);
  assert.doesNotMatch(pipeline, /previewCrop/);
  assert.match(page, /activeBasicController\?\.abort\(\)/);
  assert.match(page, /requestRevision !== photoRevision/);
  assert.match(page, /analysisMatchesPhotos/);
  assert.match(page, /hasPhotoPair/);
  assert.match(page, /analyzedPhotoSignature/);
  assert.match(api, /objectKind: raw\.objectKind/);
  assert.match(api, /decision\.rejectedCandidateIds/);
  assert.match(api, /decision\.blockedIdentityFields/);
});
