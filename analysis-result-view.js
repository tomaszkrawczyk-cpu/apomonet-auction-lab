(() => {
  if (!location.pathname.endsWith("analyze.html")) return;

  const COPY = {
    pl: {
      preliminary: "Wstępna identyfikacja",
      confirmed: "Wysoka zgodność",
      partial: "Identyfikacja częściowa",
      unresolved: "Wynik nierozstrzygnięty",
      confidence: "Pewność AI",
      fieldsOnly: "Pewne pola zachowane",
      country: "Kraj / obszar",
      issuer: "Emitent",
      ruler: "Władca",
      depictedPerson: "Postać na monecie",
      year: "Rok",
      nominal: "Nominał",
      mint: "Mennica",
      metal: "Metal",
      grade: "Stan zachowania",
      unknown: "Nie ustalono",
      typeKnown: "Typ podstawowy ustalony — odmiana wymaga analizy szczegółowej.",
      partialKnown: "Pokazano tylko pola, które przeszły kontrolę zgodności. Niepewnych danych nie uzupełniono zgadywaniem.",
      disclaimer: "Wynik służy do wstępnej identyfikacji. Nie potwierdza autentyczności i nie zastępuje opinii specjalisty.",
      why: "Dlaczego taki wynik?",
      summary: "Krótkie uzasadnienie",
      more: "Dodatkowe wskazówki i źródła",
      detailTitle: "Analiza szczegółowa",
      detailConfidence: "Pewność analizy szczegółowej",
      varietyKnown: "Odmiana ustalona",
      varietyUnknown: "Typ ustalony — odmiana nierozstrzygnięta",
      varietyHint: "Do rozstrzygnięcia odmiany potrzebne jest lepsze zdjęcie cechy diagnostycznej wskazanej poniżej.",
      detailEvidence: "Cechy odmiany i ograniczenia",
      variant: "Odmiana / typ",
      catalog: "Numer katalogowy",
      rarity: "Stopień rzadkości",
      notCertified: "Analiza szczegółowa nadal jest identyfikacją pomocniczą, a nie ekspertyzą ani certyfikatem autentyczności.",
      matchingCandidate: "Zgodny kandydat katalogowy",
      partialFields: "Identyfikacja częściowa — pewne pola zachowane",
      candidateOnly: "Kandydat — wynik jeszcze nierozstrzygnięty",
      held: "Identyfikacja wstrzymana",
      establishedIndependently: "Ustalone niezależnie od pełnego werdyktu",
      resolves: "Co może rozstrzygnąć wynik",
      nearestSources: "Najbliższe pozycje źródłowe",
      dateReading: "Data — odczyt cyfr",
      obverseLegend: "Legenda awersu",
      reverseLegend: "Legenda rewersu",
      mintmaster: "Mincerz / znak urzędnika",
      punctuation: "Interpunkcja legendy",
      obverseObservations: "Awers — obserwacje",
      reverseObservations: "Rewers — obserwacje",
      gradeAssessment: "Stan — ocena ostrożna",
      diagnosticFeatures: "Cechy diagnostyczne",
      authenticityObservations: "Autentyczność — obserwacje, nie certyfikat",
      resolvingChecks: "Co może rozstrzygnąć wynik",
      limitations: "Uwagi i ograniczenia",
      fullDescription: "Pełny opis",
      unc: "Menniczy",
      au: "Prawie menniczy",
      xf: "Bardzo piękny",
      vf: "Piękny",
      f: "Bardzo dobry",
      vg: "Dobry",
      g: "Dostateczny",
    },
    en: {
      preliminary: "Preliminary identification",
      confirmed: "High match",
      partial: "Partial identification",
      unresolved: "Unresolved result",
      confidence: "AI confidence",
      fieldsOnly: "Reliable fields retained",
      country: "Country / area",
      issuer: "Issuer",
      ruler: "Ruler",
      depictedPerson: "Person depicted",
      year: "Year",
      nominal: "Denomination",
      mint: "Mint",
      metal: "Metal",
      grade: "Condition",
      unknown: "Not determined",
      typeKnown: "Basic type identified — the variety requires detailed analysis.",
      partialKnown: "Only fields that passed the consistency check are shown. Uncertain data was not guessed.",
      disclaimer: "This result is intended for preliminary identification. It does not confirm authenticity or replace a specialist opinion.",
      why: "Why this result?",
      summary: "Short explanation",
      more: "Additional guidance and sources",
      detailTitle: "Detailed analysis",
      detailConfidence: "Detailed-analysis confidence",
      varietyKnown: "Variety identified",
      varietyUnknown: "Type identified — variety unresolved",
      varietyHint: "A better photo of the diagnostic feature indicated below is needed to resolve the variety.",
      detailEvidence: "Variety evidence and limitations",
      variant: "Variety / type",
      catalog: "Catalog reference",
      rarity: "Rarity grade",
      notCertified: "Detailed analysis remains an identification aid, not an expert opinion or authenticity certificate.",
      matchingCandidate: "Matching catalog candidate",
      partialFields: "Partial identification — reliable fields retained",
      candidateOnly: "Candidate — result not yet resolved",
      held: "Identification withheld",
      establishedIndependently: "Established independently of the full verdict",
      resolves: "What can resolve the result",
      nearestSources: "Closest source records",
      dateReading: "Date — digit reading",
      obverseLegend: "Obverse legend",
      reverseLegend: "Reverse legend",
      mintmaster: "Mintmaster / official mark",
      punctuation: "Legend punctuation",
      obverseObservations: "Obverse — observations",
      reverseObservations: "Reverse — observations",
      gradeAssessment: "Condition — cautious assessment",
      diagnosticFeatures: "Diagnostic features",
      authenticityObservations: "Authenticity — observations, not a certificate",
      resolvingChecks: "What can resolve the result",
      limitations: "Notes and limitations",
      fullDescription: "Full description",
      unc: "Uncirculated",
      au: "About Uncirculated",
      xf: "Extremely Fine",
      vf: "Very Fine",
      f: "Fine",
      vg: "Very Good",
      g: "Good",
    },
    de: {
      preliminary: "Vorläufige Bestimmung",
      confirmed: "Hohe Übereinstimmung",
      partial: "Teilbestimmung",
      unresolved: "Ergebnis nicht geklärt",
      confidence: "KI-Sicherheit",
      fieldsOnly: "Sichere Felder beibehalten",
      country: "Land / Gebiet",
      issuer: "Emittent",
      ruler: "Herrscher",
      depictedPerson: "Dargestellte Person",
      year: "Jahr",
      nominal: "Nominal",
      mint: "Münzstätte",
      metal: "Metall",
      grade: "Erhaltung",
      unknown: "Nicht bestimmt",
      typeKnown: "Grundtyp bestimmt — die Variante erfordert eine Detailanalyse.",
      partialKnown: "Es werden nur Felder angezeigt, die die Konsistenzprüfung bestanden haben. Unsichere Daten wurden nicht ergänzt.",
      disclaimer: "Dieses Ergebnis dient der vorläufigen Bestimmung. Es bestätigt weder die Echtheit noch ersetzt es die Meinung eines Spezialisten.",
      why: "Warum dieses Ergebnis?",
      summary: "Kurze Begründung",
      more: "Zusätzliche Hinweise und Quellen",
      detailTitle: "Detailanalyse",
      detailConfidence: "Sicherheit der Detailanalyse",
      varietyKnown: "Variante bestimmt",
      varietyUnknown: "Typ bestimmt — Variante nicht geklärt",
      varietyHint: "Zur Bestimmung der Variante ist ein besseres Foto des unten genannten diagnostischen Merkmals erforderlich.",
      detailEvidence: "Variantenmerkmale und Einschränkungen",
      variant: "Variante / Typ",
      catalog: "Katalognummer",
      rarity: "Seltenheitsgrad",
      notCertified: "Auch die Detailanalyse ist nur eine Bestimmungshilfe und weder Gutachten noch Echtheitszertifikat.",
      matchingCandidate: "Passender Katalogkandidat",
      partialFields: "Teilbestimmung — sichere Felder beibehalten",
      candidateOnly: "Kandidat — Ergebnis noch nicht geklärt",
      held: "Bestimmung zurückgestellt",
      establishedIndependently: "Unabhängig vom Gesamturteil bestimmt",
      resolves: "Was das Ergebnis klären kann",
      nearestSources: "Nächstgelegene Quelldatensätze",
      dateReading: "Datum — Ziffernlesung",
      obverseLegend: "Legende der Vorderseite",
      reverseLegend: "Legende der Rückseite",
      mintmaster: "Münzmeister / Amtszeichen",
      punctuation: "Interpunktion der Legende",
      obverseObservations: "Vorderseite — Beobachtungen",
      reverseObservations: "Rückseite — Beobachtungen",
      gradeAssessment: "Erhaltung — vorsichtige Einschätzung",
      diagnosticFeatures: "Diagnostische Merkmale",
      authenticityObservations: "Echtheit — Beobachtungen, kein Zertifikat",
      resolvingChecks: "Was das Ergebnis klären kann",
      limitations: "Hinweise und Einschränkungen",
      fullDescription: "Vollständige Beschreibung",
      unc: "Stempelglanz",
      au: "Fast Stempelglanz",
      xf: "Vorzüglich",
      vf: "Sehr schön",
      f: "Schön",
      vg: "Sehr gut",
      g: "Gut",
    },
    fr: {
      preliminary: "Identification préliminaire",
      confirmed: "Forte concordance",
      partial: "Identification partielle",
      unresolved: "Résultat non résolu",
      confidence: "Confiance IA",
      fieldsOnly: "Champs fiables conservés",
      country: "Pays / zone",
      issuer: "Émetteur",
      ruler: "Souverain",
      depictedPerson: "Personne représentée",
      year: "Année",
      nominal: "Valeur",
      mint: "Atelier",
      metal: "Métal",
      grade: "État de conservation",
      unknown: "Non déterminé",
      typeKnown: "Type de base identifié — la variété nécessite une analyse détaillée.",
      partialKnown: "Seuls les champs ayant passé le contrôle de cohérence sont affichés. Les données incertaines n’ont pas été devinées.",
      disclaimer: "Ce résultat sert à l’identification préliminaire. Il ne confirme pas l’authenticité et ne remplace pas l’avis d’un spécialiste.",
      why: "Pourquoi ce résultat ?",
      summary: "Brève justification",
      more: "Indications et sources supplémentaires",
      detailTitle: "Analyse détaillée",
      detailConfidence: "Confiance de l’analyse détaillée",
      varietyKnown: "Variété identifiée",
      varietyUnknown: "Type identifié — variété non résolue",
      varietyHint: "Une meilleure photo du détail diagnostique indiqué ci-dessous est nécessaire pour déterminer la variété.",
      detailEvidence: "Critères de variété et limites",
      variant: "Variété / type",
      catalog: "Référence catalogue",
      rarity: "Degré de rareté",
      notCertified: "L’analyse détaillée reste une aide à l’identification, et non une expertise ou un certificat d’authenticité.",
      matchingCandidate: "Candidat catalogue concordant",
      partialFields: "Identification partielle — champs fiables conservés",
      candidateOnly: "Candidat — résultat non encore résolu",
      held: "Identification suspendue",
      establishedIndependently: "Établi indépendamment du verdict complet",
      resolves: "Ce qui peut résoudre le résultat",
      nearestSources: "Fiches sources les plus proches",
      dateReading: "Date — lecture des chiffres",
      obverseLegend: "Légende de l’avers",
      reverseLegend: "Légende du revers",
      mintmaster: "Maître monnayeur / marque officielle",
      punctuation: "Ponctuation de la légende",
      obverseObservations: "Avers — observations",
      reverseObservations: "Revers — observations",
      gradeAssessment: "État — évaluation prudente",
      diagnosticFeatures: "Caractéristiques diagnostiques",
      authenticityObservations: "Authenticité — observations, pas un certificat",
      resolvingChecks: "Ce qui peut résoudre le résultat",
      limitations: "Remarques et limites",
      fullDescription: "Description complète",
      unc: "Fleur de coin",
      au: "Presque fleur de coin",
      xf: "Superbe",
      vf: "Très beau",
      f: "Beau",
      vg: "Très bon",
      g: "Bon",
    },
  };

  const language = () =>
    window.ApoLanguageRegistry?.current?.() ||
    window.ApoI18n?.current?.() ||
    localStorage.getItem("apomonet_language_v2") ||
    "pl";
  const text = (key) => COPY[language()]?.[key] || COPY.en[key] || COPY.pl[key] || key;
  const normalized = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ł/g, "l");
  const known = (value) => {
    const item = normalized(value).replace(/[.]+$/g, "");
    return Boolean(item) && !/^(?:nie ustalono|brak|unknown|not determined|undetermined|nicht bestimmt|unbestimmt|non determine|indetermine|—|-)$/.test(item);
  };

  function inferredIssuer(analysis) {
    if (known(analysis?.issuer)) return analysis.issuer;
    const candidate = analysis?.recognition?.selectedCandidate;
    if (known(candidate?.issuer)) return candidate.issuer;
    const title = normalized(candidate?.title || analysis?.title);
    const mint = String(analysis?.mint || candidate?.mint || "").trim();
    if (
      known(mint) &&
      title.includes(normalized(mint)) &&
      /oblez|siege|donatyw|miast|civitat|stadt|city/.test(title)
    ) {
      return mint;
    }
    return known(analysis?.ruler) ? analysis.ruler : "";
  }

  function inferredDepictedPerson(analysis) {
    if (known(analysis?.depictedPerson)) return analysis.depictedPerson;
    const portrait = String(analysis?.recognition?.observations?.portrait || "").trim();
    const normalizedPortrait = normalized(portrait);
    if (/chryst|christ|salvator|jezus|jesus/.test(normalizedPortrait)) {
      return { pl: "Chrystus", en: "Christ", de: "Christus", fr: "Christ" }[language()] || "Christ";
    }
    if (
      known(analysis?.ruler) &&
      /popiers|portret|profil|twarz|glow|bust|portrait|head|kopf/.test(normalizedPortrait)
    ) {
      return analysis.ruler;
    }
    return "";
  }

  function grade(value) {
    const code = normalized(value).replace(/[^a-z]/g, "");
    return COPY[language()]?.[code] || (known(value) ? value : "");
  }

  function value(value) {
    return known(value) ? String(value).trim() : text("unknown");
  }

  function rows(analysis) {
    return [
      [text("country"), analysis?.country],
      [text("issuer"), inferredIssuer(analysis)],
      [text("ruler"), analysis?.ruler],
      [text("depictedPerson"), inferredDepictedPerson(analysis)],
      [text("year"), analysis?.year],
      [text("nominal"), analysis?.nominal],
      [text("mint"), analysis?.mint],
      [text("metal"), analysis?.metal],
      [text("grade"), grade(analysis?.grade)],
    ];
  }

  function stageOneState(analysis) {
    const status = analysis?.recognition?.status || "unresolved";
    const confidence = Math.max(0, Math.min(95, Math.round(Number(analysis?.confidence) || 0)));
    if (status === "confirmed-candidate") {
      return { label: text("confirmed"), note: text("typeKnown"), confidence, tone: "confirmed" };
    }
    const partialFields = analysis?.recognition?.partialIdentity?.populatedFields;
    const hasPartialIdentity = Array.isArray(partialFields) && partialFields.length > 0;
    if (status === "candidate-only" || hasPartialIdentity) {
      return { label: text("partial"), note: text("partialKnown"), confidence, tone: "partial" };
    }
    return { label: text("unresolved"), note: text("partialKnown"), confidence, tone: "unresolved" };
  }

  function stageTwoState(detail) {
    const confidence = Math.max(0, Math.min(95, Math.round(Number(detail?.confidence) || 0)));
    const diagnostics = Array.isArray(detail?.diagnosticFeatures)
      ? detail.diagnosticFeatures.filter(known)
      : [];
    const established = known(detail?.variant) && confidence >= 80 && diagnostics.length >= 2;
    const requested = Array.isArray(detail?.recommendedChecks)
      ? detail.recommendedChecks.find(known)
      : "";
    return {
      established,
      label: established ? text("varietyKnown") : text("varietyUnknown"),
      note: established ? "" : requested || text("varietyHint"),
      confidence,
    };
  }

  const BASIC_EXTRA_IDS = [
    "analysisQualityBox",
    "deepRecommendation",
    "catalogCheck",
    "catalogRarity",
    "auctionMarketFacts",
    "ownerMeasurementsBox",
    "apomonetFollowUps",
    "referenceEvidenceBox",
  ];
  const DETAIL_EXTRA_IDS = ["stage2Literature"];

  function adoptExtras() {
    const basic = document.getElementById("resultMoreContent");
    const detail = document.getElementById("deepMoreContent");
    if (basic) {
      for (const id of BASIC_EXTRA_IDS) {
        const node = document.getElementById(id);
        if (node && node.parentElement !== basic) {
          if (node.tagName === "DETAILS") node.open = false;
          basic.appendChild(node);
        }
      }
    }
    if (detail) {
      for (const id of DETAIL_EXTRA_IDS) {
        const node = document.getElementById(id);
        if (node && node.parentElement !== detail) detail.appendChild(node);
      }
    }
  }

  function applyStaticCopy() {
    const pairs = {
      resultStageLabel: "preliminary",
      resultDisclaimer: "disclaimer",
      resultWhySummary: "why",
      resultSummaryLabel: "summary",
      resultMoreSummary: "more",
      deepTitle: "detailTitle",
      deepWhySummary: "detailEvidence",
      deepDisclaimer: "notCertified",
    };
    for (const [id, key] of Object.entries(pairs)) {
      const node = document.getElementById(id);
      if (node) node.textContent = text(key);
    }
    adoptExtras();
  }

  function init() {
    applyStaticCopy();
    new MutationObserver(adoptExtras).observe(document.body, { childList: true, subtree: true });
  }

  window.ApoAnalysisResultView = Object.freeze({
    text,
    known,
    value,
    rows,
    stageOneState,
    stageTwoState,
    inferredIssuer,
    inferredDepictedPerson,
    applyStaticCopy,
    adoptExtras,
  });

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
  ["languagechange", "apo-language-changed", "apomonet:language-change"].forEach((eventName) =>
    addEventListener(eventName, () => setTimeout(applyStaticCopy, 0)),
  );
})();
