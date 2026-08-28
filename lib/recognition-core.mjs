import curatedCatalog from "../data/recognition/reference-catalog-v1.json" with { type: "json" };
import nbpCatalog from "../data/recognition/nbp-official-catalog-v1.json" with { type: "json" };
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const mnkBaseCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/mnk-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const mnwCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/mnw-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const prlCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/prl-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const historicalOpenCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/historical-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const polishPatternCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/polish-pattern-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const ansCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/ans-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const europeanaCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/europeana-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const ikmkCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/ikmk-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const czapskiCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/czapski-public-domain-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const historicalOpenByTarget = new Map(
  (historicalOpenCatalog.enrichments || []).map((enrichment) => [enrichment.targetId, enrichment]),
);

const mnkCatalog = {
  ...mnkBaseCatalog,
  records: mnkBaseCatalog.records.map((record) => {
    const enrichment = historicalOpenByTarget.get(record.id);
    if (!enrichment) return record;
    const pairImages = enrichment.images.length >= 2 && record.images.length < 2
      ? enrichment.images.slice(0, 2)
      : record.images;
    return {
      ...record,
      images: pairImages,
      imageRights: pairImages === record.images
        ? record.images.map((imageUrl) => ({
          imageUrl,
          filePageUrl: record.source.url,
          license: record.source.rights,
          licenseUrl: "",
          creator: "",
          credit: record.source.name,
          retrievedAt: record.source.retrievedAt,
        }))
        : enrichment.imageRights.slice(0, 2),
      openReferenceImages: enrichment.images,
      openReferenceImageRights: enrichment.imageRights,
      openReferenceMatch: {
        category: enrichment.category,
        region: enrichment.region,
        confidence: enrichment.matchConfidence,
      },
    };
  }),
};

const NUMISTA_BASE_URL = "https://api.numista.com/v3";
const NUMISTA_TIMEOUT_MS = 8_000;
const MNK_BASE_URL = "https://api-zbiory.mnk.pl";
const MNK_TIMEOUT_MS = 8_000;
const UNKNOWN = "Nie ustalono";
const LOCAL_CATALOGS = [
  curatedCatalog,
  mnkCatalog,
  mnwCatalog,
  historicalOpenCatalog,
  polishPatternCatalog,
  prlCatalog,
  nbpCatalog,
  ansCatalog,
  europeanaCatalog,
  ikmkCatalog,
  czapskiCatalog,
];
const ACCEPTED_RIGHTS = new Set(curatedCatalog.policy.acceptedRights);
const mnkCache =
  globalThis.__apomonetMnkEvidenceCache ||
  (globalThis.__apomonetMnkEvidenceCache = new Map());

function clean(value) {
  return String(value ?? "").trim();
}

export function normalized(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9½]+/g, " ")
    .replace(/\bjan ii kazimierz\b/g, "jan kazimierz")
    .trim();
}

function unknownObservation(value) {
  const observation = normalized(value);
  if (
    !observation ||
    observation === "brak" ||
    observation.startsWith("nie ustalono") ||
    observation.startsWith("nieokresl")
  ) {
    return true;
  }
  if (
    /\b(brak skali|nie pokazano linijk\w*|srednic\w* nie ustalon\w*)\b/.test(observation)
  ) {
    return true;
  }
  return /\b(nieczyteln\w*|nie mozna|nie udalo|nie da sie|nie widac)\b/.test(observation) ||
    /\bbrak\s+(czyteln\w*|widoczn\w*|jednoznaczn\w*|oznaczen\w*|danych|podzialk\w*|informacj\w*)/.test(
      observation,
    );
}

