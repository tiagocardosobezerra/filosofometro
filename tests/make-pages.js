// Generates the static, indexable pages in every language: one page per thinker and per school of thought
// (corrente), the indexes of both,
// the app entry pages /en/ and /es/ (copies of index.html with translated head and chrome), sitemap.xml
// and robots.txt. The app itself lives behind "#", which search engines barely index; these pages carry
// the same catalog text as plain HTML and send readers to the test.
//   Portuguese: /pensadores/<id>/   English: /en/thinkers/<id>/   Spanish: /es/pensadores/<id>/
//   Schools:    /correntes/<id>/    English: /en/schools/<id>/    Spanish: /es/corrientes/<id>/
// Usage: node tests/make-pages.js   (run again whenever data.js, support.js, covers.js or i18n/ change)
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const DATA = require(path.join(ROOT, "data.js"));
const SUP = require(path.join(ROOT, "support.js"));
const I18N = require(path.join(ROOT, "i18n.js"));
const PREVIEW = require(path.join(ROOT, "api", "_preview.js"));
const CORRENTES = require(path.join(ROOT, "correntes.js"));
let COVERS = {};
try { COVERS = require(path.join(ROOT, "covers.js")); } catch (e) {}

const SITE = "https://filosofometro.com.br";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const dist = (a, b) => a.v.reduce((t, v, i) => t + Math.abs(v - b.v[i]), 0) / a.v.length;
const initials = n => n.split(" ").filter(w => /^[A-ZÀ-Ý]/.test(w)).slice(0, 2).map(w => w[0]).join("");

