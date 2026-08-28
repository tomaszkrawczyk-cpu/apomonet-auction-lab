import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import {
  localReferenceCandidates,
  rankEvidenceCandidates,
  recognitionCatalogPolicy,
} from "../lib/recognition-core.mjs";

const historical = JSON.parse(
  gunzipSync(
    await readFile(new URL("../data/recognition/historical-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const candidates = localReferenceCandidates();
const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

test("historical open-image layer retains file-level licensing and conservative matching", () => {
  assert.ok(historical.stats.licensedFilesReviewed >= 1_070);
  assert.ok(historical.stats.matchedMuseumTypes >= 63);
  assert.ok(historical.stats.rejectedForbidden >= 90);
  assert.ok(historical.stats.rejectedAmbiguousOrIncomplete >= 790);
  assert.equal(historical.records.length, 0, "filenames alone must not create identity candidates");
  assert.equal(new Set(historical.enrichments.map((item) => item.targetId)).size, historical.enrichments.length);

  for (const enrichment of historical.enrichments) {
    assert.ok(candidateById.has(enrichment.targetId), enrichment.targetId);
    assert.equal(enrichment.images.length, enrichment.imageRights.length);
    assert.match(enrichment.matchConfidence, /^exact-year-nominal-region/);
    for (const rights of enrichment.imageRights) {
      assert.match(rights.filePageUrl, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      assert.match(rights.license.toLowerCase(), /^(?:cc|public domain|pd)/);
    }
  }
});

test("requested historical families and partition issues have explicit scale gates", () => {
  assert.ok(recognitionCatalogPolicy.historicalFamilyRecordCount >= 805);
  assert.ok(recognitionCatalogPolicy.partitionRecordCount >= 445);
  assert.equal(recognitionCatalogPolicy.historicalOpenEnrichmentCount, historical.enrichments.length);
  assert.equal(
    recognitionCatalogPolicy.historicalOpenImageCount,
    historical.enrichments.reduce((count, item) => count + item.images.length, 0),
  );

  const expectedMinimums = new Map([
    ["półgrosz", 80],
    ["szeląg", 140],
    ["kopiej", 70],
    ["mark", 15],
    ["trojak", 140],
    ["czworak", 4],
    ["szóstak", 70],
    ["półtalar", 39],
  ]);
  for (const [fragment, minimum] of expectedMinimums) {
    const count = candidates.filter((candidate) => candidate.nominal.toLowerCase().includes(fragment)).length;
    assert.ok(count >= minimum, `${fragment}: ${count} < ${minimum}`);
  }
});

test("partition regions before 1795 no longer fall into elective-monarchy period", () => {
  for (const marker of ["Galicja i Lodomeria", "Prusy Południowe"]) {
    const records = candidates.filter((candidate) => candidate.title.includes(marker));
    assert.ok(records.length > 0, marker);
    assert.ok(records.every((candidate) => candidate.period === "partitions-and-uprisings"), marker);
  }
});

test("German Empire marks are labeled as non-Polish circulation references for the Prussian partition", () => {
  const markCirculation = candidates.filter((candidate) => candidate.circulationContext);
  assert.ok(markCirculation.length >= 13);
  for (const candidate of markCirculation) {
    assert.match(candidate.nominal, /^[23] marki$/);
    assert.equal(candidate.period, "partitions-and-uprisings");
    assert.equal(candidate.source.rightsCode, "public-domain");
    assert.ok(candidate.images.length >= 2);
    assert.match(candidate.circulationContext, /emisja niepolska/);
  }
});

test("kopeck values stay distinct while colloquial three, four and six match historical names", () => {
  const kopecks = candidates.filter((candidate) => candidate.year === "1848" && /kopiej/.test(candidate.nominal.toLowerCase()));
  const one = kopecks.find((candidate) => candidate.nominal === "1 kopiejka");
  const three = kopecks.find((candidate) => candidate.nominal === "3 kopiejki");
  assert.ok(one);
  assert.ok(three);
  const rankedKopecks = rankEvidenceCandidates({
    yearReading: "1848",
    denominationReading: "3 kopiejki",
    rulerReading: three.ruler,
    mintReading: three.mint,
  }, [one, three]);
  assert.equal(rankedKopecks.selected?.candidate.nominal, "3 kopiejki");

  for (const [reading, catalogNominal] of [
    ["trójka", "Trojak"],
    ["czwórka", "Czworak"],
    ["szóstka", "Szóstak"],
  ]) {
    const candidate = candidates.find((item) => item.nominal === catalogNominal);
    assert.ok(candidate, catalogNominal);
    const ranked = rankEvidenceCandidates({
      yearReading: candidate.year,
      denominationReading: reading,
      rulerReading: candidate.ruler,
      mintReading: candidate.mint,
    }, [candidate]);
    assert.equal(ranked.selected?.candidate.id, candidate.id, reading);
  }

  const twoMarks = candidates.find((candidate) => candidate.nominal === "2 marki" && candidate.circulationContext);
  const threeMarks = candidates.find((candidate) => candidate.nominal === "3 marki" && candidate.circulationContext);
  const rankedMarks = rankEvidenceCandidates({
    denominationReading: "3 marki",
    yearReading: threeMarks.year,
    rulerReading: threeMarks.ruler,
    mintReading: threeMarks.mint,
  }, [twoMarks, threeMarks]);
  assert.equal(rankedMarks.selected?.candidate.id, threeMarks.id);
});
