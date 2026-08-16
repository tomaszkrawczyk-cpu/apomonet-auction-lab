import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function storage(){
  const map=new Map();
  return {
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value)),
    removeItem:key=>map.delete(key),
  };
}

test('auction count uses only valid comparable market facts from the last 10 years',()=>{
  const localStorage=storage();
  const window={localStorage,ApoNumis:{normalize:s=>String(s||'').toLowerCase().trim()}};
  const context={window,localStorage,Date,Map,Number,String,Math,JSON};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('auction-archive-core.js','utf8'),context);
  const archive=window.ApoArchive;
  const coin={ruler:'Zygmunt III Waza',nominal:'dukat',year:'1611',mint:'Gdańsk',metal:'Au'};
  const y=new Date().getUTCFullYear();
  archive.add([
    {id:'ok-1',source:'TestHouse',sourceLabel:'Test House',soldAt:`${y-1}-01-01`,currency:'PLN',hammerPrice:12000,priceType:'hammer',marketFact:true,ruler:'Zygmunt III Waza',nominal:'dukat',year:'1611',mint:'Gdańsk',metal:'Au'},
    {id:'old',source:'TestHouse',soldAt:`${y-12}-01-01`,currency:'PLN',hammerPrice:9000,marketFact:true,ruler:'Zygmunt III Waza',nominal:'dukat',year:'1611',mint:'Gdańsk',metal:'Au'},
    {id:'wrong-nominal',source:'TestHouse',soldAt:`${y-1}-02-01`,currency:'PLN',hammerPrice:8000,marketFact:true,ruler:'Zygmunt III Waza',nominal:'talar',year:'1611',mint:'Gdańsk',metal:'Au'},
    {id:'invalid-no-price',source:'TestHouse',soldAt:`${y-1}-03-01`,currency:'PLN',marketFact:true,ruler:'Zygmunt III Waza',nominal:'dukat',year:'1611',mint:'Gdańsk',metal:'Au'},
  ]);
  const rows=archive.comparable(coin,10);
  assert.equal(rows.length,1);
  assert.equal(rows[0].id,'ok-1');
  const stats=archive.stats(coin,10,'PLN');
  assert.equal(stats.count,1);
  assert.equal(stats.periodYears,10);
});

test('analysis UI keeps Kopicki rarity and auction records as separate facts',()=>{
  const source=fs.readFileSync('analysis-numismatic-market.js','utf8');
  assert.match(source,/Rzadkość \(Kopicki\)/);
  assert.match(source,/Notowania aukcyjne/);
  assert.match(source,/ApoArchive\.comparable\(coin,10\)/);
  assert.match(source,/auctionRecordCount10y/);
  assert.match(source,/verifiedOnly:true/);
  assert.doesNotMatch(source,/Math\.random/);
});