// Everything the static pages say, per language.
const LANGS = {
  pt: { html: "pt-BR", app: "/", arch: "Arquétipo:", dir: "pensadores", og: "og.png", dec: ",",
    bc: "a.C.", to: "a", balance: "Equilíbrio", strong: ", forte", home: "Filosofômetro, página inicial", nav: "Principal",
    thinkers: "Pensadores", method: "Método", take: "Fazer o teste", takeSm: "Teste", credit: "Criado por", creditTail: "teste gratuito, motor auditável",
    how: "Como calculamos", all: "Todos os pensadores", support: "Apoie o projeto", portrait: n => `Retrato de ${n}`,
    start: "Comece por este · ", amazon: "Ver na Amazon", here: "Você está em",
    title: n => `${n}: vida, ideias e livros | Filosofômetro`,
    cta: (n, total) => `Você pensa como ${n}? Responda de 44 a 132 afirmações e descubra quem, entre ${total} pensadores, tem o formato de pensamento mais parecido com o seu.`,
    free: "Fazer o teste grátis", profile: "Ver o perfil interativo", who: (n, alive) => alive ? `Quem é ${n}` : `Quem foi ${n}`, ideas: "Ideias centrais", line: s => `A linha: ${s}`,
    same: "Na mesma linha:", source: "Fonte para saber mais:", wiki: "Wikipédia", books: n => `Livros de ${n}`, booksSub: "Três portas de entrada. Comece pelo primeiro.",
    axesH: n => `Onde ${n} fica nos 11 temas`, axesSub: "Cada tema vai do primeiro polo (−1) ao segundo (+1). São essas posições que o teste compara com as suas respostas.",
    kinH: n => `Pensadores parecidos com ${n}`, endQ: "Qual filósofo<br><em class=\"it accent\">pensa como você?</em>", begin: "Começar o teste",
    idxTitle: total => `Pensadores: ${total} filósofos, vidas, ideias e livros | Filosofômetro`,
    idxDesc: (total, nr) => `Vida, ideias centrais, posições e livros de ${total} pensadores, de Pitágoras a Byung-Chul Han, com ${nr} brasileiros. Descubra qual deles pensa como você.`,
    library: "Biblioteca", count: total => `${total} pensadores`,
    idxLede: "Vida, ideias centrais, posição nos 11 temas e três livros de cada um. Quer saber com qual deles você mais se parece? <a href=\"/#/teste\">Faça o teste</a>.",
    affiliate: "Como associado da Amazon, o Filosofômetro ganha com compras qualificadas, sem custo a mais para você.",
    cdir: "correntes", schools: "Correntes", allSchools: "Todas as correntes", sameC: "Na mesma corrente:", knowC: n => `Conhecer a corrente: ${n}`,
    cTitle: n => `${n}: o que é, ideias, pensadores e livros | Filosofômetro`, whatIs: "O que é", members: "Os pensadores",
    cBooks: "Para começar a ler", cBooksSub: "O livro de entrada de cada pensador, escolhido para quem está começando.", near: "Correntes vizinhas",
    cAxesH: n => `Onde ${n} fica nos 11 temas`, cAxesSub: "Média das posições dos pensadores da corrente. Cada tema vai do primeiro polo (−1) ao segundo (+1).",
    cCta: n => `Você pensa como ${n}? Responda de 44 a 132 afirmações e veja sua afinidade com cada corrente e cada pensador.`,
    cProfile: "Ver a corrente no app", nThinkers: k => (k === 1 ? "1 pensador" : `${k} pensadores`), since: y => `de ${y} até hoje`, span: (a, b) => (a === b ? `nascido em ${a}` : `de ${a} a ${b}`),
    cIdxTitle: k => `Correntes filosóficas: ${k} escolas de pensamento explicadas | Filosofômetro`,
    cIdxDesc: k => `O que é cada uma das ${k} correntes filosóficas do catálogo, do estoicismo ao existencialismo: ideias centrais, pensadores e livros para começar.`,
    cCount: k => `${k} correntes`, cIdxLede: "Escolas e tradições de pensamento, da Grécia antiga a hoje, com ideias centrais, pensadores e livros para começar. Quer saber de qual você está mais perto? <a href=\"/#/teste\">Faça o teste</a>." },
  en: { html: "en", app: "/en/", arch: "Archetype:", dir: "en/thinkers", og: "og-en.png", dec: ".",
    bc: "BC", to: "to", balance: "Balanced", strong: ", strong", home: "Filosofômetro, home", nav: "Main",
    thinkers: "Thinkers", method: "Method", take: "Take the test", takeSm: "Test", credit: "Made by", creditTail: "free test, auditable engine",
    how: "How we calculate", all: "All thinkers", support: "", portrait: n => `Portrait of ${n}`,
    start: "Start here · ", amazon: "See on Amazon", here: "You are in",
    title: n => `${n}: life, ideas and books | Filosofômetro`,
    cta: (n, total) => `Do you think like ${n}? Answer 44 to 132 statements and find out who, among ${total} thinkers, has the way of thinking closest to yours.`,
    free: "Take the free test", profile: "See the interactive profile", who: (n, alive) => alive ? `Who is ${n}` : `Who was ${n}`, ideas: "Core ideas", line: s => `The tradition: ${s}`,
    same: "In the same tradition:", source: "Learn more:", wiki: "Wikipedia", books: n => `Books by ${n}`, booksSub: "Three ways in. Start with the first.",
    axesH: n => `Where ${n} stands on the 11 themes`, axesSub: "Each theme runs from the first pole (−1) to the second (+1). These are the positions the test compares with your answers.",
    kinH: n => `Thinkers similar to ${n}`, endQ: "Which philosopher<br><em class=\"it accent\">thinks like you?</em>", begin: "Start the test",
    idxTitle: total => `Thinkers: ${total} philosophers, lives, ideas and books | Filosofômetro`,
    idxDesc: (total, nr) => `Life, core ideas, positions and books of ${total} thinkers, from Pythagoras to Byung-Chul Han, including ${nr} from the English-speaking world. Find out which one thinks like you.`,
    library: "Library", count: total => `${total} thinkers`,
    idxLede: "Life, core ideas, position on the 11 themes and three books for each one. Want to know which one you resemble most? <a href=\"/en/#/teste\">Take the test</a>.",
    affiliate: "As an Amazon Associate, Filosofômetro earns from qualifying purchases, at no extra cost to you.",
    cdir: "en/schools", schools: "Schools of thought", allSchools: "All schools of thought", sameC: "In the same school:", knowC: n => `Explore the school: ${n}`,
    cTitle: n => `${n}: what it is, ideas, thinkers and books | Filosofômetro`, whatIs: "What it is", members: "The thinkers",
    cBooks: "Where to start reading", cBooksSub: "Each thinker's starter book, picked for beginners.", near: "Neighboring schools",
    cAxesH: n => `Where ${n} stands on the 11 themes`, cAxesSub: "Average position of the school's thinkers. Each theme runs from the first pole (−1) to the second (+1).",
    cCta: n => `Do you think in the way of ${n}? Answer 44 to 132 statements and see your affinity with every school and every thinker.`,
    cProfile: "See the school in the app", nThinkers: k => (k === 1 ? "1 thinker" : `${k} thinkers`), since: y => `from ${y} to today`, span: (a, b) => (a === b ? `born ${a}` : `from ${a} to ${b}`),
    cIdxTitle: k => `Schools of philosophy: ${k} traditions of thought explained | Filosofômetro`,
    cIdxDesc: k => `What each of the ${k} schools of philosophy in the catalog is about, from Stoicism to existentialism: core ideas, thinkers and books to start with.`,
    cCount: k => `${k} schools of thought`, cIdxLede: "Schools and traditions of thought, from ancient Greece to today, with core ideas, thinkers and books to start with. Want to know which one you are closest to? <a href=\"/en/#/teste\">Take the test</a>." },
  es: { html: "es", app: "/es/", arch: "Arquetipo:", dir: "es/pensadores", og: "og-es.png", dec: ",",
    bc: "a. C.", to: "a", balance: "Equilibrio", strong: ", fuerte", home: "Filosofômetro, inicio", nav: "Principal",
    thinkers: "Pensadores", method: "Método", take: "Hacer el test", takeSm: "Test", credit: "Creado por", creditTail: "test gratuito, motor auditable",
    how: "Cómo calculamos", all: "Todos los pensadores", support: "", portrait: n => `Retrato de ${n}`,
    start: "Empieza por este · ", amazon: "Ver en Amazon", here: "Estás en",
    title: n => `${n}: vida, ideas y libros | Filosofômetro`,
    cta: (n, total) => `¿Piensas como ${n}? Responde de 44 a 132 afirmaciones y descubre quién, entre ${total} pensadores, tiene la forma de pensar más parecida a la tuya.`,
    free: "Hacer el test gratis", profile: "Ver el perfil interactivo", who: (n, alive) => alive ? `Quién es ${n}` : `Quién fue ${n}`, ideas: "Ideas centrales", line: s => `La corriente: ${s}`,
    same: "En la misma corriente:", source: "Para saber más:", wiki: "Wikipedia", books: n => `Libros de ${n}`, booksSub: "Tres puertas de entrada. Empieza por la primera.",
    axesH: n => `Dónde se ubica ${n} en los 11 temas`, axesSub: "Cada tema va del primer polo (−1) al segundo (+1). Son estas posiciones las que el test compara con tus respuestas.",
    kinH: n => `Pensadores parecidos a ${n}`, endQ: "¿Qué filósofo<br><em class=\"it accent\">piensa como tú?</em>", begin: "Empezar el test",
    idxTitle: total => `Pensadores: ${total} filósofos, vidas, ideas y libros | Filosofômetro`,
    idxDesc: (total, nr) => `Vida, ideas centrales, posiciones y libros de ${total} pensadores, de Pitágoras a Byung-Chul Han, con ${nr} de Iberoamérica. Descubre cuál piensa como tú.`,
    library: "Biblioteca", count: total => `${total} pensadores`,
    idxLede: "Vida, ideas centrales, posición en los 11 temas y tres libros de cada uno. ¿Quieres saber a cuál te pareces más? <a href=\"/es/#/teste\">Haz el test</a>.",
    affiliate: "Como afiliado de Amazon, Filosofômetro gana con las compras que califican, sin costo extra para ti.",
    cdir: "es/corrientes", schools: "Corrientes", allSchools: "Todas las corrientes", sameC: "En la misma corriente:", knowC: n => `Conocer la corriente: ${n}`,
    cTitle: n => `${n}: qué es, ideas, pensadores y libros | Filosofômetro`, whatIs: "Qué es", members: "Los pensadores",
    cBooks: "Para empezar a leer", cBooksSub: "El libro de entrada de cada pensador, elegido para quien empieza.", near: "Corrientes vecinas",
    cAxesH: n => `Dónde se ubica ${n} en los 11 temas`, cAxesSub: "Promedio de las posiciones de los pensadores de la corriente. Cada tema va del primer polo (−1) al segundo (+1).",
    cCta: n => `¿Piensas como ${n}? Responde de 44 a 132 afirmaciones y mira tu afinidad con cada corriente y cada pensador.`,
    cProfile: "Ver la corriente en la app", nThinkers: k => (k === 1 ? "1 pensador" : `${k} pensadores`), since: y => `de ${y} hasta hoy`, span: (a, b) => (a === b ? `nacido en ${a}` : `de ${a} a ${b}`),
    cIdxTitle: k => `Corrientes filosóficas: ${k} escuelas de pensamiento explicadas | Filosofômetro`,
    cIdxDesc: k => `Qué es cada una de las ${k} corrientes filosóficas del catálogo, del estoicismo al existencialismo: ideas centrales, pensadores y libros para empezar.`,
    cCount: k => `${k} corrientes`, cIdxLede: "Escuelas y tradiciones de pensamiento, de la Grecia antigua a hoy, con ideas centrales, pensadores y libros para empezar. ¿Quieres saber de cuál estás más cerca? <a href=\"/es/#/teste\">Haz el test</a>." },
};

