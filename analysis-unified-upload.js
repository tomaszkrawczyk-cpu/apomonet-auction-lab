(() => {
  function ready(fn) {
    document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", fn)
      : fn();
  }
  ready(() => {
    if (!location.pathname.endsWith("analyze.html")) return;
    const oi = document.getElementById("obverseInput"),
      ri = document.getElementById("reverseInput"),
      go = document.getElementById("go"),
      status = document.getElementById("status");
    if (!oi || !ri || !go) return;
    oi.removeAttribute("capture");
    ri.removeAttribute("capture");
    const grid = document.querySelector(".coin-grid");
    if (grid && !document.getElementById("pairPicker")) {
      const box = document.createElement("div");
      box.style.margin = "0 0 14px";
      box.innerHTML =
        '<button id="pairBtn" type="button" class="btn primary full">📷 Wybierz awers i rewers razem</button><input id="pairPicker" class="browser-file-input" type="file" accept="image/*" multiple><div class="photo-note">W galerii zaznacz dokładnie dwa zdjęcia: najpierw awers, potem rewers. Kafle poniżej służą do wymiany tylko jednej strony.</div>';
      grid.before(box);
      const p = box.querySelector("#pairPicker"),
        b = box.querySelector("#pairBtn");
      b.onclick = () => p.click();
      p.onchange = async () => {
        const fs = [...(p.files || [])];
        if (fs.length !== 2) {
          if (status)
            status.textContent =
              "Wybierz dokładnie dwa zdjęcia: awers i rewers.";
          p.value = "";
          return;
        }
        try {
          const dt1 = new DataTransfer(),
            dt2 = new DataTransfer();
          dt1.items.add(fs[0]);
          dt2.items.add(fs[1]);
          oi.files = dt1.files;
          ri.files = dt2.files;
          oi.dispatchEvent(new Event("change", { bubbles: true }));
          setTimeout(
            () => ri.dispatchEvent(new Event("change", { bubbles: true })),
            180,
          );
        } catch (e) {
          console.warn(e);
          if (status)
            status.textContent =
              "Nie udało się wczytać obu zdjęć jednocześnie. Użyj kafli awers/rewers.";
        } finally {
          p.value = "";
        }
      };
    }
    // Rozmiar i jakość zdjęć są kontrolowane lokalnie przez analysis-image-pipeline.js.
    // Nie zmieniamy globalnie Canvas.toDataURL, bo wpływałoby to także na eksporty i inne ekrany.
    let transportFailed = false;
    const transportMessage =
      "Połączenie telefonu z analizą zostało przerwane. Zdjęcia pozostają wybrane — spróbuj ponownie bez ponownego wczytywania.";
    const oldFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      try {
        const r = await oldFetch(input, init);
        if (String(input || "").includes("/api/analyze"))
          transportFailed = false;
        return r;
      } catch (e) {
        if (String(input || "").includes("/api/analyze")) {
          transportFailed = true;
          if (status) status.textContent = transportMessage;
        }
        throw e;
      }
    };
    // Główny handler analyze.html wcześniej nadpisywał komunikat tekstem „Failed to fetch”.
    new MutationObserver(() => {
      if (!status || !transportFailed) return;
      if (
        /Failed to fetch|NetworkError|Load failed/i.test(
          status.textContent || "",
        )
      )
        status.textContent = transportMessage;
    }).observe(status, { childList: true, subtree: true, characterData: true });
  });
})();
