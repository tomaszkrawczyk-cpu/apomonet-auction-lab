(() => {
  const CACHE_KEY = "apomonet_collection_translation_cache_v1";
  const FIELDS = ["title", "country", "ruler", "nominal", "metal", "mint", "variant", "grade", "rarity"];
  const MAX_ITEMS = 60;
  const localizedById = new Map();
  let sourceTranslations = new Map();
  let applyTimer = null;

  function language() {
    return window.ApoAnalysisI18n?.currentLanguage?.() || "pl";
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
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify(Object.fromEntries(Object.entries(cache).slice(-20))),
      );
    } catch {}
  }

  function visibleRecords() {
    if (!window.ApoMonet) return [];
    const state = ApoMonet.load();
    const byId = new Map((state.coins || []).map((coin) => [coin.id, coin]));
    const ids = [...document.querySelectorAll(".coin-card .coin-pick")]
      .map((input) => input.dataset.id)
      .filter(Boolean);
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  function buildItems(records) {
    const items = [];
    const keyBySource = new Map();
    for (const record of records) {
      for (const field of FIELDS) {
        const text = String(record?.[field] ?? "").trim();
        if (!text) continue;
        const sourceKey = `${field}\u0000${text}`;
        if (keyBySource.has(sourceKey)) continue;
        if (items.length >= MAX_ITEMS) return { items, keyBySource };
        const key = `summary.${items.length}.${field}`;
        keyBySource.set(sourceKey, key);
        items.push({ key, text });
      }
    }
    return { items, keyBySource };
  }

  function buildLocalized(records, keyBySource, translations) {
    localizedById.clear();
    sourceTranslations = new Map();
    for (const [sourceKey, key] of keyBySource) {
      const translated = translations[key];
      if (translated) sourceTranslations.set(sourceKey, translated);
    }
    for (const record of records) {
      const shown = { ...record };
      for (const field of FIELDS) {
        const text = String(record?.[field] ?? "").trim();
        shown[field] = sourceTranslations.get(`${field}\u0000${text}`) || record[field];
      }
      localizedById.set(record.id, shown);
    }
  }

  function translatedValue(field, original) {
    const text = String(original ?? "").trim();
    return sourceTranslations.get(`${field}\u0000${text}`) || original;
  }

  function setText(element, value) {
    if (!element) return;
    const text = String(value ?? "");
    if (element.textContent !== text) element.textContent = text;
  }

  function applyCards() {
    const albumPage = location.pathname.endsWith("user-album.html");
    document.querySelectorAll(".coin-card").forEach((card) => {
      const id = card.querySelector(".coin-pick")?.dataset.id;
      const shown = localizedById.get(id);
      if (!shown) return;
      setText(card.querySelector("h2"), shown.title || "Moneta");
      const details = albumPage
        ? [shown.ruler, shown.nominal, shown.mint, shown.metal]
        : [shown.nominal, shown.ruler, shown.mint, shown.metal];
      setText(card.querySelector(":scope > p"), details.filter(Boolean).join(" • "));
    });

    const filters = {
      rulerFilter: "ruler",
      nominalFilter: "nominal",
      mintFilter: "mint",
      metalFilter: "metal",
    };
    for (const [id, field] of Object.entries(filters)) {
      const select = document.getElementById(id);
      if (!select) continue;
      [...select.options].slice(1).forEach((option) => {
        setText(option, translatedValue(field, option.value));
      });
    }
  }

  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(applyCards, 0);
  }

  async function localize() {
    if (language() === "pl") return;
    const records = visibleRecords();
    const { items, keyBySource } = buildItems(records);
    if (!items.length) return;
    const cacheKey = `${language()}:${hash(JSON.stringify(items))}`;
    const cache = loadCache();
    let translations = cache[cacheKey];
    if (!translations) {
      const response = await fetch("/api/translate-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: language(), items }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Nie udało się przetłumaczyć listy monet.");
      }
      translations = data.translations || {};
      cache[cacheKey] = translations;
      saveCache(cache);
    }
    buildLocalized(records, keyBySource, translations);
    applyCards();
  }

  function mount() {
    const list = document.getElementById("coins") || document.getElementById("list");
    if (!list || !window.ApoMonet) return;
    new MutationObserver(scheduleApply).observe(list, { childList: true, subtree: true });
    localize().catch((error) => console.warn("[collection-translation]", error));
  }

  window.ApoCollectionI18n = { buildItems, translatedValue };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
