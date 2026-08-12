export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Dozwolona jest tylko metoda POST." });

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return res.status(500).json({ error: "Brak OPENAI_API_KEY na aktywnym deploymentcie." });

    const body = req.body || {};
    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    const obverseImage = body.obverseImage || body.obverse || images[0] || null;
    const reverseImage = body.reverseImage || body.reverse || images[1] || null;
    if (!obverseImage || !reverseImage) return res.status(400).json({ error: "Potrzebne są dwa zdjęcia: awers i rewers." });

    const content = [
      {
        type: "input_text",
        text: `Jesteś ekspertem numizmatycznym analizującym awers i rewers tej samej monety.

NAJWAŻNIEJSZA ZASADA: DATA WIDOCZNA NA MONECIE JEST TWARDYM DOWODEM, NIE PODPOWIEDZIĄ.

Pracuj w tej kolejności:
A. ODCZYT DATY
- Znajdź na obu stronach wszystkie grupy cyfr, które mogą być datą.
- Odczytaj każdą cyfrę osobno od lewej do prawej.
- Zwróć dateDigits jako dokładnie cztery elementy, np. ["1","5","5","1"].
- Dla każdej cyfry podaj pewność 0-100 w dateDigitConfidence.
- visibleDateReading ma być złożeniem tych czterech cyfr WYŁĄCZNIE wtedy, gdy są wizualnie odczytane.
- Nie wolno zmieniać widocznej daty dlatego, że inny rocznik lepiej pasuje do znanego typu monety.

B. ODCZYT LEGENDY I SYMBOLI
- Transkrybuj tylko litery rzeczywiście widoczne. Nie uzupełniaj legendy z pamięci.
- Opisz portret, herb, koronę, monogram, znaki mennicze i kompozycję rewersu.

C. IDENTYFIKACJA
- Dopiero po A i B wybierz władcę/emitenta, nominał i typ.
- Każdy kandydat, którego okres panowania/emisji jest sprzeczny z pewnie odczytaną datą, MUSI zostać odrzucony.
- Jeśli data jest np. 1551, nie wolno zwrócić 1538 ani władcy, który nie mógł emitować tej monety w 1551.
- ruler i year muszą być wzajemnie zgodne oraz zgodne z legendą, portretem i rewersem.
- Jeśli nie potrafisz znaleźć zgodnego kandydata, wpisz "Nie ustalono" zamiast dopasowywać błędny typ.

D. KONTROLA KOŃCOWA
Przed odpowiedzią wykonaj kontrolę:
1. Czy year jest identyczny z visibleDateReading, jeśli data została pewnie odczytana?
2. Czy ruler mógł emitować monetę w tym roku?
3. Czy legenda i symbole wspierają tego emitenta?
Jeżeli którakolwiek odpowiedź brzmi NIE, nie zatwierdzaj identyfikacji i obniż confidence.

Nie zgaduj wagi ani średnicy bez skali. Nie przypisuj numeru katalogowego bez wysokiej pewności. Przy confidence <70 nie wyceniaj. Odpowiadaj po polsku.`
      },
      { type: "input_image", image_url: obverseImage, detail: "high" },
      { type: "input_image", image_url: reverseImage, detail: "high" }
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5.6",
        input: [{ role: "user", content }],
        text: { format: { type: "json_schema", name: "coin_analysis", strict: true, schema: {
          type: "object", additionalProperties: false,
          properties: {
            title: { type: "string" }, nominal: { type: "string" }, ruler: { type: "string" }, year: { type: "string" },
            mint: { type: "string" }, variant: { type: "string" }, grade: { type: "string" }, rarity: { type: "string" },
            estimatedPrice: { type: "string" }, priceRange: { type: "string" }, weight: { type: "string" }, diameter: { type: "string" },
            source: { type: "string" }, confidence: { type: "integer", minimum: 0, maximum: 100 },
            obverseLegend: { type: "string" }, reverseLegend: { type: "string" }, visibleDateReading: { type: "string" },
            dateDigits: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
            dateDigitConfidence: { type: "array", items: { type: "integer", minimum: 0, maximum: 100 }, minItems: 4, maxItems: 4 },
            evidenceSummary: { type: "array", items: { type: "string" } }, alternatives: { type: "array", items: { type: "string" } },
            rejectedCandidates: { type: "array", items: { type: "string" } }, warnings: { type: "array", items: { type: "string" } }
          },
          required: ["title","nominal","ruler","year","mint","variant","grade","rarity","estimatedPrice","priceRange","weight","diameter","source","confidence","obverseLegend","reverseLegend","visibleDateReading","dateDigits","dateDigitConfidence","evidenceSummary","alternatives","rejectedCandidates","warnings"]
        } } }
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Błąd podczas analizy OpenAI." });

    let outputText = typeof data.output_text === "string" ? data.output_text.trim() : "";
    if (!outputText && Array.isArray(data.output)) for (const item of data.output) if (item.type === "message" && Array.isArray(item.content)) for (const part of item.content) if (part.type === "output_text" && typeof part.text === "string") outputText += part.text;
    if (!outputText) return res.status(500).json({ error: "Model nie zwrócił wyniku analizy." });

    let analysis;
    try { analysis = JSON.parse(outputText); } catch { return res.status(500).json({ error: "Nie udało się odczytać wyniku analizy." }); }

    // Programowa blokada: jeśli model sam odczytał pewną datę, nie może zwrócić innego roku.
    const digits = Array.isArray(analysis.dateDigits) ? analysis.dateDigits : [];
    const digitConfidence = Array.isArray(analysis.dateDigitConfidence) ? analysis.dateDigitConfidence : [];
    const visualYear = digits.length === 4 && digits.every(d => /^\d$/.test(String(d))) ? digits.join("") : null;
    const dateIsStrong = visualYear && digitConfidence.length === 4 && digitConfidence.every(v => Number(v) >= 70);

    if (dateIsStrong) {
      analysis.visibleDateReading = visualYear;
      if (analysis.year !== visualYear) {
        analysis.warnings = [...(analysis.warnings || []), `Automatyczna kontrola odrzuciła rok ${analysis.year}: obraz został odczytany jako ${visualYear}.`];
        analysis.year = visualYear;
        analysis.confidence = Math.min(Number(analysis.confidence) || 0, 65);
        analysis.ruler = "Nie ustalono – wymaga zgodności z odczytanym rokiem";
        analysis.title = "Identyfikacja niezatwierdzona";
        analysis.estimatedPrice = "Nie wyceniono – identyfikacja zbyt niepewna";
        analysis.priceRange = "Nie wyceniono – identyfikacja zbyt niepewna";
      }
    }

    return res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error("APOMONET backend error:", error);
    return res.status(500).json({ error: error?.message || "Wewnętrzny błąd serwera APOMONET." });
  }
}
