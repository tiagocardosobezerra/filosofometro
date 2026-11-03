// Generates one static, indexable page per thinker (pensadores/<id>/index.html), the index page,
// sitemap.xml and robots.txt. The app itself lives behind "#", which search engines barely index;
// these pages carry the same catalog text as plain HTML and send readers to the test.
// Usage: node tests/make-pages.js   (run again whenever data.js, support.js or covers.js change)
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const DATA = require(path.join(ROOT, "data.js"));
const S = require(path.join(ROOT, "support.js"));
let COVERS = {};
try { COVERS = require(path.join(ROOT, "covers.js")); } catch (e) {}

const SITE = "https://filosofometro.com.br";
const { AXES, PH } = DATA;
const BR = DATA.BR || [];
const ALL = [...PH, ...BR];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const year = y => (y < 0 ? `${-y} a.C.` : String(y));
const life = p => (p.born == null ? "" : `${p.approx ? "c. " : ""}${year(p.born)}${p.died == null ? "" : ` a ${year(p.died)}`}`);
const lean = (a, x) => (Math.abs(x) < 0.13 ? "Equilíbrio" : `${x < 0 ? a.l : a.r}${Math.abs(x) >= 0.6 ? ", forte" : ""}`);
const fmt = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(2).replace(".", ",");
const dist = (a, b) => a.v.reduce((t, v, i) => t + Math.abs(v - b.v[i]), 0) / a.v.length;
const initials = n => n.split(" ").filter(w => /^[A-ZÀ-Ý]/.test(w)).slice(0, 2).map(w => w[0]).join("");
// Meta descriptions: the first sentences of the biography, up to about 155 characters.
const summary = p => {
  const out = [];
  for (const s of (p.bio || "").split(/(?<=\.)\s+/)) { if ((out.join(" ") + " " + s).length > 155 && out.length) break; out.push(s); }
  return out.join(" ") || `${p.n}, ${p.s}.`;
};
const amazonNote = S.SUPPORT.amazonTag ? "Como associado da Amazon, o Filosofômetro ganha com compras qualificadas, sem custo a mais para você." : "";

const head = ({ title, description, url, image, jsonld }) => `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
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
    <a class="brand" href="/" aria-label="Filosofômetro, página inicial">
      <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 28 27H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="16" cy="19" r="3.2" fill="var(--accent)"/></svg>
      Filosofômetro
    </a>
    <nav class="nav" aria-label="Principal">
      <a href="/pensadores/">Pensadores</a>
      <a href="/#/metodo" class="hide-sm">Método</a>
      <a href="/#/teste" class="nav-cta"><span class="cta-lg">Fazer o teste</span><span class="cta-sm">Teste</span></a>
    </nav>
  </div>
</header>
<main>`;

const foot = `</main>
<footer>
  <div class="wrap">
    <span class="credit-line">Criado por <a class="author" href="https://github.com/tiagocardosobezerra" target="_blank" rel="noopener author">Tiago Cardoso Bezerra</a> · teste gratuito, motor auditável</span>
    <span><a href="/#/metodo">Como calculamos</a> · <a href="/pensadores/">Todos os pensadores</a>${S.SUPPORT.pixKey ? ` · <a href="/#/apoie">Apoie o projeto</a>` : ""}</span>
  </div>
</footer>
</body>
</html>
`;

const portrait = (p, cls) => p.img
  ? `<figure class="portrait ${cls}"><img src="${esc(p.img)}" alt="Retrato de ${esc(p.n)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></figure>`
  : `<figure class="portrait noimg ${cls}" aria-hidden="true"><span class="sp-initials">${esc(initials(p.n))}</span></figure>`;