// The catalog of each language: same ids and positions, translated text, its own regional list.
const CATALOG = {};
for (const lang of Object.keys(LANGS)) {
  const pack = lang === "pt" ? null : require(path.join(ROOT, "i18n", `${lang}.js`));
  const { DATA: D, SUP: S } = I18N.localize(DATA, SUP, pack);
  const ALL = [...D.PH, ...D.BR], byId = Object.fromEntries(ALL.map(p => [p.id, p]));
  // Schools keep only the thinkers present in this language; their profile is the members' average.
  const CORR = CORRENTES.map(c => ({ ...c, ...(pack ? pack.correntes[c.id] : {}), ms: c.m.map(id => byId[id]).filter(Boolean) })).filter(c => c.ms.length)
    .map(c => ({ ...c, v: D.AXES.map((_, i) => c.ms.reduce((t, p) => t + p.v[i], 0) / c.ms.length), from: Math.min(...c.ms.map(p => p.born)), to: Math.max(...c.ms.map(p => p.born)), alive: c.ms.some(p => p.died === null) }));
  CATALOG[lang] = { D, S, ALL, CORR, corrOf: Object.fromEntries(CORR.flatMap(c => c.ms.map(p => [p.id, c]))) };
}
// kind "c" is a school page; otherwise a thinker page.
const urlOf = (lang, id, kind) => `${SITE}/${kind === "c" ? LANGS[lang].cdir : LANGS[lang].dir}/${id ? `${id}/` : ""}`;
const has = (l, id, kind) => !id || (kind === "c" ? CATALOG[l].CORR : CATALOG[l].ALL).some(p => p.id === id);
// hreflang links: a thinker in the main catalog exists in every language; a regional one only in its own.
const alternates = (id, kind) => Object.keys(LANGS).filter(l => has(l, id, kind))
  .map(l => `<link rel="alternate" hreflang="${LANGS[l].html}" href="${urlOf(l, id, kind)}">`).join("\n");

