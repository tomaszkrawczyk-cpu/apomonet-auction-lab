const DEFAULT_LIMIT = 8;
const MIN_METADATA_SCORE = 35;

function clean(value) {
  return String(value ?? "").trim();
}

function usableImages(candidate) {
  return [...new Set(Array.isArray(candidate?.images) ? candidate.images : [])]
    .map(clean)
    .filter((url) => /^https:\/\//i.test(url))
    .slice(0, 2);
}

function hasNoHardConflict(item) {
  return !Array.isArray(item?.hardConflicts) || item.hardConflicts.length === 0;
}

/**
 * Stage 1 compares canonical type representatives, not arbitrary specimens.
 * The metadata orchestrator already consolidates specimens into one candidate
 * per ruler/year/denomination/mint identity. This helper only applies the
 * image-rights/availability gate and keeps the comparison bounded.
 */
export function visualReferenceShortlist(ranked, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.limit) || DEFAULT_LIMIT, 10));
  const minimumScore = Number.isFinite(Number(options.minimumScore))
    ? Number(options.minimumScore)
    : MIN_METADATA_SCORE;
  return (Array.isArray(ranked?.ranked) ? ranked.ranked : [])
    .filter(
      (item) =>
        Number(item?.score) >= minimumScore &&
        hasNoHardConflict(item) &&
        usableImages(item?.candidate).length > 0,
    )
    .slice(0, limit)
    .map((item, visualRank) => ({
      ...item,
      visualRank: visualRank + 1,
      referenceImages: usableImages(item.candidate),
    }));
}

export function shouldCompareVisualReferences(ranked, shortlist = visualReferenceShortlist(ranked)) {
  if (!shortlist.length) return false;
  const top = ranked?.ranked?.[0];
  if (!top) return false;
  if (ranked?.engineConflict || !ranked?.selected) return true;
  return Number(top.score) < 90 || Number(ranked?.gap) < 20;
}

export const visualRecognitionPolicy = Object.freeze({
  version: "stage1-visual-reranker-v1",
  maxReferenceTypes: DEFAULT_LIMIT,
  maxImagesPerType: 2,
  acceptsSingleReferenceImage: true,
  minimumMetadataScore: MIN_METADATA_SCORE,
  selectionFitThreshold: 80,
});
