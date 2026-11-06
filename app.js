// Filosofômetro UI. All numbers come from AgoraEngine; this file only renders and routes.
(function(){
// Every interface string is Portuguese inside L`...`; i18n.js swaps it for the page's language.
const I=window.AgoraI18n,{L,t}=I;
const E=AgoraEngine.create(AgoraData);
const {AXES,QS,PH,SCALE}=E;
const app=document.getElementById("app");
const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
const TOUCH=matchMedia("(hover:none)").matches;
const BR=AgoraData.BR||[];
const SUP=window.AgoraSupport||{SUPPORT:{},READING:{},bookURL:()=>"#"};
const HAS_PIX=!!(SUP.SUPPORT.pixKey||"").trim();
const byId=Object.fromEntries([...PH,...BR].map(p=>[p.id,p]));

// The order statements are shown in comes from the engine, so the audit can report it.
const ORDER=E.ORDER;

// Privacy-friendly analytics (Vercel Web Analytics, no cookies). Hash routes and funnel steps are sent as
// readable virtual pages; result codes never leave the browser, so "/r/<code>" is reported as "/resultado".
const track=path=>{try{window.va&&window.va("pageview",{route:path,path})}catch(e){}};
const PAGE={"":"/",teste:"/teste",r:"/resultado",pensadores:"/pensadores",metodo:"/metodo",verificar:"/verificar",vs:"/convite",comparar:"/comparacao",apoie:"/apoie"};

const store={
  get(k){try{return JSON.parse(localStorage.getItem("agora."+k))}catch(e){return null}},
  set(k,v){try{localStorage.setItem("agora."+k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem("agora."+k)}catch(e){}},
};

const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(x,d=2)=>(x>=0?"+":"−")+Math.abs(x).toFixed(d).replace(".",I.dec);
const pad=n=>String(n).padStart(2,"0");
const icon={
  arrow:'<svg class="arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  back:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
  info:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>',
  chev:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  share:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
  link:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
};

/* ---------- Sigil: the 11-axis profile as a polygon ---------- */
const R=100;
const angle=i=>-Math.PI/2+i*2*Math.PI/AXES.length;
const radius=v=>R*(.16+.84*(Math.max(-1,Math.min(1,v))+1)/2);
const pts=v=>v.map((x,i)=>[Math.cos(angle(i))*radius(x),Math.sin(angle(i))*radius(x)]);
const path=v=>"M"+pts(v).map(p=>p.map(n=>n.toFixed(2)).join(" ")).join("L")+"Z";
function sigil(v,{compare=null,labels=false,cls="sg-solo",draw=false,title="",decorative=false,tips=false}={}){
  const pad=labels?66:6;
  let s=`<svg viewBox="${-R-pad} ${-R-pad} ${2*(R+pad)} ${2*(R+pad)}" ${decorative?'aria-hidden="true" focusable="false"':`role="img" aria-label="${esc(title||L`Perfil nos 11 eixos`)}"`}>`;
  [.33,.66,1].forEach(f=>s+=`<circle class="sg-ring" r="${(R*(.16+.84*f)).toFixed(1)}"/>`);
  AXES.forEach((_,i)=>s+=`<line class="sg-spoke" x1="0" y1="0" x2="${(Math.cos(angle(i))*R).toFixed(1)}" y2="${(Math.sin(angle(i))*R).toFixed(1)}"/>`);
  if(compare)s+=`<path class="sg-them" d="${path(compare)}"/>`;
  s+=`<path class="${cls}${draw&&!reduceMotion?" sg-draw":""}" d="${path(v)}" ${draw?'style="--len:1400"':""}/>`;
  if(cls==="sg-user")pts(v).forEach(([x,y])=>s+=`<circle class="sg-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/>`);
  if(labels)AXES.forEach((a,i)=>{
    const x=Math.cos(angle(i))*(R+14),y=Math.sin(angle(i))*(R+14);
    const anchor=Math.abs(x)<8?"middle":x>0?"start":"end";
    s+=`<text class="sg-lbl" x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="${anchor}">${esc(a.name)}</text>`;
  });
  // One invisible wedge per axis catches hover and keyboard focus for the explanation tooltip.
  if(tips){
    const half=Math.PI/AXES.length,rr=R+(labels?40:8);
    AXES.forEach((a,i)=>{
      const a1=angle(i)-half,a2=angle(i)+half;
      const p1=[Math.cos(a1)*rr,Math.sin(a1)*rr],p2=[Math.cos(a2)*rr,Math.sin(a2)*rr];
      s+=`<path class="sg-hit" data-ax="${i}" tabindex="0" role="button" aria-label="${L`${esc(a.name)}: ${esc(a.l)} ou ${esc(a.r)}. Ver explicação`}" d="M0 0L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}A${rr} ${rr} 0 0 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}Z"/>`;
    });
  }
  return s+"</svg>";
}

/* ---------- Sigil explanations ---------- */
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const lean=(a,x)=>Math.abs(x)<.13?L`Equilíbrio`:`${x<0?a.l:a.r}${Math.abs(x)>=.6?L`, forte`:""}`;
// How two people differ on one axis. On the same side it is a difference of strength, not of direction.
function diffText(a,n1,v1,n2,v2){
  if(Math.sign(v1)===Math.sign(v2)&&Math.abs(v1)>=.13&&Math.abs(v2)>=.13)
    return L`Os dois tendem a <b>${esc(v1<0?a.l:a.r)}</b>, mas ${esc(Math.abs(v1)>Math.abs(v2)?n1:n2)} com mais força.`;
  return `${esc(n1)}: <b>${esc(lean(a,v1))}</b>. ${esc(n2)}: <b>${esc(lean(a,v2))}</b>.`;
}
const num2=x=>(x>=0?"+":"−")+Math.abs(x).toFixed(2).replace(".",I.dec);
// Why the user sits where they do on one axis: the answers that pulled hardest in that direction.
function whyUser(r,ax){
  const qs=r.perQuestion.filter(q=>q.axis===ax);
  const score=r.scores[ax];
  if(Math.abs(score)<.13){
    const pulls=qs.filter(q=>q.contribution!==0);
    return pulls.length?L`Suas respostas se equilibraram: ${pulls.length} puxaram para lados opostos.`:L`Você ficou neutro nas afirmações deste eixo.`;
  }
  const dir=Math.sign(score);
  const top=qs.filter(q=>Math.sign(q.contribution)===dir).sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution)).slice(0,2);
  const said=q=>L`“${t(SCALE[q.answer].label).toLowerCase()}” para “${QS[q.i][0].replace(/\.$/,"")}”`;
  return L`Você respondeu ${top.map(said).join(L` e `)}.`;
}
// The example in the quiz where this thinker is cited on this axis, if any.
function thinkerCite(p,ax){
  for(const q of QS){if(q[1]!==ax)continue;for(const ex of [q[3],q[4]]){const n=ex.slice(0,ex.indexOf(": "));if(thinkerByName(n)===p)return ex.slice(ex.indexOf(": ")+2)}}
  return null;
}
function tipHTML(ax,{user=null,r=null,p=null,you=L`Você`}){
  const a=AXES[ax];
  let h=`<button class="tip-x" type="button" aria-label="${L`Fechar explicação`}">×</button><b class="tip-t">${esc(cap(a.name))}</b><span class="tip-poles">${L`${esc(a.l)} no centro ↔ ${esc(a.r)} na borda`}</span>`;
  if(user)h+=`<span class="tip-row"><i class="tip-dot you"></i>${esc(you)}: ${num2(user[ax])} · ${esc(lean(a,user[ax]))}</span>`;
  if(p)h+=`<span class="tip-row"><i class="tip-dot them"></i>${esc(p.n)}: ${num2(p.v[ax])} · ${esc(lean(a,p.v[ax]))}</span>`;
  if(r)h+=`<span class="tip-why"><b>${L`Por quê:`}</b> ${esc(whyUser(r,ax))}</span>`;
  else if(p){const c=thinkerCite(p,ax);if(c)h+=`<span class="tip-why"><b>${esc(p.n)}:</b> ${esc(c)}</span>`;}
  return h;
}
// ctx is the {user, r, p} shown in the tooltip, or a function returning it when the sigil changes over time.
function wireTips(root,ctx){
  const tip=document.getElementById("tip");
  const hits=[...root.querySelectorAll(".sg-hit")];
  const hide=()=>{tip.classList.remove("show","sheet");hits.forEach(h=>h.classList.remove("on"))};
  const place=(x,y)=>{
    if(tip.classList.contains("sheet"))return;
    const w=tip.offsetWidth,h=tip.offsetHeight,m=12;
    let left=x+16,top=y+16;
    if(left+w>innerWidth-m)left=x-w-16;
    if(top+h>innerHeight-m)top=y-h-16;
    tip.style.left=Math.max(m,left)+"px";tip.style.top=Math.max(m,top)+"px";
  };
  let lastTouch=0;
  hits.forEach(el=>{
    const fill=()=>{document.body.classList.add("tips-seen");tip.innerHTML=tipHTML(+el.dataset.ax,typeof ctx==="function"?ctx():ctx);hits.forEach(h=>h.classList.toggle("on",h===el))};
    const showAt=(x,y)=>{fill();tip.classList.remove("sheet");tip.classList.add("show");place(x,y)};
    // On touch screens the explanation opens as a card at the bottom of the screen, readable with one hand.
    const sheet=()=>{fill();tip.classList.add("show","sheet");tip.style.left=tip.style.top=""};
    el.addEventListener("pointerenter",e=>{if(e.pointerType==="mouse")showAt(e.clientX,e.clientY)});
    el.addEventListener("pointermove",e=>{if(e.pointerType==="mouse")place(e.clientX,e.clientY)});
    el.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")hide()});
    el.addEventListener("pointerup",e=>{if(e.pointerType!=="mouse"){lastTouch=Date.now();sheet()}});
    el.addEventListener("focus",()=>{if(Date.now()-lastTouch<800)return;const b=el.getBoundingClientRect();showAt(b.left+b.width/2,b.top+b.height/2)});
    el.addEventListener("blur",()=>{if(!tip.classList.contains("sheet"))hide()});
    // Fallback for browsers that send only a click; skipped right after a touch already handled it.
    el.addEventListener("click",e=>{if(Date.now()-lastTouch<800)return;if(matchMedia("(hover:none)").matches)sheet();else{const b=el.getBoundingClientRect();showAt(e.clientX||b.left,e.clientY||b.top)}});
    el.addEventListener("keydown",e=>{if(e.key==="Escape"){hide();el.blur()}});
  });
  const onDoc=e=>{if(!e.target.closest||!e.target.closest(".sg-hit,#tip"))hide()};
  const onScroll=()=>{if(tip.classList.contains("sheet")&&Math.abs(scrollY-scrollAt)>60)hide()};
  let scrollAt=scrollY;
  tip.onclick=e=>{if(e.target.closest(".tip-x"))hide()};
  document.addEventListener("pointerdown",onDoc);
  addEventListener("scroll",onScroll,{passive:true});
  const obs=new MutationObserver(()=>{scrollAt=scrollY});obs.observe(tip,{attributes:true,attributeFilter:["class"]});
  onLeave(()=>{document.removeEventListener("pointerdown",onDoc);removeEventListener("scroll",onScroll);obs.disconnect();hide()});
}

/* ---------- Routing ---------- */
let cleanup=[];
function onLeave(fn){cleanup.push(fn)}
function route(){
  cleanup.forEach(f=>f());cleanup=[];
  const h=location.hash;
  const legacy=h.match(/^#r=([0-4]+)$/);
  if(legacy){location.replace("#/r/"+legacy[1]);return}
  const parts=h.replace(/^#\/?/,"").split("/");
  const name=parts[0]||"";
  document.querySelectorAll("[data-nav]").forEach(a=>a.toggleAttribute("aria-current",a.dataset.nav===name||(name==="p"&&a.dataset.nav==="pensadores")));
  // Header call to action: the last result if there is one, otherwise the quiz. Hidden while taking the quiz.
  const cta=document.getElementById("navCta"),lastCode=store.get("last");
  if(cta){const hasLast=!!(lastCode&&E.decode(lastCode));cta.href=hasLast?"#/r/"+lastCode:"#/teste";cta.innerHTML=hasLast?`<span class="cta-lg">${L`Meu resultado`}</span><span class="cta-sm">${L`Resultado`}</span>`:`<span class="cta-lg">${L`Fazer o teste`}</span><span class="cta-sm">${L`Teste`}</span>`;cta.classList.toggle("hidden",name==="teste"||(hasLast&&name==="r"&&parts[1]===lastCode))}
  if(a11yNav(name))return;
  track(name==="p"&&byId[parts[1]]?"/p/"+parts[1]:name==="r"&&parts[2]==="ver"?"/resultado-de-outra-pessoa":PAGE[name]||"/nao-encontrado");
  if(name==="teste")renderQuiz(parts[1]);
  else if(name==="r")renderResult(parts[1],parts[2]);
  else if(name==="pensadores")renderCatalog();
  else if(name==="p")renderThinker(parts[1]);
  else if(name==="metodo")renderMethod();
  else if(name==="apoie")renderSupport();
  else if(name==="verificar")renderVerify(parts[1]);
  else if(name==="vs")renderInvite(parts[1],parts[2]);
  else if(name==="comparar")renderCompare(parts[1],parts[2],parts[3],parts[4]);
  // #/novo-teste: the full prototype flow. The quiz runs as usual and ends on #/novo with the new reveal.
  else if(name==="novo-teste"){store.set("proto",1);store.del("progress");location.replace("#/teste");return}
  else if(name==="novo")renderResultV2(parts[1]||store.get("last"));
  else if(name===""||name==="app")renderHome();
  else renderNotFound();
  window.scrollTo({top:0,behavior:"instant"});
}
// Hash targets like #app (skip link) should just move focus, not re-route.
function a11yNav(name){
  if(name==="app"){app.focus();history.replaceState(null,"",location.pathname+location.search+(sessionStorage.lastRoute||"#/"));return true}
  try{sessionStorage.lastRoute=location.hash||"#/"}catch(e){}
  return false;
}
function mount(html,title){
  app.innerHTML=`<div class="view">${html}</div>`;
  document.title=title?`${title} | Filosofômetro`:L`Filosofômetro: qual filósofo pensa como você?`;
  revealOnScroll();
}
// Blocks below the fold rise in as they enter the screen; siblings follow one another by a few frames.
// Without IntersectionObserver, or with reduced motion, everything is simply shown.
const REVEAL=".chapter,.panel,.step,.bt,.tcard,.level,.axes-list li,.finale,.audit,.match-list li,.axis-row";
function revealOnScroll(){
  if(reduceMotion||!("IntersectionObserver" in window))return;
  const els=[...app.querySelectorAll(REVEAL)];
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{rootMargin:"0px 0px -8% 0px"});
  els.forEach(el=>{
    const sibs=[...el.parentNode.children].filter(c=>c.matches(REVEAL));
    el.style.setProperty("--rv",Math.min(sibs.indexOf(el),8));
    el.classList.add("rv");io.observe(el);
  });
  onLeave(()=>io.disconnect());
}
function focusHeading(){
  const h=app.querySelector("h1");
  if(h){h.setAttribute("tabindex","-1");h.focus({preventScroll:true})}
}
addEventListener("hashchange",()=>{route();focusHeading()});
// The logo on the page it points to scrolls back to the top instead of doing nothing.
document.querySelector(".brand").addEventListener("click",e=>{if((location.hash||"#/")==="#/"){e.preventDefault();scrollTo({top:0,behavior:reduceMotion?"auto":"smooth"})}});

/* ---------- Home ---------- */
function renderHome(){
  const saved=store.get("progress");
  const resume=saved&&saved.answers&&saved.answers.some(a=>a!==null)&&saved.answers.some(a=>a===null);
  const done=saved?saved.answers.filter(a=>a!==null).length:0;
  const names=PH.map(p=>`<span>${esc(p.n)}</span>`).join("");
  mount(`
  <section class="wrap hero">
    <div>
      <span class="eyebrow">${L`Teste filosófico`}</span>
      <h1 class="display"><span class="line"><span>${L`Qual filósofo`}</span></span><span class="line"><span>${L`pensa como`}</span></span><span class="line"><span><em class="it accent">${L`você?`}</em></span></span></h1>
      <p class="lede">${L`Responda afirmações sobre verdade, liberdade, moral e poder. Descubra seu arquétipo filosófico, seu par entre ${PH.length+BR.length} pensadores, quem pensa como você no Brasil e quem mais discordaria de você.`}</p>
      <div class="cta-row">
        <a class="btn accent" href="#/teste" ${resume?"":'data-fresh="1"'}>${resume?L`Continuar de onde parei · ${done}/${saved.answers.length}`:L`Começar o teste`} ${icon.arrow}</a>
        ${resume?`<a class="btn ghost" href="#/teste" data-fresh="1">${L`Recomeçar`}</a>`:`<a class="btn ghost" href="#/metodo">${L`Como funciona`}</a>`}
      </div>
      <div class="facts"><span>${L`<b>3</b> níveis: ${E.LEVELS.map(l=>l.n).join(", ")} afirmações`}</span><span>${L`<b>11</b> eixos`}</span><span>${L`<b>462</b> arquétipos`}</span><span>${L`<b>${PH.length+BR.length}</b> pensadores`}</span><span>${L`Sem cadastro`}</span></div>
    </div>
    <div class="hero-art">
      <div class="duo hero-duo">
        <figure class="portrait" id="heroPic" aria-hidden="true"><img alt="" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer"><img alt="" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer"></figure>
        <div class="sigil-badge" id="heroSigil"></div>
      </div>
      <div class="hero-caption fade-swap" id="heroCap"><a class="who" href="#/"></a><div class="what"></div><p class="tip-hint hero-hint">${L`A mandala desenha o pensamento em 11 eixos. <span class="on-hover">Passe o mouse</span><span class="on-touch">Toque</span> para ver cada um.`}</p></div>
    </div>
  </section>
  <div class="marquee" aria-hidden="true"><div class="track">${names}${names}</div></div>
  ${discoverHTML()}
  <section class="wrap section" style="padding-top:0">
    <div class="section-head">
      <div><span class="eyebrow">${L`O mapa`}</span><h2 class="h2">${L`Onze tensões que <em class="it">definem</em> um pensamento`}</h2></div>
      <p>${L`Cada eixo opõe duas respostas legítimas a uma pergunta antiga. Não existe lado certo: existe o seu lado, e quem esteve nele antes de você.`}</p>
    </div>
    <ol class="axes-list">${AXES.map((a,i)=>`<li><span class="n">${pad(i+1)}</span><span class="pole">${esc(a.l)}</span><span class="mid"><i></i>${esc(a.name)}</span><span class="pole r">${esc(a.r)}</span></li>`).join("")}</ol>
  </section>
  <section class="wrap section" style="padding-top:0">
    <div class="section-head">
      <div><span class="eyebrow">${L`O método`}</span><h2 class="h2">${L`Sem caixa-preta`}</h2></div>
      <p>${L`O cálculo inteiro aparece no seu resultado: cada resposta, cada eixo, cada distância. Você pode refazer a conta à mão.`}</p>
    </div>
    <div class="steps">
      <div class="step"><span class="num">i.</span><h3>${L`Você responde`}</h3><p>${L`Escolha o nível e concorde ou discorde das afirmações. Elas vêm misturadas, e metade de cada eixo puxa para cada lado.`}</p></div>
      <div class="step"><span class="num">ii.</span><h3>${L`Mapeamos seu formato`}</h3><p>${L`Suas respostas viram uma posição em 11 eixos. Comparamos o formato desse perfil com o de ${PH.length+BR.length} pensadores.`}</p></div>
      <div class="step"><span class="num">iii.</span><h3>${L`Você audita`}</h3><p>${L`Veja passo a passo por que deu quem deu, compare com qualquer pensador e baixe os dados.`}</p></div>
    </div>
  </section>
  <section class="wrap big-cta">
    <h2 class="h2">${L`Conhece-te<br><em class="it accent">a ti mesmo.</em>`}</h2>
    <a class="btn accent" href="#/teste" data-fresh="1">${L`Começar agora`} ${icon.arrow}</a>
  </section>`);
  app.querySelectorAll("[data-fresh]").forEach(a=>a.addEventListener("click",()=>store.del("progress")));
  heroAnimation();
  wireDiscover();
}

// The "O que você descobre" tiles answer the pointer with real catalog data: profiles morph, axes explain
// themselves, the timeline names who was born where you point, and the story card counts up.
function wireDiscover(){
  const root=app.querySelector(".discover");if(!root)return;
  const tip=document.getElementById("tip");
  // 01: the pair tile cycles through contrasting thinkers while hovered (or on each tap).
  const par=root.querySelector(".bt-par"),host=par.querySelector(".bt-sigil"),who=par.querySelector(".bt-who");
  const deck=["simone-de-beauvoir","david-hume","confucio","karl-marx","ayn-rand","buda","friedrich-hayek","spinoza"].map(id=>byId[id]).filter(Boolean);
  let i=0,cur=deck[0].v.slice(),raf=0,cycle=0,count=0;
  onLeave(()=>{clearInterval(cycle);cancelAnimationFrame(raf);cancelAnimationFrame(count)});
  host.innerHTML=sigil(cur,{cls:"sg-user",tips:true,title:L`Perfil de ${deck[0].n} nos 11 eixos`});
  wireTips(host,()=>({p:deck[i]}));
  // Portraits load ahead so each swap shows a face, not an empty frame.
  deck.forEach(p=>{if(p.img){const im=new Image();im.crossOrigin="anonymous";im.referrerPolicy="no-referrer";im.src=p.img}});
  const next=()=>{
    if(tip.classList.contains("show"))return;
    i=(i+1)%deck.length;const p=deck[i],from=cur.slice(),t0=performance.now();
    const fig=par.querySelector(".bt-pic");fig.classList.add("out");
    setTimeout(()=>{fig.outerHTML=portrait(p,{cls:"bt-pic out"});requestAnimationFrame(()=>par.querySelector(".bt-pic").classList.remove("out"))},250);
    who.classList.add("out");setTimeout(()=>{who.innerHTML=`<b>${esc(p.n)}</b> · ${esc(p.s)}`;who.classList.remove("out")},250);
    host.querySelector("svg").setAttribute("aria-label",L`Perfil de ${p.n} nos 11 eixos`);
    cancelAnimationFrame(raf);
    const step=now=>{
      const t=reduceMotion?1:Math.min(1,(now-t0)/800),e=1-Math.pow(1-t,4);
      cur=from.map((x,k)=>x+(p.v[k]-x)*e);
      host.querySelector(".sg-user").setAttribute("d",path(cur));
      host.querySelectorAll(".sg-dot").forEach((d,k)=>{const [x,y]=pts(cur)[k];d.setAttribute("cx",x.toFixed(1));d.setAttribute("cy",y.toFixed(1))});
      if(t<1)raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);
  };
  par.addEventListener("pointerenter",e=>{if(e.pointerType!=="mouse")return;next();clearInterval(cycle);cycle=setInterval(next,1800)});
  par.addEventListener("pointerleave",()=>clearInterval(cycle));
  par.addEventListener("click",e=>{if(TOUCH&&!e.target.closest(".sg-hit"))next()});
  // 04: the marker follows the pointer and names the thinker born closest to that year.
  const tl=root.querySelector(".bt-tl"),line=tl.querySelector(".bt-time"),mark=line.querySelector("b"),year=line.querySelector(".bt-year");
  const born=PH.map(p=>p.born),min=Math.min(...born),max=Math.max(...born),dots=[...line.querySelectorAll("i")];
  const at=x=>{
    const r=line.getBoundingClientRect(),f=Math.max(0,Math.min(1,(x-r.left)/r.width)),y=min+f*(max-min);
    let k=0;PH.forEach((p,j)=>{if(Math.abs(p.born-y)<Math.abs(PH[k].born-y))k=j});
    const p=PH[k],left=(p.born-min)/(max-min)*100;
    mark.style.left=left+"%";dots.forEach((d,j)=>d.classList.toggle("on",j===k));
    year.textContent=`${p.n} · ${yearText(p.born)}`;year.style.left=Math.max(14,Math.min(86,left))+"%";tl.classList.add("live");
  };
  tl.addEventListener("pointermove",e=>at(e.clientX));
  tl.addEventListener("pointerleave",()=>{tl.classList.remove("live");mark.style.left="62%";dots.forEach(d=>d.classList.remove("on"))});
  // 05: both profiles explain each axis.
  const [a,b]=["simone-de-beauvoir","nietzsche"].map(id=>byId[id]);
  if(a&&b)wireTips(root.querySelector(".bt-duo"),{p:b,user:a.v,you:a.n});
  // 06: the story card counts up to its match.
  const story=root.querySelector(".bt-story"),pct=story.querySelector(".ph-pct");
  story.addEventListener("pointerenter",()=>{
    if(reduceMotion)return;const t0=performance.now();cancelAnimationFrame(count);
    const step=now=>{const t=Math.min(1,(now-t0)/900);pct.textContent=Math.round(94*(1-Math.pow(1-t,3)))+"%";if(t<1)count=requestAnimationFrame(step)};
    count=requestAnimationFrame(step);
  });
}

// What a result contains, previewed with real catalog data so the page shows instead of telling.
function discoverHTML(){
  const pick=id=>byId[id]||PH[0];
  const a=pick("simone-de-beauvoir"),b=pick("nietzsche")||PH[1],opp=pick("tomas-de-aquino");
  // The regional tile shows three faces from this language's regional list.
  const brs=(I.lang==="pt"?["paulo-freire","marilena-chaui","lelia-gonzalez","milton-santos"].map(id=>byId[id]).filter(Boolean):BR.filter(p=>p.img)).slice(0,3);
  const span=Math.max(...PH.map(p=>p.born))-Math.min(...PH.map(p=>p.born)),min=Math.min(...PH.map(p=>p.born));
  const dots=PH.map(p=>`<i style="left:${((p.born-min)/span*100).toFixed(1)}%"></i>`).join("");
  return `<section class="wrap section discover">
    <div class="section-head">
      <div><span class="eyebrow">${L`O resultado`}</span><h2 class="h2">${L`O que você <em class="it">descobre</em>`}</h2></div>
      <p>${L`Não é só um nome. É um retrato do seu jeito de pensar, com gente de verdade dos dois lados, e uma conversa pronta para começar com os amigos.`}</p>
    </div>
    <div class="bento">
      <article class="bt bt-par">
        <div class="bt-art">${portrait(a,{cls:"bt-pic"})}<div class="bt-sigil"></div><span class="bt-who"><b>${esc(a.n)}</b> · ${esc(a.s)}</span></div>
        <div><span class="bt-k">${L`01 · Seu par e seu arquétipo`}</span><h3>${L`O pensador com o formato mais parecido com o seu`}</h3><p>${L`Com percentual de compatibilidade, um nome para o seu jeito de pensar, sua contradição e uma carta do seu filósofo.`}</p></div>
      </article>
      <article class="bt bt-opp">
        <div class="bt-vs">${portrait(b,{cls:"bt-av"})}<span>vs</span>${portrait(opp,{cls:"bt-av"})}<span class="bt-reveal">${L`${esc(shortName(b.n))} e ${esc(shortName(opp.n))} concordam em ${AXES.filter((_,i)=>Math.sign(b.v[i])===Math.sign(opp.v[i])).length} de ${AXES.length} eixos`}</span></div>
        <span class="bt-k">${L`02 · Seu oposto`}</span><h3>${L`Quem mais discordaria de você`}</h3>
      </article>
      <article class="bt bt-br">
        <span class="br-flag" aria-hidden="true"></span>
        <div class="bt-stack">${brs.map(p=>portrait(p,{cls:"bt-av"})).join("")}<span class="bt-reveal">${L`${brs.map(p=>esc(shortName(p.n))).join(", ")} e mais`}</span></div>
        <span class="bt-k">${L`03 · No Brasil`}</span><h3>${L`Quem pensa como você entre ${E.BRAZIL.length} brasileiros`}</h3>
      </article>
      <article class="bt bt-tl">
        <div class="bt-time" aria-hidden="true">${dots}<b style="left:62%"></b><span class="bt-year"></span></div>
        <span class="bt-k">${L`04 · Linha do tempo`}</span><h3>${L`Onde você está na história, de ${yearText(min)} até hoje`}</h3>
      </article>
      <article class="bt bt-vsf">
        <div class="bt-duo">${sigil(a.v,{compare:b.v,cls:"sg-user",tips:true,title:L`${a.n} e ${b.n} nos 11 eixos`})}</div>
        <span class="bt-k">${L`05 · Desafie um amigo`}</span><h3>${L`Mande o link e vejam, eixo por eixo, quanto são compatíveis`}</h3>
      </article>
      <article class="bt bt-story">
        <div class="bt-phone" aria-hidden="true"><span class="ph-pct">94%</span><span class="ph-nm">${esc(shortName(a.n))}</span><span class="ph-bar"></span></div>
        <span class="bt-k">${L`06 · Story`}</span><h3>${L`Um card pronto para postar`}</h3>
      </article>
    </div>
  </section>`;
}

function heroAnimation(){
  const host=document.getElementById("heroSigil"),cap=document.getElementById("heroCap");
  const deck=PH.slice().sort(()=>Math.random()-.5);
  let idx=0,cur=deck[0].v.slice(),raf=0,timer=0,front=0;
  // Two stacked images crossfade, and the next portrait is preloaded one step ahead.
  const imgs=[...document.querySelectorAll("#heroPic img")];
  const preload=p=>{const i=new Image();i.crossOrigin="anonymous";i.referrerPolicy="no-referrer";i.src=p.img};
  imgs[0].src=deck[0].img;imgs[0].classList.add("on");preload(deck[1]);
  const setCap=p=>{const w=cap.querySelector(".who");w.textContent=p.n;w.href="#/p/"+p.id;cap.querySelector(".what").textContent=p.s};
  host.innerHTML=sigil(cur,{cls:"sg-user",tips:true,title:L`Perfil de ${deck[0].n} nos 11 eixos`});setCap(deck[0]);
  // The tooltip always describes the thinker on screen, and the cycle pauses while someone reads it.
  wireTips(host,()=>({p:deck[idx]}));
  const tip=document.getElementById("tip");
  const reading=()=>tip.classList.contains("show")||host.matches(":hover")||host.contains(document.activeElement);
  if(reduceMotion)return;
  const tick=()=>{
    if(reading())return;
    host.querySelector("svg").setAttribute("aria-label",L`Perfil de ${deck[(idx+1)%deck.length].n} nos 11 eixos`);
    const from=cur.slice(),to=deck[(idx+1)%deck.length].v,t0=performance.now();
    idx=(idx+1)%deck.length;
    const back=imgs[1-front];back.src=deck[idx].img;back.classList.add("on");imgs[front].classList.remove("on");front=1-front;
    preload(deck[(idx+1)%deck.length]);
    cap.classList.add("out");
    setTimeout(()=>{setCap(deck[idx]);cap.classList.remove("out")},380);
    const step=now=>{
      const t=Math.min(1,(now-t0)/1100),e=1-Math.pow(1-t,4);
      cur=from.map((x,i)=>x+(to[i]-x)*e);
      const p=host.querySelector(".sg-user");if(!p)return;
      p.setAttribute("d",path(cur));
      host.querySelectorAll(".sg-dot").forEach((d,i)=>{const [x,y]=pts(cur)[i];d.setAttribute("cx",x.toFixed(1));d.setAttribute("cy",y.toFixed(1))});
      if(t<1)raf=requestAnimationFrame(step);
    };
    raf=requestAnimationFrame(step);
  };
  timer=setInterval(()=>{if(!document.hidden)tick()},3200);
  onLeave(()=>{clearInterval(timer);cancelAnimationFrame(raf)});
}

/* ---------- Quiz ---------- */
// After the last answer: open the result, or the comparison when the person came from an invite.
function finishQuiz(answers){
  track("/evento/teste-concluido");
  const code=E.encode(answers),vs=store.get("vs");
  store.set("last",code);
  store.set("reveal",code);
  if(vs&&E.decode(vs.code)){store.del("vs");location.replace(`#/comparar/${vs.code}/${code}${vs.name?`/${encName(vs.name)}`:""}`);return}
  if(store.get("proto")){store.del("proto");store.del("reveal");store.set("protoReveal",code);location.replace("#/novo/"+code);return}
  location.replace("#/r/"+code);
}

// Examples are "Name: position". The name is matched to the catalog to show the thinker's portrait.
const NAME_ALIAS={"Espinosa":"spinoza","Calvino":"joao-calvino","Lao Tsé":"lao-tse",...((window.AgoraLang||{}).alias||{})};
function thinkerByName(name){
  if(NAME_ALIAS[name])return byId[NAME_ALIAS[name]];
  return PH.find(p=>p.n===name)||PH.find(p=>p.n.endsWith(" "+name))||PH.find(p=>p.n.split(" ").includes(name));
}
function citation(ex){
  const i=ex.indexOf(": "),name=ex.slice(0,i),p=thinkerByName(name);
  const text=ex.charAt(i+2).toUpperCase()+ex.slice(i+3);
  return `<div class="ex-who">${p?portrait(p,{cls:"ex-pic"}):""}<b>${esc(name)}</b></div><p>${esc(text)}</p>`;
}
// What a simulated retest shows for each level (tests/levels in the method page): accuracy grows with statements.
const LEVEL_INFO={
  1:{tag:L`Para começar`,precision:L`Boa`,retest:"55%",desc:L`Seu par e seus eixos mais fortes em poucos minutos. Dá para aprofundar depois.`,unlock:[L`Seu par e seu arquétipo`,L`A revelação, passo a passo`,L`O card para o story`]},
  2:{tag:L`Recomendado`,precision:L`Alta`,retest:"83%",desc:L`Resultado bem mais estável. Inclui as 44 do Rápido.`,unlock:[L`Tudo do Rápido`,L`Sua contradição interna`,L`Uma carta do seu filósofo para você`]},
  3:{tag:L`Para quem quer ir fundo`,precision:L`Muito alta`,retest:"94%",desc:L`O retrato mais fiel. Inclui as 88 do Completo.`,unlock:[L`Tudo do Completo`,L`Seu manifesto nos 11 eixos`,L`Papel de parede com a sua mandala`]},
};
const levelBy=id=>E.LEVELS.find(l=>l.id===id);
const nextLevel=n=>E.LEVELS.find(l=>l.n>n)||null;
function newProgress(level,base=[]){
  const answers=base.concat(new Array(level.n-base.length).fill(null));
  const order=ORDER.filter(i=>i<level.n);
  return {answers,pos:Math.max(0,order.findIndex(i=>answers[i]===null))};
}
function renderLevelPick(){
  const vs=store.get("vs");
  mount(`
  <section class="wrap section" style="padding-top:clamp(28px,6vh,64px)">
    <span class="eyebrow">${vs?L`Desafio aceito`:L`Antes de começar`}</span>
    <h1 class="h2" style="font-size:clamp(44px,min(7vw,10vh),96px)">${L`Quanto você quer <em class="it accent">ir fundo?</em>`}</h1>
    <p class="lede lv-lede" style="margin-top:14px;max-width:56ch">${L`Os três níveis usam os mesmos 11 eixos. Quanto mais afirmações, mais preciso fica o resultado. Dá para começar no Rápido e aprofundar depois, sem perder nada.`}</p>
    <div class="levels">${E.LEVELS.map(l=>{const i=LEVEL_INFO[l.id];return `<a class="level ${l.id===2?"rec":""}" href="#/teste/${l.id}">
      <span class="lv-tag">${esc(i.tag)}</span>
      <span class="lv-name">${esc(t(l.name))}</span>
      <span class="lv-n">${L`<b>${l.n}</b> afirmações · ≈ ${l.minutes} min`}</span>
      <span class="lv-bars" aria-hidden="true">${[1,2,3].map(k=>`<i class="${k<=l.id?"on":""}"></i>`).join("")}</span>
      <span class="lv-desc">${esc(i.desc)}</span>
      <ul class="lv-unlock" aria-label="${L`O que este nível libera`}">${i.unlock.map(u=>`<li>${esc(u)}</li>`).join("")}</ul>
      <span class="lv-meta">${L`Precisão ${esc(i.precision).toLowerCase()} · mesmo par ao refazer em ${i.retest} das vezes`}</span>
      <span class="btn ${l.id===2?"accent":"ghost"} sm">${L`Começar`} ${icon.arrow}</span>
    </a>`}).join("")}</div>
  </section>`,L`Escolha o nível`);
}
function renderQuiz(arg){
  // "#/teste/1|2|3" starts that level from zero; "#/teste/aprofundar" continues from the last result.
  if(arg==="aprofundar"){
    const last=E.decode(store.get("last")||""),nl=last&&nextLevel(last.length);
    if(!nl){location.replace("#/teste");return}
    store.set("progress",newProgress(nl,last));history.replaceState(null,"","#/teste");
  }else if(/^[123]$/.test(arg||"")){
    const lv=levelBy(+arg);
    if(lv){store.set("progress",newProgress(lv));history.replaceState(null,"","#/teste");}
  }
  // Saved progress is used only if its size is a level and every stored answer is empty or a valid code.
  let saved=store.get("progress");
  const validSaved=saved&&Array.isArray(saved.answers)&&E.SIZES.includes(saved.answers.length)&&
    saved.answers.every(a=>a===null||(Number.isInteger(a)&&a>=0&&a<=4))&&
    Number.isInteger(saved.pos)&&saved.pos>=0&&saved.pos<saved.answers.length;
  if(!validSaved){renderLevelPick();return}
  const answers=saved.answers,total=answers.length,lv=E.levelOf(total);
  const order=ORDER.filter(i=>i<total);
  let pos=saved.pos,busy=false,alive=true;
  // Timers are tracked so nothing fires after leaving the quiz.
  const timers=new Set();
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);if(alive)fn()},ms);timers.add(t)};
  onLeave(()=>{alive=false;timers.forEach(clearTimeout);timers.clear()});
  const save=()=>store.set("progress",{answers,pos});
  // Left to right on screen: discordo totalmente (code 4) ... concordo totalmente (code 0).
  const UI=[4,3,2,1,0];
  const TONE=["n2","n1","z","p1","p2"];
  mount(`
  <section class="wrap quiz" aria-labelledby="qText">
    <div class="quiz-top">
      <span class="qa-top"><span class="qa-mini" aria-hidden="true">${sigil(AXES.map(()=>0),{cls:"sg-user",decorative:true})}</span><span class="axis-tag" id="axisTag"></span></span>
      <span class="lv-chip">${esc(t(lv.name))}</span>
      <a class="link-btn" href="#/">${L`Sair <span class="sr">do teste (seu progresso fica salvo)</span>`}</a>
    </div>
    <div class="progress ${total>44?"dense":""}" style="grid-template-columns:repeat(${total},1fr)" aria-hidden="true">${order.map(()=>"<i></i>").join("")}</div>
    <p class="q-near" id="qNear" aria-live="off"></p>
    <div class="quiz-body">
    <div class="q-stage">
      <div class="q-anim" id="qAnim">
        <div class="q-count mono" id="qCount" aria-hidden="true"></div>
        <p class="sr" id="qLive" aria-live="polite"></p>
        <h1 class="q-text" id="qText"></h1>
        <div class="examples" id="examples">
          <div class="ex ex-d"><span class="ex-k">${L`Quem discorda`}</span><div id="exD"></div></div>
          <div class="ex ex-a"><span class="ex-k">${L`Quem concorda`}</span><div id="exA"></div></div>
        </div>
      </div>
      <div class="scale" role="radiogroup" aria-labelledby="qText" aria-describedby="examples" id="scale">
        <div class="choices">${UI.map((code,j)=>`<button type="button" class="choice" role="radio" aria-checked="false" data-code="${code}" data-tone="${TONE[j]}"><span class="ch-mark" aria-hidden="true"><i></i><i></i></span><span class="ch-lbl">${esc(t(SCALE[code].label))}</span><span class="ch-k" aria-hidden="true">${j+1}</span></button>`).join("")}</div>
      </div>
    </div>
    <aside class="quiz-aside" aria-hidden="true">
      <div class="qa-sigil" id="qaSigil">${sigil(AXES.map(()=>0),{cls:"sg-user",labels:true,decorative:true})}</div>
      <div class="qa-cap"><span class="eyebrow">${L`Seu formato até agora`}</span><p id="qaAxis"></p></div>
    </aside>
    </div>
    <div class="quiz-foot">
      <span style="display:flex;gap:20px;align-items:center"><button type="button" class="link-btn" id="prevBtn">${icon.back} ${L`Anterior`}</button><button type="button" class="link-btn accent hidden" id="toResult">${L`Ver resultado`} ${icon.arrow}</button></span>
      <span class="qf-count mono" id="qfCount" aria-hidden="true"></span>
      <span class="kbd-help">${L`Atalhos: <span class="kbd">1</span> a <span class="kbd">5</span> responder · <span class="kbd">⌫</span> voltar`}</span>
    </div>
  </section>`,L`Teste`);
  const ticks=[...app.querySelectorAll(".progress i")];
  const btns=[...app.querySelectorAll(".choice")];
  const anim=document.getElementById("qAnim");
  // Live sigil: the position on each axis from the statements answered so far (unanswered axes sit in the middle).
  const qaMini=app.querySelector(".qa-mini .sg-user"),qaPath=app.querySelector("#qaSigil .sg-user"),qaDots=[...app.querySelectorAll("#qaSigil .sg-dot")];
  const qaLbls=[...app.querySelectorAll("#qaSigil .sg-lbl")],qaSpokes=[...app.querySelectorAll("#qaSigil .sg-spoke")];
  function paintAside(ax){
    const sum=AXES.map(()=>0),n=AXES.map(()=>0);
    answers.forEach((a,i)=>{if(a===null)return;const q=QS[i];sum[q[1]]+=SCALE[a].value*q[2];n[q[1]]++});
    const v=sum.map((x,i)=>n[i]?x/(2*n[i]):0);
    // A live hint of where the answers are heading: the closest thinker so far, after a few answers.
    const answered=answers.filter(a=>a!==null).length,near=document.getElementById("qNear");
    if(near&&answered>=6){const top=E.rank(v).rows[0].p;if(near.dataset.id!==top.id){near.dataset.id=top.id;near.innerHTML=`${portrait(top,{cls:"qn-pic"})}<span>${L`Mais perto agora:`} <b>${esc(top.n)}</b></span>`;near.classList.remove("pop");void near.offsetWidth;near.classList.add("pop","on")}}
    qaPath.setAttribute("d",path(v));qaMini.setAttribute("d",path(v));
    pts(v).forEach(([x,y],i)=>{qaDots[i].setAttribute("cx",x.toFixed(1));qaDots[i].setAttribute("cy",y.toFixed(1))});
    qaLbls.forEach((t,i)=>t.classList.toggle("on",i===ax));qaSpokes.forEach((t,i)=>t.classList.toggle("on",i===ax));
    const done=answers.filter(a=>a!==null).length;
    document.getElementById("qaAxis").innerHTML=`${L`Agora: <b>${esc(cap(AXES[ax].name))}</b>, entre ${esc(AXES[ax].l)} e ${esc(AXES[ax].r)}.`}<br><span class="muted">${done?L`${done} de ${total} respondidas.`:L`A mandala ganha forma a cada resposta.`}</span>`;
  }
  function paint(){
    const qi=order[pos],[text,ax,,exAgree,exDisagree]=QS[qi];
    paintAside(ax);
    document.getElementById("qText").textContent=text;
    document.getElementById("exA").innerHTML=citation(exAgree);
    document.getElementById("exD").innerHTML=citation(exDisagree);
    document.getElementById("qCount").textContent=`${pad(pos+1)} / ${total}`;
    document.getElementById("qfCount").textContent=L`${pos+1} de ${total}`;
    document.getElementById("qLive").textContent=L`Afirmação ${pos+1} de ${total}: ${text}`;
    document.getElementById("axisTag").innerHTML=L`Eixo <b>${pad(ax+1)}</b> · ${esc(AXES[ax].name)}`;
    ticks.forEach((t,i)=>{t.className=i===pos?"now":answers[order[i]]!==null?"done":""});
    btns.forEach(b=>{const on=answers[qi]===+b.dataset.code;b.setAttribute("aria-checked",on);b.tabIndex=on||(answers[qi]===null&&b.dataset.code==="2")?0:-1});
    document.getElementById("prevBtn").disabled=pos===0;
    // While reviewing a finished quiz, the result is one click away.
    document.getElementById("toResult").classList.toggle("hidden",answers.some(a=>a===null));
  }
  function go(next){
    if(reduceMotion){pos=next;paint();save();if(innerWidth<=720)scrollTo({top:0,behavior:"instant"});return}
    anim.classList.add("leave");
    later(()=>{pos=next;paint();save();anim.classList.remove("leave");anim.classList.add("enter");anim.offsetWidth;anim.classList.remove("enter");busy=false;if(innerWidth<=720)scrollTo({top:0,behavior:"instant"})},170);
  }
  function pick(code){
    if(busy)return;
    const qi=order[pos];answers[qi]=code;save();paintAside(QS[qi][1]);
    // A short tick under the finger on phones that support it, and a one-time tip about swiping back.
    if(TOUCH){if(navigator.vibrate)try{navigator.vibrate(8)}catch(e){}
      if(!store.get("swipeTip")&&answers.filter(a=>a!==null).length===2){store.set("swipeTip",1);later(()=>toast(L`Dica: deslize para a direita para voltar`,3500),500)}}
    btns.forEach(b=>b.setAttribute("aria-checked",+b.dataset.code===code));
    // Next: the first open statement ahead; when reviewing past answers, simply the next one;
    // at the end, any statement still open. The result opens only when every statement is answered.
    const ahead=order.findIndex((q,i)=>i>pos&&answers[q]===null);
    const firstOpen=order.findIndex(q=>answers[q]===null);
    const next=ahead!==-1?ahead:pos+1<order.length?pos+1:firstOpen;
    busy=true;
    later(()=>{
      // Replace the quiz entry so the back button leaves the result instead of reopening an empty quiz.
      if(firstOpen===-1&&(next===-1||pos===order.length-1)){store.del("progress");finishQuiz(answers);return}
      go(next===-1?firstOpen:next);
      if(reduceMotion)busy=false;
    },reduceMotion?60:130);
  }
  btns.forEach(b=>{
    b.addEventListener("click",()=>pick(+b.dataset.code));
    b.addEventListener("keydown",e=>{
      const i=btns.indexOf(b);
      if(e.key==="ArrowRight"||e.key==="ArrowDown"){e.preventDefault();btns[Math.min(4,i+1)].focus()}
      if(e.key==="ArrowLeft"||e.key==="ArrowUp"){e.preventDefault();btns[Math.max(0,i-1)].focus()}
    });
  });
  document.getElementById("prevBtn").addEventListener("click",()=>{if(pos>0&&!busy)go(pos-1)});
  document.getElementById("toResult").addEventListener("click",()=>{
    if(answers.some(a=>a===null))return;
    store.del("progress");finishQuiz(answers);
  });
  // Swipe right to go back one statement, left to move ahead over statements already answered.
  let sx=null,sy=0;
  const stage=app.querySelector(".quiz-body");
  stage.addEventListener("touchstart",e=>{if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}},{passive:true});
  stage.addEventListener("touchend",e=>{
    if(sx===null||busy)return;
    const t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;sx=null;
    if(Math.abs(dx)<70||Math.abs(dy)>Math.abs(dx)*0.6)return;
    if(dx>0&&pos>0)go(pos-1);
    else if(dx<0&&answers[order[pos]]!==null&&pos+1<order.length)go(pos+1);
  },{passive:true});
  const onKey=e=>{
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    if(/^[1-5]$/.test(e.key)){document.body.classList.add("kbd-mode");pick(UI[+e.key-1])}
    else if(e.key==="Backspace"&&pos>0&&!busy){e.preventDefault();go(pos-1)}
  };
  addEventListener("keydown",onKey);
  onLeave(()=>removeEventListener("keydown",onKey));
  paint();
}

