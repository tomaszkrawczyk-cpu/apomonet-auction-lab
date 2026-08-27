import {
  adjudicateRecognition,
  analysisFromRecognition,
  candidatePrompt,
  conditionFromRaw,
  localReferenceCandidates,
  rankEvidenceCandidates,
  searchMnkByEvidence,
  searchNumistaByImage,
} from "../lib/recognition-core.mjs";

const BASIC_TIMEOUT_MS = 45_000;
const VISION_TIMEOUT_MS = 32_000;
const JOB_TTL_MS = 10 * 60_000;

const basicJobs =
  globalThis.__apomonetBasicJobs ||
  (globalThis.__apomonetBasicJobs = new Map());

function clean(value) {
  return String(value ?? "").trim();
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

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    imageUsable: { type: "boolean" },
    imageQualityNote: { type: "string" },
    sameObject: { type: "boolean" },
    objectKind: {
      type: "string",
      enum: ["coin", "pattern", "medal", "token", "copy", "uncertain"],
    },
    confidence: { type: "integer", minimum: 0, maximum: 95 },
    observations: {
      type: "object",
      additionalProperties: false,
      properties: {
        rulerReading: { type: "string" },
        yearReading: { type: "string" },
        denominationReading: { type: "string" },
        denominationEvidence: { type: "string" },
        mintReading: { type: "string" },
        metalAppearance: { type: "string" },
        shape: { type: "string" },
        portrait: { type: "string" },
        heraldry: { type: "array", maxItems: 6, items: { type: "string" } },
        mintMarks: { type: "array", maxItems: 6, items: { type: "string" } },
        obverseLegendFragments: {
          type: "array",
          maxItems: 8,
          items: { type: "string" },
        },
        reverseLegendFragments: {
          type: "array",
          maxItems: 8,
          items: { type: "string" },
        },
      },
      required: [
        "rulerReading",
        "yearReading",
        "denominationReading",
        "denominationEvidence",
        "mintReading",
        "metalAppearance",
        "shape",
        "portrait",
        "heraldry",
        "mintMarks",
        "obverseLegendFragments",
        "reverseLegendFragments",
      ],
    },
    decision: {
      type: "object",
      additionalProperties: false,
      properties: {
        selectedCandidateId: { type: "string" },
        candidateFit: { type: "integer", minimum: 0, maximum: 100 },
        supportingFeatures: {
          type: "array",
          maxItems: 8,
          items: { type: "string" },
        },
        contradictions: {
          type: "array",
          maxItems: 6,
          items: { type: "string" },
        },
      },
      required: [
        "selectedCandidateId",
        "candidateFit",
        "supportingFeatures",
        "contradictions",
      ],
    },
    condition: {
      type: "object",
      additionalProperties: false,
      properties: {
        band: {
          type: "string",
          enum: ["unc", "au", "xf", "vf", "f", "vg", "g", "uncertain"],
        },
        confidence: { type: "integer", minimum: 0, maximum: 80 },
        wear: { type: "string" },
        strike: { type: "string" },
        surface: { type: "string" },
        damage: { type: "string" },
      },
      required: ["band", "confidence", "wear", "strike", "surface", "damage"],
    },
  },
  required: [
    "imageUsable",
    "imageQualityNote",
    "sameObject",
    "objectKind",
    "confidence",
    "observations",
    "decision",
    "condition",
  ],
};

