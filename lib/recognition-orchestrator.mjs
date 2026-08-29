import { normalized, normalizeMeasurements, rankEvidenceCandidates } from "./recognition-core.mjs";

const MAX_SHORTLIST = 480;
const MIN_TOKEN_LENGTH = 3;
const indexCache = new WeakMap();

function clean(value) {
  return String(value ?? "").trim();
}

function canonicalNominal(value) {
  return normalized(value)
    .replace(/\bpolgrosz\w*\b|\b1 2 grosz\w*\b/g, "polgrosz")
    .replace(/\b(?:3 grosz\w*|trojak\w*|trojk\w*)\b/g, "trojak")
    .replace(/\b(?:4 grosz\w*|czworak\w*|czwork\w*)\b/g, "czworak")
    .replace(/\b(?:6 grosz\w*|szostak\w*|szostk\w*)\b/g, "szostak")
    .replace(/\b(?:18 grosz\w*|ort)\b/g, "ort")
    .replace(/\b(?:schilling|solidus|szelag)\b/g, "szelag")
    .replace(/\b(?:thaler|taler)\b/g, "talar")
    .replace(/\b(?:ducat)\b/g, "dukat")
    .replace(/\b(?:kopeck|kopek)\b/g, "kopiejka")
    .replace(/\b(?:mark)\b/g, "marka")
    .replace(/\b(?:pfennig)\b/g, "fenig")
    .replace(/\s+/g, " ")
    .trim();
}

function explicitRuler(value) {
  const ruler = normalized(value);
  if (/\b(?:stephan\w*|stefan)\b/.test(ruler)) return "stefan batory";
  if (/\b(?:ioan\w*|john|johann|jan)\b/.test(ruler) && /\b(?:casim\w*|kazim\w*)\b/.test(ruler)) return "jan kazimierz";
  const sigismund = /\b(?:sigis\w*|sigism\w*|sigmund\w*|zygmunt)\b/.test(ruler);
  if (sigismund && /\b(?:avg\w*|august\w*|ii|2)\b/.test(ruler)) return "zygmunt ii august";
  if (sigismund && /\b(?:iii|3|waza|vasa)\b/.test(ruler)) return "zygmunt iii waza";
  if (sigismund && /\b(?:i|1|old|stary)\b/.test(ruler)) return "zygmunt i stary";
  if (/\b(?:ladisla\w*|vladisla\w*|wladyslaw)\b/.test(ruler) && /\b(?:iv|4|waza|vasa)\b/.test(ruler)) return "wladyslaw iv waza";
  if (/\b(?:stanisla\w*)\b/.test(ruler) && /\b(?:august\w*|poniatow\w*)\b/.test(ruler)) return "stanislaw august poniatowski";
  return "";
}

function canonicalRuler(value) {
  const ruler = normalized(value);
  return explicitRuler(ruler) || ruler;
}

function canonicalMint(value) {
  const mint = normalized(value);
  const aliases = [
    [/\b(?:gedan\w*|gdansk|danzig)\b/, "gdansk"], [/\b(?:elbing|elblag)\b/, "elblag"],
    [/\b(?:bromberg|bydgoszcz)\b/, "bydgoszcz"], [/\b(?:thorn|torun)\b/, "torun"],
    [/\b(?:cracow|krakau|krakow)\b/, "krakow"], [/\b(?:warsaw|varsav\w*|warszawa)\b/, "warszawa"],
    [/\b(?:viln\w*|wilno)\b/, "wilno"], [/\b(?:riga|ryga)\b/, "ryga"],
    [/\b(?:posen|poznan)\b/, "poznan"], [/\b(?:fraustadt|wschowa)\b/, "wschowa"],
    [/\b(?:marienburg|malbork)\b/, "malbork"], [/\b(?:leipzig|lipsk)\b/, "lipsk"],
  ];
  return aliases.find(([pattern]) => pattern.test(mint))?.[1] || mint;
}

function explicitMetal(value) {
  const metal = normalized(value);
  if (/\b(?:zlot\w*|zolty\w*|zlocist\w*|zlotaw\w*|gold\w*|yellow\w*|avr|aure\w*)\b/.test(metal)) return "zloto";
  if (/\b(?:srebro\w*|srebr\w*|silver\w*|arg|argent\w*)\b/.test(metal)) return "srebro";
  return "";
}

function canonicalMetal(value) {
  const metal = normalized(value);
  return explicitMetal(metal) || metal;
}

function evidenceLegend(observations = {}) {
  return clean([
    ...(Array.isArray(observations.obverseLegendFragments) ? observations.obverseLegendFragments : []),
    ...(Array.isArray(observations.reverseLegendFragments) ? observations.reverseLegendFragments : []),
  ].filter(Boolean).join(" "));
}

