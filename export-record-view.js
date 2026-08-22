(()=>{
  if(!location.pathname.endsWith('export.html'))return;
  if(!window.ApoMonet?.load)return;
  const originalLoad=window.ApoMonet.load.bind(window.ApoMonet);
  const normalize=coin=>{
    if(!coin||typeof coin!=='object')return coin;
    const detail=coin.detail&&typeof coin.detail==='object'?coin.detail:{};
    return {
      ...coin,
      variant:coin.variant||detail.variant||'',
      kopickiReference:coin.kopickiReference||detail.kopickiReference||'',
      kopickiRarity:coin.kopickiRarity||detail.kopickiRarity||'',
      fullDescription:coin.fullDescription||coin.description||detail.fullDescription||detail.description||'',
    };
  };
  window.ApoMonet.load=()=>{
    const state=originalLoad();
    if(!state||!Array.isArray(state.coins))return state;
    return {...state,coins:state.coins.map(normalize)};
  };
  window.ApoExportRecordView={normalize};
})();
