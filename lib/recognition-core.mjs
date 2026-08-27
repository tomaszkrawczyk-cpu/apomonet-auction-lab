import catalog from "../data/recognition/reference-catalog-v1.json" with { type: "json" };

const NUMISTA_BASE_URL = "https://api.numista.com/v3";
const NUMISTA_TIMEOUT_MS = 8_000;
const MNK_BASE_URL = "https://api-zbiory.mnk.pl";
const MNK_TIMEOUT_MS = 8_000;
const UNKNOWN = "Nie ustalono";
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
  if (!catalog.policy.acceptedRights.includes(record.source.rightsCode)) return null;
  return {
    ...record,
    sourceType: "museum",
    sourceName: record.source.name,
    sourceReference: record.source.recordId,
    sourceUrl: record.source.url,
    rights: record.source.rights,
  };
}

export function localReferenceCandidates() {
  return catalog.records.map(publicLocalRecord).filter(Boolean);
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

function rankOne(observations, candidate) {
  let score = 0;
  const reasons = [];
  const fields = [
    ["rulerReading", "ruler", 25, same],
    ["yearReading", "year", 20, sameYear],
    ["denominationReading", "nominal", 25, sameNominal],
    ["mintReading", "mint", 20, sameMint],
    ["metalAppearance", "metal", 5, same],
    ["shape", "shape", 5, sameShape],
  ];
  for (const [observedKey, candidateKey, points, comparator] of fields) {
    const observed = clean(observations?.[observedKey]);
    const expected = clean(candidate?.[candidateKey]);
    if (unknownObservation(observed) || !expected) continue;
    if (comparator(observed, expected)) {
      score += points;
      reasons.push(`${observedKey}: ${observed}`);
    } else if (["yearReading", "denominationReading", "mintReading"].includes(observedKey)) {
      score -= Math.round(points * 0.8);
    }
  }
  if (Number.isFinite(candidate.similarityDistance)) {
    if (candidate.similarityDistance <= 0.28) score += 30;
    else if (candidate.similarityDistance <= 0.4) score += 20;
    else if (candidate.similarityDistance <= 0.5) score += 8;
    else score -= 15;
  }
  return { candidate, score, reasons };
}

export function rankEvidenceCandidates(observations, candidates) {
  const ranked = (candidates || [])
    .map((candidate) => rankOne(observations, candidate))
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title, "pl"));
  const best = ranked[0];
  const gap = best ? best.score - (ranked[1]?.score ?? 0) : 0;
  const selected = best && best.score >= 65 && (gap >= 12 || best.score >= 90) ? best : null;
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

function canonicalMint(value) {
  const mint = normalized(value);
  if (/\b(elbingensis|elbing|elblag)\b/.test(mint)) return "elblag";
  if (/\b(gedanensis|danzig|gdansk)\b/.test(mint)) return "gdansk";
  if (/\b(bromberg|bidgost|bydgoszcz)\b/.test(mint)) return "bydgoszcz";
  if (/\b(cracov|krakow)\b/.test(mint)) return "krakow";
  if (/\b(warszaw|warsaw|varsav)\b/.test(mint)) return "warszawa";
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
  const aliases = (input) =>
    normalized(input)
      .replace(/dwu talar/g, "dwutalar")
      .replace(/2 talar/g, "dwutalar")
      .replace(/1 1 2 talar/g, "poltora talara")
      .replace(/1\s*½\s*talara?/g, "poltora talara")
      .replace(/poltalar/g, "pol talara");
  return aliases(value) === aliases(expected);
}