function rulerFromEvidence(observations = {}) {
  const legend = evidenceLegend(observations);
  const explicit = explicitRuler(legend) || explicitRuler(observations.rulerReading);
  if (explicit) return explicit;
  const year = Number(yearKey(observations.yearReading));
  const generic = normalized(`${observations.rulerReading || ""} ${legend}`);
  if (
    /\b(?:sigis\w*|sigism\w*|sigmund\w*|zygmunt)\b/.test(generic) &&
    year >= 1548 && year <= 1572
  ) {
    return "zygmunt ii august";
  }
  return canonicalRuler(observations.rulerReading);
}

function mintFromEvidence(observations = {}) {
  const direct = canonicalMint(observations.mintReading);
  if (direct && direct !== normalized(observations.mintReading)) return direct;
  const legendText = evidenceLegend(observations);
  const legend = canonicalMint(legendText);
  return legend !== normalized(legendText) ? legend : direct;
}

function metalFromEvidence(observations = {}) {
  return explicitMetal(evidenceLegend(observations)) || canonicalMetal(observations.metalAppearance);
}

function yearKey(value) {
  return clean(value).match(/\b(9\d{2}|1\d{3}|20\d{2})\b/)?.[1] || "";
}

const STOPWORDS = new Set([
  "moneta", "monety", "coin", "ruler", "krol", "king", "awers", "rewers", "obverse", "reverse",
  "nie", "ustalono", "widoczny", "widoczne", "fragment", "legenda", "legend", "oraz", "przedstawia",
]);

function tokens(value) {
  return [...new Set(normalized(Array.isArray(value) ? value.flat(Infinity).join(" ") : value)
    .split(/\s+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(token))
    .slice(0, 64))];
}

function addIndex(map, key, index) {
  if (!key) return;
  const bucket = map.get(key);
  if (bucket) bucket.push(index); else map.set(key, [index]);
}

function buildIndexes(candidates) {
  const cached = indexCache.get(candidates);
  if (cached) return cached;
  const indexes = {
    year: new Map(), nominal: new Map(), ruler: new Map(), mint: new Map(), metal: new Map(), token: new Map(),
  };
  candidates.forEach((candidate, index) => {
    addIndex(indexes.year, yearKey(candidate.year), index);
    addIndex(indexes.nominal, canonicalNominal(candidate.nominal), index);
    addIndex(indexes.ruler, canonicalRuler(candidate.ruler), index);
    addIndex(indexes.mint, canonicalMint(candidate.mint), index);
    addIndex(indexes.metal, canonicalMetal(candidate.metal), index);
    for (const token of tokens([
      candidate.portrait, candidate.obverseLegend, candidate.reverseLegend,
      candidate.diagnosticMarkers, candidate.ruler, candidate.mint,
    ])) addIndex(indexes.token, token, index);
  });
  indexCache.set(candidates, indexes);
  return indexes;
}

function vote(votes, indexes, key, value, points, engine) {
  const bucket = indexes[key].get(value) || [];
  for (const index of bucket) {
    const entry = votes.get(index) || { points: 0, engines: new Set() };
    entry.points += points;
    entry.engines.add(engine);
    votes.set(index, entry);
  }
  return bucket.length;
}

function identityKey(candidate) {
  return [
    canonicalRuler(candidate.ruler), yearKey(candidate.year), canonicalNominal(candidate.nominal),
    canonicalMint(candidate.mint), normalized(candidate.objectKind || "coin"),
  ].join("|");
}

function median(values) {
  const checked = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!checked.length) return null;
  const middle = Math.floor(checked.length / 2);
  return checked.length % 2 ? checked[middle] : (checked[middle - 1] + checked[middle]) / 2;
}

function buildMetrologyProfiles(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    const key = identityKey(candidate);
    const group = groups.get(key) || { weights: [], diameters: [] };
    const weight = Number(candidate.weightGrams);
    const diameter = Number(candidate.diameterMm);
    if (Number.isFinite(weight) && weight > 0) group.weights.push(weight);
    if (Number.isFinite(diameter) && diameter > 0) group.diameters.push(diameter);
    groups.set(key, group);
  }
  return new Map([...groups].map(([key, group]) => [key, {
    weightGrams: median(group.weights),
    diameterMm: median(group.diameters),
  }]));
}

