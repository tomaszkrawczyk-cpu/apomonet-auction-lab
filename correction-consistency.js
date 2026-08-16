(() => {
  const IDENTITY_FIELDS = ["nominal", "ruler", "year", "mint", "metal"];

  function clean(value) {
    return String(value ?? "").trim();
  }

  function comparable(value) {
    return clean(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pl-PL");
  }

  function canonical(coin) {
    return [coin.nominal, coin.ruler, coin.mint, coin.year]
      .map(clean)
      .filter((value) => value && value !== "Nie ustalono")
      .join(" • ");
  }

  function changedFields(coin) {
    const raw = coin?.rawAI;
    if (!raw) return [];
    return IDENTITY_FIELDS.filter((key) => {
      const accepted = clean(coin[key]);
      const original = clean(raw[key]);
      return accepted && comparable(accepted) !== comparable(original);
    });
  }

  function differsFromRaw(coin) {
    return changedFields(coin).length > 0;
  }

  function consistencyKey(coin) {
    return IDENTITY_FIELDS.map((key) => comparable(coin?.[key])).join("|");
  }

  function acceptedIdentity(coin) {
    const rows = [
      ["Nominał", coin.nominal],
      ["Władca / emitent", coin.ruler],
      ["Rok", coin.year],
      ["Mennica", coin.mint],
      ["Metal", coin.metal],
    ].filter(([, value]) => clean(value) && clean(value) !== "Nie ustalono");
    return rows.map(([label, value]) => `${label}: ${clean(value)}.`).join(" ");
  }

  function splitSentences(value) {
    return clean(value)
      .split(/(?<=[.!?])\s+/u)
      .map(clean)
      .filter(Boolean);
  }

  function mentions(value, needle) {
    const normalized = comparable(needle);
    return normalized.length > 1 && comparable(value).includes(normalized);
  }

  function shouldDiscardSentence(sentence, coin, changed, index) {
    if (!sentence) return true;
    if (index === 0) return true;
    const normalized = comparable(sentence);
    const raw = coin.rawAI || {};

    for (const key of changed) {
      if (mentions(sentence, raw[key])) return true;
    }

    if (
      changed.includes("mint") &&
      /mennic|mint|atelier|munzstatte|ceca/u.test(normalized) &&
      !mentions(sentence, coin.mint)
    ) {
      return true;
    }
    if (
      changed.includes("year") &&
      /\b(rok|roku|year|jahr|annee)\b/u.test(normalized) &&
      !mentions(sentence, coin.year)
    ) {
      return true;
    }
    if (
      changed.includes("nominal") &&
      /nominal|nominalu|denomination|nominale/u.test(normalized) &&
      !mentions(sentence, coin.nominal)
    ) {
      return true;
    }
    return false;
  }

  function reconcileDescription(coin) {
    if (!coin?.userAccepted) return coin;
    const changed = changedFields(coin);
    if (!changed.length) return coin;

    const key = consistencyKey(coin);
    if (coin.descriptionConsistencyKey === key) return coin;

    const source = clean(
      coin.fullDescription ||
        coin.description ||
        coin.rawAI?.fullDescription ||
        coin.rawAI?.description,
    );
    const changedValuesArePresent = changed.every((field) => mentions(source, coin[field]));
    if (changedValuesArePresent) {
      return {
        ...coin,
        descriptionConsistencyKey: key,
        descriptionReconciledAt: new Date().toISOString(),
      };
    }

    const observations = splitSentences(source).filter(
      (sentence, index) => !shouldDiscardSentence(sentence, coin, changed, index),
    );
    const summary = acceptedIdentity(coin);
    const description = [summary, ...observations].filter(Boolean).join(" ");
    if (!description) return coin;

    return {
      ...coin,
      description,
      fullDescription: description,
      descriptionConsistencyKey: key,
      descriptionReconciledAt: new Date().toISOString(),
      descriptionSource: "accepted-correction",
    };
  }

  function normalizeCoin(coin) {
    if (!coin || !coin.userAccepted || !differsFromRaw(coin)) return coin;
    let normalized = { ...coin };
    const title = canonical(normalized);
    if (title) normalized.title = title;
    normalized.canonicalTitle = title || normalized.title || "";
    normalized.needsReanalysis = true;
    normalized = reconcileDescription(normalized);
    if (
      /data nie została odczytana|nominał.*wymaga|konfliktu rok|wstrzymana/i.test(
        clean(normalized.valuationNote),
      )
    ) {
      normalized.estimateLow = 0;
      normalized.estimateHigh = 0;
      normalized.estimatedPrice = "";
      normalized.priceRange = "";
      normalized.valuationNote =
        "Wycena wymaga ponownej analizy po korekcie danych zaakceptowanych przez użytkownika.";
    }
    return normalized;
  }

  function normalizeState() {
    if (!window.ApoMonet) return;
    const state = ApoMonet.load();
    let changed = false;
    state.coins = (state.coins || []).map((coin) => {
      const normalized = normalizeCoin(coin);
      if (JSON.stringify(normalized) !== JSON.stringify(coin)) changed = true;
      return normalized;
    });
    if (changed) ApoMonet.save(state);
  }

  function repairExport() {
    if (!location.pathname.endsWith("export.html")) return;
    normalizeState();
    const ids = JSON.parse(sessionStorage.getItem("apomonet_export_ids") || "[]");
    const state = ApoMonet.load();
    let coins = (state.coins || []).filter((coin) => ids.includes(coin.id));
    if (!coins.length) {
      try {
        coins = JSON.parse(sessionStorage.getItem("apomonet_demo_export_coins") || "[]");
      } catch {
        coins = [];
      }
    }
    document.querySelectorAll(".export-card").forEach((card, index) => {
      const coin = normalizeCoin(coins[index]);
      if (!coin) return;
      const heading = card.querySelector("h2");
      if (heading) heading.textContent = coin.canonicalTitle || coin.title || "Moneta";
      const cells = [...card.querySelectorAll(".data-grid div")];
      for (const element of cells) {
        const label = element.querySelector("span")?.textContent.trim();
        if (label === "Wycena" && coin.needsReanalysis) {
          element.innerHTML =
            "<span>Wycena</span>Wymaga ponownej analizy po korekcie danych użytkownika.";
        }
      }
    });
  }

  function afterSubmit() {
    if (!location.pathname.endsWith("coin-edit.html")) return;
    const form = document.getElementById("form");
    if (!form) return;
    form.addEventListener("submit", () =>
      setTimeout(() => {
        normalizeState();
        const id = new URLSearchParams(location.search).get("id");
        const coin = id ? ApoMonet.getCoin(id) : null;
        if (coin) {
          const title = document.getElementById("title");
          const description = document.getElementById("description");
          if (title && coin.canonicalTitle) title.value = coin.canonicalTitle;
          if (description && coin.description) description.value = coin.description;
        }
      }, 0),
    );
  }

  window.ApoCorrectionConsistency = Object.freeze({
    changedFields,
    reconcileDescription,
    normalizeCoin,
    normalizeState,
  });

  function init() {
    normalizeState();
    afterSubmit();
    repairExport();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
