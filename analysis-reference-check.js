(() => {
  const $ = (id) => document.getElementById(id);
  let lastKey = "";
  let busy = false;

  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );

  function safeUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function current() {
    try {
      return (0, eval)('typeof a !== "undefined" ? a : null');
    } catch {
      return null;
    }
  }

  function ensureBox() {
    const panel = $("panel");
    if (!panel) return null;
    let details = $("referenceEvidenceBox");
    if (!details) {
      details = document.createElement("details");
      details.id = "referenceEvidenceBox";
      details.className = "detail";
      details.style.marginTop = "12px";
      const summary = document.createElement("summary");
      summary.textContent = "Podobne egzemplarze i kontrola źródeł";
      summary.style.cursor = "pointer";
      summary.style.fontWeight = "800";
      const content = document.createElement("div");
      content.id = "referenceEvidenceContent";
      content.style.marginTop = "10px";
      details.append(summary, content);
      const actions = panel.querySelector(".actions-grid") || panel.lastElementChild;
      panel.insertBefore(details, actions || null);
    }
    return $("referenceEvidenceContent");
  }

  function keyOf(analysis) {
    return [
      analysis?.country,
      analysis?.ruler,
      analysis?.nominal,
      analysis?.year,
    ].join("|");
  }

  async function ask(url, payload) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis: payload }),
      });
      const data = await response.json();
      return response.ok ? data : { ok: false, status: "neutral", items: [] };
    } catch {
      return { ok: false, status: "neutral", items: [] };
    }
  }

  function suspend(analysis, note) {
    analysis.confidence = Math.min(Number(analysis.confidence || 0), 72);
    analysis.estimateLow = 0;
    analysis.estimateHigh = 0;
    analysis.valuationNote = note;
    analysis.needsDetailedAnalysis = true;
    analysis.detailRecommended = true;
    const confidence = $("conf");
    if (confidence) {
      confidence.textContent = `Pewność ${analysis.confidence || 0}% • wymaga kontroli`;
    }
  }

  function similarItems(smithsonian, ans, analysis) {
    const rows = [];
    try {
      for (const item of window.ApoArchive?.comparable?.(analysis, 10) || []) {
        if (!item.sourceUrl || Number(item.similarity || 0) < 70) continue;
        rows.push({
          source: item.sourceLabel || item.source || "Archiwum aukcyjne",
          id: item.id,
          label:
            item.title ||
            [item.nominal, item.ruler, item.mint, item.year]
              .filter(Boolean)
              .join(" • "),
          url: item.sourceUrl,
          score: Number(item.similarity || 0) / 10,
        });
      }
    } catch {}
    for (const item of smithsonian?.items || []) {
      rows.push({
        source: "Smithsonian",
        id: item.id,
        label: item.label,
        url: item.uri,
        score: Number(item.score || 0),
      });
    }
    for (const item of ans?.items || []) {
      rows.push({
        source: "American Numismatic Society",
        id: item.id,
        label: item.label,
        url: item.uri,
        score: Number(item.score || 0),
      });
    }
    for (const item of smithsonian?.numista?.items || []) {
      rows.push({
        source: "Numista",
        id: item.id,
        label: [item.title, item.issuer].filter(Boolean).join(" • "),
        url: item.url,
        score: 8,
      });
    }
    const unique = new Map();
    for (const row of rows.sort((left, right) => right.score - left.score)) {
      const url = safeUrl(row.url);
      if (!url || !row.label) continue;
      if (!unique.has(url)) unique.set(url, { ...row, url });
    }
    return [...unique.values()].slice(0, 6);
  }

  function similarHtml(smithsonian, ans, analysis) {
    const items = similarItems(smithsonian, ans, analysis);
    if (!items.length) {
      return '<hr><b>🔎 Podobne egzemplarze</b><p class="muted">Nie znaleziono wystarczająco zgodnego, bezpośredniego rekordu. APOMONET nie podstawia przypadkowej monety.</p>';
    }
    return (
      '<hr><b>🔎 Podobne egzemplarze</b>' +
      '<p class="muted">Bezpośrednie rekordy zewnętrzne do ręcznego porównania. Nie potwierdzają automatycznie odmiany ani autentyczności.</p>' +
      items
        .map(
          (item) =>
            `<p style="margin:10px 0"><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(item.source)}</strong> — ${esc(item.label)}</a></p>`,
        )
        .join("") +
      '<p><small>APOMONET pokazuje link i własne dopasowanie; nie kopiuje zdjęć ani opisów źródłowych.</small></p>'
    );
  }

  function evidenceHtml(supported, conflicts, all) {
    if (supported.length && conflicts.length) {
      return (
        "<b>⚠️ Kontrola wieloźródłowa — sprzeczne sygnały</b>" +
        "<p>Jedno źródło wspiera identyfikację, a drugie wskazuje możliwy konflikt. APOMONET nie wybiera automatycznie żadnej strony.</p>" +
        all
          .filter((item) => item?.best?.label)
          .map(
            (item) =>
              `<small>${esc(item.source || "Źródło")}: ${esc(item.best.label)}</small>`,
          )
          .join("<br>")
      );
    }
    if (conflicts.length) {
      const conflict = conflicts[0];
      return (
        "<b>⚠️ Możliwy konflikt identyfikacji</b>" +
        "<p>Rok i nominał mają podobny rekord, ale władca nie został potwierdzony. Wycena została wstrzymana.</p>" +
        `<small>${esc(conflict.source || "Źródło")}: ${esc(conflict.best?.label || "")}</small>`
      );
    }
    if (supported.length) {
      return (
        `<b>🏛️ Kontrola źródeł — ${supported.length === 2 ? "dwa zgodne źródła" : "zgodny rekord"}</b>` +
        "<p>Podstawowa identyfikacja ma wsparcie w niezależnym zbiorze. Nie traktujemy tego jako certyfikatu odmiany.</p>" +
        supported
          .map(
            (item) =>
              `<small>✓ ${esc(item.source || "Źródło")}: ${esc(item.best?.label || "zgodny rekord")}</small>`,
          )
          .join("<br>")
      );
    }
    return (
      "<b>🏛️ Kontrola źródeł referencyjnych</b>" +
      '<p class="muted">Brak wystarczająco bliskiego potwierdzenia. Ten neutralny wynik nie zmienia identyfikacji.</p>'
    );
  }

  async function run() {
    if (busy || !location.pathname.endsWith("analyze.html")) return;
    const analysis = current();
    const panel = $("panel");
    if (!analysis || !panel || panel.classList.contains("hidden")) return;
    const key = keyOf(analysis);
    if (!key || key === lastKey) return;
    lastKey = key;
    busy = true;
    const box = ensureBox();
    const payload = {
      country: analysis.country,
      ruler: analysis.ruler,
      nominal: analysis.nominal,
      year: analysis.year,
    };
    if (box) {
      box.innerHTML =
        '<p class="muted">Sprawdzam Smithsonian, American Numismatic Society i Numista bez opóźniania wyniku podstawowego…</p>';
    }
    try {
      const [smithsonian, ans] = await Promise.all([
        ask("/api/analysis-reference", payload),
        ask("/api/ans-open-data", payload),
      ]);
      const all = [smithsonian, ans];
      const supported = all.filter((item) => item?.status === "supported");
      const conflicts = all.filter(
        (item) => item?.status === "possible_conflict",
      );
      analysis.referenceEvidence = {
        smithsonian,
        ans,
        numista: smithsonian?.numista,
      };
      if (conflicts.length) {
        suspend(
          analysis,
          supported.length
            ? "Wycena wstrzymana: niezależne źródła referencyjne dają sprzeczne sygnały."
            : "Wycena wstrzymana: źródło referencyjne wykryło możliwy konflikt identyfikacji.",
        );
        analysis.warnings = [
          ...(analysis.warnings || []),
          "Kontrola referencyjna wymaga ręcznego potwierdzenia identyfikacji.",
        ];
        dispatchEvent(
          new CustomEvent("apomonet:reference-conflict", {
            detail: {
              reasons: [
                "Kontrola źródeł wykryła możliwy konflikt identyfikacji.",
              ],
            },
          }),
        );
      }
      if (box) {
        box.innerHTML =
          evidenceHtml(supported, conflicts, all) +
          similarHtml(smithsonian, ans, analysis);
      }
    } finally {
      busy = false;
    }
  }

  addEventListener("DOMContentLoaded", () => {
    if (location.pathname.endsWith("analyze.html")) setInterval(run, 700);
  });
})();