function nominalScaleConflict(candidate, measurements) {
  const nominal = canonicalNominal(candidate.nominal);
  const weight = measurements.weightGrams;
  const diameter = measurements.diameterMm;
  const smallDenomination = /\b(?:szelag|grosz|trojak|czworak|szostak|ort)\b/.test(nominal);
  if (smallDenomination && ((weight && weight >= 15) || (diameter && diameter >= 36))) return true;
  const singleDucat = /\bdukat\b/.test(nominal) && !/\b(?:2|3|4|5|6|8|10)\s*dukat/.test(nominal);
  if (singleDucat && ((weight && weight >= 9) || (diameter && diameter >= 32))) return true;
  return false;
}

function representativeScore(candidate) {
  return (Array.isArray(candidate.images) && candidate.images.length >= 2 ? 50 : 0)
    + (Number(candidate.weightGrams) > 0 ? 20 : 0)
    + (Number(candidate.diameterMm) > 0 ? 10 : 0)
    + (clean(candidate.obverseLegend) ? 5 : 0)
    + (clean(candidate.reverseLegend) ? 5 : 0)
    + (/^curated:|^mnk:/.test(candidate.id) ? 8 : 0);
}

function consolidateSpecimens(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = identityKey(entry.candidate);
    const group = groups.get(key) || [];
    group.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    group.sort((a, b) => representativeScore(b.candidate) - representativeScore(a.candidate) || b.points - a.points);
    const representative = group[0];
    const sources = new Set(group.map((entry) => entry.candidate.sourceName || entry.candidate.source?.name).filter(Boolean));
    return {
      ...representative,
      candidate: {
        ...representative.candidate,
        sourceConsensus: sources.size,
        supportingSourceRecords: group.length,
      },
      points: Math.max(...group.map((entry) => entry.points)) + Math.min(8, Math.log2(group.length + 1) * 2),
      specimenCount: group.length,
      sourceCount: sources.size,
    };
  });
}

function metrologyFit(candidate, measurements, profiles) {
  if (nominalScaleConflict(candidate, measurements)) return { points: 0, conflict: true };
  const profile = profiles.get(identityKey(candidate)) || {};
  const referenceWeight = Number(candidate.weightGrams) || profile.weightGrams;
  const referenceDiameter = Number(candidate.diameterMm) || profile.diameterMm;
  let points = 0;
  let conflict = false;
  if (measurements.weightGrams && referenceWeight) {
    const tolerance = Math.max(0.8, Number(referenceWeight) * 0.08);
    if (Math.abs(measurements.weightGrams - Number(referenceWeight)) <= tolerance) points += 5;
    else conflict = true;
  }
  if (measurements.diameterMm && referenceDiameter) {
    const tolerance = Math.max(2, Number(referenceDiameter) * 0.1);
    if (Math.abs(measurements.diameterMm - Number(referenceDiameter)) <= tolerance) points += 3;
    else conflict = true;
  }
  return { points, conflict };
}

