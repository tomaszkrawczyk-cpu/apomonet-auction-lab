(() => {
  function assignAndVerify({ coin, albumId, store } = {}) {
    if (!coin?.id || !albumId || !store?.assignCoinToAlbum) {
      throw new Error("Nie udało się przygotować przypisania monety do albumu.");
    }
    const assigned = store.assignCoinToAlbum(coin.id, String(albumId));
    const verified = store.getCoin?.(coin.id) || assigned;
    if (!verified?.albumIds?.includes(String(albumId))) {
      throw new Error("Nie udało się potwierdzić dodania monety do wybranego albumu.");
    }
    return verified;
  }

  function open({
    coin,
    store,
    list,
    modal,
    documentRef = document,
    onSuccess = () => {},
    onError = () => {},
    emptyText = "Nie masz jeszcze albumów.",
    noDescriptionText = "Bez opisu",
  } = {}) {
    if (!coin?.id || !store || !list || !modal) {
      onError(new Error("Nie udało się przygotować wyboru albumu."));
      return false;
    }
    const state = store.load?.();
    const albums = Array.isArray(state?.albums) ? state.albums : [];
    list.replaceChildren();
    if (!albums.length) {
      const empty = documentRef.createElement("div");
      empty.className = "empty";
      empty.textContent = emptyText;
      list.appendChild(empty);
    } else {
      for (const album of albums) {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = "album-option";
        button.dataset.id = String(album.id);
        const name = documentRef.createElement("b");
        name.textContent = String(album.name || "Album");
        const description = documentRef.createElement("span");
        description.textContent = String(album.description || noDescriptionText);
        button.append(name, documentRef.createElement("br"), description);
        button.onclick = () => {
          try {
            const verified = assignAndVerify({ coin, albumId: button.dataset.id, store });
            modal.classList.add("hidden");
            onSuccess(verified, button.dataset.id);
          } catch (error) {
            onError(error);
          }
        };
        list.appendChild(button);
      }
    }
    modal.classList.remove("hidden");
    return true;
  }

  window.ApoAnalysisAlbumFlow = Object.freeze({ open, assignAndVerify });
})();
