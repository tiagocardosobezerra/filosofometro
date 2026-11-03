// Filosofômetro UI. All numbers come from AgoraEngine; this file only renders and routes.
(function(){
const E=AgoraEngine.create(AgoraData);
const {AXES,QS,PH,SCALE}=E;
const app=document.getElementById("app");
const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
const TOUCH=matchMedia("(hover:none)").matches;
const BR=AgoraData.BR||[];
const byId=Object.fromEntries([...PH,...BR].map(p=>[p.id,p]));

// The order statements are shown in comes from the engine, so the audit can report it.
const ORDER=E.ORDER;

const store={
  get(k){try{return JSON.parse(localStorage.getItem("agora."+k))}catch(e){return null}},
  set(k,v){try{localStorage.setItem("agora."+k,JSON.stringify(v))}catch(e){}},
  del(k){try{localStorage.removeItem("agora."+k)}catch(e){}},
};

const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=(x,d=2)=>(x>=0?"+":"−")+Math.abs(x).toFixed(d).replace(".",",");
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
  let s=`<svg viewBox="${-R-pad} ${-R-pad} ${2*(R+pad)} ${2*(R+pad)}" ${decorative?'aria-hidden="true" focusable="false"':`role="img" aria-label="${esc(title||"Perfil nos 11 eixos")}"`}>`;
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
      s+=`<path class="sg-hit" data-ax="${i}" tabindex="0" role="button" aria-label="${esc(a.name)}: ${esc(a.l)} ou ${esc(a.r)}. Ver explicação" d="M0 0L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}A${rr} ${rr} 0 0 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}Z"/>`;
    });
  }
  return s+"</svg>";
}