export function retrieveCandidatesWithEngines(observations, candidates, inputMeasurements = {}, options = {}) {
  const startedAt = performance.now();
  const source = Array.isArray(candidates) ? candidates : [];
  const indexes = buildIndexes(source);
  const profiles = buildMetrologyProfiles(source);
  const votes = new Map();
  const diagnostics = {
    fieldEngine: { matches: 0 }, legendEngine: { matches: 0 },
    chronologyEngine: { rejected: 0, retainedAsVisualRival: 0 },
    materialEngine: { rejected: 0 }, metrologyEngine: { matched: 0, rejected: 0 },
    consensusEngine: { groups: 0 },
  };
  const year = yearKey(observations?.yearReading);
  const nominal = canonicalNominal(observations?.denominationReading);
  const ruler = rulerFromEvidence(observations);
  const mint = mintFromEvidence(observations);
  const metal = metalFromEvidence(observations);
  if (year) diagnostics.fieldEngine.matches += vote(votes, indexes, "year", year, 7, "year");
  if (nominal) diagnostics.fieldEngine.matches += vote(votes, indexes, "nominal", nominal, 7, "nominal");
  if (ruler) diagnostics.fieldEngine.matches += vote(votes, indexes, "ruler", ruler, 11, "ruler");
  if (mint) diagnostics.fieldEngine.matches += vote(votes, indexes, "mint", mint, 7, "mint");
  if (metal) diagnostics.fieldEngine.matches += vote(votes, indexes, "metal", metal, 8, "metal");
  const observedTokens = tokens([
    observations?.portrait, observations?.heraldry, observations?.mintMarks,
    observations?.rulerReading, observations?.obverseLegendFragments,
    observations?.reverseLegendFragments,
  ]);
  for (const token of observedTokens.slice(0, 20)) {
    diagnostics.legendEngine.matches += vote(votes, indexes, "token", token, 2, "legend");
  }
  const measurements = normalizeMeasurements(inputMeasurements);
  const applyHardEvidence = (input) => {
    const visualYearRivals = new Map();
    const accepted = input.filter((entry) => {
      let visualYearRival = false;
      if (year) {
        const candidateYear = yearKey(entry.candidate.year);
        const matchingYear = candidateYear === year;
        const supportedYearless = !candidateYear && entry.engines.includes("legend") && entry.points >= 8;
        if (!matchingYear && !supportedYearless) {
          const stableIdentityMatch = entry.engines.includes("ruler") &&
            entry.engines.includes("mint") && entry.engines.includes("metal");
          const hasLegalVisualReference = Array.isArray(entry.candidate?.images) &&
            entry.candidate.images.some((url) => clean(url).startsWith("https://"));
          visualYearRival = Boolean(candidateYear && stableIdentityMatch && hasLegalVisualReference);
          if (!visualYearRival) {
            diagnostics.chronologyEngine.rejected += 1;
            return false;
          }
          entry.points = Math.max(0, entry.points - 4);
        }
      }
      const candidateMetal = canonicalMetal(entry.candidate.metal);
      if (
        ["zloto", "srebro"].includes(metal) &&
        ["zloto", "srebro"].includes(candidateMetal) &&
        metal !== candidateMetal
      ) {
        diagnostics.materialEngine.rejected += 1;
        return false;
      }
      const fit = metrologyFit(entry.candidate, measurements, profiles);
      if (fit.conflict) {
        diagnostics.metrologyEngine.rejected += 1;
        return false;
      }
      if (fit.points) {
        diagnostics.metrologyEngine.matched += 1;
        entry.points += fit.points;
        if (!entry.engines.includes("metrology")) entry.engines.push("metrology");
      }
      if (visualYearRival) {
        const key = identityKey(entry.candidate);
        const previous = visualYearRivals.get(key);
        if (!previous || representativeScore(entry.candidate) > representativeScore(previous.candidate)) {
          visualYearRivals.set(key, entry);
        }
        return false;
      }
      return true;
    });
    diagnostics.chronologyEngine.retainedAsVisualRival += visualYearRivals.size;
    return [...accepted, ...visualYearRivals.values()];
  };
  let entries = applyHardEvidence([...votes.entries()].map(([index, voteEntry]) => ({
    candidate: source[index], points: voteEntry.points, engines: [...voteEntry.engines],
  })));
  if (!entries.length && year) {
    entries = applyHardEvidence((indexes.year.get(year) || []).map((index) => ({
      candidate: source[index], points: 7, engines: ["year"],
    })));
  }
  if (!entries.length && nominal) {
    entries = applyHardEvidence((indexes.nominal.get(nominal) || []).map((index) => ({
      candidate: source[index], points: 7, engines: ["nominal"],
    })));
  }
  const consolidated = consolidateSpecimens(entries);
  diagnostics.consensusEngine.groups = consolidated.length;
  const limit = Math.max(24, Math.min(Number(options.limit) || MAX_SHORTLIST, MAX_SHORTLIST));
  const shortlist = consolidated
    .sort((a, b) => b.points - a.points || b.sourceCount - a.sourceCount || b.specimenCount - a.specimenCount)
    .slice(0, limit)
    .map((entry) => entry.candidate);
  return {
    shortlist,
    diagnostics,
    inputRecordCount: source.length,
    groupedCandidateCount: consolidated.length,
    durationMs: Number((performance.now() - startedAt).toFixed(3)),
  };
}

export function orchestrateRecognitionCandidates(observations, candidates, inputMeasurements = {}, options = {}) {
  const retrieval = retrieveCandidatesWithEngines(observations, candidates, inputMeasurements, options);
  const rankingStartedAt = performance.now();
  const ranking = rankEvidenceCandidates(observations, retrieval.shortlist, inputMeasurements);
  const rankingDurationMs = Number((performance.now() - rankingStartedAt).toFixed(3));
  const top = ranking.ranked[0];
  const rival = ranking.ranked[1];
  const engineConflict = Boolean(
    top && rival && top.score < 90 && ranking.gap < 12 &&
    identityKey(top.candidate) !== identityKey(rival.candidate),
  );
  return {
    ...ranking,
    selected: engineConflict ? null : ranking.selected,
    engineConflict,
    retrieval,
    timings: {
      retrievalMs: retrieval.durationMs,
      rankingMs: rankingDurationMs,
      totalLocalMs: Number((retrieval.durationMs + rankingDurationMs).toFixed(3)),
    },
  };
}

export const recognitionEnginePolicy = Object.freeze({
  version: "multi-engine-orchestrator-v1",
  engines: ["field-index", "legend-token", "chronology", "metrology", "source-consensus"],
  maxShortlist: MAX_SHORTLIST,
  abstainsOnConflict: true,
});
