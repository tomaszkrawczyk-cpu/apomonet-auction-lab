import fs from 'node:fs';
const s=fs.readFileSync(new URL('./analysis-content-i18n.js',import.meta.url),'utf8');
const checks=[
 ['no hardcoded supported set',!s.includes('new Set(["en", "de", "fr"])')],
 ['registry driven',s.includes('ApoLanguageRegistry')&&s.includes('isEnabled')],
 ['dynamic language request',s.includes("JSON.stringify({language,items})")],
 ['original preserved',s.includes("sourceLanguage")],
 ['stage2 legends translated',s.includes('obverseLegend')&&s.includes('reverseLegend')],
 ['stage2 diagnostics translated',s.includes('authenticitySignals')&&s.includes('recommendedChecks')],
 ['fallback message',s.includes("?.en")&&s.includes("?.pl")],
];
for(const[name,ok]of checks){if(!ok)throw new Error('FAIL: '+name);console.log('PASS:',name)}
