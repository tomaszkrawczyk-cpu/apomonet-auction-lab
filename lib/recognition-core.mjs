import curatedCatalog from "../data/recognition/reference-catalog-v1.json" with { type: "json" };
import nbpCatalog from "../data/recognition/nbp-official-catalog-v1.json" with { type: "json" };
import nbpEliCurrentCatalog from "../data/recognition/nbp-eli-current-catalog-v1.json" with { type: "json" };
import nbpCirculationCatalog from "../data/recognition/nbp-circulation-types-v1.json" with { type: "json" };
import historicalSaleFacts from "../data/recognition/historical-sale-facts-v1.json" with { type: "json" };
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

const thirdRepublicOpenCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/third-republic-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const ansCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/ans-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const rawEuropeanaCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/europeana-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

// Europeana providers often expose the date of cataloguing or digitisation in
// dc:date. It must not become the minting year of an old ort, tymf or floren.
// PRL and contemporary Polish issues are covered by dedicated catalogues with
// legal/issuer provenance. Europeana providers may expose a cataloguing or
// digitisation date (for example 1958 for an ancient denarius), so Europeana
// dates from 1949 onward are intentionally treated as unknown.
const europeanaCatalog = {
  ...rawEuropeanaCatalog,
  stats: {
    ...rawEuropeanaCatalog.stats,
    sanitizedModernMetadataYears: rawEuropeanaCatalog.records.filter(
      (record) => Number(record.year) >= 1949,
    ).length,
  },
  records: rawEuropeanaCatalog.records.map((record) => Number(record.year) >= 1949
    ? {
      ...record,
      title: record.title.replace(/,\s*(?:19[4-9]\d|20\d{2})(?=,|$)/, ""),
      year: "",
      sourceDateRejectedAsMintYear: record.year,
    }
    : record),
};

const ikmkCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/ikmk-polish-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

// Negative visual references are intentionally loaded through a separate
// channel. They can support a cautious "possible copy/cast" warning, but must
// never become positive identity candidates or an automatic authenticity
// verdict.
const negativeVisualCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/negative-visual-open-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const czapskiCatalog = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/czapski-public-domain-catalog-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const recognitionHierarchy = JSON.parse(
  gunzipSync(
    readFileSync(new URL("../data/recognition/recognition-hierarchy-runtime-v1.json.gz", import.meta.url)),
  ).toString("utf8"),
);

const hierarchyByRecordId = new Map(Object.entries(recognitionHierarchy.recordMap || {}));

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
  thirdRepublicOpenCatalog,
  nbpCirculationCatalog,
  nbpEliCurrentCatalog,
  nbpCatalog,
  ansCatalog,
  europeanaCatalog,
  ikmkCatalog,
  czapskiCatalog,
  historicalSaleFacts,
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

function institutionalIssuer(value) {
  const item = normalized(value);
  if (!item) return "";
  return /^(?:narodowy bank polski|bank polski|polska rzeczpospolita ludowa|rzeczpospolita polska|ii rzeczpospolita)$/.test(item)
    ? clean(value)
    : "";
}

function namedPortrait(value) {
  const item = clean(value);
  const token = normalized(item);
  if (!item || unknownObservation(item)) return "";
  if (/\b(?:portret|popiers\w*|profil|twarz|glow\w*|wizerunek|w koronie|orzel|herb|\w*postac\w*)\b/.test(token)) return "";
  return item.length <= 120 ? item : "";
}

