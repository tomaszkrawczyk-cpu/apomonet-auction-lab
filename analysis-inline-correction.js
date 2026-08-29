(() => {
  const LAST = "apomonetLastAnalysisV1";
  const SESSION = "apomonetAnalysisSession";
  const safeParse = (value, fallback = null) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const clone = (value) => safeParse(JSON.stringify(value), { ...value });
  const esc = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");

  const L = {
    pl: {
      country: "Kraj / obszar", issuer: "Emitent", ruler: "Władca",
      depictedPerson: "Postać na monecie", year: "Rok", nominal: "Nominał",
      metal: "Metal", mint: "Mennica", variant: "Odmiana / typ", grade: "Stan zachowania",
      eyebrow: "Korekta wyniku", title: "Popraw dane przed zapisem",
      hint: "Zmień tylko to, co wymaga korekty. Pierwotny wynik AI pozostanie zachowany w historii analizy.",
      save: "Zastosuj poprawki", cancel: "Anuluj",
      applied: "Poprawki zastosowano. Moneta nie została jeszcze zapisana.",
      button: "✏️ Popraw dane", buttonHint: "Sprawdź i popraw pola przed zapisem.",
    },
    en: {
      country: "Country / area", issuer: "Issuer", ruler: "Ruler",
      depictedPerson: "Person depicted", year: "Year", nominal: "Denomination",
      metal: "Metal", mint: "Mint", variant: "Variety / type", grade: "Condition",
      eyebrow: "Correct result", title: "Correct data before saving",
      hint: "Change only what needs correction. The original AI result will remain in the analysis history.",
      save: "Apply corrections", cancel: "Cancel",
      applied: "Corrections applied. The coin has not been saved yet.",
      button: "✏️ Correct data", buttonHint: "Review and correct the fields before saving.",
    },
    de: {
      country: "Land / Gebiet", issuer: "Emittent", ruler: "Herrscher",
      depictedPerson: "Dargestellte Person", year: "Jahr", nominal: "Nominal",
      metal: "Metall", mint: "Münzstätte", variant: "Variante / Typ", grade: "Erhaltung",
      eyebrow: "Ergebnis korrigieren", title: "Daten vor dem Speichern korrigieren",
      hint: "Ändern Sie nur die erforderlichen Angaben. Das ursprüngliche KI-Ergebnis bleibt im Analyseverlauf erhalten.",
      save: "Korrekturen anwenden", cancel: "Abbrechen",
      applied: "Korrekturen übernommen. Die Münze wurde noch nicht gespeichert.",
      button: "✏️ Daten korrigieren", buttonHint: "Felder vor dem Speichern prüfen und korrigieren.",
    },
    fr: {
      country: "Pays / zone", issuer: "Émetteur", ruler: "Souverain",
      depictedPerson: "Personne représentée", year: "Année", nominal: "Valeur",
      metal: "Métal", mint: "Atelier", variant: "Variété / type", grade: "État de conservation",
      eyebrow: "Corriger le résultat", title: "Corriger les données avant l’enregistrement",
      hint: "Modifiez uniquement ce qui doit l’être. Le résultat IA d’origine restera conservé dans l’historique de l’analyse.",
      save: "Appliquer les corrections", cancel: "Annuler",
      applied: "Corrections appliquées. La monnaie n’a pas encore été enregistrée.",
      button: "✏️ Corriger les données", buttonHint: "Vérifiez et corrigez les champs avant l’enregistrement.",
    },
  };

  const language = () =>
    window.ApoLanguageRegistry?.current?.() || window.ApoI18n?.current?.() ||
    localStorage.getItem("apomonet_language_v2") || "pl";
  const t = (key) => L[language()]?.[key] || L.en[key] || L.pl[key] || key;
  const canonicalNominal = (value) =>
    window.ApoNumis?.canonicalDenomination?.(value) || String(value || "").trim();
  const nominalSuggestions = (value) =>
    window.ApoNumis?.denominationSuggestions?.(value, 6) || [];

  function currentFromFacts() {
    const output = {};
    const labelKeys = {
      country: ["kraj / obszar", "country / area", "land / gebiet", "pays / zone"],
      issuer: ["emitent", "issuer", "emittent", "émetteur"],
      ruler: ["władca", "ruler", "herrscher", "souverain"],
      depictedPerson: ["postać na monecie", "person depicted", "dargestellte person", "personne représentée"],
      year: ["rok", "year", "jahr", "année"],
      nominal: ["nominał", "denomination", "nominal", "valeur"],
      metal: ["metal", "metall", "métal"],
      mint: ["mennica", "mint", "münzstätte", "atelier"],
      grade: ["stan zachowania", "condition", "erhaltung", "état de conservation"],
    };
    document.querySelectorAll("#facts .fact").forEach((item) => {
      const label = item.querySelector("span")?.textContent?.trim().toLowerCase();
      const value = item.querySelector("strong")?.textContent?.trim();
      const key = Object.keys(labelKeys).find((candidate) => labelKeys[candidate].includes(label));
      if (key && value) output[key] = value;
    });
    return output;
  }

  function rawBase() {
    const session = safeParse(sessionStorage.getItem(SESSION), {}) || {};
    return safeParse(sessionStorage.getItem(LAST), null) || session.a || {};
  }

  function titleOf(analysis) {
    return [analysis.nominal, analysis.ruler || analysis.issuer, analysis.mint, analysis.year]
      .map((value) => String(value || "").trim()).filter(Boolean).join(" • ") || analysis.title || "Coin";
  }

  function isStage1Request(input) {
    try {
      const raw = typeof input === "string" ? input : input?.url || String(input || "");
      const pathname=new URL(raw,location.href).pathname;
      return pathname==='/api/analyze';
    } catch {
      return String(input || "").split("?")[0] === "/api/analyze";
    }
  }

  function installFetchCapture() {
    const original = window.fetch?.bind(window);
    if (!original || window.__apoInlineCorrectionFetch) return;
    window.__apoInlineCorrectionFetch = true;
    window.fetch = async (input, init) => {
      const response = await original(input, init);
      try {
        if(isStage1Request(input)&&response.ok){
          const data = await response.clone().json();
          if (data?.analysis) sessionStorage.setItem(LAST, JSON.stringify(data.analysis));
        }
      } catch {}
      return response;
    };
  }

  function openEditor() {
    const base = clone(rawBase()) || {};
    const display = { ...base, ...currentFromFacts() };
    const rawAI = clone(base.rawAI || base);
    document.getElementById("apoInlineCorrection")?.remove();
    const background = document.createElement("div");
    background.id = "apoInlineCorrection";
    background.style.cssText = "position:fixed;inset:0;background:#000d;z-index:20000;display:grid;place-items:center;padding:14px";
    const fields = [
      ["country", "country"], ["issuer", "issuer"], ["ruler", "ruler"],
      ["depictedPerson", "depictedPerson"], ["year", "year"], ["nominal", "nominal"],
      ["mint", "mint"], ["metal", "metal"], ["variant", "variant"], ["grade", "grade"],
    ];
    background.innerHTML = `<div role="dialog" aria-modal="true" aria-labelledby="apoCorrectionTitle" style="width:min(560px,100%);max-height:90vh;overflow:auto;background:#111113;border:1px solid #5e441c;border-radius:22px;padding:20px"><span style="color:#d9952f;font-size:12px;font-weight:800;text-transform:uppercase">${t("eyebrow")}</span><h2 id="apoCorrectionTitle" style="margin:7px 0 8px">${t("title")}</h2><p style="color:#aaa;line-height:1.45">${t("hint")}</p>${fields.map(([key, label]) => `<label style="display:block;margin:12px 0">${t(label)}<input data-k="${key}" data-initial="${esc(display[key])}"${key === "nominal" ? ' list="apoNominalSuggestions" autocomplete="off"' : ""} value="${esc(display[key])}" style="display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:13px;border-radius:12px;border:1px solid #3a3a3d;background:#18181b;color:#fff;font-size:16px">${key === "nominal" ? '<span id="apoNominalHints" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px"></span>' : ""}</label>`).join("")}<datalist id="apoNominalSuggestions">${(window.ApoNumis?.denominations || []).map((value) => `<option value="${esc(value)}"></option>`).join("")}</datalist><div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px"><button id="apoCorrectionSave" class="btn primary" type="button">${t("save")}</button><button id="apoCorrectionCancel" class="btn secondary" type="button">${t("cancel")}</button></div></div>`;
    document.body.appendChild(background);

    const inputs = [...background.querySelectorAll("[data-k]")];
    inputs.forEach((input) => {
      input.addEventListener("focus", () => setTimeout(() => input.select(), 0));
      input.addEventListener("pointerup", (event) => {
        if (input.dataset.apoWholeSelected === "1") return;
        event.preventDefault();
        input.select();
        input.dataset.apoWholeSelected = "1";
      });
      input.addEventListener("blur", () => delete input.dataset.apoWholeSelected);
    });

    const nominal = background.querySelector('[data-k="nominal"]');
    const hints = background.querySelector("#apoNominalHints");
    const drawNominalHints = () => {
      if (!nominal || !hints) return;
      hints.replaceChildren(...nominalSuggestions(nominal.value).map((suggestion) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn secondary";
        button.style.cssText = "padding:6px 9px;font-size:13px";
        button.textContent = suggestion;
        button.onclick = () => {
          nominal.value = suggestion;
          hints.replaceChildren();
          nominal.focus();
          nominal.setSelectionRange(suggestion.length, suggestion.length);
        };
        return button;
      }));
    };
    nominal?.addEventListener("input", drawNominalHints);
    nominal?.addEventListener("blur", () => {
      if (nominal.value.trim() !== nominal.dataset.initial) nominal.value = canonicalNominal(nominal.value);
    });

    background.querySelector("#apoCorrectionCancel").onclick = () => background.remove();
    background.onclick = (event) => { if (event.target === background) background.remove(); };
    background.querySelector("#apoCorrectionSave").onclick = () => {
      let corrected = { ...base };
      background.querySelectorAll("[data-k]").forEach((input) => {
        let next = input.value.trim();
        if (next === String(input.dataset.initial || "").trim()) return;
        if (input.dataset.k === "nominal") next = canonicalNominal(next);
        corrected[input.dataset.k] = next || "Nie ustalono";
      });
      corrected.title = titleOf(corrected);
      corrected.rawAI = rawAI;
      corrected.userAccepted = true;
      corrected.acceptedAt = corrected.acceptedAt || new Date().toISOString();
      corrected.correctedAt = new Date().toISOString();
      corrected = window.ApoCorrectionConsistency?.normalizeCoin?.(corrected) || corrected;
      corrected = window.ApoDerivedInvalidation?.invalidate?.(corrected) || corrected;
      const previous = safeParse(sessionStorage.getItem(SESSION), {}) || {};
      const nextSession = { ...previous, a: corrected, at: Date.now(), version: Math.max(Number(previous.version) || 0, 6) };
      sessionStorage.setItem(LAST, JSON.stringify(corrected));
      sessionStorage.setItem(SESSION, JSON.stringify(nextSession));
      window.dispatchEvent(new CustomEvent("apo:analysis-corrected", { detail: { analysis: corrected } }));
      background.remove();
      const status = document.getElementById("status");
      if (status) status.textContent = t("applied");
    };
    setTimeout(() => { nominal?.focus(); nominal?.select(); drawNominalHints(); }, 50);
  }

  function installButton() {
    if (!location.pathname.endsWith("analyze.html")) return;
    const edit = document.getElementById("edit");
    if (!edit) return;
    if (edit.dataset.inlineCorrection !== "1") {
      edit.dataset.inlineCorrection = "1";
      edit.addEventListener("click", (event) => {
        event.preventDefault(); event.stopImmediatePropagation(); openEditor();
      }, true);
    }
    const strong = edit.querySelector("strong");
    const span = edit.querySelector("span");
    if (strong) strong.textContent = t("button");
    if (span) span.textContent = t("buttonHint");
  }

  window.ApoInlineCorrection = Object.freeze({ open: openEditor });
  installFetchCapture();
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", installButton) : installButton();
  ["languagechange", "apo-language-changed", "apomonet:language-change"].forEach((eventName) => addEventListener(eventName, installButton));
})();