/* ---------- Result ---------- */
let current=null;
const pctText=x=>x===null?L`sem %`:`${x}%`;
function renderResult(code,mode){
  const answers=E.decode(code);
  if(!answers){renderNotFound(L`Este link de resultado está incompleto ou é de uma versão antiga do teste.`);return}
  // A link someone else sent opens as an invite: the visitor is asked to take the test and compare.
  // Only the person who finished the test on this browser sees it as their own result.
  const own=store.get("last")===code;
  if(!own&&mode!=="ver"){renderInvite(code,(store.get("vs")||{}).code===code?(store.get("vs")||{}).name:"");return}
  const visitor=!own;
  const r=E.evaluate(answers);current=r;
  const top=r.top,p=top.p,opp=r.opposite,flat=r.directionless;
  const nameLines=p.n.split(" ").length>2?[p.n.split(" ").slice(0,-1).join(" "),p.n.split(" ").slice(-1)[0]]:[p.n];
  const userV=r.scores;
  const T=visitor
    ?{kicker:flat?L`Mais perto desta pessoa`:L`Par filosófico desta pessoa`,axes:L`Os 11 eixos desta pessoa`,also:L`Também pensam assim`,br:L`No Brasil, quem pensa assim`,opp:L`O oposto`,you:L`esta pessoa`}
    :{kicker:flat?L`Mais perto de você`:L`Seu par filosófico`,axes:L`Seus 11 eixos`,also:flat?L`Também perto de você`:L`Também pensam como você`,br:L`No Brasil, quem pensa como você`,opp:L`Seu oposto`,you:L`você`};
  const flatNote=L`Suas respostas ficaram no meio, sem puxar para um lado. Sem direção não dá para medir compatibilidade, então não mostramos percentuais nem oposto. Este é o pensador mais perto de você. Aprofundar o teste mostra para onde você pende.`;
  const strongest=AXES.map((a,i)=>({a,i,x:userV[i]})).filter(t=>Math.abs(t.x)>=.25).sort((s,t)=>Math.abs(t.x)-Math.abs(s.x)).slice(0,3);
  mount(`
  ${visitor?`<div class="visitor-bar"><div class="wrap"><span>${L`Este é o resultado de outra pessoa.`}</span><a class="btn accent sm" href="#/vs/${code}" >${L`Fazer o teste e comparar`} ${icon.arrow}</a></div></div>`:""}
  <section class="wrap res-hero">
    <div>
      <div class="res-kicker"><span class="eyebrow">${T.kicker}</span></div>
      ${flat?"":`<div class="res-pct" aria-hidden="true"><span id="pctNum">${reduceMotion?top.pct:0}</span>%</div>`}
      <h1 class="res-name">${flat?"":`<span class="sr">${L`${top.pct}% de compatibilidade com `}</span>`}${nameLines.map(l=>`<span class="line"><span>${esc(l)}</span></span>`).join("")}</h1>
      <div class="res-school">${esc(p.s)} · ${esc(lifeText(p))}</div>
      ${flat?"":`<div class="res-arch">${visitor?L`Arquétipo:`:L`Seu arquétipo:`} <b>${esc(archetype(userV).name)}</b></div>`}
      ${r.level?`<div class="lvl-line"><span class="lv-chip">${L`Nível ${esc(t(r.level.name))}`}</span><span>${L`${r.level.n} afirmações · precisão ${esc(LEVEL_INFO[r.level.id].precision.toLowerCase())}`}</span>${!visitor&&nextLevel(r.level.n)?`<a class="lvl-up" href="#/teste/aprofundar">${L`Aprofundar com mais ${nextLevel(r.level.n).n-r.level.n}`} ${icon.arrow}</a>`:""}</div>`:""}
      ${strongest.length?`<div class="traits" aria-label="${L`Traços mais fortes`}">${strongest.map((t,i)=>`<span class="trait" style="--i:${i}"><small>${esc(t.a.name)}</small>${esc(t.x<0?t.a.l:t.a.r)}</span>`).join("")}</div>`:""}
      ${flat?`<div class="note" role="note">${icon.info}<span>${flatNote}</span></div>`:r.note&&!visitor?`<div class="note" role="note">${icon.info}<span>${esc(r.note.message)}</span></div>`:""}
      <div class="res-actions">
        ${visitor?`<a class="btn accent" href="#/vs/${code}">${L`Fazer o teste e comparar`} ${icon.arrow}</a>`:`
        ${flat&&r.level&&nextLevel(r.level.n)?`<a class="btn accent" href="#/teste/aprofundar">${L`Aprofundar para desempatar`} ${icon.arrow}</a>`:""}
        <button class="btn ${flat&&r.level&&nextLevel(r.level.n)?"ghost":"accent"}" id="shareBtn" type="button">${icon.share} ${L`Compartilhar no story`}</button>
        <button class="btn ghost" id="challengeBtn" type="button">${icon.link} ${L`Desafiar um amigo`}</button>
        <button class="btn ghost" id="revealBtn" type="button">${L`Rever a revelação`}</button>
        <a class="btn ghost" href="#/teste" id="redoBtn">${L`Refazer`}</a>`}
      </div>
    </div>
    ${duo(p,{user:userV,title:L`Perfil de ${T.you} comparado ao de ${p.n}`})}
  </section>
  <section class="wrap" style="padding-bottom:24px">
    ${visitor?"":selfHTML(r)}
    ${visitor?"":rewardsHTML(r)}
    <h2 class="chapter"><span>1</span>${visitor?L`Quem é o par desta pessoa`:L`Quem é o seu par`}</h2>
    ${p.bio||!flat?`<div class="grid2">${aboutHTML(p)}${agreementHTML(r,top)}</div>`:""}

    <h2 class="chapter"><span>2</span>${L`Por que deu ${esc(p.n)}`}</h2>
    <div class="grid2">
      <div class="panel">
        <h2>${T.axes}</h2>
        <p class="sub">${L`Cada raio é um eixo: o primeiro polo fica no centro e o segundo, na borda. Laranja: ${T.you}. Tracejado na mandala e traço nas barras: ${esc(p.n)}. A porcentagem compara o formato das duas mandalas.`}</p>
        <div class="panel-sigil">${sigil(userV,{compare:p.v,labels:true,cls:"sg-user",draw:true,tips:true,title:L`Perfil de ${T.you} nos 11 eixos comparado ao de ${p.n}`})}</div><p class="tip-hint">${L`<span class="on-hover">Passe o mouse</span><span class="on-touch">Toque</span> em cada eixo para ver o que ele mede e por que ficou ali.`}</p>
        <details class="ax-more"><summary>${L`Ver os 11 eixos em barras`}</summary>${AXES.map((a,i)=>axisRow(a,userV[i],p.v[i],T.you,p.n)).join("")}</details>
      </div>
      <div style="display:grid;gap:20px;align-content:start">
        <div class="panel">
          <h2>${T.also}</h2>
          <p class="sub">${L`Os próximos da lista, pela mesma conta.`}</p>
          <ul class="match-list">${r.ranking.slice(1,6).map(x=>`<li><a href="#/p/${x.p.id}">${portrait(x.p,{cls:"avatar"})}<span><span class="nm">${esc(x.p.n)}</span><span class="sc">${esc(x.p.s)}</span></span><span class="pc">${pctText(x.pct)}</span></a></li>`).join("")}</ul>
        </div>
        ${brazilHTML(r,T.br)}
      </div>
    </div>

    <h2 class="chapter"><span>3</span>${visitor?L`Onde essa pessoa está na história`:L`Onde você está na história`}</h2>
    ${timelineHTML(r)}
    <div class="grid2" style="margin-top:20px">
      ${opp?`<div class="panel">
        <h2>${T.opp}</h2>
        <p class="sub">${visitor?L`Quem mais discordaria.`:L`Quem mais discordaria de você.`}</p>
        <a class="opp" href="#/p/${opp.p.id}" style="text-decoration:none">${portrait(opp.p,{cls:"opp-pic"})}<span><span class="nm">${esc(opp.p.n)}</span><span class="sc muted" style="display:block;margin-top:6px">${esc(opp.p.s)} · ${pctText(opp.pct)}</span><span class="serif it" style="display:block;font-size:20px;margin-top:10px;color:var(--ink2)">“${esc(opp.p.q)}”</span></span></a>
      </div>`:""}
      <div class="panel">
        <h2>${L`Comece por aqui`}</h2>
        <p class="sub">${L`Três portas de entrada para ler ${esc(p.n)}.`}</p>
        ${readingHTML(p)}
      </div>
    </div>

    ${visitor?"":invitePanelHTML(r)}

    <div class="finale">
      ${portrait(p,{cls:"finale-pic"})}
      <blockquote class="finale-quote">“${esc(p.q)}”</blockquote>
      <p class="finale-by">${esc(p.n)}${visitor?"":`, ${flat?L`o pensador mais perto de você`:L`seu par com ${top.pct}%`}`}</p>
      <p class="finale-lede">${visitor?L`Quer saber quem pensa como você? O teste rápido leva uns 6 minutos.`:L`Agora descubra qual dos seus amigos pensa como você. Mande o desafio e vejam, eixo por eixo, onde concordam e onde vão discutir.`}</p>
      <div class="cta-row" style="justify-content:center">
        ${visitor?`<a class="btn accent" href="#/vs/${code}">${L`Fazer o teste e comparar`} ${icon.arrow}</a>`:`
        <button class="btn accent" id="challengeBtn2" type="button">${icon.link} ${L`Desafiar um amigo`}</button>
        ${r.level&&nextLevel(r.level.n)?`<a class="btn ghost" href="#/teste/aprofundar">${L`Aprofundar: nível ${esc(t(nextLevel(r.level.n).name))}`}</a>`:""}
        <button class="btn ghost" id="shareBtn2" type="button">${icon.share} ${L`Compartilhar no story`}</button>`}
        <a class="btn ghost" href="#/pensadores">${L`Ver os ${PH.length+BR.length} pensadores`}</a>
      </div>
    </div>

    ${auditPanel(r)}
  </section>`,flat?L`Mais perto: ${p.n}`:`${top.pct}% ${p.n}`);
  // Count-up for the percentage.
  if(!flat&&!reduceMotion){
    const el=document.getElementById("pctNum"),t0=performance.now();
    let live=true;
    const step=now=>{if(!live)return;const t=Math.min(1,(now-t0)/1300),e=1-Math.pow(1-t,3);el.textContent=Math.round(top.pct*e);if(t<1)requestAnimationFrame(step)};
    requestAnimationFrame(step);
    // rAF pauses in background tabs; make sure the final number always lands.
    const done=setTimeout(()=>{el.textContent=top.pct},1500);
    onLeave(()=>{live=false;clearTimeout(done)});
  }
  if(!visitor){
    ["shareBtn","shareBtn2"].forEach(id=>{const b=document.getElementById(id);if(b)b.addEventListener("click",()=>shareFlow(r))});
    warmShare(r);
    stickyShare();
    ["challengeBtn","challengeBtn2"].forEach(id=>{const b=document.getElementById(id);if(b)b.addEventListener("click",()=>challenge(r))});
    document.getElementById("redoBtn").addEventListener("click",()=>store.del("progress"));
    wireInvite(r);
    const rb=document.getElementById("revealBtn");if(rb)rb.addEventListener("click",()=>openReveal(r));
    const wb=document.getElementById("wallBtn");if(wb)wb.addEventListener("click",async()=>{if(wb.disabled)return;const keep=wb.innerHTML;wb.disabled=true;wb.innerHTML=`<span class="spin" aria-hidden="true"></span> ${L`Gerando imagem…`}`;try{await wallpaper(r)}finally{wb.disabled=false;wb.innerHTML=keep}});
    // Right after the quiz, the result opens with the reveal; afterwards it can be replayed from the button.
    if(store.get("reveal")===code){store.del("reveal");openReveal(r)}
  }
  wireTips(app,{user:userV,r,p});
  wireTimeline();
  wireAudit(r);
}

