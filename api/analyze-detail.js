const DETAIL_TIMEOUT_MS = 55_000;

const BASE_FIELDS = [
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
    console.log("[analyze-detail] start", {
      requestId,
      imageChars: images.map((image) => image.length),
      baseChars: JSON.stringify(base).length,
      userAccepted: base.userAccepted === true,
    });

    const content = [
      {
        type: "input_text",
        text: `Jesteś ekspertem numizmatycznym. To DRUGI, opcjonalny etap analizy APOMONET. Dane bazowe mogły zostać ręcznie poprawione przez właściciela. Pola zaakceptowane przez użytkownika są nadrzędnym punktem odniesienia. NIE wracaj automatycznie do wcześniejszego strzału AI.

Dane bazowe po korekcie: ${JSON.stringify(base)}

Najpierw sprawdź zgodność obrazu z ruler/year/nominal/mint/metal. Jeśli widzisz jednoznaczną sprzeczność, NIE nadpisuj tych pól po cichu — dodaj ostrzeżenie. Następnie analizuj odmianę i stempel: interpunkcję, rozstaw daty, położenie daty, początek/koniec legendy w układzie zegarowym, formy liter i cyfr, orientację i proporcje portretu, koronę, herb/tarczę, monogramy, znaki mennicze, pióra/skrzydła/ogon orła oraz rant, jeśli jest widoczny.

Zbuduj fingerprint geometryczno-diagnostyczny. Każda cecha fingerprintu ma wartość tekstową, confidence 0-100 i method. Gdy cechy nie da się wiarygodnie zobaczyć, ustaw value na pusty tekst i confidence=0. NIE zgaduj mikroszczegółów. Pełny opis napisz od nowa zgodnie z poprawionymi danymi bazowymi. Kopicki i rzadkość podawaj WYŁĄCZNIE przy wiarygodnych podstawach. Confidence całej analizy nigdy nie może wynosić 100%. Odpowiadaj zwięźle po polsku.`,
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
        obverseDetails: { type: "string" },
        reverseDetails: { type: "string" },
        legendPunctuation: { type: "string" },
        diagnosticFeatures: { type: "array", items: { type: "string" } },
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
        "obverseDetails",
        "reverseDetails",
        "legendPunctuation",
        "diagnosticFeatures",
        "fingerprint",
        "fullDescription",
        "confidence",
        "warnings",
      ],
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DETAIL_TIMEOUT_MS);
    let openAIResponse;
    try {
      openAIResponse = await fetch("https://api.openai.com/v1/responses", {
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
              name: "coin_detail_v4_fast",
              strict: true,
              schema,
            },
          },
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await openAIResponse.json();
    if (!openAIResponse.ok) {
      console.error("[analyze-detail] OpenAI failed", {
        requestId,
        status: openAIResponse.status,
        elapsedMs: Date.now() - startedAt,
      });
      return res.status(openAIResponse.status).json({
        error: data?.error?.message || "Błąd analizy szczegółowej.",
      });
    }
    if (data.status === "incomplete") {
      throw new Error("Analiza szczegółowa nie zwróciła kompletnego wyniku.");
    }

    const text = responseText(data);
    if (!text) throw new Error("Analiza szczegółowa zwróciła pusty wynik.");
    const detail = JSON.parse(text);
    detail.confidence = Math.min(95, Number(detail.confidence) || 0);
    detail.fingerprint = {
      ...detail.fingerprint,
      rights: "owner_photo",
      createdAt: new Date().toISOString(),
    };
    if (base.userAccepted === true) {
      detail.warnings = [
        ...(detail.warnings || []),
        "Opis szczegółowy wygenerowano na podstawie danych zaakceptowanych po korekcie użytkownika.",
      ];
    }

    console.log("[analyze-detail] success", {
      requestId,
      elapsedMs: Date.now() - startedAt,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
      reasoningTokens: data.usage?.output_tokens_details?.reasoning_tokens,
    });
    return res.status(200).json({ success: true, detail });
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
    });
  }
}
