(() => {
  const LANGUAGE_KEY = "apomonet_language_v2";
  const CACHE_KEY = "apomonet_analysis_translation_cache_v2";
  const SUPPORTED = new Set(["en", "de", "fr"]);
  const STRING_FIELDS = [
    "title",
    "country",
    "ruler",
    "nominal",
    "metal",
    "mint",
    "variant",
    "grade",
    "rarity",
    "imageQualityNote",
    "denominationEvidence",
    "valuationNote",
    "description",
    "fullDescription",
  ];
  const ARRAY_FIELDS = ["warnings", "followUpQuestions"];
  const DETAIL_STRING_FIELDS = [
    "variant",
    "kopickiRarity",
    "obverseDetails",
    "reverseDetails",
    "legendPunctuation",
    "fullDescription",
  ];
  const DETAIL_ARRAY_FIELDS = ["warnings", "diagnosticFeatures"];

  const clone = (value) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return value && typeof value === "object" ? { ...value } : value;
    }
  };

  function currentLanguage() {
    return localStorage.getItem(LANGUAGE_KEY) || "pl";
  }

  function flatten(record) {
    const items = [];
    const add = (key, value) => {
      const text = String(value ?? "").trim();
      if (text) items.push({ key, text });
    };
    for (const key of STRING_FIELDS) add(key, record?.[key]);
    for (const key of ARRAY_FIELDS) {
      (Array.isArray(record?.[key]) ? record[key] : []).forEach((text, index) =>
        add(`${key}.${index}`, text),
      );
    }
    for (const key of DETAIL_STRING_FIELDS) add(`detail.${key}`, record?.detail?.[key]);
    for (const key of DETAIL_ARRAY_FIELDS) {
      (Array.isArray(record?.detail?.[key]) ? record.detail[key] : []).forEach(
        (text, index) => add(`detail.${key}.${index}`, text),
      );
    }
    return items.slice(0, 60);
  }

  function hash(value) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index++) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
  }

  function loadCache() {
    try {
      const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  }

  function saveCache(cache) {
    try {
      const entries = Object.entries(cache).slice(-20);
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch {}
  }

  function translatedArray(source, prefix, translations) {
    return (Array.isArray(source) ? source : []).map(
      (value, index) => translations[`${prefix}.${index}`] || value,
    );
  }

  function apply(record, translations, language) {
    const localized = clone(record) || {};
    for (const key of STRING_FIELDS) {
      if (translations[key]) localized[key] = translations[key];
    }
    for (const key of ARRAY_FIELDS) {
      if (Array.isArray(localized[key])) {
        localized[key] = translatedArray(localized[key], key, translations);
      }
    }
    if (localized.detail && typeof localized.detail === "object") {
      for (const key of DETAIL_STRING_FIELDS) {
        if (translations[`detail.${key}`]) {
          localized.detail[key] = translations[`detail.${key}`];
        }
      }
      for (const key of DETAIL_ARRAY_FIELDS) {
        if (Array.isArray(localized.detail[key])) {
          localized.detail[key] = translatedArray(
            localized.detail[key],
            `detail.${key}`,
            translations,
          );
        }
      }
    }
    localized.displayLanguage = language;
    return localized;
  }

  function usefulTranslations(items, translations) {
    const source = new Map(items.map((item) => [item.key, item.text]));
    let translated = 0;
    let changed = 0;
    for (const [key, value] of Object.entries(translations || {})) {
      const text = String(value || "").trim();
      if (!source.has(key) || !text) continue;
      translated++;
      if (text !== String(source.get(key) || "").trim()) changed++;
    }
    return { translated, changed };
  }

  async function requestTranslation(items, language) {
    const response = await fetch("/api/translate-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, items }),
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("Serwer nie zwrócił poprawnego tłumaczenia.");
    }
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Nie udało się przetłumaczyć analizy.");
    }
    return data.translations || {};
  }

  async function localize(record, language = currentLanguage()) {
    if (!record || language === "pl" || !SUPPORTED.has(language)) return record;
    const items = flatten(record);
    if (!items.length) return record;
    const cacheKey = `${language}:${hash(JSON.stringify(items))}`;
    const cache = loadCache();
    if (cache[cacheKey]) {
      const quality = usefulTranslations(items, cache[cacheKey]);
      if (quality.translated && quality.changed) {
        return apply(record, cache[cacheKey], language);
      }
      delete cache[cacheKey];
      saveCache(cache);
    }

    const translations = await requestTranslation(items, language);
    const quality = usefulTranslations(items, translations);
    if (!quality.translated || !quality.changed) {
      throw new Error("Tłumaczenie nie zmieniło treści analizy. Spróbuj ponownie.");
    }
    cache[cacheKey] = translations;
    saveCache(cache);
    return apply(record, translations, language);
  }

  function message(key, language = currentLanguage()) {
    const messages = {
      translating: {
        pl: "Tłumaczę najważniejsze dane i opis monety…",
        en: "Translating the coin data and description…",
        de: "Münzdaten und Beschreibung werden übersetzt…",
        fr: "Traduction des données et de la description…",
      },
      failed: {
        pl: "Nie udało się przetłumaczyć opisu. Oryginalny wynik pozostaje dostępny.",
        en: "The description could not be translated. The original result remains available.",
        de: "Die Beschreibung konnte nicht übersetzt werden. Das Original bleibt verfügbar.",
        fr: "La description n’a pas pu être traduite. Le résultat original reste disponible.",
      },
    };
    return messages[key]?.[language] || messages[key]?.pl || "";
  }

  window.ApoAnalysisI18n = { currentLanguage, flatten, apply, localize, message };
})();