/* ---------- The reveal ---------- */
// A sequence of full-screen cards, like stories, shown once right after the quiz: the shape of the
// thought, the strongest conviction, an inner contradiction, how rare the profile is, the place and time
// that would feel like home, the opposite, and finally the match. Every card comes from the person's own answers.
function revealFacts(r){
  const qs=r.perQuestion.filter(q=>q.contribution!==0);
  const sr=selfReading(r);
  const axisOrder=sr.strong.map(s=>s.i);
  // Strongest conviction: a "totalmente" answer on the strongest axis, pulling the way the person leans.
  const conv=qs.filter(q=>Math.abs(q.value)===2).sort((a,b)=>{
    const ra=axisOrder.indexOf(a.axis),rb=axisOrder.indexOf(b.axis);
    const sa=Math.sign(a.contribution)===Math.sign(r.scores[a.axis])?0:1,sb=Math.sign(b.contribution)===Math.sign(r.scores[b.axis])?0:1;
    return sa-sb||(ra<0?9:ra)-(rb<0?9:rb)||a.i-b.i;
  })[0]||null;
  // Inner contradiction: two firm answers on the same axis that pull to opposite poles.
  let contra=null;
  AXES.forEach((_,ax)=>{
    const on=qs.filter(q=>q.axis===ax&&Math.abs(q.value)>=1);
    for(const a of on)for(const b of on){
      if(a.i>=b.i||Math.sign(a.contribution)===Math.sign(b.contribution))continue;
      const w=Math.abs(a.contribution)+Math.abs(b.contribution);
      if(!contra||w>contra.w)contra={a,b,ax,w};
    }
  });
  return {sr,conv,contra};
}
function openReveal(r){
  track("/evento/revelacao");
  const p=r.top.p,opp=r.opposite&&r.opposite.p,flat=r.directionless,{sr,conv,contra}=revealFacts(r);
  const ans=q=>esc(t(SCALE[q.answer].label));
  const said=q=>`<blockquote class="rv-q">“${esc(QS[q.i][0])}”<cite>${ans(q)}</cite></blockquote>`;
  const slides=[];
  // The order tells a story: who you are, what moves you, your tension, your company in history,
  // a clue about the match, the opposite, and then the match itself.
  slides.push(`<span class="rv-k">${L`${r.answers.length} respostas depois`}</span><h2 class="rv-h">${L`Vamos ver como <em>você</em> pensa.`}</h2><p class="rv-p rv-hint"><span class="on-touch">${L`Toque para continuar`}</span><span class="on-hover">${L`Clique ou use as setas para continuar`}</span></p>`);
  const arch=archetype(r.scores);
  slides.push(`<span class="rv-k">${L`Seu arquétipo`}</span><div class="rv-sigil">${sigil(r.scores,{cls:"sg-user",labels:true,draw:true,decorative:true})}</div><h2 class="rv-h rv-arch">${esc(arch.name)}</h2>${sr.strong.length?`<p class="rv-traits">${sr.strong.map(s=>esc(s.x<0?s.a.l:s.a.r)).join(" · ")}</p>`:`<p class="rv-p">${L`Suas respostas ficaram perto do centro em todos os eixos.`}</p>`}<p class="rv-p rv-small">${L`Um dos 462 arquétipos possíveis.`}</p>`);
  if(conv)slides.push(`<span class="rv-k">${L`O que mais move você`}</span>${said(conv)}<p class="rv-p">${esc(POLE_TEXT[conv.axis][conv.contribution<0?0:1])}</p>`);
  if(levelId(r)>=2)slides.push(contra
    ?`<span class="rv-k">${L`Sua contradição`}</span>${said(contra.a)}${said(contra.b)}<p class="rv-p">${L`Essas duas respostas puxam o eixo <b>${esc(AXES[contra.ax].name)}</b> para lados opostos. Todo pensamento vivo tem uma tensão assim.`}</p>`
    :`<span class="rv-k">${L`Sua coerência`}</span><h2 class="rv-h">${L`Nenhuma contradição.`}</h2><p class="rv-p">${L`Em nenhum dos 11 eixos suas respostas firmes puxaram para lados opostos. Isso é raro.`}</p>`);
  if(sr.strong.length){
    const rare=sr.kin.length<=Math.round(PH.length*.08);
    slides.push(`<span class="rv-k">${rare?L`Combinação rara`:L`Sua companhia na história`}</span><div class="rv-big">${sr.kin.length}<small>/${PH.length}</small></div><p class="rv-p">${sr.kin.length?L`pensadores da história reúnem os seus ${sr.strong.length} traços.`:L`Nenhum pensador da história reúne os seus ${sr.strong.length} traços.`}</p>${sr.kin.length?`<div class="rv-faces">${sr.kin.slice(0,5).map(x=>portrait(x,{cls:"rv-av"})).join("")}</div><p class="rv-p rv-small">${sr.kin.slice(0,3).map(x=>esc(x.n)).join(", ")}${sr.kin.length>3?L` e mais ${sr.kin.length-3}`:""}</p>`:""}`);
  }
  if(p.born!==undefined&&p.place)slides.push(`<span class="rv-k">${L`Uma pista sobre o seu par`}</span><h2 class="rv-h">${esc(p.place)}</h2><p class="rv-p">${L`por volta de ${yearText(p.born+35)}. Foi lá que viveu quem pensa mais parecido com você.`}</p>`);
  if(opp)slides.push(`<span class="rv-k">${L`Antes, o seu oposto`}</span>${portrait(opp,{cls:"rv-pic sm"})}<h2 class="rv-h">${esc(opp.n)}</h2><p class="rv-p rv-quote">“${esc(opp.q)}”</p><p class="rv-p">${L`Vocês discordariam em quase tudo.`}</p>`);
  slides.push(`<span class="rv-k">${flat?L`Quem fica mais perto de você`:L`Seu par filosófico`}</span>${portrait(p,{cls:"rv-pic",eager:true})}${flat?"":`<div class="rv-big rv-pct" data-to="${r.top.pct}">0%</div>`}<h2 class="rv-h">${esc(p.n)}</h2><p class="rv-traits">${esc(p.s)} · ${esc(lifeText(p))}</p><p class="rv-p rv-quote">“${esc(p.q)}”</p>`);
  const nx=r.level&&nextLevel(r.level.n);
  if(nx){const u=LEVEL_INFO[nx.id].unlock.slice(1);slides.push(`<span class="rv-k">${L`Ainda há mais`}</span><h2 class="rv-h">${L`No nível ${esc(t(nx.name))}`}</h2><ul class="rv-unlock">${u.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><p class="rv-p">${L`Mais ${nx.n-r.level.n} afirmações. Suas respostas de agora ficam guardadas.`}</p><div class="rv-actions"><a class="btn ghost" href="#/teste/aprofundar" data-a="deeper">${L`Aprofundar agora`} ${icon.arrow}</a></div>`)}
  slides.push(`<span class="rv-k">${L`Agora é com você`}</span><h2 class="rv-h">${L`Quem dos seus amigos pensa como você?`}</h2><div class="rv-actions"><button type="button" class="btn accent" data-a="share">${icon.share} ${L`Compartilhar no story`}</button><button type="button" class="btn ghost" data-a="challenge">${icon.link} ${L`Desafiar um amigo`}</button><button type="button" class="btn ghost" data-a="close">${L`Ver resultado completo`}</button></div>`);
  openRevealSlides(r,slides);
}
// Shared player for reveal cards: tap, swipe or arrows; skip button when asked.
function openRevealSlides(r,slides,skip=false){
  const prev=document.activeElement,d=document.createElement("div");
  d.className="reveal";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label",L`Seu resultado, passo a passo`);
  d.innerHTML=`<div class="rv-bars">${slides.map(()=>"<i><b></b></i>").join("")}</div><button type="button" class="rv-x" aria-label="${L`Fechar`}">×</button>${skip?`<button type="button" class="rv-skip" data-a="close">Pular</button>`:""}<div class="rv-stage" aria-live="polite"></div><button type="button" class="rv-nav rv-prev" aria-label="${L`Anterior`}"></button><button type="button" class="rv-nav rv-next" aria-label="${L`Próximo`}"></button>`;
  document.body.appendChild(d);document.body.classList.add("rv-open");
  const stage=d.querySelector(".rv-stage"),bars=[...d.querySelectorAll(".rv-bars i")];
  let i=-1,raf=0;
  const close=()=>{cancelAnimationFrame(raf);document.removeEventListener("keydown",key);document.body.classList.remove("rv-open");d.remove();if(prev&&prev.focus)prev.focus()};
  const show=n=>{
    if(n<0)return;if(n>=slides.length){close();return}
    i=n;stage.innerHTML=`<div class="rv-slide">${slides[i]}</div>`;
    bars.forEach((b,k)=>b.className=k<i?"done":k===i?"now":"");
    if(i===slides.length-1)track("/evento/revelacao-fim");
    // The match's percentage counts up when its card arrives.
    const pc=stage.querySelector(".rv-pct");cancelAnimationFrame(raf);
    if(pc&&TOUCH&&navigator.vibrate)try{navigator.vibrate([18,60,28])}catch(e){}
    if(pc){const to=+pc.dataset.to,t0=performance.now();const step=now=>{const x=reduceMotion?1:Math.min(1,(now-t0)/1400);pc.textContent=Math.round(to*(1-Math.pow(1-x,3)))+"%";if(x<1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step)}
  };
  const key=e=>{if(e.key==="Tab"){const f=[...d.querySelectorAll("button,a[href]")].filter(x=>x.offsetParent!==null);if(!f.length)return;const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}else if(!d.contains(document.activeElement)){e.preventDefault();first.focus()}return}
    if(e.key==="Escape")close();else if(e.key==="ArrowRight"||e.key===" "||e.key==="Enter"){if(!e.target.closest("button")||e.target.classList.contains("rv-nav")){e.preventDefault();show(i+1)}}else if(e.key==="ArrowLeft")show(i-1)};
  document.addEventListener("keydown",key);
  d.addEventListener("click",e=>{
    const a=e.target.closest("[data-a]");
    if(a){close();if(a.dataset.a==="deeper")return;if(a.dataset.a==="share2"){track("/evento/v2-revelacao-fim");shareV2(r);return}if(a.dataset.a==="close"&&skip)track(i<slides.length-1?"/evento/v2-revelacao-pulou":"/evento/v2-revelacao-fim");if(a.dataset.a==="share")shareFlow(r);else if(a.dataset.a==="challenge")challenge(r);return}
    if(e.target.closest(".rv-x")){close();return}
    if(e.target.closest(".rv-prev")){show(i-1);return}
    if(e.target.closest("a"))return;
    show(i+1);
  });
  // Swipe left or right, like stories.
  let sx=null;
  d.addEventListener("touchstart",e=>{sx=e.touches[0].clientX},{passive:true});
  d.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>60){e.preventDefault();show(dx<0?i+1:i-1)}});
  show(0);
  d.querySelector(".rv-next").focus({preventScroll:true});
}

/* ---------- The person's own reading ---------- */
// What each pole says about someone, in plain words: [left pole, right pole] for every axis, in AXES order.
const POLE_TEXT=[
  [L`Você confia mais no raciocínio do que no que os sentidos mostram.`,L`Você acredita no que pode ser visto, testado e vivido.`],
  [L`Você sente que muito do que acontece já estava escrito, pela natureza ou pelas circunstâncias.`,L`Você se vê como dono das suas escolhas, e responsável por elas.`],
  [L`Para você, a vida tem um sentido que existe antes de nós, e cabe a cada um descobri-lo.`,L`Para você, o sentido da vida não vem pronto: cada pessoa inventa o seu.`],
  [L`Você julga um ato pelo princípio por trás dele, não só pelo resultado.`,L`Você julga um ato pelos efeitos que ele produz no mundo.`],
  [L`Você defende o espaço de cada pessoa acima das exigências do grupo.`,L`Você acredita que ninguém se realiza sozinho: o grupo vem antes.`],
  [L`Para você, uma vida boa tem alegria, conforto e prazer, sem culpa.`,L`Para você, a vida boa é a de quem se torna uma pessoa melhor, mesmo quando custa.`],
  [L`Você acredita que tudo, até a mente, nasce do mundo físico.`,L`Você acredita que existe algo além da matéria: alma, mente ou sagrado.`],
  [L`Você acredita que existem verdades firmes, e que dá para alcançá-las.`,L`Você desconfia das certezas e prefere manter as perguntas abertas.`],
  [L`Você valoriza o que resistiu ao tempo e muda com cuidado.`,L`Você acha que o mundo precisa ser transformado, não só preservado.`],
  [L`Diante da dor, você busca paz em aceitar o que não depende de você.`,L`Diante da injustiça, você prefere lutar a se conformar.`],
  [L`Você acredita que a ordem precisa de hierarquia e de alguém que decida.`,L`Você desconfia de quem manda e quer cada pessoa decidindo por si.`],
];
// Archetype: the strongest pole names the person and the second one qualifies it ("Empirista da Resistência").
// Every noun is the same for any gender, so the name fits everyone without asking.
const ARCH_NOUN=[
  [L`Racionalista`,L`Empirista`],[L`Fatalista`,L`Voluntarista`],[L`Essencialista`,L`Existencialista`],[L`Deontologista`,L`Pragmatista`],
  [L`Individualista`,L`Comunitarista`],[L`Hedonista`,L`Asceta`],[L`Materialista`,L`Espiritualista`],[L`Realista`,L`Relativista`],
  [L`Tradicionalista`,L`Reformista`],[L`Quietista`,L`Ativista`],[L`Legalista`,L`Autonomista`],
];
const ARCH_OF=[
  [L`da Razão`,L`da Experiência`],[L`do Destino`,L`da Liberdade`],[L`do Sentido`,L`da Criação`],[L`do Dever`,L`das Consequências`],
  [L`do Indivíduo`,L`da Comunidade`],[L`do Prazer`,L`da Virtude`],[L`da Matéria`,L`do Espírito`],[L`da Certeza`,L`da Dúvida`],
  [L`da Tradição`,L`da Ruptura`],[L`da Aceitação`,L`da Resistência`],[L`da Ordem`,L`da Autonomia`],
];
// The two strongest poles of a profile, as [axis, side] pairs (side 0 = left pole).
const topPoles=v=>v.map((x,i)=>({i,x})).filter(s=>Math.abs(s.x)>=.13).sort((a,b)=>Math.abs(b.x)-Math.abs(a.x)||a.i-b.i).slice(0,2).map(s=>[s.i,s.x<0?0:1]);
function archetype(v){
  const t2=topPoles(v);
  if(t2.length<2)return {name:L`Equilibrista`,key:"",poles:t2};
  const [[a,sa],[b,sb]]=t2;
  return {name:L`${ARCH_NOUN[a][sa]} ${ARCH_OF[b][sb]}`,key:[`${a}${sa}`,`${b}${sb}`].sort().join("-"),poles:t2};
}
// Thinkers who share the archetype's two poles, in either order.
const archKin=arch=>arch.key?PH.filter(p=>archetype(p.v).key===arch.key):[];
// The traits that define the person, how many thinkers share all of them, and the axis they are still torn on.
function selfReading(r){
  const v=r.scores;
  const strong=AXES.map((a,i)=>({a,i,x:v[i]})).filter(s=>Math.abs(s.x)>=.25).sort((s,u)=>Math.abs(u.x)-Math.abs(s.x)).slice(0,3);
  const kin=strong.length?PH.filter(p=>strong.every(s=>Math.sign(p.v[s.i])===Math.sign(s.x)&&Math.abs(p.v[s.i])>=.2)):[];
  const torn=AXES.map((a,i)=>({a,i,x:v[i]})).sort((s,u)=>Math.abs(s.x)-Math.abs(u.x))[0];
  return {strong,kin,torn};
}
function selfHTML(r){
  const {strong,kin,torn}=selfReading(r);
  if(!strong.length)return "";
  const rare=kin.length<=Math.round(PH.length*.08);
  const names=kin.slice(0,3).map(p=>`<a href="#/p/${p.id}">${esc(p.n)}</a>`).join(", ");
  return `<div class="panel self">
    <span class="eyebrow">${L`Seu arquétipo`}</span>
    <h2 class="self-title">${esc(archetype(r.scores).name)}</h2>
    <p class="self-traits">${strong.map(s=>`<span>${esc(s.x<0?s.a.l:s.a.r)}</span>`).join(`<i aria-hidden="true">·</i>`)} · ${L`um dos 462 arquétipos possíveis`}</p>
    <ul class="self-list">${strong.map(s=>`<li><b>${esc(cap(s.a.name))}</b><span>${esc(POLE_TEXT[s.i][s.x<0?0:1])}</span></li>`).join("")}</ul>
    <div class="self-facts">
      <p class="self-rare${rare?" on":""}">${rare?`<b>${L`Combinação rara.`}</b> `:""}${kin.length?(rare?L`Só ${kin.length} de ${PH.length} pensadores reúnem esses ${strong.length} traços:`:L`${kin.length} de ${PH.length} pensadores reúnem esses ${strong.length} traços:`)+` ${names}${kin.length>3?L` e mais ${kin.length-3}`:""}.`:L`Nenhum dos ${PH.length} pensadores reúne esses ${strong.length} traços. Seu jeito de pensar não tem precedente no catálogo.`}</p>
      <p>${L`Onde você ainda está em aberto: <b>${esc(torn.a.name)}</b>, entre ${esc(torn.a.l)} e ${esc(torn.a.r)}.`}</p>
    </div>
  </div>`;
}

/* ---------- Rewards by level ---------- */
// Deeper levels unlock more about the person: the inner contradiction and a letter from the match at
// Completo, the manifesto on all 11 axes and a phone wallpaper of the mandala at Profundo.
const levelId=r=>r.level?r.level.id:1;
function lockedHTML(r,need,title,desc){
  const lv=levelBy(need),missing=lv.n-r.answers.length;
  return `<div class="rw rw-lock"><span class="rw-ic" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span><h3>${esc(title)}</h3><p>${esc(desc)}</p>
    <a class="btn ghost sm" href="#/teste/aprofundar">${L`Liberar no nível ${esc(t(lv.name))} · mais ${missing}`} ${icon.arrow}</a></div>`;
}
function letterHTML(r){
  const p=r.top.p,rows=r.top.perAxis.slice().sort((a,b)=>a.diff-b.diff);
  const near=rows.slice(0,2).map(x=>AXES[x.axis].name),far=AXES[rows[rows.length-1].axis].name;
  const idea=(p.ideas&&p.ideas[0]||"").replace(/[.;]\s*$/,"");
  return `<div class="letter">
    <p class="lt-to">${L`Para você, de ${esc(p.n)}`}</p>
    <p>${L`Li as suas ${r.answers.length} respostas e reconheci nelas muito do que pensei.`} ${L`Concordamos sobretudo em ${esc(near[0])} e ${esc(near[1])}.`}</p>
    ${idea?`<p>${L`Eu diria assim: ${esc(idea.charAt(0).toLowerCase()+idea.slice(1))}.`}</p>`:""}
    <p>${L`Mas em ${esc(far)} você segue outro caminho, e eu gostaria de discutir isso com você.`} ${L`Se quiser continuar a conversa, comece por <i>${esc(p.b)}</i>.`}</p>
    <p class="lt-q">“${esc(p.q)}”</p>
    <p class="lt-sign">${L`Com estima,`}<br><b>${esc(p.n)}</b></p>
  </div>`;
}
function manifestoHTML(r){
  return `<ol class="manifesto">${AXES.map((a,i)=>{const x=r.scores[i];return `<li><b>${esc(cap(a.name))}</b><span>${Math.abs(x)<.13?L`Você ainda está entre ${esc(a.l)} e ${esc(a.r)}, e isso também é uma posição.`:esc(POLE_TEXT[i][x<0?0:1])}</span></li>`}).join("")}</ol>`;
}
function rewardsHTML(r){
  if(r.directionless)return "";
  const lv=levelId(r),{contra}=revealFacts(r),ans=q=>esc(t(SCALE[q.answer].label));
  const contraHTML=contra?`<blockquote class="rw-q">“${esc(QS[contra.a.i][0])}”<cite>${ans(contra.a)}</cite></blockquote><blockquote class="rw-q">“${esc(QS[contra.b.i][0])}”<cite>${ans(contra.b)}</cite></blockquote><p>${L`Essas duas respostas puxam o eixo <b>${esc(AXES[contra.ax].name)}</b> para lados opostos. Todo pensamento vivo tem uma tensão assim.`}</p>`
    :`<p>${L`Em nenhum dos 11 eixos suas respostas firmes puxaram para lados opostos. Isso é raro.`}</p>`;
  return `<div class="rewards">
    <h2 class="chapter rw-head">${L`Suas recompensas`}<small>${L`Nível ${esc(t(r.level?r.level.name:E.LEVELS[0].name))}`}</small></h2>
    <div class="rw-grid">
      ${lv>=2?`<div class="rw"><span class="rw-k">${L`Sua contradição`}</span>${contraHTML}</div>`:lockedHTML(r,2,L`Sua contradição`,L`As duas respostas suas que mais puxam em sentidos opostos.`)}
      ${lv>=2?`<div class="rw rw-letter"><span class="rw-k">${L`Uma carta para você`}</span>${letterHTML(r)}</div>`:lockedHTML(r,2,L`Uma carta para você`,L`${r.top.p.n} escreve para você sobre o que vocês têm em comum e onde discordam.`)}
      ${lv>=3?`<div class="rw rw-wide"><span class="rw-k">${L`Seu manifesto`}</span>${manifestoHTML(r)}</div>`:lockedHTML(r,3,L`Seu manifesto`,L`O que você pensa, em uma frase, em cada um dos 11 eixos.`)}
      ${lv>=3?`<div class="rw"><span class="rw-k">${L`Papel de parede`}</span><p>${L`Sua mandala e seu arquétipo, no tamanho da tela do celular.`}</p><button type="button" class="btn accent sm" id="wallBtn">${L`Baixar papel de parede`}</button></div>`:lockedHTML(r,3,L`Papel de parede`,L`Sua mandala e seu arquétipo, no tamanho da tela do celular.`)}
    </div>
  </div>`;
}
// Phone wallpaper (1170 × 2532): the top stays free for the clock; the mandala fills the middle.
async function wallpaper(r){
  track("/evento/papel-de-parede");
  await document.fonts.ready;
  const W=1170,H=2532,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d"),ink="#F1EADC",muted="#9C9283",accent="#F06A43",line="rgba(241,234,220,.14)";
  x.fillStyle="#0F0E0C";x.fillRect(0,0,W,H);
  const g=x.createRadialGradient(W/2,1330,80,W/2,1330,900);g.addColorStop(0,"rgba(240,106,67,.26)");g.addColorStop(1,"rgba(240,106,67,0)");x.fillStyle=g;x.fillRect(0,0,W,H);
  const cx=W/2,cy=1330,S=3.4;
  [.33,.66,1].forEach(f=>{x.beginPath();x.arc(cx,cy,R*(.16+.84*f)*S,0,Math.PI*2);x.strokeStyle=line;x.lineWidth=2;x.stroke()});
  AXES.forEach((a,i)=>{
    x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(angle(i))*R*S,cy+Math.sin(angle(i))*R*S);x.strokeStyle=line;x.lineWidth=2;x.stroke();
    const lx=cx+Math.cos(angle(i))*(R*S+46),ly=cy+Math.sin(angle(i))*(R*S+46)+10;
    x.fillStyle=muted;x.font="600 24px 'Inter Tight'";x.textAlign=Math.abs(lx-cx)<20?"center":lx>cx?"left":"right";x.fillText(a.name.toUpperCase(),lx,ly);
  });
  x.beginPath();pts(r.scores).forEach(([a,b],i)=>i?x.lineTo(cx+a*S,cy+b*S):x.moveTo(cx+a*S,cy+b*S));x.closePath();
  x.fillStyle="rgba(240,106,67,.22)";x.fill();x.strokeStyle=accent;x.lineWidth=7;x.lineJoin="round";x.stroke();
  pts(r.scores).forEach(([a,b])=>{x.beginPath();x.arc(cx+a*S,cy+b*S,9,0,Math.PI*2);x.fillStyle=accent;x.fill()});
  x.textAlign="center";
  x.fillStyle=accent;x.font="italic 400 86px 'Instrument Serif'";const an=archetype(r.scores).name;if(x.measureText(an).width>1050)x.font="italic 400 68px 'Instrument Serif'";x.fillText(an,W/2,1990);
  const sr=selfReading(r);
  x.fillStyle=ink;x.font="600 30px 'Inter Tight'";x.fillText(spaced(sr.strong.map(s=>(s.x<0?s.a.l:s.a.r).toUpperCase()).join("  ·  ")),W/2,2070);
  x.fillStyle=muted;x.font="400 40px 'Instrument Serif'";x.fillText(r.directionless?r.top.p.n:`${r.top.p.n} · ${r.top.pct}%`,W/2,2150);
  x.font="600 28px 'Inter Tight'";const host="filosofometro",tld=`.com.br${I.prefix}`,hw=x.measureText(host).width,tw=x.measureText(tld).width;
  x.textAlign="left";x.fillStyle=muted;x.fillText(host,W/2-(hw+tw)/2,2330);x.fillStyle=accent;x.fillText(tld,W/2-(hw+tw)/2+hw,2330);
  const blob=await new Promise(res=>c.toBlob(b=>res(b),"image/jpeg",.92));
  if(!blob){toast(L`Não foi possível gerar a imagem`);return}
  const file=new File([blob],"filosofometro-papel-de-parede.jpg",{type:"image/jpeg"});
  storyModal(c,blob,file,challengeText(r),inviteURL(r));
}

