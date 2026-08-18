const BASIC_TIMEOUT_MS = 45_000;
const JOB_TTL_MS = 10 * 60_000;

const basicJobs =
  globalThis.__apomonetBasicJobs ||
  (globalThis.__apomonetBasicJobs = new Map());

function clean(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");
}

function responseText(data) {
  let text = data?.output_text || "";
  if (!text && Array.isArray(data?.output)) {
    for (const item of data.output) {
      if (item.type !== "message") continue;
      for (const part of item.content || []) {
        if (part.type === "output_text") text += part.text || "";
      }
    }
  }
  return text;
}

function safeJobId(req, body) {
  const raw = clean(req.headers["x-apo-job-id"] || body.jobId);
  return /^[a-zA-Z0-9_-]{12,100}$/.test(raw) ? raw : "";
}

function pruneJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [key, entry] of basicJobs) {
    if (Number(entry?.createdAt || 0) < cutoff) basicJobs.delete(key);
  }
}

function chronologyGuard(analysis) {
  const year = /^\d{4}$/.test(clean(analysis.year))
    ? Number(analysis.year)
    : null;
  if (!year || !analysis.ruler || normalized(analysis.ruler) === "nie ustalono") {
    return;
  }
  const reigns = [
    ["Zygmunt I Stary", 1506, 1548],
    ["Zygmunt II August", 1548, 1572],
    ["Henryk Walezy", 1573, 1575],
    ["Anna Jagiellonka", 1575, 1596],
    ["Stefan Batory", 1576, 1586],
    ["Zygmunt III Waza", 1587, 1632],
    ["Władysław IV Waza", 1632, 1648],
    ["Jan II Kazimierz", 1648, 1668],
    ["Michał Korybut Wiśniowiecki", 1669, 1673],
    ["Jan III Sobieski", 1674, 1696],
    ["August II Mocny", 1697, 1706],
    ["Stanisław Leszczyński", 1704, 1709],
    ["August II Mocny", 1709, 1733],
    ["Stanisław Leszczyński", 1733, 1736],
    ["August III Sas", 1733, 1763],
    ["Stanisław August Poniatowski", 1764, 1795],
  ];
  const possible = reigns.filter((item) => year >= item[1] && year <= item[2]);
  const ruler = normalized(analysis.ruler);
  if (
    possible.length &&
    !possible.some((item) => {
      const expected = normalized(item[0]);
      return ruler.includes(expected) || expected.includes(ruler);
    })
  ) {
    const reason = `Konflikt chronologiczny: rok ${year} nie pasuje do rozpoznania „${analysis.ruler}”.`;
    analysis.warnings.push(`${reason} APOMONET nie zmienił danych automatycznie.`);
    analysis.uncertaintyReasons.push(reason);
    analysis.needsDetailedAnalysis = true;
    analysis.confidence = Math.min(analysis.confidence, 72);
    analysis.rulerConfidence = Math.min(analysis.rulerConfidence, 72);
    analysis.estimateLow = 0;
    analysis.estimateHigh = 0;
    analysis.valuationNote =
      "Wycena wstrzymana: konflikt rok–władca wymaga kontroli legendy i portretu.";
  }
}

