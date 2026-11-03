// Filosofômetro verifier: a second implementation of the published method, written from the
// method page and kept apart from engine.js on purpose. It shares no code with the engine,
// so a change to one that is not mirrored in the other shows up as a mismatch.
(function(root){
const METHOD={
  values:[2,1,0,-1,-2],  // answer code 0..4 → value
  minIntensity:.05,
  maxGain:3,
  eps:1e-9,
  tau:.77,
};

const avgAbs=v=>{let t=0;for(const x of v)t+=Math.abs(x);return t/v.length};

// Recomputes the full result from the catalog and the 44 answers (in statement order).
function recompute(data,answers,pool=data.PH){
  const nAxes=data.AXES.length;
  const sums=new Array(nAxes).fill(0),counts=new Array(nAxes).fill(0);
  data.QS.slice(0,answers.length).forEach((q,i)=>{sums[q[1]]+=METHOD.values[answers[i]]*q[2];counts[q[1]]++});
  const positions=sums.map((s,ax)=>s/(2*counts[ax]));
  const catalog=avgAbs(data.PH.map(p=>avgAbs(p.v)));
  const shape=v=>{
    const m=avgAbs(v);
    if(m<METHOD.minIntensity)return {f:0,v:v.map(()=>0)};
    const f=Math.min(METHOD.maxGain,catalog/m);
    return {f,v:v.map(x=>x*f)};
  };
  const me=shape(positions);
  const rows=pool.map(p=>{
    const them=shape(p.v);
    const diffs=them.v.map((x,i)=>Math.abs(x-me.v[i]));
    let d=0,raw=0;
    for(let i=0;i<nAxes;i++){d+=diffs[i];raw+=Math.abs(p.v[i]-positions[i])}
    d/=nAxes;raw/=nAxes;
    const pct=me.f===0?null:Math.max(1,Math.min(100,Math.round(100*Math.exp(-Math.pow(d/METHOD.tau,2)))));
    return {id:p.id,name:p.n,f:them.f,normalized:them.v,diffs,d,raw,pct};
  });
  const same=(a,b)=>Math.abs(a-b)<=METHOD.eps;
  rows.sort((a,b)=>{
    if(!same(a.d,b.d))return a.d-b.d;
    if(!same(a.raw,b.raw))return a.raw-b.raw;
    return a.id<b.id?-1:a.id>b.id?1:0;
  });
  return {positions,catalog,factor:me.f,normalized:me.v,rows};
}

// Compares an audit file with an independent recomputation, field by field.
// Returns a list of checks; each failing check names the first field that differs.
function checkAudit(data,audit,current){
  const checks=[];
  const add=(ok,label,detail)=>checks.push({ok:!!ok,label,detail});
  const close=(a,b)=>a===b||(typeof a==="number"&&typeof b==="number"&&Math.abs(a-b)<=1e-12);
  const code=audit&&audit.answers&&audit.answers.code;
  const sizes=[1,2,3].map(l=>data.QS.filter(q=>(q[5]||1)<=l).length).filter((n,i,a)=>n>0&&a.indexOf(n)===i);
  if(typeof code!=="string"||!/^[0-4]+$/.test(code)||!sizes.includes(code.length)){
    add(false,"Respostas na auditoria","código de respostas ausente ou inválido");return checks;
  }
  const answers=code.split("").map(Number);
  const ref=recompute(data,answers);

  if(current){
    add(audit.engine&&audit.engine.catalog===current.catalog,"Catálogo igual ao atual",`auditoria ${audit.engine&&audit.engine.catalog} · atual ${current.catalog}`);
    add(audit.engine&&audit.engine.code===current.code,"Código do motor igual ao atual",`auditoria ${audit.engine&&audit.engine.code} · atual ${current.code}`);
  }
  const p=audit.engine&&audit.engine.params||{};
  add(p.tau===METHOD.tau&&p.minIntensity===METHOD.minIntensity&&p.maxGain===METHOD.maxGain&&p.eps===METHOD.eps,
    "Constantes iguais às do método",`τ=${p.tau}, mín=${p.minIntensity}, teto=${p.maxGain}, eps=${p.eps}`);

  const items=audit.answers.items||[];
  const itemBad=items.length!==answers.length?"quantidade de respostas":
    (()=>{for(let i=0;i<items.length;i++){const it=items[i],q=data.QS[i];
      if(it.index!==i||it.answer!==answers[i]||it.direction!==q[2]||it.value!==METHOD.values[answers[i]]||it.contribution!==METHOD.values[answers[i]]*q[2])return `resposta ${i+1}`}return null})();
  add(!itemBad,"Respostas, valores e contribuições",itemBad?`diverge em ${itemBad}`:`${answers.length} de ${answers.length} conferem`);

  const axes=audit.axes||[];
  const axisBad=axes.findIndex((a,i)=>!close(a.score,ref.positions[i]));
  add(axes.length===data.AXES.length&&axisBad===-1,"Posição nos 11 eixos",axisBad===-1?"11 de 11 conferem":`diverge no eixo ${axisBad+1}`);

  const u=audit.user||{};
  const userOk=close(u.factor,ref.factor)&&Array.isArray(u.normalized)&&u.normalized.every((x,i)=>close(x,ref.normalized[i]))&&u.directionless===(ref.factor===0);
  add(userOk,"Normalização do seu perfil",`fator ${typeof u.factor==="number"?u.factor.toFixed(6):"?"} · esperado ${ref.factor.toFixed(6)}`);

  const firstBad=(rk,rows)=>{
    if(!Array.isArray(rk)||rk.length!==rows.length)return "quantidade de pensadores";
    for(let i=0;i<rk.length;i++){
      const a=rk[i],b=rows[i];
      if(a.id!==b.id)return `posição ${i+1}: ${a.id} ≠ ${b.id}`;
      if(!close(a.distance,b.d))return `distância de ${b.name}`;
      if(!close(a.rawDistance,b.raw))return `distância bruta de ${b.name}`;
      if(a.percent!==b.pct)return `percentual de ${b.name}`;
      if(!close(a.factor,b.f))return `fator de ${b.name}`;
      if(!a.normalized||a.normalized.some((x,j)=>!close(x,b.normalized[j])))return `perfil normalizado de ${b.name}`;
      if(!a.diffs||a.diffs.some((x,j)=>!close(x,b.diffs[j])))return `diferenças por eixo de ${b.name}`;
    }
    return null;
  };
  const rowBad=firstBad(audit.ranking,ref.rows);
  add(!rowBad,"Ranking: ordem, distâncias, desempates e percentuais",rowBad?`diverge em ${rowBad}`:`${ref.rows.length} de ${ref.rows.length} conferem`);
  // Brazilian ranking: same rule over the Brazilian catalog plus Brazilians in the main catalog.
  const brPool=[...(data.BR||[]),...data.PH.filter(p=>p.br)];
  if(brPool.length){
    const brRef=recompute(data,answers,brPool).rows;
    const brBad=firstBad(audit.brazil,brRef);
    add(!brBad,"Ranking brasileiro",brBad?`diverge em ${brBad}`:`${brRef.length} de ${brRef.length} conferem`);
  }
  return checks;
}

const Verify={METHOD,recompute,checkAudit};
if(typeof module!=="undefined")module.exports=Verify;else root.AgoraVerify=Verify;
})(this);