const book = (p, i, title) => {
  const cov = (COVERS[p.id] || [])[i];
  return `<li><a href="${esc(S.bookURL(title, p.n))}" target="_blank" rel="sponsored noopener"><span class="cover" aria-hidden="true">${cov ? `<img src="/covers/${cov}.jpg" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ""}</span><span><span class="t">${esc(title)}</span><span class="muted">${i ? "" : "Comece por este · "}Ver na Amazon</span></span><span class="pc" aria-hidden="true">↗</span></a></li>`;
};

const axisRow = (a, x) => {
  const left = Math.min(50, (x + 1) * 50), width = Math.abs(x) * 50;
  return `<div class="axis-row"><div class="sp-axis">${esc(cap(a.name))}</div>
    <div class="poles"><span>${Math.abs(x) >= 0.13 && x < 0 ? `<b>${esc(a.l)}</b>` : esc(a.l)}</span><span class="val">${esc(lean(a, x))} · ${fmt(x)}</span><span>${Math.abs(x) >= 0.13 && x > 0 ? `<b>${esc(a.r)}</b>` : esc(a.r)}</span></div>
    <div class="track" role="img" aria-label="${esc(`${a.name}: ${lean(a, x)}`)}"><span class="center"></span><span class="fill" style="left:${left}%;width:${width}%"></span><span class="you" style="left:${(x + 1) * 50}%"></span></div></div>`;
};

function thinkerPage(p) {
  const url = `${SITE}/pensadores/${p.id}/`;
  const books = [p.b, ...(S.READING[p.id] || [])];
  const kin = ALL.filter(x => x !== p).map(x => ({ x, d: dist(p, x) })).sort((a, b) => a.d - b.d).slice(0, 4).map(o => o.x);
  const same = ALL.filter(x => x !== p && x.s === p.s);
  const title = `${p.n}: vida, ideias e livros | Filosofômetro`;
  const description = summary(p);
  const jsonld = [
    { "@context": "https://schema.org", "@type": "Person", name: p.n, description, ...(p.img ? { image: p.img } : {}), ...(p.wiki ? { sameAs: [p.wiki] } : {}), ...(p.born != null && p.born > 0 ? { birthDate: String(p.born) } : {}), ...(p.died != null && p.died > 0 ? { deathDate: String(p.died) } : {}), url },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Filosofômetro", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Pensadores", item: `${SITE}/pensadores/` },
      { "@type": "ListItem", position: 3, name: p.n, item: url },
    ] },
  ];
  return head({ title, description, url, image: p.img || `${SITE}/og.png`, jsonld }) + `
<article class="wrap section sp">
  <nav class="sp-crumbs" aria-label="Você está em"><a href="/pensadores/">Pensadores</a> <span aria-hidden="true">/</span> ${esc(p.n)}</nav>
  <div class="sp-hero">
    ${portrait(p, "sp-pic")}
    <div>
      <span class="eyebrow">${esc(p.s)} · ${esc(p.era)}</span>
      <h1 class="h2 sp-name">${esc(p.n)}</h1>
      <p class="sp-life">${esc(life(p))}${p.place ? ` · ${esc(p.place)}` : ""}</p>
      ${p.q ? `<p class="serif it sp-quote">“${esc(p.q)}”</p>` : ""}
      <div class="sp-cta">
        <p>Você pensa como ${esc(p.n)}? Responda de 44 a 132 afirmações e descubra quem, entre ${ALL.length} pensadores, tem o formato de pensamento mais parecido com o seu.</p>
        <div class="cta-row"><a class="btn accent" href="/#/teste">Fazer o teste grátis</a><a class="btn ghost" href="/#/p/${p.id}">Ver o perfil interativo</a></div>
      </div>
    </div>
  </div>

  <div class="grid2 sp-grid">
    <div class="panel about">
      <h2>Quem foi ${esc(p.n)}</h2>
      ${p.bio ? `<p class="about-bio">${esc(p.bio)}</p>` : ""}
      ${p.ideas && p.ideas.length ? `<h3 class="about-h">Ideias centrais</h3><ul class="about-ideas">${p.ideas.map(i => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}
      ${p.line ? `<h3 class="about-h">A linha: ${esc(p.s)}</h3><p class="about-line">${esc(p.line)}</p>` : ""}
      ${same.length ? `<p class="about-same">Na mesma linha: ${same.map(x => `<a href="/pensadores/${x.id}/">${esc(x.n)}</a>`).join(", ")}</p>` : ""}
      ${p.wiki ? `<p class="sp-src">Fonte para saber mais: <a href="${esc(p.wiki)}" target="_blank" rel="noopener">Wikipédia</a></p>` : ""}
    </div>
    <div class="panel">
      <h2>Livros de ${esc(p.n)}</h2>
      <p class="sub">Três portas de entrada. Comece pelo primeiro.</p>
      <ol class="reads">${books.map((t, i) => book(p, i, t)).join("")}</ol>
      ${amazonNote ? `<p class="aff-note">${amazonNote}</p>` : ""}
    </div>
  </div>

  <h2 class="chapter">Onde ${esc(p.n)} fica nos 11 eixos</h2>
  <div class="panel sp-axes">
    <p class="sub">Posição no catálogo do Filosofômetro, de −1 a +1 em cada eixo. São essas posições que o teste compara com as suas respostas.</p>
    ${AXES.map((a, i) => axisRow(a, p.v[i])).join("")}
  </div>

  <h2 class="chapter">Pensadores parecidos com ${esc(p.n)}</h2>
  <ul class="sp-kin">${kin.map(x => `<li><a href="/pensadores/${x.id}/">${portrait(x, "avatar")}<span><span class="nm">${esc(x.n)}</span><span class="sc">${esc(x.s)}</span></span></a></li>`).join("")}</ul>

  <section class="big-cta sp-end">
    <h2 class="h2">Qual filósofo<br><em class="it accent">pensa como você?</em></h2>
    <a class="btn accent" href="/#/teste">Começar o teste</a>
  </section>
</article>` + foot;
}

