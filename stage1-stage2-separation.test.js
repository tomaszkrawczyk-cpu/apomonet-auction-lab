// Static regression guard for the two-stage analysis UX.
// Stage 1 must remain fast/basic. Stage 2 must remain explicit and receive specialist literature only there.
const fs = require('fs');
const analyze = fs.readFileSync('analyze.html','utf8');
const requestHook = fs.readFileSync('stage2-literature-request.js','utf8');
const runtime = fs.readFileSync('app.js','utf8');

function must(v,msg){ if(!v) throw new Error(msg); }

must(analyze.includes('fetch("/api/analyze"'), 'Stage 1 endpoint missing');
must(analyze.includes('mode: "basic"'), 'Stage 1 must use basic mode');
must(analyze.includes('$("deep").onclick = async () =>'), 'Stage 2 must be bound to explicit deep button click');
must(analyze.includes('fetch("/api/analyze-detail"'), 'Stage 2 endpoint missing');
must(requestHook.includes("url!=='/api/analyze-detail'"), 'Literature hook must ignore all endpoints except Stage 2');
must(requestHook.includes('stage2Explicit:true'), 'Stage 2 request must be explicitly marked');
must(runtime.indexOf('catalog-literature-policy.js') < runtime.indexOf('stage2-literature-request.js'), 'Literature policy must load before Stage 2 request hook');
console.log('OK: Stage 1 stays basic; Stage 2 stays explicit; specialist literature is Stage-2-only.');
