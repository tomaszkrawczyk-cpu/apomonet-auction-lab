(function () {
  if (window.__apoAnalysisResilienceInstalled) return;
  window.__apoAnalysisResilienceInstalled = true;

  const KEY = 'apomonetAnalysisResilienceV1';
  const MAX_RETRIES = 1;
  let hiddenDuringActiveRequest = false;
  let activeTrackedRequests = 0;
  const originalFetch = window.fetch.bind(window);
  const COPY={
    pl:{restoring:'Przywracam przerwaną analizę. Zdjęcia są bezpieczne…',photosManual:'Analiza została zachowana, ale ta przeglądarka wymaga ponownego wskazania zdjęć.',resume1:'Wznawiam analizę podstawową…',need1:'Zdjęcia zostały przywrócone. Uruchom Etap 1, a następnie analizę szczegółową.',restore1:'Odtwarzam Etap 1 przed wznowieniem analizy szczegółowej…',resume2:'Wznawiam analizę szczegółową…'},
    en:{restoring:'Restoring the interrupted analysis. Your photos are safe…',photosManual:'The analysis was preserved, but this browser requires you to select the photos again.',resume1:'Resuming the basic analysis…',need1:'The photos were restored. Run Stage 1 and then the detailed analysis.',restore1:'Restoring Stage 1 before resuming the detailed analysis…',resume2:'Resuming the detailed analysis…'},
    de:{restoring:'Die unterbrochene Analyse wird wiederhergestellt. Ihre Fotos sind sicher…',photosManual:'Die Analyse wurde erhalten, aber dieser Browser erfordert eine erneute Auswahl der Fotos.',resume1:'Die Basisanalyse wird fortgesetzt…',need1:'Die Fotos wurden wiederhergestellt. Führen Sie Stufe 1 und danach die Detailanalyse aus.',restore1:'Stufe 1 wird vor der Fortsetzung der Detailanalyse wiederhergestellt…',resume2:'Die Detailanalyse wird fortgesetzt…'},
    fr:{restoring:'Restauration de l’analyse interrompue. Vos photos sont conservées…',photosManual:'L’analyse a été conservée, mais ce navigateur exige de sélectionner à nouveau les photos.',resume1:'Reprise de l’analyse de base…',need1:'Les photos ont été restaurées. Lancez l’étape 1 puis l’analyse détaillée.',restore1:'Restauration de l’étape 1 avant de reprendre l’analyse détaillée…',resume2:'Reprise de l’analyse détaillée…'}
  };
  const language=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const tx=k=>COPY[language()]?.[k]||COPY.en[k]||COPY.pl[k]||k;

  function loadState() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function saveState(next) {
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (error) { console.warn('[analysis-resilience] save failed', error); }
  }
  function patchState(patch) { saveState({ ...loadState(), ...patch, updatedAt: Date.now() }); }
  function clearPending() { const s = loadState(); delete s.pending; saveState(s); }
  function requestPath(input) {
    try { const raw=typeof input==='string'?input:String(input?.url||''); return new URL(raw,location.href).pathname; }
    catch { return ''; }
  }
  function isAnalysisUrl(input) { return ['/api/analyze','/api/analyze-detail'].includes(requestPath(input)); }
  function stageFor(input) { return requestPath(input)==='/api/analyze-detail' ? 'stage2' : 'stage1'; }
  function parseBody(options) {
    try { return typeof options?.body === 'string' ? JSON.parse(options.body) : null; } catch { return null; }
  }
  function imageKey(image) {
    const value = String(image || '');
    return `${value.length}:${value.slice(0, 48)}:${value.slice(-48)}`;
  }
  function requestKey(body) {
    return Array.isArray(body?.images) ? body.images.map(imageKey).join('|') : '';
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
    const key = requestKey(body);

    if (stage === 'stage1' && body) {
      const cachedEntry = state.recoveryCache?.stage1;
      const cachedKey = cachedEntry?.requestKey || requestKey(cachedEntry?.requestBody);
      if (key && cachedKey === key) {
        const cached = responseFromCache(cachedEntry);
        if (cached) return cached;
      }
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
            next.recoveryCache[stage] = { requestKey: key, text, status: response.status, completedAt: Date.now() };
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
    message(tx('restoring'));
    const ok1 = setInputFile(document.getElementById('obverseInput'), dataUrlToFile(pending.requestBody.images[0], 'apomonet-awers.jpg'));
    await sleep(250);
    const ok2 = setInputFile(document.getElementById('reverseInput'), dataUrlToFile(pending.requestBody.images[1], 'apomonet-rewers.jpg'));
    if (!ok1 || !ok2) { message(tx('photosManual')); return; }
    await waitFor(() => !document.getElementById('go')?.disabled, 20000);

    if (pending.stage === 'stage1') {
      message(tx('resume1'));
      document.getElementById('go')?.click();
      return;
    }

    const cache = loadState().recoveryCache?.stage1;
    if (!responseFromCache(cache)) { message(tx('need1')); return; }
    message(tx('restore1'));
    document.getElementById('go')?.click();
    const ready = await waitFor(() => !document.getElementById('panel')?.classList.contains('hidden'), 20000);
    if (!ready) return;
    message(tx('resume2'));
    document.getElementById('deep')?.click();
  }

  addEventListener('DOMContentLoaded', () => { void restorePending(); }, { once: true });
  window.ApoAnalysisResilience = { loadState, clearPending, requestPath, isAnalysisUrl, stageFor };
})();