function finite(value) {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function normalizeMeasurements(input = {}) {
  return {
    weightGrams: finite(input.weightGrams ?? input.weight),
    diameterMm: finite(input.diameterMm ?? input.diameter),
    edge: clean(input.edge),
  };
}

function publicLocalRecord(record) {
  if (!record?.source?.rightsCode || record.source.restricted) return null;
  if (!ACCEPTED_RIGHTS.has(record.source.rightsCode)) return null;
  return {
    ...record,
    sourceType: record.source.type || "museum",
    sourceName: record.source.name,
    sourceReference: record.source.recordId,
    sourceUrl: record.source.url,
    rights: record.source.rights,
  };
}

function buildLocalReferenceCandidates() {
  const result = [];
  const seenSourceRecords = new Set();
  for (const catalog of LOCAL_CATALOGS) {
    const catalogSourceRecords = [];
    for (const record of catalog.records || []) {
      const candidate = publicLocalRecord(record);
      const sourceKey = `${candidate?.sourceUrl || ""}|${candidate?.sourceReference || ""}`;
      if (!candidate || seenSourceRecords.has(sourceKey)) continue;
      result.push(candidate);
      catalogSourceRecords.push(sourceKey);
    }
    for (const sourceKey of catalogSourceRecords) seenSourceRecords.add(sourceKey);
  }
  return result;
}

const LOCAL_REFERENCE_CANDIDATES = Object.freeze(buildLocalReferenceCandidates());

export function localReferenceCandidates() {
  return LOCAL_REFERENCE_CANDIDATES;
}

function splitDataUri(value) {
  const match = clean(value).match(/^data:(image\/(?:jpeg|png));base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return null;
  return { mime_type: match[1], image_data: match[2] };
}

async function fetchJson(url, options, timeoutMs = NUMISTA_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data?.message || data?.error || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function numistaCandidate(result, detail = {}) {
  const rulers = Array.isArray(detail.ruler) ? detail.ruler : [];
  const mints = Array.isArray(detail.mints) ? detail.mints : [];
  return {
    id: `numista:${result.id}`,
    externalId: Number(result.id),
    title: clean(detail.title || result.title),
    objectKind: "coin",
    country: clean(detail.issuer?.name || result.issuer?.name),
    ruler: clean(rulers[0]?.name),
    year:
      result.min_year === result.max_year
        ? clean(result.min_year)
        : clean(result.experimental_tentative_year),
    yearRange: [Number(detail.min_year || result.min_year) || null, Number(detail.max_year || result.max_year) || null],
    nominal: clean(detail.value?.text || result.title),
    metal: clean(detail.composition?.text),
    mint: mints.map((mint) => clean(mint.name)).filter(Boolean).join(" / "),
    shape: normalized(detail.shape).includes("round") ? "round" : clean(detail.shape),
    weightGrams: finite(detail.weight),
    diameterMm: finite(detail.size),
    portrait: clean(detail.obverse?.description),
    obverseLegend: clean(detail.obverse?.lettering || detail.obverse?.unabridged_legend),
    reverseLegend: clean(detail.reverse?.lettering || detail.reverse?.unabridged_legend),
    diagnosticMarkers: [],
    images: [result.obverse_thumbnail, result.reverse_thumbnail].filter(Boolean),
    similarityDistance: Number(result.similarity_distance),
    sourceType: "catalog-api",
    sourceName: "Numista",
    sourceReference: `N#${result.id}`,
    sourceUrl: clean(detail.url || `https://en.numista.com/catalogue/index.php?r=${result.id}`),
    rights: "Numista API — transient candidate metadata",
  };
}

export async function searchNumistaByImage(apiKey, images) {
  const key = clean(apiKey);
  if (!key) return { available: false, candidates: [], reason: "missing-key" };
  const prepared = (images || []).map(splitDataUri).filter(Boolean).slice(0, 2);
  if (!prepared.length) return { available: true, candidates: [], reason: "invalid-images" };
  try {
    const search = await fetchJson(`${NUMISTA_BASE_URL}/search_by_image?lang=en`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Numista-API-Key": key },
      body: JSON.stringify({ category: "coin", images: prepared, max_results: 8 }),
    });
    const results = Array.isArray(search.types) ? search.types.slice(0, 8) : [];
    const details = await Promise.all(
      results.slice(0, 5).map((result) =>
        fetchJson(`${NUMISTA_BASE_URL}/types/${result.id}?lang=en`, {
          headers: { "Numista-API-Key": key },
        }).catch(() => ({})),
      ),
    );
    return {
      available: true,
      candidates: results.map((result, index) => numistaCandidate(result, details[index] || {})),
      reason: results.length ? "ok" : "no-results",
    };
  } catch (error) {
    return {
      available: true,
      candidates: [],
      reason: error?.name === "AbortError" ? "timeout" : `error-${error?.status || "unknown"}`,
    };
  }
}

function htmlText(value) {
  return clean(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mnkImageUrl(image) {
  if (!image?.filePath || !image?.extension) return "";
  return `https://cdn-zbiory.mnk.pl/upload/cache/multimedia_detail/${image.filePath}.${image.extension}`;
}

function dimension(record, pattern) {
  const row = (record.sizes || [])
    .flatMap((size) => size?.dimensions || [])
    .find((item) => pattern.test(normalized(item?.name)));
  if (!row) return null;
  const first = clean(row.value).match(/\d+(?:[.,]\d+)?/);
  return first ? finite(first[0]) : null;
}

function nominalFromTitle(title) {
  const value = normalized(title);
  const patterns = [
    [/\b1 1 2 talara\b|\b1\s*½\s*talara?\b/, "1½ talara"],
    [/\bdwutalar\b|\b2 talary\b/, "Dwutalar"],
    [/\bpoltalar\b|\b1 2 talara\b/, "Półtalar"],
    [/\btalar\b/, "Talar"],
    [/\bdwudukat\b|\b2 dukaty\b/, "Dwudukat"],
    [/\bdukat\b/, "Dukat"],
    [/\bszostak\b/, "Szóstak"],
    [/\btrojak\b/, "Trojak"],
    [/\bpoltorak\b/, "Półtorak"],
    [/\bort\b/, "Ort"],
    [/\bgrosz\b/, "Grosz"],
    [/\bdenar\b/, "Denar"],
  ];
  return patterns.find(([pattern]) => pattern.test(value))?.[1] || "";
}

function mnkCandidate(record) {
  const rights = (record.copyrights || []).find(
    (item) => normalized(item?.name) === "domena publiczna" && item?.restricted === false,
  );
  if (!rights) return null;
  const authors = Array.isArray(record.authors) ? record.authors : [];
  const ruler = authors.find((item) => normalized(item?.role).includes("wladca"));
  const mint = authors.find(
    (item) =>
      normalized(item?.role).includes("mennic") ||
      normalized(item?.role).includes("wytworn") ||
      normalized(item?.name).startsWith("mennica "),
  );
  const mintName = clean(mint?.name).replace(/^Mennica\s+/i, "");
  const created = clean(record.createDates?.[0]?.name);
  const year = clean(created.match(/\b(1\d{3}|20\d{2}|9\d{2})\b/)?.[1]);
  const description = htmlText(record.description);
  const additional = Array.isArray(record.additionalImages) ? record.additionalImages : [];
  return {
    id: `mnk:${record.id}`,
    title: clean(record.title),
    objectKind: "coin",
    country: clean(record.createPlaces?.[0]?.hierarchy || record.createPlaces?.[0]?.name || "Polska"),
    ruler: clean(ruler?.name),
    year,
    nominal: nominalFromTitle(record.title),
    metal: clean(record.materials?.[0]?.name),
    mint: mintName,
    shape: normalized(record.title).includes("klipa") ? "square-klippe" : "round",
    weightGrams: dimension(record, /^waga$/),
    diameterMm: dimension(record, /^srednica$/),
    portrait: description.slice(0, 300),
    obverseLegend: description.match(/Awers:(.*?)(?:Rewers:|$)/i)?.[1]?.trim().slice(0, 260) || "",
    reverseLegend: description.match(/Rewers:(.*)$/i)?.[1]?.trim().slice(0, 260) || "",
    diagnosticMarkers: [],
    images: [mnkImageUrl(record.image), ...additional.slice(0, 1).map(mnkImageUrl)].filter(Boolean),
    sourceType: "museum",
    sourceName: "Muzeum Narodowe w Krakowie",
    sourceReference: clean(record.noEvidence),
    sourceUrl: `https://zbiory.mnk.pl/pl/katalog/${record.id}`,
    rights: rights.name,
  };
}

function mnkSearchCandidate(record) {
  const authors = Array.isArray(record.authors) ? record.authors : [];
  const ruler = authors.find((item) => normalized(item?.role).includes("wladca"));
  const mint = authors.find(
    (item) =>
      normalized(item?.role).includes("mennic") ||
      normalized(item?.role).includes("wytworn") ||
      normalized(item?.name).startsWith("mennica "),
  );
  const created = clean(record.createDates?.[0]?.name);
  return {
    id: `mnk:${record.id}`,
    title: clean(record.title),
    ruler: clean(ruler?.name),
    year: clean(created.match(/\b(1\d{3}|20\d{2}|9\d{2})\b/)?.[1]),
    nominal: nominalFromTitle(record.title),
    metal: clean(record.materials?.[0]?.name),
    mint: clean(mint?.name).replace(/^Mennica\s+/i, ""),
    shape: normalized(record.title).includes("klipa") ? "square-klippe" : "round",
    rawId: record.id,
  };
}

function evidenceQuery(observations = {}) {
  const ruler = clean(observations.rulerReading);
  const year = clean(observations.yearReading);
  const mint = clean(observations.mintReading);
  const nominal = clean(observations.denominationReading);
  const useful = [ruler, year, mint].filter((value) => !unknownObservation(value));
  if (useful.length < 2 && !unknownObservation(nominal)) useful.push(nominal);
  return useful.length >= 2 ? useful.join(" ") : "";
}

export async function searchMnkByEvidence(observations) {
  const phrase = evidenceQuery(observations);
  if (!phrase) return { available: true, candidates: [], reason: "insufficient-evidence" };
  const cacheKey = normalized(phrase);
  const cached = mnkCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 24 * 60 * 60_000) return cached.value;
  try {
    const search = await fetchJson(
      `${MNK_BASE_URL}/api/query/page/1?maxPerPage=12&sort=score`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phrase }),
      },
      MNK_TIMEOUT_MS,
    );
    const items = Array.isArray(search?.data?.items) ? search.data.items.slice(0, 12) : [];
    const preliminary = rankEvidenceCandidates(
      observations,
      items.map(mnkSearchCandidate),
    ).ranked.slice(0, 3);
    const details = await Promise.all(
      preliminary.map((item) =>
        fetchJson(`${MNK_BASE_URL}/api/object/${item.candidate.rawId}`, {}, MNK_TIMEOUT_MS)
          .then((payload) => payload?.data || null)
          .catch(() => null),
      ),
    );
    const value = {
      available: true,
      candidates: details.map(mnkCandidate).filter(Boolean),
      reason: details.length ? "ok" : "no-results",
      phrase,
    };
    mnkCache.set(cacheKey, { at: Date.now(), value });
    return value;
  } catch (error) {
    return {
      available: true,
      candidates: [],
      reason: error?.name === "AbortError" ? "timeout" : `error-${error?.status || "unknown"}`,
      phrase,
    };
  }
}