/* ---------- Portraits ---------- */
// Portraits are Wikimedia Commons images linked from the catalog; a monogram shows if one fails to load.
function portrait(p,{cls="",eager=false}={}){
  const initials=p.n.split(" ").filter(w=>/^[A-ZÀ-Ý]/.test(w)).slice(0,2).map(w=>w[0]).join("");
  // Without a freely licensed photo, the portrait is drawn from the thought itself: the thinker's own sigil behind the initials.
  const fallback=`<span class="mono-fallback" aria-hidden="true">${sigil(p.v,{cls:"sg-solo",decorative:true})}<b>${esc(initials)}</b></span>`;
  if(!p.img)return `<figure class="portrait noimg ${cls}" role="img" aria-label="${L`${esc(p.n)}: retrato desenhado pelo perfil nos 11 eixos (sem foto de licença livre)`}">${fallback}</figure>`;
  return `<figure class="portrait ${cls}"><img src="${esc(p.img)}" alt="${L`Retrato de ${esc(p.n)}`}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg')">${fallback}</figure>`;
}

/* ---------- Compare with a friend ---------- */
// Names are optional, typed by the person, and travel only inside the link they choose to share.
const cleanName=s=>{try{s=decodeURIComponent(s||"")}catch(e){s=""}return s.replace(/[^\p{L}\p{N} .'-]/gu,"").trim().slice(0,24)};
const encName=s=>encodeURIComponent(cleanName(s));
// Accepts any Filosofômetro link (result, invite or comparison) or a bare code, and returns the answers.
function answersFromLink(t){
  const m=String(t||"").trim().match(/(?:#\/(?:r|vs|verificar)\/|\/s\/|^)([0-4]{44,132})(?:$|[/?#\s])/);
  return m?E.decode(m[1]):null;
}
// The invite link: opens as "Name te desafiou" for whoever receives it, never as a plain result.
// On the published site, shared links go through /s/ and /c/ so chat apps show a picture of the result
// (api/share.js). Locally there is no server function, so the plain hash link is used.
const PREVIEW=location.protocol==="https:"&&!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const inviteURL=r=>{const nm=encName(store.get("name")||""),tail=`${E.encode(r.answers)}${nm?`/${nm}`:""}`;return PREVIEW?`${location.origin}${I.prefix}/s/${tail}`:`${location.href.split("#")[0]}#/vs/${tail}`};
const compareURL=(a,b,nA,nB)=>{const tail=`${a}/${b}${nA||nB?`/${encName(nA)}/${encName(nB)}`:""}`;return PREVIEW?`${location.origin}${I.prefix}/c/${tail}`:`${location.href.split("#")[0]}#/comparar/${tail}`};
const challengeText=r=>r.directionless?L`Fiz o Filosofômetro. Qual filósofo pensa como você? Faz o teste e compara comigo:`:L`Sou ${archetype(r.scores).name} e meu par filosófico é ${r.top.p.n} (${r.top.pct}%). Faz o teste e vê quanto a gente pensa parecido:`;
// Native share sheet on phones; copy to clipboard elsewhere.
async function challenge(r){
  track("/evento/convite");
  const url=inviteURL(r),text=challengeText(r);
  if(navigator.share){try{await navigator.share({title:"Filosofômetro",text,url});return}catch(e){if(e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(`${text} ${url}`);toast(L`Convite copiado. Agora é só mandar!`)}catch(e){prompt(L`Copie o convite:`,url)}
}
function invitePanelHTML(r){
  return `<div class="panel compare-cta">
    <h2>${L`Compare com alguém`}</h2>
    <p class="sub">${L`Quem abrir o seu convite faz o teste e cai direto numa comparação com você: onde pensam igual, onde divergem e quanto são compatíveis.`}</p>
    <div class="cmp-form">
      <label class="sr" for="myName">${L`Seu nome (opcional)`}</label>
      <input class="search sm" id="myName" placeholder="${L`Como você quer aparecer no convite (opcional)`}" maxlength="24" autocomplete="given-name" value="${esc(cleanName(store.get("name")||""))}">
      <button class="btn accent sm" id="inviteBtn" type="button">${icon.link} ${L`Desafiar um amigo`}</button>
    </div>
    <div class="cmp-form">
      <label class="sr" for="theirLink">${L`Link de outra pessoa`}</label>
      <input class="search sm" id="theirLink" placeholder="${L`Já tem o link de alguém? Cole aqui`}" autocomplete="off" spellcheck="false">
      <button class="btn ghost sm" id="compareBtn" type="button">${L`Comparar`}</button>
    </div>
  </div>`;
}
function wireInvite(r){
  const mine=E.encode(r.answers);
  // The name is remembered on this browser so every share button uses it.
  const nameInput=document.getElementById("myName");
  nameInput.addEventListener("input",()=>store.set("name",cleanName(nameInput.value)));
  document.getElementById("inviteBtn").addEventListener("click",()=>{store.set("name",cleanName(nameInput.value));challenge(r)});
  const go=()=>{
    const theirs=answersFromLink(document.getElementById("theirLink").value);
    if(!theirs){toast(L`Não reconheci esse link`);return}
    location.hash=`#/comparar/${E.encode(theirs)}/${mine}`;
  };
  document.getElementById("compareBtn").addEventListener("click",go);
  document.getElementById("theirLink").addEventListener("keydown",e=>{if(e.key==="Enter")go()});
}
// Landing for an invite link: show who invited and start the test; the comparison opens after it.
function renderInvite(code,rawName){
  const a=E.decode(code);
  if(!a){renderNotFound(L`Este convite está incompleto ou é de uma versão antiga do teste.`);return}
  const r=E.evaluate(a),p=r.top.p,named=cleanName(rawName),who=named||L`Alguém`;
  // Opening your own invite link (another device, or testing it) goes straight to your result.
  if(store.get("last")===code){location.replace(`#/r/${code}`);return}
  store.set("vs",{code,name:named});
  const mineCode=store.get("last");
  const hasMine=mineCode&&E.decode(mineCode)&&mineCode!==code;
  mount(`
  <section class="wrap res-hero">
    <div>
      <span class="eyebrow">${L`Desafio filosófico`}</span>
      <h1 class="res-name" style="font-size:clamp(44px,min(7vw,10vh),104px)"><span class="line"><span>${L`${esc(who)} te desafiou`}</span></span></h1>
      <p class="lede">${L`${esc(who)} fez o Filosofômetro e deu <b>${r.directionless?L`mais perto de ${esc(p.n)}`:`${r.top.pct}% ${esc(p.n)}`}</b>. Escolha um nível (de 6 a 18 minutos) e descubra quanto vocês pensam parecido, eixo por eixo.`}</p>
      ${r.directionless?"":`<p class="res-arch">${L`Arquétipo de ${esc(who)}:`} <b>${esc(archetype(r.scores).name)}</b>. ${L`Qual será o seu?`}</p>`}
      <div class="cta-row">
        <a class="btn accent" href="#/teste/1" data-fresh="1">${hasMine?L`Fazer o teste de novo e comparar`:L`Aceitar o desafio`} ${icon.arrow}</a>
        <a class="btn ghost" href="#/teste" data-fresh="1">${L`Escolher o nível`}</a>
        ${hasMine?`<a class="btn ghost" href="#/comparar/${code}/${mineCode}/${encName(named)}">${L`Comparar com meu resultado`}</a>`:""}
      </div>
      <p class="invite-peek"><a href="#/r/${code}/ver">${L`Ver o resultado completo de ${esc(named||L`quem te convidou`)}`}</a></p>
    </div>
    ${duo(p,{title:L`Perfil de ${p.n}`})}
  </section>`,named?L`${named} te desafiou`:L`Desafio filosófico`);
  wireTips(app,{p});
  app.querySelectorAll("[data-fresh]").forEach(x=>x.addEventListener("click",()=>store.del("progress")));
}
function renderCompare(codeA,codeB,rawA,rawB){
  const a=E.decode(codeA),b=E.decode(codeB);
  if(!a||!b){renderNotFound(L`Este link de comparação está incompleto.`);return}
  const c=E.comparePeople(a,b),ra=c.a,rb=c.b;
  const nameA=cleanName(rawA)||L`Seu amigo`,nameB=cleanName(rawB)||L`Você`;
  const rows=c.perAxis.map(x=>({ax:x.axis,diff:x.diff,A:ra.scores[x.axis],B:rb.scores[x.axis]}));
  const close=rows.slice().sort((x,y)=>x.diff-y.diff).slice(0,3),far=rows.slice().sort((x,y)=>y.diff-x.diff).slice(0,3);
  const topA=new Set(ra.ranking.slice(0,10).map(x=>x.p.id));
  const shared=rb.ranking.slice(0,10).filter(x=>topA.has(x.p.id)).slice(0,4).map(x=>x.p);
  // The thinker closest to the point halfway between both profiles: who could mediate the conversation.
  const mid=ra.scores.map((x,i)=>(x+rb.scores[i])/2);
  const mediator=PH.map(p=>({p,d:p.v.reduce((t,v,i)=>t+Math.abs(v-mid[i]),0)})).sort((x,y)=>x.d-y.d)[0].p;
  // Statements both answered where they landed furthest apart: the best openers for a conversation.
  const split=a.map((x,i)=>({i,x,y:b[i]})).filter(q=>q.x!=null&&q.y!=null).map(q=>({...q,gap:Math.abs(SCALE[q.x].value-SCALE[q.y].value)})).filter(q=>q.gap>=2).sort((p,q)=>q.gap-p.gap||p.i-q.i).slice(0,3);
  const same=a.map((x,i)=>({i,x,y:b[i]})).filter(q=>q.x!=null&&q.x===q.y&&q.x!==2).length;
  const answered=a.filter((x,i)=>x!=null&&b[i]!=null).length;
  const verdict=c.pct===null?L`Um dos perfis ficou sem direção, então não dá para medir compatibilidade.`:c.pct>=80?L`Almas filosóficas gêmeas.`:c.pct>=60?L`Bastante em comum, com boas brigas pela frente.`:c.pct>=40?L`Concordam em algumas coisas e discordam com vontade em outras.`:L`Pensam quase ao contrário. Rende uma ótima conversa.`;
  const card=(nm,r)=>`<a class="cmp-person" href="#/r/${E.encode(r.answers)}${store.get("last")===E.encode(r.answers)?"":"/ver"}">${portrait(r.top.p,{cls:"cmp-pic"})}<span class="cmp-who">${esc(nm)}</span>${r.directionless?"":`<span class="cmp-arch">${esc(archetype(r.scores).name)}</span>`}<span class="nm">${esc(r.top.p.n)}</span><span class="sc">${r.top.pct===null?L`perfil sem direção`:`${r.top.pct}% · ${esc(r.top.p.s)}`}</span></a>`;
  const item=(x,kind)=>{const ax=AXES[x.ax];return `<li><span class="ag-axis">${esc(cap(ax.name))}</span><span>${kind==="close"&&Math.sign(x.A)===Math.sign(x.B)&&Math.abs(x.A)>=.13?L`Os dois tendem a <b>${esc(x.A<0?ax.l:ax.r)}</b>.`:diffText(ax,nameA,x.A,nameB,x.B)}</span></li>`};
  mount(`
  <section class="wrap section" style="padding-top:clamp(24px,5vh,56px)">
    <span class="eyebrow">${L`Comparação`}</span>
    <h1 class="res-name" style="font-size:clamp(44px,min(8vw,11vh),120px)"><span class="line"><span>${c.pct===null?L`Sem direção`:L`${c.pct}% compatíveis`}</span></span></h1>
    <p class="lede" style="margin-top:6px">${esc(verdict)}</p>
    <div class="res-actions" style="margin-top:18px"><button class="btn accent" id="cmpStory" type="button">${icon.share} ${L`Compartilhar no story`}</button></div>
    <div class="cmp-grid">
      ${card(nameA,ra)}
      <div class="cmp-sigil">${sigil(rb.scores,{compare:ra.scores,labels:true,cls:"sg-user",draw:true,tips:true,title:L`${nameB} e ${nameA} nos 11 eixos`})}
        <div class="legend" aria-hidden="true"><span><i style="background:var(--accent)"></i>${esc(nameB)}</span><span><i class="dash"></i>${esc(nameA)}</span></div></div>
      ${card(nameB,rb)}
    </div>
    <div class="grid2" style="margin-top:24px">
      <div class="panel agree">
        <h2>${L`Onde vocês se encontram`}</h2>
        <p class="sub">${L`Os eixos com o formato de pensamento mais parecido entre vocês.`}</p>
        <ul class="ag-list">${close.map(x=>item(x,"close")).join("")}</ul>
        <h3 class="about-h ag-no">${L`Onde vocês mais se afastam`}</h3>
        <ul class="ag-list">${far.map(x=>item(x,"far")).join("")}</ul>
      </div>
      <div style="display:grid;gap:20px;align-content:start">
        <div class="panel mediator">
          <h2>${L`Quem fica no meio`}</h2>
          <p class="sub">${L`O pensador mais perto do ponto entre vocês dois. Um bom juiz para a próxima discussão.`}</p>
          <a class="opp" href="#/p/${mediator.id}" style="text-decoration:none">${portrait(mediator,{cls:"opp-pic"})}<span><span class="nm">${esc(mediator.n)}</span><span class="sc muted" style="display:block;margin-top:6px">${esc(mediator.s)}</span><span class="serif it" style="display:block;font-size:20px;margin-top:10px;color:var(--ink2)">“${esc(mediator.q)}”</span></span></a>
        </div>
        <div class="panel">
          <h2>${L`Pensadores em comum`}</h2>
          <p class="sub">${L`Aparecem entre os 10 mais parecidos com os dois.`}</p>
          ${shared.length?`<ul class="match-list">${shared.map(p=>`<li><a href="#/p/${p.id}">${portrait(p,{cls:"avatar"})}<span><span class="nm">${esc(p.n)}</span><span class="sc">${esc(p.s)}</span></span><span class="pc" aria-hidden="true">→</span></a></li>`).join("")}</ul>`:`<p class="muted" style="margin:0">${L`Nenhum em comum no top 10. Vocês vêm de tradições bem diferentes.`}</p>`}
        </div>
      </div>
    </div>

    <h2 class="chapter"><span>1</span>${L`Eixo por eixo`}</h2>
    <div class="panel cmp-axes">
      <p class="sub">${L`Bolinha laranja: ${esc(nameB)}. Traço: ${esc(nameA)}. Do eixo onde vocês mais se parecem ao que mais separa.`}</p>
      ${rows.slice().sort((x,y)=>x.diff-y.diff).map(x=>`<div class="cmp-ax"><span class="ag-axis">${esc(cap(AXES[x.ax].name))}</span>${axisRow(AXES[x.ax],x.B,x.A,nameB,nameA,{named:false})}</div>`).join("")}
    </div>

    <h2 class="chapter"><span>2</span>${L`Para conversar`}</h2>
    <div class="grid2">
      <div class="panel">
        <h2>${L`Onde vocês mais se dividiram`}</h2>
        <p class="sub">${answered?L`Das ${answered} afirmações que os dois responderam, deram a mesma resposta em ${same}.`:""} ${L`Estas foram as que mais separaram vocês.`}</p>
        ${split.length?`<ul class="split-list">${split.map(q=>`<li><p class="serif">“${esc(QS[q.i][0])}”</p><span><b>${esc(nameA)}:</b> ${esc(t(SCALE[q.x].label))}</span><span><b>${esc(nameB)}:</b> ${esc(t(SCALE[q.y].label))}</span></li>`).join("")}</ul>`:`<p class="muted" style="margin:0">${L`Nenhuma afirmação separou vocês por mais de um passo. Raro.`}</p>`}
      </div>
      <div class="panel">
        <h2>${L`Para ler`}</h2>
        <p class="sub">${L`Um livro para cada um entender o outro, e um para ler juntos.`}</p>
        <ol class="reads">${bookItem(ra.top.p,0,ra.top.p.b,L`Para entender ${esc(nameA)} · ${esc(ra.top.p.n)}`)}${rb.top.p.id!==ra.top.p.id?bookItem(rb.top.p,0,rb.top.p.b,L`Para entender ${esc(nameB)} · ${esc(rb.top.p.n)}`):""}${[ra.top.p.id,rb.top.p.id].includes(mediator.id)?"":bookItem(mediator,0,mediator.b,L`Para ler juntos · ${esc(mediator.n)}`)}</ol>
        ${affNote()}
      </div>
    </div>
    <div class="res-actions" style="justify-content:center;margin-top:28px">
      ${store.get("last")===codeB?`<a class="btn accent" href="#/r/${codeB}">${L`Ver meu resultado completo`} ${icon.arrow}</a>
      <button class="btn ghost" id="cmpChallenge" type="button">${icon.link} ${L`Desafiar outra pessoa`}</button>`:""}
      <button class="btn ${store.get("last")===codeB?"ghost":"accent"}" id="cmpCopy" type="button">${icon.link} ${L`Copiar esta comparação`}</button>
      ${store.get("last")===codeB?"":`<a class="btn ghost" href="#/teste" data-fresh="1">${L`Fazer o teste`}</a>`}
    </div>
    <p class="cmp-foot">${L`Mesma regra do resultado: distância média de ${num(c.distance,3)} nos 11 eixos.`} <a href="#/metodo">${L`Como calculamos`}</a></p>
  </section>`,c.pct===null?L`Comparação`:L`${c.pct}% compatíveis`);
  wireTips(app,{user:rb.scores,you:nameB,p:{n:nameA,v:ra.scores}});
  document.getElementById("cmpStory").addEventListener("click",async e=>{
    const b=e.currentTarget;if(b.disabled)return;const keep=b.innerHTML;b.disabled=true;b.innerHTML=`<span class="spin" aria-hidden="true"></span> ${L`Gerando imagem…`}`;
    try{await compareCard(c,nameA,nameB,close,far,verdict,compareURL(codeA,codeB,cleanName(rawA),cleanName(rawB)))}finally{b.disabled=false;b.innerHTML=keep}
  });
  document.getElementById("cmpCopy").addEventListener("click",async()=>{
    const url=compareURL(codeA,codeB,cleanName(rawA),cleanName(rawB));
    try{await navigator.clipboard.writeText(url);toast(L`Link copiado`)}catch(e){prompt(L`Copie o link:`,url)}
  });
  const cc=document.getElementById("cmpChallenge");if(cc)cc.addEventListener("click",()=>challenge(rb));
  app.querySelectorAll("[data-fresh]").forEach(x=>x.addEventListener("click",()=>store.del("progress")));
  store.del("vs");
}

/* ---------- Brazil ---------- */
// Brazilian thinkers ranked against the user with the engine's own rule (audited as "brazil").
function brazilHTML(r,title=L`No Brasil, quem pensa como você`){
  if(!r.brazil.length)return "";
  const [first,...rest]=r.brazil,b=first.p;
  return `<div class="panel brazil">
    <span class="br-flag" aria-hidden="true"></span>
    <h2>${esc(title)}</h2>
    <p class="sub">${L`Entre ${r.brazil.length} pensadores brasileiros, pela mesma conta do seu resultado.`}</p>
    <a class="br-main" href="#/p/${b.id}">${portrait(b,{cls:"br-pic"})}<span><span class="nm">${esc(b.n)}</span><span class="sc">${esc(b.s)}${first.pct!==null?L` · ${first.pct}% com você`:""}</span>${b.bio?`<span class="br-bio">${esc(b.bio)}</span>`:""}</span></a>
    <ul class="match-list">${rest.slice(0,3).map(x=>`<li><a href="#/p/${x.p.id}">${portrait(x.p,{cls:"avatar"})}<span><span class="nm">${esc(x.p.n)}</span><span class="sc">${esc(x.p.s)}</span></span><span class="pc">${pctText(x.pct)}</span></a></li>`).join("")}</ul>
  </div>`;
}
// For a thinker's page: the closest Brazilians to an international thinker, or the
// international kin of a Brazilian one.
// Three books per thinker: the starter book from the catalog plus two from support.js, each an Amazon search.
// Covers come from Open Library (covers.js); a missing or broken one falls back to the colored spine.
function readingHTML(p){
  const books=[p.b,...(SUP.READING[p.id]||[])];
  return `<ol class="reads">${books.map((t,i)=>bookItem(p,i,t,i?L`Ver na Amazon`:L`Comece por este · Ver na Amazon`)).join("")}</ol>${affNote()}`;
}
// One book row: cover (or the colored spine), title, a short line under it and the Amazon link.
function bookItem(p,i,title,line){
  const cov=((window.AgoraCovers||{})[p.id]||[])[i];
  return `<li><a href="${esc(SUP.bookURL(title,p.n))}" target="_blank" rel="sponsored noopener"><span class="cover" aria-hidden="true">${cov?`<img src="/covers/${cov}.jpg" alt="" loading="lazy" decoding="async" onerror="this.remove()">`:""}</span><span><span class="t">${esc(title)}</span><span class="muted">${line}</span></span><span class="pc" aria-hidden="true">↗</span></a></li>`;
}
function affNote(){
  const note=[SUP.SUPPORT.amazonTag?L`Como associado da Amazon, o Filosofômetro ganha com compras qualificadas, sem custo a mais para você.`:"",HAS_PIX?L`Prefere ajudar direto? <a href="#/apoie">Faça um Pix</a>.`:""].filter(Boolean).join(" ");
  return note?`<p class="aff-note">${note}</p>`:"";
}
function kinHTML(p){
  if(p.regional){
    const kin=(p.akin||[]).map(id=>byId[id]).filter(Boolean);
    if(!kin.length)return "";
    return `<div class="panel"><h2>${L`Parentes pelo mundo`}</h2><p class="sub">${L`Pensadores do catálogo internacional na mesma linha de ${esc(p.n)}.`}</p>
      <ul class="match-list">${kin.map(x=>`<li><a href="#/p/${x.id}">${portrait(x,{cls:"avatar"})}<span><span class="nm">${esc(x.n)}</span><span class="sc">${esc(x.s)}</span></span><span class="pc" aria-hidden="true">→</span></a></li>`).join("")}</ul></div>`;
  }
  const near=E.rank(p.v,E.BRAZIL).rows.filter(x=>x.p.id!==p.id).slice(0,3);
  return `<div class="panel brazil"><span class="br-flag" aria-hidden="true"></span><h2>${L`No Brasil, na mesma linha`}</h2><p class="sub">${L`Os pensadores brasileiros com o formato de pensamento mais parecido com o de ${esc(p.n)}.`}</p>
    <ul class="match-list">${near.map(x=>`<li><a href="#/p/${x.p.id}">${portrait(x.p,{cls:"avatar"})}<span><span class="nm">${esc(x.p.n)}</span><span class="sc">${esc(x.p.s)}</span></span><span class="pc">${x.pct}%</span></a></li>`).join("")}</ul></div>`;
}
const credit=p=>p.img?`<a class="credit" href="${esc(p.wiki)}" target="_blank" rel="noopener">${L`Imagem: Wikimedia Commons, via Wikipédia ↗`}</a>`:`<a class="credit" href="${esc(p.wiki)}" target="_blank" rel="noopener">${L`Retrato desenhado pelo perfil (sem foto livre) · Wikipédia ↗`}</a>`;
// Portrait and sigil together: the face of the thinker and the shape of the thought.
// On a result the user is orange and the thinker dashed; on a thinker's page the thinker is orange.
function duo(p,{user=null,title="",thinkerFirst=false}={}){
  const main=user&&!thinkerFirst?user:p.v,other=user?(thinkerFirst?user:p.v):null;
  const mainName=user&&!thinkerFirst?L`Você`:p.n,otherName=thinkerFirst?L`Você`:p.n;
  return `<div class="duo">
    ${portrait(p,{eager:true})}
    <div class="sigil-badge">${sigil(main,{compare:other,cls:"sg-user",draw:true,tips:true,title:title||L`Perfil de ${p.n}`})}<span class="badge-hint" aria-hidden="true"><span class="on-hover">${L`Passe o mouse nos eixos`}</span><span class="on-touch">${L`Toque nos eixos`}</span></span></div>
    ${user?`<div class="legend" aria-hidden="true"><span><i style="background:var(--accent)"></i>${esc(mainName)}</span><span><i class="dash"></i>${esc(otherName)}</span></div>`:""}
    ${credit(p)}
  </div>`;
}

// One axis bar: "main" is the orange dot, "other" the dark tick. Labels name both for screen readers.
function axisRow(a,main,other,mainLabel,otherLabel,{named=true}={}){
  const left=Math.min(50,(main+1)*50),width=Math.abs(main)*50;
  const label=`${a.name}: ${mainLabel} ${fmt(main)}${other===undefined?"":`, ${otherLabel} ${fmt(other)}`}`;
  return `<div class="axis-row">
    <div class="poles"><span>${Math.abs(main)>=.13&&main<0?`<b>${esc(a.l)}</b>`:esc(a.l)}</span><span class="val">${named?`<b class="ax-n">${esc(a.name)}</b> · `:""}${Math.abs(main)<.13?L`equilíbrio · `:""}${fmt(main)}</span><span>${Math.abs(main)>=.13&&main>0?`<b>${esc(a.r)}</b>`:esc(a.r)}</span></div>
    <div class="track" role="img" aria-label="${esc(label)}"><span class="center"></span><span class="fill" style="left:${left}%;width:${width}%;transform-origin:${main<0?"right":"left"}"></span>${other===undefined?"":`<span class="them" style="left:${(other+1)*50}%"></span>`}<span class="you" style="left:${(main+1)*50}%"></span></div>
  </div>`;
}

/* ---------- Thinker profile and agreement ---------- */
// Who the thinker was: life, bio, central ideas and the line of thought.
function aboutHTML(p,{title=L`Quem foi ${p.n}`}={}){
  if(!p.bio)return "";
  const sameLine=PH.filter(x=>x!==p&&x.s===p.s);
  return `<div class="panel about">
    <h2>${esc(title)}</h2>
    <p class="sub">${esc(lifeText(p))}${p.place?` · ${esc(p.place)}`:""}</p>
    <p class="about-bio">${esc(p.bio)}</p>
    <h3 class="about-h">${L`Ideias centrais`}</h3>
    <ul class="about-ideas">${p.ideas.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>
    ${p.line?`<h3 class="about-h">${L`A linha: ${esc(p.s)}`}</h3>
    <p class="about-line">${esc(p.line)}</p>`:""}
    ${sameLine.length?`<p class="about-same">${L`Na mesma linha:`} ${sameLine.map(x=>`<a href="#/p/${x.id}">${esc(x.n)}</a>`).join(", ")}</p>`:""}
  </div>`;
}
// Where the user and the thinker agree and differ most, axis by axis, on the normalized shapes the match uses.
function agreementHTML(r,x){
  if(r.directionless)return "";
  const rows=x.perAxis.map(a=>({ax:a.axis,diff:a.diff,you:r.scores[a.axis],them:x.p.v[a.axis]}));
  const close=rows.slice().sort((a,b)=>a.diff-b.diff).slice(0,3);
  const far=rows.slice().sort((a,b)=>b.diff-a.diff).slice(0,3);
  const item=(c,kind)=>{const a=AXES[c.ax];
    const text=kind==="close"
      ?(Math.sign(c.you)===Math.sign(c.them)&&Math.abs(c.you)>=.13?L`Os dois tendem a <b>${esc(c.you<0?a.l:a.r)}</b>.`:L`Os dois ficam perto do equilíbrio entre ${esc(a.l)} e ${esc(a.r)}.`)
      :cap(diffText(a,L`você`,c.you,x.p.n,c.them));
    return `<li><span class="ag-axis">${esc(cap(a.name))}</span><span>${text}</span></li>`;};
  return `<div class="panel agree">
    <h2>${L`Você e ${esc(x.p.n)}`}</h2>
    <p class="sub">${L`Os eixos onde seus formatos de pensamento mais se encontram e mais se afastam.`}</p>
    <h3 class="about-h ag-yes">${L`Onde vocês concordam`}</h3>
    <ul class="ag-list">${close.map(c=>item(c,"close")).join("")}</ul>
    <h3 class="about-h ag-no">${L`Onde vocês mais se afastam`}</h3>
    <ul class="ag-list">${far.map(c=>item(c,"far")).join("")}</ul>
  </div>`;
}

/* ---------- Timeline ---------- */
// Eras get fixed shares of the width, so the crowded modern centuries are readable
// next to the long ancient ones. A thinker is placed at their prime (birth + 35 years).
const ERAS=[
  {name:L`Antiguidade`,from:-650,to:450,w:.22},
  {name:L`Idade Média e Renascimento`,from:450,to:1600,w:.18},
  {name:L`Modernidade`,from:1600,to:1880,w:.28},
  {name:L`Contemporâneo`,from:1880,to:2030,w:.32},
];
function timeX(year){
  let left=0;
  for(const e of ERAS){
    if(year<=e.to||e===ERAS[ERAS.length-1])return (left+e.w*Math.max(0,Math.min(1,(year-e.from)/(e.to-e.from))))*100;
    left+=e.w;
  }
}
const yearText=y=>y<0?L`${-y} a.C.`:`${y}`;
const lifeText=p=>p.born===undefined?"":p.legend?L`séc. VI a.C. (data tradicional)`:
  `${p.approx?L`c. `:""}${yearText(p.born)}${p.died===null?L` até hoje`:L` a ${yearText(p.died)}`}`;
function timelineHTML(r){
  if(PH.some(p=>p.born===undefined))return "";
  const prime=p=>p.born+35;
  const hl=new Map();
  hl.set(r.top.p.id,"top");
  r.ranking.slice(1,6).forEach(x=>hl.set(x.p.id,"near"));
  if(r.opposite)hl.set(r.opposite.p.id,"opp");
  // Highlighted thinkers get labels above the line, stacked so labels never overlap.
  // The match always gets the top row (its "você está aqui" badge sits above it); the rest
  // take the first row where they don't collide with any label already placed.
  const rows=[],labels=[];
  const place=p=>{
    const x=timeX(prime(p));let row=0;
    // Labels are 132px wide on a timeline at least 880px wide: 15.5% keeps them apart at any width.
    while(rows[row]&&rows[row].some(o=>Math.abs(o-x)<15.5))row++;
    (rows[row]=rows[row]||[]).push(x);labels.push({p,x,row,kind:hl.get(p.id)});
  };
  place(r.top.p);
  [...hl.keys()].filter(id=>id!==r.top.p.id).map(id=>byId[id]).sort((a,b)=>prime(a)-prime(b)).forEach(place);
  const dotRows=[];
  const dots=PH.filter(p=>!hl.has(p.id)).sort((a,b)=>prime(a)-prime(b)).map(p=>{
    const x=timeX(prime(p));let row=0;
    while(dotRows[row]!==undefined&&x-dotRows[row]<.9)row++;
    dotRows[row]=x;return {p,x,row};
  });
  const tag={top:L`Seu par`,near:L`Parecido`,opp:L`Oposto`};
  let left=0;
  const eraMarks=ERAS.map(e=>{const s=`<span class="tl-era" style="left:${left*100}%;width:${e.w*100}%">${esc(e.name)}</span>`;left+=e.w;return s}).join("");
  return `<div class="panel tl-panel">
    <h2>${L`Sua linhagem no tempo`}</h2>
    <p class="sub">${L`Os ${PH.length} pensadores na época em que viveram. Destaque para o seu par, os 5 mais parecidos e o seu oposto. Toque em qualquer ponto para conhecer o pensador.`}</p>
    <div class="tl-scroll" tabindex="0" aria-label="${L`Linha do tempo, role para os lados`}"><div class="tl" style="--rows:${rows.length}">
      <div class="tl-labels">${labels.map(l=>`<a class="tl-label ${l.kind}${l.x<9?" edge-l":l.x>91?" edge-r":""}" href="#/p/${l.p.id}" style="left:${l.x}%;--row:${l.row}">${portrait(l.p,{cls:"tl-pic"})}<span class="tl-name">${esc(l.p.n)}</span><span class="tl-tag">${tag[l.kind]}${l.kind==="top"&&r.top.pct!==null?` · ${r.top.pct}%`:""} · ${esc(lifeText(l.p))}</span>${l.kind==="top"?`<span class="tl-you">${L`Você está aqui`}</span>`:""}</a>`).join("")}</div>
      <div class="tl-line"></div>
      <div class="tl-dots">${dots.map(d=>`<a class="tl-dot" href="#/p/${d.p.id}" style="left:${d.x}%;--row:${d.row}" title="${esc(d.p.n)} (${esc(lifeText(d.p))})" aria-label="${esc(d.p.n)}, ${esc(lifeText(d.p))}"></a>`).join("")}</div>
      <div class="tl-eras">${eraMarks}</div>
    </div></div>
  </div>`;
}

/* ---------- Audit ---------- */
const num=(x,d=6)=>x===null?L`sem valor`:x.toFixed(d).replace(".",I.dec);
function auditPanel(r){
  const P=r.params,u=r.user;
  return `<details class="audit" id="audit">
    <summary><span><h2 class="t">${L`Auditoria do cálculo`}</h2><span class="s">${L`Cada passo, com os números exatos. Motor v${r.version} · código <span class="mono">${r.code}</span> · catálogo <span class="mono">${r.fingerprint}</span>`}</span></span><span class="chev">${icon.chev}</span></summary>
    <div class="audit-body">
      <h3 class="h-audit">${L`Passo 1 · Respostas viram eixos`}</h3>
      <div class="formula">${L`valor da resposta: concordo totalmente +2 · concordo +1 · neutro 0 · discordo −1 · discordo totalmente −2
contribuição = valor × direção da afirmação (+1 ou −1)
posição no eixo = soma das contribuições ÷ (2 × afirmações do eixo)      (vai de −1 a +1)`}</div>
      <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>${L`Eixo`}</th><th>−1</th><th>+1</th><th class="n">${L`Soma`}</th><th class="n">${L`Máx.`}</th><th class="n">${L`Posição`}</th></tr></thead><tbody>
      ${r.perAxis.map(a=>`<tr><td>${esc(AXES[a.axis].name)}</td><td>${esc(AXES[a.axis].l)}</td><td>${esc(AXES[a.axis].r)}</td><td class="n">${a.sum>0?"+":""}${a.sum}</td><td class="n">${a.max}</td><td class="n">${fmt(a.score,4)}</td></tr>`).join("")}
      </tbody></table></div>

      <h3 class="h-audit">${L`Passo 2 · Formato do perfil`}</h3>
      <div class="formula">${L`intensidade = média de |posição| nos 11 eixos
fator = mín(${P.maxGain}, ${r.catalogIntensity.toFixed(6)} ÷ intensidade)      (${r.catalogIntensity.toFixed(6)} = intensidade média do catálogo)
perfil normalizado = posição × fator
se a intensidade for menor que ${P.minIntensity}, o perfil não tem direção: fator 0 e nenhum percentual
O mesmo vale para cada pensador. Assim comparamos a direção do pensamento, não a força.`}

${L`Sua intensidade:`} ${u.intensity.toFixed(6)}
${L`Seu fator:`} ${r.directionless?L`0 (perfil sem direção: o ranking usa só a distância bruta)`:u.k.toFixed(6)+(u.capped?L` (limitado pelo teto de ${P.maxGain})`:"")}</div>

      <h3 class="h-audit">${L`Passo 3 · Comparação com um pensador`}</h3>
      <div class="formula">${L`distância = média de |você normalizado − pensador normalizado| nos 11 eixos`}
${L`compatibilidade`} = ${esc(t(E.PERCENT_RULE))}      (τ = ${P.tau})</div>
      <label class="muted" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:14px 0 12px;font-size:14px">${L`Comparar com`}
        <select class="select" id="cmpSel">${r.ranking.map(x=>`<option value="${x.p.id}">${x.rank}º · ${esc(x.p.n)} · ${pctText(x.pct)}</option>`).join("")}</select>
      </label>
      <div id="cmpOut"></div>

      <h3 class="h-audit">${L`Passo 4 · Ranking e desempate`}</h3>
      <div class="formula">${L`ordem:`} ${esc(t(E.TIE_BREAK))}
eps = ${P.eps}      ${L`distância bruta = média de |sua posição − posição do pensador|, sem normalizar`}</div>
      <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th class="n">#</th><th>${L`Pensador`}</th><th class="n">${L`Distância`}</th><th class="n">${L`Dist. bruta`}</th><th class="n">%</th><th>${L`Desempate`}</th></tr></thead><tbody>
      ${r.ranking.map((x,i)=>`<tr class="${i===0||(r.opposite&&i===r.ranking.length-1)?"hl":""}"><td class="n">${x.rank}</td><td>${esc(x.p.n)} <span class="muted mono" style="font-size:11px">${x.p.id}</span></td><td class="n">${num(x.distance)}</td><td class="n">${num(x.rawDistance)}</td><td class="n">${x.pct===null?L`sem %`:x.pct}</td><td>${x.tiedWithPrev||x.tiedWithNext?`<span class="tie">${L`empate de distância`}</span>`:""}</td></tr>`).join("")}
      </tbody></table></div>

      <h3 class="h-audit">${L`Suas ${r.answers.length} respostas`}</h3>
      <p class="muted" style="font-size:13px;margin:0 0 10px">${L`“Nº” é a posição da afirmação no catálogo, usada no código de respostas. “No teste” é a ordem em que ela apareceu para você.`}</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">${L`Nº`}</th><th class="n">${L`No teste`}</th><th>${L`Afirmação`}</th><th>${L`Eixo`}</th><th>${L`Resposta`}</th><th class="n">${L`Contribuição`}</th></tr></thead><tbody>
      ${r.perQuestion.map(q=>`<tr><td class="n">${q.i+1}</td><td class="n">${q.shown}</td><td class="wrap">${esc(q.text)}</td><td>${esc(AXES[q.axis].name)} → ${esc(q.dir>0?AXES[q.axis].r:AXES[q.axis].l)}</td><td>${esc(t(SCALE[q.answer].label))} <span class="muted mono">(${q.answer})</span></td><td class="n">${q.contribution>0?"+":""}${q.contribution}</td></tr>`).join("")}
      </tbody></table></div>

      <h3 class="h-audit">${L`Verificação`}</h3>
      <div class="audit-meta"><span>${L`Motor`} <code>v${r.version}</code></span><span>${L`Código do motor`} <code>${r.code}</code></span><span>${L`Catálogo`} <code>${r.fingerprint}</code></span><span>${L`Parâmetros`} <code>τ=${P.tau}</code> <code>${L`teto`}=${P.maxGain}</code> <code>${L`mín`}=${P.minIntensity}</code> <code>eps=${P.eps}</code></span><span>${L`Respostas`} <code>${E.encode(r.answers)}</code></span></div>
      <p class="muted" style="font-size:13px;margin:12px 0 0">${L`A tabela mostra 6 casas decimais. O arquivo de auditoria traz todos os números com precisão completa, para refazer a conta sem diferenças de arredondamento.`}</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px">
        <button class="btn sm ghost" id="dlAudit" type="button">${L`Baixar auditoria (JSON)`}</button>
        <a class="btn sm ghost" href="#/verificar/${E.encode(r.answers)}">${L`Verificar com cálculo independente`}</a>
        <a class="btn sm ghost" href="#/metodo">${L`Ler o método completo`}</a>
      </div>
    </div>
  </details>`;
}
function wireAudit(r){
  const sel=document.getElementById("cmpSel"),out=document.getElementById("cmpOut");
  const draw=()=>{
    const x=r.ranking.find(y=>y.p.id===sel.value);
    out.innerHTML=`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>${L`Eixo`}</th><th class="n">${L`Você`}</th><th class="n">${L`Você norm.`}</th><th class="n">${esc(x.p.n)}</th><th class="n">${L`Norm.`}</th><th class="n">${L`|Dif.|`}</th></tr></thead><tbody>
      ${x.perAxis.map(a=>`<tr><td>${esc(AXES[a.axis].name)}</td><td class="n">${fmt(r.scores[a.axis],4)}</td><td class="n">${fmt(a.user,6)}</td><td class="n">${fmt(a.thinkerRaw,1)}</td><td class="n">${fmt(a.thinker,6)}</td><td class="n">${a.diff.toFixed(6)}</td></tr>`).join("")}
      <tr class="hl"><td colspan="5">${L`Distância (média das diferenças) → ${x.rank}º lugar`}</td><td class="n">${x.distance.toFixed(6)}</td></tr>
      <tr class="hl"><td colspan="5">${x.pct===null?L`Perfil sem direção: sem percentual`:`max(1, min(100, round(100 × e^(−(${x.distance.toFixed(6)} ÷ ${r.params.tau})²))))`}</td><td class="n">${pctText(x.pct)}</td></tr>
      <tr><td colspan="5">${L`Distância bruta (desempate)`}</td><td class="n">${x.rawDistance.toFixed(6)}</td></tr>
    </tbody></table></div><p class="muted" style="font-size:13px;margin:8px 0 0">${L`Intensidade do pensador ${x.thinkerIntensity.toFixed(6)} · fator ${x.thinkerK.toFixed(6)}`}</p>`;
  };
  sel.addEventListener("change",draw);draw();
  document.getElementById("dlAudit").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify(E.auditJSON(r),null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`filosofometro-auditoria-${E.encode(r.answers).slice(0,8)}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  });
}

/* ---------- Catalog ---------- */
function renderCatalog(){
  const ALL=[...PH,...BR];
  const eras=[...new Set(ALL.map(p=>p.era))];
  const last=store.get("last"),lastR=last&&E.decode(last)?E.evaluate(E.decode(last)):null;
  // Sorting by match follows the engine's ranking exactly, ties included.
  const rankOf=Object.fromEntries(lastR?[...lastR.brazil,...lastR.ranking].map(x=>[x.p.id,x]):[]);
  const pctOf=id=>lastR?rankOf[id].pct:null;
  const hasPct=!!lastR&&!lastR.directionless;
  let era="",q="",sort=lastR?"match":"era";
  mount(`
  <section class="wrap section" style="padding-top:clamp(32px,6vh,64px)">
    <span class="eyebrow">${L`Catálogo`}</span>
    <h1 class="h2" style="font-size:clamp(52px,8vw,112px)">${L`${ALL.length} pensadores`}</h1>
    <p class="lede" style="margin-top:16px">${L`${new Set(PH.map(p=>p.s)).size} correntes, da Grécia antiga a hoje.`} ${lastR?L`Cada card mostra sua compatibilidade e sua posição no ranking.`:L`Faça o teste para ver sua compatibilidade com cada um.`}</p>
    <div class="cat-tools">
      <label class="sr" for="q">${L`Buscar pensador ou corrente`}</label>
      <input class="search" id="q" type="search" placeholder="${L`Buscar pensador ou corrente`}" autocomplete="off">
      <div class="chips" role="group" aria-label="${L`Filtrar por época`}">
        <button class="chip" type="button" aria-pressed="true" data-era="">${L`Todos`}</button>
        ${eras.map(e=>`<button class="chip" type="button" aria-pressed="false" data-era="${esc(e)}">${esc(e)}</button>`).join("")}
      </div>
      <label class="sr" for="sortSel">${L`Ordenar`}</label>
      <select class="select" id="sortSel">
        ${lastR?`<option value="match">${L`Mais compatíveis comigo`}</option>`:""}
        <option value="era">${L`Ordem histórica`}</option>
        <option value="az">${L`Ordem alfabética`}</option>
      </select>
    </div>
    <p class="sr" id="count" aria-live="polite"></p>
    <div class="cards" id="cards"></div>
  </section>`,L`Pensadores`);
  const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const draw=()=>{
    const list=ALL.filter(p=>(!era||p.era===era)&&(!q||norm(p.n+" "+p.s).includes(norm(q))));
    if(sort==="az")list.sort((a,b)=>a.n.localeCompare(b.n,I.html));
    // Main and Brazilian thinkers share one scale (same normalized distance), so they sort together.
    if(sort==="match")list.sort((a,b)=>rankOf[a.id].distance-rankOf[b.id].distance||(a.id<b.id?-1:1));
    document.getElementById("count").textContent=L`${list.length} pensadores`;
    document.getElementById("cards").innerHTML=list.length?list.map(p=>`<a class="tcard" href="#/p/${p.id}"><span class="tcard-art">${portrait(p)}<span class="mini">${sigil(p.v,{decorative:true,cls:"sg-user"})}</span></span><span class="nm">${esc(p.n)}</span><span class="sc">${esc(p.s)} · ${esc(p.era)}</span>${lastR?`<span class="pc">${hasPct?L`${pctOf(p.id)}% com você`:""}${p.regional?"":`${hasPct?" · ":""}${rankOf[p.id].rank}º`}</span>`:""}</a>`).join(""):`<p class="empty">${L`Nenhum pensador encontrado.`}</p>`;
  };
  document.getElementById("q").addEventListener("input",e=>{q=e.target.value;draw()});
  document.getElementById("sortSel").addEventListener("change",e=>{sort=e.target.value;draw()});
  app.querySelectorAll(".chip").forEach(c=>c.addEventListener("click",()=>{
    era=c.dataset.era;app.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",x===c));draw();
  }));
  draw();
}

function renderThinker(id){
  const p=byId[id];
  if(!p){renderNotFound(L`Não encontramos esse pensador.`);return}
  const last=store.get("last"),lastR=last&&E.decode(last)?E.evaluate(E.decode(last)):null;
  const mine=lastR&&(lastR.ranking.find(x=>x.p.id===id)||lastR.brazil.find(x=>x.p.id===id));
  const ofN=lastR&&lastR.ranking.some(x=>x.p.id===id)?`${PH.length}`:L`${E.BRAZIL.length} brasileiros`;
  // Closest thinkers by the same rule the engine uses for users: this thinker's positions as the profile.
  const twins=E.rank(p.v).rows.filter(x=>x.p.id!==p.id).slice(0,4).map(x=>({x:x.p}));
  mount(`
  <section class="wrap th-hero">
    <div>
      <a class="back" href="#/pensadores">${icon.back} ${L`Todos os pensadores`}</a>
      <h1 class="res-name" style="margin-top:18px"><span class="line"><span>${esc(p.n)}</span></span></h1>
      <div class="res-school">${esc(p.s)} · ${esc(p.era)}</div>
      <div class="res-arch">${L`Arquétipo:`} <b>${esc(archetype(p.v).name)}</b></div>
      <blockquote class="res-quote">“${esc(p.q)}”</blockquote>
      <div class="res-actions">${mine?`<span class="btn ghost" style="cursor:default">${mine.pct===null?"":L`${mine.pct}% com você · `}${L`${mine.rank}º de ${ofN}`}</span>`:`<a class="btn accent" href="#/teste">${L`Ver minha compatibilidade`} ${icon.arrow}</a>`}</div>
    </div>
    ${duo(p,{user:lastR?lastR.scores:null,thinkerFirst:true,title:lastR?L`Perfil de ${p.n} comparado ao seu`:L`Perfil de ${p.n}`})}
  </section>
  <section class="wrap" style="padding-bottom:64px">
    <div class="grid2">
      <div class="panel"><h2>${L`Posições`}</h2><p class="sub">${L`Cada raio é um eixo: o primeiro polo fica no centro e o segundo, na borda. Laranja: ${esc(p.n)}.`}${lastR?L` Tracejado na mandala e traço nas barras: você.`:""}</p>
        <div class="panel-sigil">${sigil(p.v,{labels:true,cls:"sg-user",compare:lastR?lastR.scores:null,tips:true,title:L`Perfil de ${p.n} nos 11 eixos`})}</div><p class="tip-hint">${L`<span class="on-hover">Passe o mouse</span><span class="on-touch">Toque</span> em cada eixo para ver a posição de ${esc(p.n)}.`}</p>
        ${AXES.map((a,i)=>axisRow(a,p.v[i],lastR?lastR.scores[i]:undefined,p.n,L`você`)).join("")}</div>
      <div style="display:grid;gap:20px;align-content:start">
        ${aboutHTML(p,{title:L`Quem foi`})}
        ${kinHTML(p)}
        <div class="panel"><h2>${L`Para ler`}</h2><p class="sub">${L`Comece pelo primeiro.`}</p>${readingHTML(p)}</div>
        <div class="panel"><h2>${L`Parentes próximos`}</h2><p class="sub">${L`Pensadores com o formato mais parecido.`}</p>
          <ul class="match-list">${twins.map(({x})=>`<li><a href="#/p/${x.id}">${portrait(x,{cls:"avatar"})}<span><span class="nm">${esc(x.n)}</span><span class="sc">${esc(x.s)}</span></span><span class="pc" aria-hidden="true">→</span></a></li>`).join("")}</ul></div>
      </div>
    </div>
  </section>`,p.n);
  wireTips(app,{user:lastR?lastR.scores:null,r:null,p});
}

/* ---------- Method ---------- */
function renderMethod(){
  const P=E.PARAMS,ci=E.catalogIntensity.toFixed(6);
  mount(`
  <section class="wrap section" style="padding-top:clamp(32px,6vh,64px)">
    <span class="eyebrow">${L`Método`}</span>
    <h1 class="h2" style="font-size:clamp(52px,8vw,112px)">${L`Como o <em class="it accent">motor</em> pensa`}</h1>
    <div class="stat-grid">
      <div class="stat"><b>${E.LEVELS.map(l=>l.n).join(" · ")}</b><span>${L`afirmações nos 3 níveis`}</span></div>
      <div class="stat"><b>${AXES.length}</b><span>${L`eixos independentes`}</span></div>
      <div class="stat"><b>${PH.length}</b><span>${L`pensadores`}</span></div>
      <div class="stat"><b class="mono" style="font-size:24px;padding:8px 0 6px">${E.codeFingerprint()}</b><span>${L`código do motor v${E.VERSION}`}</span></div>
      <div class="stat"><b class="mono" style="font-size:24px;padding:8px 0 6px">${E.fingerprint()}</b><span>${L`catálogo`}</span></div>
    </div>
    <div class="prose">
      <h2>${L`1. Afirmações equilibradas, em três níveis`}</h2>
      <p>${L`O teste tem três níveis que se somam: ${E.LEVELS.map(l=>L`${t(l.name)}, com ${l.n} afirmações`).join("; ")}. Cada nível acrescenta 4 afirmações por eixo, e em cada bloco duas puxam para um polo e duas para o outro. Quem concorda com tudo, ou discorda de tudo, cai exatamente no centro em qualquer nível. Isso anula o viés de quem tende a dizer sim.`}</p>
      <p>${L`Mais afirmações reduzem o efeito de uma resposta dada no impulso. Numa simulação com respostas imprecisas, a mesma pessoa recebe o mesmo par ao refazer o teste em ${E.LEVELS.map(l=>L`${LEVEL_INFO[l.id].retest} das vezes no ${t(l.name)}`).join(", ")}.`}</p>
      <p>${L`As afirmações aparecem misturadas entre os eixos, em rodízio dentro de cada nível. As respostas são guardadas sempre pela posição da afirmação no catálogo, por isso um resultado do nível Rápido pode ser aprofundado sem perder nada, e a auditoria mostra as duas numerações.`}</p>
      <h2>${L`2. Da resposta ao eixo`}</h2>
      <div class="formula">${L`concordo totalmente +2 · concordo +1 · neutro 0 · discordo −1 · discordo totalmente −2
contribuição = valor × direção (+1 ou −1)
posição = soma das contribuições do eixo ÷ (2 × afirmações do eixo)        ∈ [−1, +1]`}</div>
      <h2>${L`3. Formato, não força`}</h2>
      <p>${L`Duas pessoas podem pensar na mesma direção com intensidades diferentes: uma marca “concordo”, outra “concordo totalmente”. Para que as duas encontrem o mesmo par, ajustamos a intensidade.`}</p>
      <div class="formula">${L`intensidade = média de |posição| nos 11 eixos
fator = mín(${P.maxGain}, ${ci} ÷ intensidade)
normalizado = posição × fator`}</div>
      <p>${L`${ci} é a intensidade média do catálogo. A mesma conta vale para os pensadores, então nem os moderados nem os radicais levam vantagem.`}</p>
      <p>${L`O fator nunca passa de ${P.maxGain}. Sem esse teto, um perfil quase neutro, com um único eixo levemente marcado, seria ampliado até esse eixo decidir sozinho o resultado.`}</p>
      <p>${L`Se a intensidade fica abaixo de ${P.minIntensity}, o perfil não tem direção. Nesse caso não existe formato para comparar: o resultado mostra o pensador cujas posições ficam mais perto das suas, sem percentual e sem oposto.`}</p>
      <h2>${L`4. Distância e compatibilidade`}</h2>
      <div class="formula">${L`distância = média de |você normalizado − pensador normalizado| nos 11 eixos`}
${L`compatibilidade`} = ${esc(t(E.PERCENT_RULE))}
τ = ${P.tau}</div>
      <p>${L`A curva faz pares próximos parecerem próximos e derruba rápido os distantes. O resultado é arredondado para o inteiro mais próximo e fica sempre entre 1 e 100. O valor ${P.tau} foi calibrado para que responder exatamente como um pensador dê 85% ou mais.`}</p>
      <h2>${L`5. Ranking e desempate`}</h2>
      <p>${L`Empates exatos de distância acontecem com frequência, porque as respostas são números inteiros. A ordem é sempre esta:`}</p>
      <div class="formula">${esc(t(E.TIE_BREAK))}
eps = ${P.eps}
${L`distância bruta = média de |sua posição − posição do pensador|, sem normalizar`}</div>
      <p>${L`O id é comparado pelos códigos dos caracteres, sem depender do idioma do navegador. Assim, as mesmas respostas dão sempre o mesmo ranking, em qualquer computador. A auditoria marca cada empate e mostra a distância bruta usada para desfazê-lo.`}</p>
      <h3>${L`Pensadores brasileiros`}</h3>
      <p>${PH.some(p=>p.br)?L`O resultado também mostra quem, no Brasil, pensa como você. São ${E.BRAZIL.length} pensadores brasileiros: um catálogo próprio de ${BR.length}, mais os ${PH.filter(p=>p.br).length} brasileiros do catálogo principal. Eles são comparados com a mesma conta, num ranking separado, para que o ranking principal continue com os mesmos ${PH.length} pensadores.`:L`O resultado também mostra quem, no Brasil, pensa como você: ${E.BRAZIL.length} pensadores brasileiros, comparados com a mesma conta, num ranking separado, para que o ranking principal continue com os mesmos ${PH.length} pensadores.`}</p>
      <h3>${L`Comparar com outra pessoa`}</h3>
      <p>${L`Duas pessoas são comparadas exatamente como uma pessoa e um pensador: os dois perfis são normalizados, a distância é a média das diferenças nos 11 eixos e a compatibilidade usa a mesma curva. A conta é simétrica, e uma pessoa comparada consigo mesma dá 100%.`}</p>
      <h2>${L`6. Aviso de confiabilidade`}</h2>
      <p>${L`Se você escolhe a mesma opção em ${Math.round(P.repeatWarning*100)}% das afirmações ou mais (no nível Rápido, ${Math.ceil(P.repeatWarning*E.LEVELS[0].n)} de ${E.LEVELS[0].n}), ou se a intensidade fica abaixo de ${P.centerWarning}, o resultado vem com um aviso.`}</p>
      <h2>${L`7. Como verificamos`}</h2>
      <p>${L`Uma bateria de testes automatizados roda sobre o motor e o catálogo. Ela confere, entre outras coisas:`}</p>
      <ul>
        <li>${L`que o motor e o verificador independente chegam aos mesmos números, sem nenhuma diferença, em milhares de respostas aleatórias, inclusive nos empates;`}</li>
        <li>${L`que o arquivo de auditoria basta, sozinho, para refazer o ranking inteiro;`}</li>
        <li>${L`que todos os ${PH.length} pensadores vencem quando alguém responde exatamente como eles;`}</li>
        <li>${L`que nenhum pensador concentra mais de 5% dos resultados em usuários simulados;`}</li>
        <li>${L`que mudar duas respostas em um passo mantém o mesmo par no top 3 em mais de 95% dos casos;`}</li>
        <li>${L`que todos os 11 eixos influenciam o resultado.`}</li>
      </ul>
      <p>${L`Uma segunda auditoria prova que todos os ${PH.length} pensadores, e portanto todas as ${new Set(PH.map(p=>p.s)).size} correntes, podem ser o resultado: pelo perfil exato de cada um, por uma busca que parte de respostas aleatórias e por simulação com 60 mil pessoas. O mesmo vale para os ${E.BRAZIL.length} pensadores do ranking brasileiro.`}</p>
      <h3>${L`Sem viés de lado, de época ou de nível`}</h3>
      <ul>
        <li>${L`<b>Espelho:</b> inverter todas as respostas inverte exatamente todos os eixos. E se o catálogo inteiro também for espelhado, o ranking sai idêntico, com as mesmas distâncias. A fórmula não prefere nenhum polo.`}</li>
        <li>${L`<b>Épocas:</b> cada época vence numa proporção próxima do seu peso no catálogo. Antigos, medievais, modernos, contemporâneos e orientais têm a mesma chance por pensador.`}</li>
        <li>${L`<b>Polos:</b> em cada um dos 22 polos, pelo menos 65% das pessoas fortemente nele recebem um par do mesmo lado. Quando um polo ficou abaixo disso, o problema era falta de pensadores ali, e o catálogo ganhou nomes como Lucrécio, Yang Zhu, La Mettrie, Fourier, Wilde, Marcuse, Oakeshott, Kirk, Sidgwick, Godwin e Frege.`}</li>
        <li>${L`<b>Níveis:</b> passar de 44 para 132 afirmações refina a posição sem empurrá-la para nenhum lado: o deslocamento médio é praticamente zero em todos os eixos.`}</li>
      </ul>
      <h2>${L`8. Verifique você mesmo`}</h2>
      <p>${L`Nada aqui depende de confiança. O verificador refaz qualquer resultado com uma segunda implementação, num arquivo separado (<code>verify.js</code>) que não compartilha código com o motor, e compara cada número do arquivo de auditoria.`}</p>
      <p>${L`As duas impressões digitais usam ${esc(t(E.HASH_RULE))}. A do código cobre o motor inteiro, com as quebras de linha normalizadas. A do catálogo cobre exatamente o objeto <code>fingerprintInput</code> incluído no catálogo para download, com eixos, afirmações, nomes, ids e posições.`}</p>
      <div class="cta-row" style="margin:20px 0 8px">
        <a class="btn accent sm" href="#/verificar">${L`Abrir o verificador`}</a>
        <button class="btn ghost sm" id="dlCatalog" type="button">${L`Baixar catálogo (JSON)`}</button>
        <a class="btn ghost sm" href="/engine.js" target="_blank" rel="noopener">${L`Ver código do motor`}</a>
        <a class="btn ghost sm" href="/verify.js" target="_blank" rel="noopener">${L`Ver código do verificador`}</a>
        <a class="btn ghost sm" href="https://github.com/tiagocardosobezerra/filosofometro" target="_blank" rel="noopener">${L`Código completo e testes no GitHub`}</a>
      </div>
      <h2>${L`9. Limites honestos`}</h2>
      <p>${L`As posições dos pensadores são uma leitura acadêmica resumida, revisada mas discutível: filósofos reais não cabem em 11 números. As frases de autores modernos são paráfrases curtas. Use o resultado como porta de entrada para ler, não como diagnóstico.`}</p>
      <h2>${L`10. Quem fez`}</h2>
      <p>${L`O Filosofômetro foi criado por <a href="https://github.com/tiagocardosobezerra" target="_blank" rel="noopener author">Tiago Cardoso Bezerra</a>. É gratuito, sem anúncios e sem cadastro, e suas respostas ficam só no seu navegador.`}</p>
    </div>
  </section>`,L`Método`);
  document.getElementById("dlCatalog").addEventListener("click",()=>{
    const catalog={
      engine:{version:E.VERSION,code:E.codeFingerprint(),catalog:E.fingerprint(),params:E.PARAMS,scale:SCALE,
        rules:{percent:E.PERCENT_RULE,tieBreak:E.TIE_BREAK,hash:E.HASH_RULE}},
      fingerprintInput:E.fingerprintInput(),
      shownOrder:ORDER,
      statements:QS.map(([text,axis,direction,ifAgree,ifDisagree],i)=>({index:i,text,axis:AXES[axis].id,direction,ifAgree,ifDisagree})),
      thinkers:PH.map(p=>({id:p.id,name:p.n,school:p.s,era:p.era,positions:p.v,quote:p.q,book:p.b,image:p.img,source:p.wiki})),
    };
    const blob=new Blob([JSON.stringify(catalog,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`filosofometro-catalogo-${E.fingerprint()}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  });
}

/* ---------- Verifier ---------- */
// Accepts a full result link, a #/r/ or #/verificar/ path, or the bare code. The code must be
// exactly 44, 88 or 132 digits from 0 to 4: any other length is rejected, never truncated.
function codeFromText(t){
  const s=String(t||"").trim();
  const m=s.match(/(?:#\/(?:r|verificar)\/|#r=)?([^/#=\s]*)$/);
  return m?E.decode(m[1]):null;
}
// The verifier's details are short Portuguese phrases with numbers in them; the pack translates their words.
const detailText=s=>{const w=(window.AgoraLang||{}).words;return w?Object.keys(w).sort((a,b)=>b.length-a.length).reduce((x,k)=>x.split(k).join(w[k]),String(s)):s};
function renderVerify(code){
  const current={catalog:E.fingerprint(),code:E.codeFingerprint()};
  mount(`
  <section class="wrap section" style="padding-top:clamp(32px,6vh,64px)">
    <span class="eyebrow">${L`Verificação`}</span>
    <h1 class="h2" style="font-size:clamp(48px,7vw,96px)">${L`Confira qualquer <em class="it accent">resultado</em>`}</h1>
    <p class="lede" style="margin-top:16px;max-width:58ch">${L`Cole um link de resultado ou envie o arquivo de auditoria. Esta página refaz a conta com uma segunda implementação, que não compartilha código com o motor, e compara cada número: respostas, eixos, normalização, distâncias, desempates e percentuais.`}</p>
    <div class="verify-form">
      <label class="sr" for="vIn">${L`Link ou código do resultado`}</label>
      <input class="search" id="vIn" placeholder="${L`Cole o link do resultado ou o código de respostas`}" value="${code?esc(code):""}" autocomplete="off" spellcheck="false">
      <button class="btn accent" id="vGo" type="button">${L`Verificar`}</button>
      <label class="btn ghost" for="vFile" style="cursor:pointer">${L`Enviar auditoria (JSON)`}</label>
      <input type="file" id="vFile" accept="application/json,.json" class="sr">
    </div>
    <div id="vOut" aria-live="polite"></div>
  </section>`,L`Verificar`);
  const out=document.getElementById("vOut");
  const fail=msg=>{out.innerHTML=`<p class="note">${icon.info}<span>${esc(msg)}</span></p>`};
  // A link is checked by exporting the engine's audit and comparing it with the independent recomputation.
  // An uploaded file is compared as is, so any edited number in it shows up.
  const show=(audit,source)=>{
    const checks=AgoraVerify.checkAudit(AgoraData,audit,current),all=checks.every(c=>c.ok);
    const answers=E.decode(audit.answers&&audit.answers.code);
    const r=answers&&E.evaluate(answers);
    out.innerHTML=`<div class="verdict ${all?"ok":"bad"}"><span class="v-ic">${all?"✓":"!"}</span><span><b>${all?L`Tudo confere.`:L`Há divergências.`}</b> ${all?(r?(r.directionless?L`O motor e o verificador independente chegam aos mesmos números: perfil sem direção, mais perto de ${esc(r.top.p.n)}.`:L`O motor e o verificador independente chegam aos mesmos números: ${r.top.pct}% ${esc(r.top.p.n)}.`):L`O motor e o verificador independente chegam aos mesmos números.`):L`Veja os itens marcados abaixo.`}</span></div>
      <p class="muted" style="font-size:14px;margin:0 0 12px">${L`Fonte verificada:`} ${esc(source)}</p>
      <ul class="checks">${checks.map(c=>`<li class="${c.ok?"ok":"bad"}"><span class="v-ic" aria-hidden="true">${c.ok?"✓":"✗"}</span><span><b>${esc(t(c.label))}</b><span class="muted">${esc(detailText(c.detail))}</span></span><span class="sr">${c.ok?L`confere`:L`não confere`}</span></li>`).join("")}</ul>
      <div class="audit-meta" style="margin-top:16px"><span>${L`Motor`} <code>v${E.VERSION}</code></span><span>${L`Código do motor`} <code>${current.code}</code></span><span>${L`Catálogo`} <code>${current.catalog}</code></span></div>
      ${answers?`<div class="cta-row" style="margin-top:20px"><a class="btn ghost sm" href="#/r/${E.encode(answers)}">${L`Abrir este resultado`}</a></div>`:""}`;
  };
  const fromLink=t=>{
    const answers=codeFromText(t);
    if(!answers){fail(L`Não reconheci esse resultado. O código precisa ter 44, 88 ou 132 dígitos de 0 a 4, como nos links do Filosofômetro.`);return}
    show(E.auditJSON(E.evaluate(answers)),L`link de resultado, recalculado pelo motor agora`);
  };
  document.getElementById("vGo").addEventListener("click",()=>fromLink(document.getElementById("vIn").value));
  document.getElementById("vIn").addEventListener("keydown",e=>{if(e.key==="Enter")fromLink(e.target.value)});
  document.getElementById("vFile").addEventListener("change",async e=>{
    const f=e.target.files[0];if(!f)return;
    let j=null;try{j=JSON.parse(await f.text())}catch(err){}
    if(!j||j.format!=="filosofometro-audit/2"){fail(L`Esse arquivo não é uma auditoria do Filosofômetro nesta versão (formato filosofometro-audit/2).`);return}
    show(j,L`arquivo ${f.name}`);
  });
  if(code)fromLink(code);
}

/* ---------- Prototype: the new result page (#/novo/<code>) ----------
   A side-by-side test of the council's spec. It does not replace #/r/; nothing links here yet.
   Portuguese only while it is a prototype. */
const V2_LEVEL=["rascunho","boa","alta"];
// Proposed neutral nouns for three archetype words that can sound like a judgment (prototype only).
const V2_WORDS={Fatalista:"Determinista",Legalista:"Institucionalista",Asceta:"Eudemonista"};
const v2Name=n=>n.split(" ").map(w=>V2_WORDS[w]||w).join(" ");
// Sharpness of the portrait: the level, minus a point when the 2nd thinker is within 3 points,
// minus a point when fewer than 60% of the themes have answers pointing mostly one way.
function sharpness(r){
  let s=levelId(r);
  const gap=r.ranking[0].pct!==null&&r.ranking[1].pct!==null?r.ranking[0].pct-r.ranking[1].pct:0;
  if(gap<3)s--;
  const coherent=AXES.filter((_,ax)=>{const qs=r.perQuestion.filter(q=>q.axis===ax&&q.contribution!==0);if(!qs.length)return false;const sum=qs.reduce((t,q)=>t+q.contribution,0);return qs.filter(q=>Math.sign(q.contribution)===Math.sign(sum)).length/qs.length>=.75}).length/AXES.length;
  if(coherent<.6)s--;
  return {level:Math.max(1,s),gap,coherent};
}
// Face to face: statements where the match is quoted in the quiz come first, with the quiz's paraphrase;
// the rest come from the match's catalog position on that theme, marked as an estimate.
function faceToFace(r){
  const p=r.top.p,n=levelId(r)===1?3:levelId(r)===2?4:6,want={agree:Math.ceil(n*2/3),disagree:Math.floor(n/3)||1};
  const items=r.perQuestion.filter(q=>q.value!==0).map(q=>{
    const [,ax,,exA,exD]=QS[q.i];
    let side=0,line=null;
    for(const [ex,s] of [[exA,1],[exD,-1]]){const nm=ex.slice(0,ex.indexOf(": "));if(thinkerByName(nm)===p){side=s;line=ex.slice(ex.indexOf(": ")+2)}}
    const quoted=!!side;
    if(!side){const pos=p.v[ax]*q.dir;if(Math.abs(p.v[ax])<.4)return null;side=Math.sign(pos)}
    return {q,quoted,line,agree:Math.sign(q.value)===side,w:Math.abs(q.value)+(quoted?2:0)+Math.abs(p.v[ax])};
  }).filter(Boolean).sort((a,b)=>b.w-a.w);
  return {agree:items.filter(x=>x.agree).slice(0,want.agree),disagree:items.filter(x=>!x.agree).slice(0,want.disagree)};
}
// Pulling two ways: two "totally" answers on one theme that pull to opposite poles, with the thinker who
// sides with the person on each statement (from the quiz's own examples).
function tensionV2(r){
  for(const ax of AXES.map((_,i)=>i)){
    const strong=r.perQuestion.filter(q=>q.axis===ax&&Math.abs(q.value)===2);
    const a=strong.find(q=>q.contribution>0),b=strong.find(q=>q.contribution<0);
    if(a&&b)return {ax,a,b};
  }
  return null;
}
const sideWith=q=>{const ex=QS[q.i][q.value>0?3:4];return {name:ex.slice(0,ex.indexOf(": ")),line:ex.slice(ex.indexOf(": ")+2)}};
// Who stands with the person on each theme: the two strongest catalog positions on their side, the strongest on the other.
function alliesOn(ax,x){
  const side=Math.sign(x)||1,mine=PH.filter(p=>Math.sign(p.v[ax])===side).sort((a,b)=>Math.abs(b.v[ax])-Math.abs(a.v[ax])||(a.id<b.id?-1:1));
  const other=PH.filter(p=>Math.sign(p.v[ax])===-side).sort((a,b)=>Math.abs(b.v[ax])-Math.abs(a.v[ax])||(a.id<b.id?-1:1));
  return {mine:mine.slice(0,2),other:other[0]};
}
function renderResultV2(code){
  const answers=E.decode(code||"");
  if(!answers){renderNotFound("Faça o teste primeiro para ver o protótipo da nova tela.");return}
  const r=E.evaluate(answers),top=r.top,p=top.p,second=r.ranking[1],flat=r.directionless,userV=r.scores;
  const arch={...archetype(userV)};arch.name=v2Name(arch.name);const sr=selfReading(r),sh=sharpness(r),ff=faceToFace(r),ten=tensionV2(r);
  const pair=arch.poles.map(([ax,s])=>s?AXES[ax].r:AXES[ax].l);
  const nameLines=p.n.split(" ").length>2?[p.n.split(" ").slice(0,-1).join(" "),p.n.split(" ").slice(-1)[0]]:[p.n];
  const ans=q=>esc(t(SCALE[q.answer].label));
  let ideaN=0;const idea=()=>{const list=p.ideas||[];const it=list[ideaN++%Math.max(1,list.length)]||"";return it.replace(/[.;]\s*$/,"")};
  const item=x=>`<li class="ff-item"><p class="ff-q">“${esc(QS[x.q.i][0])}”</p><p class="ff-you"><b>Você:</b> ${ans(x.q)}</p><p class="ff-them"><b>${esc(shortName(p.n))}:</b> ${x.quoted?`“${esc(x.line)}” <small>(paráfrase)</small>`:`${x.agree===(x.q.value>0)?"tenderia a concordar":"tenderia a discordar"}. Uma ideia central: ${esc(idea())}. <small>(posição pelo catálogo)</small>`}</p></li>`;
  const nextN=nextLevel(r.answers.length);
  const shText=sh.level===1?`${esc(shortName(second.p.n))} está a ${sh.gap} pontos e pode passar à frente.${nextN?` Responda mais ${nextN.n-r.answers.length} frases para ver.`:""}`:sh.level===2?`${nextN?`Mais ${nextN.n-r.answers.length} frases deixam tudo mais firme.`:`O 2º colocado está a ${sh.gap} pontos.`}`:`Seu resultado é estável: o 2º colocado está a ${sh.gap} pontos.`;
  // Themes: the current axis bars (you in orange, the match as a tick), each with who stands on each side.
  const order=AXES.map((a,i)=>({a,i,x:userV[i]})).sort((u,v)=>Math.abs(v.x)-Math.abs(u.x));
  const topThree=new Set(order.slice(0,3).map(s=>s.i));
  const themes=order.map(({a,i,x})=>{const al=alliesOn(i,x),balanced=Math.abs(x)<.13;
    return `<details class="th"${topThree.has(i)?" open":""}><summary><span class="th-n">${esc(cap(a.name))}</span><span class="th-pole">${balanced?"no meio":esc(x<0?a.l:a.r)}</span></summary>
      ${axisRow(a,x,p.v[i],"você",p.n,{named:false})}
      <p>${balanced?`Você está entre ${esc(a.l)} e ${esc(a.r)}.`:esc(POLE_TEXT[i][x<0?0:1])}</p>
      ${balanced?"":`<div class="th-who"><span class="th-k">Do seu lado</span>${al.mine.map(m=>`<a href="#/p/${m.id}">${portrait(m,{cls:"th-av"})}<span>${esc(m.n)}</span></a>`).join("")}<span class="th-k">Do outro lado</span>${al.other?`<a href="#/p/${al.other.id}">${portrait(al.other,{cls:"th-av"})}<span>${esc(al.other.n)}</span></a>`:""}</div>`}
    </details>`}).join("");
  let ch=0;const chapter=title=>`<h2 class="chapter"><span>${++ch}</span>${title}</h2>`;
  mount(`
  <div class="v2-banner"><div class="wrap"><b>Protótipo</b> da nova tela de resultado (versão mesclada). A tela atual continua em <a href="#/r/${code}">#/r/…</a>. <button type="button" class="link-btn" id="v2Reveal">Ver a revelação nova</button></div></div>
  <section class="wrap res-hero">
    <div>
      <div class="res-kicker"><span class="eyebrow">Seu jeito de pensar</span></div>
      <h1 class="v2-arch">${esc(flat?L`Equilibrista`:arch.name)}</h1>
      <p class="v2-why">${flat?"Suas respostas ficaram perto do centro em todos os temas.":`Nome criado a partir dos seus 2 traços mais fortes: ${pair.map(esc).join(" e ")}.`}</p>
      <p class="v2-match-k">Você pensa parecido com</p>
      <div class="res-name v2-name">${nameLines.map(l=>`<span class="line"><span>${esc(l)}</span></span>`).join("")}</div>
      <div class="res-school">${esc(p.s)} · ${esc(lifeText(p))}</div>
      ${flat?"":`<p class="v2-pct"><b><span id="pctNum">${reduceMotion?top.pct:0}</span>%</b> de afinidade <span class="v2-second">· em 2º: ${esc(second.p.n)}, ${second.pct}%</span></p>`}
      <div class="res-actions"><button class="btn accent" type="button" id="v2Share">${icon.share} Compartilhar no story</button><button class="btn ghost" type="button" id="v2Challenge">${icon.link} Desafiar um amigo</button></div>
      ${sr.strong.length?`<div class="traits">${sr.strong.map((s,i)=>`<span class="trait" style="--i:${i}"><small>${esc(s.a.name)}</small>${esc(s.x<0?s.a.l:s.a.r)}</span>`).join("")}</div>`:""}
      <div class="v2-sharp v2-s${sh.level}"><span class="v2-meter" aria-hidden="true"><i></i><i></i><i></i></span><span><b>Nitidez do retrato: ${V2_LEVEL[sh.level-1]}.</b> ${shText}</span>${nextN?`<a class="btn ghost sm" href="#/teste/aprofundar" id="v2Deeper">Responder mais ${nextN.n-r.answers.length}</a>`:""}</div>
    </div>
    ${duo(p,{user:userV,title:`Seu perfil comparado ao de ${p.n}`})}
  </section>
  <nav class="v2-jump" aria-label="Atalhos"><span class="v2-jump-sig" aria-hidden="true">${sigil(userV,{cls:"sg-user",decorative:true})}</span><a href="#v2-retrato" data-j>Retrato</a><a href="#v2-ff" data-j>Frente a frente</a><a href="#v2-temas" data-j>Temas</a><a href="#v2-tempo" data-j>Linhagem</a><a href="#v2-ler" data-j>Ler</a><a href="#v2-comparar" data-j>Comparar</a></nav>
  <section class="wrap" style="padding-bottom:24px">
    <div id="v2-retrato" class="v2-anchor">${chapter("Seu retrato")}</div>
    <div class="panel self">
      <ul class="self-list">${sr.strong.map(s=>`<li><b>${esc(cap(s.a.name))}</b><span>${esc(POLE_TEXT[s.i][s.x<0?0:1])}</span></li>`).join("")}</ul>
      <div class="self-facts">
        <p class="self-rare${sr.kin.length<=Math.round(PH.length*.08)?" on":""}">${sr.kin.length<=Math.round(PH.length*.08)?"<b>Combinação rara.</b> ":""}${sr.kin.length} dos ${PH.length} pensadores do site têm esses ${sr.strong.length} traços${sr.kin.length?`: ${sr.kin.slice(0,3).map(k=>`<a href="#/p/${k.id}">${esc(k.n)}</a>`).join(", ")}${sr.kin.length>3?` e mais ${sr.kin.length-3}`:""}`:""}.</p>
        <p>Onde você ainda está dividido: <b>${esc(sr.torn.a.name)}</b>, entre ${esc(sr.torn.a.l)} e ${esc(sr.torn.a.r)}.</p>
      </div>
    </div>

    <div id="v2-ff" class="v2-anchor">${chapter(`Você e ${esc(shortName(p.n))}, frente a frente`)}</div>
    <div class="grid2">
      <div class="panel agree"><h2>Aqui vocês concordam</h2><ul class="ff">${ff.agree.map(item).join("")}</ul></div>
      <div class="panel agree"><h2>Aqui vocês discutiriam</h2><ul class="ff">${ff.disagree.map(item).join("")}</ul>${aboutHTML(p,{title:`Quem foi ${p.n}`}).replace('class="panel about"','class="about v2-about"')}</div>
    </div>

    <div id="v2-temas" class="v2-anchor">${chapter("Seus 11 temas")}</div>
    <div class="grid2 v2-themes">
      <div class="panel">
        <p class="sub">Cada raio é um tema: o primeiro polo fica no centro e o segundo, na borda. Laranja: você. Tracejado: ${esc(p.n)}.</p>
        <div class="panel-sigil">${sigil(userV,{compare:p.v,labels:true,cls:"sg-user",draw:true,tips:true,title:`Seu perfil nos 11 temas comparado ao de ${p.n}`})}</div>
        <p class="tip-hint"><span class="on-hover">Passe o mouse</span><span class="on-touch">Toque</span> em cada tema para ver o que ele mede e por que você ficou ali.</p>
      </div>
      <div class="panel"><h2>Quem está do seu lado</h2><p class="sub">Os 3 temas em que você é mais firme já estão abertos.</p>${themes}</div>
    </div>

    ${ten?`${chapter("Onde você puxa para dois lados")}<div class="panel">
      ${[ten.a,ten.b].map(q=>{const w=sideWith(q);return `<div class="ff-item"><p class="ff-q">“${esc(QS[q.i][0])}”</p><p class="ff-you"><b>Você:</b> ${ans(q)}</p><p class="ff-them">Aqui você fica com <b>${esc(w.name)}</b>: “${esc(w.line)}” <small>(paráfrase)</small></p></div>`}).join("")}
      <p class="sub" style="margin-top:12px">As duas respostas puxam <b>${esc(AXES[ten.ax].name)}</b> para lados opostos. Muitos filósofos discutiram exatamente isso.</p></div>`:""}

    <div id="v2-tempo" class="v2-anchor">${chapter("Sua linhagem no tempo")}</div>
    ${timelineHTML(r)}
    <div class="grid2" style="margin-top:20px">
      <div class="panel"><h2>Pensam parecido com você</h2><ul class="match-list">${r.ranking.slice(1,6).map(x=>`<li><a href="#/p/${x.p.id}">${portrait(x.p,{cls:"avatar"})}<span><span class="nm">${esc(x.p.n)}</span><span class="sc">${esc(x.p.s)}</span></span><span class="pc">${pctText(x.pct)}</span></a></li>`).join("")}</ul></div>
      <div style="display:grid;gap:20px;align-content:start">
        ${brazilHTML(r,"No Brasil, quem pensa parecido")}
        ${r.opposite?`<div class="panel"><h2>Quem mais discordaria de você</h2><a class="opp" href="#/p/${r.opposite.p.id}" style="text-decoration:none">${portrait(r.opposite.p,{cls:"opp-pic"})}<span><span class="nm">${esc(r.opposite.p.n)}</span><span class="sc muted" style="display:block;margin-top:6px">${esc(r.opposite.p.s)}</span><span class="serif it" style="display:block;font-size:20px;margin-top:10px;color:var(--ink2)">“${esc(r.opposite.p.q)}”</span></span></a></div>`:""}
      </div>
    </div>

    <div id="v2-ler" class="v2-anchor">${chapter("Por onde começar a ler")}</div>
    <div class="panel"><ol class="reads">${bookItem(p,0,p.b,"Para começar")}${(SUP.READING[p.id]||[])[0]?bookItem(p,1,SUP.READING[p.id][0],"Para ir mais fundo"):""}</ol>${affNote()}</div>

    <div id="v2-comparar" class="v2-anchor" style="margin-top:20px">${invitePanelHTML(r)}</div>

    <div class="panel v2-sec" style="margin-top:20px"><span class="eyebrow">Prévia dos cards de story</span><p class="sub">O padrão continua com o retrato e a mandala; Duelo e Temas viram opções.</p><div class="v2-cards" id="v2Cards"><p class="muted">Gerando…</p></div></div>

    <div class="finale">
      ${portrait(p,{cls:"finale-pic"})}
      <blockquote class="finale-quote">“${esc(p.q)}”</blockquote>
      <p class="finale-by">${esc(p.n)}</p>
      <p class="finale-lede">Agora descubra qual dos seus amigos pensa parecido com você.</p>
      <div class="cta-row" style="justify-content:center"><button class="btn accent" id="v2Challenge2" type="button">${icon.link} Desafiar um amigo</button></div>
    </div>
    <p class="v2-foot"><a href="#/metodo">Como calculamos</a> · <button type="button" class="link-btn" onclick="print()">Versão para imprimir</button></p>
  </section>`,`Protótipo · ${p.n}`);
  if(!flat&&!reduceMotion){
    const el=document.getElementById("pctNum"),t0=performance.now();let live=true;
    const step=now=>{if(!live)return;const x=Math.min(1,(now-t0)/1300);el.textContent=Math.round(top.pct*(1-Math.pow(1-x,3)));if(x<1)requestAnimationFrame(step)};
    requestAnimationFrame(step);const done=setTimeout(()=>{el.textContent=top.pct},1500);onLeave(()=>{live=false;clearTimeout(done)});
  }
  wireTips(app,{user:userV,r,p});wireTimeline();wireInvite(r);
  ["v2Challenge","v2Challenge2"].forEach(id=>document.getElementById(id).addEventListener("click",()=>challenge(r)));
  document.getElementById("v2Share").addEventListener("click",()=>shareV2(r));
  const dp=document.getElementById("v2Deeper");if(dp)dp.addEventListener("click",()=>track(`/evento/v2-aprofundar-${V2_LEVEL[sh.level-1]}`));
  document.getElementById("v2Reveal").addEventListener("click",()=>revealV2(r));
  app.querySelectorAll("[data-j]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();document.querySelector(a.getAttribute("href")).scrollIntoView({behavior:reduceMotion?"auto":"smooth"})}));
  v2Cards(r,ff);
  if(store.get("protoReveal")===code){store.del("protoReveal");revealV2(r)}
}
// The proposed reveal: at most 6 cards, skip always visible.
function revealV2(r){
  const p=r.top.p,arch={name:v2Name(archetype(r.scores).name)},sr=selfReading(r),{conv}=revealFacts(r),ten=tensionV2(r);
  const slides=[];
  slides.push(`<span class="rv-k">Seu jeito de pensar</span><div class="rv-sigil">${sigil(r.scores,{cls:"sg-user",labels:true,draw:true,decorative:true})}</div><h2 class="rv-h rv-arch">${esc(arch.name)}</h2><p class="rv-p rv-small">${sr.kin.length} dos ${PH.length} pensadores do site têm esses traços.</p>`);
  if(conv)slides.push(`<span class="rv-k">O que você defende com mais força</span><blockquote class="rv-q">“${esc(QS[conv.i][0])}”<cite>${esc(t(SCALE[conv.answer].label))}</cite></blockquote><p class="rv-p">${esc(POLE_TEXT[conv.axis][conv.contribution<0?0:1])}</p>`);
  if(ten){const a=sideWith(ten.a),b=sideWith(ten.b);slides.push(`<span class="rv-k">Onde você puxa para dois lados</span><h2 class="rv-h">${esc(cap(AXES[ten.ax].name))}</h2><p class="rv-p">Numa frase você ficou com <b>${esc(a.name)}</b>; em outra, com <b>${esc(b.name)}</b>.</p>`)}
  if(p.place&&p.born!==undefined)slides.push(`<span class="rv-k">Uma pista</span><h2 class="rv-h">${esc(p.place)}</h2><p class="rv-p">Viveu por volta de ${yearText(p.born+35)}.</p>`);
  slides.push(`<span class="rv-k">Você pensa parecido com…</span>${portrait(p,{cls:"rv-pic",eager:true})}<h2 class="rv-h">${esc(p.n)}</h2>${r.directionless?"":`<div class="rv-big rv-pct" data-to="${r.top.pct}">0%</div><p class="rv-p rv-small">de afinidade</p>`}`);
  slides.push(`<span class="rv-k">Mostre seu jeito de pensar</span><h2 class="rv-h rv-arch">${esc(arch.name)}</h2><div class="rv-actions"><button type="button" class="btn accent" data-a="share2">Compartilhar no story</button><button type="button" class="btn ghost" data-a="close">Ver meu resultado</button></div>`);
  openRevealSlides(r,slides,true);
}
// Story cards of the prototype: "Tipo" (default, with the portrait and the mandala), "Duelo" and "Temas".
async function v2Canvases(r,ff){
  await document.fonts.ready;
  const p=r.top.p,arch={name:v2Name(archetype(r.scores).name)},{conv}=revealFacts(r);
  const W=1080,H=1920,ink="#F1EADC",muted="#9C9283",accent="#F06A43",line="rgba(241,234,220,.16)";
  const base=()=>{const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.fillStyle="#0F0E0C";x.fillRect(0,0,W,H);const g=x.createRadialGradient(W/2,700,60,W/2,700,860);g.addColorStop(0,"rgba(240,106,67,.28)");g.addColorStop(1,"rgba(240,106,67,0)");x.fillStyle=g;x.fillRect(0,0,W,H);x.textAlign="center";return [c,x]};
  const foot=x=>{x.textAlign="center";x.fillStyle=ink;x.font="italic 400 50px 'Instrument Serif'";x.fillText("E você, pensa parecido com quem?",W/2,1560);x.font="600 34px 'Inter Tight'";const host="filosofometro",tld=`.com.br${I.prefix}`,hw=x.measureText(host).width,tw=x.measureText(tld).width;x.textAlign="left";x.fillStyle=ink;x.fillText(host,W/2-(hw+tw)/2,1620);x.fillStyle=accent;x.fillText(tld,W/2-(hw+tw)/2+hw,1620);x.textAlign="center"};
  const label=(x,s,y)=>{x.fillStyle=muted;x.font="600 28px 'Inter Tight'";x.fillText(spaced(s.toUpperCase()),W/2,y)};
  const poly=(x,cx,cy,S,v,fill,stroke,dash,lw=5)=>{x.beginPath();pts(v).forEach(([a,b],i)=>i?x.lineTo(cx+a*S,cy+b*S):x.moveTo(cx+a*S,cy+b*S));x.closePath();x.setLineDash(dash||[]);if(fill){x.fillStyle=fill;x.fill()}x.strokeStyle=stroke;x.lineWidth=lw;x.lineJoin="round";x.stroke();x.setLineDash([])};
  const badge=(x,cx,cy,S)=>{x.beginPath();x.arc(cx,cy,R*S+22,0,Math.PI*2);x.fillStyle="rgba(21,19,15,.92)";x.fill();x.strokeStyle=line;x.lineWidth=2;x.stroke();[.33,.66,1].forEach(f=>{x.beginPath();x.arc(cx,cy,R*(.16+.84*f)*S,0,Math.PI*2);x.strokeStyle=line;x.lineWidth=1.5;x.stroke()});poly(x,cx,cy,S,p.v,null,"rgba(241,234,220,.8)",[8,9],3.5);poly(x,cx,cy,S,r.scores,"rgba(240,106,67,.22)",accent,null,4)};
  const out=[];
  const pic=p.img?await loadImage(p.img):null;
  // 1. Tipo: the current identity (arch portrait with the mandala) under the archetype.
  {const [c,x]=base();label(x,"Meu jeito de pensar",300);
   x.fillStyle=accent;x.font="italic 400 92px 'Instrument Serif'";const words=arch.name.split(" ");const l1=words[0],l2=words.slice(1).join(" ");x.fillText(l1,W/2,410);x.fillText(l2,W/2,500);
   const aw=330,ah=420,ax=(W-aw)/2-60,ay=560,rad=aw/2;
   const archP=()=>{x.beginPath();x.moveTo(ax,ay+rad);x.arc(ax+rad,ay+rad,rad,Math.PI,0);x.lineTo(ax+aw,ay+ah-24);x.quadraticCurveTo(ax+aw,ay+ah,ax+aw-24,ay+ah);x.lineTo(ax+24,ay+ah);x.quadraticCurveTo(ax,ay+ah,ax,ay+ah-24);x.closePath()};
   x.save();archP();x.clip();if(pic){const sc=Math.max(aw/pic.width,ah/pic.height),dw=pic.width*sc,dh=pic.height*sc;x.filter="grayscale(1) sepia(.22) contrast(1.08) brightness(.97)";x.drawImage(pic,ax+(aw-dw)/2,ay+(ah-dh)*.2,dw,dh);x.filter="none";const tint=x.createLinearGradient(0,ay+ah*.45,0,ay+ah);tint.addColorStop(0,"rgba(240,106,67,0)");tint.addColorStop(1,"rgba(240,106,67,.45)");x.globalCompositeOperation="multiply";x.fillStyle=tint;x.fillRect(ax,ay,aw,ah);x.globalCompositeOperation="source-over"}else{x.fillStyle="#1D1A16";x.fillRect(ax,ay,aw,ah)}x.restore();x.strokeStyle=line;x.lineWidth=2;archP();x.stroke();
   badge(x,ax+aw+40,ay+ah-130,1.25);
   x.fillStyle=ink;x.font="400 54px 'Instrument Serif'";x.fillText(`Penso parecido com ${shortName(p.n)}${r.directionless?"":` · ${r.top.pct}%`}`,W/2,1080);
   if(conv){label(x,"O que eu defendo com mais força",1180);x.fillStyle=ink;x.font="italic 400 44px 'Instrument Serif'";wrapText(x,`“${QS[conv.i][0]}”`,W/2,1250,880,54)}
   foot(x);out.push(["Tipo",c])}
  // 2. Duelo: one statement where the person agrees with the match, in the match's words when the quiz quotes them.
  {const it=(ff.agree.find(i=>i.quoted)||ff.agree[0]);const [c,x]=base();label(x,`Eu e ${shortName(p.n)}`,300);
   if(it){x.fillStyle=ink;x.font="400 66px 'Instrument Serif'";let y=wrapText(x,`“${QS[it.q.i][0]}”`,W/2,480,900,78);
    x.fillStyle=accent;x.font="600 34px 'Inter Tight'";x.fillText(`EU: ${t(SCALE[it.q.answer].label).toUpperCase()}`,W/2,y+110);
    x.fillStyle=ink;x.font="italic 400 50px 'Instrument Serif'";y=wrapText(x,it.quoted?`${shortName(p.n)}: “${it.line}”`:`${shortName(p.n)} pensava parecido.`,W/2,y+230,880,62);
    if(it.quoted){x.fillStyle=muted;x.font="500 28px 'Inter Tight'";x.fillText("(paráfrase)",W/2,y+56)}}
   badge(x,W/2,1300,1.05);x.fillStyle=accent;x.font="italic 400 56px 'Instrument Serif'";x.fillText(arch.name,W/2,1470);foot(x);out.push(["Duelo",c])}
  // 3. Temas: the three strongest themes as rulers, you in orange and the match as a ring.
  {const [c,x]=base();label(x,"Meus temas mais fortes",300);
   const st=AXES.map((a,i)=>({a,i,s:Math.abs(r.scores[i])})).sort((m,n)=>n.s-m.s).slice(0,3),bx0=360,bx1=720,pos=v=>bx0+(Math.max(-1,Math.min(1,v))+1)/2*(bx1-bx0);
   st.forEach(({a,i},k)=>{const by=520+k*180,me=r.scores[i];x.textAlign="center";x.fillStyle=muted;x.font="600 28px 'Inter Tight'";x.fillText(a.name.toUpperCase(),W/2,by-50);x.font="600 40px 'Inter Tight'";x.textAlign="right";x.fillStyle=me<0?ink:muted;x.fillText(a.l,bx0-30,by+14);x.textAlign="left";x.fillStyle=me>0?ink:muted;x.fillText(a.r,bx1+30,by+14);x.fillStyle=line;x.fillRect(bx0,by-2,bx1-bx0,4);x.beginPath();x.arc(pos(p.v[i]),by,17,0,Math.PI*2);x.strokeStyle=ink;x.lineWidth=4;x.stroke();x.beginPath();x.arc(pos(me),by,16,0,Math.PI*2);x.fillStyle=accent;x.fill()});
   x.textAlign="center";badge(x,W/2,1170,1);x.fillStyle=accent;x.font="italic 400 64px 'Instrument Serif'";x.fillText(arch.name,W/2,1390);x.fillStyle=ink;x.font="400 44px 'Instrument Serif'";x.fillText(`Penso parecido com ${shortName(p.n)}`,W/2,1460);foot(x);out.push(["Temas",c])}
  return out;
}
// Comparison card of the prototype: no percentage; how many themes match and the biggest argument.
function v2CompareCanvas(a,b,nameA,nameB){
  const W=1080,H=1920,ink="#F1EADC",muted="#9C9283",accent="#F06A43",line="rgba(241,234,220,.16)";
  const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.fillStyle="#0F0E0C";x.fillRect(0,0,W,H);
  const g=x.createRadialGradient(W/2,760,60,W/2,760,820);g.addColorStop(0,"rgba(240,106,67,.28)");g.addColorStop(1,"rgba(240,106,67,0)");x.fillStyle=g;x.fillRect(0,0,W,H);x.textAlign="center";
  const same=AXES.filter((_,i)=>Math.sign(a.scores[i])===Math.sign(b.scores[i])&&Math.abs(a.scores[i])>=.13&&Math.abs(b.scores[i])>=.13).length;
  const far=AXES.map((ax,i)=>({ax,d:Math.abs(a.scores[i]-b.scores[i])})).sort((u,v)=>v.d-u.d)[0].ax;
  x.fillStyle=muted;x.font="600 28px 'Inter Tight'";x.fillText(spaced("NOSSOS JEITOS DE PENSAR"),W/2,300);
  x.fillStyle=ink;x.font="400 80px 'Instrument Serif'";x.fillText(`${nameA} & ${nameB}`,W/2,400);
  const cx=W/2,cy=740,S=2.3;[.33,.66,1].forEach(f=>{x.beginPath();x.arc(cx,cy,R*(.16+.84*f)*S,0,Math.PI*2);x.strokeStyle=line;x.lineWidth=2;x.stroke()});
  const poly=(v,fill,stroke,dash)=>{x.beginPath();pts(v).forEach(([u,w],i)=>i?x.lineTo(cx+u*S,cy+w*S):x.moveTo(cx+u*S,cy+w*S));x.closePath();x.setLineDash(dash||[]);if(fill){x.fillStyle=fill;x.fill()}x.strokeStyle=stroke;x.lineWidth=5;x.lineJoin="round";x.stroke();x.setLineDash([])};
  poly(b.scores,null,"rgba(241,234,220,.85)",[14,12]);poly(a.scores,"rgba(240,106,67,.24)",accent);
  x.fillStyle=accent;x.font="400 120px 'Instrument Serif'";x.fillText(`${same} de 11`,W/2,1150);
  x.fillStyle=ink;x.font="400 50px 'Instrument Serif'";x.fillText("temas em que concordamos",W/2,1220);
  x.fillStyle=muted;x.font="600 26px 'Inter Tight'";x.fillText(spaced("NOSSA MAIOR BRIGA"),W/2,1320);
  x.fillStyle=ink;x.font="italic 400 56px 'Instrument Serif'";x.fillText(`${far.l} × ${far.r}`,W/2,1390);
  x.fillStyle=accent;x.font="italic 400 38px 'Instrument Serif'";x.fillText(`${v2Name(archetype(a.scores).name)}  ·  ${v2Name(archetype(b.scores).name)}`,W/2,1470);
  x.fillStyle=ink;x.font="italic 400 50px 'Instrument Serif'";x.fillText("Faça o teste e compare",W/2,1570);
  x.font="600 34px 'Inter Tight'";x.fillStyle=accent;x.fillText(`filosofometro.com.br${I.prefix}`,W/2,1630);
  return c;
}
async function v2Cards(r,ff){
  const host=document.getElementById("v2Cards");if(!host)return;
  const cards=await v2Canvases(r,ff);
  // A sample friend for the comparison card preview: the same answers mirrored on every other theme.
  const friend=E.evaluate(r.answers.map((v,i)=>QS[i][1]%2?4-v:v));
  cards.push(["Comparação (exemplo)",v2CompareCanvas(r,friend,"Você","Ana")]);
  host.innerHTML=cards.map(([n,c])=>`<figure><img src="${c.toDataURL("image/jpeg",.85)}" alt="Card ${n}" loading="lazy"><figcaption>${n}</figcaption></figure>`).join("");
}
// Share flow of the prototype: pick a card, then share or save it.
async function shareV2(r){
  track("/evento/v2-compartilhar");
  const ff=faceToFace(r),cards=await v2Canvases(r,ff);
  const d=document.createElement("div");d.className="story-modal";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label","Escolha o card");
  d.innerHTML=`<div class="sm-card v2-pick"><h2 class="serif">Escolha o card</h2><div class="v2-pick-row">${cards.map(([n,c],i)=>`<button type="button" class="v2-pick-b${i?"":" on"}" data-i="${i}"><img src="${c.toDataURL("image/jpeg",.7)}" alt="Card ${n}"><span>${n}</span></button>`).join("")}</div><div class="sm-actions"><button type="button" class="btn accent" data-a="go">${icon.share} Compartilhar</button><button type="button" class="btn ghost" data-a="x">Fechar</button></div></div>`;
  document.body.appendChild(d);let pick=0;
  d.addEventListener("click",async e=>{
    if(e.target===d){d.remove();return}
    const b=e.target.closest(".v2-pick-b");if(b){pick=+b.dataset.i;d.querySelectorAll(".v2-pick-b").forEach(x=>x.classList.toggle("on",x===b));return}
    const a=e.target.closest("[data-a]");if(!a)return;
    if(a.dataset.a==="x"){d.remove();return}
    const [name,c]=cards[pick];track(`/evento/v2-card-${name.toLowerCase()}`);
    const blob=await new Promise(res=>c.toBlob(res,"image/jpeg",.92));const file=new File([blob],`filosofometro-${name.toLowerCase()}.jpg`,{type:"image/jpeg"});
    d.remove();
    if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],text:challengeText(r),url:inviteURL(r)});return}catch(err){if(err.name==="AbortError")return}}
    storyModal(c,blob,file,challengeText(r),inviteURL(r));
  });
}

function renderNotFound(msg=L`Esta página não existe.`){
  mount(`<section class="wrap section"><span class="eyebrow">${L`Ops`}</span><h1 class="h2">${esc(msg)}</h1><div class="cta-row" style="margin-top:32px"><a class="btn accent" href="#/">${L`Ir para o início`} ${icon.arrow}</a></div></section>`,L`Não encontrado`);
}

/* ---------- Support ---------- */
// Pix donations: QR code and "copia e cola" built from SUPPORT in support.js. The QR library loads only here.
function renderSupport(){
  if(!HAS_PIX)return renderNotFound(L`A página de apoio ainda não está ativa.`);
  const code=SUP.pixPayload();
  mount(`
  <section class="wrap section support" style="padding-top:clamp(32px,6vh,64px)">
    <span class="eyebrow">Apoie</span>
    <h1 class="h2" style="font-size:clamp(48px,7.5vw,104px)">Mantenha o <em class="it accent">Filosofômetro</em> no ar</h1>
    <p class="lede">O teste é gratuito, sem anúncios e sem cadastro. Se ele te fez pensar, qualquer valor ajuda a pagar a hospedagem e a trazer novos pensadores.</p>
    <div class="grid2" style="margin-top:32px">
      <div class="panel pix">
        <h2>Pix</h2><p class="sub">Aponte a câmera do app do banco, ou copie o código.</p>
        <div class="pix-qr" id="pixQr" role="img" aria-label="QR Code do Pix"></div>
        <div class="cta-row"><button class="btn accent" type="button" id="pixCopy">Copiar Pix copia e cola</button></div>
        <p class="muted pix-key">Chave: <span class="mono">${esc(SUP.SUPPORT.pixKey)}</span>${SUP.SUPPORT.pixName?` · ${esc(SUP.SUPPORT.pixName)}`:""}</p>
      </div>
      <div class="panel">
        <h2>Outra forma de ajudar</h2>
        <p class="sub">Cada pensador tem três livros indicados.${SUP.SUPPORT.amazonTag?" Comprando por esses links, a Amazon repassa uma pequena comissão, sem custo a mais para você.":""}</p>
        <div class="cta-row"><a class="btn ghost" href="#/pensadores">Ver os pensadores ${icon.arrow}</a></div>
      </div>
    </div>
  </section>`,"Apoie");
  document.getElementById("pixCopy").onclick=async()=>{
    try{await navigator.clipboard.writeText(code);toast(L`Código Pix copiado. Cole no app do banco.`,3200);track("/evento/pix-copiado")}catch(e){prompt("Copie o código Pix:",code)}
  };
  const draw=()=>{
    const host=document.getElementById("pixQr");if(!host||!window.qrcode)return;
    const qr=qrcode(0,"M");qr.addData(code);qr.make();
    const n=qr.getModuleCount();let d="";
    for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c))d+=`M${c+4} ${r+4}h1v1h-1z`;
    host.innerHTML=`<svg viewBox="0 0 ${n+8} ${n+8}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111"/></svg>`;
  };
  if(window.qrcode)draw();
  else{const s=document.createElement("script");s.src="vendor/qrcode.js";s.onload=draw;document.head.appendChild(s)}
}

/* ---------- Share ---------- */
function toast(t,ms=2200){const el=document.getElementById("toast");el.textContent=t;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),ms)}
async function copyLink(){
  try{await navigator.clipboard.writeText(location.href);toast(L`Link copiado`)}
  catch(e){prompt(L`Copie o link:`,location.href)}
}
async function shareCard(r,usePic=true){
  if(usePic)track("/evento/story");
  await document.fonts.ready;
  const W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d"),p=r.top.p;
  const bg="#0F0E0C",ink="#F1EADC",muted="#9C9283",accent="#F06A43",line="rgba(241,234,220,.16)";
  const near=r.ranking.slice(1,4);
  const pics=usePic?await Promise.all([p].map(t=>t.img?loadImage(t.img):Promise.resolve(null))):[];
  const [pic]=pics;
  // Background: deep ink with a warm glow behind the portrait.
  x.fillStyle=bg;x.fillRect(0,0,W,H);
  const g=x.createRadialGradient(W/2,640,60,W/2,640,860);g.addColorStop(0,"rgba(240,106,67,.30)");g.addColorStop(1,"rgba(240,106,67,0)");
  x.fillStyle=g;x.fillRect(0,0,W,H);
  x.textAlign="center";
  const flat=r.directionless;
  // Instagram covers about the top and bottom 250px of a story, so everything that matters stays between 270 and 1650.
  x.fillStyle=muted;x.font="600 28px 'Inter Tight'";x.fillText(spaced(flat?L`MEU PAR MAIS PRÓXIMO`:L`MEU ARQUÉTIPO`),W/2,300);
  if(!flat){x.fillStyle=accent;x.font="italic 400 58px 'Instrument Serif'";const an=archetype(r.scores).name;if(x.measureText(an).width>960)x.font="italic 400 46px 'Instrument Serif'";x.fillText(an,W/2,366)}
  // Portrait arch with the sigil badge over its corner.
  // A name that wraps to two lines takes the room from the portrait, so the axis rulers still fit.
  x.font="400 86px 'Instrument Serif'";const nameLines=lineCount(x,p.n,960);
  // A rare combination of traits earns one more line under the rulers; the portrait gives up the room.
  const sr=selfReading(r),rare=!flat&&sr.strong.length===3&&sr.kin.length<=Math.round(PH.length*.08);
  const rareText=rare?(sr.kin.length?L`Só ${sr.kin.length} de ${PH.length} pensadores pensam como eu nesses 3 eixos`:L`Nenhum dos ${PH.length} pensadores pensa como eu nesses 3 eixos`):"";
  const aw=380,ax=(W-aw)/2,ay=flat?336:400,ah=(nameLines>1?300:350)-(flat&&rare?66:0),rad=aw/2;
  const arch=()=>{x.beginPath();x.moveTo(ax,ay+rad);x.arc(ax+rad,ay+rad,rad,Math.PI,0);x.lineTo(ax+aw,ay+ah-26);x.quadraticCurveTo(ax+aw,ay+ah,ax+aw-26,ay+ah);x.lineTo(ax+26,ay+ah);x.quadraticCurveTo(ax,ay+ah,ax,ay+ah-26);x.closePath()};
  x.save();arch();x.clip();
  if(pic){
    const sc=Math.max(aw/pic.width,ah/pic.height),dw=pic.width*sc,dh=pic.height*sc;
    x.filter="grayscale(1) sepia(.22) contrast(1.08) brightness(.97)";x.drawImage(pic,ax+(aw-dw)/2,ay+(ah-dh)*.2,dw,dh);x.filter="none";
    const tint=x.createLinearGradient(0,ay+ah*.45,0,ay+ah);tint.addColorStop(0,"rgba(240,106,67,0)");tint.addColorStop(1,"rgba(240,106,67,.45)");
    x.globalCompositeOperation="multiply";x.fillStyle=tint;x.fillRect(ax,ay,aw,ah);x.globalCompositeOperation="source-over";
  }else{x.fillStyle="#1D1A16";x.fillRect(ax,ay,aw,ah);x.fillStyle=muted;x.font="400 140px 'Instrument Serif'";x.fillText(initials(p.n),W/2,ay+ah/2+46)}
  x.restore();
  x.strokeStyle=line;x.lineWidth=2;arch();x.stroke();
  // Badge sits on the arch's lower right, clear of the percentage below it.
  const cx=ax+aw+6,cy=ay+ah-120,S=1.15;
  x.beginPath();x.arc(cx,cy,R*S+22,0,Math.PI*2);x.fillStyle="rgba(21,19,15,.92)";x.fill();x.strokeStyle=line;x.stroke();
  [.33,.66,1].forEach(f=>{x.beginPath();x.arc(cx,cy,R*(.16+.84*f)*S,0,Math.PI*2);x.strokeStyle=line;x.lineWidth=1.5;x.stroke()});
  const poly=(v,fill,stroke,dash)=>{x.beginPath();pts(v).forEach(([a,b],i)=>i?x.lineTo(cx+a*S,cy+b*S):x.moveTo(cx+a*S,cy+b*S));x.closePath();x.setLineDash(dash||[]);if(fill){x.fillStyle=fill;x.fill()}x.strokeStyle=stroke;x.lineWidth=3.5;x.stroke();x.setLineDash([])};
  poly(p.v,null,"rgba(241,234,220,.8)",[8,9]);
  poly(r.scores,"rgba(240,106,67,.22)",accent);
  // Headline: percent (or a word when the profile has no direction), name, line and years.
  let y=ay+ah+122;
  x.fillStyle=accent;
  if(flat){x.font="italic 400 104px 'Instrument Serif'";x.fillText(L`Equilíbrio`,W/2,y-6)}
  else{x.font="400 140px 'Instrument Serif'";x.fillText(r.top.pct+"%",W/2,y)}
  x.fillStyle=ink;x.font="400 86px 'Instrument Serif'";y=wrapText(x,p.n,W/2,y+88,960,86);
  x.fillStyle=muted;x.font="600 28px 'Inter Tight'";x.fillText(`${p.s} · ${lifeText(p)}`.toUpperCase(),W/2,y+54);
  y+=54;
  // The three axes where the person leans hardest, each as a labeled ruler: axis name, both poles,
  // the person's mark (filled, accent) and the match's mark (ring), so the card explains itself.
  const strong=AXES.map((a,i)=>({a,i,s:Math.abs(r.scores[i])})).sort((m,n)=>n.s-m.s).slice(0,3);
  const ry=y+66;
  x.font="500 30px 'Inter Tight'";
  const me0=L`eu`,youW=x.measureText(me0).width,parName=shortName(p.n),parW=x.measureText(parName).width;
  const legW=22+10+youW+40+22+10+parW;let lx=W/2-legW/2;
  x.beginPath();x.arc(lx+11,ry-9,10,0,Math.PI*2);x.fillStyle=accent;x.fill();
  x.textAlign="left";x.fillStyle=ink;x.fillText(me0,lx+32,ry);lx+=32+youW+40;
  x.beginPath();x.arc(lx+11,ry-9,9,0,Math.PI*2);x.strokeStyle=ink;x.lineWidth=3;x.stroke();
  x.fillStyle=ink;x.fillText(parName,lx+32,ry);
  const bx0=380,bx1=700,pos=v=>bx0+(Math.max(-1,Math.min(1,v))+1)/2*(bx1-bx0);
  strong.forEach(({a,i},k)=>{
    const by=ry+84+k*74,me=r.scores[i],par=p.v[i];
    x.textAlign="center";x.fillStyle=muted;x.font="600 25px 'Inter Tight'";x.fillText(spaced(a.name.toUpperCase()),W/2,by-28);
    x.font="600 35px 'Inter Tight'";
    x.textAlign="right";x.fillStyle=me<0?ink:muted;x.fillText(a.l,bx0-26,by+11);
    x.textAlign="left";x.fillStyle=me>0?ink:muted;x.fillText(a.r,bx1+26,by+11);
    x.fillStyle=line;x.fillRect(bx0,by-1,bx1-bx0,3);x.fillRect(W/2-1,by-10,3,21);
    x.beginPath();x.arc(pos(par),by,13,0,Math.PI*2);x.strokeStyle=ink;x.lineWidth=3;x.stroke();
    x.beginPath();x.arc(pos(me),by,12,0,Math.PI*2);x.fillStyle=accent;x.fill();
  });
  x.textAlign="center";
  if(rare){x.fillStyle=accent;x.font="italic 400 40px 'Instrument Serif'";x.fillText(rareText,W/2,ry+84+2*74+80)}
  // Also think like: three runner-ups with portraits.
  const nl=ry+84+2*74+70+(rare?66:0);
  x.fillStyle=muted;x.font="600 26px 'Inter Tight'";x.fillText(spaced(L`TAMBÉM PENSO COMO`),W/2,nl);
  // One line of names keeps room for the portrait, the archetype and the rarity line.
  x.font="400 40px 'Instrument Serif'";
  const nearText=near.map(n=>`${shortName(n.p.n)}${n.pct!==null?` ${n.pct}%`:""}`).join("  ·  ");
  if(x.measureText(nearText).width>980)x.font="400 32px 'Instrument Serif'";
  x.fillStyle=ink;x.fillText(nearText,W/2,nl+56);
  // Sign-off: the question in the display serif, then the address with the brand dot in accent.
  const sy=Math.min(nl+150,1574);
  x.fillStyle=ink;x.font="italic 400 56px 'Instrument Serif'";x.fillText(L`Qual filósofo pensa como você?`,W/2,sy);
  x.font="600 36px 'Inter Tight'";
  const host="filosofometro",tld=`.com.br${I.prefix}`,hw=x.measureText(host).width,tw=x.measureText(tld).width;
  x.textAlign="left";x.fillStyle=ink;x.fillText(host,W/2-(hw+tw)/2,sy+58);x.fillStyle=accent;x.fillText(tld,W/2-(hw+tw)/2+hw,sy+58);x.textAlign="center";
  // A portrait served without CORS taints the canvas; redraw without images rather than fail.
  let blob;
  try{blob=await new Promise((res,rej)=>{try{c.toBlob(b=>b?res(b):rej(new Error("empty")),"image/jpeg",.92)}catch(e){rej(e)}})}
  catch(e){if(usePic)return shareCard(r,false);toast(L`Não foi possível gerar a imagem`);return}
  const file=new File([blob],`filosofometro-${p.id}.jpg`,{type:"image/jpeg"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],text:challengeText(r),url:inviteURL(r)});return}catch(e){if(e.name==="AbortError")return}
  }
  // No native share sheet (most desktops): show the picture with the ways to take it.
  storyModal(c,blob,file,challengeText(r),inviteURL(r));
}
// The comparison as a story: both names, both mandalas on one wheel, the score, the verdict, and where
// the two agree and will argue, so friends who see it want to measure their own pair.
async function compareCard(cmp,nameA,nameB,close,far,verdict,url){
  track("/evento/story-comparacao");
  await document.fonts.ready;
  const W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d");
  const bg="#0F0E0C",ink="#F1EADC",muted="#9C9283",accent="#F06A43",line="rgba(241,234,220,.16)";
  x.fillStyle=bg;x.fillRect(0,0,W,H);
  const g=x.createRadialGradient(W/2,780,60,W/2,780,820);g.addColorStop(0,"rgba(240,106,67,.28)");g.addColorStop(1,"rgba(240,106,67,0)");
  x.fillStyle=g;x.fillRect(0,0,W,H);
  x.textAlign="center";
  // Everything that matters stays between 270 and 1650, outside what Instagram covers.
  x.fillStyle=muted;x.font="600 28px 'Inter Tight'";x.fillText(spaced(L`COMPATIBILIDADE FILOSÓFICA`),W/2,308);
  x.fillStyle=ink;x.font="400 84px 'Instrument Serif'";
  const pair=`${nameB} & ${nameA}`;
  if(x.measureText(pair).width>960)x.font="400 64px 'Instrument Serif'";
  x.fillText(pair,W/2,410);
  // One wheel, two shapes: B in accent, A dashed.
  const cx=W/2,cy=760,S=2.5;
  x.beginPath();x.arc(cx,cy,R*S+26,0,Math.PI*2);x.fillStyle="rgba(21,19,15,.9)";x.fill();x.strokeStyle=line;x.lineWidth=2;x.stroke();
  [.33,.66,1].forEach(f=>{x.beginPath();x.arc(cx,cy,R*(.16+.84*f)*S,0,Math.PI*2);x.strokeStyle=line;x.lineWidth=1.5;x.stroke()});
  AXES.forEach((_,i)=>{x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(angle(i))*R*S,cy+Math.sin(angle(i))*R*S);x.strokeStyle=line;x.lineWidth=1.5;x.stroke()});
  const poly=(v,fill,stroke,dash)=>{x.beginPath();pts(v).forEach(([a,b],i)=>i?x.lineTo(cx+a*S,cy+b*S):x.moveTo(cx+a*S,cy+b*S));x.closePath();x.setLineDash(dash||[]);if(fill){x.fillStyle=fill;x.fill()}x.strokeStyle=stroke;x.lineWidth=5;x.lineJoin="round";x.stroke();x.setLineDash([])};
  poly(cmp.a.scores,null,"rgba(241,234,220,.85)",[14,12]);
  poly(cmp.b.scores,"rgba(240,106,67,.24)",accent);
  // Legend: who is which shape.
  x.font="500 30px 'Inter Tight'";
  const wB=x.measureText(nameB).width,wA=x.measureText(nameA).width,legW=44+14+wB+48+44+14+wA;let lx=W/2-legW/2;const ly=1080;
  x.fillStyle=accent;x.fillRect(lx,ly-12,44,6);x.textAlign="left";x.fillStyle=ink;x.fillText(nameB,lx+58,ly);lx+=58+wB+48;
  x.setLineDash([10,8]);x.beginPath();x.moveTo(lx,ly-9);x.lineTo(lx+44,ly-9);x.strokeStyle=ink;x.lineWidth=5;x.stroke();x.setLineDash([]);
  x.fillText(nameA,lx+58,ly);x.textAlign="center";
  // Score and verdict.
  x.fillStyle=accent;
  if(cmp.pct===null){x.font="italic 400 100px 'Instrument Serif'";x.fillText(L`Sem direção`,W/2,1230)}
  else{x.font="400 150px 'Instrument Serif'";x.fillText(`${cmp.pct}%`,W/2,1240)}
  x.fillStyle=ink;x.font="italic 400 44px 'Instrument Serif'";const vy=wrapText(x,verdict,W/2,1310,900,52);
  // Where they meet and where they will argue: two columns of axis names.
  const col=(title,rows,cxx,y0,pick)=>{x.fillStyle=muted;x.font="600 22px 'Inter Tight'";x.fillText(spaced(title),cxx,y0);
    rows.slice(0,2).forEach((rw,k)=>{x.fillStyle=ink;x.font="400 44px 'Instrument Serif'";x.fillText(pick(rw),cxx,y0+58+k*52)})};
  const ty=Math.max(vy+80,1410);
  col(L`CONCORDAMOS EM`,close,W/2-240,ty,rw=>cap(AXES[rw.ax].name));
  col(L`VAMOS DISCUTIR`,far,W/2+240,ty,rw=>cap(AXES[rw.ax].name));
  x.fillStyle=line;x.fillRect(W/2-1,ty-24,2,140);
  // Sign-off.
  x.fillStyle=ink;x.font="italic 400 52px 'Instrument Serif'";x.fillText(L`Quanto você pensa como seus amigos?`,W/2,1592);
  x.font="600 34px 'Inter Tight'";
  const host="filosofometro",tld=`.com.br${I.prefix}`,hw=x.measureText(host).width,tw=x.measureText(tld).width;
  x.textAlign="left";x.fillStyle=ink;x.fillText(host,W/2-(hw+tw)/2,1644);x.fillStyle=accent;x.fillText(tld,W/2-(hw+tw)/2+hw,1644);x.textAlign="center";
  const blob=await new Promise(res=>c.toBlob(b=>res(b),"image/jpeg",.92));
  if(!blob){toast(L`Não foi possível gerar a imagem`);return}
  const file=new File([blob],"filosofometro-comparacao.jpg",{type:"image/jpeg"});
  const text=cmp.pct===null?L`Comparamos nosso jeito de pensar no Filosofômetro. Faz o teste e compara com a gente:`:L`Deu ${cmp.pct}% de compatibilidade filosófica no Filosofômetro. Faz o teste e vê quanto você pensa como a gente:`;
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],text,url});return}catch(e){if(e.name==="AbortError")return}
  }
  storyModal(c,blob,file,text,url);
}
// Button state while the picture is drawn, so a slow first run (fonts, portraits) never looks like a dead click.
async function shareFlow(r){
  if(shareFlow.busy)return;
  shareFlow.busy=true;
  const bs=["shareBtn","shareBtn2"].map(id=>document.getElementById(id)).filter(Boolean),saved=bs.map(b=>b.innerHTML);
  bs.forEach(b=>{b.disabled=true;b.setAttribute("aria-busy","true");b.innerHTML=`<span class="spin" aria-hidden="true"></span> ${L`Gerando imagem…`}`});
  try{await shareCard(r)}finally{shareFlow.busy=false;bs.forEach((b,i)=>{b.disabled=false;b.removeAttribute("aria-busy");b.innerHTML=saved[i]})}
}
// Fonts and portraits for the card are fetched while the person reads, so the click answers at once.
function warmShare(r){
  const go=()=>{try{["400 40px 'Instrument Serif'","italic 400 40px 'Instrument Serif'","600 28px 'Inter Tight'","500 28px 'Inter Tight'"].forEach(f=>document.fonts.load(f));[r.top.p,...r.ranking.slice(1,4).map(n=>n.p)].forEach(t=>{if(t.img)loadImage(t.img)})}catch(e){}};
  if(window.requestIdleCallback)requestIdleCallback(go,{timeout:2500});else setTimeout(go,1200);
}
// Phones: once the hero buttons scroll away, a slim bar keeps share and challenge in thumb reach until the finale.
function stickyShare(){
  if(!window.IntersectionObserver)return;
  const acts=app.querySelector(".res-actions"),fin=app.querySelector(".finale");
  if(!acts)return;
  const bar=document.createElement("div");bar.className="res-sticky";
  bar.innerHTML=`<button type="button" class="btn accent sm" data-t="shareBtn">${icon.share} ${L`Compartilhar no story`}</button><button type="button" class="btn ghost sm" data-t="challengeBtn">${icon.link} ${L`Desafiar um amigo`}</button>`;
  bar.addEventListener("click",e=>{const b=e.target.closest("button");const t=b&&document.getElementById(b.dataset.t);if(t)t.click()});
  document.body.appendChild(bar);
  let a=true,f=false;const upd=()=>bar.classList.toggle("on",!a&&!f);
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.target===acts)a=e.isIntersecting;else f=e.isIntersecting;upd()}));
  io.observe(acts);if(fin)io.observe(fin);
  onLeave(()=>{io.disconnect();bar.remove()});
}
function storyModal(c,blob,file,text,url){
  const prev=document.activeElement,d=document.createElement("div");
  d.className="story-modal";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-label",L`Imagem do story`);
  const canCopy=!!(navigator.clipboard&&window.ClipboardItem);
  d.innerHTML=`<div class="sm-card"><div class="sm-pic"></div><div class="sm-side"><h2 class="serif">${L`Imagem do story`}</h2><p class="muted">${L`Poste no story e cole o link do convite no adesivo de link.`}</p><div class="sm-actions"><button type="button" class="btn accent" data-a="dl">${L`Baixar imagem`}</button>${canCopy?`<button type="button" class="btn ghost" data-a="img">${L`Copiar imagem`}</button>`:""}<button type="button" class="btn ghost" data-a="link">${icon.link} ${L`Copiar link do convite`}</button><button type="button" class="btn ghost" data-a="x">${L`Fechar`}</button></div></div></div>`;
  c.className="sm-canvas";c.setAttribute("role","img");c.setAttribute("aria-label",L`Imagem do story`);
  d.querySelector(".sm-pic").appendChild(c);
  const close=()=>{document.removeEventListener("keydown",key);d.remove();if(prev&&prev.focus)prev.focus()};
  const key=e=>{if(e.key==="Escape")close()};
  document.addEventListener("keydown",key);
  d.addEventListener("click",async e=>{
    if(e.target===d){close();return}
    const a=e.target.closest("button");if(!a)return;
    if(a.dataset.a==="x")close();
    else if(a.dataset.a==="dl"){const l=document.createElement("a");l.href=URL.createObjectURL(blob);l.download=file.name;l.click();setTimeout(()=>URL.revokeObjectURL(l.href),2000);toast(L`Imagem salva. Poste no story e cole o link do convite!`)}
    else if(a.dataset.a==="img"){try{// The clipboard takes PNG only; the shared file is a lighter JPEG.
      const png=await new Promise(res=>c.toBlob(b=>res(b),"image/png"));await navigator.clipboard.write([new ClipboardItem({"image/png":png})]);toast(L`Imagem copiada`)}catch(err){toast(L`Não foi possível copiar a imagem`)}}
    else if(a.dataset.a==="link"){try{await navigator.clipboard.writeText(`${text} ${url}`);toast(L`Convite copiado. Agora é só mandar!`)}catch(err){prompt(L`Copie o convite:`,url)}}
  });
  document.body.appendChild(d);
  d.querySelector("button").focus();
}
// Canvas helpers for the story card.
const spaced=s=>s.split("").join(" ");
const initials=n=>n.split(" ").filter(w=>/^[A-ZÀ-Ý]/.test(w)).slice(0,2).map(w=>w[0]).join("");
// Short names for tight spots (story card, home tiles). The last word works for most names; these do not:
// compound surnames, particles and the way each person is actually known in their own language.
const SHORT={"mario-ferreira-dos-santos":"Mário Ferreira","la-mettrie":"La Mettrie","viveiros-de-castro":"Viveiros de Castro","lima-vaz":"Lima Vaz",
  "abdias-do-nascimento":"Abdias","nise-da-silveira":"Nise da Silveira","newton-da-costa":"Newton da Costa","oswald-de-andrade":"Oswald de Andrade","antonio-vieira":"Padre Vieira",
  "w-e-b-du-bois":"Du Bois","martin-luther-king-jr":"Luther King","bartolome-de-las-casas":"Las Casas","sor-juana-ines-de-la-cruz":"Sor Juana",
  "jose-ortega-y-gasset":"Ortega y Gasset","nicolas-gomez-davila":"Gómez Dávila","jose-enrique-rodo":"Rodó"};
