export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Dozwolona jest tylko metoda POST."
    });
  }

  try {

    const apiKey =
      process.env.OPENAI_API_KEY;


    if (!apiKey) {
      return res.status(500).json({
        error: "Brak OPENAI_API_KEY na serwerze."
      });
    }


    const {
      obverseImage,
      reverseImage
    } = req.body || {};


    if (!obverseImage && !reverseImage) {
      return res.status(400).json({
        error: "Nie przesłano zdjęcia monety."
      });
    }


    const content = [

      {
        type: "input_text",
        text:
          `Jesteś ekspertem numizmatycznym pracującym dla domu aukcyjnego.

Przeanalizuj dostarczone zdjęcia monety.

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
- zakres aukcyjny,
- wagę,
- średnicę,
- możliwe katalogi lub źródła,
- procentową pewność identyfikacji.

Bardzo ważne:
1. Nie wymyślaj danych.
2. Jeżeli czegoś nie da się wiarygodnie ustalić ze zdjęcia, wpisz "Nie ustalono".
3. Odróżniaj obserwację ze zdjęcia od przypuszczenia.
4. Nie podawaj fałszywej pewności.
5. Wycena ma być ostrożna i orientacyjna.
6. Jeśli zdjęcia przedstawiają dwie strony tej samej monety, analizuj je łącznie.
7. Jeśli identyfikacja jest niepewna, zaznacz to w polach i obniż confidence.
8. Odpowiedź musi być po polsku.`
      }

    ];


    if (obverseImage) {

      content.push({
        type: "input_image",
        image_url: obverseImage,
        detail: "high"
      });

    }


    if (reverseImage) {

      content.push({
        type: "input_image",
        image_url: reverseImage,
        detail: "high"
      });

    }


    const response =
      await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "Authorization":
              `Bearer ${apiKey}`
          },

          body: JSON.stringify({

            model: "gpt-5.6",

            input: [
              {
                role: "user",
                content: content
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


    const data =
      await response.json();


    if (!response.ok) {

      console.error(
        "OpenAI error:",
        data
      );

      return res.status(
        response.status
      ).json({

        error:
          data?.error?.message ||
          "Błąd podczas analizy OpenAI."

      });

    }


    let outputText = "";


    if (data.output_text) {

      outputText =
        data.output_text;

    } else if (
      Array.isArray(data.output)
    ) {

      for (
        const item of data.output
      ) {

        if (
          item.type === "message" &&
          Array.isArray(item.content)
        ) {

          for (
            const part of item.content
          ) {

            if (
              part.type === "output_text" &&
              part.text
            ) {

              outputText +=
                part.text;

            }

          }

        }

      }

    }


    if (!outputText) {

      console.error(
        "Brak output_text:",
        data
      );

      return res.status(500).json({
        error:
          "Model nie zwrócił wyniku analizy."
      });

    }


    let analysis;


    try {

      analysis =
        JSON.parse(outputText);

    } catch (parseError) {

      console.error(
        "Błąd JSON:",
        outputText
      );

      return res.status(500).json({
        error:
          "Nie udało się odczytać wyniku analizy."
      });

    }


    return res.status(200).json({
      success: true,
      analysis: analysis
    });


  } catch (error) {

    console.error(
      "APOMONET backend error:",
      error
    );


    return res.status(500).json({

      error:
        "Wewnętrzny błąd serwera APOMONET."

    });

  }

}