const DIAGNOSTIC_STOPWORDS = new Set([
  "albo",
  "brak",
  "dwa",
  "fragment",
  "herb",
  "moneta",
  "nie",
  "odczyt",
  "okolo",
  "oraz",
  "pod",
  "stronie",
  "widoczne",
  "widoczny",
]);

function diagnosticToken(value) {
  if (/^gedan\w*$|^gdan\w*$/.test(value)) return "gdansk";
  if (/^stephan\w*$|^stefan\w*$/.test(value)) return "stefan";
  if (/^koron\w*$/.test(value)) return "korona";
  if (/^krzyz\w*$/.test(value)) return "krzyz";
  if (/^lw\w*$|^lew\w*$/.test(value)) return "lew";
  if (/^tarcz\w*$/.test(value)) return "tarcza";
  if (/^dukat\w*$/.test(value)) return "dukat";
  if (/^zlot\w*$|^zoltozlot\w*$|^gold\w*$/.test(value)) return "zloto";
  return value;
}

function diagnosticTokens(values) {
  const text = (Array.isArray(values) ? values.flat(Infinity) : [values])
    .map(clean)
    .filter(Boolean)
    .join(" ");
  return new Set(
    normalized(text)
      .split(/\s+/)
      .map(diagnosticToken)
      .filter(
        (token) => (token.length >= 4 || token === "lew") && !DIAGNOSTIC_STOPWORDS.has(token),
      ),
  );
}

function diagnosticFit(observations, candidate) {
  const observed = diagnosticTokens([
    observations?.portrait,
    observations?.heraldry,
    observations?.mintMarks,
    observations?.obverseLegendFragments,
    observations?.reverseLegendFragments,
    observations?.mintReading,
    observations?.metalAppearance,
  ]);
  const expected = diagnosticTokens([
    candidate?.portrait,
    candidate?.obverseLegend,
    candidate?.reverseLegend,
    candidate?.diagnosticMarkers,
    candidate?.mint,
    candidate?.metal,
  ]);
  const strong = new Set(["stefan", "gdansk", "krzyz", "lew", "dukat", "zloto"]);
  const matches = [...observed].filter((token) => expected.has(token));
  const points = Math.min(
    24,
    matches.reduce((sum, token) => sum + (strong.has(token) ? 6 : 3), 0),
  );
  return { points, matches };
}