const SHORT_BY_NAME=Object.fromEntries([...PH,...BR].filter(p=>SHORT[p.id]).map(p=>[p.n,SHORT[p.id]]));
const shortName=n=>{if(SHORT_BY_NAME[n])return SHORT_BY_NAME[n];const w=n.split(" ").filter(x=>x!=="Jr.");return w.length>2?w.slice(-1)[0]:w.join(" ")};
function lineCount(x,t,w){let n=1,line="";for(const wd of t.split(" ")){const tt=line?line+" "+wd:wd;if(x.measureText(tt).width>w&&line){n++;line=wd}else line=tt}return n}
function circlePic(x,img,p,cx,cy,r,stroke){
  x.save();x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.clip();
  if(img){const s=Math.max(2*r/img.width,2*r/img.height),dw=img.width*s,dh=img.height*s;x.filter="grayscale(1) sepia(.2) contrast(1.06)";x.drawImage(img,cx-dw/2,cy-r-(dh-2*r)*.15,dw,dh);x.filter="none"}
  else{x.fillStyle="#1D1A16";x.fillRect(cx-r,cy-r,2*r,2*r);x.fillStyle="#9C9283";x.font="400 52px 'Instrument Serif'";x.textAlign="center";x.fillText(initials(p.n),cx,cy+18)}
  x.restore();x.beginPath();x.arc(cx,cy,r+3,0,Math.PI*2);x.strokeStyle=stroke;x.lineWidth=3;x.stroke();
}
// Loads a cross-origin image usable on canvas; resolves null on error or after 4 s.
function loadImage(src){
  return new Promise(res=>{
    const i=new Image();i.crossOrigin="anonymous";i.referrerPolicy="no-referrer";
    const t=setTimeout(()=>res(null),4000);
    i.onload=()=>{clearTimeout(t);res(i)};i.onerror=()=>{clearTimeout(t);res(null)};i.src=src;
  });
}
// Draws centered text wrapped to width w and returns the y of the last line.
function wrapText(x,t,cx,y,w,lh){
  let line="";
  for(const wd of t.split(" ")){const tt=line?line+" "+wd:wd;if(x.measureText(tt).width>w&&line){x.fillText(line,cx,y);line=wd;y+=lh}else line=tt}
  x.fillText(line,cx,y);return y;
}