function normalizeAnalysis(raw) {
  const analysis = { ...raw };
  analysis.warnings = Array.isArray(analysis.warnings)
    ? analysis.warnings.filter(Boolean).slice(0, 4)
    : [];
  analysis.uncertaintyReasons = Array.isArray(analysis.uncertaintyReasons)
    ? analysis.uncertaintyReasons.filter(Boolean).slice(0, 4)
    : [];
  analysis.followUpQuestions = Array.isArray(analysis.followUpQuestions)
    ? analysis.followUpQuestions.filter(Boolean).slice(0, 3)
    : [];
  analysis.confidence = Math.min(95, Math.max(0, Number(analysis.confidence) || 0));
  analysis.rulerConfidence = Math.min(
    100,
    Math.max(0, Number(analysis.rulerConfidence) || 0),
  );
  analysis.yearConfidence = Math.min(
    100,
    Math.max(0, Number(analysis.yearConfidence) || 0),
  );
  analysis.nominalConfidence = Math.min(
    100,
    Math.max(0, Number(analysis.nominalConfidence) || 0),
  );
  if (!analysis.valuationCurrency) analysis.valuationCurrency = "PLN";
  if (Number(analysis.estimateHigh) < Number(analysis.estimateLow)) {
    [analysis.estimateLow, analysis.estimateHigh] = [
      analysis.estimateHigh,
      analysis.estimateLow,
    ];
  }

  const critical = ["country", "ruler", "year", "nominal"];
  const missing = critical.filter((key) => {
    const value = normalized(analysis[key]);
    return !value || value === "nie ustalono" || value.includes("do potwierdzenia");
  });
  if (missing.length) {
    analysis.needsDetailedAnalysis = true;
    analysis.uncertaintyReasons.push(
      `Brakuje pewnego pola: ${missing.join(", ")}.`,
    );
  }
  if (
    analysis.confidence < 85 ||
    analysis.rulerConfidence < 80 ||
    analysis.yearConfidence < 80 ||
    analysis.nominalConfidence < 80
  ) {
    analysis.needsDetailedAnalysis = true;
    analysis.uncertaintyReasons.push(
      "Jedno z kluczowych pól ma obniżoną pewność.",
    );
  }
  if (analysis.warnings.length) analysis.needsDetailedAnalysis = true;

  chronologyGuard(analysis);

  analysis.uncertaintyReasons = [...new Set(analysis.uncertaintyReasons)].slice(0, 4);
  analysis.needsDetailedAnalysis = Boolean(analysis.needsDetailedAnalysis);
  analysis.detailRecommended = analysis.needsDetailedAnalysis;
  analysis.description = clean(analysis.summary);
  analysis.fullDescription = clean(analysis.summary);
  analysis.analysisLevel = "basic";
  analysis.analysisVersion = "two-stage-v2";

  // Pola zgodności ze starszym interfejsem; Etap 1 celowo ich nie analizuje.
  analysis.portraitRuler = analysis.ruler;
  analysis.portraitConfidence = analysis.rulerConfidence;
  analysis.obverseLegend = "";
  analysis.reverseLegend = "";
  analysis.visibleDateReading = analysis.year;
  analysis.dateDigits = /^\d{4}$/.test(clean(analysis.year))
    ? clean(analysis.year).split("")
    : ["?", "?", "?", "?"];
  analysis.dateDigitConfidence = analysis.dateDigits.map((digit) =>
    digit === "?" ? 0 : analysis.yearConfidence,
  );
  analysis.denominationEvidence =
    "Analiza wstępna — cechy rozstrzygające sprawdza Etap 2.";
  return analysis;
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    imageUsable: { type: "boolean" },
    imageQualityNote: { type: "string" },
    title: { type: "string" },
    objectKind: {
      type: "string",
      enum: ["coin", "pattern", "medal", "token", "copy", "uncertain"],
    },
    country: { type: "string" },
    ruler: { type: "string" },
    year: { type: "string" },
    nominal: { type: "string" },
    metal: { type: "string" },
    mint: { type: "string" },
    variant: { type: "string" },
    grade: { type: "string" },
    confidence: { type: "integer", minimum: 0, maximum: 95 },
    rulerConfidence: { type: "integer", minimum: 0, maximum: 100 },
    yearConfidence: { type: "integer", minimum: 0, maximum: 100 },
    nominalConfidence: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    needsDetailedAnalysis: { type: "boolean" },
    uncertaintyReasons: {
      type: "array",
      maxItems: 4,
      items: { type: "string" },
    },
    estimateLow: { type: "number", minimum: 0 },
    estimateHigh: { type: "number", minimum: 0 },
    valuationCurrency: { type: "string" },
    valuationNote: { type: "string" },
    followUpQuestions: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
    warnings: { type: "array", maxItems: 4, items: { type: "string" } },
  },
  required: [
    "imageUsable",
    "imageQualityNote",
    "title",
    "objectKind",
    "country",
    "ruler",
    "year",
    "nominal",
    "metal",
    "mint",
    "variant",
    "grade",
    "confidence",
    "rulerConfidence",
    "yearConfidence",
    "nominalConfidence",
    "summary",
    "needsDetailedAnalysis",
    "uncertaintyReasons",
    "estimateLow",
    "estimateHigh",
    "valuationCurrency",
    "valuationNote",
    "followUpQuestions",
    "warnings",
  ],
};