function rankOne(observations, candidate, inputMeasurements = {}) {
  let score = 0;
  const reasons = [];
  const hardConflicts = [];
  const measurements = normalizeMeasurements(inputMeasurements);
  const fields = [
    ["rulerReading", "ruler", 25, sameRuler],
    ["yearReading", "year", 20, sameYear],
    ["denominationReading", "nominal", 25, sameNominal],
    ["mintReading", "mint", 20, sameMint],
    ["metalAppearance", "metal", 5, sameMetal],
    ["shape", "shape", 5, sameShape],
  ];
  for (const [observedKey, candidateKey, points, comparator] of fields) {
    const observed = clean(observations?.[observedKey]);
    const expected = clean(candidate?.[candidateKey]);
    if (unknownObservation(observed) || !expected) continue;
    if (comparator(observed, expected)) {
      score += points;
      reasons.push(`${observedKey}: ${observed}`);
    } else if (observedKey === "rulerReading") {
      score -= 40;
      hardConflicts.push(`Odczyt władcy „${observed}” nie pasuje do „${expected}”.`);
    } else if (["yearReading", "denominationReading", "mintReading"].includes(observedKey)) {
      score -= Math.round(points * 0.8);
    }
  }
  const diagnostic = diagnosticFit(observations, candidate);
  if (diagnostic.points) {
    score += diagnostic.points;
    reasons.push(`cechy diagnostyczne: ${diagnostic.matches.join(", ")}`);
  }
  const weightConflict = measurementConflict(
    measurements.weightGrams,
    candidate.weightGrams,
    "weight",
  );
  if (weightConflict) {
    score -= 50;
    hardConflicts.push(weightConflict);
  } else if (measurements.weightGrams && candidate.weightGrams) {
    score += 35;
    reasons.push(`masa: ${measurements.weightGrams} g`);
  }
  const diameterConflict = measurementConflict(
    measurements.diameterMm,
    candidate.diameterMm,
    "diameter",
  );
  if (diameterConflict) {
    score -= 20;
    hardConflicts.push(diameterConflict);
  } else if (measurements.diameterMm && candidate.diameterMm) {
    score += 12;
    reasons.push(`średnica: ${measurements.diameterMm} mm`);
  }
  if (Number.isFinite(candidate.similarityDistance)) {
    if (candidate.similarityDistance <= 0.28) score += 30;
    else if (candidate.similarityDistance <= 0.4) score += 20;
    else if (candidate.similarityDistance <= 0.5) score += 8;
    else score -= 15;
  }
  return { candidate, score, reasons, hardConflicts };
}

export function rankEvidenceCandidates(observations, candidates, inputMeasurements = {}) {
  const checkedObservations = {
    ...(observations || {}),
    rulerReading: unknownObservation(observations?.rulerReading)
      ? clean(observations?.obverseLegendFragments?.join(" "))
      : observations?.rulerReading,
  };
  const ranked = (candidates || [])
    .map((candidate) => rankOne(checkedObservations, candidate, inputMeasurements))
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title, "pl"));
  const best = ranked[0];
  const gap = best ? best.score - (ranked[1]?.score ?? 0) : 0;
  const selected =
    best &&
    best.score >= 65 &&
    best.hardConflicts.length === 0 &&
    (gap >= 12 || best.score >= 90)
      ? best
      : null;
  return { selected, ranked, gap };
}

function compactCandidate(candidate) {
  return {
    id: candidate.id,
    title: candidate.title,
    country: candidate.country || "",
    ruler: candidate.ruler || "",
    year: candidate.year || "",
    yearRange: candidate.yearRange || null,
    nominal: candidate.nominal || "",
    metal: candidate.metal || "",
    mint: candidate.mint || "",
    shape: candidate.shape || "",
    weightGrams: candidate.weightGrams || null,
    diameterMm: candidate.diameterMm || null,
    portrait: clean(candidate.portrait).slice(0, 240),
    obverseLegend: clean(candidate.obverseLegend).slice(0, 240),
    reverseLegend: clean(candidate.reverseLegend).slice(0, 240),
    diagnosticMarkers: (candidate.diagnosticMarkers || []).slice(0, 8),
    source: `${candidate.sourceName} ${candidate.sourceReference || ""}`.trim(),
    similarityDistance: Number.isFinite(candidate.similarityDistance)
      ? candidate.similarityDistance
      : null,
  };
}

export function candidatePrompt(candidates) {
  return JSON.stringify((candidates || []).slice(0, 12).map(compactCandidate));
}

function same(value, expected) {
  const a = normalized(value);
  const b = normalized(expected);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
}

function canonicalRuler(value) {
  const ruler = normalized(value);
  if (/\b(stephan\w*|stefan)\b/.test(ruler)) return "stefan batory";
  if (/\b(ioan\w*|johann\w*|jan)\b/.test(ruler) && /\b(casim\w*|kazim\w*)\b/.test(ruler)) {
    return "jan kazimierz";
  }
  if (/\b(sigism\w*|zygmunt)\b/.test(ruler) && /\b(iii|3|waza)\b/.test(ruler)) {
    return "zygmunt iii waza";
  }
  if (/\b(sigismund\w*|zygmunt)\b/.test(ruler) && /\b(august\w*)\b/.test(ruler)) {
    return "zygmunt august";
  }
  if (/\b(sigism\w*|zygmunt)\b/.test(ruler) && /\b(i|1|stary)\b/.test(ruler)) {
    return "zygmunt i stary";
  }
  if (/\b(ladisla\w*|vladisla\w*|wladyslaw)\b/.test(ruler) && /\b(iv|4|waza)\b/.test(ruler)) {
    return "wladyslaw iv waza";
  }
  if (/\b(ioan\w*|johann\w*|jan)\b/.test(ruler) && /\b(iii|3|sobies\w*)\b/.test(ruler)) {
    return "jan iii sobieski";
  }
  if (/\b(stanisla\w*)\b/.test(ruler) && /\b(august\w*|poniatow\w*)\b/.test(ruler)) {
    return "stanislaw august poniatowski";
  }
  if (/\b(august\w*)\b/.test(ruler) && /\b(ii|2|mocn\w*)\b/.test(ruler)) {
    return "august ii mocny";
  }
  if (/\b(august\w*)\b/.test(ruler) && /\b(iii|3|sas\w*)\b/.test(ruler)) {
    return "august iii sas";
  }
  if (/\b(casimir\w*|kazimierz)\b/.test(ruler) && /\b(iii|3|wielk\w*)\b/.test(ruler)) {
    return "kazimierz iii wielki";
  }
  if (/\b(wladyslaw)\b/.test(ruler) && /\b(jagiell\w*|jagie\w*)\b/.test(ruler)) {
    return "wladyslaw jagiello";
  }
  if (/\b(rzeczpospolit\w*|narodowy bank polski|nbp|polska)\b/.test(ruler)) return "polska";
  return ruler;
}

function sameRuler(value, expected) {
  return same(canonicalRuler(value), canonicalRuler(expected));
}

function canonicalMetal(value) {
  const metal = normalized(value);
  if (/\b(zloto\w*|zoltozlot\w*|gold\w*)\b/.test(metal)) return "zloto";
  if (/\b(srebro\w*|srebr\w*|silver\w*)\b/.test(metal)) return "srebro";
  return metal;
}