function build(lang) {
  const T = LANGS[lang], { D, S, ALL, CORR, corrOf } = CATALOG[lang], { AXES } = D, BR = D.BR;
  const dir = `/${T.dir}/`, cdir = `/${T.cdir}/`;
  const year = y => (y < 0 ? `${-y} ${T.bc}` : String(y));
  const life = p => (p.born == null ? "" : `${p.approx ? "c. " : ""}${year(p.born)}${p.died == null ? "" : ` ${T.to} ${year(p.died)}`}`);
  const lean = (a, x) => (Math.abs(x) < 0.13 ? T.balance : `${x < 0 ? a.l : a.r}${Math.abs(x) >= 0.6 ? T.strong : ""}`);
  const fmt = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2).replace(".", T.dec);
  // Meta descriptions: the first sentences of the biography, up to about 155 characters.
  const summary = p => {
    const out = [];
    for (const s of (p.bio || "").split(/(?<=\.)\s+/)) { if ((out.join(" ") + " " + s).length > 155 && out.length) break; out.push(s); }
    return out.join(" ") || `${p.n}, ${p.s}.`;
  };
  const amazonNote = S.SUPPORT.amazonTag ? T.affiliate : "";

  const head = ({ title, description, url, image, jsonld, id, kind }) => `<!doctype html>
<html lang="${T.html}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${alternates(id, kind)}
<meta name="theme-color" content="#F2EDE3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F0E0C" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Filosofômetro">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2316130F'/%3E%3Cpath d='M16 6 25 25H7z' fill='none' stroke='%23F06A43' stroke-width='2.4' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/pages.css">
<script>try{const t=localStorage.getItem("agora.theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}</script>
<script defer src="/_vercel/insights/script.js"></script>
${jsonld.map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n")}
</head>
<body>
<header class="bar">
  <div class="wrap">
    <a class="brand" href="${T.app}" aria-label="${esc(T.home)}">
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 28 27H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="16" cy="19" r="3.2" fill="var(--accent)"/></svg>
      Filosofômetro
    </a>
    <nav class="nav" aria-label="${esc(T.nav)}">
      <a href="${dir}">${T.thinkers}</a>
      <a href="${cdir}" class="hide-sm">${T.schools}</a>
      <a href="${T.app}#/metodo" class="hide-sm">${T.method}</a>
      <a href="${T.app}#/teste" class="nav-cta"><span class="cta-lg">${T.take}</span><span class="cta-sm">${T.takeSm}</span></a>
    </nav>
  </div>
</header>
<main>`;

  const foot = (id, kind) => `</main>
<footer>
  <div class="wrap">
    <span class="credit-line">${T.credit} <a class="author" href="https://github.com/tiagocardosobezerra" target="_blank" rel="noopener author">Tiago Cardoso Bezerra</a> · ${T.creditTail}</span>
    <span><a href="${T.app}#/metodo">${T.how}</a> · <a href="${dir}">${T.all}</a> · <a href="${cdir}">${T.allSchools}</a>${lang === "pt" && S.SUPPORT.pixKey ? ` · <a href="/#/apoie">${T.support}</a>` : ""} · ${Object.keys(LANGS).filter(l => l !== lang && has(l, id, kind)).map(l => `<a href="${urlOf(l, id, kind).replace(SITE, "")}" hreflang="${LANGS[l].html}" lang="${LANGS[l].html}">${{ pt: "Português", en: "English", es: "Español" }[l]}</a>`).join(" · ")}</span>
  </div>
</footer>
</body>
</html>
`;

  const portrait = (p, cls) => p.img
    ? `<figure class="portrait ${cls}"><img src="${esc(p.img)}" alt="${esc(T.portrait(p.n))}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></figure>`
    : `<figure class="portrait noimg ${cls}" aria-hidden="true"><span class="sp-initials">${esc(initials(p.n))}</span></figure>`;

  const book = (p, i, title) => {
    const own = lang === "pt" ? undefined : (((COVERS.lang || {})[lang] || {})[p.id] || [])[i];
    const cov = own !== undefined && own !== null ? own : (COVERS[p.id] || [])[i];
    return `<li><a href="${esc(S.bookURL(title, p.n))}" target="_blank" rel="sponsored noopener"><span class="cover" aria-hidden="true">${cov ? `<img src="/covers/${cov}.jpg" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</span><span><span class="t">${esc(title)}</span><span class="muted">${i ? "" : T.start}${T.amazon}</span></span><span class="pc" aria-hidden="true">↗</span></a></li>`;
  };

  const axisRow = (a, x) => {
    const left = Math.min(50, (x + 1) * 50), width = Math.abs(x) * 50;
    return `<div class="axis-row"><div class="sp-axis">${esc(cap(a.name))}</div>
    <div class="poles"><span>${Math.abs(x) >= 0.13 && x < 0 ? `<b>${esc(a.l)}</b>` : esc(a.l)}</span><span class="val">${esc(lean(a, x))} · ${fmt(x)}</span><span>${Math.abs(x) >= 0.13 && x > 0 ? `<b>${esc(a.r)}</b>` : esc(a.r)}</span></div>
    <div class="track" role="img" aria-label="${esc(`${a.name}: ${lean(a, x)}`)}"><span class="center"></span><span class="fill" style="left:${left}%;width:${width}%"></span><span class="you" style="left:${(x + 1) * 50}%"></span></div></div>`;
  };

  function thinkerPage(p) {
    const url = urlOf(lang, p.id);
    const books = [p.b, ...(S.READING[p.id] || [])];
    const kin = ALL.filter(x => x !== p).map(x => ({ x, d: dist(p, x) })).sort((a, b) => a.d - b.d).slice(0, 4).map(o => o.x);
    const c = corrOf[p.id], same = c ? c.ms.filter(x => x !== p) : [];
    const title = T.title(p.n);
    const description = summary(p);
    const jsonld = [
      { "@context": "https://schema.org", "@type": "Person", name: p.n, description, ...(p.img ? { image: p.img } : {}), ...(p.wiki ? { sameAs: [p.wiki] } : {}), ...(p.born != null && p.born > 0 ? { birthDate: String(p.born) } : {}), ...(p.died != null && p.died > 0 ? { deathDate: String(p.died) } : {}), url },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Filosofômetro", item: `${SITE}${T.app}` },
        { "@type": "ListItem", position: 2, name: T.thinkers, item: urlOf(lang) },
        { "@type": "ListItem", position: 3, name: p.n, item: url },
      ] },
    ];
    return head({ title, description, url, image: p.img || `${SITE}/${T.og}`, jsonld, id: p.id }) + `
<article class="wrap section sp">
  <nav class="sp-crumbs" aria-label="${esc(T.here)}"><a href="${dir}">${T.thinkers}</a> <span aria-hidden="true">/</span> ${esc(p.n)}</nav>
  <div class="sp-hero">
    ${portrait(p, "sp-pic")}
    <div>
      <span class="eyebrow">${c ? `<a href="${cdir}${c.id}/">${esc(p.s)}</a>` : esc(p.s)} · ${esc(p.era)}</span>
      <h1 class="h2 sp-name">${esc(p.n)}</h1>
      <p class="sp-arch">${esc(T.arch)} <b>${esc(PREVIEW.archName(p.v, lang))}</b></p>
      <p class="sp-life">${esc(life(p))}${p.place ? ` · ${esc(p.place)}` : ""}</p>
      ${p.q ? `<p class="serif it sp-quote">“${esc(p.q)}”</p>` : ""}
      <div class="sp-cta">
        <p>${esc(T.cta(p.n, ALL.length))}</p>
        <div class="cta-row"><a class="btn accent" href="${T.app}#/teste">${T.free}</a><a class="btn ghost" href="${T.app}#/p/${p.id}">${T.profile}</a></div>
      </div>
    </div>
  </div>

  <div class="grid2 sp-grid">
    <div class="panel about">
      <h2>${esc(T.who(p.n, p.died === null))}</h2>
      ${p.bio ? `<p class="about-bio">${esc(p.bio)}</p>` : ""}
      ${p.ideas && p.ideas.length ? `<h3 class="about-h">${T.ideas}</h3><ul class="about-ideas">${p.ideas.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
      ${p.line || c ? `<h3 class="about-h">${esc(T.line(p.s))}</h3><p class="about-line">${esc(p.line || c.short)}</p>` : ""}
      ${same.length ? `<p class="about-same">${T.sameC} ${same.map(x => `<a href="${dir}${x.id}/">${esc(x.n)}</a>`).join(", ")}</p>` : ""}
      ${c ? `<p class="about-same"><a href="${cdir}${c.id}/">${esc(T.knowC(c.n))} →</a></p>` : ""}
      ${p.wiki ? `<p class="sp-src">${T.source} <a href="${esc(p.wiki)}" target="_blank" rel="noopener">${T.wiki}</a></p>` : ""}
    </div>
    <div class="panel">
      <h2>${esc(T.books(p.n))}</h2>
      <p class="sub">${T.booksSub}</p>
      <ol class="reads">${books.map((t, i) => book(p, i, t)).join("")}</ol>
      ${amazonNote ? `<p class="aff-note">${amazonNote}</p>` : ""}
    </div>
  </div>

  <h2 class="chapter">${esc(T.axesH(p.n))}</h2>
  <div class="panel sp-axes">
    <p class="sub">${T.axesSub}</p>
    ${AXES.map((a, i) => axisRow(a, p.v[i])).join("")}
  </div>

  <h2 class="chapter">${esc(T.kinH(p.n))}</h2>
  <ul class="sp-kin">${kin.map(x => `<li><a href="${dir}${x.id}/">${portrait(x, "avatar")}<span><span class="nm">${esc(x.n)}</span><span class="sc">${esc(x.s)}</span></span></a></li>`).join("")}</ul>

  <section class="big-cta sp-end">
    <h2 class="h2">${T.endQ}</h2>
    <a class="btn accent" href="${T.app}#/teste">${T.begin}</a>
  </section>
</article>` + foot(p.id);
  }

  function indexPage() {
    const url = urlOf(lang);
    const eras = [...new Set(ALL.map(p => p.era))];
    const title = T.idxTitle(ALL.length);
    const description = T.idxDesc(ALL.length, BR.length);
    const jsonld = [{ "@context": "https://schema.org", "@type": "CollectionPage", name: title, description, url,
      hasPart: ALL.map(p => ({ "@type": "Person", name: p.n, url: urlOf(lang, p.id) })) }];
    return head({ title, description, url, image: `${SITE}/${T.og}`, jsonld, id: "" }) + `
<section class="wrap section sp">
  <span class="eyebrow">${T.library}</span>
  <h1 class="h2 sp-name">${T.count(ALL.length)}</h1>
  <p class="lede">${T.idxLede}</p>
  ${eras.map(era => `<h2 class="chapter">${esc(era)}</h2>
  <ul class="sp-kin sp-all">${ALL.filter(p => p.era === era).sort((a, b) => (a.born ?? 0) - (b.born ?? 0)).map(x => `<li><a href="${dir}${x.id}/">${portrait(x, "avatar")}<span><span class="nm">${esc(x.n)}</span><span class="sc">${esc(x.s)}${x.born != null ? ` · ${esc(year(x.born))}` : ""}</span></span></a></li>`).join("")}</ul>`).join("\n")}
</section>` + foot("");
  }

  const cYears = c => (c.alive ? T.since(year(c.from)) : T.span(year(c.from), year(c.to)));
  const cDist = (a, b) => a.v.reduce((t, x, i) => t + Math.abs(x - b.v[i]), 0) / a.v.length;
  function corrPage(c) {
    const url = urlOf(lang, c.id, "c");
    const near = CORR.filter(x => x !== c).sort((a, b) => cDist(a, c) - cDist(b, c)).slice(0, 3);
    const title = T.cTitle(c.n), description = c.short;
    const jsonld = [
      { "@context": "https://schema.org", "@type": "Article", headline: c.n, description, url, about: { "@type": "Thing", name: c.n }, mentions: c.ms.map(p => ({ "@type": "Person", name: p.n, url: urlOf(lang, p.id) })) },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Filosofômetro", item: `${SITE}${T.app}` },
        { "@type": "ListItem", position: 2, name: T.schools, item: urlOf(lang, "", "c") },
        { "@type": "ListItem", position: 3, name: c.n, item: url },
      ] },
    ];
    return head({ title, description, url, image: `${SITE}/${T.og}`, jsonld, id: c.id, kind: "c" }) + `
<article class="wrap section sp">
  <nav class="sp-crumbs" aria-label="${esc(T.here)}"><a href="${cdir}">${T.schools}</a> <span aria-hidden="true">/</span> ${esc(c.n)}</nav>
  <div class="sp-hero sp-corr">
    <ul class="sp-faces" aria-hidden="true">${c.ms.slice(0, 4).map(p => `<li>${portrait(p, "avatar")}</li>`).join("")}</ul>
    <div>
      <span class="eyebrow">${esc(T.nThinkers(c.ms.length))} · ${esc(cYears(c))}</span>
      <h1 class="h2 sp-name">${esc(c.n)}</h1>
      <p class="serif it sp-quote">${esc(c.short)}</p>
      <div class="sp-cta">
        <p>${esc(T.cCta(c.n))}</p>
        <div class="cta-row"><a class="btn accent" href="${T.app}#/teste">${T.free}</a><a class="btn ghost" href="${T.app}#/corrente/${c.id}">${T.cProfile}</a></div>
      </div>
    </div>
  </div>

  <div class="grid2 sp-grid">
    <div class="panel about">
      <h2>${T.whatIs}</h2>
      ${c.text.map(t => `<p class="about-bio">${esc(t)}</p>`).join("")}
      <h3 class="about-h">${T.ideas}</h3><ul class="about-ideas">${c.ideas.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
    </div>
    <div class="panel">
      <h2>${T.cBooks}</h2>
      <p class="sub">${T.cBooksSub}</p>
      <ol class="reads">${c.ms.slice(0, 3).map(p => book(p, 0, p.b).replace(`${T.start}${T.amazon}`, `${esc(p.n)} · ${T.amazon}`)).join("")}</ol>
      ${amazonNote ? `<p class="aff-note">${amazonNote}</p>` : ""}
    </div>
  </div>

  <h2 class="chapter">${T.members}</h2>
  <ul class="sp-kin">${c.ms.map(x => `<li><a href="${dir}${x.id}/">${portrait(x, "avatar")}<span><span class="nm">${esc(x.n)}</span><span class="sc">${esc(x.s)}${x.born != null ? ` · ${esc(life(x))}` : ""}</span></span></a></li>`).join("")}</ul>

  <h2 class="chapter">${esc(T.cAxesH(c.n))}</h2>
  <div class="panel sp-axes">
    <p class="sub">${T.cAxesSub}</p>
    ${AXES.map((a, i) => axisRow(a, c.v[i])).join("")}
  </div>

  <h2 class="chapter">${T.near}</h2>
  <ul class="sp-kin">${near.map(x => `<li><a href="${cdir}${x.id}/"><span><span class="nm">${esc(x.n)}</span><span class="sc">${esc(x.short)}</span></span></a></li>`).join("")}</ul>

  <section class="big-cta sp-end">
    <h2 class="h2">${T.endQ}</h2>
    <a class="btn accent" href="${T.app}#/teste">${T.begin}</a>
  </section>
</article>` + foot(c.id, "c");
  }
  function corrIndex() {
    const url = urlOf(lang, "", "c");
    const title = T.cIdxTitle(CORR.length), description = T.cIdxDesc(CORR.length);
    const jsonld = [{ "@context": "https://schema.org", "@type": "CollectionPage", name: title, description, url,
      hasPart: CORR.map(c => ({ "@type": "Article", headline: c.n, url: urlOf(lang, c.id, "c") })) }];
    return head({ title, description, url, image: `${SITE}/${T.og}`, jsonld, id: "", kind: "c" }) + `
<section class="wrap section sp">
  <span class="eyebrow">${T.library}</span>
  <h1 class="h2 sp-name">${T.cCount(CORR.length)}</h1>
  <p class="lede">${T.cIdxLede}</p>
  <ul class="sp-kin sp-all sp-schools">${CORR.slice().sort((a, b) => a.from - b.from).map(c => `<li><a href="${cdir}${c.id}/"><span><span class="nm">${esc(c.n)}</span><span class="sc">${esc(c.short)}</span><span class="sc">${esc(T.nThinkers(c.ms.length))} · ${esc(cYears(c))}</span></span></a></li>`).join("")}</ul>
</section>` + foot("", "c");
  }
  const cout = path.join(ROOT, ...T.cdir.split("/"));
  fs.rmSync(cout, { recursive: true, force: true });
  for (const c of CORR) {
    fs.mkdirSync(path.join(cout, c.id), { recursive: true });
    fs.writeFileSync(path.join(cout, c.id, "index.html"), corrPage(c));
  }
  fs.writeFileSync(path.join(cout, "index.html"), corrIndex());

  const out = path.join(ROOT, ...T.dir.split("/"));
  fs.rmSync(out, { recursive: true, force: true });
  for (const p of ALL) {
    fs.mkdirSync(path.join(out, p.id), { recursive: true });
    fs.writeFileSync(path.join(out, p.id, "index.html"), thinkerPage(p));
  }
  fs.writeFileSync(path.join(out, "index.html"), indexPage());
  return [urlOf(lang), ...ALL.map(p => urlOf(lang, p.id)), urlOf(lang, "", "c"), ...CORR.map(c => urlOf(lang, c.id, "c"))];
}