async function runAnalysis(apiKey, images, measurements) {
  const localCandidates = localReferenceCandidates();
  const numista = await searchNumistaByImage(
    process.env.NUMISTA_API_KEY,
    images,
  );
  let candidates = [...numista.candidates, ...localCandidates].slice(0, 12);
  const prompt = `ETAP 1 APOMONET — analiza dowodów i wybór wyłącznie z katalogu kandydatów.

Najpierw oceń, czy oba zdjęcia nadają się do identyfikacji i czy pokazują dwie strony tego samego obiektu. Rozpoznaj wyłącznie rodzaj obiektu: regularna moneta obiegowa, emisja próbna/wzorcowa (PRÓBA/PROBA/ESSAI/PATTERN), medal, żeton, możliwa kopia albo obiekt niepewny. Uwzględnij widoczny napis „PRÓBA”, nietypowy metal, talar próbny oraz sygnatur projektanta/medaliera.

IDENTYFIKACJA I STAN TO DWA ODDZIELNE ZADANIA. W observations zapisz tylko to, co faktycznie widać: fragmenty legend, portret, herby, datę/cyfry, oznaczenie nominału, mennicę lub znaki, kształt i wygląd metalu. Nie dopasowuj obserwacji do oczekiwanego wyniku. Gdy czegoś nie widać, wpisz „Nie ustalono” albo pustą tablicę.

W decision wolno wybrać TYLKO dokładne id z listy KANDYDACI albo pusty tekst. Nie wolno wymyślić nowej tożsamości. Kandydat musi zgadzać się z obiema stronami. Portret bez zgodnego rewersu, mennicy, legendy lub nominału nie wystarcza. Każdą sprzeczność wpisz jawnie. Jeśli dwa nominały mają podobne stemple i rozstrzyga je masa/średnica, nie zgaduj.

W condition niezależnie oceń wyłącznie szeroki stan zachowania. Oddziel zużycie obiegowe od słabego bicia, korozji, czyszczenia, rys i uszkodzeń. Nie podawaj gradingu liczbowego i nie używaj tożsamości monety do zawyżania stanu.

KANDYDACI:
${candidatePrompt(candidates)}

POMIARY WŁAŚCICIELA (mogą być puste):
${JSON.stringify(measurements || {})}

Odpowiadaj po polsku.`;
  const content = [
    { type: "input_text", text: prompt },
    { type: "input_image", image_url: images[0], detail: "high" },
    { type: "input_image", image_url: images[1], detail: "high" },
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);
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
            name: "coin_evidence_candidate_v1",
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
    const raw = JSON.parse(text);
    if (raw.imageUsable === false || raw.sameObject === false) {
      return {
        status: 422,
        body: {
          error:
            raw.imageQualityNote ||
            (raw.sameObject === false
              ? "Zdjęcia nie pokazują dwóch stron tego samego obiektu."
              : "Zdjęcia są zbyt słabe do wiarygodnej identyfikacji."),
          code: "IMAGE_NOT_USABLE",
          retryable: false,
        },
      };
    }
    const mnk = await searchMnkByEvidence(raw.observations);
    const byId = new Map();
    for (const candidate of [...numista.candidates, ...mnk.candidates, ...localCandidates]) {
      if (candidate?.id && !byId.has(candidate.id)) byId.set(candidate.id, candidate);
    }
    candidates = [...byId.values()];
    const ranked = rankEvidenceCandidates(raw.observations, candidates);
    if (ranked.selected) {
      raw.decision.selectedCandidateId = ranked.selected.candidate.id;
      raw.decision.candidateFit = Math.max(
        Number(raw.decision.candidateFit) || 0,
        Math.min(100, ranked.selected.score),
      );
      raw.decision.supportingFeatures = [
        ...new Set([
          ...(raw.decision.supportingFeatures || []),
          ...ranked.selected.reasons,
        ]),
      ].slice(0, 8);
    }
    const orderedCandidates = ranked.ranked.map((item) => item.candidate);
    const recognition = adjudicateRecognition(
      raw,
      orderedCandidates,
      measurements,
    );
    const condition = conditionFromRaw(raw, raw.imageUsable !== false);
    const analysis = analysisFromRecognition(raw, recognition, condition);
    analysis.needsDetailedAnalysis = Boolean(analysis.needsDetailedAnalysis);
    return {
      status: 200,
      body: {
        success: true,
        analysis,
        sources: {
          numista: { available: numista.available, reason: numista.reason },
          mnk: { available: mnk.available, reason: mnk.reason },
          curatedReferenceCount: localCandidates.length,
        },
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
    const measurements = body.measurements || {};
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
      const promise = runAnalysis(apiKey, images, measurements).catch((error) => {
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
