// Vercel bundles API `.js` files as CommonJS in this project. A static import
// would be rewritten to `require()`, which cannot load an `.mjs` dependency.
// Native dynamic import keeps the recognition core as ESM in production.
const recognitionCorePromise = import("../lib/recognition-core.mjs");
const recognitionOrchestratorPromise = import("../lib/recognition-orchestrator.mjs");

const BASIC_TIMEOUT_MS = 45_000;
const VISION_TIMEOUT_MS = 32_000;
const REFERENCE_COMPARE_TIMEOUT_MS = 12_000;
const JOB_TTL_MS = 10 * 60_000;
const RUNTIME_SOURCE_GRACE_MS = 1_200;

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

function settleWithin(promise, timeoutMs, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
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

const referenceComparisonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    selectedCandidateId: { type: "string" },
    candidateFit: { type: "integer", minimum: 0, maximum: 100 },
    supportingFeatures: { type: "array", maxItems: 8, items: { type: "string" } },
    contradictions: { type: "array", maxItems: 8, items: { type: "string" } },
  },
  required: ["selectedCandidateId", "candidateFit", "supportingFeatures", "contradictions"],
};

async function compareWithReferenceImages(apiKey, userImages, ranked) {
  const top = ranked?.ranked?.[0];
  if (
    !top ||
    top.score < 35 ||
    top.hardConflicts.length ||
    !Array.isArray(top.candidate?.images) ||
    top.candidate.images.length < 2
  ) {
    return { status: "not-available", result: null };
  }
  const shortlist = (ranked?.ranked || [])
    .filter(
      (item) =>
        item.score >= 35 &&
        item.hardConflicts.length === 0 &&
        Array.isArray(item.candidate?.images) &&
        item.candidate.images.length >= 2,
    )
    .slice(0, 3);
  if (!shortlist.length) return { status: "not-available", result: null };

  const content = [
    {
      type: "input_text",
      text: `APOMONET — niezależne porównanie obrazu z krótką listą katalogową.

Pierwsze dwa obrazy to awers i rewers monety użytkownika. Następnie każda podpisana para obrazów pochodzi z jawnie wskazanego rekordu katalogowego. Porównaj portret, heraldykę, układ legendy, cyfry daty, znaki mennicy/mincerza i geometrię stempla na OBU stronach. Podobny styl epoki nie wystarcza. Nie oceniaj stanu zachowania. Wybierz dokładne id tylko wtedy, gdy para jest wizualnie zgodna; w przeciwnym razie zwróć pusty selectedCandidateId.`,
    },
    { type: "input_text", text: "MONETA UŻYTKOWNIKA — AWERS" },
    { type: "input_image", image_url: userImages[0], detail: "high" },
    { type: "input_text", text: "MONETA UŻYTKOWNIKA — REWERS" },
    { type: "input_image", image_url: userImages[1], detail: "high" },
  ];
  for (const item of shortlist) {
    const candidate = item.candidate;
    content.push({
      type: "input_text",
      text: `KANDYDAT ${candidate.id}: ${candidate.title}; ${candidate.ruler || ""}; ${candidate.year || ""}; ${candidate.nominal || ""}; ${candidate.mint || ""}`,
    });
    content.push({ type: "input_image", image_url: candidate.images[0], detail: "high" });
    content.push({ type: "input_image", image_url: candidate.images[1], detail: "high" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REFERENCE_COMPARE_TIMEOUT_MS);
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
            name: "coin_reference_comparison_v1",
            strict: true,
            schema: referenceComparisonSchema,
          },
        },
      }),
    });
    const data = await response.json();
    if (!response.ok) return { status: `error-${response.status}`, result: null };
    const text = responseText(data);
    if (!text) return { status: "empty", result: null };
    const result = JSON.parse(text);
    const allowedIds = new Set(shortlist.map((item) => item.candidate.id));
    if (!allowedIds.has(clean(result.selectedCandidateId))) result.selectedCandidateId = "";
    result.candidateFit = Math.max(0, Math.min(100, Number(result.candidateFit) || 0));
    return { status: "ok", result };
  } catch (error) {
    return { status: error?.name === "AbortError" ? "timeout" : "error", result: null };
  } finally {
    clearTimeout(timeout);
  }
}