/* ---------- Chrome ---------- */
document.getElementById("themeBtn").addEventListener("click",()=>{
  const root=document.documentElement;
  const dark=root.dataset.theme?root.dataset.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme=dark?"light":"dark";
  try{localStorage.setItem("agora.theme",root.dataset.theme)}catch(e){}
});
// Language menu: each language is its own page (/, /en/, /es/); the current route travels along.
{
  const btn=document.getElementById("langBtn"),menu=document.getElementById("langMenu");
  if(btn&&menu){
    btn.textContent=I.lang.toUpperCase();
    const set=open=>{menu.hidden=!open;btn.setAttribute("aria-expanded",open)};
    btn.addEventListener("click",e=>{e.stopPropagation();set(menu.hidden)});
    document.addEventListener("click",e=>{if(!e.target.closest("#langBox"))set(false)});
    menu.querySelectorAll("a").forEach(a=>{
      if(a.dataset.lang===I.lang)a.setAttribute("aria-current","true");
      a.addEventListener("click",e=>{e.preventDefault();store.set("lang",a.dataset.lang);track(`/evento/idioma-${a.dataset.lang}`);location.href=a.getAttribute("href")+location.hash});
    });
  }
  // A first visit from a browser in another language gets a one-time offer, never an automatic redirect
  // (search engines index each language page as it is).
  const want=(navigator.languages||[navigator.language||""]).map(l=>l.slice(0,2).toLowerCase()).find(l=>["pt","en","es"].includes(l));
  if(want&&want!==I.lang&&!store.get("lang")){
    const names={pt:"Ver em português",en:"View in English",es:"Ver en español"},href={pt:"/",en:"/en/",es:"/es/"}[want];
    const el=document.createElement("div");el.className="lang-offer";el.setAttribute("lang",want);
    el.innerHTML=`<a href="${href}">${names[want]}</a><button type="button" aria-label="${L`Fechar`}">×</button>`;
    el.querySelector("a").addEventListener("click",e=>{e.preventDefault();store.set("lang",want);location.href=href+location.hash});
    el.querySelector("button").addEventListener("click",()=>{store.set("lang",I.lang);el.remove()});
    document.body.appendChild(el);
  }
}
const bar=document.getElementById("bar");
addEventListener("scroll",()=>bar.classList.toggle("scrolled",scrollY>8),{passive:true});
addEventListener("mousedown",()=>document.body.classList.remove("kbd-mode"));

