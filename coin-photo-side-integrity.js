(()=>{
  if(!location.pathname.endsWith('coin.html'))return;
  const persistent=src=>typeof src==='string'&&(src.startsWith('data:image/')||src.startsWith('http://')||src.startsWith('https://'));
  function strictSource(coin,side){
    if(!coin)return'';
    if(coin.albumPhotoMode==='none')return'';
    const prepared=window.ApoAlbumPhotos?.resolve?.(coin,side)||'';
    if(persistent(prepared))return prepared;
    const raw=side==='obverse'?(coin.obverseImage||coin.image||coin.img):coin.reverseImage;
    return persistent(raw)?raw:'';
  }
  function apply(){
    const id=new URLSearchParams(location.search).get('id');
    const coin=id&&window.ApoMonet?.getCoin?.(id);if(!coin)return;
    for(const [side,imageId,emptyId] of [['obverse','obverseImage','obverseEmpty'],['reverse','reverseImage','reverseEmpty']]){
      const image=document.getElementById(imageId),empty=document.getElementById(emptyId);if(!image||!empty)continue;
      const src=strictSource(coin,side);
      if(src){image.src=src;image.hidden=false;empty.hidden=true}
      else{image.removeAttribute('src');image.hidden=true;empty.hidden=false}
    }
  }
  window.ApoCoinPhotoIntegrity=Object.freeze({strictSource,apply});
  document.readyState==='loading'?addEventListener('DOMContentLoaded',()=>setTimeout(apply,0)):apply();
})();