async function runAnalysis(apiKey, images, measurements) {
  const analysisStartedAt = Date.now();
  const {
    adjudicateRecognition,
    analysisFromRecognition,
    candidatePrompt,
    conditionFromRaw,
    localReferenceCandidates,
    searchMnkByEvidence,
    searchNumistaByImage,
  } = await recognitionCorePromise;
  const { orchestrateRecognitionCandidates, recognitionEnginePolicy } =
    await recognitionOrchestratorPromise;
  const localCandidates = localReferenceCandidates();
  const numistaPromise = searchNumistaByImage(
    process.env.NUMISTA_API_KEY,
    images,
  );
  // The first vision pass must describe the photographs without being anchored
  // by an arbitrary slice of the large local catalogue. Numista candidates are
  // allowed here only because they were retrieved from the submitted images.
  let candidates = [];
  const prompt = `ETAP 1 APOMONET — analiza dowodów i wybór wyłącznie z katalogu kandydatów.

Najpierw oceń, czy oba zdjęcia nadają się do identyfikacji i czy pokazują dwie strony tego samego obiektu. Rozpoznaj wyłącznie rodzaj obiektu: regularna moneta obiegowa, emisja próbna/wzorcowa (PRÓBA/PROBA/ESSAI/PATTERN), medal, żeton, możliwa kopia albo obiekt niepewny. Uwzględnij widoczny napis „PRÓBA”, nietypowy metal, talar próbny oraz sygnatur projektanta/medaliera.

IDENTYFIKACJA I STAN TO DWA ODDZIELNE ZADANIA. W observations zapisz tylko to, co faktycznie widać: fragmenty legend, portret, herby, datę/cyfry, oznaczenie nominału, mennicę lub znaki, kształt i wygląd metalu. Nie dopasowuj obserwacji do oczekiwanego wyniku. Gdy czegoś nie widać, wpisz „Nie ustalono” albo pustą tablicę. Traktuj listę kandydatów wyłącznie jako materiał do późniejszego porównania, a nie jako podpowiedź do odczytu obrazu.

Przy legendach nowożytnych rozróżniaj podstawowe imiona: STEPHAN/STEPHANVS wskazuje Stefana (w polskim materiale zwykle Stefana Batorego), SIGIS/SIGISM — Zygmunta, SIGIS razem z AVG/AVGVSTVS — Zygmunta II Augusta, a IOAN razem z CASIM — Jana Kazimierza. Pole rulerReading służy wyłącznie odczytowi imienia lub tytulatury władcy: jeśli widać STEPHANVS, wpisz STEPHANVS lub Stefan Batory; nigdy nie wpisuj tam uwag o skali, linijce ani średnicy. Jeżeli portretowa hipoteza przeczy czytelnej legendzie, przepisz legendę i nie broń hipotezy. GEDAN/GEDANENSIS oznacza Gdańsk, AVR/AUREA wskazuje złoto, ARG/ARGENTEA wskazuje srebro. Masa około 3,4–3,7 g przy złotym wyglądzie jest skalą dukata; nie jest skalą srebrnego talara ani dwutalara. To są wskazówki językowe i metrologiczne, ale ostatecznie muszą zgadzać się również portret, herb i druga strona.

W decision wolno wybrać TYLKO dokładne id z listy KANDYDACI albo pusty tekst. Nie wolno wymyślić nowej tożsamości. Kandydat musi zgadzać się z obiema stronami. Portret bez zgodnego rewersu, mennicy, legendy lub nominału nie wystarcza. Jako sprzeczność wpisz tylko cechę, która faktycznie przeczy wybranemu kandydatowi — brak napisu PRÓBA nie jest sprzecznością dla monety regularnej, a dodatkowe cyfry nie przeczą dacie, jeżeli właściwa data również jest czytelna. Jeśli dwa nominały mają podobne stemple i rozstrzyga je masa/średnica, nie zgaduj.

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
    const localOrchestration = orchestrateRecognitionCandidates(
      raw.observations,
      localCandidates,
      measurements,
    );
    const [numista, mnk] = await Promise.all([
      settleWithin(numistaPromise, RUNTIME_SOURCE_GRACE_MS, {
        available: Boolean(process.env.NUMISTA_API_KEY), candidates: [], reason: "deferred-time-budget",
      }),
      settleWithin(searchMnkByEvidence(raw.observations), RUNTIME_SOURCE_GRACE_MS, {
        available: true, candidates: [], reason: "deferred-time-budget",
      }),
    ]);
    const byId = new Map();
    for (const candidate of [
      ...numista.candidates,
      ...mnk.candidates,
      ...localOrchestration.retrieval.shortlist,
    ]) {
      if (candidate?.id && !byId.has(candidate.id)) byId.set(candidate.id, candidate);
    }
    candidates = [...byId.values()];
    const ranked = orchestrateRecognitionCandidates(
      raw.observations,
      candidates,
      measurements,
    );
    // A second high-resolution model call belongs to Stage 2. Stage 1 now
    // returns the basic identity as soon as the independent local engines agree.
    const visualReference = { status: "deferred-to-stage2", result: null };
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
    } else {
      const modelSelection = ranked.ranked.find(
        (item) => item.candidate.id === clean(raw.decision.selectedCandidateId),
      );
      if (!modelSelection || modelSelection.score < 35 || modelSelection.hardConflicts.length) {
        raw.decision.selectedCandidateId = "";
        raw.decision.candidateFit = 0;
      }
    }
    if (visualReference.result?.selectedCandidateId && visualReference.result.candidateFit >= 60) {
      raw.decision.selectedCandidateId = visualReference.result.selectedCandidateId;
      raw.decision.candidateFit = visualReference.result.candidateFit;
      raw.decision.supportingFeatures = visualReference.result.supportingFeatures;
      raw.decision.contradictions = visualReference.result.contradictions;
    } else if (visualReference.status === "ok" && visualReference.result) {
      raw.decision.selectedCandidateId = "";
      raw.decision.candidateFit = 0;
      raw.decision.contradictions = visualReference.result.contradictions;
    } else if (visualReference.result?.contradictions?.length) {
      raw.decision.contradictions = [
        ...(raw.decision.contradictions || []),
        ...visualReference.result.contradictions,
      ].slice(0, 6);
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
          localReferenceCount: localCandidates.length,
          visualReferenceComparison: visualReference.status,
          recognitionEngine: recognitionEnginePolicy.version,
          engineDiagnostics: ranked.retrieval.diagnostics,
        },
        timings: {
          localRetrievalMs: localOrchestration.timings.totalLocalMs,
          finalOrchestrationMs: ranked.timings.totalLocalMs,
          totalMs: Date.now() - analysisStartedAt,
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