function sameMetal(value, expected) {
  return same(canonicalMetal(value), canonicalMetal(expected));
}

function canonicalMint(value) {
  const mint = normalized(value);
  if (/\b(elbingensis|elbing|elblag)\b/.test(mint)) return "elblag";
  if (/\b(gedan\w*|danzig|gdansk)\b/.test(mint)) return "gdansk";
  if (/\b(bromberg|bidgost|bydgoszcz)\b/.test(mint)) return "bydgoszcz";
  if (/\b(cracov|krakow)\b/.test(mint)) return "krakow";
  if (/\b(warszaw|warsaw|varsav)\b/.test(mint)) return "warszawa";
  if (/\b(thorn|torun)\b/.test(mint)) return "torun";
  if (/\b(viln\w*|wiln\w*)\b/.test(mint)) return "wilno";
  if (/\b(riga|ryga)\b/.test(mint)) return "ryga";
  if (/\b(posen|poznan)\b/.test(mint)) return "poznan";
  if (/\b(fraustadt|wschowa)\b/.test(mint)) return "wschowa";
  if (/\b(olkusz)\b/.test(mint)) return "olkusz";
  if (/\b(leopol\w*|lwow)\b/.test(mint)) return "lwow";
  if (/\b(marienburg|malbork)\b/.test(mint)) return "malbork";
  if (/\b(leipzig|lipsk)\b/.test(mint)) return "lipsk";
  if (/\b(berlin)\b/.test(mint)) return "berlin";
  if (/\b(kings norton)\b/.test(mint)) return "kings norton";
  return mint;
}

function sameMint(value, expected) {
  return same(canonicalMint(value), canonicalMint(expected));
}

function canonicalShape(value) {
  const shape = normalized(value);
  if (/\b(klip|klipa|klippe|square|kwadrat)/.test(shape)) return "square-klippe";
  if (/\b(round|circular|okrag)/.test(shape)) return "round";
  return shape;
}

function sameShape(value, expected) {
  return canonicalShape(value) === canonicalShape(expected);
}

function sameNominal(value, expected) {
  const aliases = (input) => {
    const nominal = normalized(input)
      .replace(/\bpolgrosz\w*\b|\bpol grosz\w*\b/g, "½ grosz")
      .replace(/\b(trojak\w*|trojk\w*|trzy grosz\w*)\b/g, "3 grosz")
      .replace(/\b(czworak\w*|czwork\w*|cztery grosz\w*)\b/g, "4 grosz")
      .replace(/\b(szostak\w*|szostk\w*|szesc grosz\w*)\b/g, "6 grosz")
      .replace(/\bpol kopiej\w*\b/g, "½ kopiejka")
      .replace(/\btrzy kopiej\w*\b/g, "3 kopiejka")
      .replace(/\bpiec kopiej\w*\b/g, "5 kopiejka")
      .replace(/dwu talar/g, "dwutalar")
      .replace(/\b2 talar\w*\b/g, "dwutalar")
      .replace(/1 1 2 talar/g, "poltora talara")
      .replace(/1\s*½\s*talara?/g, "poltora talara")
      .replace(/poltalar/g, "pol talara")
      .replace(/\bzl(?:oty|ote|otych)?\b/g, "zloty")
      .replace(/\bzlot(?:y|e|ych)\b/g, "zloty")
      .replace(/\bgr(?:osz|osze|oszy)?\b/g, "grosz")
      .replace(/\bgrosz(?:e|y)?\b/g, "grosz")
      .replace(/\bfenig\w*\b/g, "fenig")
      .replace(/\bkopiej\w*\b/g, "kopiejka")
      .replace(/\bmark(?:a|i|ek)?\b/g, "marka")
      .replace(/\brubl(?:a|e|i)?\b|\brubel\b/g, "rubel")
      .replace(/^grosz$/, "1 grosz")
      .replace(/^szelag$/, "1 szelag")
      .replace(/^kopiejka$/, "1 kopiejka")
      .replace(/^fenig$/, "1 fenig")
      .replace(/^marka$/, "1 marka")
      .replace(/^rubel$/, "1 rubel")
      .replace(/\s+/g, " ")
      .trim();
    return nominal;
  };
  return aliases(value) === aliases(expected);
}

