(() => {
  const IDENTITY_FIELDS = ["nominal", "ruler", "year", "mint", "metal", "variant"];
  const DERIVED_FIELDS = [
    "detail",
    "kopickiReference",
    "kopickiRarity",
    "auctionRecords10y",
    "auctionStrictMatches10y",
    "marketMedian",
    "marketCurrency",
    "priceRange",
    "valuationConfidence",
    "valuationUpdatedAt",
    "estimateLow",
    "estimateHigh",
    "estimatedPrice",
  ];

  function clean(value) {
    return String(value ?? "").trim();
  }

  function comparable(value) {
    return clean(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pl-PL");
  }

  function changedIdentityFields(coin) {
    if (!coin?.userAccepted || !coin?.rawAI) return [];
    return IDENTITY_FIELDS.filter((key) => {
      const accepted = clean(coin[key]);
      const original = clean(coin.rawAI?.[key]);
      return accepted && comparable(accepted) !== comparable(original);
    });
  }

  function userChangedRarity(coin) {
    const accepted = clean(coin?.rarity);
    const original = clean(coin?.rawAI?.rarity);
    return accepted && original && comparable(accepted) !== comparable(original);
  }

  function invalidate(coin) {
    const changed = changedIdentityFields(coin);
    if (!changed.length) return coin;
    if (coin.derivedStateIdentityKey === changed.map((key) => `${key}:${comparable(coin[key])}`).join("|")) {
      return coin;
    }

    const output = { ...coin };
    const previousDetail = output.detail;
    if (previousDetail && !output.previousDetailAudit) {
      output.previousDetailAudit = {
        invalidatedAt: new Date().toISOString(),
        reason: "accepted-identity-correction",
        changedFields: [...changed],
        detail: previousDetail,
      };
    }

    for (const key of DERIVED_FIELDS) delete output[key];
    if (!userChangedRarity(output)) delete output.rarity;

    output.analysisLevel = "basic";
    output.needsReanalysis = true;
    output.needsDetailedAnalysis = true;
    output.derivedDataStale = true;
    output.derivedDataStaleReason =
      "Dane pochodne unieważniono po korekcie identyfikacji zaakceptowanej przez użytkownika.";
    output.valuationNote =
      "Wycena i notowania wymagają ponownego dopasowania po korekcie identyfikacji.";
    output.derivedStateIdentityKey = changed
      .map((key) => `${key}:${comparable(output[key])}`)
      .join("|");
    output.derivedStateInvalidatedAt = new Date().toISOString();
    return output;
  }

  function acceptedSessionAnalysis() {
    try {
      const session = JSON.parse(sessionStorage.getItem("apomonetAnalysisSession") || "null");
      return session?.a?.userAccepted ? session.a : null;
    } catch {
      return null;
    }
  }

  function protectAcceptedDetail(detail, accepted) {
    if (!detail || !accepted?.userAccepted) return detail;
    const output = { ...detail };
    const acceptedVariant = clean(accepted.variant);
    const proposedVariant = clean(detail.variant);
    if (
      acceptedVariant &&
      acceptedVariant !== "Nie ustalono" &&
      proposedVariant &&
      comparable(acceptedVariant) !== comparable(proposedVariant)
    ) {
      output.variantCandidate = proposedVariant;
      output.variant = acceptedVariant;
      output.warnings = [
        ...(Array.isArray(detail.warnings) ? detail.warnings : []),
        `Stage 2 wskazał inną odmianę („${proposedVariant}”), ale zachowano odmianę zaakceptowaną przez użytkownika („${acceptedVariant}”).`,
      ];
    }
    return output;
  }

  function installStage2ResponseGuard() {
    const original = window.fetch?.bind(window);
    if (!original || window.__apoAcceptedStage2Guard) return;
    window.__apoAcceptedStage2Guard = true;
    window.fetch = async (input, init) => {
      const response = await original(input, init);
      if (!String(input || "").includes("/api/analyze-detail") || !response.ok) return response;
      try {
        const accepted = acceptedSessionAnalysis();
        if (!accepted) return response;
        const payload = await response.clone().json();
        if (!payload?.detail) return response;
        const guarded = protectAcceptedDetail(payload.detail, accepted);
        if (guarded === payload.detail) return response;
        return new Response(JSON.stringify({ ...payload, detail: guarded }), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch (error) {
        console.warn("Nie udało się zastosować ochrony zaakceptowanej odmiany Stage 2", error);
        return response;
      }
    };
  }

  function installWriteGuard() {
    if (!window.ApoMonet || ApoMonet.__derivedInvalidationGuard) return;
    const original = ApoMonet.upsertCoin;
    ApoMonet.upsertCoin = function (coin) {
      return original.call(ApoMonet, invalidate(coin));
    };
    ApoMonet.__derivedInvalidationGuard = true;
  }

  function normalizeExistingState() {
    if (!window.ApoMonet) return;
    const state = ApoMonet.load();
    let changed = false;
    state.coins = (state.coins || []).map((coin) => {
      const next = invalidate(coin);
      if (JSON.stringify(next) !== JSON.stringify(coin)) changed = true;
      return next;
    });
    if (changed) ApoMonet.save(state);
  }

  window.ApoDerivedInvalidation = Object.freeze({
    changedIdentityFields,
    invalidate,
    protectAcceptedDetail,
  });

  function init() {
    installStage2ResponseGuard();
    installWriteGuard();
    normalizeExistingState();
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