route();

// Timeline dots on touch screens: there is no hover to show a name, so the first tap opens a card
// with who it is and a link; the link (or a second tap on the same dot) opens the thinker.
function wireTimeline(){
  // On narrow screens the timeline scrolls sideways: start it centred on the match, not on Ancient Greece.
  const sc=app.querySelector(".tl-scroll"),me=sc&&sc.querySelector(".tl-label.top");
  if(sc&&me&&sc.scrollWidth>sc.clientWidth){const b=me.getBoundingClientRect(),c=sc.getBoundingClientRect();sc.scrollLeft+=b.left+b.width/2-(c.left+c.width/2);sc.classList.add("swipe")}
  if(!matchMedia("(hover:none)").matches)return;
  const tip=document.getElementById("tip");let armed=null;
  app.querySelectorAll(".tl-dot").forEach(d=>d.addEventListener("click",e=>{
    if(armed===d)return;
    e.preventDefault();armed=d;
    const p=byId[d.getAttribute("href").split("/").pop()];if(!p)return;
    tip.innerHTML=`<button class="tip-x" type="button" aria-label="${L`Fechar`}">×</button><b class="tip-t">${esc(p.n)}</b><span class="tip-poles">${esc(p.s)} · ${esc(p.era)}</span><span>${esc(lifeText(p))}${p.place?` · ${esc(p.place)}`:""}</span><a class="btn accent sm tip-go" href="#/p/${p.id}">${L`Conhecer ${esc(p.n)}`} ${icon.arrow}</a>`;
    tip.style.left=tip.style.top="";tip.classList.add("show","sheet");
  }));
  tip.ontransitionend=()=>{if(!tip.classList.contains("show"))armed=null};
}

