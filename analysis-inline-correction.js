(() => {
  const LAST = "apomonetLastAnalysisV1";

  function safeParse(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function currentFromFacts() {
    const output = {};
    const map = {
      "Kraj / emitent": "country",
      Władca: "ruler",
      Rok: "year",
      Nominał: "nominal",
      Metal: "metal",
      Mennica: "mint",
      Typ: "variant",
      Stan: "grade",
    };
    document.querySelectorAll("#facts .fact").forEach((element) => {
      const label = element.querySelector("span")?.textContent?.trim();
      const value = element.querySelector("strong")?.textContent?.trim();
      if (map[label] && value && value !== "Nie ustalono") output[map[label]] = value;
    });
    const description = document.getElementById("desc")?.textContent?.trim();
    if (description && description !== "Nie ustalono") output.fullDescription = description;
    return output;
  }

  function titleOf(analysis) {
    return (
      [analysis.nominal, analysis.ruler, analysis.mint, analysis.year]
        .map((value) => String(value || "").trim())
        .filter((value) => value && value !== "Nie ustalono")
        .join(" • ") ||
      analysis.title ||
      "Moneta"
    );
  }

  function installFetchCapture() {
    const original = window.fetch?.bind(window);
    if (!original || window.__apoInlineCorrectionFetch) return;
    window.__apoInlineCorrectionFetch = true;
    window.fetch = async (input, init) => {
      const response = await original(input, init);
      try {
        if (String(input || "").includes("/api/analyze") && response.ok) {
          const data = await response.clone().json();
          if (data?.analysis) sessionStorage.setItem(LAST, JSON.stringify(data.analysis));
        }
      } catch {}
      return response;
    };
  }

  function openEditor() {
    let base = safeParse(sessionStorage.getItem(LAST), {}) || {};
    base = { ...base, ...currentFromFacts() };
    const rawAI = base.rawAI || safeParse(JSON.stringify(base), {});
    document.getElementById("apoInlineCorrection")?.remove();

    const background = document.createElement("div");
    background.id = "apoInlineCorrection";
    background.style.cssText =
      "position:fixed;inset:0;background:#000d;z-index:20000;display:grid;place-items:center;padding:14px;";
    const fields = [
      ["nominal", "Nominał"],
      ["ruler", "Władca / emitent"],
      ["year", "Rok"],
      ["mint", "Mennica"],
      ["metal", "Metal"],
      ["variant", "Odmiana / typ"],
      ["grade", "Stan zachowania"],
    ];
    background.innerHTML = `<div style="width:min(560px,100%);max-height:90vh;overflow:auto;background:#111113;border:1px solid #5e441c;border-radius:22px;padding:20px"><span style="color:#d9952f;font-size:12px;font-weight:800;text-transform:uppercase">Korekta wyniku</span><h2 style="margin:7px 0 8px">Popraw dane bez opuszczania analizy</h2><p style="color:#aaa;line-height:1.45">Zmień tylko to, co wymaga korekty. Pierwotny wynik AI zostanie zachowany w tle.</p>${fields
      .map(
        ([key, label]) =>
          `<label style="display:block;margin:12px 0">${label}<input data-k="${key}" value="${esc(base[key])}" style="display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:13px;border-radius:12px;border:1px solid #3a3a3d;background:#18181b;color:#fff;font-size:16px"></label>`,
      )
      .join("")}<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:18px"><button id="apoCorrectionSave" class="btn primary" type="button">Zatwierdź korektę</button><button id="apoCorrectionCancel" class="btn secondary" type="button">Anuluj</button></div></div>`;
    document.body.appendChild(background);

    background.querySelector("#apoCorrectionCancel").onclick = () => background.remove();
    background.onclick = (event) => {
      if (event.target === background) background.remove();
    };
    background.querySelector("#apoCorrectionSave").onclick = () => {
      let corrected = { ...base };
      background.querySelectorAll("[data-k]").forEach((input) => {
        corrected[input.dataset.k] = input.value.trim() || "Nie ustalono";
      });
      corrected.title = titleOf(corrected);
      corrected.rawAI = rawAI;
      corrected.userAccepted = true;
      corrected.acceptedAt = new Date().toISOString();
      corrected.correctedAt = new Date().toISOString();
      corrected =
        window.ApoCorrectionConsistency?.normalizeCoin?.(corrected) || corrected;

      const images = [
        document.getElementById("oi")?.src || "",
        document.getElementById("ri")?.src || "",
      ];
      const coin = window.ApoMonet?.upsertCoin({
        ...corrected,
        description: corrected.fullDescription || corrected.description || "",
        analysisLevel: corrected.detail ? "detailed" : "basic",
        obverseImage: images[0],
        reverseImage: images[1],
      });
      if (!coin) {
        alert("Nie udało się zapisać korekty.");
        return;
      }
      const merged = { ...corrected, ...coin, rawAI };
      sessionStorage.setItem(LAST, JSON.stringify(merged));
      sessionStorage.setItem(
        "apomonetAnalysisSession",
        JSON.stringify({
          id: coin.id,
          a: merged,
          imgs: images,
          analysisImgs: images,
          at: Date.now(),
          version: 4,
        }),
      );
      sessionStorage.setItem("apomonetReturnToAnalysis", "1");
      location.href = "analyze.html?resume=1&corrected=1";
    };
    setTimeout(() => background.querySelector('[data-k="year"]')?.focus(), 50);
  }

  function installButton() {
    if (!location.pathname.endsWith("analyze.html")) return;
    const edit = document.getElementById("edit");
    if (!edit || edit.dataset.inlineCorrection === "1") return;
    edit.dataset.inlineCorrection = "1";
    edit.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openEditor();
      },
      true,
    );
    const strong = edit.querySelector("strong");
    const span = edit.querySelector("span");
    if (strong) strong.textContent = "✏️ Popraw dane tutaj";
    if (span) {
      span.textContent =
        "Skoryguj rok, nominał, władcę lub inne dane bez otwierania osobnej karty.";
    }
  }

  installFetchCapture();
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", installButton)
    : installButton();
})();
