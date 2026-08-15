(() => {
  let last = '';
  const $ = (id) => document.getElementById(id);

  function current() {
    try {
      return (0, eval)('typeof a !== "undefined" ? a : null');
    } catch {
      return null;
    }
  }

  function run() {
    if (!location.pathname.endsWith('analyze.html') || !window.ApoNumis) return;

    const analysis = current();
    const panel = $('panel');
    if (!analysis || !panel || panel.classList.contains('hidden')) return;

    const key = [analysis.ruler, analysis.year].join('|');
    if (!key || key === last) return;
    last = key;

    const validation = ApoNumis.validate(analysis);
    if (!validation.year || !validation.warnings?.length) return;

    const chronologyWarning = validation.warnings.find((warning) =>
      /nie pasuje do roku/i.test(warning)
    );
    if (!chronologyWarning) return;

    analysis.confidence = Math.min(Number(analysis.confidence || 0), 72);
    analysis.estimateLow = 0;
    analysis.estimateHigh = 0;
    analysis.valuationNote =
      'Wycena wstrzymana: konflikt chronologiczny wymaga potwierdzenia identyfikacji.';
    analysis.warnings = [...(analysis.warnings || []), chronologyWarning];

    const confidence = $('conf');
    if (confidence) {
      confidence.textContent = `Pewność ${analysis.confidence || 0}% • konflikt chronologiczny`;
    }

    let box = $('chronologyGuardBox');
    if (!box) {
      box = document.createElement('div');
      box.id = 'chronologyGuardBox';
      box.className = 'detail';
      box.style.marginTop = '12px';
      const actions = panel.querySelector('.actions-grid');
      panel.insertBefore(box, actions || null);
    }

    const possibleRulers = (validation.possibleRulers || [])
      .map((ruler) => ruler.name)
      .filter((name, index, names) => names.indexOf(name) === index);

    box.innerHTML =
      '<b>⚠️ Kontrola chronologii</b><p>' +
      chronologyWarning +
      '</p>' +
      (possibleRulers.length
        ? '<small>Władcy możliwi dla tego roku w słowniku APOMONET: ' +
          possibleRulers.join(', ') +
          '.</small>'
        : '');
  }

  addEventListener('DOMContentLoaded', () => {
    if (location.pathname.endsWith('analyze.html')) setInterval(run, 650);
  });
})();
