const STRONG_MODEL=process.env.APOMONET_STRONG_MODEL?.trim()||'gpt-5.6';
const FAST_MODEL=process.env.APOMONET_FAST_MODEL?.trim()||'';
const FAST_ENABLED=process.env.APOMONET_ENABLE_FAST_MODEL==='1';

function num(v){const n=Number(v);return Number.isFinite(n)?n:0}

export function chooseAnalysisModel({stage='basic',base={},routing={}}={}){
  const reasons=[];
  const strong={model:STRONG_MODEL,tier:'strong',reasons};
  if(!FAST_ENABLED||!FAST_MODEL){
    reasons.push('quality-first: fast model disabled');
    return strong;
  }
  if(stage!=='basic'){
    reasons.push('Stage 2 always uses strong model');
    return strong;
  }
  const benchmarkSamples=num(routing.benchmarkSamples);
  const measuredAccuracy=num(routing.measuredAccuracy);
  const verifiedKnowledgeHits=num(routing.verifiedKnowledgeHits);
  const imageQuality=num(routing.imageQuality);
  const ambiguity=num(routing.ambiguity);
  if(benchmarkSamples<100){reasons.push('insufficient benchmark sample');return strong}
  if(measuredAccuracy<97){reasons.push('measured accuracy below 97%');return strong}
  if(verifiedKnowledgeHits<2){reasons.push('insufficient verified APOMONET knowledge');return strong}
  if(imageQuality<90){reasons.push('image quality below 90');return strong}
  if(ambiguity>10){reasons.push('case ambiguity above 10');return strong}
  reasons.push('eligible easy case after measured quality gate');
  return {model:FAST_MODEL,tier:'fast',reasons};
}

export function routingPolicy(){
  return {
    strongModel:STRONG_MODEL,
    fastModel:FAST_MODEL||null,
    fastEnabled:FAST_ENABLED,
    minBenchmarkSamples:100,
    minMeasuredAccuracy:97,
    minVerifiedKnowledgeHits:2,
    minImageQuality:90,
    maxAmbiguity:10,
    stage2AlwaysStrong:true,
  };
}
