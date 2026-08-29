(() => {
  if (!location.pathname.endsWith("analyze.html")) return;
  const T = {
    pl: {
      title: "Sprawdź dane przed zapisem",
      deep: "🔬 Analiza szczegółowa",
      deepHint: "Sprawdź odmianę, legendy, znaki i katalog.",
      save: "💾 Zapisz",
      saveHint: "Zachowaj dane i oba zdjęcia w kolekcji.",
      album: "📚 Zapisz i wybierz album",
      albumHint: "Wybierz album albo utwórz nowy.",
    },
    en: {
      title: "Review the data before saving",
      deep: "🔬 Detailed analysis",
      deepHint: "Check the variety, legends, marks and catalog.",
      save: "💾 Save",
      saveHint: "Keep the data and both photos in your collection.",
      album: "📚 Save and choose album",
      albumHint: "Choose an album or create a new one.",
    },
    de: {
      title: "Daten vor dem Speichern prüfen",
      deep: "🔬 Detailanalyse",
      deepHint: "Variante, Legenden, Zeichen und Katalog prüfen.",
      save: "💾 Speichern",
      saveHint: "Daten und beide Fotos in der Sammlung speichern.",
      album: "📚 Speichern und Album wählen",
      albumHint: "Album wählen oder neu erstellen.",
    },
    fr: {
      title: "Vérifiez les données avant l’enregistrement",
      deep: "🔬 Analyse détaillée",
      deepHint: "Vérifiez la variété, les légendes, les marques et le catalogue.",
      save: "💾 Enregistrer",
      saveHint: "Conservez les données et les deux photos dans la collection.",
      album: "📚 Enregistrer et choisir un album",
      albumHint: "Choisissez un album ou créez-en un.",
    },
  };
  const language = () =>
    window.ApoLanguageRegistry?.current?.() || window.ApoI18n?.current?.() ||
    localStorage.getItem("apomonet_language_v2") || "pl";
  const text = (key) => T[language()]?.[key] || T.en[key] || T.pl[key] || key;

  function setAction(id, labelKey, hintKey) {
    const button = document.getElementById(id);
    if (!button) return;
    const strong = button.querySelector("strong");
    const hint = button.querySelector("span");
    if (strong) strong.textContent = text(labelKey);
    if (hint) hint.textContent = text(hintKey);
  }

  function render() {
    const title = document.getElementById("resultActionsTitle");
    if (title) title.textContent = text("title");
    setAction("deep", "deep", "deepHint");
    setAction("save", "save", "saveHint");
    setAction("album", "album", "albumHint");
    document.getElementById("apoNextActionBar")?.remove();
    document.body.style.paddingBottom = "";
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", render) : render();
  ["languagechange", "apo-language-changed", "apomonet:language-change"].forEach((eventName) =>
    addEventListener(eventName, () => setTimeout(render, 0)),
  );
})();