function indexPage() {
  const url = `${SITE}/pensadores/`;
  const eras = [...new Set(ALL.map(p => p.era))];
  const title = `Pensadores: ${ALL.length} filósofos, vidas, ideias e livros | Filosofômetro`;
  const description = `Vida, ideias centrais, posições e livros de ${ALL.length} pensadores, de Pitágoras a Byung-Chul Han, com ${BR.length} brasileiros. Descubra qual deles pensa como você.`;
  const jsonld = [{ "@context": "https://schema.org", "@type": "CollectionPage", name: title, description, url,
    hasPart: ALL.map(p => ({ "@type": "Person", name: p.n, url: `${SITE}/pensadores/${p.id}/` })) }];
  return head({ title, description, url, image: `${SITE}/og.png`, jsonld }) + `
<section class="wrap section sp">
  <span class="eyebrow">Biblioteca</span>
  <h1 class="h2 sp-name">${ALL.length} pensadores</h1>
  <p class="lede">Vida, ideias centrais, posição nos 11 eixos e três livros de cada um. Quer saber com qual deles você mais se parece? <a href="/#/teste">Faça o teste</a>.</p>
  ${eras.map(era => `<h2 class="chapter">${esc(era)}</h2>
  <ul class="sp-kin sp-all">${ALL.filter(p => p.era === era).sort((a, b) => (a.born ?? 0) - (b.born ?? 0)).map(x => `<li><a href="/pensadores/${x.id}/">${portrait(x, "avatar")}<span><span class="nm">${esc(x.n)}</span><span class="sc">${esc(x.s)}${x.born != null ? ` · ${esc(year(x.born))}` : ""}</span></span></a></li>`).join("")}</ul>`).join("\n")}
</section>` + foot;
}

const out = path.join(ROOT, "pensadores");
fs.rmSync(out, { recursive: true, force: true });
for (const p of ALL) {
  fs.mkdirSync(path.join(out, p.id), { recursive: true });
  fs.writeFileSync(path.join(out, p.id, "index.html"), thinkerPage(p));
}
fs.writeFileSync(path.join(out, "index.html"), indexPage());
const today = new Date().toISOString().slice(0, 10);
const urls = [`${SITE}/`, `${SITE}/pensadores/`, ...ALL.map(p => `${SITE}/pensadores/${p.id}/`)];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`${ALL.length} thinker pages, index, sitemap (${urls.length} urls), robots`);