async function runAnalysis(apiKey, images) {
  const prompt = `ETAP 1 APOMONET — szybka i ostrożna identyfikacja podstawowa z dwóch zdjęć.

Najpierw oceń, czy oba zdjęcia nadają się do identyfikacji i czy pokazują dwie strony tego samego obiektu. Rozpoznaj rodzaj obiektu: regularna moneta obiegowa, emisja próbna/wzorcowa (PRÓBA/PROBA/ESSAI/PATTERN), medal, żeton, możliwa kopia albo obiekt niepewny. Uwzględnij widoczny napis „PRÓBA”, nietypowy metal, talar próbny oraz sygnatur projektanta/medaliera, ale niczego nie zgaduj. Następnie podaj tylko podstawową kartę: kraj/emitent, władca, rok, nominał, metal, mennica, ogólny typ i szeroką klasę stanu zachowania. Nie podawaj gradingu liczbowego.

To nie jest analiza odmianowa. Nie odczytuj pełnych legend, nie buduj fingerprintu stempla i nie zgaduj mikroszczegółów — zrobi to opcjonalny Etap 2. Jeśli pole nie jest czytelne, wpisz „Nie ustalono”. Nie potwierdzaj autentyczności wyłącznie ze zdjęć. Przy emisji próbnej nie wciskaj obiektu w zwykły typ obiegowy.

needsDetailedAnalysis ustaw na true, gdy zdjęcie jest słabsze, istnieje więcej niż jedna wiarygodna identyfikacja, brakuje ważnego pola, pola są ze sobą sprzeczne albo do rozstrzygnięcia potrzebna jest legenda, rant, masa, średnica lub detal stempla. uncertaintyReasons mają być krótkie i konkretne. summary: maksymalnie 3 krótkie zdania, bez powtarzania tabeli. Wycena wyłącznie jako bardzo ostrożny przedział przy spójnej identyfikacji; w przeciwnym razie zera i wyjaśnienie. Odpowiadaj po polsku.`;
  const content = [
    { type: "input_text", text: prompt },
    { type: "input_image", image_url: images[0], detail: "high" },
    { type: "input_image", image_url: images[1], detail: "high" },
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BASIC_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.6",
        reasoning: { effort: "low" },
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "coin_basic_v4_two_stage",
            strict: true,
            schema,
          },
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        status: response.status,
        body: { error: data?.error?.message || "Błąd analizy." },
      };
    }
    if (data.status === "incomplete") {
      throw new Error("Analiza wstępna nie zwróciła kompletnego wyniku.");
    }
    const text = responseText(data);
    if (!text) throw new Error("Analiza wstępna zwróciła pusty wynik.");
    const analysis = normalizeAnalysis(JSON.parse(text));
    if (analysis.imageUsable === false) {
      return {
        status: 422,
        body: {
          error:
            analysis.imageQualityNote ||
            "Zdjęcia są zbyt słabe do wiarygodnej identyfikacji.",
          code: "IMAGE_NOT_USABLE",
          retryable: false,
        },
      };
    }
    return {
      status: 200,
      body: {
        success: true,
        analysis,
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
        },
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Dozwolona jest tylko metoda POST." });
  }
  res.setHeader("Cache-Control", "no-store, max-age=0");
  const startedAt = Date.now();
  const requestId = req.headers["x-vercel-id"] || `basic-${startedAt}`;
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Brak OPENAI_API_KEY na aktywnym deploymentcie." });
    }
    const body = req.body || {};
    const images = Array.isArray(body.images)
      ? body.images.filter(Boolean)
      : [];
    if (images.length < 2) {
      return res.status(400).json({ error: "Potrzebne są dwa zdjęcia." });
    }
    if (
      images.some(
        (image) =>
          typeof image !== "string" ||
          !image.startsWith("data:image/") ||
          image.length > 1_800_000,
      )
    ) {
      return res.status(413).json({
        error:
          "Zdjęcia są zbyt duże do stabilnej analizy. Wczytaj je ponownie — APOMONET zmniejszy je automatycznie.",
      });
    }

    pruneJobs();
    const jobId = safeJobId(req, body);
    let entry = jobId ? basicJobs.get(jobId) : null;
    const deduplicated = Boolean(entry);
    if (!entry) {
      const promise = runAnalysis(apiKey, images).catch((error) => {
        if (jobId) basicJobs.delete(jobId);
        throw error;
      });
      entry = {
        createdAt: Date.now(),
        promise,
      };
      if (jobId) basicJobs.set(jobId, entry);
    }
    const result = await entry.promise;
    if (result.status >= 500 && jobId) basicJobs.delete(jobId);
    const elapsedMs = Date.now() - startedAt;
    res.setHeader("Server-Timing", `apomonet-basic;dur=${elapsedMs}`);
    res.setHeader("X-Apo-Deduplicated", deduplicated ? "1" : "0");
    console.log("[analyze-basic] complete", {
      requestId,
      jobId: jobId || null,
      deduplicated,
      status: result.status,
      elapsedMs,
      imageChars: images.map((image) => image.length),
    });
    return res.status(result.status).json({
      ...result.body,
      meta: { stage: "basic", elapsedMs, deduplicated },
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    const elapsedMs = Date.now() - startedAt;
    console.error("[analyze-basic] failed", {
      requestId,
      elapsedMs,
      name: error?.name,
      message: error?.message,
    });
    return res.status(timedOut ? 504 : 500).json({
      error: timedOut
        ? "Analiza wstępna trwała zbyt długo. Zdjęcia są bezpieczne — spróbuj ponownie."
        : error?.message || "Wewnętrzny błąd APOMONET.",
      retryable: true,
    });
  }
}
