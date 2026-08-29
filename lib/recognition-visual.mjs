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

function normalizedComparison(raw, allowedIds) {
  const candidateId = clean(raw?.candidateId);
  if (!allowedIds.has(candidateId)) return null;
  return {
    candidateId,
    visualFit: Math.max(0, Math.min(100, Number(raw?.visualFit) || 0)),
    sameType: raw?.sameType === true,
    sameSpecimen: raw?.sameSpecimen === true,
    matchedSides: ["both", "obverse", "reverse", "uncertain"].includes(raw?.matchedSides)
      ? raw.matchedSides
      : "uncertain",
    decisiveFeatures: Array.isArray(raw?.decisiveFeatures)
      ? raw.decisiveFeatures.map(clean).filter(Boolean).slice(0, 4)
      : [],
    contradictions: Array.isArray(raw?.contradictions)
      ? raw.contradictions.map(clean).filter(Boolean).slice(0, 4)
      : [],
  };
}

/**
 * The vision model must score every displayed candidate. APOMONET then applies
 * one deterministic gate instead of trusting an unstructured "best guess".
 */
export function resolveVisualComparison(raw, shortlist) {
  const allowedIds = new Set((shortlist || []).map((item) => item.candidate.id));
  const byId = new Map();
  for (const entry of Array.isArray(raw?.comparisons) ? raw.comparisons : []) {
    const checked = normalizedComparison(entry, allowedIds);
    if (checked && !byId.has(checked.candidateId)) byId.set(checked.candidateId, checked);
  }
  const comparisons = [...byId.values()].sort((a, b) => b.visualFit - a.visualFit);
  const best = comparisons[0] || null;
  const runner = comparisons[1] || null;
  const margin = best ? best.visualFit - (runner?.visualFit || 0) : 0;
  const directId = allowedIds.has(clean(raw?.selectedCandidateId))
    ? clean(raw.selectedCandidateId)
    : "";
  const direct = directId ? byId.get(directId) : null;
  const exactSpecimen = Boolean(
    best &&
    best.sameSpecimen &&
    best.sameType &&
    best.visualFit >= 78 &&
    best.contradictions.length === 0 &&
    margin >= 8,
  );
  const decisiveType = Boolean(
    best &&
    best.sameType &&
    best.visualFit >= 88 &&
    best.contradictions.length === 0 &&
    margin >= 10,
  );
  const explicitSelection = Boolean(
    direct &&
    direct.sameType &&
    direct.visualFit >= visualRecognitionPolicy.selectionFitThreshold &&
    direct.contradictions.length === 0,
  );
  const selected = explicitSelection ? direct : exactSpecimen || decisiveType ? best : null;
  return {
    selectedCandidateId: selected?.candidateId || "",
    candidateFit: selected?.visualFit || Math.max(0, Math.min(100, Number(raw?.candidateFit) || 0)),
    supportingFeatures: selected?.decisiveFeatures || [],
    contradictions: selected?.contradictions || [],
    comparisons,
    margin,
    selectionBasis: explicitSelection
      ? "explicit-model-selection"
      : exactSpecimen
        ? "same-specimen"
        : decisiveType
          ? "decisive-type"
          : "abstained",
  };
}

export const visualRecognitionPolicy = Object.freeze({
  version: "stage1-visual-reranker-v2",
  maxReferenceTypes: DEFAULT_LIMIT,
  maxImagesPerType: 2,
  acceptsSingleReferenceImage: true,
  minimumMetadataScore: MIN_METADATA_SCORE,
  selectionFitThreshold: 80,
});
