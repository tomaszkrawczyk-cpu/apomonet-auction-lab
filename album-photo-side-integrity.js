(()=>{
  const previous=window.ApoAlbumPhotos;
  if(!previous)return;
  const clean=value=>typeof value==='string'?value.trim():'';
  const resolve=(coin,side='obverse')=>{
    if(!coin)return'';
    if(coin.albumPhotoMode==='none')return'';
    const isObverse=side==='obverse';
    if(coin.albumPhotoMode==='cut'&&Number(coin.albumPhotoPrepVersion||0)>=Number(previous.cutVersion||2)){
      const cut=isObverse?clean(coin.albumObverseImage):clean(coin.albumReverseImage);
      if(cut)return cut;
      return isObverse?clean(coin.obverseImage||coin.image||coin.img):clean(coin.reverseImage);
    }
    return isObverse?clean(coin.obverseImage||coin.image||coin.img):clean(coin.reverseImage);
  };
  window.ApoAlbumPhotos=Object.freeze({
    ...previous,
    resolve,
  });
})();
