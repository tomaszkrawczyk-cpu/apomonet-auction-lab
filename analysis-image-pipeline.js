(()=>{
  const DISPLAY_MAX=560;
  const ANALYSIS_MAX=900;
  const WORK_MAX=1200;
  const MAX_FILE_BYTES=30*1024*1024;
  const MAX_DATA_URL_CHARS=1450000;
  const L={
    pl:{noFile:'Nie wybrano zdjęcia.',tooLarge:'Zdjęcie jest zbyt duże. Wybierz plik mniejszy niż 30 MB.',readFail:'Nie udało się odczytać zdjęcia.',unsupported:'Plik nie jest obsługiwanym zdjęciem.',badSize:'Zdjęcie ma nieprawidłowe wymiary.',shrinkFail:'Nie udało się bezpiecznie zmniejszyć zdjęcia. Spróbuj wykonać je ponownie z nieco mniejszej odległości.',note:'ApoMonet przygotowuje lekki kadr z bezpiecznym marginesem. Jeśli wykrycie krawędzi jest niepewne, zachowuje całe zdjęcie, żeby nie uciąć rantu, daty ani legendy.'},
    en:{noFile:'No photo selected.',tooLarge:'The photo is too large. Choose a file smaller than 30 MB.',readFail:'The photo could not be read.',unsupported:'The file is not a supported image.',badSize:'The photo has invalid dimensions.',shrinkFail:'The photo could not be reduced safely. Try taking it again from a slightly shorter distance.',note:'ApoMonet prepares a lightweight crop with a safe margin. If edge detection is uncertain, it keeps the full photo to avoid cutting off the rim, date or legend.'},
    de:{noFile:'Kein Foto ausgewählt.',tooLarge:'Das Foto ist zu groß. Wählen Sie eine Datei unter 30 MB.',readFail:'Das Foto konnte nicht gelesen werden.',unsupported:'Die Datei ist kein unterstütztes Bild.',badSize:'Das Foto hat ungültige Abmessungen.',shrinkFail:'Das Foto konnte nicht sicher verkleinert werden. Nehmen Sie es erneut aus etwas geringerer Entfernung auf.',note:'ApoMonet erstellt einen leichten Ausschnitt mit Sicherheitsrand. Bei unsicherer Randerkennung bleibt das vollständige Foto erhalten, damit Rand, Datum oder Legende nicht abgeschnitten werden.'},
    fr:{noFile:'Aucune photo sélectionnée.',tooLarge:'La photo est trop volumineuse. Choisissez un fichier de moins de 30 Mo.',readFail:'Impossible de lire la photo.',unsupported:'Le fichier n’est pas une image prise en charge.',badSize:'La photo a des dimensions incorrectes.',shrinkFail:'Impossible de réduire la photo en toute sécurité. Reprenez-la d’un peu plus près.',note:'ApoMonet prépare un cadrage léger avec une marge de sécurité. Si la détection du bord est incertaine, la photo entière est conservée afin de ne pas couper le bord, la date ou la légende.'}
  };
  const lang=()=>window.ApoLanguageRegistry?.current?.()||window.ApoI18n?.current?.()||localStorage.getItem('apomonet_language_v2')||'pl';
  const t=k=>L[lang()]?.[k]||L.en[k]||L.pl[k]||k;

  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      if(!file) return reject(new Error(t('noFile')));
      if(file.size>MAX_FILE_BYTES) return reject(new Error(t('tooLarge')));
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error(t('readFail')));
      reader.onload=e=>{
        const image=new Image();
        image.onerror=()=>reject(new Error(t('unsupported')));
        image.onload=()=>resolve(image);
        image.src=e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function scaledCanvas(image,maxEdge){
    const width=image.naturalWidth||image.width;
    const height=image.naturalHeight||image.height;
    if(!width||!height) throw new Error(t('badSize'));
    const scale=Math.min(1,maxEdge/Math.max(width,height));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(width*scale));
    canvas.height=Math.max(1,Math.round(height*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    return canvas;
  }

  function detectCircle(source){
    const max=240;
    const scale=Math.min(1,max/Math.max(source.width,source.height));
    const width=Math.max(48,Math.round(source.width*scale));
    const height=Math.max(48,Math.round(source.height*scale));
    const probe=document.createElement('canvas');
    probe.width=width;
    probe.height=height;
    const ctx=probe.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(source,0,0,width,height);
    const rgba=ctx.getImageData(0,0,width,height).data;
    const gray=new Float32Array(width*height);
    for(let i=0,j=0;i<rgba.length;i+=4,j++) gray[j]=.299*rgba[i]+.587*rgba[i+1]+.114*rgba[i+2];
    const minSide=Math.min(width,height),step=Math.max(5,Math.round(minSide/30)),radiusStep=Math.max(4,Math.round(step*.8)),radiusMin=Math.max(15,Math.round(minSide*.11)),radiusMax=Math.round(minSide*.45),at=(x,y)=>gray[clamp(y|0,0,height-1)*width+clamp(x|0,0,width-1)];
    let best={score:-Infinity,cx:width/2,cy:height/2,r:minSide*.25},backgroundTexture=0,backgroundSamples=0;
    for(let y=1;y<height;y++)for(let x=1;x<width;x++){const inOuterBand=x<width*.18||x>width*.82||y<height*.18||y>height*.82;if(!inOuterBand)continue;const index=y*width+x;backgroundTexture+=Math.abs(gray[index]-gray[index-1]);backgroundTexture+=Math.abs(gray[index]-gray[index-width]);backgroundSamples+=2}
    backgroundTexture=backgroundSamples?backgroundTexture/backgroundSamples:0;
    for(let cy=Math.round(height*.12);cy<=height*.88;cy+=step)for(let cx=Math.round(width*.12);cx<=width*.88;cx+=step)for(let r=radiusMin;r<=radiusMax;r+=radiusStep){if(cx-r*1.12<0||cy-r*1.12<0||cx+r*1.12>=width||cy+r*1.12>=height)continue;let edge=0,uniformity=0,previous=null;const samples=48;for(let k=0;k<samples;k++){const angle=k*Math.PI*2/samples,cos=Math.cos(angle),sin=Math.sin(angle),inner=at(cx+cos*r*.88,cy+sin*r*.88),outer=at(cx+cos*r*1.10,cy+sin*r*1.10),delta=Math.abs(inner-outer);edge+=delta;if(previous!==null)uniformity+=Math.abs(delta-previous);previous=delta}edge/=samples;uniformity/=samples;const centerDistance=Math.hypot(cx-width/2,cy-height/2)/minSide,score=edge-uniformity*.08-centerDistance*2.5;if(score>best.score)best={score,cx,cy,r}}
    const backScale=1/scale;return{cx:best.cx*backScale,cy:best.cy*backScale,r:best.r*backScale,score:best.score,confidence:Math.round(clamp((best.score-5)*6,0,100)),backgroundTexture:Math.round(backgroundTexture*10)/10};
  }

  function safeCrop(source,detection){const minSide=Math.min(source.width,source.height),confidence=Number.isFinite(detection.confidence)?detection.confidence:100,backgroundTexture=Number.isFinite(detection.backgroundTexture)?detection.backgroundTexture:0,reliable=Number.isFinite(detection.score)&&detection.score>=12&&confidence>=50&&backgroundTexture<=10&&detection.r>=minSide*.11;if(!reliable)return{x:0,y:0,width:source.width,height:source.height,mode:'full'};const half=detection.r*1.58,left=detection.cx-half,top=detection.cy-half,right=detection.cx+half,bottom=detection.cy+half,outside=left<0||top<0||right>source.width||bottom>source.height,coversMost=half*2>Math.max(source.width,source.height)*.92;if(outside||coversMost)return{x:0,y:0,width:source.width,height:source.height,mode:'full'};return{x:left,y:top,width:half*2,height:half*2,mode:'safe-crop'}}
  function assessPhoto(detection,crop){const confidence=Number(detection?.confidence||0),score=Number(detection?.score||0),backgroundTexture=Number(detection?.backgroundTexture||0);if(backgroundTexture>10)return{level:'retake',reason:'textured-background'};if(score<12||confidence<50)return{level:'retake',reason:'uncertain-edge'};if(crop?.mode!=='safe-crop')return{level:'warning',reason:'full-frame'};return{level:'good',reason:'clear-edge'}}
  function render(source,rect,maxEdge){const scale=Math.min(1,maxEdge/Math.max(rect.width,rect.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(rect.width*scale));canvas.height=Math.max(1,Math.round(rect.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#f2f2f2';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,rect.x,rect.y,rect.width,rect.height,0,0,canvas.width,canvas.height);return canvas}
  function boundedDataUrl(canvas,type,quality){let q=quality,data=canvas.toDataURL(type,q);while(data.length>MAX_DATA_URL_CHARS&&q>.38){q=Math.max(.38,q-.08);data=canvas.toDataURL(type,q)}if(data.length>MAX_DATA_URL_CHARS)throw new Error(t('shrinkFail'));return data}
  async function processCoin(file){const image=await loadImage(file),source=scaledCanvas(image,WORK_MAX),detection=detectCircle(source),rect=safeCrop(source,detection),quality=assessPhoto(detection,rect),displayCanvas=render(source,rect,DISPLAY_MAX),analysisCanvas=render(source,rect,ANALYSIS_MAX);return{display:boundedDataUrl(displayCanvas,'image/webp',.74),analysis:boundedDataUrl(analysisCanvas,'image/jpeg',.62),confidence:detection.confidence,edgeScore:detection.score,backgroundTexture:detection.backgroundTexture,cropMode:rect.mode,quality:quality.level,qualityReason:quality.reason,analysisWidth:analysisCanvas.width,analysisHeight:analysisCanvas.height}}
  function install(){if(!location.pathname.endsWith('analyze.html'))return;window.processCoin=processCoin;const note=document.querySelector('.photo-note');if(note)note.textContent=t('note')}
  window.ApoImagePipeline={processCoin,detectCircle,safeCrop,assessPhoto,boundedDataUrl,install};
  document.readyState==='loading'?addEventListener('DOMContentLoaded',install):install();
  ['languagechange','apo-language-changed','apomonet:language-change'].forEach(e=>addEventListener(e,()=>{const note=document.querySelector('.photo-note');if(note)note.textContent=t('note')}));
})();