function numericYear(value) {
  const match = clean(value).match(/\b(1\d{3}|20\d{2}|9\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function sameYear(value, expected) {
  const referenceYears = [...clean(expected).matchAll(/\b(1\d{3}|20\d{2}|9\d{2})\b/g)].map(
    (match) => Number(match[1]),
  );
  const referenceYear = referenceYears[0] || numericYear(expected);
  if (!referenceYear) return false;
  const observedYears = [...clean(value).matchAll(/\b(1\d{3}|20\d{2}|9\d{2})\b/g)].map(
    (match) => Number(match[1]),
  );
  const range = referenceYears.length >= 2
    ? [Math.min(referenceYears[0], referenceYears[1]), Math.max(referenceYears[0], referenceYears[1])]
    : null;
  if (
    observedYears.some((year) =>
      range ? year >= range[0] && year <= range[1] : year === referenceYear,
    )
  ) return true;
  const observation = normalized(value);
  const explicitlyPartial = /\b(koncow\w*|ostatn\w*|fragment\w*|dwie cyfry|cyfry)\b/.test(
    observation,
  );
  if (!explicitlyPartial || referenceYear < 1000) return false;
  const suffixes = [...observation.matchAll(/\b(\d{2})\b/g)].map((match) => Number(match[1]));
  return suffixes.includes(referenceYear % 100);
}

function measurementConflict(measured, reference, kind) {
  if (!measured || !reference) return null;
  const tolerance = kind === "weight" ? Math.max(0.8, reference * 0.08) : Math.max(2, reference * 0.1);
  if (Math.abs(measured - reference) <= tolerance) return null;
  const unit = kind === "weight" ? "g" : "mm";
  const label = kind === "weight" ? "Masa" : "Średnica";
  return `${label} ${measured} ${unit} nie pasuje do wartości referencyjnej ${reference} ${unit}.`;
}

function unresolvedByMeasurement(selected, candidates, measurements) {
  if (measurements.weightGrams) return null;
  const rival = candidates.find(
    (candidate) =>
      candidate.id !== selected.id &&
      candidate.weightGrams &&
      selected.weightGrams &&
      sameRuler(candidate.ruler, selected.ruler) &&
      candidate.year === selected.year &&
      sameMint(candidate.mint, selected.mint) &&
      sameShape(candidate.shape, selected.shape) &&
      !sameNominal(candidate.nominal, selected.nominal),
  );
  if (!rival) return null;
  return {
    rival,
    question: `Podaj masę monety w gramach. ${selected.nominal} (${selected.weightGrams} g) i ${rival.nominal} (${rival.weightGrams} g) mają bardzo zbliżony układ stempli.`,
  };
}

const PARTIAL_FIELD_RULES = Object.freeze({
  country: { observation: null, comparator: (value, expected) => normalized(value) === normalized(expected) },
  ruler: { observation: "rulerReading", comparator: sameRuler },
  year: { observation: "yearReading", comparator: sameYear, requireCompleteConsensus: true },
  nominal: {
    observation: "denominationReading",
    comparator: sameNominal,
    requireCompleteConsensus: true,
    requireVisibleEvidence: true,
  },
  mint: { observation: "mintReading", comparator: sameMint },
  objectKind: { observation: null, comparator: (value, expected) => normalized(value) === normalized(expected) },
});

function candidateConsensusValue(field, candidates, rule) {
  const plausible = (candidates || []).slice(0, 3);
  if (plausible.length < 2) return "";
  const values = plausible.map((candidate) => clean(candidate?.[field])).filter(Boolean);
  if (values.length < 2) return "";
  if (rule.requireCompleteConsensus && values.length !== plausible.length) return "";
  const first = values[0];
  return values.every((value) => rule.comparator(value, first)) ? first : "";
}

function partialIdentityFromEvidence({
  selected,
  candidates,
  observations,
  support = [],
  confidence = 0,
  blockedFields = [],
}) {
  const plausible = [selected, ...(candidates || [])]
    .filter(Boolean)
    .filter((candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index)
    .slice(0, 3);
  const blocked = new Set(blockedFields);
  const supportKeys = new Set(
    support.map((entry) => clean(entry).split(":", 1)[0]).filter(Boolean),
  );
  const values = {};
  const fieldConfidence = {};
  const basis = {};

  for (const [field, rule] of Object.entries(PARTIAL_FIELD_RULES)) {
    if (blocked.has(field)) continue;
    const reference = selected || plausible[0] || null;
    const observed = rule.observation ? clean(observations?.[rule.observation]) : "";
    const directlySupported = Boolean(
      reference &&
      rule.observation &&
      !unknownObservation(observed) &&
      clean(reference[field]) &&
      rule.comparator(observed, reference[field]) &&
      (supportKeys.has(rule.observation) || !selected),
    );
    if (directlySupported) {
      values[field] = clean(reference[field]);
      fieldConfidence[field] = Math.min(69, Math.max(58, confidence));
      basis[field] = "visible-evidence";
      continue;
    }
    const consensus = rule.requireVisibleEvidence
      ? ""
      : candidateConsensusValue(field, plausible, rule);
    if (consensus) {
      values[field] = consensus;
      fieldConfidence[field] = Math.min(64, Math.max(52, confidence));
      basis[field] = "candidate-consensus";
    }
  }

  return {
    ...values,
    fieldConfidence,
    basis,
    populatedFields: Object.keys(values),
  };
}

export function adjudicateRecognition(raw, candidates, inputMeasurements = {}) {
  const measurements = normalizeMeasurements(inputMeasurements);
  const observations = raw?.observations || {};
  const checkedObservations = {
    ...observations,
    rulerReading: unknownObservation(observations.rulerReading)
      ? clean(observations.obverseLegendFragments?.join(" "))
      : observations.rulerReading,
  };
  const decision = raw?.decision || {};
  const selected = (candidates || []).find((candidate) => candidate.id === clean(decision.selectedCandidateId));
  const evidenceRanking = rankEvidenceCandidates(observations, candidates, measurements);
  const compatibleCandidates = evidenceRanking.ranked
    .filter((item) => item.score >= 35 && item.hardConflicts.length === 0)
    .map((item) => item.candidate);
  const modelCautions = [
    ...new Set(
      (Array.isArray(decision.contradictions) ? decision.contradictions : [])
        .map(clean)
        .filter(Boolean),
    ),
  ];
  // Free-form model comments are useful review notes, but the deterministic
  // gate must validate contradictions against structured fields and measures.
  const contradictions = [];
  const support = [];
  let score = 0;

  if (!selected) {
    const partialIdentity = partialIdentityFromEvidence({
      selected: null,
      candidates: compatibleCandidates,
      observations: checkedObservations,
    });
    return {
      status: "unresolved",
      confidence: 0,
      selected: null,
      observations,
      contradictions: ["Brak kandydata katalogowego spełniającego widoczne cechy."],
      cautionNotes: modelCautions,
      followUpQuestions: compatibleCandidates.length
        ? ["Podaj średnicę i możliwie dokładny odczyt legendy, aby rozstrzygnąć najbliższe zgodne pozycje."]
        : ["Nie znaleziono zgodnej pozycji w aktualnie podłączonych katalogach. Podaj średnicę i wyraźny odczyt legendy; APOMONET nie będzie zgadywać."],
      measurements,
      candidates: publicCandidates(compatibleCandidates, null),
      partialIdentity,
    };
  }

  score += selected.sourceType === "museum" ? 18 : selected.sourceType === "curated-fact" ? 15 : 12;
  const fit = Math.max(0, Math.min(100, Number(decision.candidateFit) || 0));
  score += Math.round(fit * 0.2);

  const checks = [
    ["rulerReading", "ruler", 14, sameRuler],
    ["yearReading", "year", 15, sameYear],
    ["denominationReading", "nominal", 16, sameNominal],
    ["mintReading", "mint", 10, sameMint],
    ["shape", "shape", 7, sameShape],
  ];
  for (const [observedKey, candidateKey, points, comparator] of checks) {
    const observed = clean(checkedObservations[observedKey]);
    const expected = clean(selected[candidateKey]);
    if (unknownObservation(observed) || !expected) continue;
    if (comparator(observed, expected)) {
      score += points;
      support.push(`${observedKey}: ${observed}`);
    } else {
      contradictions.push(`${observedKey} „${observed}” nie pasuje do „${expected}”.`);
    }
  }

  if (Number.isFinite(selected.similarityDistance)) {
    if (selected.similarityDistance <= 0.28) score += 20;
    else if (selected.similarityDistance <= 0.4) score += 12;
    else if (selected.similarityDistance > 0.58) {
      contradictions.push("Wyszukiwanie obrazem wskazało zbyt duży dystans podobieństwa.");
    }
  }

  const weightConflict = measurementConflict(measurements.weightGrams, selected.weightGrams, "weight");
  const diameterConflict = measurementConflict(measurements.diameterMm, selected.diameterMm, "diameter");
  if (weightConflict) contradictions.push(weightConflict);
  else if (measurements.weightGrams && selected.weightGrams) {
    score += 14;
    support.push(`masa: ${measurements.weightGrams} g`);
  }
  if (diameterConflict) contradictions.push(diameterConflict);
  else if (measurements.diameterMm && selected.diameterMm) {
    score += 6;
    support.push(`średnica: ${measurements.diameterMm} mm`);
  }

  const measurementAmbiguity = unresolvedByMeasurement(selected, candidates, measurements);
  const uniqueContradictions = [...new Set(contradictions.filter(Boolean))];
  const accepted = score >= 72 && uniqueContradictions.length === 0 && !measurementAmbiguity;
  const candidateOnly =
    !accepted &&
    score >= 48 &&
    uniqueContradictions.length <= 1 &&
    !weightConflict &&
    !diameterConflict;
  const followUpQuestions = [];
  if (measurementAmbiguity) followUpQuestions.push(measurementAmbiguity.question);
  if (weightConflict || !measurements.weightGrams) followUpQuestions.push("Zważ monetę z dokładnością co najmniej 0,1 g.");
  if (diameterConflict) followUpQuestions.push("Zmierz średnicę albo oba boki klipy.");

  const partialIdentity = partialIdentityFromEvidence({
    selected,
    candidates: compatibleCandidates,
    observations: checkedObservations,
    support,
    confidence: accepted ? Math.min(94, Math.max(72, score)) : Math.min(69, Math.max(0, score)),
    blockedFields: measurementAmbiguity ? ["nominal"] : [],
  });

  return {
    status: accepted ? "confirmed-candidate" : candidateOnly ? "candidate-only" : "unresolved",
    confidence: accepted ? Math.min(94, Math.max(72, score)) : Math.min(69, Math.max(0, score)),
    selected,
    observations,
    support,
    contradictions: uniqueContradictions,
    cautionNotes: modelCautions,
    followUpQuestions: [...new Set(followUpQuestions)].slice(0, 3),
    measurements,
    candidates: publicCandidates(compatibleCandidates, selected.id),
    partialIdentity,
  };
}

function publicCandidates(candidates, selectedId) {
  return (candidates || []).slice(0, 5).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    sourceName: candidate.sourceName,
    sourceReference: candidate.sourceReference,
    sourceUrl: candidate.sourceUrl,
    similarityDistance: Number.isFinite(candidate.similarityDistance)
      ? candidate.similarityDistance
      : null,
    selected: candidate.id === selectedId,
  }));
}

export function conditionFromRaw(raw, imageUsable = true) {
  const condition = raw?.condition || {};
  const bands = {
    unc: "Menniczy",
    au: "Około menniczy",
    xf: "Bardzo piękny",
    vf: "Piękny",
    f: "Bardzo dobry",
    vg: "Dobry",
    g: "Słaby",
    uncertain: UNKNOWN,
  };
  const code = clean(condition.band).toLowerCase();
  const confidence = imageUsable
    ? Math.min(80, Math.max(0, Number(condition.confidence) || 0))
    : 0;
  const acceptedCode = bands[code] && code !== "uncertain" && confidence >= 45 ? code : "uncertain";
  return {
    engineVersion: "condition-v1-independent",
    band: bands[acceptedCode] || UNKNOWN,
    bandCode: acceptedCode,
    confidence,
    wear: clean(condition.wear),
    strike: clean(condition.strike),
    surface: clean(condition.surface),
    damage: clean(condition.damage),
    note: "Ocena zachowania jest oddzielona od identyfikacji i nie jest gradingiem certyfikacyjnym.",
  };
}

export function analysisFromRecognition(raw, recognition, condition) {
  const confirmed = recognition.status === "confirmed-candidate";
  const candidate = confirmed ? recognition.selected : null;
  const partial = confirmed ? {} : recognition.partialIdentity || {};
  const partialFields = Array.isArray(partial.populatedFields) ? partial.populatedFields : [];
  const hasPartialIdentity = partialFields.some((field) =>
    ["country", "ruler", "year", "nominal", "mint"].includes(field),
  );
  const partialSummary = [partial.ruler, partial.nominal, partial.year, partial.mint]
    .filter(Boolean)
    .join(", ");
  const uncertaintyReasons = [
    ...recognition.contradictions,
    ...(confirmed ? [] : ["Pełna tożsamość nie przeszła jeszcze bramki dowodowej APOMONET."]),
  ].filter(Boolean);
  const summary = confirmed
    ? `Najlepsze zgodne dopasowanie katalogowe: ${candidate.title}. Źródło: ${candidate.sourceName} ${candidate.sourceReference || ""}.`
    : recognition.status === "candidate-only"
      ? `${hasPartialIdentity ? `Rozpoznanie częściowe: ${partialSummary}. ` : ""}Najbliższy kandydat to „${recognition.selected.title}”, ale brakuje cechy rozstrzygającej. APOMONET zachowuje potwierdzone pola i nie zgaduje pozostałych.`
      : hasPartialIdentity
        ? `Rozpoznanie częściowe: ${partialSummary}. Pełna tożsamość pozostaje wstrzymana do czasu rozstrzygnięcia pozostałych pól.`
        : "Brak dostatecznie zgodnego kandydata katalogowego. APOMONET wstrzymał identyfikację zamiast zgadywać.";
  return {
    imageUsable: raw.imageUsable !== false,
    imageQualityNote: clean(raw.imageQualityNote),
    title: confirmed ? candidate.title : hasPartialIdentity ? `Identyfikacja częściowa: ${partialSummary}` : UNKNOWN,
    objectKind: confirmed ? candidate.objectKind || "coin" : partial.objectKind || clean(raw.objectKind) || "uncertain",
    country: candidate?.country || partial.country || UNKNOWN,
    ruler: candidate?.ruler || partial.ruler || UNKNOWN,
    year: candidate?.year || partial.year || UNKNOWN,
    nominal: candidate?.nominal || partial.nominal || UNKNOWN,
    metal: candidate?.metal || clean(recognition.observations.metalAppearance) || UNKNOWN,
    mint: candidate?.mint || partial.mint || UNKNOWN,
    // Stage 1 confirms only the basic identity. Die/type/variant attribution
    // belongs to Stage 2 and must not be inferred from a specimen title.
    variant: UNKNOWN,
    grade: condition.band,
    confidence: recognition.confidence,
    rulerConfidence: confirmed ? recognition.confidence : partial.fieldConfidence?.ruler || 0,
    yearConfidence: confirmed ? recognition.confidence : partial.fieldConfidence?.year || 0,
    nominalConfidence: confirmed ? recognition.confidence : partial.fieldConfidence?.nominal || 0,
    summary,
    description: summary,
    fullDescription: summary,
    needsDetailedAnalysis: !confirmed || recognition.confidence < 88,
    detailRecommended: !confirmed || recognition.confidence < 88,
    uncertaintyReasons: uncertaintyReasons.slice(0, 4),
    followUpQuestions: recognition.followUpQuestions,
    warnings: [...recognition.contradictions, ...(recognition.cautionNotes || [])].slice(0, 4),
    estimateLow: 0,
    estimateHigh: 0,
    valuationCurrency: "PLN",
    valuationNote: "Wycena jest wyłączona z silnika identyfikacji.",
    ownerMeasurements: {
      weightGrams: recognition.measurements.weightGrams,
      diameterMm: recognition.measurements.diameterMm,
      edge: recognition.measurements.edge,
    },
    weight: recognition.measurements.weightGrams,
    diameter: recognition.measurements.diameterMm,
    edgeDescription: recognition.measurements.edge,
    portraitRuler: confirmed ? candidate.ruler : partial.ruler || UNKNOWN,
    portraitConfidence: confirmed ? recognition.confidence : partial.fieldConfidence?.ruler || 0,
    obverseLegend: clean(recognition.observations.obverseLegendFragments?.join(" · ")),
    reverseLegend: clean(recognition.observations.reverseLegendFragments?.join(" · ")),
    visibleDateReading: clean(recognition.observations.yearReading) || UNKNOWN,
    dateDigits: /^\d{4}$/.test(clean(candidate?.year)) ? clean(candidate.year).split("") : ["?", "?", "?", "?"],
    dateDigitConfidence: /^\d{4}$/.test(clean(candidate?.year))
      ? [recognition.confidence, recognition.confidence, recognition.confidence, recognition.confidence]
      : [0, 0, 0, 0],
    denominationEvidence: clean(recognition.observations.denominationEvidence) || "Brak jednoznacznego odczytu nominału.",
    analysisLevel: "basic",
    analysisVersion: "multi-engine-orchestrator-v1",
    recognition: {
      engineVersion: "multi-engine-orchestrator-v1",
      status: recognition.status,
      selectedCandidate: recognition.selected
        ? publicCandidates([recognition.selected], recognition.selected.id)[0]
        : null,
      candidates: recognition.candidates,
      observations: recognition.observations,
      support: recognition.support || [],
      contradictions: recognition.contradictions,
      cautionNotes: recognition.cautionNotes || [],
      measurements: recognition.measurements,
      partialIdentity: recognition.partialIdentity || null,
    },
    condition,
  };
}

export const recognitionCatalogPolicy = Object.freeze({
  schemaVersion: "apomonet-recognition-catalog-set-v2",
  recordCount: LOCAL_REFERENCE_CANDIDATES.length,
  catalogCount: LOCAL_CATALOGS.length,
  peopleRepublicRecordCount: prlCatalog.records.length,
  patternRecordCount: polishPatternCatalog.records.length,
  peopleRepublicPatternRecordCount: polishPatternCatalog.records.filter(
    (record) => record.period === "people-republic",
  ).length,
  allPatternCandidateCount: LOCAL_REFERENCE_CANDIDATES.filter(
    (record) => record.objectKind === "pattern" || record.objectKind === "pattern-coin" || record.coinClass === "pattern" || /\bprobn\w*/.test(normalized(record.title)),
  ).length,
  historicalFamilyRecordCount: LOCAL_REFERENCE_CANDIDATES.filter((record) =>
    /\b(polgrosz|grosz|szelag|kopiej|mark|trojak|trojka|czworak|czworka|szostak|szostka|poltalar|½ talar|3 gr|4 gr|6 gr)/.test(
      normalized(record.nominal),
    ),
  ).length,
  partitionRecordCount: LOCAL_REFERENCE_CANDIDATES.filter(
    (record) => record.period === "partitions-and-uprisings",
  ).length,
  historicalOpenEnrichmentCount: historicalOpenCatalog.enrichments.length,
  historicalOpenImageCount: historicalOpenCatalog.enrichments.reduce(
    (count, enrichment) => count + enrichment.images.length,
    0,
  ),
  recordsWithReferenceImages: LOCAL_REFERENCE_CANDIDATES.filter(
    (record) => Array.isArray(record.images) && record.images.length > 0,
  ).length,
  ansMetadataRecordCount: ansCatalog.records.length,
  europeanaMetadataRecordCount: europeanaCatalog.records.length,
  ikmkMetadataRecordCount: ikmkCatalog.records.length,
  czapskiPublicDomainRecordCount: czapskiCatalog.records.length,
  mnwPublicDomainRecordCount: mnwCatalog.records.length,
  factualMetadataRecordCount: LOCAL_REFERENCE_CANDIDATES.filter(
    (record) => record.source?.rightsCode === "factual-metadata-only",
  ).length,
  provenanceRequired: curatedCatalog.policy.provenanceRequired,
  numistaEndpoint: `${NUMISTA_BASE_URL}/search_by_image`,
});
