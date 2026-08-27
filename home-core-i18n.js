(() => {
  const translations = {
    "Identyfikacja oparta na źródłach": {
      en: "Source-grounded identification",
      de: "Quellenbasierte Identifizierung",
      fr: "Identification fondée sur les sources",
    },
    "Najpierw poprawne rozpoznanie": {
      en: "Correct identification comes first",
      de: "Korrekte Identifizierung zuerst",
      fr: "D’abord une identification correcte",
    },
    "Dwa zdjęcia, widoczne cechy, kandydaci katalogowi i jawny poziom pewności. Gdy brakuje dowodu, APO mówi czego potrzeba zamiast zgadywać.": {
      en: "Two photos, visible evidence, catalogue candidates and explicit confidence. When evidence is missing, APO says what is needed instead of guessing.",
      de: "Zwei Fotos, sichtbare Merkmale, Katalogkandidaten und transparente Sicherheit. Fehlt ein Beleg, nennt APO den Bedarf, statt zu raten.",
      fr: "Deux photos, des indices visibles, des candidats de catalogue et un niveau de confiance explicite. Si une preuve manque, APO indique ce qui est nécessaire au lieu de deviner.",
    },
    "Dodaj awers i rewers. APO porówna portret, legendy, rok, nominał, mennicę, znaki i pomiary z pozycjami źródłowymi.": {
      en: "Add obverse and reverse. APO compares the portrait, legends, year, denomination, mint, marks and measurements with source records.",
      de: "Fügen Sie Vorder- und Rückseite hinzu. APO vergleicht Porträt, Legenden, Jahr, Nominal, Münzstätte, Zeichen und Maße mit Quellenbelegen.",
      fr: "Ajoutez l’avers et le revers. APO compare le portrait, les légendes, l’année, la valeur, l’atelier, les marques et les mesures aux sources.",
    },
    "Zdjęcia, zaakceptowana identyfikacja, notatki i historia korekt.": {
      en: "Photos, accepted identification, notes and correction history.",
      de: "Fotos, bestätigte Identifizierung, Notizen und Korrekturverlauf.",
      fr: "Photos, identification acceptée, notes et historique des corrections.",
    },
    "Układaj kolekcję według epoki, władcy, mennicy albo własnego klucza.": {
      en: "Organize the collection by period, ruler, mint or your own system.",
      de: "Ordnen Sie die Sammlung nach Epoche, Herrscher, Münzstätte oder eigenem System.",
      fr: "Classez la collection par époque, souverain, atelier ou selon votre propre système.",
    },
    "NOWY RDZEŃ": { en: "NEW CORE", de: "NEUER KERN", fr: "NOUVEAU CŒUR" },
    "Identyfikacja jest oddzielona od oceny stanu i od rynku. Wycena ani link aukcyjny nie mogą wpływać na nazwę monety.": {
      en: "Identification is separate from condition and market analysis. Neither a valuation nor an auction link may influence the coin name.",
      de: "Identifizierung ist von Erhaltung und Markt getrennt. Weder Bewertung noch Auktionslink dürfen den Münznamen beeinflussen.",
      fr: "L’identification est séparée de l’état et du marché. Ni l’estimation ni un lien de vente ne peuvent influencer le nom de la monnaie.",
    },
    "Uczciwa niepewność": {
      en: "Honest uncertainty",
      de: "Ehrliche Unsicherheit",
      fr: "Incertitude honnête",
    },
    "Sprzeczny rok, nominał, mennica, masa lub średnica blokują pewny wynik. Dostaniesz wtedy kandydatów i konkretną informację, co zmierzyć.": {
      en: "A conflicting year, denomination, mint, weight or diameter blocks a confirmed result. You then get candidates and a specific measurement request.",
      de: "Widersprüchliches Jahr, Nominal, Münzstätte, Gewicht oder Durchmesser blockieren ein sicheres Ergebnis. Dann erhalten Sie Kandidaten und eine konkrete Messanforderung.",
      fr: "Une année, une valeur, un atelier, un poids ou un diamètre contradictoire bloque un résultat confirmé. Vous obtenez alors des candidats et la mesure précise à fournir.",
    },
  };

  function language() {
    return (
      window.ApoLanguageRegistry?.current?.() ||
      window.ApoI18n?.current?.() ||
      localStorage.getItem("apomonet_language_v2") ||
      "pl"
    );
  }

  function render() {
    if (!location.pathname.endsWith("/") && !location.pathname.endsWith("index.html")) return;
    const active = language();
    if (active === "pl") return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || ["SCRIPT", "STYLE"].includes(node.parentElement.tagName)) continue;
      const source = node.nodeValue.trim();
      const translated = translations[source]?.[active];
      if (translated) node.nodeValue = node.nodeValue.replace(source, translated);
    }
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", render)
    : render();
})();