function semanticCandidateRoles(record = {}) {
  const title = normalized(record.title);
  let country = clean(record.country);
  let mint = clean(record.mint);
  let ruler = clean(record.ruler);
  let issuer = clean(record.issuer);

  const stateIssuer = institutionalIssuer(ruler);
  if (stateIssuer) {
    issuer = issuer || stateIssuer;
    ruler = "";
  }
  if (/\bpolska rzeczpospolita ludowa\b/.test(title)) {
    country = "Polska";
    issuer = issuer || "Polska Rzeczpospolita Ludowa";
  } else if (/\brzeczpospolita polska\b/.test(title)) {
    country = "Polska";
    issuer = issuer || "Rzeczpospolita Polska";
  }
  if (/^wolne miasto krakow\b/.test(title)) {
    country = "Wolne Miasto Kraków";
    issuer = issuer || "Wolne Miasto Kraków";
    if (/\bwieden\b/.test(normalized(record.country)) && /\bwieden\b/.test(title)) mint = "Wiedeń";
  }

  return {
    country,
    issuer,
    ruler,
    mint,
    depictedPerson: namedPortrait(record.depictedPerson) || namedPortrait(record.portrait),
  };
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
  const hierarchy = hierarchyByRecordId.get(record.id) || {};
  const inferredRuler = explicitRuler(record.title);
  const enriched = {
    ...record,
    ruler: clean(record.ruler) || inferredRuler,
    ...hierarchy,
  };
  const roles = semanticCandidateRoles(enriched);
  return {
    ...enriched,
    ...roles,
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

const NEGATIVE_VISUAL_REFERENCE_CANDIDATES = Object.freeze(
  negativeVisualCatalog.records.filter((record) =>
    record?.notForPositiveIdentification === true &&
    record?.source?.rightsCode === "explicit-open-license" &&
    record?.source?.restricted === false &&
    record?.image?.url &&
    record?.image?.filePageUrl
  ),
);

export function negativeVisualReferenceCandidates() {
  return NEGATIVE_VISUAL_REFERENCE_CANDIDATES;
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
    observations?.depictedPersonReading,
    observations?.countryReading,
    observations?.issuerReading,
    observations?.periodReading,
    observations?.historicalTypeHypothesis,
    observations?.heraldry,
    observations?.mintMarks,
    observations?.obverseLegendFragments,
    observations?.reverseLegendFragments,
    observations?.mintReading,
    observations?.metalAppearance,
  ]);
  const expected = diagnosticTokens([
    candidate?.portrait,
    candidate?.depictedPerson,
    candidate?.country,
    candidate?.issuer,
    candidate?.period,
    candidate?.title,
    candidate?.obverseLegend,
    candidate?.reverseLegend,
    candidate?.diagnosticMarkers,
    candidate?.mint,
    candidate?.metal,
  ]);
  const strong = new Set([
    "stefan", "gdansk", "krzyz", "lew", "dukat", "zloto",
    "kopernik", "kosciuszko", "sobieski", "kazimierz", "ludwik",
  ]);
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
  const selectionConflicts = [];
  const measurements = normalizeMeasurements(inputMeasurements);
  const observedObjectKind = normalized(observations?.objectKind);
  const candidateObjectKind = normalized(candidate?.objectKind);
  if (
    ["coin", "pattern"].includes(observedObjectKind) &&
    ["coin", "pattern"].includes(candidateObjectKind)
  ) {
    if (observedObjectKind === candidateObjectKind) {
      score += 8;
      reasons.push(`objectKind: ${observedObjectKind}`);
    } else {
      const visibleText = normalized([
        ...(Array.isArray(observations?.obverseLegendFragments) ? observations.obverseLegendFragments : []),
        ...(Array.isArray(observations?.reverseLegendFragments) ? observations.reverseLegendFragments : []),
        ...(Array.isArray(observations?.mintMarks) ? observations.mintMarks : []),
      ].join(" "));
      if (/\b(?:proba|essai|pattern)\b/.test(visibleText)) {
        score -= 60;
        hardConflicts.push(
          `Widoczne oznaczenie emisji próbnej nie pasuje do rodzaju „${candidateObjectKind}”.`,
        );
      } else {
        // „Próba” bywa hipotezą modelu albo opisem katalogowym tego samego
        // projektu stempli. Bez widocznego napisu nie wolno nią odrzucić
        // poprawnej monety (regresja talara Jana III Sobieskiego z 1685 r.).
        score -= 6;
        reasons.push("rodzaj coin/próba wymaga potwierdzenia napisem lub metrologią");
      }
    }
  }
  const fields = [
    ["rulerReading", "ruler", 25, sameRuler],
    ["depictedPersonReading", "depictedPerson", 30, same],
    ["issuerReading", "issuer", 10, same],
    ["countryReading", "country", 8, same],
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
    } else if (observedKey === "depictedPersonReading") {
      score -= 18;
    } else if (observedKey === "yearReading" && numericYear(observed)) {
      score -= Math.round(points * 0.8);
      // Keep the record available to the independent visual comparison (OCR
      // can confuse a single digit), but never let metadata alone select it.
      selectionConflicts.push(`Odczyt roku „${observed}” nie pasuje do „${expected}”.`);
    } else if (
      observedKey === "metalAppearance" && (
        (["zloto", "srebro"].includes(canonicalMetal(observed)) &&
          ["zloto", "srebro"].includes(canonicalMetal(expected))) ||
        (canonicalMetal(observed) === "gold-tone" && canonicalMetal(expected) === "srebro") ||
        (canonicalMetal(observed) === "silver-tone" && canonicalMetal(expected) === "zloto")
      )
    ) {
      score -= 30;
      hardConflicts.push(`Metal „${observed}” nie pasuje do „${expected}”.`);
    } else if (["denominationReading", "mintReading"].includes(observedKey)) {
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
  return { candidate, score, reasons, hardConflicts, selectionConflicts };
}

export function rankEvidenceCandidates(observations, candidates, inputMeasurements = {}) {
  const checkedObservations = {
    ...(observations || {}),
    rulerReading: rulerReadingFromEvidence(observations),
    metalAppearance: metalReadingFromEvidence(observations),
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
    best.selectionConflicts.length === 0 &&
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
    issuer: candidate.issuer || "",
    ruler: candidate.ruler || "",
    depictedPerson: candidate.depictedPerson || "",
    year: candidate.year || "",
    yearRange: candidate.yearRange || null,
    period: candidate.period || candidate.periodId || "",
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

function explicitRuler(value) {
  const ruler = normalized(value);
  if (/\bboleslaw\b/.test(ruler) && /\bchrobr\w*\b/.test(ruler)) return "boleslaw chrobry";
  if (/\b(stephan\w*|stefan)\b/.test(ruler)) return "stefan batory";
  if (/\b(ioan\w*|johann\w*|jan)\b/.test(ruler) && /\b(cas|casim\w*|kazim\w*)\b/.test(ruler)) {
    return "jan kazimierz";
  }
  const sigismund = /\b(sig\w*|sigism\w*|sigmund\w*|zygmunt)\b/.test(ruler);
  if (sigismund && /\b(avg\w*|august\w*|ii|2)\b/.test(ruler)) {
    return "zygmunt august";
  }
  if (sigismund && /\b(iii|3|waza|vasa)\b/.test(ruler)) {
    return "zygmunt iii waza";
  }
  if (sigismund && /\b(i|1|stary|old)\b/.test(ruler)) {
    return "zygmunt i stary";
  }
  if (/\b(ladisla\w*|vladisla\w*|wladyslaw)\b/.test(ruler) && /\b(iv|4|waza|vasa)\b/.test(ruler)) {
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
  if (/\b(hludov\w*|hlvdov\w*|ludovic\w*|ludwik)\b/.test(ruler)) {
    return "ludwik";
  }
  return "";
}

function displayRulerFromEvidence(value) {
  const readable = normalized(value);
  if (/\bludwik\b/.test(readable) && /\bpobozn\w*\b/.test(readable)) return "Ludwik Pobożny";
  const names = {
    "boleslaw chrobry": "Bolesław Chrobry",
    "stefan batory": "Stefan Batory",
    "jan kazimierz": "Jan II Kazimierz",
    "zygmunt august": "Zygmunt II August",
    "zygmunt iii waza": "Zygmunt III Waza",
    "zygmunt i stary": "Zygmunt I Stary",
    "wladyslaw iv waza": "Władysław IV Waza",
    "jan iii sobieski": "Jan III Sobieski",
    "stanislaw august poniatowski": "Stanisław August Poniatowski",
    "august ii mocny": "August II Mocny",
    "august iii sas": "August III Sas",
    "kazimierz iii wielki": "Kazimierz III Wielki",
    "wladyslaw jagiello": "Władysław Jagiełło",
    ludwik: "Ludwik",
  };
  return names[explicitRuler(value)] || clean(value);
}

function canonicalRuler(value) {
  const ruler = normalized(value);
  return explicitRuler(ruler) || ruler;
}

function legendEvidenceText(observations = {}) {
  return clean([
    ...(Array.isArray(observations.obverseLegendFragments) ? observations.obverseLegendFragments : []),
    ...(Array.isArray(observations.reverseLegendFragments) ? observations.reverseLegendFragments : []),
    observations.obverseLegend,
    observations.reverseLegend,
  ].filter(Boolean).join(" "));
}

function rulerReadingFromEvidence(observations = {}) {
  const legend = legendEvidenceText(observations);
  const fromLegend = explicitRuler(legend);
  const reading = clean(observations.rulerReading);
  if (fromLegend) {
    const fromReading = explicitRuler(reading);
    return fromReading && fromReading === fromLegend ? reading : legend;
  }
  const year = Number(clean(observations.yearReading).match(/\b(9\d{2}|1\d{3}|20\d{2})\b/)?.[1]);
  const generic = normalized(`${reading} ${legend}`);
  if (
    /\b(?:sigis\w*|sigism\w*|sigmund\w*|zygmunt)\b/.test(generic) &&
    year >= 1548 && year <= 1572
  ) {
    return "Zygmunt II August";
  }
  // A place name or a generic reverse legend is not a ruler.  Keep the
  // observation unknown unless the legend parser found a real royal name.
  return reading;
}

function sameRuler(value, expected) {
  return same(canonicalRuler(value), canonicalRuler(expected));
}

function explicitMetal(value) {
  const metal = normalized(value);
  if (/\b(zlot(?:o|a|y|e|ych)|gold|au|avr|aure\w*)\b/.test(metal)) return "zloto";
  if (/\b(srebro|srebrna|srebrny|silver|ag|arg|argent\w*)\b/.test(metal)) return "srebro";
  return "";
}

function canonicalMetal(value) {
  const metal = normalized(value);
  if (/\b(?:bimetal\w*|dwumetal\w*)\b/.test(metal) || (/\b(?:pierscien|ring)\b/.test(metal) && /\b(?:rdzen|core)\b/.test(metal))) return "bimetal";
  const precious = explicitMetal(metal);
  if (precious) return precious;
  if (/\b(?:zlocist\w*|zlotaw\w*|zoltozlot\w*|golden\w*|yellow\w*)\b/.test(metal) || /\bzlot\w*[^.]{0,24}\bbarw\w*\b/.test(metal)) return "gold-tone";
  if (/\b(?:srebrzyst\w*|srebrnoszar\w*|silvered\w*|silvery\w*)\b/.test(metal) || /\bsrebr\w*[^.]{0,24}\bbarw\w*\b/.test(metal)) return "silver-tone";
  if (/\b(?:alupolon|aluminium|aluminum|glin)\w*\b/.test(metal)) return "aluminium";
  if (/\b(?:miedzionikiel|miedzio nikiel|cupronickel|copper nickel|cu ni)\b/.test(metal)) return "miedzionikiel";
  if (/\b(?:nikiel|nickel|ni)\b/.test(metal)) return "nikiel";
  if (/\b(?:mosiadz|brass|cu zn)\b/.test(metal)) return "mosiadz";
  if (/\b(?:braz|bronze|cu sn)\b/.test(metal)) return "braz";
  if (/\b(?:miedz|copper|cu)\b/.test(metal)) return "miedz";
  if (/\b(?:cynk|zinc|zn)\b/.test(metal)) return "cynk";
  if (/\b(?:stal|steel|zelazo|iron|fe)\b/.test(metal)) return "stal";
  if (/\b(?:olow|lead|pb)\b/.test(metal)) return "olow";
  return metal;
}

function metalReadingFromEvidence(observations = {}) {
  return clean(observations.metalAppearance);
}

function sameMetal(value, expected) {
  const observed = canonicalMetal(value);
  const reference = canonicalMetal(expected);
  if (observed === reference) return true;
  if (observed === "gold-tone") return ["zloto", "mosiadz", "braz", "bimetal"].includes(reference);
  if (observed === "silver-tone") return ["srebro", "miedzionikiel", "nikiel", "stal", "bimetal"].includes(reference);
  return false;
}

function canonicalMint(value) {
  const mint = normalized(value);
  if (/\b(elbingensis|elbing|elblag)\b/.test(mint)) return "elblag";
  if (/\b(gedan\w*|danzig|gdansk)\b/.test(mint)) return "gdansk";
  if (/\b(bromberg|bidgost|bydgoszcz)\b/.test(mint)) return "bydgoszcz";
  if (/\b(cracov|krakow)\b/.test(mint)) return "krakow";
  if (/\b(warszaw|warsaw|varsav)\b/.test(mint)) return "warszawa";
  if (/\b(thorn|thorvnia|thorvn|thorun|torun)\b/.test(mint)) return "torun";
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

function displayMintFromEvidence(value) {
  const names = {
    elblag: "Elbląg", gdansk: "Gdańsk", bydgoszcz: "Bydgoszcz",
    krakow: "Kraków", warszawa: "Warszawa", torun: "Toruń",
    wilno: "Wilno", ryga: "Ryga", poznan: "Poznań", wschowa: "Wschowa",
    olkusz: "Olkusz", lwow: "Lwów", malbork: "Malbork", lipsk: "Lipsk",
    berlin: "Berlin", "kings norton": "Kings Norton",
  };
  return names[canonicalMint(value)] || clean(value);
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
      .replace(/\bpolportugal\w*\b|\bhalf portugal\b/g, "polportugal")
      .replace(/\bportugal\w*\b/g, "portugal")
      .replace(/\b(?:dwudukat|2 dukat\w*)\b/g, "2 dukat")
      .replace(/\b(?:trzydukat|3 dukat\w*)\b/g, "3 dukat")
      .replace(/\b(?:czworodukat|4 dukat\w*)\b/g, "4 dukat")
      .replace(/\b(?:pieciodukat|5 dukat\w*)\b/g, "5 dukat")
      .replace(/\b(?:szesciodukat|6 dukat\w*)\b/g, "6 dukat")
      .replace(/\b(?:osmiodukat|8 dukat\w*)\b/g, "8 dukat")
      .replace(/\b(?:dziesieciodukat|10 dukat\w*)\b/g, "10 dukat")
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

function visibleYearForCandidate(candidate, observedValue) {
  const observed = numericYear(observedValue);
  const range = Array.isArray(candidate?.yearRange) ? candidate.yearRange.map(Number) : [];
  if (
    observed &&
    Number.isFinite(range[0]) &&
    Number.isFinite(range[1]) &&
    observed >= range[0] &&
    observed <= range[1]
  ) return String(observed);
  return clean(candidate?.year);
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
  country: { observation: "countryReading", comparator: same },
  issuer: { observation: "issuerReading", comparator: same },
  ruler: { observation: "rulerReading", comparator: sameRuler },
  depictedPerson: { observation: "depictedPersonReading", comparator: same },
  period: { observation: "periodReading", comparator: same },
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

function literalVisibleValue(field, observed, observations = {}) {
  const value = clean(observed);
  if (unknownObservation(value)) return "";
  if (field === "year") {
    const year = numericYear(value);
    return year ? String(year) : "";
  }
  if (field === "nominal" && value.length <= 64) return value;
  if (field === "ruler" && explicitRuler(value)) return displayRulerFromEvidence(value);
  if (["country", "issuer", "depictedPerson", "period", "mint"].includes(field)) {
    const evidence = Array.isArray(observations.historicalEvidence)
      ? observations.historicalEvidence.map(clean).filter(Boolean)
      : [];
    const hypothesisConfidence = Number(observations.historicalTypeConfidence) || 0;
    if (value.length <= 120 && evidence.length >= 2 && hypothesisConfidence >= 75) {
      return field === "mint" ? displayMintFromEvidence(value) : value;
    }
  }
  return "";
}

function partialIdentityFromEvidence({
  selected,
  candidates,
  observations,
  support = [],
  confidence = 0,
  candidateFit = 0,
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
    // What is literally visible on the user's object outranks every catalogue
    // candidate.  In particular, a weak or unrelated shortlist must not turn
    // Jan III into an unknown ruler, Ludwik Pobożny into another Ludwik, or a
    // clearly visible date into the reign range of the first candidate.
    if (rule.observation) {
      const literal = literalVisibleValue(field, observed, observations);
      if (literal) {
        values[field] = literal;
        fieldConfidence[field] = 58;
        basis[field] = "visible-evidence";
        continue;
      }
    }
    const directlySupported = Boolean(
      reference &&
      rule.observation &&
      !unknownObservation(observed) &&
      clean(reference[field]) &&
      rule.comparator(observed, reference[field]) &&
      (supportKeys.has(rule.observation) || !selected || candidateFit >= 80),
    );
    if (directlySupported) {
      values[field] = clean(reference[field]);
      fieldConfidence[field] = Math.min(69, Math.max(58, confidence));
      basis[field] = "visible-evidence";
      continue;
    }
    if (
      selected &&
      candidateFit >= 80 &&
      clean(reference?.[field]) &&
      !rule.requireVisibleEvidence
    ) {
      values[field] = clean(reference[field]);
      fieldConfidence[field] = Math.min(79, Math.max(65, confidence));
      basis[field] = "exact-visual-candidate";
      continue;
    }
    const consensus = rule.requireVisibleEvidence
      ? ""
      : candidateConsensusValue(field, plausible, rule);
    const observationSupportsConsensus = Boolean(
      rule.observation &&
      !unknownObservation(observed) &&
      rule.comparator(observed, consensus)
    );
    if (consensus && (selected || field === "objectKind" || observationSupportsConsensus)) {
      values[field] = consensus;
      fieldConfidence[field] = Math.min(64, Math.max(52, confidence));
      basis[field] = "candidate-consensus";
    }
  }

  return {
    ...values,
    fieldConfidence,
    basis,
    blockedFields: [...blocked],
    populatedFields: Object.keys(values),
  };
}

export function adjudicateRecognition(raw, candidates, inputMeasurements = {}) {
  const measurements = normalizeMeasurements(inputMeasurements);
  const observations = raw?.observations || {};
  const checkedObservations = {
    ...(observations || {}),
    rulerReading: rulerReadingFromEvidence(observations),
    metalAppearance: metalReadingFromEvidence(observations),
  };
  const decision = raw?.decision || {};
  const rejectedCandidateIds = new Set(
    (Array.isArray(decision.rejectedCandidateIds) ? decision.rejectedCandidateIds : [])
      .map(clean)
      .filter(Boolean),
  );
  const blockedIdentityFields = (Array.isArray(decision.blockedIdentityFields)
    ? decision.blockedIdentityFields
    : [])
    .map(clean)
    .filter((field) => Object.hasOwn(PARTIAL_FIELD_RULES, field));
  const proposedSelected = (candidates || []).find((candidate) =>
    candidate.id === clean(decision.selectedCandidateId) && !rejectedCandidateIds.has(candidate.id),
  );
  const evidenceRanking = rankEvidenceCandidates(observations, candidates, measurements);
  const proposedRanking = proposedSelected
    ? evidenceRanking.ranked.find((item) => item.candidate.id === proposedSelected.id)
    : null;
  const proposedHardConflicts = Array.isArray(proposedRanking?.hardConflicts)
    ? proposedRanking.hardConflicts
    : [];
  const proposedSelectionConflicts = Array.isArray(proposedRanking?.selectionConflicts)
    ? proposedRanking.selectionConflicts
    : [];
  const proposedBlockingConflicts = [...proposedHardConflicts, ...proposedSelectionConflicts];
  const selected = proposedRanking && proposedBlockingConflicts.length === 0
    ? proposedSelected
    : null;
  const compatibleCandidates = evidenceRanking.ranked
    .filter((item) =>
      item.score >= 35 &&
      item.hardConflicts.length === 0 &&
      !rejectedCandidateIds.has(item.candidate.id),
    )
    .map((item) => item.candidate);
  const observedObjectKind = normalized(raw?.objectKind || observations?.objectKind);
  const nonCoinKinds = new Set(["medal", "token", "zeton"]);
  const reproductionKinds = new Set(["copy", "replica", "replika", "cast", "odlew"]);
  const selectedFit = Math.max(0, Math.min(100, Number(decision.candidateFit) || 0));
  const modelContradictions = (Array.isArray(decision.contradictions) ? decision.contradictions : [])
    .map(clean)
    .filter(Boolean);
  // A photo can raise an authenticity concern, but it cannot prove that a
  // genuine-looking object is a copy. A strong, contradiction-free catalogue
  // match may therefore identify the coin type while keeping authenticity as
  // a separate caution. Medals/tokens and weak reproduction matches stay out.
  const retainsTypeDespiteAuthenticityConcern =
    reproductionKinds.has(observedObjectKind) &&
    Boolean(selected) &&
    selectedFit >= 80 &&
    modelContradictions.length === 0;
  const selectedCoinKind = normalized(selected?.objectKind);
  const visuallyVerifiedCoinType = (Array.isArray(decision.supportingFeatures)
    ? decision.supportingFeatures
    : []
  ).some((feature) => normalized(feature).startsWith("visual reference"));
  const retainsCoinTypeDespiteMedalClassification =
    nonCoinKinds.has(observedObjectKind) &&
    ["coin", "pattern", "pattern coin"].includes(selectedCoinKind) &&
    Boolean(selected) &&
    selectedFit >= 72 &&
    visuallyVerifiedCoinType &&
    proposedHardConflicts.length === 0 &&
    modelContradictions.length === 0;
  if (
    (nonCoinKinds.has(observedObjectKind) && !retainsCoinTypeDespiteMedalClassification) ||
    (reproductionKinds.has(observedObjectKind) && !retainsTypeDespiteAuthenticityConcern)
  ) {
    const cautionByKind = {
      medal: "Obiekt wygląda na medal, dlatego nie został dopasowany do pozytywnego katalogu monet.",
      token: "Obiekt wygląda na żeton, dlatego nie został dopasowany do pozytywnego katalogu monet.",
      zeton: "Obiekt wygląda na żeton, dlatego nie został dopasowany do pozytywnego katalogu monet.",
      copy: "Widoczne cechy mogą wskazywać kopię lub replikę. Zdjęcie nie pozwala potwierdzić autentyczności ani ogłosić obiektu falsyfikatem.",
      replica: "Widoczne cechy mogą wskazywać kopię lub replikę. Zdjęcie nie pozwala potwierdzić autentyczności ani ogłosić obiektu falsyfikatem.",
      replika: "Widoczne cechy mogą wskazywać kopię lub replikę. Zdjęcie nie pozwala potwierdzić autentyczności ani ogłosić obiektu falsyfikatem.",
      cast: "Widoczne cechy mogą wskazywać odlew. Zdjęcie nie pozwala potwierdzić autentyczności ani ogłosić obiektu falsyfikatem.",
      odlew: "Widoczne cechy mogą wskazywać odlew. Zdjęcie nie pozwala potwierdzić autentyczności ani ogłosić obiektu falsyfikatem.",
    };
    const visibleIdentity = partialIdentityFromEvidence({
      selected: null,
      candidates: [],
      observations: checkedObservations,
      blockedFields: blockedIdentityFields,
    });
    return {
      status: "unresolved",
      confidence: 0,
      selected: null,
      observations: checkedObservations,
      contradictions: ["Analiza pozytywna została zatrzymana przed wyborem typu monety."],
      cautionNotes: [cautionByKind[observedObjectKind]],
      followUpQuestions: ["Jeśli to ma być moneta, dodaj ostre zdjęcia awersu, rewersu i rantu oraz podaj masę i średnicę."],
      measurements,
      candidates: publicCandidates(compatibleCandidates, null),
      partialIdentity: {
        ...visibleIdentity,
        objectKind: observedObjectKind,
        fieldConfidence: {
          ...(visibleIdentity.fieldConfidence || {}),
          objectKind: 100,
        },
        basis: {
          ...(visibleIdentity.basis || {}),
          objectKind: "visual-object-class",
        },
        populatedFields: [...new Set([
          ...(visibleIdentity.populatedFields || []),
          "objectKind",
        ])],
      },
    };
  }
  const authenticityCaution = retainsTypeDespiteAuthenticityConcern
    ? "Zdjęcie może wskazywać cechy kopii lub odlewu, ale nie pozwala potwierdzić autentyczności. Dopasowanie dotyczy typu monety, nie autentyczności egzemplarza."
    : "";
  const modelCautions = [
    ...new Set(
      [...modelContradictions, authenticityCaution].filter(Boolean),
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
      blockedFields: blockedIdentityFields,
    });
    return {
      status: "unresolved",
      confidence: 0,
      selected: null,
      observations: checkedObservations,
      contradictions: proposedBlockingConflicts.length
        ? [...new Set(proposedBlockingConflicts)]
        : ["Brak kandydata katalogowego spełniającego widoczne cechy."],
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
    ["metalAppearance", "metal", 12, sameMetal],
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
    candidateFit: fit,
    blockedFields: measurementAmbiguity ? ["nominal"] : [],
  });

  return {
    status: accepted ? "confirmed-candidate" : candidateOnly ? "candidate-only" : "unresolved",
    confidence: accepted ? Math.min(94, Math.max(72, score)) : Math.min(69, Math.max(0, score)),
    selected,
    observations: checkedObservations,
    support,
    contradictions: uniqueContradictions,
    cautionNotes: modelCautions,
    followUpQuestions: [...new Set(followUpQuestions)].slice(0, 3),
    measurements,
    candidates: publicCandidates(compatibleCandidates, selected.id),
    partialIdentity,
    authenticityConcern: retainsTypeDespiteAuthenticityConcern ? observedObjectKind : "",
  };
}

function publicCandidates(candidates, selectedId) {
  return (candidates || []).slice(0, 5).map((candidate) => ({
    id: candidate.id,
    title: candidate.title,
    country: candidate.country || "",
    issuer: candidate.issuer || "",
    ruler: candidate.ruler || "",
    depictedPerson: candidate.depictedPerson || "",
    year: candidate.year || "",
    nominal: candidate.nominal || "",
    mint: candidate.mint || "",
    metal: candidate.metal || "",
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
  const confirmedYear = candidate
    ? visibleYearForCandidate(candidate, recognition.observations?.yearReading)
    : "";
  const partial = confirmed ? {} : recognition.partialIdentity || {};
  const blockedPartialFields = new Set(
    Array.isArray(partial.blockedFields) ? partial.blockedFields : [],
  );
  const partialFields = Array.isArray(partial.populatedFields) ? partial.populatedFields : [];
  const hasPartialIdentity = partialFields.some((field) =>
    ["country", "issuer", "ruler", "depictedPerson", "period", "year", "nominal", "mint"].includes(field),
  );
  const partialSummary = [...new Set(
    [partial.country, partial.ruler, partial.depictedPerson, partial.nominal, partial.year, partial.mint]
      .map(clean)
      .filter(Boolean),
  )].join(", ");
  const uncertaintyReasons = [
    ...recognition.contradictions,
    ...(confirmed ? [] : ["Pełna tożsamość nie przeszła jeszcze bramki dowodowej APOMONET."]),
  ].filter(Boolean);
  const baseSummary = confirmed
    ? `Najlepsze zgodne dopasowanie katalogowe: ${candidate.title}. Źródło: ${candidate.sourceName} ${candidate.sourceReference || ""}.`
    : recognition.status === "candidate-only"
      ? `${hasPartialIdentity ? `Rozpoznanie częściowe: ${partialSummary}. ` : ""}Najbliższy kandydat to „${recognition.selected.title}”, ale brakuje cechy rozstrzygającej. APOMONET zachowuje potwierdzone pola i nie zgaduje pozostałych.`
      : hasPartialIdentity
        ? `Rozpoznanie częściowe: ${partialSummary}. Pełna tożsamość pozostaje wstrzymana do czasu rozstrzygnięcia pozostałych pól.`
        : "Brak dostatecznie zgodnego kandydata katalogowego. APOMONET wstrzymał identyfikację zamiast zgadywać.";
  const historicalEvidence = Array.isArray(recognition.observations?.historicalEvidence)
    ? recognition.observations.historicalEvidence.map(clean).filter(Boolean).slice(0, 6)
    : [];
  const historicalTypeHypothesis = clean(
    recognition.observations?.historicalTypeHypothesis,
  );
  const historicalTypeConfidence = Math.min(
    95,
    Math.max(0, Number(recognition.observations?.historicalTypeConfidence) || 0),
  );
  const historicalHypothesis =
    !confirmed &&
    historicalTypeHypothesis &&
    !unknownObservation(historicalTypeHypothesis) &&
    historicalTypeConfidence >= 70 &&
    historicalEvidence.length >= 2
      ? {
          label: historicalTypeHypothesis,
          confidence: historicalTypeConfidence,
          evidence: historicalEvidence,
          status: "unconfirmed-iconographic-hypothesis",
        }
      : null;
  const summary = historicalHypothesis
    ? `${baseSummary} Hipoteza ikonograficzna (niepotwierdzona katalogiem): ${historicalHypothesis.label}.`
    : baseSummary;
  const candidateTitle = normalized(candidate?.title);
  const candidateMint = clean(candidate?.mint);
  const municipalIssuer =
    candidate &&
    candidateMint &&
    candidateTitle.includes(normalized(candidateMint)) &&
    /oblez|siege|donatyw|miast|civitat|stadt|city/.test(candidateTitle)
      ? candidateMint
      : "";
  const portraitReading = clean(recognition.observations.portrait);
  const normalizedPortrait = normalized(portraitReading);
  const directlyReadPerson = clean(recognition.observations.depictedPersonReading);
  const explicitlyNoDepictedPerson = /\b(?:brak|bez) (?:przedstawienia )?(?:konkretnej )?(?:osoby|postaci|portretu)\b|\bnie (?:ma|widac|przedstawia) (?:osoby|postaci|portretu)\b/.test(
    normalized(directlyReadPerson),
  );
  const portraitShowsPerson =
    /popiers|portret|profil|twarz|glow|bust|portrait|head|kopf/.test(normalizedPortrait) &&
    !/\b(?:brak|bez|nie ma|nie widac|nie przedstawia)\b/.test(normalizedPortrait);
  const depictedPerson = explicitlyNoDepictedPerson
    ? "Nie dotyczy — brak przedstawienia osoby"
    : !unknownObservation(directlyReadPerson)
    ? directlyReadPerson
    : candidate?.depictedPerson || partial.depictedPerson || (/chryst|christ|salvator|jezus|jesus/.test(normalizedPortrait)
    ? "Chrystus"
    : portraitShowsPerson
      ? candidate?.ruler || partial.ruler || ""
      : "");
  const issuer = municipalIssuer || candidate?.issuer || partial.issuer || (
    (candidate?.ruler || partial.ruler) ? candidate?.country || partial.country || "" : ""
  );
  const sovereignlessIssue = Boolean(
    municipalIssuer || institutionalIssuer(issuer) ||
    (!candidate?.ruler && !partial.ruler && /wolne miasto|emisja miejska/.test(normalized(issuer))),
  );
  const ruler = candidate?.ruler || partial.ruler || (
    sovereignlessIssue
      ? municipalIssuer || /wolne miasto|miejska/.test(normalized(issuer))
        ? "Nie dotyczy — emisja miejska"
        : "Nie dotyczy — emisja państwowa"
      : ""
  );
  return {
    imageUsable: raw.imageUsable !== false,
    imageQualityNote: clean(raw.imageQualityNote),
    title: confirmed ? candidate.title : hasPartialIdentity ? `Identyfikacja częściowa: ${partialSummary}` : UNKNOWN,
    objectKind: confirmed ? candidate.objectKind || "coin" : partial.objectKind || clean(raw.objectKind) || "uncertain",
    country: candidate?.country || partial.country || UNKNOWN,
    issuer: issuer || UNKNOWN,
    ruler: ruler || UNKNOWN,
    depictedPerson: depictedPerson || UNKNOWN,
    year: confirmedYear || partial.year || UNKNOWN,
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
    portraitRuler: ruler || UNKNOWN,
    portraitConfidence: confirmed ? recognition.confidence : partial.fieldConfidence?.ruler || 0,
    obverseLegend: clean(recognition.observations.obverseLegendFragments?.join(" · ")),
    reverseLegend: clean(recognition.observations.reverseLegendFragments?.join(" · ")),
    visibleDateReading: blockedPartialFields.has("year")
      ? UNKNOWN
      : clean(recognition.observations.yearReading) || UNKNOWN,
    dateDigits: /^\d{4}$/.test(confirmedYear) ? confirmedYear.split("") : ["?", "?", "?", "?"],
    dateDigitConfidence: /^\d{4}$/.test(confirmedYear)
      ? [recognition.confidence, recognition.confidence, recognition.confidence, recognition.confidence]
      : [0, 0, 0, 0],
    denominationEvidence: clean(recognition.observations.denominationEvidence) || "Brak jednoznacznego odczytu nominału.",
    historicalHypothesis,
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
      authenticityConcern: recognition.authenticityConcern || "",
      measurements: recognition.measurements,
      partialIdentity: recognition.partialIdentity || null,
      historicalHypothesis,
    },
    condition,
  };
}

export const recognitionCatalogPolicy = Object.freeze({
  schemaVersion: "apomonet-recognition-catalog-set-v2",
  recordCount: LOCAL_REFERENCE_CANDIDATES.length,
  catalogCount: LOCAL_CATALOGS.length,
  peopleRepublicRecordCount: prlCatalog.records.length,
  thirdRepublicOpenRecordCount: thirdRepublicOpenCatalog.records.length,
  standardCirculationTypeRecordCount: nbpCirculationCatalog.records.length,
  commemorativeTwoZlotyRecordCount: thirdRepublicOpenCatalog.records.filter(
    (record) => record.coinClass === "circulating-commemorative" && record.nominal === "2 zł",
  ).length,
  discoverPolandFiveZlotyRecordCount: thirdRepublicOpenCatalog.records.filter(
    (record) => record.coinClass === "circulating-commemorative" && record.nominal === "5 zł",
  ).length,
  bullionBielikRecordCount: thirdRepublicOpenCatalog.records.filter(
    (record) => record.coinClass === "bullion",
  ).length,
  currentPolishIssueRecordCount: nbpEliCurrentCatalog.records.length + nbpCatalog.records.length,
  currentPolishIssueYears: [...new Set([
    ...nbpEliCurrentCatalog.records,
    ...nbpCatalog.records,
  ].map((record) => record.year))].sort(),
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
  negativeVisualReferenceCount: NEGATIVE_VISUAL_REFERENCE_CANDIDATES.length,
  negativeVisualPairedGroupCount: negativeVisualCatalog.stats.pairedGroups,
  czapskiPublicDomainRecordCount: czapskiCatalog.records.length,
  historicalSaleFactRecordCount: historicalSaleFacts.records.length,
  hierarchyVersion: recognitionHierarchy.schemaVersion,
  hierarchyCoinTypeCount: recognitionHierarchy.stats.coinTypes,
  hierarchyIssueCount: recognitionHierarchy.stats.issues,
  hierarchyVarietyCount: recognitionHierarchy.stats.varieties,
  hierarchySpecimenCount: recognitionHierarchy.stats.specimens,
  hierarchyMultiSourceIssueCount: recognitionHierarchy.stats.multiSourceIssues,
  hierarchyReviewFlaggedCoinTypeCount: recognitionHierarchy.stats.reviewFlaggedCoinTypes,
  mnwPublicDomainRecordCount: mnwCatalog.records.length,
  factualMetadataRecordCount: LOCAL_REFERENCE_CANDIDATES.filter(
    (record) => record.source?.rightsCode === "factual-metadata-only",
  ).length,
  provenanceRequired: curatedCatalog.policy.provenanceRequired,
  numistaEndpoint: `${NUMISTA_BASE_URL}/search_by_image`,
});
