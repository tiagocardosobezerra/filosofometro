// Filosofômetro UI. All numbers come from AgoraEngine; this file only renders and routes.
(function(){
const E=AgoraEngine.create(AgoraData);
const {AXES,QS,PH,SCALE}=E;
const app=document.getElementById("app");
const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
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
function tipHTML(ax,{user=null,r=null,p=null}){
  const a=AXES[ax];
  let h=`<b class="tip-t">${esc(cap(a.name))}</b><span class="tip-poles">${esc(a.l)} ↔ ${esc(a.r)}</span>`;
  if(user)h+=`<span class="tip-row"><i class="tip-dot you"></i>Você: ${num2(user[ax])} · ${esc(lean(a,user[ax]))}</span>`;
  if(p)h+=`<span class="tip-row"><i class="tip-dot them"></i>${esc(p.n)}: ${num2(p.v[ax])} · ${esc(lean(a,p.v[ax]))}</span>`;
  if(r)h+=`<span class="tip-why"><b>Por quê:</b> ${esc(whyUser(r,ax))}</span>`;
  else if(p){const c=thinkerCite(p,ax);if(c)h+=`<span class="tip-why"><b>${esc(p.n)}:</b> ${esc(c)}</span>`;}
  return h;
}
function wireTips(root,ctx){
  const tip=document.getElementById("tip");
  const hide=()=>{tip.classList.remove("show")};
  const place=(x,y)=>{
    const w=tip.offsetWidth,h=tip.offsetHeight,m=12;
    let left=x+16,top=y+16;
    if(left+w>innerWidth-m)left=x-w-16;
    if(top+h>innerHeight-m)top=y-h-16;
    tip.style.left=Math.max(m,left)+"px";tip.style.top=Math.max(m,top)+"px";
  };
  root.querySelectorAll(".sg-hit").forEach(el=>{
    const showAt=(x,y)=>{tip.innerHTML=tipHTML(+el.dataset.ax,ctx);tip.classList.add("show");place(x,y)};
    el.addEventListener("pointerenter",e=>showAt(e.clientX,e.clientY));
    el.addEventListener("pointermove",e=>place(e.clientX,e.clientY));
    el.addEventListener("pointerleave",hide);
    el.addEventListener("focus",()=>{const b=el.getBoundingClientRect();showAt(b.left+b.width/2,b.top+b.height/2)});
    el.addEventListener("blur",hide);
    // On touch screens a tap shows the explanation; tapping elsewhere hides it.
    el.addEventListener("click",e=>{const b=el.getBoundingClientRect();showAt(e.clientX||b.left,e.clientY||b.top)});
  });
  const onDoc=e=>{if(!e.target.closest||!e.target.closest(".sg-hit"))hide()};
  document.addEventListener("pointerdown",onDoc);
  onLeave(()=>{document.removeEventListener("pointerdown",onDoc);hide()});
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
  if(a11yNav(name))return;
  if(name==="teste")renderQuiz();
  else if(name==="r")renderResult(parts[1]);
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
}
function focusHeading(){
  const h=app.querySelector("h1");
  if(h){h.setAttribute("tabindex","-1");h.focus({preventScroll:true})}
}
addEventListener("hashchange",()=>{route();focusHeading()});

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
      <p class="lede">Responda 44 afirmações sobre verdade, liberdade, moral e poder. Descubra seu par entre 93 pensadores, sua corrente e quem mais discordaria de você.</p>
      <div class="cta-row">
        <a class="btn accent" href="#/teste" ${resume?"":'data-fresh="1"'}>${resume?`Continuar de onde parei · ${done}/44`:"Começar o teste"} ${icon.arrow}</a>
        ${resume?`<a class="btn ghost" href="#/teste" data-fresh="1">Recomeçar</a>`:`<a class="btn ghost" href="#/metodo">Como funciona</a>`}
      </div>
      <div class="facts"><span><b>≈ 6 min</b></span><span><b>44</b> afirmações</span><span><b>11</b> eixos</span><span><b>93</b> pensadores</span><span>Sem cadastro</span></div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="duo hero-duo">
        <figure class="portrait" id="heroPic"><img alt="" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer"><img alt="" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer"></figure>
        <div class="sigil-badge" id="heroSigil"></div>
      </div>
      <div class="hero-caption fade-swap" id="heroCap"><div class="who"></div><div class="what"></div></div>
    </div>
  </section>
  <div class="marquee" aria-hidden="true"><div class="track">${names}${names}</div></div>
  <section class="wrap section">
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
      <div class="step"><span class="num">i.</span><h3>Você responde</h3><p>Concorde ou discorde de 44 afirmações. Elas vêm misturadas, e metade de cada eixo puxa para cada lado.</p></div>
      <div class="step"><span class="num">ii.</span><h3>Mapeamos seu formato</h3><p>Suas respostas viram uma posição em 11 eixos. Comparamos o formato desse perfil com o de 93 pensadores.</p></div>
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

function heroAnimation(){
  const host=document.getElementById("heroSigil"),cap=document.getElementById("heroCap");
  const deck=PH.slice().sort(()=>Math.random()-.5);
  let idx=0,cur=deck[0].v.slice(),raf=0,timer=0,front=0;
  // Two stacked images crossfade, and the next portrait is preloaded one step ahead.
  const imgs=[...document.querySelectorAll("#heroPic img")];
  const preload=p=>{const i=new Image();i.crossOrigin="anonymous";i.referrerPolicy="no-referrer";i.src=p.img};
  imgs[0].src=deck[0].img;imgs[0].classList.add("on");preload(deck[1]);
  const setCap=p=>{cap.querySelector(".who").textContent=p.n;cap.querySelector(".what").textContent=p.s};
  host.innerHTML=sigil(cur,{cls:"sg-user",decorative:true});setCap(deck[0]);
  if(reduceMotion)return;
  const tick=()=>{
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
function renderQuiz(){
  // Saved progress is used only if every stored answer is empty or a valid code and the position is in range.
  let saved=store.get("progress");
  const validSaved=saved&&Array.isArray(saved.answers)&&saved.answers.length===QS.length&&
    saved.answers.every(a=>a===null||(Number.isInteger(a)&&a>=0&&a<=4))&&
    Number.isInteger(saved.pos)&&saved.pos>=0&&saved.pos<QS.length;
  if(!validSaved)saved={answers:new Array(QS.length).fill(null),pos:0};
  const answers=saved.answers;
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
      <span class="axis-tag" id="axisTag"></span>
      <a class="link-btn" href="#/">Sair <span class="sr">do teste (seu progresso fica salvo)</span></a>
    </div>
    <div class="progress" aria-hidden="true">${ORDER.map(()=>"<i></i>").join("")}</div>
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
    <div class="quiz-foot">
      <span style="display:flex;gap:20px;align-items:center"><button type="button" class="link-btn" id="prevBtn">${icon.back} Anterior</button><button type="button" class="link-btn accent hidden" id="toResult">Ver resultado ${icon.arrow}</button></span>
      <span class="kbd-help">Atalhos: <span class="kbd">1</span> a <span class="kbd">5</span> responder · <span class="kbd">⌫</span> voltar</span>
    </div>
  </section>`,"Teste");
  const ticks=[...app.querySelectorAll(".progress i")];
  const btns=[...app.querySelectorAll(".choice")];
  const anim=document.getElementById("qAnim");
  function paint(){
    const qi=ORDER[pos],[text,ax,,exAgree,exDisagree]=QS[qi];
    document.getElementById("qText").textContent=text;
    document.getElementById("exA").innerHTML=citation(exAgree);
    document.getElementById("exD").innerHTML=citation(exDisagree);
    document.getElementById("qCount").textContent=`${pad(pos+1)} / ${QS.length}`;
    document.getElementById("qLive").textContent=`Afirmação ${pos+1} de ${QS.length}: ${text}`;
    document.getElementById("axisTag").innerHTML=`Eixo <b>${pad(ax+1)}</b> · ${esc(AXES[ax].name)}`;
    ticks.forEach((t,i)=>{t.className=i===pos?"now":answers[ORDER[i]]!==null?"done":""});
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
    const qi=ORDER[pos];answers[qi]=code;save();
    btns.forEach(b=>b.setAttribute("aria-checked",+b.dataset.code===code));
    // Next: the first open statement ahead; when reviewing past answers, simply the next one;
    // at the end, any statement still open. The result opens only when all 44 are answered.
    const ahead=ORDER.findIndex((q,i)=>i>pos&&answers[q]===null);
    const firstOpen=ORDER.findIndex(q=>answers[q]===null);
    const next=ahead!==-1?ahead:pos+1<ORDER.length?pos+1:firstOpen;
    busy=true;
    later(()=>{
      // Replace the quiz entry so the back button leaves the result instead of reopening an empty quiz.
      if(firstOpen===-1&&(next===-1||pos===ORDER.length-1)){store.del("progress");finishQuiz(answers);return}
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
function renderResult(code){
  const answers=E.decode(code);
  if(!answers){renderNotFound("Este link de resultado está incompleto ou é de uma versão antiga do teste.");return}
  const r=E.evaluate(answers);current=r;
  store.set("last",code);
  const top=r.top,p=top.p,opp=r.opposite,flat=r.directionless;
  const nameLines=p.n.split(" ").length>2?[p.n.split(" ").slice(0,-1).join(" "),p.n.split(" ").slice(-1)[0]]:[p.n];
  const userV=r.scores;
  const flatNote="Suas respostas se equilibraram e seu perfil ficou sem direção. Sem direção não dá para medir compatibilidade, então não mostramos percentuais nem oposto. Este é o pensador cujas posições ficam mais perto das suas.";
  mount(`
  <section class="wrap res-hero">
    <div>
      <div class="res-kicker"><span class="eyebrow">${flat?"Mais perto de você":"Seu par filosófico"}</span></div>
      ${flat?"":`<div class="res-pct" aria-hidden="true"><span id="pctNum">${reduceMotion?top.pct:0}</span>%</div>`}
      <h1 class="res-name">${flat?"":`<span class="sr">${top.pct}% de compatibilidade com </span>`}${nameLines.map(l=>`<span class="line"><span>${esc(l)}</span></span>`).join("")}</h1>
      <div class="res-school">${esc(p.s)} · ${esc(p.era)}</div>
      <blockquote class="res-quote">“${esc(p.q)}”</blockquote>
      ${flat?`<div class="note" role="note">${icon.info}<span>${flatNote}</span></div>`:r.note?`<div class="note" role="note">${icon.info}<span>${esc(r.note.message)}</span></div>`:""}
      <div class="res-actions">
        ${flat?"":`<button class="btn accent" id="shareBtn" type="button">${icon.share} Compartilhar no story</button>`}
        <button class="btn ghost" id="copyBtn" type="button">${icon.link} Copiar link</button>
        <a class="btn ${flat?"accent":"ghost"}" href="#/teste" id="redoBtn">Refazer</a>
      </div>
    </div>
    ${duo(p,{user:userV,title:`Seu perfil comparado ao de ${p.n}`})}
  </section>
  <section class="wrap" style="padding-bottom:24px">
    ${p.bio||!flat?`<div class="grid2" style="margin-bottom:20px">${aboutHTML(p)}${agreementHTML(r,top)}</div>`:""}
    <div class="grid2">
      <div class="panel">
        <h2>Seus 11 eixos</h2>
        <p class="sub">Laranja: você. Tracejado: ${esc(p.n)}. Os gráficos mostram as posições brutas; a comparação usa o formato normalizado (passo 2 da auditoria).</p>
        <div class="panel-sigil">${sigil(userV,{compare:p.v,labels:true,cls:"sg-user",draw:true,tips:true,title:`Seu perfil nos 11 eixos comparado ao de ${p.n}`})}</div><p class="tip-hint">Passe o mouse (ou toque) em cada eixo para ver o que ele mede e por que você ficou ali.</p>
        ${AXES.map((a,i)=>axisRow(a,userV[i],p.v[i],"você",p.n)).join("")}
      </div>
      <div style="display:grid;gap:20px;align-content:start">
        <div class="panel">
          <h2>${flat?"Também perto de você":"Também pensam como você"}</h2>
          <p class="sub">Os próximos da lista, pela mesma conta.</p>
          <ul class="match-list">${r.ranking.slice(1,6).map(x=>`<li><a href="#/p/${x.p.id}">${portrait(x.p,{cls:"avatar"})}<span><span class="nm">${esc(x.p.n)}</span><span class="sc">${esc(x.p.s)}</span></span><span class="pc">${pctText(x.pct)}</span></a></li>`).join("")}</ul>
        </div>
        ${brazilHTML(r)}
        ${opp?`<div class="panel">
          <h2>Seu oposto</h2>
          <p class="sub">Quem mais discordaria de você.</p>
          <a class="opp" href="#/p/${opp.p.id}" style="text-decoration:none">${portrait(opp.p,{cls:"opp-pic"})}<span><span class="nm">${esc(opp.p.n)}</span><span class="sc muted" style="display:block;margin-top:6px">${esc(opp.p.s)} · ${pctText(opp.pct)}</span><span class="serif it" style="display:block;font-size:20px;margin-top:10px;color:var(--ink2)">“${esc(opp.p.q)}”</span></span></a>
        </div>`:""}
        <div class="panel">
          <h2>Comece por aqui</h2>
          <div class="book" style="margin-top:16px"><span class="cover" aria-hidden="true">${esc(p.n)}</span><span><span class="t">${esc(p.b)}</span><span class="muted" style="display:block;margin-top:6px">de ${esc(p.n)}</span></span></div>
        </div>
      </div>
    </div>
    ${invitePanelHTML(r)}
    ${timelineHTML(r)}
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
  if(!flat)document.getElementById("shareBtn").addEventListener("click",()=>shareCard(r));
  document.getElementById("copyBtn").addEventListener("click",copyLink);
  document.getElementById("redoBtn").addEventListener("click",()=>store.del("progress"));
  wireTips(app,{user:userV,r,p});
  wireInvite(r);
  wireAudit(r);
}

/* ---------- Portraits ---------- */
// Portraits are Wikimedia Commons images linked from the catalog; a monogram shows if one fails to load.
function portrait(p,{cls="",eager=false}={}){
  const initials=p.n.split(" ").filter(w=>/^[A-ZÀ-Ý]/.test(w)).slice(0,2).map(w=>w[0]).join("");
  if(!p.img)return `<figure class="portrait noimg ${cls}" role="img" aria-label="${esc(p.n)} (sem retrato livre disponível)"><span class="mono-fallback" aria-hidden="true">${esc(initials)}</span></figure>`;
  return `<figure class="portrait ${cls}"><img src="${esc(p.img)}" alt="Retrato de ${esc(p.n)}" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.parentNode.classList.add('noimg')"><span class="mono-fallback" aria-hidden="true">${esc(initials)}</span></figure>`;
}

/* ---------- Compare with a friend ---------- */
// Names are optional, typed by the person, and travel only inside the link they choose to share.
const cleanName=s=>{try{s=decodeURIComponent(s||"")}catch(e){s=""}return s.replace(/[^\p{L}\p{N} .'-]/gu,"").trim().slice(0,24)};
const encName=s=>encodeURIComponent(cleanName(s));
// Accepts any Filosofômetro link (result, invite or comparison) or a bare code, and returns the answers.
function answersFromLink(t){
  const m=String(t||"").trim().match(/(?:#\/(?:r|vs|verificar)\/|^)([0-4]{44})(?:$|[/?#\s])/);
  return m?E.decode(m[1]):null;
}
function invitePanelHTML(r){
  return `<div class="panel compare-cta">
    <h2>Compare com alguém</h2>
    <p class="sub">Mande o seu link para um amigo. Quando ele terminar o teste, vocês veem lado a lado onde pensam igual e onde divergem.</p>
    <div class="cmp-form">
      <label class="sr" for="myName">Seu nome (opcional)</label>
      <input class="search sm" id="myName" placeholder="Seu primeiro nome (opcional)" maxlength="24" autocomplete="given-name">
      <button class="btn accent sm" id="inviteBtn" type="button">${icon.link} Copiar convite</button>
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
  const base=location.href.split("#")[0];
  document.getElementById("inviteBtn").addEventListener("click",async()=>{
    const nm=encName(document.getElementById("myName").value);
    const url=`${base}#/vs/${mine}${nm?`/${nm}`:""}`;
    try{await navigator.clipboard.writeText(url);toast("Convite copiado. Agora é só mandar!")}catch(e){prompt("Copie o convite:",url)}
  });
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
  const r=E.evaluate(a),p=r.top.p,who=cleanName(rawName)||"Alguém";
  store.set("vs",{code,name:cleanName(rawName)});
  const mineCode=store.get("last");
  mount(`
  <section class="wrap res-hero">
    <div>
      <span class="eyebrow">Convite</span>
      <h1 class="res-name" style="font-size:clamp(44px,min(7vw,10vh),104px)"><span class="line"><span>${esc(who)} quer comparar com você</span></span></h1>
      <p class="lede">${esc(who)} fez o Filosofômetro e deu <b>${r.directionless?`mais perto de ${esc(p.n)}`:`${r.top.pct}% ${esc(p.n)}`}</b>. Faça o teste e descubra quanto vocês pensam parecido, eixo por eixo.</p>
      <div class="cta-row">
        <a class="btn accent" href="#/teste" data-fresh="1">Fazer o teste e comparar ${icon.arrow}</a>
        ${mineCode&&E.decode(mineCode)?`<a class="btn ghost" href="#/comparar/${code}/${mineCode}/${encName(rawName)}">Usar meu último resultado</a>`:""}
      </div>
    </div>
    ${duo(p,{title:`Perfil de ${p.n}`})}
  </section>`,"Convite");
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
  const card=(nm,r)=>`<a class="cmp-person" href="#/r/${E.encode(r.answers)}">${portrait(r.top.p,{cls:"cmp-pic"})}<span class="cmp-who">${esc(nm)}</span><span class="nm">${esc(r.top.p.n)}</span><span class="sc">${r.top.pct===null?"perfil sem direção":`${r.top.pct}% · ${esc(r.top.p.s)}`}</span></a>`;
  const item=(x,kind)=>{const ax=AXES[x.ax];return `<li><span class="ag-axis">${esc(cap(ax.name))}</span><span>${kind==="close"&&Math.sign(x.A)===Math.sign(x.B)&&Math.abs(x.A)>=.13?`Os dois tendem a <b>${esc(lean(ax,x.A).replace(", forte",""))}</b>.`:`${esc(nameA)}: <b>${esc(lean(ax,x.A))}</b>. ${esc(nameB)}: <b>${esc(lean(ax,x.B))}</b>.`}</span></li>`};
  mount(`
  <section class="wrap section" style="padding-top:clamp(24px,5vh,56px)">
    <span class="eyebrow">Comparação</span>
    <h1 class="res-name" style="font-size:clamp(44px,min(8vw,11vh),120px)"><span class="line"><span>${c.pct===null?"Sem direção":`${c.pct}% compatíveis`}</span></span></h1>
    <p class="lede" style="margin-top:6px">${esc(verdict)}</p>
    <div class="cmp-grid">
      ${card(nameA,ra)}
      <div class="cmp-sigil">${sigil(rb.scores,{compare:ra.scores,labels:true,cls:"sg-user",draw:true,title:`${nameB} e ${nameA} nos 11 eixos`})}
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
      <button class="btn accent" id="cmpCopy" type="button">${icon.link} Copiar esta comparação</button>
      <a class="btn ghost" href="#/teste" data-fresh="1">Fazer o teste de novo</a>
    </div>
  </section>`,c.pct===null?"Comparação":`${c.pct}% compatíveis`);
  document.getElementById("cmpCopy").addEventListener("click",copyLink);
  app.querySelectorAll("[data-fresh]").forEach(x=>x.addEventListener("click",()=>store.del("progress")));
  store.del("vs");
}

/* ---------- Brazil ---------- */
// Brazilian thinkers ranked against the user with the engine's own rule (audited as "brazil").
function brazilHTML(r){
  if(!r.brazil.length)return "";
  const [first,...rest]=r.brazil,b=first.p;
  return `<div class="panel brazil">
    <span class="br-flag" aria-hidden="true"></span>
    <h2>No Brasil, quem pensa como você</h2>
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
const credit=p=>`<a class="credit" href="${esc(p.wiki)}" target="_blank" rel="noopener">Imagem: Wikimedia Commons, via Wikipédia ↗</a>`;
// Portrait and sigil together: the face of the thinker and the shape of the thought.
// On a result the user is orange and the thinker dashed; on a thinker's page the thinker is orange.
function duo(p,{user=null,title="",thinkerFirst=false}={}){
  const main=user&&!thinkerFirst?user:p.v,other=user?(thinkerFirst?user:p.v):null;
  const mainName=user&&!thinkerFirst?"Você":p.n,otherName=thinkerFirst?"Você":p.n;
  return `<div class="duo">
    ${portrait(p,{eager:true})}
    <div class="sigil-badge">${sigil(main,{compare:other,cls:"sg-user",draw:true,tips:true,title:title||`Perfil de ${p.n}`})}</div>
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
    <div class="track" role="img" aria-label="${esc(label)}"><span class="center"></span><span class="fill" style="left:${left}%;width:${width}%"></span>${other===undefined?"":`<span class="them" style="left:${(other+1)*50}%"></span>`}<span class="you" style="left:${(main+1)*50}%"></span></div>
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
    <p class="sub">Os 93 pensadores na época em que viveram. Destaque para o seu par, os 5 mais parecidos e o seu oposto. Toque em qualquer ponto para conhecer o pensador.</p>
    <div class="tl-scroll"><div class="tl" style="--rows:${rows.length}">
      <div class="tl-labels">${labels.map(l=>`<a class="tl-label ${l.kind}" href="#/p/${l.p.id}" style="left:${l.x}%;--row:${l.row}">${portrait(l.p,{cls:"tl-pic"})}<span class="tl-name">${esc(l.p.n)}</span><span class="tl-tag">${tag[l.kind]}${l.kind==="top"&&r.top.pct!==null?` · ${r.top.pct}%`:""} · ${esc(lifeText(l.p))}</span>${l.kind==="top"?`<span class="tl-you">Você está aqui</span>`:""}</a>`).join("")}</div>
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

      <h3 class="h-audit">Suas 44 respostas</h3>
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
        <div class="panel-sigil">${sigil(p.v,{labels:true,cls:"sg-user",compare:lastR?lastR.scores:null,tips:true,title:`Perfil de ${p.n} nos 11 eixos`})}</div><p class="tip-hint">Passe o mouse (ou toque) em cada eixo para ver a posição de ${esc(p.n)}.</p>
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
      <div class="stat"><b>${QS.length}</b><span>afirmações, 4 por eixo</span></div>
      <div class="stat"><b>${AXES.length}</b><span>eixos independentes</span></div>
      <div class="stat"><b>${PH.length}</b><span>pensadores</span></div>
      <div class="stat"><b class="mono" style="font-size:24px;padding:8px 0 6px">${E.codeFingerprint()}</b><span>código do motor v${E.VERSION}</span></div>
      <div class="stat"><b class="mono" style="font-size:24px;padding:8px 0 6px">${E.fingerprint()}</b><span>catálogo</span></div>
    </div>
    <div class="prose">
      <h2>1. Afirmações equilibradas</h2>
      <p>Cada eixo tem quatro afirmações: duas puxam para um polo e duas para o outro. Quem concorda com tudo, ou discorda de tudo, cai exatamente no centro. Isso anula o viés de quem tende a dizer sim.</p>
      <p>As afirmações aparecem misturadas entre os eixos, em rodízio: a 1ª de cada eixo, depois a 2ª de cada eixo, e assim por diante. As respostas são guardadas sempre pela posição da afirmação no catálogo, e a auditoria mostra as duas numerações.</p>
      <h2>2. Da resposta ao eixo</h2>
      <div class="formula">concordo totalmente +2 · concordo +1 · neutro 0 · discordo −1 · discordo totalmente −2
contribuição = valor × direção (+1 ou −1)
posição = soma das 4 contribuições ÷ 8        ∈ [−1, +1]</div>
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
      <p>Se você escolhe a mesma opção em ${Math.round(P.repeatWarning*100)}% das afirmações ou mais (${Math.ceil(P.repeatWarning*QS.length)} de ${QS.length}), ou se a intensidade fica abaixo de ${P.centerWarning}, o resultado vem com um aviso.</p>
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
      <p>Uma segunda auditoria prova que todos os ${PH.length} pensadores, e portanto todas as ${new Set(PH.map(p=>p.s)).size} correntes, podem ser o resultado: pelo perfil exato de cada um, por uma busca que parte de respostas aleatórias e por simulação com 60 mil pessoas.</p>
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
// exactly 44 digits from 0 to 4: anything longer or shorter is rejected, never truncated.
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
      <input class="search" id="vIn" placeholder="Cole o link do resultado ou os 44 dígitos" value="${code?esc(code):""}" autocomplete="off" spellcheck="false">
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
    if(!answers){fail("Não reconheci esse resultado. O código precisa ter exatamente 44 dígitos de 0 a 4, como nos links do Filosofômetro.");return}
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
function toast(t){const el=document.getElementById("toast");el.textContent=t;el.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove("show"),2200)}
async function copyLink(){
  try{await navigator.clipboard.writeText(location.href);toast("Link copiado")}
  catch(e){prompt("Copie o link:",location.href)}
}
async function shareCard(r,usePic=true){
  await document.fonts.ready;
  const W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;
  const x=c.getContext("2d"),p=r.top.p;
  const bg="#0F0E0C",ink="#F1EADC",muted="#918877",accent="#F06A43",line="rgba(241,234,220,.14)";
  x.fillStyle=bg;x.fillRect(0,0,W,H);
  const g=x.createRadialGradient(W/2,760,40,W/2,760,700);g.addColorStop(0,"rgba(240,106,67,.22)");g.addColorStop(1,"rgba(240,106,67,0)");
  x.fillStyle=g;x.fillRect(0,0,W,H);
  x.textAlign="center";x.fillStyle=ink;x.font="400 54px 'Instrument Serif'";x.fillText("Filosofômetro",W/2,150);
  x.fillStyle=muted;x.font="600 28px 'Inter Tight'";x.fillText("M E U   P A R   F I L O S Ó F I C O",W/2,250);
  // Portrait in an arch, with the sigil as a badge over its corner. Without the image, the sigil takes the center.
  const pic=usePic?await loadImage(p.img):null;
  let cx=W/2,cy=760,S=3.4;
  if(pic){
    const ax=170,ay=300,aw=560,ah=740,rad=aw/2;
    x.save();
    x.beginPath();x.moveTo(ax,ay+rad);x.arc(ax+rad,ay+rad,rad,Math.PI,0);x.lineTo(ax+aw,ay+ah-24);x.quadraticCurveTo(ax+aw,ay+ah,ax+aw-24,ay+ah);x.lineTo(ax+24,ay+ah);x.quadraticCurveTo(ax,ay+ah,ax,ay+ah-24);x.closePath();x.clip();
    const sc=Math.max(aw/pic.width,ah/pic.height),dw=pic.width*sc,dh=pic.height*sc;
    x.filter="grayscale(1) sepia(.22) contrast(1.08) brightness(.97)";
    x.drawImage(pic,ax+(aw-dw)/2,ay+(ah-dh)*.2,dw,dh);x.filter="none";
    const tint=x.createLinearGradient(0,ay+ah*.45,0,ay+ah);tint.addColorStop(0,"rgba(240,106,67,0)");tint.addColorStop(1,"rgba(240,106,67,.42)");
    x.globalCompositeOperation="multiply";x.fillStyle=tint;x.fillRect(ax,ay,aw,ah);x.globalCompositeOperation="source-over";
    x.restore();
    cx=800;cy=960;S=2.15;
    x.beginPath();x.arc(cx,cy,R*S+26,0,Math.PI*2);x.fillStyle="rgba(21,19,15,.9)";x.fill();x.strokeStyle=line;x.lineWidth=2;x.stroke();
  }
  x.strokeStyle=line;x.lineWidth=2;
  [.33,.66,1].forEach(f=>{x.beginPath();x.arc(cx,cy,R*(.16+.84*f)*S,0,Math.PI*2);x.stroke()});
  AXES.forEach((_,i)=>{x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(angle(i))*R*S,cy+Math.sin(angle(i))*R*S);x.stroke()});
  const poly=(v,fill,stroke,dash)=>{x.beginPath();pts(v).forEach(([a,b],i)=>i?x.lineTo(cx+a*S,cy+b*S):x.moveTo(cx+a*S,cy+b*S));x.closePath();x.setLineDash(dash||[]);if(fill){x.fillStyle=fill;x.fill()}x.strokeStyle=stroke;x.lineWidth=4;x.stroke();x.setLineDash([])};
  poly(p.v,null,"rgba(241,234,220,.75)",[10,12]);
  poly(r.scores,"rgba(240,106,67,.18)",accent);
  // Legend
  x.font="500 28px 'Inter Tight'";x.textAlign="left";
  const ly=pic?1235:1170;
  x.fillStyle=accent;x.fillRect(W/2-250,ly-12,44,5);x.fillStyle=muted;x.fillText("Você",W/2-194,ly);
  x.setLineDash([10,10]);x.strokeStyle="rgba(241,234,220,.75)";x.lineWidth=4;x.beginPath();x.moveTo(W/2-40,ly-10);x.lineTo(W/2+6,ly-10);x.stroke();x.setLineDash([]);
  x.fillText(p.n.length>18?p.n.split(" ").slice(-1)[0]:p.n,W/2+20,ly);x.textAlign="center";
  x.fillStyle=accent;x.font="400 190px 'Instrument Serif'";x.fillText(r.top.pct+"%",W/2,pic?1430:1390);
  x.fillStyle=ink;x.font="400 104px 'Instrument Serif'";
  const y2=wrapText(x,p.n,W/2,pic?1540:1510,960,102);
  x.fillStyle=muted;x.font="500 32px 'Inter Tight'";x.fillText(p.s.toUpperCase(),W/2,y2+72);
  x.fillStyle=ink;x.font="italic 400 46px 'Instrument Serif'";wrapText(x,"“"+p.q+"”",W/2,y2+150,880,56);
  x.fillStyle=muted;x.font="500 30px 'Inter Tight'";x.fillText("Meu oposto: "+r.opposite.p.n,W/2,1800);
  x.fillStyle=accent;x.font="600 30px 'Inter Tight'";x.fillText("Qual filósofo pensa como você?  "+location.host,W/2,1856);
  // A portrait served without CORS taints the canvas; redraw without it rather than fail.
  let blob;
  try{blob=await new Promise((res,rej)=>{try{c.toBlob(b=>b?res(b):rej(new Error("empty")),"image/png")}catch(e){rej(e)}})}
  catch(e){if(pic)return shareCard(r,false);toast("Não foi possível gerar a imagem");return}
  const file=new File([blob],"agora.png",{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],text:`Fiz o Filosofômetro: ${r.top.pct}% ${p.n}. Qual filósofo pensa como você?`,url:location.href});return}catch(e){if(e.name==="AbortError")return}
  }
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`filosofometro-${p.id}.png`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast("Imagem salva");
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
})();
