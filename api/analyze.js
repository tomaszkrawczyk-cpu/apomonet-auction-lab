export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Dozwolona jest tylko metoda POST."
    });
  }

  try {
    /*
      ========================================
      KLUCZ OPENAI
      ========================================
    */

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


    /*
      ========================================
      ODCZYT ZDJĘĆ
      ========================================

      Obsługujemy zarówno starszy format:
      obverseImage / reverseImage

      jak i obecny index.html:
      obverse / reverse / images
    */

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
      return res.status(400).json({
        error: "Nie przesłano zdjęcia monety."
      });
    }


    /*
      ========================================
      PROMPT DLA MODELU
      ========================================
    */

    const content = [
      {
        type: "input_text",
        text: `
Jesteś ekspertem numizmatycznym pracującym dla domu aukcyjnego.

Przeanalizuj dostarczone zdjęcia monety.

Jeżeli otrzymałeś awers i rewers, analizuj je łącznie jako dwie strony tej samej monety.

Twoim zadaniem jest możliwie precyzyjnie ustalić:

- tytuł monety,
- nominał,
- władcę lub emitenta,
- rok,
- mennicę,
- odmianę lub typ,
- przybliżony stan zachowania,
- klasę rzadkości,
- przybliżoną wartość rynkową,
- orientacyjny zakres aukcyjny,
- wagę,
- średnicę,
- możliwe katalogi lub źródła,
- procentową pewność identyfikacji.

Bardzo ważne:

1. Nie wymyślaj danych.
2. Jeżeli czegoś nie można wiarygodnie ustalić ze zdjęcia, wpisz "Nie ustalono".
3. Odróżniaj fakty widoczne na zdjęciu od przypuszczeń.
4. Nie przedstawiaj niepewnej identyfikacji jako pewnej.
5. Wycena ma być ostrożna i orientacyjna.
6. Jeżeli identyfikacja jest niepewna, zaznacz to i odpowiednio obniż confidence.
7. Odpowiedź musi być po polsku.
`
      }
    ];


    /*
      ========================================
      AWERS
      ========================================
    */

    if (obverseImage) {
      content.push({
        type: "input_image",
        image_url: obverseImage,
        detail: "high"
      });
    }


    /*
      ========================================
      REWERS
      ========================================
    */

    if (reverseImage) {
      content.push({
        type: "input_image",
        image_url: reverseImage,
        detail: "high"
      });
    }


    /*
      ========================================
      WYWOŁANIE OPENAI
      ========================================
    */

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model: "gpt-5.6",

          input: [
            {
              role: "user",
              content
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
                  title: {
                    type: "string"
                  },

                  nominal: {
                    type: "string"
                  },

                  ruler: {
                    type: "string"
                  },

                  year: {
                    type: "string"
                  },

                  mint: {
                    type: "string"
                  },

                  variant: {
                    type: "string"
                  },

                  grade: {
                    type: "string"
                  },

                  rarity: {
                    type: "string"
                  },

                  estimatedPrice: {
                    type: "string"
                  },

                  priceRange: {
                    type: "string"
                  },

                  weight: {
                    type: "string"
                  },

                  diameter: {
                    type: "string"
                  },

                  source: {
                    type: "string"
                  },

                  confidence: {
                    type: "integer",
                    minimum: 0,
                    maximum: 100
                  }
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
                  "confidence"
                ]
              }
            }
          }
        })
      }
    );


    /*
      ========================================
      ODPOWIEDŹ OPENAI
      ========================================
    */

    const data = await response.json();


    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Błąd podczas analizy OpenAI."
      });
    }


    /*
      ========================================
      WYCIĄGNIĘCIE TEKSTU
      ========================================
    */

    let outputText = "";

    if (
      typeof data.output_text === "string" &&
      data.output_text.trim()
    ) {
      outputText = data.output_text.trim();
    }


    if (
      !outputText &&
      Array.isArray(data.output)
    ) {
      for (const item of data.output) {
        if (
          item.type === "message" &&
          Array.isArray(item.content)
        ) {
          for (const part of item.content) {
            if (
              part.type === "output_text" &&
              typeof part.text === "string"
            ) {
              outputText += part.text;
            }
          }
        }
      }
    }


    if (!outputText) {
      console.error(
        "Model nie zwrócił output_text:",
        data
      );

      return res.status(500).json({
        error: "Model nie zwrócił wyniku analizy."
      });
    }


    /*
      ========================================
      PARSOWANIE JSON
      ========================================
    */

    let analysis;

    try {
      analysis = JSON.parse(outputText);
    } catch (parseError) {
      console.error(
        "Błąd parsowania JSON:",
        outputText
      );

      return res.status(500).json({
        error: "Nie udało się odczytać wyniku analizy."
      });
    }


    /*
      ========================================
      GOTOWA ODPOWIEDŹ
      ========================================
    */

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error(
      "APOMONET backend error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Wewnętrzny błąd serwera APOMONET."
    });
  }
}