(() => {
  const LANG_KEY = "apomonet_language_v2";

  function lang() {
    const value = localStorage.getItem(LANG_KEY) || "pl";
    return ["pl", "en", "de", "fr"].includes(value) ? value : "pl";
  }

  function t(key, vars = {}) {
    const L = lang();
    const D = {
      custom: { pl: "Własny", en: "Custom", de: "Eigenes", fr: "Personnel" },
      customDesc: { pl: "Własny album użytkownika.", en: "Your custom album.", de: "Ihr eigenes Album.", fr: "Votre album personnel." },
      coinOne: { pl: "moneta", en: "coin", de: "Münze", fr: "monnaie" },
      coinMany: { pl: "monet", en: "coins", de: "Münzen", fr: "monnaies" },
      tapOpen: { pl: "dotknij, aby otworzyć", en: "tap to open", de: "antippen zum Öffnen", fr: "touchez pour ouvrir" },
      thumbAlt: { pl: "Miniatura monety", en: "Coin thumbnail", de: "Münzminiatur", fr: "Miniature de monnaie" },
      newAlbumPrompt: { pl: "Nazwa nowego albumu:", en: "New album name:", de: "Name des neuen Albums:", fr: "Nom du nouvel album :" },
      created: { pl: "Album „{name}” został utworzony. Otworzyć go teraz?", en: "Album “{name}” was created. Open it now?", de: "Album „{name}” wurde erstellt. Jetzt öffnen?", fr: "L’album « {name} » a été créé. L’ouvrir maintenant ?" }
    };
    let text = D[key]?.[L] || D[key]?.pl || key;
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, value);
    return text;
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function albumPhoto(coin) {
    return window.ApoAlbumPhotos
      ? ApoAlbumPhotos.resolve(coin, "obverse")
      : coin?.obverseImage || coin?.reverseImage || coin?.image || coin?.img || "";
  }

  function coverPhotos(coins) {
    const photos = coins.map(albumPhoto).filter(Boolean).slice(0, 4);
    return Array.from({ length: 4 }, (_, index) => {
      const source = photos[index];
      return source
        ? `<img class="cover-coin" src="${esc(source)}" alt="${esc(t("thumbAlt"))}" loading="lazy">`
        : '<div class="cover-coin"></div>';
    }).join("");
  }

  function mount() {
    if (!location.pathname.endsWith("albums.html") || !window.ApoMonet) return;
    const grid = document.querySelector(".album-grid");
    if (!grid) return;

    const draw = () => {
      grid.querySelectorAll('[data-user-album="1"]').forEach((item) => item.remove());
      const state = ApoMonet.load();
      const albums = (state.albums || []).filter((album) => album?.id);
      for (const album of albums) {
        const coins = (state.coins || []).filter((coin) =>
          (coin.albumIds || []).includes(album.id),
        );
        const element = document.createElement("a");
        element.className = "album album-cover";
        element.dataset.userAlbum = "1";
        element.href = "user-album.html?id=" + encodeURIComponent(album.id);
        const countLabel = coins.length === 1 ? t("coinOne") : t("coinMany");
        element.innerHTML = `<div><span class="album-tag">${esc(t("custom"))}</span><h2>${esc(album.name)}</h2><p class="muted">${esc(album.description || t("customDesc"))}</p><div class="album-stats">${coins.length} ${esc(countLabel)} • ${esc(t("tapOpen"))}</div></div><div class="cover-coins">${coverPhotos(coins)}</div>`;
        grid.appendChild(element);
      }
    };

    const button = [...document.querySelectorAll("button")].find((item) =>
      item.textContent.includes("Nowy album") || item.textContent.includes("New album") || item.textContent.includes("Neues Album") || item.textContent.includes("Nouvel album"),
    );
    if (button) {
      button.onclick = () => {
        const name = prompt(t("newAlbumPrompt"));
        if (!name?.trim()) return;
        const album = ApoMonet.createAlbum(name.trim());
        draw();
        if (
          album &&
          confirm(t("created", { name: album.name }))
        ) {
          location.href = "user-album.html?id=" + encodeURIComponent(album.id);
        }
      };
    }

    draw();
    window.addEventListener("storage", (event) => {
      if (event.key === LANG_KEY) draw();
    });
    new MutationObserver(() => {
      if (
        !grid.querySelector('[data-user-album="1"]') &&
        (ApoMonet.load().albums || []).length
      ) {
        draw();
      }
    }).observe(grid, { childList: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(mount, 20));
  } else {
    setTimeout(mount, 20);
  }
})();
