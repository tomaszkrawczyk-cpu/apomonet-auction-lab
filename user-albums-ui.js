(() => {
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
        ? `<img class="cover-coin" src="${esc(source)}" alt="Miniatura monety" loading="lazy">`
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
        element.innerHTML = `<div><span class="album-tag">Własny</span><h2>${esc(album.name)}</h2><p class="muted">${esc(album.description || "Własny album użytkownika.")}</p><div class="album-stats">${coins.length} ${coins.length === 1 ? "moneta" : "monet"} • dotknij, aby otworzyć</div></div><div class="cover-coins">${coverPhotos(coins)}</div>`;
        grid.appendChild(element);
      }
    };

    const button = [...document.querySelectorAll("button")].find((item) =>
      item.textContent.includes("Nowy album"),
    );
    if (button) {
      button.onclick = () => {
        const name = prompt("Nazwa nowego albumu:");
        if (!name?.trim()) return;
        const album = ApoMonet.createAlbum(name.trim());
        draw();
        if (
          album &&
          confirm(`Album „${album.name}” został utworzony. Otworzyć go teraz?`)
        ) {
          location.href = "user-album.html?id=" + encodeURIComponent(album.id);
        }
      };
    }

    draw();
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