/* ---------- Sigil explanations ---------- */
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const lean=(a,x)=>Math.abs(x)<.13?"equilíbrio":`${x<0?a.l:a.r}${Math.abs(x)>=.6?", forte":""}`;
const num2=x=>(x>=0?"+":"−")+Math.abs(x).toFixed(2).replace(".",",");
// Why the user sits where they do on one axis: the answers that pulled hardest in that direction.
function whyUser(r,ax){
  const qs=r.perQuestion.filter(q=>q.axis===ax);
  const score=r.scores[ax];
  if(Math.abs(score)<.13){
    const pulls=qs.filter(q=>q.contribution!==0);
    return pulls.length?`Suas respostas se equilibraram: ${pulls.length} puxaram para lados opostos.`:"Você ficou neutro nas 4 afirmações deste eixo.";
  }
  const dir=Math.sign(score);
  const top=qs.filter(q=>Math.sign(q.contribution)===dir).sort((a,b)=>Math.abs(b.contribution)-Math.abs(a.contribution)).slice(0,2);
  const said=q=>`“${SCALE[q.answer].label.toLowerCase()}” para “${q.text.replace(/\.$/,"")}”`;
  return `Você respondeu ${top.map(said).join(" e ")}.`;
}
// The example in the quiz where this thinker is cited on this axis, if any.
function thinkerCite(p,ax){
  for(const q of QS){if(q[1]!==ax)continue;for(const ex of [q[3],q[4]]){const n=ex.slice(0,ex.indexOf(": "));if(thinkerByName(n)===p)return ex.slice(ex.indexOf(": ")+2)}}
  return null;
}
function tipHTML(ax,{user=null,r=null,p=null,you="Você"}){
  const a=AXES[ax];
  let h=`<button class="tip-x" type="button" aria-label="Fechar explicação">×</button><b class="tip-t">${esc(cap(a.name))}</b><span class="tip-poles">${esc(a.l)} ↔ ${esc(a.r)}</span>`;
  if(user)h+=`<span class="tip-row"><i class="tip-dot you"></i>${esc(you)}: ${num2(user[ax])} · ${esc(lean(a,user[ax]))}</span>`;
  if(p)h+=`<span class="tip-row"><i class="tip-dot them"></i>${esc(p.n)}: ${num2(p.v[ax])} · ${esc(lean(a,p.v[ax]))}</span>`;
  if(r)h+=`<span class="tip-why"><b>Por quê:</b> ${esc(whyUser(r,ax))}</span>`;
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
  if(cta){const hasLast=!!(lastCode&&E.decode(lastCode));cta.href=hasLast?"#/r/"+lastCode:"#/teste";cta.innerHTML=hasLast?`<span class="cta-lg">Meu resultado</span><span class="cta-sm">Resultado</span>`:`<span class="cta-lg">Fazer o teste</span><span class="cta-sm">Teste</span>`;cta.classList.toggle("hidden",name==="teste"||(hasLast&&name==="r"&&parts[1]===lastCode))}
  if(a11yNav(name))return;
  if(name==="teste")renderQuiz(parts[1]);
  else if(name==="r")renderResult(parts[1],parts[2]);
  else if(name==="pensadores")renderCatalog();
  else if(name==="p")renderThinker(parts[1]);
  else if(name==="metodo")renderMethod();
  else if(name==="verificar")renderVerify(parts[1]);
  else if(name==="vs")renderInvite(parts[1],parts[2]);
  else if(name==="comparar")renderCompare(parts[1],parts[2],parts[3],parts[4]);
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
  document.title=title?`${title} | Filosofômetro`:"Filosofômetro: qual filósofo pensa como você?";
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
      <span class="eyebrow">Teste filosófico</span>
      <h1 class="display"><span class="line"><span>Qual filósofo</span></span><span class="line"><span>pensa como</span></span><span class="line"><span><em class="it accent">você?</em></span></span></h1>
      <p class="lede">Responda afirmações sobre verdade, liberdade, moral e poder, em três níveis de profundidade. Descubra seu par entre ${PH.length} pensadores, quem pensa como você no Brasil e quem mais discordaria de você.</p>
      <div class="cta-row">
        <a class="btn accent" href="#/teste" ${resume?"":'data-fresh="1"'}>${resume?`Continuar de onde parei · ${done}/${saved.answers.length}`:"Começar o teste"} ${icon.arrow}</a>
        ${resume?`<a class="btn ghost" href="#/teste" data-fresh="1">Recomeçar</a>`:`<a class="btn ghost" href="#/metodo">Como funciona</a>`}
      </div>
      <div class="facts"><span><b>3</b> níveis: ${E.LEVELS.map(l=>l.n).join(", ")} afirmações</span><span><b>11</b> eixos</span><span><b>${PH.length+BR.length}</b> pensadores</span><span>Sem cadastro</span></div>
    </div>
    <div class="hero-art">
      <div class="duo hero-duo">
        <figure class="portrait" id="heroPic" aria-hidden="true"><img alt="" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer"><img alt="" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer"></figure>
        <div class="sigil-badge" id="heroSigil"></div>
      </div>
      <div class="hero-caption fade-swap" id="heroCap"><a class="who" href="#/"></a><div class="what"></div><p class="tip-hint hero-hint"><span class="on-hover">Passe o mouse</span><span class="on-touch">Toque</span> na mandala para ver cada eixo.</p></div>
    </div>
  </section>
  <div class="marquee" aria-hidden="true"><div class="track">${names}${names}</div></div>
  ${discoverHTML()}
  <section class="wrap section" style="padding-top:0">
    <div class="section-head">
      <div><span class="eyebrow">O mapa</span><h2 class="h2">Onze tensões que <em class="it">definem</em> um pensamento</h2></div>
      <p>Cada eixo opõe duas respostas legítimas a uma pergunta antiga. Não existe lado certo: existe o seu lado, e quem esteve nele antes de você.</p>
    </div>
    <ol class="axes-list">${AXES.map((a,i)=>`<li><span class="n">${pad(i+1)}</span><span class="pole">${esc(a.l)}</span><span class="mid"><i></i>${esc(a.name)}</span><span class="pole r">${esc(a.r)}</span></li>`).join("")}</ol>
  </section>
  <section class="wrap section" style="padding-top:0">
    <div class="section-head">
      <div><span class="eyebrow">O método</span><h2 class="h2">Sem caixa-preta</h2></div>
      <p>O cálculo inteiro aparece no seu resultado: cada resposta, cada eixo, cada distância. Você pode refazer a conta à mão.</p>
    </div>
    <div class="steps">
      <div class="step"><span class="num">i.</span><h3>Você responde</h3><p>Escolha o nível e concorde ou discorde das afirmações. Elas vêm misturadas, e metade de cada eixo puxa para cada lado.</p></div>
      <div class="step"><span class="num">ii.</span><h3>Mapeamos seu formato</h3><p>Suas respostas viram uma posição em 11 eixos. Comparamos o formato desse perfil com o de ${PH.length} pensadores.</p></div>
      <div class="step"><span class="num">iii.</span><h3>Você audita</h3><p>Veja passo a passo por que deu quem deu, compare com qualquer pensador e baixe os dados.</p></div>
    </div>
  </section>
  <section class="wrap big-cta">
    <h2 class="h2">Conhece-te<br><em class="it accent">a ti mesmo.</em></h2>
    <a class="btn accent" href="#/teste" data-fresh="1">Começar agora ${icon.arrow}</a>
  </section>`);
  app.querySelectorAll("[data-fresh]").forEach(a=>a.addEventListener("click",()=>store.del("progress")));
  heroAnimation();
}

// What a result contains, previewed with real catalog data so the page shows instead of telling.
function discoverHTML(){
  const pick=id=>byId[id]||PH[0];
  const a=pick("simone-de-beauvoir"),b=pick("nietzsche")||PH[1],opp=pick("tomas-de-aquino");
  const brs=["paulo-freire","marilena-chaui","lelia-gonzalez","milton-santos"].map(id=>byId[id]).filter(Boolean).slice(0,3);
  const span=Math.max(...PH.map(p=>p.born))-Math.min(...PH.map(p=>p.born)),min=Math.min(...PH.map(p=>p.born));
  const dots=PH.map(p=>`<i style="left:${((p.born-min)/span*100).toFixed(1)}%"></i>`).join("");
  return `<section class="wrap section discover">
    <div class="section-head">
      <div><span class="eyebrow">O resultado</span><h2 class="h2">O que você <em class="it">descobre</em></h2></div>
      <p>Não é só um nome. É um retrato do seu jeito de pensar, com gente de verdade dos dois lados, e uma conversa pronta para começar com os amigos.</p>
    </div>
    <div class="bento">
      <article class="bt bt-par">
        <div class="bt-art">${portrait(a,{cls:"bt-pic"})}<div class="bt-sigil">${sigil(a.v,{cls:"sg-user",decorative:true})}</div></div>
        <div><span class="bt-k">01 · Seu par</span><h3>O pensador com o formato mais parecido com o seu</h3><p>Com percentual de compatibilidade, biografia, ideias centrais e onde vocês concordam e divergem.</p></div>
      </article>
      <article class="bt bt-opp">
        <div class="bt-vs">${portrait(b,{cls:"bt-av"})}<span>vs</span>${portrait(opp,{cls:"bt-av"})}</div>
        <span class="bt-k">02 · Seu oposto</span><h3>Quem mais discordaria de você</h3>
      </article>
      <article class="bt bt-br">
        <span class="br-flag" aria-hidden="true"></span>
        <div class="bt-stack">${brs.map(p=>portrait(p,{cls:"bt-av"})).join("")}</div>
        <span class="bt-k">03 · No Brasil</span><h3>Quem pensa como você entre ${BR.length+PH.filter(p=>p.br).length} brasileiros</h3>
      </article>
      <article class="bt bt-tl">
        <div class="bt-time" aria-hidden="true">${dots}<b style="left:62%"></b></div>
        <span class="bt-k">04 · Linha do tempo</span><h3>Onde você está na história, de ${Math.abs(min)} a.C. até hoje</h3>
      </article>
      <article class="bt bt-vsf">
        <div class="bt-duo">${sigil(a.v,{compare:b.v,cls:"sg-user",decorative:true})}</div>
        <span class="bt-k">05 · Desafie um amigo</span><h3>Mande o link e vejam, eixo por eixo, quanto são compatíveis</h3>
      </article>
      <article class="bt bt-story">
        <div class="bt-phone" aria-hidden="true"><span class="ph-pct">94%</span><span class="ph-nm">${esc(shortName(a.n))}</span><span class="ph-bar"></span></div>
        <span class="bt-k">06 · Story</span><h3>Um card pronto para postar</h3>
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
  host.innerHTML=sigil(cur,{cls:"sg-user",tips:true,title:`Perfil de ${deck[0].n} nos 11 eixos`});setCap(deck[0]);
  // The tooltip always describes the thinker on screen, and the cycle pauses while someone reads it.
  wireTips(host,()=>({p:deck[idx]}));
  const tip=document.getElementById("tip");
  const reading=()=>tip.classList.contains("show")||host.matches(":hover")||host.contains(document.activeElement);
  if(reduceMotion)return;
  const tick=()=>{
    if(reading())return;
    host.querySelector("svg").setAttribute("aria-label",`Perfil de ${deck[(idx+1)%deck.length].n} nos 11 eixos`);
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
  const code=E.encode(answers),vs=store.get("vs");
  store.set("last",code);
  if(vs&&E.decode(vs.code)){store.del("vs");location.replace(`#/comparar/${vs.code}/${code}${vs.name?`/${encName(vs.name)}`:""}`);return}
  location.replace("#/r/"+code);
}

// Examples are "Name: position". The name is matched to the catalog to show the thinker's portrait.
const NAME_ALIAS={"Espinosa":"spinoza","Calvino":"joao-calvino","Lao Tsé":"lao-tse"};
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
  1:{tag:"Para começar",precision:"Boa",retest:"55%",desc:"O suficiente para conhecer seu par e se divertir."},
  2:{tag:"Recomendado",precision:"Alta",retest:"83%",desc:"Resultado bem mais estável. Inclui as 44 do Rápido."},
  3:{tag:"Para quem quer ir fundo",precision:"Muito alta",retest:"94%",desc:"O retrato mais fiel. Inclui as 88 do Completo."},
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
    <span class="eyebrow">${vs?"Desafio aceito":"Antes de começar"}</span>
    <h1 class="h2" style="font-size:clamp(44px,min(7vw,10vh),96px)">Quanto você quer <em class="it accent">ir fundo?</em></h1>
    <p class="lede" style="margin-top:14px;max-width:56ch">Os três níveis usam os mesmos 11 eixos. Quanto mais afirmações, mais preciso fica o resultado. Dá para começar no Rápido e aprofundar depois, sem perder nada.</p>
    <div class="levels">${E.LEVELS.map(l=>{const i=LEVEL_INFO[l.id];return `<a class="level ${l.id===2?"rec":""}" href="#/teste/${l.id}">
      <span class="lv-tag">${esc(i.tag)}</span>
      <span class="lv-name">${esc(l.name)}</span>
      <span class="lv-n"><b>${l.n}</b> afirmações · ≈ ${l.minutes} min</span>
      <span class="lv-bars" aria-hidden="true">${[1,2,3].map(k=>`<i class="${k<=l.id?"on":""}"></i>`).join("")}</span>
      <span class="lv-desc">${esc(i.desc)}</span>
      <span class="lv-meta">Precisão ${esc(i.precision).toLowerCase()} · mesmo par ao refazer em ${i.retest} das vezes</span>
      <span class="btn ${l.id===2?"accent":"ghost"} sm">Começar ${icon.arrow}</span>
    </a>`}).join("")}</div>
  </section>`,"Escolha o nível");
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
      <span class="lv-chip">${esc(lv.name)}</span>
      <a class="link-btn" href="#/">Sair <span class="sr">do teste (seu progresso fica salvo)</span></a>
    </div>
    <div class="progress ${total>44?"dense":""}" style="grid-template-columns:repeat(${total},1fr)" aria-hidden="true">${order.map(()=>"<i></i>").join("")}</div>
    <div class="quiz-body">
    <div class="q-stage">
      <div class="q-anim" id="qAnim">
        <div class="q-count mono" id="qCount" aria-hidden="true"></div>
        <p class="sr" id="qLive" aria-live="polite"></p>
        <h1 class="q-text" id="qText"></h1>
        <div class="examples" id="examples">
          <div class="ex ex-d"><span class="ex-k">Quem discorda</span><div id="exD"></div></div>
          <div class="ex ex-a"><span class="ex-k">Quem concorda</span><div id="exA"></div></div>
        </div>
      </div>
      <div class="scale" role="radiogroup" aria-labelledby="qText" aria-describedby="examples" id="scale">
        <div class="choices">${UI.map((code,j)=>`<button type="button" class="choice" role="radio" aria-checked="false" data-code="${code}" data-tone="${TONE[j]}"><span class="ch-mark" aria-hidden="true"><i></i><i></i></span><span class="ch-lbl">${SCALE[code].label}</span><span class="ch-k" aria-hidden="true">${j+1}</span></button>`).join("")}</div>
      </div>
    </div>
    <aside class="quiz-aside" aria-hidden="true">
      <div class="qa-sigil" id="qaSigil">${sigil(AXES.map(()=>0),{cls:"sg-user",labels:true,decorative:true})}</div>
      <div class="qa-cap"><span class="eyebrow">Seu formato até agora</span><p id="qaAxis"></p></div>
    </aside>
    </div>
    <div class="quiz-foot">
      <span style="display:flex;gap:20px;align-items:center"><button type="button" class="link-btn" id="prevBtn">${icon.back} Anterior</button><button type="button" class="link-btn accent hidden" id="toResult">Ver resultado ${icon.arrow}</button></span>
      <span class="qf-count mono" id="qfCount" aria-hidden="true"></span>
      <span class="kbd-help">Atalhos: <span class="kbd">1</span> a <span class="kbd">5</span> responder · <span class="kbd">⌫</span> voltar</span>
    </div>
  </section>`,"Teste");
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
    qaPath.setAttribute("d",path(v));qaMini.setAttribute("d",path(v));
    pts(v).forEach(([x,y],i)=>{qaDots[i].setAttribute("cx",x.toFixed(1));qaDots[i].setAttribute("cy",y.toFixed(1))});
    qaLbls.forEach((t,i)=>t.classList.toggle("on",i===ax));qaSpokes.forEach((t,i)=>t.classList.toggle("on",i===ax));
    const done=answers.filter(a=>a!==null).length;
    document.getElementById("qaAxis").innerHTML=`Agora: <b>${esc(cap(AXES[ax].name))}</b>, entre ${esc(AXES[ax].l)} e ${esc(AXES[ax].r)}.<br><span class="muted">${done?`${done} de ${total} respondidas.`:"A mandala ganha forma a cada resposta."}</span>`;
  }
  function paint(){
    const qi=order[pos],[text,ax,,exAgree,exDisagree]=QS[qi];
    paintAside(ax);
    document.getElementById("qText").textContent=text;
    document.getElementById("exA").innerHTML=citation(exAgree);
    document.getElementById("exD").innerHTML=citation(exDisagree);
    document.getElementById("qCount").textContent=`${pad(pos+1)} / ${total}`;
    document.getElementById("qfCount").textContent=`${answers.filter(a=>a!==null).length} de ${total}`;
    document.getElementById("qLive").textContent=`Afirmação ${pos+1} de ${total}: ${text}`;
    document.getElementById("axisTag").innerHTML=`Eixo <b>${pad(ax+1)}</b> · ${esc(AXES[ax].name)}`;
    ticks.forEach((t,i)=>{t.className=i===pos?"now":answers[order[i]]!==null?"done":""});
    btns.forEach(b=>{const on=answers[qi]===+b.dataset.code;b.setAttribute("aria-checked",on);b.tabIndex=on||(answers[qi]===null&&b.dataset.code==="2")?0:-1});
    document.getElementById("prevBtn").disabled=pos===0;
    // While reviewing a finished quiz, the result is one click away.
    document.getElementById("toResult").classList.toggle("hidden",answers.some(a=>a===null));
  }
  function go(next){
    if(reduceMotion){pos=next;paint();save();return}
    anim.classList.add("leave");
    later(()=>{pos=next;paint();save();anim.classList.remove("leave");anim.classList.add("enter");anim.offsetWidth;anim.classList.remove("enter");busy=false},260);
  }
  function pick(code){
    if(busy)return;
    const qi=order[pos];answers[qi]=code;save();paintAside(QS[qi][1]);
    // A short tick under the finger on phones that support it, and a one-time tip about swiping back.
    if(TOUCH){if(navigator.vibrate)try{navigator.vibrate(8)}catch(e){}
      if(!store.get("swipeTip")&&answers.filter(a=>a!==null).length===2){store.set("swipeTip",1);later(()=>toast("Dica: deslize para a direita para voltar",3500),500)}}
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
    },reduceMotion?60:220);
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
const pctText=x=>x===null?"sem %":`${x}%`;
function renderResult(code,mode){
  const answers=E.decode(code);
  if(!answers){renderNotFound("Este link de resultado está incompleto ou é de uma versão antiga do teste.");return}
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
    ?{kicker:flat?"Mais perto desta pessoa":"Par filosófico desta pessoa",axes:"Os 11 eixos desta pessoa",also:"Também pensam assim",br:"No Brasil, quem pensa assim",opp:"O oposto",you:"esta pessoa"}
    :{kicker:flat?"Mais perto de você":"Seu par filosófico",axes:"Seus 11 eixos",also:flat?"Também perto de você":"Também pensam como você",br:"No Brasil, quem pensa como você",opp:"Seu oposto",you:"você"};
  const flatNote="Suas respostas se equilibraram e seu perfil ficou sem direção. Sem direção não dá para medir compatibilidade, então não mostramos percentuais nem oposto. Este é o pensador cujas posições ficam mais perto das suas.";
  const strongest=AXES.map((a,i)=>({a,i,x:userV[i]})).filter(t=>Math.abs(t.x)>=.25).sort((s,t)=>Math.abs(t.x)-Math.abs(s.x)).slice(0,3);
  mount(`
  ${visitor?`<div class="visitor-bar"><div class="wrap"><span>Este é o resultado de outra pessoa.</span><a class="btn accent sm" href="#/vs/${code}" >Fazer o teste e comparar ${icon.arrow}</a></div></div>`:""}
  <section class="wrap res-hero">
    <div>
      <div class="res-kicker"><span class="eyebrow">${T.kicker}</span></div>
      ${flat?"":`<div class="res-pct" aria-hidden="true"><span id="pctNum">${reduceMotion?top.pct:0}</span>%</div>`}
      <h1 class="res-name">${flat?"":`<span class="sr">${top.pct}% de compatibilidade com </span>`}${nameLines.map(l=>`<span class="line"><span>${esc(l)}</span></span>`).join("")}</h1>
      <div class="res-school">${esc(p.s)} · ${esc(lifeText(p))}</div>
      ${r.level?`<div class="lvl-line"><span class="lv-chip">Nível ${esc(r.level.name)}</span><span>${r.level.n} afirmações · precisão ${esc(LEVEL_INFO[r.level.id].precision.toLowerCase())}</span>${!visitor&&nextLevel(r.level.n)?`<a class="lvl-up" href="#/teste/aprofundar">Aprofundar com mais ${nextLevel(r.level.n).n-r.level.n} ${icon.arrow}</a>`:""}</div>`:""}
      ${strongest.length?`<div class="traits" aria-label="Traços mais fortes">${strongest.map((t,i)=>`<span class="trait" style="--i:${i}">${esc(t.x<0?t.a.l:t.a.r)}</span>`).join("")}</div>`:""}
      ${flat?`<div class="note" role="note">${icon.info}<span>${flatNote}</span></div>`:r.note&&!visitor?`<div class="note" role="note">${icon.info}<span>${esc(r.note.message)}</span></div>`:""}
      <div class="res-actions">
        ${visitor?`<a class="btn accent" href="#/vs/${code}">Fazer o teste e comparar ${icon.arrow}</a>`:`
        ${flat?"":`<button class="btn accent" id="shareBtn" type="button">${icon.share} Compartilhar no story</button>`}
        <button class="btn ghost" id="challengeBtn" type="button">${icon.link} Desafiar um amigo</button>
        <a class="btn ghost" href="#/teste" id="redoBtn">Refazer</a>`}
      </div>
    </div>
    ${duo(p,{user:userV,title:`Perfil de ${T.you} comparado ao de ${p.n}`})}
  </section>
  <section class="wrap" style="padding-bottom:24px">
    <h2 class="chapter"><span>1</span>${visitor?"Quem é o par desta pessoa":"Quem é o seu par"}</h2>
    ${p.bio||!flat?`<div class="grid2">${aboutHTML(p)}${agreementHTML(r,top)}</div>`:""}

    <h2 class="chapter"><span>2</span>Por que deu ${esc(p.n)}</h2>
    <div class="grid2">
      <div class="panel">
        <h2>${T.axes}</h2>
        <p class="sub">Laranja: ${T.you}. Tracejado: ${esc(p.n)}. Os gráficos mostram as posições brutas; a comparação usa o formato normalizado (passo 2 da auditoria).</p>
        <div class="panel-sigil">${sigil(userV,{compare:p.v,labels:true,cls:"sg-user",draw:true,tips:true,title:`Perfil de ${T.you} nos 11 eixos comparado ao de ${p.n}`})}</div><p class="tip-hint"><span class="on-hover">Passe o mouse</span><span class="on-touch">Toque</span> em cada eixo para ver o que ele mede e por que ficou ali.</p>
        ${AXES.map((a,i)=>axisRow(a,userV[i],p.v[i],T.you,p.n)).join("")}
      </div>
      <div style="display:grid;gap:20px;align-content:start">
        <div class="panel">
          <h2>${T.also}</h2>
          <p class="sub">Os próximos da lista, pela mesma conta.</p>
          <ul class="match-list">${r.ranking.slice(1,6).map(x=>`<li><a href="#/p/${x.p.id}">${portrait(x.p,{cls:"avatar"})}<span><span class="nm">${esc(x.p.n)}</span><span class="sc">${esc(x.p.s)}</span></span><span class="pc">${pctText(x.pct)}</span></a></li>`).join("")}</ul>
        </div>
        ${brazilHTML(r,T.br)}
      </div>
    </div>

    <h2 class="chapter"><span>3</span>Onde ${visitor?"essa pessoa está":"você está"} na história</h2>
    ${timelineHTML(r)}
    <div class="grid2" style="margin-top:20px">
      ${opp?`<div class="panel">
        <h2>${T.opp}</h2>
        <p class="sub">Quem mais discordaria${visitor?"":" de você"}.</p>
        <a class="opp" href="#/p/${opp.p.id}" style="text-decoration:none">${portrait(opp.p,{cls:"opp-pic"})}<span><span class="nm">${esc(opp.p.n)}</span><span class="sc muted" style="display:block;margin-top:6px">${esc(opp.p.s)} · ${pctText(opp.pct)}</span><span class="serif it" style="display:block;font-size:20px;margin-top:10px;color:var(--ink2)">“${esc(opp.p.q)}”</span></span></a>
      </div>`:""}
      <div class="panel">
        <h2>Comece por aqui</h2>
        <p class="sub">Uma porta de entrada para ler ${esc(p.n)}.</p>
        <div class="book" style="margin-top:6px"><span class="cover" aria-hidden="true">${esc(p.n)}</span><span><span class="t">${esc(p.b)}</span><span class="muted" style="display:block;margin-top:6px">de ${esc(p.n)}</span></span></div>
      </div>
    </div>

    ${visitor?"":invitePanelHTML(r)}

    <div class="finale">
      ${portrait(p,{cls:"finale-pic"})}
      <blockquote class="finale-quote">“${esc(p.q)}”</blockquote>
      <p class="finale-by">${esc(p.n)}${visitor?"":`, ${flat?"o pensador mais perto de você":`seu par com ${top.pct}%`}`}</p>
      <p class="finale-lede">${visitor?"Quer saber quem pensa como você? O teste rápido leva uns 6 minutos.":"Agora descubra qual dos seus amigos pensa como você. Mande o desafio e vejam, eixo por eixo, onde concordam e onde vão discutir."}</p>
      <div class="cta-row" style="justify-content:center">
        ${visitor?`<a class="btn accent" href="#/vs/${code}">Fazer o teste e comparar ${icon.arrow}</a>`:`
        <button class="btn accent" id="challengeBtn2" type="button">${icon.link} Desafiar um amigo</button>
        ${r.level&&nextLevel(r.level.n)?`<a class="btn ghost" href="#/teste/aprofundar">Aprofundar: nível ${esc(nextLevel(r.level.n).name)}</a>`:""}
        ${flat?"":`<button class="btn ghost" id="shareBtn2" type="button">${icon.share} Compartilhar no story</button>`}`}
        <a class="btn ghost" href="#/pensadores">Ver os ${PH.length+BR.length} pensadores</a>
      </div>
    </div>

    ${auditPanel(r)}
  </section>`,flat?`Mais perto: ${p.n}`:`${top.pct}% ${p.n}`);
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
    ["shareBtn","shareBtn2"].forEach(id=>{const b=document.getElementById(id);if(b)b.addEventListener("click",()=>shareCard(r))});
    ["challengeBtn","challengeBtn2"].forEach(id=>{const b=document.getElementById(id);if(b)b.addEventListener("click",()=>challenge(r))});
    document.getElementById("redoBtn").addEventListener("click",()=>store.del("progress"));
    wireInvite(r);
  }
  wireTips(app,{user:userV,r,p});
  wireTimeline();
  wireAudit(r);
}

