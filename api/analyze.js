export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Dozwolona jest tylko metoda POST." });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return res.status(500).json({
        error: "Brak OPENAI_API_KEY na aktywnym deploymentcie.",
        diagnostic: {
          vercelEnvironment: process.env.VERCEL_ENV || "unknown",
          keyDetected: false
        }
      });
    }

    const body = req.body || {};

    const obverseImage =
      body.obverseImage ||
      body.obverse ||
      (Array.isArray(body.images) ? body.images[0] : null);

    const reverseImage =
      body.reverseImage ||
      body.reverse ||
      (Array.isArray(body.images) ? body.images[1] : null);

    if (!obverseImage && !reverseImage) {
      return res.status(400).json({ error: "Nie przesłano zdjęcia monety." });
    }

    const imageContent = [];

    if (obverseImage) {
      imageContent.push({
        type: "input_image",
        image_url: obverseImage,
        detail: "high"
      });
    }

    if (reverseImage) {
      imageContent.push({
        type: "input_image",
        image_url: reverseImage,
        detail: "high"
      });
    }

    async function callOpenAI(payload) {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("OpenAI error:", data);
        const error = new Error(
          data?.error?.message || "Błąd podczas analizy OpenAI."
        );
        error.status = response.status;
        throw error;
      }

      let outputText = "";

      if (typeof data.output_text === "string" && data.output_text.trim()) {
        outputText = data.output_text.trim();
      }

      if (!outputText && Array.isArray(data.output)) {
        for (const item of data.output) {
          if (item.type === "message" && Array.isArray(item.content)) {
            for (const part of item.content) {
              if (part.type === "output_text" && typeof part.text === "string") {
                outputText += part.text;
              }
            }
          }
        }
      }

      if (!outputText) {
        throw new Error("Model nie zwrócił wyniku analizy.");
      }

      try {
        return JSON.parse(outputText);
      } catch {
        console.error("Błąd parsowania JSON:", outputText);
        throw new Error("Nie udało się odczytać wyniku analizy.");
      }
    }

    // ETAP 1: najpierw tylko obserwacje. Model nie ma tu prawa identyfikować monety.
    const evidence = await callOpenAI({
      model: "gpt-5.6",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Jesteś analitykiem obrazu specjalizującym się w numizmatyce.

ETAP 1: NIE IDENTYFIKUJ MONETY. NIE PODAWAJ KRÓLA, NOMINAŁU ANI ROCZNIKA NA PODSTAWIE PAMIĘCI.
Masz wyłącznie opisać to, co rzeczywiście widać na zdjęciach.

Wykonaj bardzo ostrożny odczyt:
- legendy awersu i rewersu, znak po znaku; nieczytelne fragmenty oznacz [?],
- wszystkich widocznych cyfr i możliwych dat,
- portretu/postaci, kierunku głowy i nakrycia głowy,
- herbów, koron, tarcz, orłów, monogramów i innych symboli,
- znaków menniczych i inicjałów,
- kompozycji obu stron,
- metalu/koloru tylko jako obserwacji wizualnej,
- stopnia czytelności każdego kluczowego elementu.

Jeśli cyfra lub litera jest niepewna, podaj alternatywy zamiast zgadywać.
Nie wolno uzupełniać legendy z pamięci katalogowej.
`
            },
            ...imageContent
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "coin_visual_evidence",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              obverseLegend: { type: "string" },
              reverseLegend: { type: "string" },
              visibleDigits: { type: "array", items: { type: "string" } },
              possibleDates: { type: "array", items: { type: "string" } },
              portraitDescription: { type: "string" },
              reverseDesign: { type: "string" },
              symbols: { type: "array", items: { type: "string" } },
              mintMarks: { type: "array", items: { type: "string" } },
              uncertainReadings: { type: "array", items: { type: "string" } },
              visualCondition: { type: "string" },
              evidenceQuality: { type: "integer", minimum: 0, maximum: 100 }
            },
            required: [
              "obverseLegend",
              "reverseLegend",
              "visibleDigits",
              "possibleDates",
              "portraitDescription",
              "reverseDesign",
              "symbols",
              "mintMarks",
              "uncertainReadings",
              "visualCondition",
              "evidenceQuality"
            ]
          }
        }
      }
    });

    // ETAP 2: identyfikacja musi być uzasadniona obserwacjami z etapu 1.
    const analysis = await callOpenAI({
      model: "gpt-5.6",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Jesteś konserwatywnym ekspertem numizmatycznym pracującym dla domu aukcyjnego.

Poniżej znajduje się niezależny odczyt cech monety wykonany w ETAPIE 1:
${JSON.stringify(evidence, null, 2)}

ETAP 2: na tej podstawie oraz na podstawie zdjęć spróbuj zidentyfikować monetę.

Zasady krytyczne:
1. Najpierw porównaj co najmniej 2 możliwe identyfikacje, jeśli materiał dowodowy nie jest jednoznaczny.
2. Król/emitent, rok i nominał muszą wynikać z widocznej legendy, daty, portretu, herbu lub typu. Nie zgaduj ich z samego stylu.
3. Jeśli widoczny rok jest niepewny, nie wybieraj jednej daty na siłę. Użyj "Nie ustalono" albo zakresu/alternatyw.
4. Jeśli legenda przeczy proponowanemu władcy lub typowi, odrzuć tę identyfikację.
5. Nie podawaj wagi ani średnicy ze zdjęcia bez skali. W takim przypadku wpisz "Nie ustalono".
6. Nie przypisuj numeru katalogowego bez wysokiej pewności. Gdy brak pewności, wpisz "Nie zweryfikowano katalogowo".
7. Wycena jest dozwolona dopiero po identyfikacji. Przy confidence poniżej 70 wpisz "Nie wyceniono – identyfikacja zbyt niepewna".
8. Confidence ma odzwierciedlać jakość dowodów, a nie pewność języka odpowiedzi.
9. Jeśli dowody nie wystarczają, lepsza jest odpowiedź "Nie ustalono" niż błędna identyfikacja.
10. Odpowiedź musi być po polsku.
`
            },
            ...imageContent
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "coin_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              nominal: { type: "string" },
              ruler: { type: "string" },
              year: { type: "string" },
              mint: { type: "string" },
              variant: { type: "string" },
              grade: { type: "string" },
              rarity: { type: "string" },
              estimatedPrice: { type: "string" },
              priceRange: { type: "string" },
              weight: { type: "string" },
              diameter: { type: "string" },
              source: { type: "string" },
              confidence: { type: "integer", minimum: 0, maximum: 100 },
              evidenceSummary: { type: "array", items: { type: "string" } },
              alternatives: { type: "array", items: { type: "string" } },
              warnings: { type: "array", items: { type: "string" } }
            },
            required: [
              "title",
              "nominal",
              "ruler",
              "year",
              "mint",
              "variant",
              "grade",
              "rarity",
              "estimatedPrice",
              "priceRange",
              "weight",
              "diameter",
              "source",
              "confidence",
              "evidenceSummary",
              "alternatives",
              "warnings"
            ]
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      analysis,
      evidence
    });
  } catch (error) {
    console.error("APOMONET backend error:", error);

    return res.status(error?.status || 500).json({
      error: error?.message || "Wewnętrzny błąd serwera APOMONET."
    });
  }
}
