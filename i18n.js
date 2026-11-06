// Filosofômetro languages. Portuguese is the source text everywhere; an English or Spanish pack
// (i18n/en.js, i18n/es.js, loaded before this file) carries the translations of the interface and
// the catalog, plus a regional list of thinkers that takes the place of the Brazilian one.
// Interface strings are written in Portuguese inside L`...`; the pack maps each template, with its
// ${} slots numbered {0}, {1}..., to the translated template. A missing key falls back to Portuguese.
(function(root){
const META={
  pt:{lang:"pt",html:"pt-BR",prefix:"",dec:",",amazon:"https://www.amazon.com.br"},
  en:{lang:"en",html:"en",prefix:"/en",dec:".",amazon:"https://www.amazon.com"},
  es:{lang:"es",html:"es",prefix:"/es",dec:",",amazon:"https://www.amazon.com"},
};

// The key of a template: its raw text with each ${} slot numbered.
function keyOf(strings){
  let k=strings.raw[0];
  for(let i=1;i<strings.raw.length;i++)k+=`{${i-1}}`+strings.raw[i];
  return k;
}

function make(pack){
  const meta=META[pack?pack.lang:"pt"];
  const ui=(pack&&pack.ui)||{};
  const cache=new WeakMap(),missing=new Set();
  function L(strings,...vals){
    let tr=cache.get(strings);
    if(tr===undefined){
      const k=keyOf(strings);
      tr=Object.prototype.hasOwnProperty.call(ui,k)?ui[k]:null;
      if(tr===null&&pack)missing.add(k);
      cache.set(strings,tr);
    }
    if(tr===null){let s=strings[0];for(let i=0;i<vals.length;i++)s+=vals[i]+strings[i+1];return s}
    return tr.replace(/\{(\d+)\}/g,(m,n)=>n<vals.length?vals[n]:m);
  }
  // Plain strings that come from data or the engine (answer labels, level names, notes).
  const t=s=>(pack&&Object.prototype.hasOwnProperty.call(ui,s))?ui[s]:s;
  return {...meta,L,t,missing,regionName:(pack&&pack.regionName)||"Brasil"};
}

// The catalog in the pack's language. Ids, positions, dates and images never change, so every
// language gives the same main ranking; only the regional list differs.
function localize(DATA,SUP,pack){
  if(!pack){
    const BR=(DATA.BR||[]).map(p=>({...p,regional:true}));
    return {DATA:{...DATA,BR},SUP};
  }
  const ph=pack.ph||{},eras=pack.eras||{};
  const AXES=DATA.AXES.map((a,i)=>({...a,...(pack.axes||[])[i]}));
  const QS=DATA.QS.map((q,i)=>{const c=q.slice(),t=(pack.qs||[])[i];if(t){c[0]=t[0];c[3]=t[1];c[4]=t[2]}return c});
  const PH=DATA.PH.map(p=>{
    const {reading,...t}=ph[p.id]||{};
    const c={...p,...t,era:eras[p.era]||p.era};
    delete c.br;
    return c;
  });
  const BR=(pack.regional||[]).map(({reading,...p})=>({...p,regional:true}));
  const READING={};
  for(const p of [...DATA.PH]){const r=(ph[p.id]||{}).reading;READING[p.id]=r||(SUP&&SUP.READING[p.id])||[]}
  for(const p of pack.regional||[])READING[p.id]=p.reading||[];
  const meta=META[pack.lang];
  const S=SUP?{...SUP,
    SUPPORT:{...SUP.SUPPORT,pixKey:"",amazonTag:(SUP.SUPPORT.amazonTags||{})[pack.lang]||""},
    READING,
    bookURL(title,author){
      const q=/\(/.test(title)?title.replace(/[()]/g,""):`${title} ${author}`;
      const tag=(SUP.SUPPORT.amazonTags||{})[pack.lang];
      return `${meta.amazon}/s?k=${encodeURIComponent(q)}&i=stripbooks${tag?`&tag=${encodeURIComponent(tag)}`:""}`;
    }}:null;
  return {DATA:{...DATA,AXES,QS,PH,BR},SUP:S};
}

const API={META,make,localize,keyOf};
if(typeof module!=="undefined"){module.exports=API;return}
// In the browser: localize the globals before the app creates its engine.
const pack=root.AgoraLang||null;
const out=localize(root.AgoraData,root.AgoraSupport,pack);
root.AgoraData=out.DATA;
if(out.SUP)root.AgoraSupport=out.SUP;
root.AgoraI18n={...API,...make(pack)};
document.documentElement.lang=root.AgoraI18n.html;
})(this);