/* ---------- Portraits ---------- */
// Portraits are Wikimedia Commons images linked from the catalog; a monogram shows if one fails to load.
function portrait(p,{cls="",eager=false}={}){
  const initials=p.n.split(" ").filter(w=>/^[A-ZÀ-Ý]/.test(w)).slice(0,2).map(w=>w[0]).join("");
  // Without a freely licensed photo, the portrait is drawn from the thought itself: the thinker's own sigil behind the initials.
  const fallback=`<span class="mono-fallback" aria-hidden="true">${sigil(p.v,{cls:"sg-solo",decorative:true})}<b>${esc(initials)}</b></span>`;
  if(!p.img)return `<figure class="portrait noimg ${cls}" role="img" aria-label="${esc(p.n)}: retrato desenhado pelo perfil nos 11 eixos (sem foto de licença livre)">${fallback}</figure>`;
  return `<figure class="portrait ${cls}"><img src="${esc(p.img)}" alt="Retrato de ${esc(p.n)}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg')">${fallback}</figure>`;
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
const inviteURL=r=>{const nm=encName(store.get("name")||""),tail=`${E.encode(r.answers)}${nm?`/${nm}`:""}`;return PREVIEW?`${location.origin}/s/${tail}`:`${location.href.split("#")[0]}#/vs/${tail}`};
const compareURL=(a,b,nA,nB)=>{const tail=`${a}/${b}${nA||nB?`/${encName(nA)}/${encName(nB)}`:""}`;return PREVIEW?`${location.origin}/c/${tail}`:`${location.href.split("#")[0]}#/comparar/${tail}`};
const challengeText=r=>r.directionless?`Fiz o Filosofômetro. Qual filósofo pensa como você? Faz o teste e compara comigo:`:`Fiz o Filosofômetro e deu ${r.top.pct}% ${r.top.p.n}. Faz o teste e vê quanto a gente pensa parecido:`;
// Native share sheet on phones; copy to clipboard elsewhere.
async function challenge(r){
  const url=inviteURL(r),text=challengeText(r);
  if(navigator.share){try{await navigator.share({title:"Filosofômetro",text,url});return}catch(e){if(e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(`${text} ${url}`);toast("Convite copiado. Agora é só mandar!")}catch(e){prompt("Copie o convite:",url)}
}
function invitePanelHTML(r){
  return `<div class="panel compare-cta">
    <h2>Compare com alguém</h2>
    <p class="sub">Quem abrir o seu convite faz o teste e cai direto numa comparação com você: onde pensam igual, onde divergem e quanto são compatíveis.</p>
    <div class="cmp-form">
      <label class="sr" for="myName">Seu nome (opcional)</label>
      <input class="search sm" id="myName" placeholder="Como você quer aparecer no convite (opcional)" maxlength="24" autocomplete="given-name" value="${esc(cleanName(store.get("name")||""))}">
      <button class="btn accent sm" id="inviteBtn" type="button">${icon.link} Desafiar um amigo</button>
    </div>
    <div class="cmp-form">
      <label class="sr" for="theirLink">Link de outra pessoa</label>
      <input class="search sm" id="theirLink" placeholder="Já tem o link de alguém? Cole aqui" autocomplete="off" spellcheck="false">
      <button class="btn ghost sm" id="compareBtn" type="button">Comparar</button>
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
    if(!theirs){toast("Não reconheci esse link");return}
    location.hash=`#/comparar/${E.encode(theirs)}/${mine}`;
  };
  document.getElementById("compareBtn").addEventListener("click",go);
  document.getElementById("theirLink").addEventListener("keydown",e=>{if(e.key==="Enter")go()});
}
// Landing for an invite link: show who invited and start the test; the comparison opens after it.
function renderInvite(code,rawName){
  const a=E.decode(code);
  if(!a){renderNotFound("Este convite está incompleto ou é de uma versão antiga do teste.");return}
  const r=E.evaluate(a),p=r.top.p,named=cleanName(rawName),who=named||"Alguém";
  // Opening your own invite link (another device, or testing it) goes straight to your result.
  if(store.get("last")===code){location.replace(`#/r/${code}`);return}
  store.set("vs",{code,name:named});
  const mineCode=store.get("last");
  const hasMine=mineCode&&E.decode(mineCode)&&mineCode!==code;
  mount(`
  <section class="wrap res-hero">
    <div>
      <span class="eyebrow">Desafio filosófico</span>
      <h1 class="res-name" style="font-size:clamp(44px,min(7vw,10vh),104px)"><span class="line"><span>${esc(who)} te desafiou</span></span></h1>
      <p class="lede">${esc(who)} fez o Filosofômetro e deu <b>${r.directionless?`mais perto de ${esc(p.n)}`:`${r.top.pct}% ${esc(p.n)}`}</b>. Escolha um nível (de 6 a 18 minutos) e descubra quanto vocês pensam parecido, eixo por eixo.</p>
      <div class="cta-row">
        <a class="btn accent" href="#/teste" data-fresh="1">${hasMine?"Fazer o teste de novo e comparar":"Aceitar o desafio"} ${icon.arrow}</a>
        ${hasMine?`<a class="btn ghost" href="#/comparar/${code}/${mineCode}/${encName(named)}">Comparar com meu resultado</a>`:""}
      </div>
      <p class="invite-peek"><a href="#/r/${code}/ver">Ver o resultado completo de ${esc(named||"quem te convidou")}</a></p>
    </div>
    ${duo(p,{title:`Perfil de ${p.n}`})}
  </section>`,named?`${named} te desafiou`:"Desafio filosófico");
  wireTips(app,{p});
  app.querySelectorAll("[data-fresh]").forEach(x=>x.addEventListener("click",()=>store.del("progress")));
}
function renderCompare(codeA,codeB,rawA,rawB){
  const a=E.decode(codeA),b=E.decode(codeB);
  if(!a||!b){renderNotFound("Este link de comparação está incompleto.");return}
  const c=E.comparePeople(a,b),ra=c.a,rb=c.b;
  const nameA=cleanName(rawA)||"Seu amigo",nameB=cleanName(rawB)||"Você";
  const rows=c.perAxis.map(x=>({ax:x.axis,diff:x.diff,A:ra.scores[x.axis],B:rb.scores[x.axis]}));
  const close=rows.slice().sort((x,y)=>x.diff-y.diff).slice(0,3),far=rows.slice().sort((x,y)=>y.diff-x.diff).slice(0,3);
  const topA=new Set(ra.ranking.slice(0,10).map(x=>x.p.id));
  const shared=rb.ranking.slice(0,10).filter(x=>topA.has(x.p.id)).slice(0,4).map(x=>x.p);
  const verdict=c.pct===null?"Um dos perfis ficou sem direção, então não dá para medir compatibilidade.":c.pct>=80?"Almas filosóficas gêmeas.":c.pct>=60?"Bastante em comum, com boas brigas pela frente.":c.pct>=40?"Concordam em algumas coisas e discordam com vontade em outras.":"Pensam quase ao contrário. Rende uma ótima conversa.";
  const card=(nm,r)=>`<a class="cmp-person" href="#/r/${E.encode(r.answers)}${store.get("last")===E.encode(r.answers)?"":"/ver"}">${portrait(r.top.p,{cls:"cmp-pic"})}<span class="cmp-who">${esc(nm)}</span><span class="nm">${esc(r.top.p.n)}</span><span class="sc">${r.top.pct===null?"perfil sem direção":`${r.top.pct}% · ${esc(r.top.p.s)}`}</span></a>`;
  const item=(x,kind)=>{const ax=AXES[x.ax];return `<li><span class="ag-axis">${esc(cap(ax.name))}</span><span>${kind==="close"&&Math.sign(x.A)===Math.sign(x.B)&&Math.abs(x.A)>=.13?`Os dois tendem a <b>${esc(lean(ax,x.A).replace(", forte",""))}</b>.`:`${esc(nameA)}: <b>${esc(lean(ax,x.A))}</b>. ${esc(nameB)}: <b>${esc(lean(ax,x.B))}</b>.`}</span></li>`};
  mount(`
  <section class="wrap section" style="padding-top:clamp(24px,5vh,56px)">
    <span class="eyebrow">Comparação</span>
    <h1 class="res-name" style="font-size:clamp(44px,min(8vw,11vh),120px)"><span class="line"><span>${c.pct===null?"Sem direção":`${c.pct}% compatíveis`}</span></span></h1>
    <p class="lede" style="margin-top:6px">${esc(verdict)}</p>
    <div class="cmp-grid">
      ${card(nameA,ra)}
      <div class="cmp-sigil">${sigil(rb.scores,{compare:ra.scores,labels:true,cls:"sg-user",draw:true,tips:true,title:`${nameB} e ${nameA} nos 11 eixos`})}
        <div class="legend" aria-hidden="true"><span><i style="background:var(--accent)"></i>${esc(nameB)}</span><span><i class="dash"></i>${esc(nameA)}</span></div></div>
      ${card(nameB,rb)}
    </div>
    <div class="grid2" style="margin-top:24px">
      <div class="panel agree">
        <h2>Onde vocês se encontram</h2>
        <p class="sub">Os eixos com o formato de pensamento mais parecido entre vocês.</p>
        <ul class="ag-list">${close.map(x=>item(x,"close")).join("")}</ul>
        <h3 class="about-h ag-no">Onde vocês divergem</h3>
        <ul class="ag-list">${far.map(x=>item(x,"far")).join("")}</ul>
      </div>
      <div style="display:grid;gap:20px;align-content:start">
        <div class="panel">
          <h2>Pensadores em comum</h2>
          <p class="sub">Aparecem entre os 10 mais parecidos com os dois.</p>
          ${shared.length?`<ul class="match-list">${shared.map(p=>`<li><a href="#/p/${p.id}">${portrait(p,{cls:"avatar"})}<span><span class="nm">${esc(p.n)}</span><span class="sc">${esc(p.s)}</span></span><span class="pc" aria-hidden="true">→</span></a></li>`).join("")}</ul>`:`<p class="muted" style="margin:0">Nenhum em comum no top 10. Vocês vêm de tradições bem diferentes.</p>`}
        </div>
        <div class="panel">
          <h2>Como calculamos</h2>
          <p class="sub" style="margin:0">A mesma regra do resultado: os dois perfis são normalizados, a distância é a média das diferenças nos 11 eixos (${num(c.distance,4)}) e a compatibilidade é ${esc(E.PERCENT_RULE)}.</p>
        </div>
      </div>
    </div>
    <div class="res-actions" style="justify-content:center;margin-top:28px">
      ${store.get("last")===codeB?`<a class="btn accent" href="#/r/${codeB}">Ver meu resultado completo ${icon.arrow}</a>
      <button class="btn ghost" id="cmpChallenge" type="button">${icon.link} Desafiar outra pessoa</button>`:""}
      <button class="btn ${store.get("last")===codeB?"ghost":"accent"}" id="cmpCopy" type="button">${icon.link} Copiar esta comparação</button>
      ${store.get("last")===codeB?"":`<a class="btn ghost" href="#/teste" data-fresh="1">Fazer o teste</a>`}
    </div>
  </section>`,c.pct===null?"Comparação":`${c.pct}% compatíveis`);
  wireTips(app,{user:rb.scores,you:nameB,p:{n:nameA,v:ra.scores}});
  document.getElementById("cmpCopy").addEventListener("click",async()=>{
    const url=compareURL(codeA,codeB,cleanName(rawA),cleanName(rawB));
    try{await navigator.clipboard.writeText(url);toast("Link copiado")}catch(e){prompt("Copie o link:",url)}
  });
  const cc=document.getElementById("cmpChallenge");if(cc)cc.addEventListener("click",()=>challenge(rb));
  app.querySelectorAll("[data-fresh]").forEach(x=>x.addEventListener("click",()=>store.del("progress")));
  store.del("vs");
}

/* ---------- Brazil ---------- */
// Brazilian thinkers ranked against the user with the engine's own rule (audited as "brazil").
function brazilHTML(r,title="No Brasil, quem pensa como você"){
  if(!r.brazil.length)return "";
  const [first,...rest]=r.brazil,b=first.p;
  return `<div class="panel brazil">
    <span class="br-flag" aria-hidden="true"></span>
    <h2>${esc(title)}</h2>
    <p class="sub">Entre ${r.brazil.length} pensadores brasileiros, pela mesma conta do seu resultado.</p>
    <a class="br-main" href="#/p/${b.id}">${portrait(b,{cls:"br-pic"})}<span><span class="nm">${esc(b.n)}</span><span class="sc">${esc(b.s)}${first.pct!==null?` · ${first.pct}% com você`:""}</span>${b.bio?`<span class="br-bio">${esc(b.bio)}</span>`:""}</span></a>
    <ul class="match-list">${rest.slice(0,3).map(x=>`<li><a href="#/p/${x.p.id}">${portrait(x.p,{cls:"avatar"})}<span><span class="nm">${esc(x.p.n)}</span><span class="sc">${esc(x.p.s)}</span></span><span class="pc">${pctText(x.pct)}</span></a></li>`).join("")}</ul>
  </div>`;
}
// For a thinker's page: the closest Brazilians to an international thinker, or the
// international kin of a Brazilian one.
function kinHTML(p){
  if(p.era==="Brasil"){
    const kin=(p.akin||[]).map(id=>byId[id]).filter(Boolean);
    if(!kin.length)return "";
    return `<div class="panel"><h2>Parentes pelo mundo</h2><p class="sub">Pensadores do catálogo internacional na mesma linha de ${esc(p.n)}.</p>
      <ul class="match-list">${kin.map(x=>`<li><a href="#/p/${x.id}">${portrait(x,{cls:"avatar"})}<span><span class="nm">${esc(x.n)}</span><span class="sc">${esc(x.s)}</span></span><span class="pc" aria-hidden="true">→</span></a></li>`).join("")}</ul></div>`;
  }
  const near=E.rank(p.v,E.BRAZIL).rows.filter(x=>x.p.id!==p.id).slice(0,3);
  return `<div class="panel brazil"><span class="br-flag" aria-hidden="true"></span><h2>No Brasil, na mesma linha</h2><p class="sub">Os pensadores brasileiros com o formato de pensamento mais parecido com o de ${esc(p.n)}.</p>
    <ul class="match-list">${near.map(x=>`<li><a href="#/p/${x.p.id}">${portrait(x.p,{cls:"avatar"})}<span><span class="nm">${esc(x.p.n)}</span><span class="sc">${esc(x.p.s)}</span></span><span class="pc">${x.pct}%</span></a></li>`).join("")}</ul></div>`;
}
const credit=p=>p.img?`<a class="credit" href="${esc(p.wiki)}" target="_blank" rel="noopener">Imagem: Wikimedia Commons, via Wikipédia ↗</a>`:`<a class="credit" href="${esc(p.wiki)}" target="_blank" rel="noopener">Retrato desenhado pelo perfil (sem foto livre) · Wikipédia ↗</a>`;
// Portrait and sigil together: the face of the thinker and the shape of the thought.
// On a result the user is orange and the thinker dashed; on a thinker's page the thinker is orange.
function duo(p,{user=null,title="",thinkerFirst=false}={}){
  const main=user&&!thinkerFirst?user:p.v,other=user?(thinkerFirst?user:p.v):null;
  const mainName=user&&!thinkerFirst?"Você":p.n,otherName=thinkerFirst?"Você":p.n;
  return `<div class="duo">
    ${portrait(p,{eager:true})}
    <div class="sigil-badge">${sigil(main,{compare:other,cls:"sg-user",draw:true,tips:true,title:title||`Perfil de ${p.n}`})}<span class="badge-hint" aria-hidden="true"><span class="on-hover">Passe o mouse nos eixos</span><span class="on-touch">Toque nos eixos</span></span></div>
    ${user?`<div class="legend" aria-hidden="true"><span><i style="background:var(--accent)"></i>${esc(mainName)}</span><span><i class="dash"></i>${esc(otherName)}</span></div>`:""}
    ${credit(p)}
  </div>`;
}

// One axis bar: "main" is the orange dot, "other" the dark tick. Labels name both for screen readers.
function axisRow(a,main,other,mainLabel,otherLabel){
  const left=Math.min(50,(main+1)*50),width=Math.abs(main)*50;
  const lean=Math.abs(main)<.13?"Equilíbrio":main<0?a.l:a.r;
  const label=`${a.name}: ${mainLabel} ${fmt(main)}${other===undefined?"":`, ${otherLabel} ${fmt(other)}`}`;
  return `<div class="axis-row">
    <div class="poles"><span>${Math.abs(main)>=.13&&main<0?`<b>${esc(a.l)}</b>`:esc(a.l)}</span><span class="val">${esc(lean)} · ${fmt(main)}</span><span>${Math.abs(main)>=.13&&main>0?`<b>${esc(a.r)}</b>`:esc(a.r)}</span></div>
    <div class="track" role="img" aria-label="${esc(label)}"><span class="center"></span><span class="fill" style="left:${left}%;width:${width}%;transform-origin:${main<0?"right":"left"}"></span>${other===undefined?"":`<span class="them" style="left:${(other+1)*50}%"></span>`}<span class="you" style="left:${(main+1)*50}%"></span></div>
  </div>`;
}

/* ---------- Thinker profile and agreement ---------- */
// Who the thinker was: life, bio, central ideas and the line of thought.
function aboutHTML(p,{title=`Quem foi ${p.n}`}={}){
  if(!p.bio)return "";
  const sameLine=PH.filter(x=>x!==p&&x.s===p.s);
  return `<div class="panel about">
    <h2>${esc(title)}</h2>
    <p class="sub">${esc(lifeText(p))}${p.place?` · ${esc(p.place)}`:""}</p>
    <p class="about-bio">${esc(p.bio)}</p>
    <h3 class="about-h">Ideias centrais</h3>
    <ul class="about-ideas">${p.ideas.map(i=>`<li>${esc(i)}</li>`).join("")}</ul>
    <h3 class="about-h">A linha: ${esc(p.s)}</h3>
    <p class="about-line">${esc(p.line)}</p>
    ${sameLine.length?`<p class="about-same">Na mesma linha: ${sameLine.map(x=>`<a href="#/p/${x.id}">${esc(x.n)}</a>`).join(", ")}</p>`:""}
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
      ?(Math.sign(c.you)===Math.sign(c.them)&&Math.abs(c.you)>=.13?`Os dois tendem a <b>${esc(lean(a,c.you).replace(", forte",""))}</b>.`:`Os dois ficam perto do equilíbrio entre ${esc(a.l)} e ${esc(a.r)}.`)
      :`Você: <b>${esc(lean(a,c.you))}</b>. ${esc(x.p.n)}: <b>${esc(lean(a,c.them))}</b>.`;
    return `<li><span class="ag-axis">${esc(cap(a.name))}</span><span>${text}</span></li>`;};
  return `<div class="panel agree">
    <h2>Você e ${esc(x.p.n)}</h2>
    <p class="sub">Os eixos onde seus formatos de pensamento mais se encontram e mais se afastam.</p>
    <h3 class="about-h ag-yes">Onde vocês concordam</h3>
    <ul class="ag-list">${close.map(c=>item(c,"close")).join("")}</ul>
    <h3 class="about-h ag-no">Onde vocês divergem</h3>
    <ul class="ag-list">${far.map(c=>item(c,"far")).join("")}</ul>
  </div>`;
}

/* ---------- Timeline ---------- */
// Eras get fixed shares of the width, so the crowded modern centuries are readable
// next to the long ancient ones. A thinker is placed at their prime (birth + 35 years).
const ERAS=[
  {name:"Antiguidade",from:-650,to:450,w:.22},
  {name:"Idade Média e Renascimento",from:450,to:1600,w:.18},
  {name:"Modernidade",from:1600,to:1880,w:.28},
  {name:"Contemporâneo",from:1880,to:2030,w:.32},
];
function timeX(year){
  let left=0;
  for(const e of ERAS){
    if(year<=e.to||e===ERAS[ERAS.length-1])return (left+e.w*Math.max(0,Math.min(1,(year-e.from)/(e.to-e.from))))*100;
    left+=e.w;
  }
}
const yearText=y=>y<0?`${-y} a.C.`:`${y}`;
const lifeText=p=>p.born===undefined?"":p.legend?`séc. VI a.C. (data tradicional)`:
  `${p.approx?"c. ":""}${yearText(p.born)}${p.died===null?" até hoje":` a ${yearText(p.died)}`}`;
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
  const tag={top:"Seu par",near:"Parecido",opp:"Oposto"};
  let left=0;
  const eraMarks=ERAS.map(e=>{const s=`<span class="tl-era" style="left:${left*100}%;width:${e.w*100}%">${esc(e.name)}</span>`;left+=e.w;return s}).join("");
  return `<div class="panel tl-panel">
    <h2>Sua linhagem no tempo</h2>
    <p class="sub">Os ${PH.length} pensadores na época em que viveram. Destaque para o seu par, os 5 mais parecidos e o seu oposto. Toque em qualquer ponto para conhecer o pensador.</p>
    <div class="tl-scroll" tabindex="0" aria-label="Linha do tempo, role para os lados"><div class="tl" style="--rows:${rows.length}">
      <div class="tl-labels">${labels.map(l=>`<a class="tl-label ${l.kind}${l.x<9?" edge-l":l.x>91?" edge-r":""}" href="#/p/${l.p.id}" style="left:${l.x}%;--row:${l.row}">${portrait(l.p,{cls:"tl-pic"})}<span class="tl-name">${esc(l.p.n)}</span><span class="tl-tag">${tag[l.kind]}${l.kind==="top"&&r.top.pct!==null?` · ${r.top.pct}%`:""} · ${esc(lifeText(l.p))}</span>${l.kind==="top"?`<span class="tl-you">Você está aqui</span>`:""}</a>`).join("")}</div>
      <div class="tl-line"></div>
      <div class="tl-dots">${dots.map(d=>`<a class="tl-dot" href="#/p/${d.p.id}" style="left:${d.x}%;--row:${d.row}" title="${esc(d.p.n)} (${esc(lifeText(d.p))})" aria-label="${esc(d.p.n)}, ${esc(lifeText(d.p))}"></a>`).join("")}</div>
      <div class="tl-eras">${eraMarks}</div>
    </div></div>
  </div>`;
}

/* ---------- Audit ---------- */
const num=(x,d=6)=>x===null?"sem valor":x.toFixed(d).replace(".",",");
function auditPanel(r){
  const P=r.params,u=r.user;
  return `<details class="audit" id="audit">
    <summary><span><h2 class="t">Auditoria do cálculo</h2><span class="s">Cada passo, com os números exatos. Motor v${r.version} · código <span class="mono">${r.code}</span> · catálogo <span class="mono">${r.fingerprint}</span></span></span><span class="chev">${icon.chev}</span></summary>
    <div class="audit-body">
      <h3 class="h-audit">Passo 1 · Respostas viram eixos</h3>
      <div class="formula">valor da resposta: concordo totalmente +2 · concordo +1 · neutro 0 · discordo −1 · discordo totalmente −2
contribuição = valor × direção da afirmação (+1 ou −1)
posição no eixo = soma das 4 contribuições ÷ 8      (vai de −1 a +1)</div>
      <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Eixo</th><th>−1</th><th>+1</th><th class="n">Soma</th><th class="n">Máx.</th><th class="n">Posição</th></tr></thead><tbody>
      ${r.perAxis.map(a=>`<tr><td>${esc(AXES[a.axis].name)}</td><td>${esc(AXES[a.axis].l)}</td><td>${esc(AXES[a.axis].r)}</td><td class="n">${a.sum>0?"+":""}${a.sum}</td><td class="n">${a.max}</td><td class="n">${fmt(a.score,4)}</td></tr>`).join("")}
      </tbody></table></div>

      <h3 class="h-audit">Passo 2 · Formato do perfil</h3>
      <div class="formula">intensidade = média de |posição| nos 11 eixos
fator = mín(${P.maxGain}, ${r.catalogIntensity.toFixed(6)} ÷ intensidade)      (${r.catalogIntensity.toFixed(6)} = intensidade média do catálogo)
perfil normalizado = posição × fator
se a intensidade for menor que ${P.minIntensity}, o perfil não tem direção: fator 0 e nenhum percentual
O mesmo vale para cada pensador. Assim comparamos a direção do pensamento, não a força.

Sua intensidade: ${u.intensity.toFixed(6)}
Seu fator: ${r.directionless?"0 (perfil sem direção: o ranking usa só a distância bruta)":u.k.toFixed(6)+(u.capped?` (limitado pelo teto de ${P.maxGain})`:"")}</div>

      <h3 class="h-audit">Passo 3 · Comparação com um pensador</h3>
      <div class="formula">distância = média de |você normalizado − pensador normalizado| nos 11 eixos
compatibilidade = ${esc(E.PERCENT_RULE)}      (τ = ${P.tau})</div>
      <label class="muted" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:14px 0 12px;font-size:14px">Comparar com
        <select class="select" id="cmpSel">${r.ranking.map(x=>`<option value="${x.p.id}">${x.rank}º · ${esc(x.p.n)} · ${pctText(x.pct)}</option>`).join("")}</select>
      </label>
      <div id="cmpOut"></div>

      <h3 class="h-audit">Passo 4 · Ranking e desempate</h3>
      <div class="formula">ordem: ${esc(E.TIE_BREAK)}
eps = ${P.eps}      distância bruta = média de |sua posição − posição do pensador|, sem normalizar</div>
      <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th class="n">#</th><th>Pensador</th><th class="n">Distância</th><th class="n">Dist. bruta</th><th class="n">%</th><th>Desempate</th></tr></thead><tbody>
      ${r.ranking.map((x,i)=>`<tr class="${i===0||(r.opposite&&i===r.ranking.length-1)?"hl":""}"><td class="n">${x.rank}</td><td>${esc(x.p.n)} <span class="muted mono" style="font-size:11px">${x.p.id}</span></td><td class="n">${num(x.distance)}</td><td class="n">${num(x.rawDistance)}</td><td class="n">${x.pct===null?"sem %":x.pct}</td><td>${x.tiedWithPrev||x.tiedWithNext?`<span class="tie">empate de distância</span>`:""}</td></tr>`).join("")}
      </tbody></table></div>

      <h3 class="h-audit">Suas ${r.answers.length} respostas</h3>
      <p class="muted" style="font-size:13px;margin:0 0 10px">“Nº” é a posição da afirmação no catálogo, usada no código de respostas. “No teste” é a ordem em que ela apareceu para você.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">Nº</th><th class="n">No teste</th><th>Afirmação</th><th>Eixo</th><th>Resposta</th><th class="n">Contribuição</th></tr></thead><tbody>
      ${r.perQuestion.map(q=>`<tr><td class="n">${q.i+1}</td><td class="n">${q.shown}</td><td class="wrap">${esc(q.text)}</td><td>${esc(AXES[q.axis].name)} → ${esc(q.dir>0?AXES[q.axis].r:AXES[q.axis].l)}</td><td>${esc(SCALE[q.answer].label)} <span class="muted mono">(${q.answer})</span></td><td class="n">${q.contribution>0?"+":""}${q.contribution}</td></tr>`).join("")}
      </tbody></table></div>

      <h3 class="h-audit">Verificação</h3>
      <div class="audit-meta"><span>Motor <code>v${r.version}</code></span><span>Código do motor <code>${r.code}</code></span><span>Catálogo <code>${r.fingerprint}</code></span><span>Parâmetros <code>τ=${P.tau}</code> <code>teto=${P.maxGain}</code> <code>mín=${P.minIntensity}</code> <code>eps=${P.eps}</code></span><span>Respostas <code>${E.encode(r.answers)}</code></span></div>
      <p class="muted" style="font-size:13px;margin:12px 0 0">A tabela mostra 6 casas decimais. O arquivo de auditoria traz todos os números com precisão completa, para refazer a conta sem diferenças de arredondamento.</p>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px">
        <button class="btn sm ghost" id="dlAudit" type="button">Baixar auditoria (JSON)</button>
        <a class="btn sm ghost" href="#/verificar/${E.encode(r.answers)}">Verificar com cálculo independente</a>
        <a class="btn sm ghost" href="#/metodo">Ler o método completo</a>
      </div>
    </div>
  </details>`;
}
function wireAudit(r){
  const sel=document.getElementById("cmpSel"),out=document.getElementById("cmpOut");
  const draw=()=>{
    const x=r.ranking.find(y=>y.p.id===sel.value);
    out.innerHTML=`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Eixo</th><th class="n">Você</th><th class="n">Você norm.</th><th class="n">${esc(x.p.n)}</th><th class="n">Norm.</th><th class="n">|Dif.|</th></tr></thead><tbody>
      ${x.perAxis.map(a=>`<tr><td>${esc(AXES[a.axis].name)}</td><td class="n">${fmt(r.scores[a.axis],4)}</td><td class="n">${fmt(a.user,6)}</td><td class="n">${fmt(a.thinkerRaw,1)}</td><td class="n">${fmt(a.thinker,6)}</td><td class="n">${a.diff.toFixed(6)}</td></tr>`).join("")}
      <tr class="hl"><td colspan="5">Distância (média das diferenças) → ${x.rank}º lugar</td><td class="n">${x.distance.toFixed(6)}</td></tr>
      <tr class="hl"><td colspan="5">${x.pct===null?"Perfil sem direção: sem percentual":`max(1, min(100, round(100 × e^(−(${x.distance.toFixed(6)} ÷ ${r.params.tau})²))))`}</td><td class="n">${pctText(x.pct)}</td></tr>
      <tr><td colspan="5">Distância bruta (desempate)</td><td class="n">${x.rawDistance.toFixed(6)}</td></tr>
    </tbody></table></div><p class="muted" style="font-size:13px;margin:8px 0 0">Intensidade do pensador ${x.thinkerIntensity.toFixed(6)} · fator ${x.thinkerK.toFixed(6)}</p>`;
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
    <span class="eyebrow">Catálogo</span>
    <h1 class="h2" style="font-size:clamp(52px,8vw,112px)">${ALL.length} pensadores</h1>
    <p class="lede" style="margin-top:16px">${new Set(PH.map(p=>p.s)).size} correntes, da Grécia antiga a hoje. ${lastR?"Cada card mostra sua compatibilidade e sua posição no ranking.":"Faça o teste para ver sua compatibilidade com cada um."}</p>
    <div class="cat-tools">
      <label class="sr" for="q">Buscar pensador ou corrente</label>
      <input class="search" id="q" type="search" placeholder="Buscar pensador ou corrente" autocomplete="off">
      <div class="chips" role="group" aria-label="Filtrar por época">
        <button class="chip" type="button" aria-pressed="true" data-era="">Todos</button>
        ${eras.map(e=>`<button class="chip" type="button" aria-pressed="false" data-era="${esc(e)}">${esc(e)}</button>`).join("")}
      </div>
      <label class="sr" for="sortSel">Ordenar</label>
      <select class="select" id="sortSel">
        ${lastR?`<option value="match">Mais compatíveis comigo</option>`:""}
        <option value="era">Ordem histórica</option>
        <option value="az">Ordem alfabética</option>
      </select>
    </div>
    <p class="sr" id="count" aria-live="polite"></p>
    <div class="cards" id="cards"></div>
  </section>`,"Pensadores");
  const norm=s=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const draw=()=>{
    const list=ALL.filter(p=>(!era||p.era===era)&&(!q||norm(p.n+" "+p.s).includes(norm(q))));
    if(sort==="az")list.sort((a,b)=>a.n.localeCompare(b.n));
    // Main and Brazilian thinkers share one scale (same normalized distance), so they sort together.
    if(sort==="match")list.sort((a,b)=>rankOf[a.id].distance-rankOf[b.id].distance||(a.id<b.id?-1:1));
    document.getElementById("count").textContent=`${list.length} pensadores`;
    document.getElementById("cards").innerHTML=list.length?list.map(p=>`<a class="tcard" href="#/p/${p.id}"><span class="tcard-art">${portrait(p)}<span class="mini">${sigil(p.v,{decorative:true,cls:"sg-user"})}</span></span><span class="nm">${esc(p.n)}</span><span class="sc">${esc(p.s)} · ${esc(p.era)}</span>${lastR?`<span class="pc">${hasPct?`${pctOf(p.id)}% com você`:""}${p.era==="Brasil"?"":`${hasPct?" · ":""}${rankOf[p.id].rank}º`}</span>`:""}</a>`).join(""):`<p class="empty">Nenhum pensador encontrado.</p>`;
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
  if(!p){renderNotFound("Não encontramos esse pensador.");return}
  const last=store.get("last"),lastR=last&&E.decode(last)?E.evaluate(E.decode(last)):null;
  const mine=lastR&&(lastR.ranking.find(x=>x.p.id===id)||lastR.brazil.find(x=>x.p.id===id));
  const ofN=lastR&&lastR.ranking.some(x=>x.p.id===id)?`${PH.length}`:`${E.BRAZIL.length} brasileiros`;
  // Closest thinkers by the same rule the engine uses for users: this thinker's positions as the profile.
  const twins=E.rank(p.v).rows.filter(x=>x.p.id!==p.id).slice(0,4).map(x=>({x:x.p}));
  mount(`
  <section class="wrap th-hero">
    <div>
      <a class="back" href="#/pensadores">${icon.back} Todos os pensadores</a>
      <h1 class="res-name" style="margin-top:18px"><span class="line"><span>${esc(p.n)}</span></span></h1>
      <div class="res-school">${esc(p.s)} · ${esc(p.era)}</div>
      <blockquote class="res-quote">“${esc(p.q)}”</blockquote>
      <div class="res-actions">${mine?`<span class="btn ghost" style="cursor:default">${mine.pct===null?"":`${mine.pct}% com você · `}${mine.rank}º de ${ofN}</span>`:`<a class="btn accent" href="#/teste">Ver minha compatibilidade ${icon.arrow}</a>`}</div>
    </div>
    ${duo(p,{user:lastR?lastR.scores:null,thinkerFirst:true,title:lastR?`Perfil de ${p.n} comparado ao seu`:`Perfil de ${p.n}`})}
  </section>
  <section class="wrap" style="padding-bottom:64px">
    <div class="grid2">
      <div class="panel"><h2>Posições</h2><p class="sub">Laranja: ${esc(p.n)}.${lastR?" Tracejado: você.":""} Posições do catálogo, de −1 a +1.</p>
        <div class="panel-sigil">${sigil(p.v,{labels:true,cls:"sg-user",compare:lastR?lastR.scores:null,tips:true,title:`Perfil de ${p.n} nos 11 eixos`})}</div><p class="tip-hint"><span class="on-hover">Passe o mouse</span><span class="on-touch">Toque</span> em cada eixo para ver a posição de ${esc(p.n)}.</p>
        ${AXES.map((a,i)=>axisRow(a,p.v[i],lastR?lastR.scores[i]:undefined,p.n,"você")).join("")}</div>
      <div style="display:grid;gap:20px;align-content:start">
        ${aboutHTML(p,{title:"Quem foi"})}
        ${kinHTML(p)}
        <div class="panel"><h2>Para ler</h2><div class="book" style="margin-top:16px"><span class="cover" aria-hidden="true">${esc(p.n)}</span><span class="t">${esc(p.b)}</span></div></div>
        <div class="panel"><h2>Parentes próximos</h2><p class="sub">Pensadores com o formato mais parecido.</p>
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
    <span class="eyebrow">Método</span>
    <h1 class="h2" style="font-size:clamp(52px,8vw,112px)">Como o <em class="it accent">motor</em> pensa</h1>
    <div class="stat-grid">
      <div class="stat"><b>${E.LEVELS.map(l=>l.n).join(" · ")}</b><span>afirmações nos 3 níveis</span></div>
      <div class="stat"><b>${AXES.length}</b><span>eixos independentes</span></div>
      <div class="stat"><b>${PH.length}</b><span>pensadores</span></div>
      <div class="stat"><b class="mono" style="font-size:24px;padding:8px 0 6px">${E.codeFingerprint()}</b><span>código do motor v${E.VERSION}</span></div>
      <div class="stat"><b class="mono" style="font-size:24px;padding:8px 0 6px">${E.fingerprint()}</b><span>catálogo</span></div>
    </div>
    <div class="prose">
      <h2>1. Afirmações equilibradas, em três níveis</h2>
      <p>O teste tem três níveis que se somam: ${E.LEVELS.map(l=>`${l.name}, com ${l.n} afirmações`).join("; ")}. Cada nível acrescenta 4 afirmações por eixo, e em cada bloco duas puxam para um polo e duas para o outro. Quem concorda com tudo, ou discorda de tudo, cai exatamente no centro em qualquer nível. Isso anula o viés de quem tende a dizer sim.</p>
      <p>Mais afirmações reduzem o efeito de uma resposta dada no impulso. Numa simulação com respostas imprecisas, a mesma pessoa recebe o mesmo par ao refazer o teste em ${E.LEVELS.map(l=>`${LEVEL_INFO[l.id].retest} das vezes no ${l.name}`).join(", ")}.</p>
      <p>As afirmações aparecem misturadas entre os eixos, em rodízio dentro de cada nível. As respostas são guardadas sempre pela posição da afirmação no catálogo, por isso um resultado do nível Rápido pode ser aprofundado sem perder nada, e a auditoria mostra as duas numerações.</p>
      <h2>2. Da resposta ao eixo</h2>
      <div class="formula">concordo totalmente +2 · concordo +1 · neutro 0 · discordo −1 · discordo totalmente −2
contribuição = valor × direção (+1 ou −1)
posição = soma das contribuições do eixo ÷ (2 × afirmações do eixo)        ∈ [−1, +1]</div>
      <h2>3. Formato, não força</h2>
      <p>Duas pessoas podem pensar na mesma direção com intensidades diferentes: uma marca “concordo”, outra “concordo totalmente”. Para que as duas encontrem o mesmo par, ajustamos a intensidade.</p>
      <div class="formula">intensidade = média de |posição| nos 11 eixos
fator = mín(${P.maxGain}, ${ci} ÷ intensidade)
normalizado = posição × fator</div>
      <p>${ci} é a intensidade média do catálogo. A mesma conta vale para os pensadores, então nem os moderados nem os radicais levam vantagem.</p>
      <p>O fator nunca passa de ${P.maxGain}. Sem esse teto, um perfil quase neutro, com um único eixo levemente marcado, seria ampliado até esse eixo decidir sozinho o resultado.</p>
      <p>Se a intensidade fica abaixo de ${P.minIntensity}, o perfil não tem direção. Nesse caso não existe formato para comparar: o resultado mostra o pensador cujas posições ficam mais perto das suas, sem percentual e sem oposto.</p>
      <h2>4. Distância e compatibilidade</h2>
      <div class="formula">distância = média de |você normalizado − pensador normalizado| nos 11 eixos
compatibilidade = ${esc(E.PERCENT_RULE)}
τ = ${P.tau}</div>
      <p>A curva faz pares próximos parecerem próximos e derruba rápido os distantes. O resultado é arredondado para o inteiro mais próximo e fica sempre entre 1 e 100. O valor ${P.tau} foi calibrado para que responder exatamente como um pensador dê 85% ou mais.</p>
      <h2>5. Ranking e desempate</h2>
      <p>Empates exatos de distância acontecem com frequência, porque as respostas são números inteiros. A ordem é sempre esta:</p>
      <div class="formula">${esc(E.TIE_BREAK)}
eps = ${P.eps}
distância bruta = média de |sua posição − posição do pensador|, sem normalizar</div>
      <p>O id é comparado pelos códigos dos caracteres, sem depender do idioma do navegador. Assim, as mesmas respostas dão sempre o mesmo ranking, em qualquer computador. A auditoria marca cada empate e mostra a distância bruta usada para desfazê-lo.</p>
      <h3>Pensadores brasileiros</h3>
      <p>O resultado também mostra quem, no Brasil, pensa como você. São ${E.BRAZIL.length} pensadores brasileiros: um catálogo próprio de ${BR.length}, mais os ${PH.filter(p=>p.br).length} brasileiros do catálogo principal. Eles são comparados com a mesma conta, num ranking separado, para que o ranking principal continue com os mesmos ${PH.length} pensadores.</p>
      <h3>Comparar com outra pessoa</h3>
      <p>Duas pessoas são comparadas exatamente como uma pessoa e um pensador: os dois perfis são normalizados, a distância é a média das diferenças nos 11 eixos e a compatibilidade usa a mesma curva. A conta é simétrica, e uma pessoa comparada consigo mesma dá 100%.</p>
      <h2>6. Aviso de confiabilidade</h2>
      <p>Se você escolhe a mesma opção em ${Math.round(P.repeatWarning*100)}% das afirmações ou mais (no nível Rápido, ${Math.ceil(P.repeatWarning*E.LEVELS[0].n)} de ${E.LEVELS[0].n}), ou se a intensidade fica abaixo de ${P.centerWarning}, o resultado vem com um aviso.</p>
      <h2>7. Como verificamos</h2>
      <p>Uma bateria de testes automatizados roda sobre o motor e o catálogo. Ela confere, entre outras coisas:</p>
      <ul>
        <li>que o motor e o verificador independente chegam aos mesmos números, sem nenhuma diferença, em milhares de respostas aleatórias, inclusive nos empates;</li>
        <li>que o arquivo de auditoria basta, sozinho, para refazer o ranking inteiro;</li>
        <li>que todos os ${PH.length} pensadores vencem quando alguém responde exatamente como eles;</li>
        <li>que nenhum pensador concentra mais de 5% dos resultados em usuários simulados;</li>
        <li>que mudar duas respostas em um passo mantém o mesmo par no top 3 em mais de 95% dos casos;</li>
        <li>que todos os 11 eixos influenciam o resultado.</li>
      </ul>
      <p>Uma segunda auditoria prova que todos os ${PH.length} pensadores, e portanto todas as ${new Set(PH.map(p=>p.s)).size} correntes, podem ser o resultado: pelo perfil exato de cada um, por uma busca que parte de respostas aleatórias e por simulação com 60 mil pessoas. O mesmo vale para os ${E.BRAZIL.length} pensadores do ranking brasileiro.</p>
      <h3>Sem viés de lado, de época ou de nível</h3>
      <ul>
        <li><b>Espelho:</b> inverter todas as respostas inverte exatamente todos os eixos. E se o catálogo inteiro também for espelhado, o ranking sai idêntico, com as mesmas distâncias. A fórmula não prefere nenhum polo.</li>
        <li><b>Épocas:</b> cada época vence numa proporção próxima do seu peso no catálogo. Antigos, medievais, modernos, contemporâneos e orientais têm a mesma chance por pensador.</li>
        <li><b>Polos:</b> em cada um dos 22 polos, pelo menos 65% das pessoas fortemente nele recebem um par do mesmo lado. Quando um polo ficou abaixo disso, o problema era falta de pensadores ali, e o catálogo ganhou nomes como Lucrécio, Yang Zhu, La Mettrie, Fourier, Wilde, Marcuse, Oakeshott, Kirk, Sidgwick, Godwin e Frege.</li>
        <li><b>Níveis:</b> passar de 44 para 132 afirmações refina a posição sem empurrá-la para nenhum lado: o deslocamento médio é praticamente zero em todos os eixos.</li>
      </ul>
      <h2>8. Verifique você mesmo</h2>
      <p>Nada aqui depende de confiança. O verificador refaz qualquer resultado com uma segunda implementação, num arquivo separado (<code>verify.js</code>) que não compartilha código com o motor, e compara cada número do arquivo de auditoria.</p>
      <p>As duas impressões digitais usam ${esc(E.HASH_RULE)}. A do código cobre o motor inteiro, com as quebras de linha normalizadas. A do catálogo cobre exatamente o objeto <code>fingerprintInput</code> incluído no catálogo para download, com eixos, afirmações, nomes, ids e posições.</p>
      <div class="cta-row" style="margin:20px 0 8px">
        <a class="btn accent sm" href="#/verificar">Abrir o verificador</a>
        <button class="btn ghost sm" id="dlCatalog" type="button">Baixar catálogo (JSON)</button>
        <a class="btn ghost sm" href="engine.js" target="_blank" rel="noopener">Ver código do motor</a>
        <a class="btn ghost sm" href="verify.js" target="_blank" rel="noopener">Ver código do verificador</a>
        <a class="btn ghost sm" href="https://github.com/tiagocardosobezerra/filosofometro" target="_blank" rel="noopener">Código completo e testes no GitHub</a>
      </div>
      <h2>9. Limites honestos</h2>
      <p>As posições dos pensadores são uma leitura acadêmica resumida, revisada mas discutível: filósofos reais não cabem em 11 números. As frases de autores modernos são paráfrases curtas. Use o resultado como porta de entrada para ler, não como diagnóstico.</p>
      <h2>10. Quem fez</h2>
      <p>O Filosofômetro foi criado por <a href="https://github.com/tiagocardosobezerra" target="_blank" rel="noopener author">Tiago Cardoso Bezerra</a>. É gratuito, sem anúncios e sem cadastro, e suas respostas ficam só no seu navegador.</p>
    </div>
  </section>`,"Método");
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
function renderVerify(code){
  const current={catalog:E.fingerprint(),code:E.codeFingerprint()};
  mount(`
  <section class="wrap section" style="padding-top:clamp(32px,6vh,64px)">
    <span class="eyebrow">Verificação</span>
    <h1 class="h2" style="font-size:clamp(48px,7vw,96px)">Confira qualquer <em class="it accent">resultado</em></h1>
    <p class="lede" style="margin-top:16px;max-width:58ch">Cole um link de resultado ou envie o arquivo de auditoria. Esta página refaz a conta com uma segunda implementação, que não compartilha código com o motor, e compara cada número: respostas, eixos, normalização, distâncias, desempates e percentuais.</p>
    <div class="verify-form">
      <label class="sr" for="vIn">Link ou código do resultado</label>
      <input class="search" id="vIn" placeholder="Cole o link do resultado ou o código de respostas" value="${code?esc(code):""}" autocomplete="off" spellcheck="false">
      <button class="btn accent" id="vGo" type="button">Verificar</button>
      <label class="btn ghost" for="vFile" style="cursor:pointer">Enviar auditoria (JSON)</label>
      <input type="file" id="vFile" accept="application/json,.json" class="sr">
    </div>
    <div id="vOut" aria-live="polite"></div>
  </section>`,"Verificar");
  const out=document.getElementById("vOut");
  const fail=msg=>{out.innerHTML=`<p class="note">${icon.info}<span>${esc(msg)}</span></p>`};
  // A link is checked by exporting the engine's audit and comparing it with the independent recomputation.
  // An uploaded file is compared as is, so any edited number in it shows up.
  const show=(audit,source)=>{
    const checks=AgoraVerify.checkAudit(AgoraData,audit,current),all=checks.every(c=>c.ok);
    const answers=E.decode(audit.answers&&audit.answers.code);
    const r=answers&&E.evaluate(answers);
    out.innerHTML=`<div class="verdict ${all?"ok":"bad"}"><span class="v-ic">${all?"✓":"!"}</span><span><b>${all?"Tudo confere.":"Há divergências."}</b> ${all?`O motor e o verificador independente chegam aos mesmos números${r?(r.directionless?`: perfil sem direção, mais perto de ${esc(r.top.p.n)}.`:`: ${r.top.pct}% ${esc(r.top.p.n)}.`):"."}`:"Veja os itens marcados abaixo."}</span></div>
      <p class="muted" style="font-size:14px;margin:0 0 12px">Fonte verificada: ${esc(source)}</p>
      <ul class="checks">${checks.map(c=>`<li class="${c.ok?"ok":"bad"}"><span class="v-ic" aria-hidden="true">${c.ok?"✓":"✗"}</span><span><b>${esc(c.label)}</b><span class="muted">${esc(c.detail)}</span></span><span class="sr">${c.ok?"confere":"não confere"}</span></li>`).join("")}</ul>
      <div class="audit-meta" style="margin-top:16px"><span>Motor <code>v${E.VERSION}</code></span><span>Código do motor <code>${current.code}</code></span><span>Catálogo <code>${current.catalog}</code></span></div>
      ${answers?`<div class="cta-row" style="margin-top:20px"><a class="btn ghost sm" href="#/r/${E.encode(answers)}">Abrir este resultado</a></div>`:""}`;
  };
  const fromLink=t=>{
    const answers=codeFromText(t);
    if(!answers){fail("Não reconheci esse resultado. O código precisa ter 44, 88 ou 132 dígitos de 0 a 4, como nos links do Filosofômetro.");return}
    show(E.auditJSON(E.evaluate(answers)),"link de resultado, recalculado pelo motor agora");
  };
  document.getElementById("vGo").addEventListener("click",()=>fromLink(document.getElementById("vIn").value));
  document.getElementById("vIn").addEventListener("keydown",e=>{if(e.key==="Enter")fromLink(e.target.value)});
  document.getElementById("vFile").addEventListener("change",async e=>{
    const f=e.target.files[0];if(!f)return;
    let j=null;try{j=JSON.parse(await f.text())}catch(err){}
    if(!j||j.format!=="filosofometro-audit/2"){fail("Esse arquivo não é uma auditoria do Filosofômetro nesta versão (formato filosofometro-audit/2).");return}
    show(j,`arquivo ${f.name}`);
  });
  if(code)fromLink(code);
}

function renderNotFound(msg="Esta página não existe."){
  mount(`<section class="wrap section"><span class="eyebrow">Ops</span><h1 class="h2">${esc(msg)}</h1><div class="cta-row" style="margin-top:32px"><a class="btn accent" href="#/">Ir para o início ${icon.arrow}</a></div></section>`,"Não encontrado");
}

/* ---------- Share ---------- */
function toast(t,ms=2200){const el=document.getElementById("toast");el.textContent=t;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),ms)}
async function copyLink(){
  try{await navigator.clipboard.writeText(location.href);toast("Link copiado")}
  catch(e){prompt("Copie o link:",location.href)}
}
async function shareCard(r,usePic=true){
  await document.fonts.ready;
  const W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d"),p=r.top.p;
  const bg="#0F0E0C",ink="#F1EADC",muted="#9C9283",accent="#F06A43",line="rgba(241,234,220,.16)";
  const near=r.ranking.slice(1,4),br=r.brazil[0]?r.brazil[0].p:null,opp=r.opposite?r.opposite.p:null;
  const pics=usePic?await Promise.all([p,...near.map(n=>n.p)].map(t=>t.img?loadImage(t.img):Promise.resolve(null))):[];
  const [pic,...nearPics]=pics;
  // Background: deep ink with a warm glow behind the portrait.
  x.fillStyle=bg;x.fillRect(0,0,W,H);
  const g=x.createRadialGradient(W/2,560,60,W/2,560,820);g.addColorStop(0,"rgba(240,106,67,.30)");g.addColorStop(1,"rgba(240,106,67,0)");
  x.fillStyle=g;x.fillRect(0,0,W,H);
  x.textAlign="center";
  x.fillStyle=ink;x.font="400 50px 'Instrument Serif'";x.fillText("Filosofômetro",W/2,108);
  x.fillStyle=muted;x.font="600 26px 'Inter Tight'";x.fillText(spaced("MEU PAR FILOSÓFICO"),W/2,160);
  // Portrait arch with the sigil badge over its corner.
  const ax=300,ay=200,aw=480,ah=590,rad=aw/2;
  const arch=()=>{x.beginPath();x.moveTo(ax,ay+rad);x.arc(ax+rad,ay+rad,rad,Math.PI,0);x.lineTo(ax+aw,ay+ah-26);x.quadraticCurveTo(ax+aw,ay+ah,ax+aw-26,ay+ah);x.lineTo(ax+26,ay+ah);x.quadraticCurveTo(ax,ay+ah,ax,ay+ah-26);x.closePath()};
  x.save();arch();x.clip();
  if(pic){
    const sc=Math.max(aw/pic.width,ah/pic.height),dw=pic.width*sc,dh=pic.height*sc;
    x.filter="grayscale(1) sepia(.22) contrast(1.08) brightness(.97)";x.drawImage(pic,ax+(aw-dw)/2,ay+(ah-dh)*.2,dw,dh);x.filter="none";
    const tint=x.createLinearGradient(0,ay+ah*.45,0,ay+ah);tint.addColorStop(0,"rgba(240,106,67,0)");tint.addColorStop(1,"rgba(240,106,67,.45)");
    x.globalCompositeOperation="multiply";x.fillStyle=tint;x.fillRect(ax,ay,aw,ah);x.globalCompositeOperation="source-over";
  }else{x.fillStyle="#1D1A16";x.fillRect(ax,ay,aw,ah);x.fillStyle=muted;x.font="400 160px 'Instrument Serif'";x.fillText(initials(p.n),W/2,ay+ah/2+50)}
  x.restore();
  x.strokeStyle=line;x.lineWidth=2;arch();x.stroke();
  // Badge sits on the arch's lower right, clear of the percentage below it.
  const cx=ax+aw+10,cy=ay+ah-165,S=1.4;
  x.beginPath();x.arc(cx,cy,R*S+22,0,Math.PI*2);x.fillStyle="rgba(21,19,15,.92)";x.fill();x.strokeStyle=line;x.stroke();
  [.33,.66,1].forEach(f=>{x.beginPath();x.arc(cx,cy,R*(.16+.84*f)*S,0,Math.PI*2);x.strokeStyle=line;x.lineWidth=1.5;x.stroke()});
  const poly=(v,fill,stroke,dash)=>{x.beginPath();pts(v).forEach(([a,b],i)=>i?x.lineTo(cx+a*S,cy+b*S):x.moveTo(cx+a*S,cy+b*S));x.closePath();x.setLineDash(dash||[]);if(fill){x.fillStyle=fill;x.fill()}x.strokeStyle=stroke;x.lineWidth=3.5;x.stroke();x.setLineDash([])};
  poly(p.v,null,"rgba(241,234,220,.8)",[8,9]);
  poly(r.scores,"rgba(240,106,67,.22)",accent);
  // Headline: percent, name, line and years.
  let y=ay+ah+150;
  x.fillStyle=accent;x.font="400 176px 'Instrument Serif'";x.fillText(r.top.pct+"%",W/2,y);
  x.fillStyle=ink;x.font="400 98px 'Instrument Serif'";y=wrapText(x,p.n,W/2,y+106,960,96);
  x.fillStyle=muted;x.font="600 28px 'Inter Tight'";x.fillText(`${p.s} · ${lifeText(p)}`.toUpperCase(),W/2,y+60);
  y+=60;
  // Quote, only if it fits above the lower blocks.
  x.font="italic 400 42px 'Instrument Serif'";
  const quoteLines=lineCount(x,"“"+p.q+"”",880);
  if(y+50+quoteLines*50<1300){x.fillStyle=ink;y=wrapText(x,"“"+p.q+"”",W/2,y+74,880,50);}
  // Strongest traits as pills.
  const traits=AXES.map((a,i)=>({lbl:r.scores[i]<0?a.l:a.r,s:Math.abs(r.scores[i])})).filter(t=>t.s>=.25).sort((a,b)=>b.s-a.s).slice(0,3).map(t=>t.lbl);
  if(traits.length){
    x.font="600 28px 'Inter Tight'";
    const pw=traits.map(t=>x.measureText(t).width+48),total=pw.reduce((a,b)=>a+b,0)+(traits.length-1)*14;
    let px=W/2-total/2;const py=Math.max(y+56,1250);
    traits.forEach((t,i)=>{pill(x,px,py,pw[i],54,"rgba(240,106,67,.18)");x.fillStyle=accent;x.textAlign="center";x.fillText(t,px+pw[i]/2,py+37);px+=pw[i]+14});
  }
  // Also think like: three runner-ups with portraits.
  x.fillStyle=muted;x.font="600 24px 'Inter Tight'";x.textAlign="center";x.fillText(spaced("TAMBÉM PENSO COMO"),W/2,1420);
  near.forEach((n,i)=>{
    const nx=W/2+(i-1)*300,ny=1510;
    circlePic(x,nearPics[i],n.p,nx,ny,62,line);
    x.fillStyle=ink;x.font="400 38px 'Instrument Serif'";x.fillText(shortName(n.p.n),nx,ny+108);
    x.fillStyle=accent;x.font="600 26px 'Inter Tight'";x.fillText(`${n.pct}%`,nx,ny+144);
  });
  // Brazilian match and opposite.
  x.fillStyle=muted;x.font="500 28px 'Inter Tight'";
  const lineBr=[br?`No Brasil: ${br.n}`:"",opp?`Oposto: ${opp.n}`:""].filter(Boolean).join("   ·   ");
  x.fillText(lineBr,W/2,1730);
  // Call to action band.
  pill(x,90,1768,W-180,120,accent);
  x.fillStyle="#140B07";x.font="600 30px 'Inter Tight'";x.fillText("Qual filósofo pensa como você?",W/2,1816);
  x.font="700 38px 'Inter Tight'";x.fillText(location.host||"filosofometro.vercel.app",W/2,1862);
  // A portrait served without CORS taints the canvas; redraw without images rather than fail.
  let blob;
  try{blob=await new Promise((res,rej)=>{try{c.toBlob(b=>b?res(b):rej(new Error("empty")),"image/png")}catch(e){rej(e)}})}
  catch(e){if(usePic)return shareCard(r,false);toast("Não foi possível gerar a imagem");return}
  const file=new File([blob],`filosofometro-${p.id}.png`,{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],text:challengeText(r),url:inviteURL(r)});return}catch(e){if(e.name==="AbortError")return}
  }
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`filosofometro-${p.id}.png`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast("Imagem salva. Poste no story e cole o link do convite!");
}
// Canvas helpers for the story card.
const spaced=s=>s.split("").join(" ");
const initials=n=>n.split(" ").filter(w=>/^[A-ZÀ-Ý]/.test(w)).slice(0,2).map(w=>w[0]).join("");
const shortName=n=>{const w=n.split(" ");return w.length>2?w.slice(-1)[0]:n};
function pill(x,px,py,w,h,fill){x.beginPath();x.roundRect(px,py,w,h,h/2);x.fillStyle=fill;x.fill()}
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
    tip.innerHTML=`<button class="tip-x" type="button" aria-label="Fechar">×</button><b class="tip-t">${esc(p.n)}</b><span class="tip-poles">${esc(p.s)} · ${esc(p.era)}</span><span>${esc(lifeText(p))}${p.place?` · ${esc(p.place)}`:""}</span><a class="btn accent sm tip-go" href="#/p/${p.id}">Conhecer ${esc(p.n)} ${icon.arrow}</a>`;
    tip.style.left=tip.style.top="";tip.classList.add("show","sheet");
  }));
  tip.ontransitionend=()=>{if(!tip.classList.contains("show"))armed=null};
}

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
  addEventListener("appinstalled",()=>{btn.classList.add("hidden");deferred=null;toast("App instalado")});
  if(ios&&!standalone)btn.classList.remove("hidden");
  btn.addEventListener("click",async()=>{
    if(deferred){deferred.prompt();await deferred.userChoice.catch(()=>{});deferred=null;btn.classList.add("hidden");return}
    if(ios)toast("No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início",6000);
  });
}
})();
