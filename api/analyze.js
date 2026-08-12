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
    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    const obverseImage = body.obverseImage || body.obverse || images[0] || null;
    const reverseImage = body.reverseImage || body.reverse || images[1] || null;

    if (!obverseImage || !reverseImage) {
      return res.status(400).json({ error: "Potrzebne są dwa zdjęcia: awers i rewers." });
    }

    const content = [
      {
        type: "input_text",
        text: `
Jesteś konserwatywnym ekspertem numizmatycznym. Otrzymujesz dwa zdjęcia tej samej monety: awers i rewers.

Wykonaj analizę W JEDNYM PRZEBIEGU, ale zachowaj następującą kolejność wewnętrzną:
1. Najpierw odczytaj wyłącznie cechy widoczne na zdjęciach: legendy, cyfry, możliwą datę, portret, herby, symbole, monogramy, znaki mennicze i kompozycję obu stron.
2. Dopiero potem identyfikuj monetę na podstawie tych cech.
3. Sprawdź, czy proponowany władca/emitent, nominał i rok są zgodne z legendą, cyframi, portretem i rewersem.
4. Jeśli są co najmniej dwie sensowne identyfikacje, podaj najlepszą oraz alternatywy.

Zasady bezwzględne:
- Nie uzupełniaj nieczytelnej legendy z pamięci.
- Nie zgaduj roku. Jeśli cyfry są niepewne, wpisz "Nie ustalono" i opisz możliwe odczyty.
- Nie zgaduj władcy wyłącznie po stylu portretu.
- Jeśli dowody są sprzeczne, obniż confidence i wyjaśnij sprzeczność.
- Nie podawaj wagi ani średnicy bez skali; wpisz "Nie ustalono".
- Nie przypisuj konkretnego numeru katalogowego bez wysokiej pewności; wpisz "Nie zweryfikowano katalogowo".
- Przy confidence < 70 nie podawaj wyceny; wpisz "Nie wyceniono – identyfikacja zbyt niepewna".
- Lepiej napisać "Nie ustalono" niż podać błędną informację.
- Odpowiedź po polsku.
`
      },
      { type: "input_image", image_url: obverseImage, detail: "high" },
      { type: "input_image", image_url: reverseImage, detail: "high" }
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-5.6",
        input: [{ role: "user", content }],
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
                obverseLegend: { type: "string" },
                reverseLegend: { type: "string" },
                visibleDateReading: { type: "string" },
                evidenceSummary: { type: "array", items: { type: "string" } },
                alternatives: { type: "array", items: { type: "string" } },
                warnings: { type: "array", items: { type: "string" } }
              },
              required: [
                "title", "nominal", "ruler", "year", "mint", "variant",
                "grade", "rarity", "estimatedPrice", "priceRange", "weight",
                "diameter", "source", "confidence", "obverseLegend",
                "reverseLegend", "visibleDateReading", "evidenceSummary",
                "alternatives", "warnings"
              ]
            }
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(response.status).json({
        error: data?.error?.message || "Błąd podczas analizy OpenAI."
      });
    }

    let outputText = typeof data.output_text === "string" ? data.output_text.trim() : "";
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
      return res.status(500).json({ error: "Model nie zwrócił wyniku analizy." });
    }

    let analysis;
    try {
      analysis = JSON.parse(outputText);
    } catch {
      console.error("Błąd parsowania JSON:", outputText);
      return res.status(500).json({ error: "Nie udało się odczytać wyniku analizy." });
    }

    return res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error("APOMONET backend error:", error);
    return res.status(500).json({
      error: error?.message || "Wewnętrzny błąd serwera APOMONET."
    });
  }
}
