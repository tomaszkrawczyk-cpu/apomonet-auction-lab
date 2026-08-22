import fs from 'node:fs';
const s=fs.readFileSync(new URL('./stage2-professional-description-ui.js',import.meta.url),'utf8');
for(const [name,ok] of [
 ['registry aware',s.includes('ApoLanguageRegistry')],
 ['all core sections localized',s.includes("market:'6. Auction records and market context'")&&s.includes("valuation:'7. Valuation'")],
 ['dynamic specimen labels localized',s.includes("diag:'Diagnostic features'")&&s.includes("auth:'Authenticity — observations'")],
 ['language rerender',s.includes("apo-language-changed")&&s.includes("languagechange")],
 ['fallback exists',s.includes('L.en[k]')&&s.includes('L.pl[k]')],
]){if(!ok)throw new Error('FAIL: '+name);console.log('PASS:',name)}