// Footer link to the Pix page, only once a key is set in support.js.
if(HAS_PIX)document.getElementById("supportLink")?.classList.remove("hidden");

/* ---------- Installable app ---------- */
// Offline support on the published site only (a service worker on localhost would cache the files being edited).
if(PREVIEW&&"serviceWorker" in navigator)addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
// "Instalar o app" in the footer: the browser prompt where there is one (Android, desktop Chrome and Edge),
// short instructions on iPhone and iPad, and nothing once the app is already installed.
{
  const btn=document.getElementById("installBtn");
  const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
  const ios=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  let deferred=null;
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;if(!standalone)btn.classList.remove("hidden")});
  addEventListener("appinstalled",()=>{btn.classList.add("hidden");deferred=null;toast(L`App instalado`);track("/evento/app-instalado")});
  // Clicks on any book link (all of them carry rel="sponsored").
  document.addEventListener("click",e=>{if(e.target.closest('a[rel~="sponsored"]'))track("/evento/livro")});
  if(ios&&!standalone)btn.classList.remove("hidden");
  btn.addEventListener("click",async()=>{
    if(deferred){deferred.prompt();await deferred.userChoice.catch(()=>{});deferred=null;btn.classList.add("hidden");return}
    if(ios)toast(L`No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início`,6000);
  });
}
})();
