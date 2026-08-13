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
        text: `Jesteś konserwatywnym ekspertem numizmatycznym. Analizujesz awers i rewers tej samej monety dla profesjonalnej karty katalogowej.

PRIORYTET: poprawna identyfikacja jest ważniejsza niż kompletność odpowiedzi. Jeśli czegoś nie potrafisz ustalić, wpisz "Nie ustalono".

1. DATA
- znajdź wszystkie widoczne grupy cyfr,
- odczytaj rok CYFRA PO CYFRZE,
- dateDigits ma zawierać dokładnie cztery znaki,
- dateDigitConfidence ma zawierać pewność każdej cyfry 0-100,
- nie wolno podmieniać widocznego roku na rocznik lepiej pasujący do zapamiętanego typu.

2. WŁADCA / EMITENT
- ustalaj na podstawie legendy, portretu, tytulatury, herbu, monogramów i roku,
- jeśli proponowany władca nie mógł emitować monety w odczytanym roku, odrzuć go,
- nie identyfikuj władcy wyłącznie po podobieństwie portretu.

3. KATALOG I RZADKOŚĆ
- jeśli potrafisz wiarygodnie wskazać pozycję w katalogu Edmunda Kopickiego, podaj ją w kopickiReference,
- jeśli potrafisz wiarygodnie ustalić stopień rzadkości wg Kopickiego, podaj go w kopickiRarity (np. R, R1, R2...); w przeciwnym razie wpisz "Nie ustalono",
- nie wymyślaj numeru katalogowego ani stopnia rzadkości,
- rarityGeneral może zawierać ogólną ocenę rzadkości, ale musi być odróżniona od klasyfikacji Kopickiego.

4. OPIS
- fullDescription ma być uporządkowanym, profesjonalnym opisem katalogowo-aukcyjnym po polsku,
- zacznij od identyfikacji, potem opisz awers, rewers, legendy, stan i uwagi,
- nie powtarzaj chaotycznie danych, które są już w polach strukturalnych.

5. KONTROLA
Przed odpowiedzią sprawdź: czy year = visibleDateReading, czy ruler pasuje do roku, czy legenda wspiera identyfikację. Jeśli nie — nie zatwierdzaj identyfikacji.

Nie zgaduj wagi ani średnicy bez skali. Przy confidence <70 nie podawaj wyceny. Odpowiadaj po polsku.`
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
            title: { type: "string" },
            country: { type: "string" },
            nominal: { type: "string" },
            ruler: { type: "string" },
            year: { type: "string" },
            mint: { type: "string" },
            metal: { type: "string" },
            variant: { type: "string" },
            grade: { type: "string" },
            rarityGeneral: { type: "string" },
            kopickiReference: { type: "string" },
            kopickiRarity: { type: "string" },
            estimatedPrice: { type: "string" },
            priceRange: { type: "string" },
            weight: { type: "string" },
            diameter: { type: "string" },
            source: { type: "string" },
            confidence: { type: "integer", minimum: 0, maximum: 100 },
            rulerConfidence: { type: "integer", minimum: 0, maximum: 100 },
            yearConfidence: { type: "integer", minimum: 0, maximum: 100 },
            obverseLegend: { type: "string" },
            reverseLegend: { type: "string" },
            visibleDateReading: { type: "string" },
            dateDigits: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
            dateDigitConfidence: { type: "array", items: { type: "integer", minimum: 0, maximum: 100 }, minItems: 4, maxItems: 4 },
            fullDescription: { type: "string" },
            evidenceSummary: { type: "array", items: { type: "string" } },
            alternatives: { type: "array", items: { type: "string" } },
            rejectedCandidates: { type: "array", items: { type: "string" } },
            warnings: { type: "array", items: { type: "string" } }
          },
          required: ["title","country","nominal","ruler","year","mint","metal","variant","grade","rarityGeneral","kopickiReference","kopickiRarity","estimatedPrice","priceRange","weight","diameter","source","confidence","rulerConfidence","yearConfidence","obverseLegend","reverseLegend","visibleDateReading","dateDigits","dateDigitConfidence","fullDescription","evidenceSummary","alternatives","rejectedCandidates","warnings"]
        } } }
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Błąd podczas analizy OpenAI." });

    let outputText = typeof data.output_text === "string" ? data.output_text.trim() : "";
    if (!outputText && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === "message" && Array.isArray(item.content)) {
          for (const part of item.content) {
            if (part.type === "output_text" && typeof part.text === "string") outputText += part.text;
          }
        }
      }
    }
    if (!outputText) return res.status(500).json({ error: "Model nie zwrócił wyniku analizy." });

    let analysis;
    try { analysis = JSON.parse(outputText); }
    catch { return res.status(500).json({ error: "Nie udało się odczytać wyniku analizy." }); }

    const digits = Array.isArray(analysis.dateDigits) ? analysis.dateDigits : [];
    const digitConfidence = Array.isArray(analysis.dateDigitConfidence) ? analysis.dateDigitConfidence : [];
    const visualYear = digits.length === 4 && digits.every(d => /^\d$/.test(String(d))) ? digits.join("") : null;
    const dateIsStrong = visualYear && digitConfidence.length === 4 && digitConfidence.every(v => Number(v) >= 75);

    if (dateIsStrong) {
      analysis.visibleDateReading = visualYear;
      analysis.yearConfidence = Math.max(Number(analysis.yearConfidence) || 0, Math.min(...digitConfidence));
      if (analysis.year !== visualYear) {
        analysis.warnings = [...(analysis.warnings || []), `Kontrola APOMONET odrzuciła rok ${analysis.year}; odczyt obrazu wskazuje ${visualYear}.`];
        analysis.year = visualYear;
        analysis.ruler = "Nie ustalono – wymaga ponownej weryfikacji z rokiem";
        analysis.rulerConfidence = 0;
        analysis.title = "Identyfikacja niezatwierdzona";
        analysis.confidence = Math.min(Number(analysis.confidence) || 0, 55);
        analysis.estimatedPrice = "Nie wyceniono – identyfikacja zbyt niepewna";
        analysis.priceRange = "Nie wyceniono – identyfikacja zbyt niepewna";
        analysis.kopickiReference = "Nie ustalono";
        analysis.kopickiRarity = "Nie ustalono";
      }
    }

    if ((Number(analysis.rulerConfidence) || 0) < 60) {
      analysis.ruler = "Nie ustalono";
      analysis.kopickiReference = "Nie ustalono";
      analysis.kopickiRarity = "Nie ustalono";
    }

    return res.status(200).json({ success: true, analysis });
  } catch (error) {
    console.error("APOMONET backend error:", error);
    return res.status(500).json({ error: error?.message || "Wewnętrzny błąd serwera APOMONET." });
  }
}
