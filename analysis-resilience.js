(function () {
  if (window.__apoAnalysisResilienceInstalled) return;
  window.__apoAnalysisResilienceInstalled = true;

  const KEY = 'apomonetAnalysisResilienceV1';
  const MAX_RETRIES = 1;
  let hiddenDuringActiveRequest = false;
  let activeTrackedRequests = 0;
  const originalFetch = window.fetch.bind(window);

  function loadState() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function saveState(next) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (error) { console.warn('[analysis-resilience] save failed', error); }
  }
  function patchState(patch) { saveState({ ...loadState(), ...patch, updatedAt: Date.now() }); }
  function clearPending() { const s = loadState(); delete s.pending; saveState(s); }
  function isAnalysisUrl(input) {
    const url = typeof input === 'string' ? input : input?.url || '';
    return url === '/api/analyze' || url === '/api/analyze-detail' || url.endsWith('/api/analyze') || url.endsWith('/api/analyze-detail');
  }
  function stageFor(input) {
    const url = typeof input === 'string' ? input : input?.url || '';
    return url.includes('analyze-detail') ? 'stage2' : 'stage1';
  }
  function parseBody(options) {
    try { return typeof options?.body === 'string' ? JSON.parse(options.body) : null; } catch { return null; }
  }
  function responseFromCache(cached) {
    const status = Number(cached?.status || 0);
    if (!cached?.text || status < 200 || status >= 300) return null;
    return new Response(cached.text, { status, headers: { 'Content-Type': 'application/json' } });
  }
  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && activeTrackedRequests > 0) hiddenDuringActiveRequest = true;
  });

  window.fetch = async function resilientFetch(input, options = {}) {
    if (!isAnalysisUrl(input)) return originalFetch(input, options);
    const stage = stageFor(input);
    const body = parseBody(options);
    const state = loadState();

    if (stage === 'stage1' && state.recoveryCache?.stage1?.requestBody && body && JSON.stringify(body.images || []) === JSON.stringify(state.recoveryCache.stage1.requestBody.images || [])) {
      const cached = responseFromCache(state.recoveryCache.stage1);
      if (cached) return cached;
    }

    const pending = { stage, requestBody: body, startedAt: Date.now(), attempts: 0 };
    patchState({ pending });
    activeTrackedRequests += 1;
    hiddenDuringActiveRequest = false;

    try {
      for (let attempt = 0; ; attempt += 1) {
        pending.attempts = attempt + 1;
        patchState({ pending });
        try {
          const response = await originalFetch(input, options);
          const text = await response.clone().text();
          const next = loadState();
          if (response.ok) {
            next.recoveryCache = next.recoveryCache || {};
            next.recoveryCache[stage] = { requestBody: body, text, status: response.status, completedAt: Date.now() };
          }
          delete next.pending;
          saveState(next);
          return response;
        } catch (error) {
          const suspended = hiddenDuringActiveRequest || document.visibilityState === 'hidden';
          const retryable = attempt < MAX_RETRIES && suspended && (error?.name === 'AbortError' || error instanceof TypeError);
          if (!retryable) throw error;
          await sleep(900);
          options = { ...options };
          delete options.signal;
          hiddenDuringActiveRequest = false;
        }
      }
    } finally {
      activeTrackedRequests = Math.max(0, activeTrackedRequests - 1);
    }
  };

  function dataUrlToFile(dataUrl, name) {
    const [head, payload] = String(dataUrl || '').split(',');
    if (!payload) return null;
    const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/jpeg';
    const bin = atob(payload);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], name, { type: mime });
  }
  function setInputFile(input, file) {
    if (!input || !file || typeof DataTransfer === 'undefined') return false;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  function waitFor(predicate, timeout = 12000) {
    const started = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        if (predicate()) return resolve(true);
        if (Date.now() - started > timeout) return resolve(false);
        setTimeout(tick, 120);
      };
      tick();
    });
  }
  function message(text) {
    const el = document.getElementById('status');
    if (el) el.textContent = text;
  }

  async function restorePending() {
    if (!/\/analyze\.html$/.test(location.pathname)) return;
    const pending = loadState().pending;
    if (!pending?.requestBody?.images?.[0] || !pending?.requestBody?.images?.[1]) return;
    await waitFor(() => document.getElementById('obverseInput') && document.getElementById('reverseInput'));
    message('Przywracam przerwaną analizę. Zdjęcia są bezpieczne…');
    const ok1 = setInputFile(document.getElementById('obverseInput'), dataUrlToFile(pending.requestBody.images[0], 'apomonet-awers.jpg'));
    await sleep(250);
    const ok2 = setInputFile(document.getElementById('reverseInput'), dataUrlToFile(pending.requestBody.images[1], 'apomonet-rewers.jpg'));
    if (!ok1 || !ok2) { message('Analiza została zachowana, ale ta przeglądarka wymaga ponownego wskazania zdjęć.'); return; }
    await waitFor(() => !document.getElementById('go')?.disabled, 20000);

    if (pending.stage === 'stage1') {
      message('Wznawiam analizę podstawową…');
      document.getElementById('go')?.click();
      return;
    }

    const cache = loadState().recoveryCache?.stage1;
    if (!responseFromCache(cache)) { message('Zdjęcia zostały przywrócone. Uruchom Etap 1, a następnie analizę szczegółową.'); return; }
    message('Odtwarzam Etap 1 przed wznowieniem analizy szczegółowej…');
    document.getElementById('go')?.click();
    const ready = await waitFor(() => !document.getElementById('panel')?.classList.contains('hidden'), 20000);
    if (!ready) return;
    message('Wznawiam analizę szczegółową…');
    document.getElementById('deep')?.click();
  }

  addEventListener('DOMContentLoaded', () => { void restorePending(); }, { once: true });
  window.ApoAnalysisResilience = { loadState, clearPending };
})();