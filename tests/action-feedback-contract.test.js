const fs=require('fs');
const src=fs.readFileSync('action-feedback.js','utf8');
const app=fs.readFileSync('app.js','utf8');
function ok(v,m){if(!v)throw new Error(m)}
ok(app.includes('action-feedback.js'),'global feedback module must load from app.js');
ok(src.includes("document.addEventListener('click'")||src.includes('document.addEventListener("click"'),'feedback must observe clicks');
ok(src.includes('true);'),'click feedback should use capture without preventing native actions');
ok(!src.includes('preventDefault('),'feedback must never prevent the real action');
ok(!src.includes('stopPropagation('),'feedback must never stop the real action');
ok(src.includes("pl:{working:'Działam…'")&&src.includes("en:{working:'Working…'")&&src.includes("de:{working:'Wird ausgeführt…'"),'PL/EN/DE feedback text must exist');
ok(src.includes("[aria-disabled=\"true\"]")&&src.includes(':disabled'),'disabled controls must not show false feedback');
ok(src.includes('env(safe-area-inset-bottom)'),'feedback must respect phone safe area');
console.log('action-feedback contract OK');
