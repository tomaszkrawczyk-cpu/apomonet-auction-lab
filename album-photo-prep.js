(() => {
  const PENDING = "apomonetAlbumPhotoPrep";
  const CUT_VERSION = 2;
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
      pl: "Najlepszy wynik daje jednolite, kontrastowe tło. Oryginały pozostaną bez zmian, a zaakceptowana wersja PNG będzie widoczna na karcie monety, w albumie i eksporcie.",
      en: "A plain, contrasting background gives the best result. Originals remain unchanged; the accepted transparent PNG is shown on the coin card, in albums and exports.",
      de: "Ein einfarbiger, kontrastreicher Hintergrund liefert das beste Ergebnis. Die Originale bleiben unverändert; die akzeptierte transparente PNG-Version erscheint auf der Münzkarte, im Album und im Export.",
      fr: "Un fond uni et contrasté donne le meilleur résultat. Les originaux restent inchangés ; le PNG transparent accepté apparaît sur la fiche, dans l’album et dans l’export.",
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
    fallback: {
      pl: "Nie udało się bezpiecznie usunąć tła. Zachowuję oba oryginalne zdjęcia i przechodzę do wyboru albumu.",
      en: "The background could not be removed safely. Both original photos will be kept and album selection will continue.",
      de: "Der Hintergrund konnte nicht sicher entfernt werden. Beide Originalfotos bleiben erhalten; die Albumauswahl wird fortgesetzt.",
      fr: "Le fond n’a pas pu être supprimé en toute sécurité. Les deux photos originales sont conservées et la sélection de l’album continue.",
    },
    success: {
      pl: "Tło usunięte. Sprawdź jeszcze rant przed zapisaniem.",
      en: "Background removed. Check the rim before saving.",
      de: "Hintergrund entfernt. Prüfen Sie vor dem Speichern noch den Rand.",
      fr: "Arrière-plan supprimé. Vérifiez le bord avant d’enregistrer.",
    },
    reviewTitle: {
      pl: "Czy krawędzie wyglądają dobrze?",
      en: "Do the edges look right?",
      de: "Sehen die Ränder richtig aus?",
      fr: "Les bords sont-ils corrects ?",
    },
    reviewHelp: {
      pl: "Jeśli widzisz białe tło, cień albo ucięty rant, zostaw oryginalne zdjęcie.",
      en: "If you see a white area, a shadow or a cropped rim, keep the original photo.",
      de: "Wenn Sie eine weiße Fläche, einen Schatten oder einen abgeschnittenen Rand sehen, behalten Sie das Originalfoto.",
      fr: "Si vous voyez une zone blanche, une ombre ou un bord coupé, conservez la photo originale.",
    },
    acceptCut: {
      pl: "✓ Tak — zapisz wycięcie",
      en: "✓ Yes — save the cutout",
      de: "✓ Ja — Freistellung speichern",
      fr: "✓ Oui — enregistrer le détourage",
    },
    acceptObverse: {
      pl: "Zapisz wycięty awers, rewers zostaw oryginalny",
      en: "Save the cutout obverse; keep the original reverse",
      de: "Freigestellte Vorderseite speichern; Rückseite original lassen",
      fr: "Enregistrer l’avers détouré ; conserver le revers original",
    },
    acceptReverse: {
      pl: "Zapisz wycięty rewers, awers zostaw oryginalny",
      en: "Save the cutout reverse; keep the original obverse",
      de: "Freigestellte Rückseite speichern; Vorderseite original lassen",
      fr: "Enregistrer le revers détouré ; conserver l’avers original",
    },
    keepOriginal: {
      pl: "🖼️ Zostaw oryginalne zdjęcie",
      en: "🖼️ Keep the original photo",
      de: "🖼️ Originalfoto behalten",
      fr: "🖼️ Conserver la photo originale",
    },
    reviewBack: {
      pl: "Wróć",
      en: "Back",
      de: "Zurück",
      fr: "Retour",
    },
  };
  const msg = (key) => messages[key]?.[language()] || messages[key]?.pl || "";
  const currentCoin = () => {
    const session = parse("apomonetAnalysisSession");
    return session?.id && window.ApoMonet ? ApoMonet.getCoin(session.id) : null;
  };

  const clamp = (value, minimum, maximum) =>
    Math.max(minimum, Math.min(maximum, value));

  function median(values) {
    const ordered = [...values].sort((a, b) => a - b);
    return ordered[Math.floor(ordered.length / 2)] || 0;
  }

  function traceBoundaryPixels(width, height, rgba, detection) {
    const count = 144;
    const radius = Number(detection?.r || 0);
    if (!width || !height || !rgba?.length || !radius) {
      return { reliable: false, reason: "missing-pixels", scales: [] };
    }

    const sample = (x, y) => {
      const centerX = clamp(Math.round(x), 0, width - 1);
      const centerY = clamp(Math.round(y), 0, height - 1);
      let red = 0;
      let green = 0;
      let blue = 0;
      let samples = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const px = clamp(centerX + dx, 0, width - 1);
          const py = clamp(centerY + dy, 0, height - 1);
          const index = (py * width + px) * 4;
          red += rgba[index];
          green += rgba[index + 1];
          blue += rgba[index + 2];
          samples += 1;
        }
      }
      return [red / samples, green / samples, blue / samples];
    };
    const difference = (first, second) =>
      Math.hypot(
        first[0] - second[0],
        first[1] - second[1],
        first[2] - second[2],
      ) / Math.sqrt(3);

    const rawScales = [];
    const strengths = [];
    for (let index = 0; index < count; index += 1) {
      const angle = (index * Math.PI * 2) / count;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const atScale = (scale) =>
        sample(
          detection.cx + cosine * radius * scale,
          detection.cy + sine * radius * scale,
        );
      const backgroundSamples = [1.075, 1.095, 1.11].map(atScale);
      const background = [0, 1, 2].map(
        (channel) =>
          backgroundSamples.reduce((sum, color) => sum + color[channel], 0) /
          backgroundSamples.length,
      );

      let previousDistance = difference(atScale(1.055), background);
      let bestScale = 0.98;
      let bestStrength = -Infinity;
      for (let scale = 1.0475; scale >= 0.87; scale -= 0.0075) {
        const distance = difference(atScale(scale), background);
        const transition = distance - previousDistance;
        const expectedEdgePenalty = Math.abs(scale - 0.98) * 5;
        const strength = transition - expectedEdgePenalty;
        if (strength > bestStrength) {
          bestStrength = strength;
          bestScale = scale + 0.00375;
        }
        previousDistance = distance;
      }
      rawScales.push(clamp(bestScale, 0.88, 1.035));
      strengths.push(bestStrength);
    }

    const strong = strengths.map((strength) => strength >= 7.5);
    const coverage = strong.filter(Boolean).length / count;
    const globalMedian = median(rawScales.filter((_, index) => strong[index]));
    const repaired = rawScales.map((scale, index) => {
      if (strong[index]) return scale;
      const nearby = [];
      for (let offset = -7; offset <= 7; offset += 1) {
        const candidate = (index + offset + count) % count;
        if (strong[candidate]) nearby.push(rawScales[candidate]);
      }
      return nearby.length ? median(nearby) : globalMedian || 0.98;
    });
    const medianSmoothed = repaired.map((_, index) => {
      const nearby = [];
      for (let offset = -3; offset <= 3; offset += 1) {
        nearby.push(repaired[(index + offset + count) % count]);
      }
      return median(nearby);
    });
    const scales = medianSmoothed.map((_, index) => {
      let sum = 0;
      for (let offset = -2; offset <= 2; offset += 1) {
        sum += medianSmoothed[(index + offset + count) % count];
      }
      return clamp(sum / 5, 0.88, 1.035);
    });
    const ordered = [...scales].sort((a, b) => a - b);
    const low = ordered[Math.floor(count * 0.1)];
    const high = ordered[Math.floor(count * 0.9)];
    const spread = high - low;
    const average = scales.reduce((sum, scale) => sum + scale, 0) / count;
    const reliable = coverage >= 0.68 && spread <= 0.16 && average >= 0.89;

    return {
      reliable,
      reason: reliable ? "traced-edge" : "uncertain-trace",
      scales,
      strengths,
      coverage,
      spread,
      average,
    };
  }

  function traceBoundary(canvas, detection) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    return traceBoundaryPixels(canvas.width, canvas.height, pixels, detection);
  }

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

          const boundary = traceBoundary(work, detection);
          if (!boundary.reliable) {
            return resolve({ data, removed: false, reason: boundary.reason });
          }

          const size = Math.max(320, Math.min(720, Math.round(half * 2)));
          const output = document.createElement("canvas");
          output.width = output.height = size;
          const context = output.getContext("2d");
          context.clearRect(0, 0, size, size);
          context.save();
          context.beginPath();
          boundary.scales.forEach((scale, index) => {
            const angle = (index * Math.PI * 2) / boundary.scales.length;
            const sourceX =
              detection.cx + Math.cos(angle) * detection.r * scale * 0.992;
            const sourceY =
              detection.cy + Math.sin(angle) * detection.r * scale * 0.992;
            const outputX = ((sourceX - left) / (half * 2)) * size;
            const outputY = ((sourceY - top) / (half * 2)) * size;
            if (index === 0) context.moveTo(outputX, outputY);
            else context.lineTo(outputX, outputY);
          });
          context.closePath();
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
            edgeCoverage: boundary.coverage,
            cutVersion: CUT_VERSION,
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

  function reviewCut(obverse, reverse) {
    return new Promise((resolve) => {
      const background = document.createElement("div");
      background.style.cssText =
        "position:fixed;inset:0;background:#000e;z-index:12010;display:grid;place-items:center;padding:18px";
      const box = document.createElement("div");
      box.style.cssText =
        "width:min(520px,100%);max-height:92vh;overflow:auto;background:#111113;border:1px solid #4a361b;border-radius:22px;padding:20px";
      box.innerHTML = `<span class="eyebrow">Zdjęcie do albumu</span><h2 style="margin:8px 0 6px">${msg("reviewTitle")}</h2><p style="color:#aaa;line-height:1.5">${msg("reviewHelp")}</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0"><figure style="margin:0"><div style="aspect-ratio:1;background:#080809;border:1px solid #303034;border-radius:16px;display:grid;place-items:center;overflow:hidden"><img src="${obverse.data}" alt="Awers po usunięciu tła" style="width:94%;height:94%;object-fit:contain"></div><figcaption style="text-align:center;color:#aaa;margin-top:6px">Awers</figcaption></figure><figure style="margin:0"><div style="aspect-ratio:1;background:#080809;border:1px solid #303034;border-radius:16px;display:grid;place-items:center;overflow:hidden"><img src="${reverse.data}" alt="Rewers po usunięciu tła" style="width:94%;height:94%;object-fit:contain"></div><figcaption style="text-align:center;color:#aaa;margin-top:6px">Rewers</figcaption></figure></div>`;
      const make = (text, kind, result) => {
        const button = document.createElement("button");
        button.className = `btn ${kind} full`;
        button.style.marginTop = "9px";
        button.textContent = text;
        button.onclick = () => {
          background.remove();
          resolve(result);
        };
        box.appendChild(button);
      };
      make(msg("acceptCut"), "primary", "accept");
      make(msg("acceptObverse"), "secondary", "obverse");
      make(msg("acceptReverse"), "secondary", "reverse");
      make(msg("keepOriginal"), "secondary", "original");
      make(msg("reviewBack"), "secondary", "back");
      background.appendChild(box);
      document.body.appendChild(background);
    });
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
        if (pending.mode === "cut" || pending.mode === "mixed") {
          patch.albumObverseImage = pending.obverse || null;
          patch.albumReverseImage = pending.reverse || null;
          patch.albumObversePhotoMode = pending.obverseMode || "cut";
          patch.albumReversePhotoMode = pending.reverseMode || "cut";
          patch.albumPhotoRemovalConfidence = pending.confidence || null;
          patch.albumPhotoPrepVersion = pending.cutVersion || CUT_VERSION;
        } else {
          patch.albumObverseImage = null;
          patch.albumReverseImage = null;
          patch.albumObversePhotoMode = pending.mode;
          patch.albumReversePhotoMode = pending.mode;
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
    button.onclick = (event) => {
      event?.preventDefault?.();
      clearPending();
      const coin = currentCoin();
      const coinId = coin?.id || null;
      // „Zapisz i wybierz album” musi wykonać dokładnie tę akcję jednym
      // kliknięciem. Przygotowanie fotografii jest niezależną opcją na karcie
      // albumu i nie może zatrzymywać zapisu ani otwarcia listy albumów.
      setPending({ mode: "original", coinId });
      if (typeof original === "function") original.call(button, event);
    };
  }

  function albumPhoto(coin, side = "obverse") {
    if (!coin) return "";
    if (coin.albumPhotoMode === "none") return "";
    const isObverse = side === "obverse";
    const sideMode = isObverse
      ? coin.albumObversePhotoMode || (coin.albumPhotoMode === "cut" ? "cut" : "original")
      : coin.albumReversePhotoMode || (coin.albumPhotoMode === "cut" ? "cut" : "original");
    if (sideMode === "cut" && Number(coin.albumPhotoPrepVersion || 0) >= CUT_VERSION) {
      const prepared = isObverse ? coin.albumObverseImage : coin.albumReverseImage;
      if (prepared) return prepared;
    }
    return isObverse
      ? coin.obverseImage || coin.image || coin.img || ""
      : coin.reverseImage || "";
  }

  // Jedno źródło prawdy dla karty, albumów, okładek i eksportu.
  // Oryginały pozostają w rekordzie, a tryb albumowy steruje prezentacją.
  window.ApoAlbumPhotos = Object.freeze({
    resolve: albumPhoto,
    cutVersion: CUT_VERSION,
    traceBoundaryPixels,
  });

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
          status.textContent = msg("success");
          const choice = await reviewCut(obverse, reverse);
          if (choice === "back") {
            control.disabled = false;
            status.textContent = "";
            return;
          }
          if (choice === "original") {
            ApoMonet.upsertCoin({
              id: coin.id,
              albumPhotoMode: "original",
              albumObverseImage: null,
              albumReverseImage: null,
              albumPhotoPreparedAt: new Date().toISOString(),
            });
            location.reload();
            return;
          }
          ApoMonet.upsertCoin({
            id: coin.id,
            albumPhotoMode: "cut",
            albumObverseImage: obverse.data,
            albumReverseImage: reverse.data,
            albumPhotoPrepVersion: CUT_VERSION,
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