function numericYear(value) {
  const match = clean(value).match(/\b(1\d{3}|20\d{2}|9\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function sameYear(value, expected) {
  const referenceYear = numericYear(expected);
  if (!referenceYear) return false;
  const observedYears = [...clean(value).matchAll(/\b(1\d{3}|20\d{2}|9\d{2})\b/g)].map(
    (match) => Number(match[1]),
  );
  return observedYears.includes(referenceYear);
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
      same(candidate.ruler, selected.ruler) &&
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

export function adjudicateRecognition(raw, candidates, inputMeasurements = {}) {
  const measurements = normalizeMeasurements(inputMeasurements);
  const observations = raw?.observations || {};
  const decision = raw?.decision || {};
  const selected = (candidates || []).find((candidate) => candidate.id === clean(decision.selectedCandidateId));
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
    return {
      status: "unresolved",
      confidence: 0,
      selected: null,
      observations,
      contradictions: ["Brak kandydata katalogowego spełniającego widoczne cechy."],
      cautionNotes: modelCautions,
      followUpQuestions: ["Dodaj ostrzejsze zdjęcia obu stron oraz masę i średnicę monety."],
      measurements,
      candidates: publicCandidates(candidates, null),
    };
  }

  score += selected.sourceType === "museum" ? 18 : 12;
  const fit = Math.max(0, Math.min(100, Number(decision.candidateFit) || 0));
  score += Math.round(fit * 0.2);

  const checks = [
    ["rulerReading", "ruler", 14, same],
    ["yearReading", "year", 15, sameYear],
    ["denominationReading", "nominal", 16, sameNominal],
    ["mintReading", "mint", 10, sameMint],
    ["shape", "shape", 7, sameShape],
  ];
  for (const [observedKey, candidateKey, points, comparator] of checks) {
    const observed = clean(observations[observedKey]);
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
  const candidateOnly = !accepted && score >= 48 && uniqueContradictions.length <= 1;
  const followUpQuestions = [];
  if (measurementAmbiguity) followUpQuestions.push(measurementAmbiguity.question);
  if (weightConflict || !measurements.weightGrams) followUpQuestions.push("Zważ monetę z dokładnością co najmniej 0,1 g.");
  if (diameterConflict) followUpQuestions.push("Zmierz średnicę albo oba boki klipy.");

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
    candidates: publicCandidates(candidates, selected.id),
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
  const uncertaintyReasons = [
    ...recognition.contradictions,
    ...(confirmed ? [] : ["Tożsamość nie przeszła bramki dowodowej APOMONET."]),
  ].filter(Boolean);
  const summary = confirmed
    ? `Najlepsze zgodne dopasowanie katalogowe: ${candidate.title}. Źródło: ${candidate.sourceName} ${candidate.sourceReference || ""}.`
    : recognition.status === "candidate-only"
      ? `Najbliższy kandydat to „${recognition.selected.title}”, ale brakuje cechy rozstrzygającej. APOMONET nie zapisuje go jako pewnej identyfikacji.`
      : "Brak dostatecznie zgodnego kandydata katalogowego. APOMONET wstrzymał identyfikację zamiast zgadywać.";
  return {
    imageUsable: raw.imageUsable !== false,
    imageQualityNote: clean(raw.imageQualityNote),
    title: confirmed ? candidate.title : UNKNOWN,
    objectKind: confirmed ? candidate.objectKind || "coin" : clean(raw.objectKind) || "uncertain",
    country: candidate?.country || UNKNOWN,
    ruler: candidate?.ruler || UNKNOWN,
    year: candidate?.year || UNKNOWN,
    nominal: candidate?.nominal || UNKNOWN,
    metal: candidate?.metal || clean(recognition.observations.metalAppearance) || UNKNOWN,
    mint: candidate?.mint || UNKNOWN,
    variant: confirmed ? candidate.title : UNKNOWN,
    grade: condition.band,
    confidence: recognition.confidence,
    rulerConfidence: confirmed ? recognition.confidence : 0,
    yearConfidence: confirmed ? recognition.confidence : 0,
    nominalConfidence: confirmed ? recognition.confidence : 0,
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
    portraitRuler: confirmed ? candidate.ruler : UNKNOWN,
    portraitConfidence: confirmed ? recognition.confidence : 0,
    obverseLegend: clean(recognition.observations.obverseLegendFragments?.join(" · ")),
    reverseLegend: clean(recognition.observations.reverseLegendFragments?.join(" · ")),
    visibleDateReading: clean(recognition.observations.yearReading) || UNKNOWN,
    dateDigits: /^\d{4}$/.test(clean(candidate?.year)) ? clean(candidate.year).split("") : ["?", "?", "?", "?"],
    dateDigitConfidence: /^\d{4}$/.test(clean(candidate?.year))
      ? [recognition.confidence, recognition.confidence, recognition.confidence, recognition.confidence]
      : [0, 0, 0, 0],
    denominationEvidence: clean(recognition.observations.denominationEvidence) || "Brak jednoznacznego odczytu nominału.",
    analysisLevel: "basic",
    analysisVersion: "retrieval-first-v1",
    recognition: {
      engineVersion: "retrieval-first-v1",
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
    },
    condition,
  };
}

export const recognitionCatalogPolicy = Object.freeze({
  schemaVersion: catalog.schemaVersion,
  recordCount: catalog.records.length,
  provenanceRequired: catalog.policy.provenanceRequired,
  numistaEndpoint: `${NUMISTA_BASE_URL}/search_by_image`,
});
