(() => {
  const PENDING = "apomonetAlbumPhotoPrep";
  const parse = (key) => {
    try {
      return JSON.parse(sessionStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  };
  const language = () => localStorage.getItem("apomonet_language_v2") || "pl";
  const messages = {
    title: {
      pl: "Chcesz, żebym usunął tło?",
      en: "Would you like me to remove the background?",
      de: "Soll der Hintergrund entfernt werden?",
      fr: "Voulez-vous supprimer l’arrière-plan ?",
    },
    help: {
      pl: "Najlepszy wynik daje jednolite, kontrastowe tło. Oryginały pozostaną bez zmian, a wersja PNG z przezroczystym tłem trafi tylko do albumu i eksportu.",
      en: "A plain, contrasting background gives the best result. The originals stay unchanged; only the album and export use a transparent PNG.",
      de: "Ein einfarbiger, kontrastreicher Hintergrund liefert das beste Ergebnis. Die Originale bleiben unverändert; Album und Export verwenden nur eine transparente PNG-Version.",
      fr: "Un fond uni et contrasté donne le meilleur résultat. Les originaux restent inchangés ; seuls l’album et l’export utilisent un PNG transparent.",
    },
    cutting: {
      pl: "Usuwam tło…",
      en: "Removing background…",
      de: "Hintergrund wird entfernt…",
      fr: "Suppression de l’arrière-plan…",
    },
    failed: {
      pl: "Nie udało się pewnie wykryć krawędzi monety. Zdjęcie nie zostało zmienione. Zrób je na jednolitym, kontrastowym tle i spróbuj ponownie.",
      en: "The coin edge could not be detected reliably, so the photo was not changed. Use a plain, contrasting background and try again.",
      de: "Der Münzrand wurde nicht sicher erkannt; das Foto wurde nicht verändert. Verwenden Sie einen einfarbigen, kontrastreichen Hintergrund und versuchen Sie es erneut.",
      fr: "Le bord de la monnaie n’a pas été détecté avec certitude ; la photo n’a pas été modifiée. Utilisez un fond uni et contrasté, puis réessayez.",
    },
    success: {
      pl: "Tło usunięte — zapisuję przezroczyste zdjęcie.",
      en: "Background removed — saving the transparent image.",
      de: "Hintergrund entfernt — das transparente Bild wird gespeichert.",
      fr: "Arrière-plan supprimé — enregistrement de l’image transparente.",
    },
  };
  const msg = (key) => messages[key]?.[language()] || messages[key]?.pl || "";
  const currentCoin = () => {
    const session = parse("apomonetAnalysisSession");
    return session?.id && window.ApoMonet ? ApoMonet.getCoin(session.id) : null;
  };

  function circleCut(data) {
    return new Promise((resolve) => {
      if (!data) return resolve({ data: null, removed: true, skipped: true });
      const image = new Image();
      image.onerror = () => resolve({ data, removed: false, reason: "load" });
      image.onload = () => {
        try {
          const iw = image.naturalWidth || image.width;
          const ih = image.naturalHeight || image.height;
          const work = document.createElement("canvas");
          const workScale = Math.min(1, 1200 / Math.max(iw, ih));
          work.width = Math.max(1, Math.round(iw * workScale));
          work.height = Math.max(1, Math.round(ih * workScale));
          work.getContext("2d").drawImage(image, 0, 0, work.width, work.height);

          const detection = window.ApoImagePipeline?.detectCircle?.(work);
          const minSide = Math.min(work.width, work.height);
          const reliable =
            detection &&
            Number.isFinite(detection.score) &&
            detection.score >= 13 &&
            Number(detection.confidence || 0) >= 55 &&
            Number(detection.backgroundTexture || 0) <= 10 &&
            detection.r >= minSide * 0.11 &&
            detection.r <= minSide * 0.47;
          if (!reliable) {
            return resolve({ data, removed: false, reason: "uncertain" });
          }

          const half = detection.r * 1.12;
          const left = detection.cx - half;
          const top = detection.cy - half;
          const outside =
            left < 0 ||
            top < 0 ||
            detection.cx + half > work.width ||
            detection.cy + half > work.height;
          if (outside) {
            return resolve({ data, removed: false, reason: "edge" });
          }

          const size = Math.max(320, Math.min(720, Math.round(half * 2)));
          const output = document.createElement("canvas");
          output.width = output.height = size;
          const context = output.getContext("2d");
          const maskRadius = Math.min(
            size * 0.47,
            (detection.r / (half * 2)) * size * 1.03,
          );
          context.clearRect(0, 0, size, size);
          context.save();
          context.beginPath();
          context.arc(size / 2, size / 2, maskRadius, 0, Math.PI * 2);
          context.clip();
          context.drawImage(
            work,
            left,
            top,
            half * 2,
            half * 2,
            0,
            0,
            size,
            size,
          );
          context.restore();
          resolve({
            data: output.toDataURL("image/png"),
            removed: true,
            confidence: detection.confidence,
          });
        } catch (error) {
          console.error("[album-background-removal]", error);
          resolve({ data, removed: false, reason: "processing" });
        }
      };
      image.src = data;
    });
  }

  function modal() {
    const background = document.createElement("div");
    background.id = "albumPhotoPrep";
    background.style.cssText =
      "position:fixed;inset:0;background:#000c;z-index:12000;display:grid;place-items:center;padding:18px";
    const box = document.createElement("div");
    box.style.cssText =
      "width:min(520px,100%);background:#111113;border:1px solid #4a361b;border-radius:22px;padding:20px";
    box.innerHTML = `<span class="eyebrow">Zdjęcie do albumu</span><h2 style="margin:8px 0 6px">${msg("title")}</h2><p style="color:#aaa;line-height:1.5">${msg("help")}</p><p class="photo-prep-status" role="status" style="min-height:1.5em;color:#d99732"></p>`;
    const make = (text, kind) => {
      const button = document.createElement("button");
      button.className = `btn ${kind} full`;
      button.style.marginTop = "9px";
      button.textContent = text;
      box.appendChild(button);
      return button;
    };
    const cut = make("✂️ Tak — usuń tło", "primary");
    const keep = make("🖼️ Nie — zostaw oryginalne zdjęcie", "secondary");
    const none = make("⏭️ Zapisz bez zdjęcia w albumie", "secondary");
    const cancel = make("Anuluj", "secondary");
    background.appendChild(box);
    document.body.appendChild(background);
    return {
      background,
      cut,
      keep,
      none,
      cancel,
      status: box.querySelector(".photo-prep-status"),
    };
  }

  const setPending = (value) => {
    try {
      sessionStorage.setItem(PENDING, JSON.stringify(value));
    } catch {}
  };
  const getPending = () => parse(PENDING);
  const clearPending = () => sessionStorage.removeItem(PENDING);

  function patchAssign() {
    if (!window.ApoMonet || ApoMonet.__albumPhotoPatched) return;
    const original = ApoMonet.assignCoinToAlbum;
    ApoMonet.assignCoinToAlbum = function (coinId, albumId) {
      const pending = getPending();
      const coin = ApoMonet.getCoin(coinId);
      if (pending && coin && (!pending.coinId || pending.coinId === coinId)) {
        const patch = {
          id: coinId,
          albumPhotoMode: pending.mode,
          albumPhotoPreparedAt: new Date().toISOString(),
        };
        if (pending.mode === "cut") {
          patch.albumObverseImage = pending.obverse || null;
          patch.albumReverseImage = pending.reverse || null;
          patch.albumPhotoRemovalConfidence = pending.confidence || null;
        } else {
          patch.albumObverseImage = null;
          patch.albumReverseImage = null;
        }
        ApoMonet.upsertCoin(patch);
        clearPending();
      } else if (pending?.coinId && pending.coinId !== coinId) {
        clearPending();
      }
      return original.call(ApoMonet, coinId, albumId);
    };
    ApoMonet.__albumPhotoPatched = true;
  }

  function hookAnalyze() {
    if (!location.pathname.endsWith("analyze.html")) return;
    const button = document.getElementById("album");
    if (!button || button.dataset.photoPrepHook === "1") return;
    button.dataset.photoPrepHook = "1";
    const original = button.onclick;
    button.onclick = async (event) => {
      event?.preventDefault?.();
      clearPending();
      const dialog = modal();
      const coin = currentCoin();
      const coinId = coin?.id || null;
      const finish = () => {
        dialog.background.remove();
        if (typeof original === "function") original.call(button, event);
      };
      dialog.cancel.onclick = () => {
        clearPending();
        dialog.background.remove();
      };
      dialog.keep.onclick = () => {
        setPending({ mode: "original", coinId });
        finish();
      };
      dialog.none.onclick = () => {
        setPending({ mode: "none", coinId });
        finish();
      };
      dialog.cut.onclick = async () => {
        dialog.cut.disabled = true;
        dialog.cut.textContent = msg("cutting");
        dialog.status.textContent = msg("cutting");
        const obverseSource =
          document.getElementById("oi")?.src || coin?.obverseImage || "";
        const reverseSource =
          document.getElementById("ri")?.src || coin?.reverseImage || "";
        const [obverse, reverse] = await Promise.all([
          circleCut(obverseSource),
          circleCut(reverseSource),
        ]);
        if (!obverse.removed || !reverse.removed) {
          dialog.cut.disabled = false;
          dialog.cut.textContent = "✂️ Tak — usuń tło";
          dialog.status.textContent = msg("failed");
          return;
        }
        dialog.status.textContent = msg("success");
        setPending({
          mode: "cut",
          coinId,
          obverse: obverse.data,
          reverse: reverse.data,
          confidence: Math.min(
            obverse.confidence || 100,
            reverse.confidence || 100,
          ),
        });
        finish();
      };
    };
  }

  function albumPhoto(coin, side = "obverse") {
    if (!coin) return "";
    if (coin.albumPhotoMode === "none") return "";
    if (coin.albumPhotoMode === "cut") {
      return side === "obverse"
        ? coin.albumObverseImage || coin.albumReverseImage || ""
        : coin.albumReverseImage || coin.albumObverseImage || "";
    }
    return side === "obverse"
      ? coin.obverseImage || coin.reverseImage || coin.image || coin.img || ""
      : coin.reverseImage || coin.obverseImage || "";
  }

  // Jedno źródło prawdy dla karty, albumów, okładek i eksportu.
  // Oryginały pozostają w rekordzie, a tryb albumowy steruje prezentacją.
  window.ApoAlbumPhotos = Object.freeze({ resolve: albumPhoto });

  function applyAlbumPhoto(card, coin) {
    const box = card.querySelector(".coin-photo");
    if (!box) return;
    const photo = albumPhoto(coin);
    if (photo) {
      box.classList.remove("empty");
      box.innerHTML = `<img src="${photo}" alt="Moneta" loading="lazy">`;
    } else {
      box.classList.add("empty");
      box.textContent =
        coin.albumPhotoMode === "none"
          ? "Zdjęcie pominięte w albumie"
          : "Brak zapisanego zdjęcia";
    }
  }

  function hookAlbum() {
    if (!location.pathname.endsWith("user-album.html")) return;
    const list = document.getElementById("list");
    if (!list) return;
    const fix = () => {
      document.querySelectorAll(".coin-card").forEach((card) => {
        const id = card.querySelector(".coin-pick")?.dataset.id;
        if (!id) return;
        const coin = ApoMonet.getCoin(id);
        const actions = card.querySelector(".actions");
        if (!coin || !actions) return;
        applyAlbumPhoto(card, coin);
        if (card.querySelector(".photo-mode-actions")) return;
        const wrap = document.createElement("div");
        wrap.className = "photo-mode-actions";
        wrap.style.cssText =
          "display:flex;gap:6px;flex-wrap:wrap;width:100%;margin-top:4px";
        const make = (text, onClick) => {
          const control = document.createElement("button");
          control.className = "btn secondary";
          control.textContent = text;
          control.onclick = onClick;
          wrap.appendChild(control);
          return control;
        };
        const status = document.createElement("span");
        status.setAttribute("role", "status");
        status.style.cssText = "width:100%;color:#d99732;font-size:13px";
        make("✂️ Usuń tło", async (event) => {
          const control = event.currentTarget;
          control.disabled = true;
          status.textContent = msg("cutting");
          const [obverse, reverse] = await Promise.all([
            circleCut(coin.obverseImage),
            circleCut(coin.reverseImage),
          ]);
          if (!obverse.removed || !reverse.removed) {
            control.disabled = false;
            status.textContent = msg("failed");
            return;
          }
          ApoMonet.upsertCoin({
            id: coin.id,
            albumPhotoMode: "cut",
            albumObverseImage: obverse.data,
            albumReverseImage: reverse.data,
            albumPhotoRemovalConfidence: Math.min(
              obverse.confidence || 100,
              reverse.confidence || 100,
            ),
            albumPhotoPreparedAt: new Date().toISOString(),
          });
          location.reload();
        });
        make("🖼️ Oryginał", () => {
          ApoMonet.upsertCoin({
            id: coin.id,
            albumPhotoMode: "original",
            albumObverseImage: null,
            albumReverseImage: null,
            albumPhotoPreparedAt: new Date().toISOString(),
          });
          location.reload();
        });
        make("🚫 Bez zdjęcia", () => {
          ApoMonet.upsertCoin({
            id: coin.id,
            albumPhotoMode: "none",
            albumObverseImage: null,
            albumReverseImage: null,
            albumPhotoPreparedAt: new Date().toISOString(),
          });
          location.reload();
        });
        wrap.appendChild(status);
        actions.appendChild(wrap);
      });
    };
    setTimeout(fix, 60);
    new MutationObserver(() => setTimeout(fix, 0)).observe(list, {
      childList: true,
      subtree: true,
    });
  }

  function hookExport() {
    if (!location.pathname.endsWith("export.html")) return;
    setTimeout(() => {
      const ids = parse("apomonet_export_ids") || [];
      const coins = ApoMonet.load().coins.filter((coin) => ids.includes(coin.id));
      const cards = [...document.querySelectorAll(".export-card")];
      cards.forEach((card, index) => {
        const coin = coins[index];
        if (!coin) return;
        const images = [...card.querySelectorAll(".coin-images img")];
        const obverse = albumPhoto(coin, "obverse");
        const reverse = albumPhoto(coin, "reverse");
        if (coin.albumPhotoMode === "none") {
          const box = card.querySelector(".coin-images");
          if (box) box.innerHTML = "";
        } else {
          if (images[0] && obverse) images[0].src = obverse;
          if (images[1] && reverse) images[1].src = reverse;
        }
      });
    }, 80);
  }

  addEventListener("DOMContentLoaded", () => {
    patchAssign();
    setTimeout(hookAnalyze, 40);
    hookAlbum();
    setTimeout(hookExport, 40);
  });
})();