// The app entry page of each language: index.html with the head, the static chrome and the script list
// translated, plus the language pack loaded before i18n.js.
const APP_PAGE = {
  en: { title: "Filosofômetro: which philosopher thinks like you?",
    desc: "Free philosophy test: 44 to 132 statements, 11 themes, 128 thinkers. Find your archetype, who thinks like you and who would disagree most, with the whole calculation open for audit.",
    ogDesc: "44 to 132 statements, 11 themes, 128 thinkers. Your archetype, who thinks like you and who would disagree most.",
    skip: "Skip to content", home: "Filosofômetro, home", nav: "Main", thinkers: "Thinkers", method: "Method", take: "Take the test", takeSm: "Test",
    theme: "Toggle light and dark theme", lang: "Language: English", credit: "Made by", tail: "free test, auditable engine", how: "How we calculate", all: "All thinkers",
    install: "Install the app", app: "Free philosophy test: 11 themes, 128 thinkers and an auditable engine.", noscript: "Filosofômetro needs JavaScript to work.", support: "Support the project" },
  es: { title: "Filosofômetro: ¿qué filósofo piensa como tú?",
    desc: "Test filosófico gratuito: de 44 a 132 afirmaciones, 11 temas, 128 pensadores. Descubre tu arquetipo, a quién te pareces y quién más discreparía de ti, con todo el cálculo abierto para auditoría.",
    ogDesc: "De 44 a 132 afirmaciones, 11 temas, 128 pensadores. Tu arquetipo, a quién te pareces y quién más discreparía de ti.",
    skip: "Saltar al contenido", home: "Filosofômetro, inicio", nav: "Principal", thinkers: "Pensadores", method: "Método", take: "Hacer el test", takeSm: "Test",
    theme: "Cambiar entre tema claro y oscuro", lang: "Idioma: español", credit: "Creado por", tail: "test gratuito, motor auditable", how: "Cómo calculamos", all: "Todos los pensadores",
    install: "Instalar la app", app: "Test filosófico gratuito: 11 temas, 128 pensadores y un motor auditable.", noscript: "Filosofômetro necesita JavaScript para funcionar.", support: "Apoya el proyecto" },
};
function appPage(lang) {
  // The thinker count follows the catalog of each language (the regional lists differ in size).
  const total = String(CATALOG[lang].ALL.length);
  const A = Object.fromEntries(Object.entries(APP_PAGE[lang]).map(([k, v]) => [k, v.replace(/128/g, total)])), T = LANGS[lang];
  let s = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const swap = (from, to) => { if (!s.includes(from)) throw new Error(`index.html changed, cannot find: ${from}`); s = s.split(from).join(to); };
  swap('<html lang="pt-BR">', `<html lang="${T.html}">`);
  swap("<title>Filosofômetro: qual filósofo pensa como você?</title>", `<title>${esc(A.title)}</title>`);
  swap('content="Teste filosófico gratuito: de 44 a 132 afirmações, 11 temas, 128 pensadores. Descubra seu arquétipo, quem pensa parecido com você e quem mais discordaria, com o cálculo inteiro aberto para auditoria."', `content="${esc(A.desc)}"`);
  swap('<meta property="og:title" content="Filosofômetro: qual filósofo pensa como você?">', `<meta property="og:title" content="${esc(A.title)}">`);
  swap('content="De 44 a 132 afirmações, 11 temas, 128 pensadores. Seu arquétipo, quem pensa parecido com você e quem mais discordaria."', `content="${esc(A.ogDesc)}"`);
  swap("https://filosofometro.com.br/og.png", `${SITE}/${T.og}`);
  swap('<meta property="og:url" content="https://filosofometro.com.br/">', `<meta property="og:url" content="${SITE}${T.app}">`);
  swap('<link rel="canonical" href="https://filosofometro.com.br/">', `<link rel="canonical" href="${SITE}${T.app}">`);
  swap(">Pular para o conteúdo<", `>${A.skip}<`);
  swap('aria-label="Filosofômetro, página inicial"', `aria-label="${esc(A.home)}"`);
  swap('aria-label="Principal"', `aria-label="${esc(A.nav)}"`);
  swap('data-nav="pensadores">Pensadores<', `data-nav="pensadores">${A.thinkers}<`);
  swap('data-nav="metodo" class="hide-sm">Método<', `data-nav="metodo" class="hide-sm">${A.method}<`);
  swap('<span class="cta-lg">Fazer o teste</span><span class="cta-sm">Teste</span>', `<span class="cta-lg">${A.take}</span><span class="cta-sm">${A.takeSm}</span>`);
  swap('aria-label="Idioma: português">PT<', `aria-label="${esc(A.lang)}">${lang.toUpperCase()}<`);
  swap('aria-label="Alternar tema claro e escuro"', `aria-label="${esc(A.theme)}"`);
  swap('<span class="credit-line">Criado por ', `<span class="credit-line">${A.credit} `);
  swap("Tiago Cardoso Bezerra</a> · teste gratuito, motor auditável", `Tiago Cardoso Bezerra</a> · ${A.tail}`);
  swap('<a href="#/metodo">Como calculamos</a> · <a href="/pensadores/">Todos os pensadores</a>', `<a href="#/metodo">${A.how}</a> · <a href="/${T.dir}/">${A.all}</a>`);
  swap(">Apoie o projeto<", `>${A.support}<`);
  swap(">Instalar o app<", `>${A.install}<`);
  swap(">O Filosofômetro precisa de JavaScript para funcionar.<", `>${A.noscript}<`);
  swap('<meta name="apple-mobile-web-app-title" content="Filosofômetro">', '<meta name="apple-mobile-web-app-title" content="Filosofômetro">');
  swap("<!--lang-pack-->", `<script src="/i18n/${lang}.js"></script>`);
  swap('<link rel="manifest" href="/manifest.webmanifest">', `<link rel="manifest" href="/${lang}/manifest.webmanifest">`);
  fs.mkdirSync(path.join(ROOT, lang), { recursive: true });
  fs.writeFileSync(path.join(ROOT, lang, "index.html"), s);
  // The installable app in this language: same icons and colors, its own name and start page.
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
  Object.assign(manifest, { id: `/${lang}/`, name: A.title, description: A.app, lang: T.html, start_url: `/${lang}/?source=app`, scope: `/${lang}/` });
  fs.writeFileSync(path.join(ROOT, lang, "manifest.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");
}

const urls = [`${SITE}/`, `${SITE}/en/`, `${SITE}/es/`];
for (const lang of Object.keys(LANGS)) {
  if (lang !== "pt") appPage(lang);
  urls.push(...build(lang));
}
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`${Object.keys(LANGS).map(l => `${l}: ${CATALOG[l].ALL.length} thinker pages, ${CATALOG[l].CORR.length} school pages`).join(", ")}, 2 app pages, sitemap (${urls.length} urls), robots`);
