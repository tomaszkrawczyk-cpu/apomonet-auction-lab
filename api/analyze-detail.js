const DETAIL_TIMEOUT_MS = 55_000;
const JOB_TTL_MS = 10 * 60_000;

const detailJobs =
  globalThis.__apomonetDetailJobs ||
  (globalThis.__apomonetDetailJobs = new Map());

const BASE_FIELDS = [
  "title",
  "objectKind",
  "country",
  "ruler",
  "year",
  "nominal",
  "mint",
  "metal",
  "variant",
  "grade",
  "rarity",
  "description",
  "fullDescription",
  "confidence",
  "weight",
  "diameter",
  "edgeDescription",
  "userAccepted",
  "userAdditionalInfo",
];

function safeBase(input) {
  const source = input && typeof input === "object" ? input : {};
  const output = {};
  for (const key of BASE_FIELDS) {
    const value = source[key];
    if (typeof value === "string") output[key] = value.slice(0, 2_000);
    else if (typeof value === "number" || typeof value === "boolean") {
      output[key] = value;
    } else if (Array.isArray(value)) {
      output[key] = value
        .filter((item) => typeof item === "string")
        .slice(0, 12)
        .map((item) => item.slice(0, 500));
    }
  }
  return output;
}

function safeLiteraturePolicy(input) {
  const source = input && typeof input === "object" ? input : {};
  const allowedIds = new Set(["kopicki", "tyszkiewicz", "parchimowicz"]);
  const references = Array.isArray(source.references)
    ? source.references
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          id: String(item.id || "").toLowerCase().trim(),
          role: String(item.role || "").slice(0, 80),
          reason: String(item.reason || "").slice(0, 500),
        }))
        .filter((item) => allowedIds.has(item.id))
        .slice(0, 6)
    : [];
  return {
    method: "evidence-based",
    references,
    note: String(source.note || "").slice(0, 800),
  };
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
  const raw = String(req.headers["x-apo-job-id"] || body?.jobId || "").trim();
  return /^[a-zA-Z0-9_-]{12,100}$/.test(raw) ? raw : "";
}

function pruneJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [key, entry] of detailJobs) {
    if (Number(entry?.createdAt || 0) < cutoff) detailJobs.delete(key);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Dozwolona jest tylko metoda POST." });
  }

  const startedAt = Date.now();
  const requestId = req.headers["x-vercel-id"] || `detail-${startedAt}`;
  res.setHeader("Cache-Control", "no-store");

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "Brak OPENAI_API_KEY na aktywnym deploymentcie." });
    }

    const body = req.body || {};
    const jobId = safeJobId(req, body);
    const images = Array.isArray(body.images)
      ? body.images.filter(
          (image) => typeof image === "string" && image.startsWith("data:image/"),
        )
      : [];
    if (images.length < 2) {
      return res.status(400).json({ error: "Potrzebne są dwa zdjęcia." });
    }
    if (images.some((image) => image.length > 1_800_000)) {
      return res.status(413).json({
        error:
          "Jedno ze zdjęć jest zbyt duże. Wybierz je ponownie — ApoMonet przygotuje lżejszy kadr.",
      });
    }

    const base = safeBase(body.base);
    const literaturePolicy = safeLiteraturePolicy(body.literaturePolicy);
    const allowedLiterature = new Set(
      literaturePolicy.references.map((item) => item.id),
    );
    console.log("[analyze-detail] start", {
      requestId,
      jobId: jobId || null,
      imageChars: images.map((image) => image.length),
      baseChars: JSON.stringify(base).length,
      userAccepted: base.userAccepted === true,
      literature: [...allowedLiterature],
    });

    const content = [
      {
        type: "input_text",
        text: `Jesteś ekspertem numizmatycznym. To DRUGI, opcjonalny etap analizy APOMONET. Dane bazowe mogły zostać ręcznie poprawione przez właściciela. Pola zaakceptowane przez użytkownika są nadrzędnym punktem odniesienia. NIE wracaj automatycznie do wcześniejszego strzału AI.

Dane bazowe po korekcie: ${JSON.stringify(base)}

POLITYKA LITERATURY SPECJALISTYCZNEJ: ${JSON.stringify(literaturePolicy)}
Wolno rozważać i zwracać wyłącznie pozycje obecne w references tej polityki. Jeśli danego id nie ma na liście, odpowiadające mu pole pozostaw puste. Sama zgodność rocznika, władcy lub nominału NIE wystarcza do przypisania literatury. Tyszkiewicz: jeżeli jest dopuszczony i potwierdzony dla konkretnej emisji, zachowaj oryginalną historyczną wartość katalogową jako tyszkiewiczValue; NIE przeliczaj jej na PLN i NIE przedstawiaj jako współczesnej ceny rynkowej. Parchimowicz: podawaj wyłącznie po potwierdzeniu zastosowania do konkretnej emisji/opracowania. Kopicki podlega dodatkowym rygorom wariantowym opisanym niżej.

Najpierw sprawdź zgodność obrazu z ruler/year/nominal/mint/metal. Jeśli widzisz jednoznaczną sprzeczność, NIE nadpisuj tych pól po cichu — dodaj ostrzeżenie. Odczytaj osobno pełną widoczną legendę awersu i rewersu oraz każdą cyfrę daty. Nieczytelną cyfrę oznacz znakiem ?. Następnie analizuj odmianę i stempel: interpunkcję, rozstaw daty, położenie daty, początek/koniec legendy w układzie zegarowym, formy liter i cyfr, orientację i proporcje portretu, koronę, herb/tarczę, monogramy, znaki mennicze, mincerza, pióra/skrzydła/ogon orła oraz rant, jeśli jest widoczny.

STANDARD OPISU PROFESJONALNEGO: pracuj jak numizmatyk przygotowujący kartę do domu aukcyjnego, ale NIE kopiuj cudzych opisów i nie naśladuj konkretnego katalogu zdanie po zdaniu. W fullDescription zachowaj logiczną kolejność: (1) emitent/władca, nominał, rok, mennica i metal wynikające z danych bazowych; (2) konkretna odmiana tylko jeśli da się ją obronić; (3) awers — co rzeczywiście widać; (4) rewers — co rzeczywiście widać; (5) cechy diagnostyczne odróżniające wariant; (6) ostrożna ocena stanu. NIE umieszczaj w fullDescription ceny, liczby notowań, mediany rynku ani niepotwierdzonych numerów katalogowych. Katalog i rzadkość mają pozostać osobnymi polami. Nie używaj pustych ozdobników typu „interesujący egzemplarz” albo „rzadka moneta”, jeżeli nie wynika to z danych.

KOPICKI: kopickiReference i kopickiRarity podawaj WYŁĄCZNIE wtedy, gdy rozpoznanie konkretnego wariantu ma wiarygodną podstawę w cechach diagnostycznych oraz polityka literatury dopuszcza id „kopicki”. Sam władca + rok + nominał nie wystarczają. Jeśli nie masz podstawy, pozostaw oba pola puste. Rzadkość nie może być wnioskowana z wyglądu monety ani z przewidywanej ceny.

STAN: gradeAssessment ma być konserwatywną oceną widocznego zużycia i jakości bicia. Nie przypisuj precyzyjnych stopni slabowych typu AU55/MS63 na podstawie dwóch zwykłych zdjęć. Jeżeli potrzebne są dodatkowe kąty, waga, średnica, rant, magnes albo makro konkretnego detalu, dodaj je do recommendedChecks.

Zbuduj fingerprint geometryczno-diagnostyczny. Każda cecha fingerprintu ma wartość tekstową, confidence 0-100 i method. Gdy cechy nie da się wiarygodnie zobaczyć, ustaw value na pusty tekst i confidence=0. NIE zgaduj mikroszczegółów. Oddziel obserwacje wizualne od przypuszczeń o autentyczności. Confidence całej analizy nigdy nie może wynosić 100%. Odpowiadaj zwięźle po polsku.`,
      },
      { type: "input_image", image_url: images[0], detail: "high" },
      { type: "input_image", image_url: images[1], detail: "high" },
    ];

    const feature = {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
        method: {
          type: "string",
          enum: [
            "visual_observation",
            "relative_geometry",
            "legend_reading",
            "not_observable",
          ],
        },
        note: { type: "string" },
      },
      required: ["value", "confidence", "method", "note"],
    };
    const fingerprintProperties = {};
    for (const key of [
      "punctuationPattern",
      "dateSpacing",
      "datePosition",
      "legendStartClock",
      "legendEndClock",
      "portraitOrientation",
      "crownShape",
      "shieldPosition",
      "mintMarkPosition",
      "eagleTail",
      "wingPattern",
      "featherPattern",
      "letterForms",
      "digitForms",
      "monogramShape",
      "edgeFeature",
    ]) {
      fingerprintProperties[key] = feature;
    }

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        variant: { type: "string" },
        kopickiReference: { type: "string" },
        kopickiRarity: { type: "string" },
        tyszkiewiczReference: { type: "string" },
        tyszkiewiczValue: { type: "string" },
        parchimowiczReference: { type: "string" },
        obverseDetails: { type: "string" },
        reverseDetails: { type: "string" },
        obverseLegend: { type: "string" },
        reverseLegend: { type: "string" },
        visibleDateReading: { type: "string" },
        dateDigits: {
          type: "array",
          items: { type: "string" },
          minItems: 4,
          maxItems: 4,
        },
        dateDigitConfidence: {
          type: "array",
          items: { type: "integer", minimum: 0, maximum: 100 },
          minItems: 4,
          maxItems: 4,
        },
        mintmaster: { type: "string" },
        legendPunctuation: { type: "string" },
        diagnosticFeatures: { type: "array", items: { type: "string" } },
        authenticitySignals: { type: "array", items: { type: "string" } },
        recommendedChecks: {
          type: "array",
          maxItems: 5,
          items: { type: "string" },
        },
        gradeAssessment: { type: "string" },
        fingerprint: {
          type: "object",
          additionalProperties: false,
          properties: {
            version: { type: "integer", enum: [1] },
            side: { type: "string", enum: ["both"] },
            quality: { type: "string", enum: ["observed", "limited"] },
            source: { type: "string", enum: ["user_photo"] },
            features: {
              type: "object",
              additionalProperties: false,
              properties: fingerprintProperties,
              required: Object.keys(fingerprintProperties),
            },
          },
          required: ["version", "side", "quality", "source", "features"],
        },
        fullDescription: { type: "string" },
        confidence: { type: "integer", minimum: 0, maximum: 95 },
        warnings: { type: "array", items: { type: "string" } },
      },
      required: [
        "variant",
        "kopickiReference",
        "kopickiRarity",
        "tyszkiewiczReference",
        "tyszkiewiczValue",
        "parchimowiczReference",
        "obverseDetails",
        "reverseDetails",
        "obverseLegend",
        "reverseLegend",
        "visibleDateReading",
        "dateDigits",
        "dateDigitConfidence",
        "mintmaster",
        "legendPunctuation",
        "diagnosticFeatures",
        "authenticitySignals",
        "recommendedChecks",
        "gradeAssessment",
        "fingerprint",
        "fullDescription",
        "confidence",
        "warnings",
      ],
    };

    const performRequest = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DETAIL_TIMEOUT_MS);
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
                name: "coin_detail_v7_literature_policy",
                strict: true,
                schema,
              },
            },
          }),
        });
        return {
          ok: response.ok,
          status: response.status,
          data: await response.json(),
        };
      } finally {
        clearTimeout(timeout);
      }
    };

    pruneJobs();
    let entry = jobId ? detailJobs.get(jobId) : null;
    const deduplicated = Boolean(entry);
    if (!entry) {
      const promise = performRequest().catch((error) => {
        if (jobId) detailJobs.delete(jobId);
        throw error;
      });
      entry = { createdAt: Date.now(), promise };
      if (jobId) detailJobs.set(jobId, entry);
    }
    const outcome = await entry.promise;
    const data = outcome.data;
    if (!outcome.ok) {
      if (jobId) detailJobs.delete(jobId);
      console.error("[analyze-detail] OpenAI failed", {
        requestId,
        jobId: jobId || null,
        status: outcome.status,
        elapsedMs: Date.now() - startedAt,
      });
      return res.status(outcome.status).json({
        error: data?.error?.message || "Błąd analizy szczegółowej.",
        retryable: outcome.status === 408 || outcome.status === 429 || outcome.status >= 500,
      });
    }
    if (data.status === "incomplete") {
      throw new Error("Analiza szczegółowa nie zwróciła kompletnego wyniku.");
    }

    const text = responseText(data);
    if (!text) throw new Error("Analiza szczegółowa zwróciła pusty wynik.");
    const detail = JSON.parse(text);
    detail.confidence = Math.min(95, Number(detail.confidence) || 0);
    detail.descriptionStandard = "professional_auction_structured_v1";
    detail.literaturePolicyMethod = literaturePolicy.method;
    detail.fingerprint = {
      ...detail.fingerprint,
      rights: "owner_photo",
      createdAt: new Date().toISOString(),
    };
    if (!allowedLiterature.has("kopicki")) {
      detail.kopickiReference = "";
      detail.kopickiRarity = "";
    }
    if (!allowedLiterature.has("tyszkiewicz")) {
      detail.tyszkiewiczReference = "";
      detail.tyszkiewiczValue = "";
    }
    if (!allowedLiterature.has("parchimowicz")) {
      detail.parchimowiczReference = "";
    }
    if (base.userAccepted === true) {
      detail.warnings = [
        ...(detail.warnings || []),
        "Opis szczegółowy wygenerowano na podstawie danych zaakceptowanych po korekcie użytkownika.",
      ];
    }

    console.log("[analyze-detail] success", {
      requestId,
      jobId: jobId || null,
      deduplicated,
      elapsedMs: Date.now() - startedAt,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      reasoningTokens: data.usage?.output_tokens_details?.reasoning_tokens,
    });
    const elapsedMs = Date.now() - startedAt;
    res.setHeader("Server-Timing", `apomonet-detail;dur=${elapsedMs}`);
    res.setHeader("X-Apo-Deduplicated", deduplicated ? "1" : "0");
    return res.status(200).json({
      success: true,
      detail,
      meta: { stage: "detail", elapsedMs, deduplicated },
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    console.error("[analyze-detail] failed", {
      requestId,
      elapsedMs: Date.now() - startedAt,
      name: error?.name,
      message: error?.message,
    });
    return res.status(timedOut ? 504 : 500).json({
      error: timedOut
        ? "Analiza szczegółowa trwała zbyt długo. Zdjęcia i poprawione dane są bezpieczne — spróbuj ponownie."
        : error?.message || "Błąd analizy szczegółowej.",
      retryable: true,
    });
  }
}
