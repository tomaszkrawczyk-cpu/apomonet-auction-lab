import fs from 'node:fs';
const s=fs.readFileSync(new URL('./analysis-content-i18n.js',import.meta.url),'utf8');
const registry=fs.readFileSync(new URL('./i18n-language-registry.js',import.meta.url),'utf8');
const checks=[
 ['no hardcoded supported set',!s.includes('new Set(["en", "de", "fr"])')],
 ['analysis is registry driven',s.includes('ApoLanguageRegistry')&&s.includes('isEnabled')],
 ['registry exposes active-language contract',registry.includes('function current()')&&registry.includes('function isEnabled(code)')],
 ['registry persists through canonical language key',registry.includes("apomonet_language_v2")],
 ['dynamic language request',s.includes("JSON.stringify({language,items})")],
 ['original preserved',s.includes("sourceLanguage")],
 ['stage2 legends translated',s.includes('obverseLegend')&&s.includes('reverseLegend')],
 ['stage2 diagnostics translated',s.includes('authenticitySignals')&&s.includes('recommendedChecks')],
 ['fallback message',s.includes("?.en")&&s.includes("?.pl")],
];
for(const[name,ok]of checks){if(!ok)throw new Error('FAIL: '+name);console.log('PASS:',name)}
