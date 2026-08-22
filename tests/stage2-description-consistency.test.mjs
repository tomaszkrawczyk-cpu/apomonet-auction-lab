import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source=readFileSync(new URL('../stage2-literature-persist.js',import.meta.url),'utf8');

function helper(){
  const sandbox={console,location:{pathname:'/analyze.html'},addEventListener(){},sessionStorage:{getItem(){return null}}};
  sandbox.window=sandbox;
  vm.runInNewContext(source,sandbox,{filename:'stage2-literature-persist.js'});
  return sandbox.ApoStage2Persist;
}

test('saved Stage 2 description drops stale AI identity after accepted correction',()=>{
  const {safeDetailDescription}=helper();
  const current={
    userAccepted:true,
    nominal:'dukat',
    ruler:'Zygmunt III Waza',
    year:'1621',
    mint:'Nagybánya',
    metal:'złoto',
    variant:'odmiana zaakceptowana',
    rawAI:{nominal:'wielodukat',ruler:'Zygmunt III Waza',year:'1621',mint:'Wilno',metal:'złoto',variant:'odmiana AI'},
  };
  const detail={
    fullDescription:'Wielodukat Zygmunta III Wazy z mennicy Wilno. Awers przedstawia popiersie króla. Rewers zachowuje czytelną legendę.',
    warnings:[],
  };
  const result=safeDetailDescription(detail,current);
  assert.match(result.fullDescription,/Nominał: dukat\./);
  assert.match(result.fullDescription,/Mennica: Nagybánya\./);
  assert.doesNotMatch(result.fullDescription,/wielodukat|Wilno/i);
  assert.match(result.fullDescription,/Awers przedstawia/);
  assert.match(result.fullDescription,/Rewers zachowuje/);
  assert.equal(result.descriptionConsistencySource,'accepted-user-identity');
});

test('Stage 2 description remains untouched when it already agrees with accepted identity',()=>{
  const {safeDetailDescription}=helper();
  const current={userAccepted:true,nominal:'dukat',mint:'Nagybánya',rawAI:{nominal:'wielodukat',mint:'Wilno'}};
  const detail={fullDescription:'Dukat z mennicy Nagybánya. Awers i rewers są czytelne.',warnings:[]};
  assert.deepEqual(safeDetailDescription(detail,current),detail);
});
