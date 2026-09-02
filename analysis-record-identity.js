(()=>{
  const clean=value=>typeof value==='string'?value:'';
  function hash(value){
    const source=clean(value);
    let result=2166136261;
    const samples=source.length<=8192?source:`${source.slice(0,4096)}${source.slice(-4096)}`;
    for(let index=0;index<samples.length;index++){
      result^=samples.charCodeAt(index);
      result=Math.imul(result,16777619);
    }
    return (result>>>0).toString(36);
  }
  function photoSignature(images){
    return (Array.isArray(images)?images:[null,null])
      .slice(0,2)
      .map(value=>`${clean(value).length}:${hash(value)}`)
      .join('|');
  }
  function hasPhotoPair(images){
    return Array.isArray(images)&&images.slice(0,2).length===2&&images.slice(0,2).every(value=>{
      const source=clean(value);
      return source.startsWith('data:image/')||source.startsWith('https://')||source.startsWith('http://');
    });
  }
  function analysisMatchesPhotos({analysisSignature,images}={}){
    return Boolean(analysisSignature&&hasPhotoPair(images)&&analysisSignature===photoSignature(images));
  }
  function reusableId({id,savedSignature,images}={}){
    if(!id||!savedSignature||!hasPhotoPair(images))return undefined;
    return savedSignature===photoSignature(images)?id:undefined;
  }
  window.ApoAnalysisRecordIdentity=Object.freeze({photoSignature,hasPhotoPair,analysisMatchesPhotos,reusableId});
})();
