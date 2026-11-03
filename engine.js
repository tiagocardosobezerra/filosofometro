// Filosofômetro matching engine. Pure functions, no DOM. Every number shown to the user
// comes from here, and every step is returned in a trace so it can be audited.
(function(root){

// Everything the engine does lives inside build(), so the code fingerprint covers
// every line, helper and constant that can change a result.
function build(){
const VERSION="1.1.0";

// Answer codes as stored in links: 0 = concordo totalmente ... 4 = discordo totalmente.
const SCALE=[
  {code:0,label:"Concordo totalmente",value:2},
  {code:1,label:"Concordo",value:1},
  {code:2,label:"Neutro",value:0},
  {code:3,label:"Discordo",value:-1},
  {code:4,label:"Discordo totalmente",value:-2},
];

// Constants. Changing any of them changes results, so they are part of the audit.
const PARAMS={
  tau:.77,           // percent = round(100 * exp(-(distance / tau)^2)), clamped to [1, 100]
  minIntensity:.05,  // below this mean |position| a profile has no direction: no percentages are given
  maxGain:3,         // a profile is never scaled up more than 3x, so one mild axis cannot dominate
  eps:1e-9,          // distances closer than this count as a tie
  centerWarning:.15, // mean |position| below this triggers the "too central" note
  repeatWarning:.8,  // the same option on 80%+ of statements triggers the "repeated" note
};
const TIE_BREAK="distância normalizada (empate se a diferença ≤ eps) → distância bruta (mesmo eps) → id do pensador em ordem de código";
const PERCENT_RULE="max(1, min(100, round(100 × e^(−(distância ÷ τ)²))))";
const HASH_RULE="FNV-1a de 32 bits sobre as unidades UTF-16 de JSON.stringify(entrada), em hexadecimal com 8 dígitos";

const meanAbs=v=>v.reduce((t,x)=>t+Math.abs(x),0)/v.length;
const percent=d=>Math.max(1,Math.min(100,Math.round(100*Math.exp(-((d/PARAMS.tau)**2)))));
const tied=(a,b)=>Math.abs(a-b)<=PARAMS.eps;

function fnv(s){
  let h=0x811c9dc5;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}
  return h.toString(16).padStart(8,"0");
}
// Exactly what the catalog fingerprint hashes. The downloadable catalog contains this object.
function fingerprintInput(data){
  return {
    axes:data.AXES.map(a=>[a.id,a.l,a.r]),
    statements:data.QS.map(q=>[q[0],q[1],q[2]]),
    thinkers:data.PH.map(p=>[p.id,p.n,p.v]),
  };
}
const fingerprint=data=>fnv(JSON.stringify(fingerprintInput(data)));
// Line endings are normalized so a Windows checkout and a Linux deploy agree.
const codeFingerprint=()=>fnv(build.toString().replace(/\r\n?/g,"\n"));

// Statements are shown round-robin across axes, so no axis gets four in a row.
// Answers are always stored by statement index, never by the order shown.
function presentationOrder(QS,nAxes){
  const order=[];
  for(let k=0;k<4;k++)for(let ax=0;ax<nAxes;ax++)order.push(QS.map((q,i)=>[q,i]).filter(([q])=>q[1]===ax)[k][1]);
  return order;
}

function create(data){
  const {AXES,QS,PH}=data;
  const catalogIntensity=PH.reduce((t,p)=>t+meanAbs(p.v),0)/PH.length;
  const ORDER=presentationOrder(QS,AXES.length);

  // Step 1: each answer adds value × direction to its axis; the sum is divided by the axis maximum.
  function axisScores(answers){
    const sum=AXES.map(()=>0),max=AXES.map(()=>0);
    const perQuestion=QS.map(([text,axis,dir],i)=>{
      const value=SCALE[answers[i]].value,contribution=value*dir;
      sum[axis]+=contribution;max[axis]+=2;
      return {i,shown:ORDER.indexOf(i)+1,text,axis,dir,answer:answers[i],value,contribution};
    });
    const scores=sum.map((s,i)=>s/max[i]);
    return {scores,perQuestion,perAxis:AXES.map((a,i)=>({axis:i,sum:sum[i],max:max[i],score:scores[i]}))};
  }

  // Step 2: scale a profile toward the catalog's average intensity, keeping its direction.
  // Users and thinkers go through the same step, so the match compares the shape of the thought.
  function normalize(v){
    const intensity=meanAbs(v);
    if(intensity<PARAMS.minIntensity)return {v:v.map(()=>0),k:0,intensity,capped:false};
    const wanted=catalogIntensity/intensity,k=Math.min(PARAMS.maxGain,wanted);
    return {v:v.map(x=>x*k),k,intensity,capped:wanted>PARAMS.maxGain};
  }

  // Step 3: compare with one thinker: mean absolute difference between the two normalized profiles.
  function compare(scores,p,user=normalize(scores)){
    const them=normalize(p.v);
    const perAxis=p.v.map((x,i)=>({axis:i,user:user.v[i],thinker:them.v[i],thinkerRaw:x,diff:Math.abs(them.v[i]-user.v[i])}));
    const distance=perAxis.reduce((t,a)=>t+a.diff,0)/AXES.length;
    const rawDistance=p.v.reduce((t,x,i)=>t+Math.abs(x-scores[i]),0)/AXES.length;
    const directionless=user.k===0;
    return {id:p.id,k:user.k,thinkerK:them.k,thinkerIntensity:them.intensity,perAxis,distance,rawDistance,
      pct:directionless?null:percent(distance)};
  }

  // Step 4: rank by distance, then raw distance, then id. Ids are ASCII, so the order
  // never depends on the browser's language.
  function rank(scores){
    const user=normalize(scores);
    const rows=PH.map(p=>({p,...compare(scores,p,user)}));
    rows.sort((a,b)=>
      (tied(a.distance,b.distance)?0:a.distance-b.distance)||
      (tied(a.rawDistance,b.rawDistance)?0:a.rawDistance-b.rawDistance)||
      (a.p.id<b.p.id?-1:a.p.id>b.p.id?1:0));
    rows.forEach((x,i)=>{
      const prev=rows[i-1],next=rows[i+1];
      x.rank=i+1;
      x.tiedWithPrev=!!prev&&tied(prev.distance,x.distance);
      x.tiedWithNext=!!next&&tied(next.distance,x.distance);
    });
    return {user,rows};
  }

  function reliability(answers,scores){
    const counts=[0,0,0,0,0];answers.forEach(a=>counts[a]++);
    if(Math.max(...counts)/answers.length>=PARAMS.repeatWarning)
      return {code:"repeat",message:"Você escolheu quase sempre a mesma opção. O resultado pode não refletir bem o que você pensa."};
    if(meanAbs(scores)<PARAMS.centerWarning)
      return {code:"center",message:"Suas respostas ficaram muito no centro. O resultado é uma aproximação: refaça escolhendo um lado quando tiver opinião."};
    return null;
  }

  function evaluate(answers){
    if(!isValid(answers))throw new Error("invalid answers");
    const axis=axisScores(answers);
    const {user,rows}=rank(axis.scores);
    const directionless=user.k===0;
    return {
      version:VERSION,fingerprint:fingerprint(data),code:codeFingerprint(),params:{...PARAMS},catalogIntensity,
      answers:answers.slice(),...axis,user,directionless,ranking:rows,
      top:rows[0],opposite:directionless?null:rows[rows.length-1],
      note:reliability(answers,axis.scores),
    };
  }

  const isValid=a=>Array.isArray(a)&&a.length===QS.length&&a.every(x=>Number.isInteger(x)&&x>=0&&x<=4);
  const encode=a=>a.join("");
  const decode=s=>{
    if(typeof s!=="string"||!new RegExp(`^[0-4]{${QS.length}}$`).test(s))return null;
    return s.split("").map(Number);
  };

  // Full-precision export. Everything needed to recompute the result is here: answers in
  // statement order, the order they were shown in, the scale, every constant and rule,
  // each thinker's catalog positions, and every intermediate number.
  function auditJSON(r){
    return {
      format:"filosofometro-audit/2",
      engine:{version:r.version,code:r.code,catalog:r.fingerprint,params:r.params,catalogIntensity:r.catalogIntensity,
        rules:{percent:PERCENT_RULE,tieBreak:TIE_BREAK,hash:HASH_RULE}},
      scale:SCALE,
      answers:{code:encode(r.answers),shownOrder:ORDER,
        items:r.perQuestion.map(q=>({index:q.i,shown:q.shown,statement:q.text,axis:AXES[q.axis].id,direction:q.dir,
          answer:q.answer,label:SCALE[q.answer].label,value:q.value,contribution:q.contribution}))},
      axes:r.perAxis.map(a=>({id:AXES[a.axis].id,name:AXES[a.axis].name,left:AXES[a.axis].l,right:AXES[a.axis].r,sum:a.sum,max:a.max,score:a.score})),
      user:{intensity:r.user.intensity,factor:r.user.k,capped:r.user.capped,directionless:r.directionless,normalized:r.user.v},
      ranking:r.ranking.map(x=>({rank:x.rank,id:x.p.id,name:x.p.n,school:x.p.s,positions:x.p.v,
        intensity:x.thinkerIntensity,factor:x.thinkerK,normalized:x.perAxis.map(a=>a.thinker),
        diffs:x.perAxis.map(a=>a.diff),distance:x.distance,rawDistance:x.rawDistance,percent:x.pct,
        tiedWithPrev:x.tiedWithPrev})),
      note:r.note&&r.note.code,
    };
  }

  return {VERSION,SCALE,PARAMS,TIE_BREAK,PERCENT_RULE,HASH_RULE,AXES,QS,PH,ORDER,catalogIntensity,meanAbs,percent,
    axisScores,normalize,compare,rank,reliability,evaluate,isValid,encode,decode,auditJSON,
    fingerprint:()=>fingerprint(data),fingerprintInput:()=>fingerprintInput(data),codeFingerprint};
}

return {VERSION,SCALE,PARAMS,create,fingerprint,fingerprintInput,codeFingerprint,presentationOrder,fnv};
}

const Engine=build();
if(typeof module!=="undefined")module.exports=Engine;else root.AgoraEngine=Engine;
})(this);
