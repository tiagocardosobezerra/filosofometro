// Link previews: the page and the image a chat app shows when someone pastes a Filosofômetro link.
// The browser app routes by hash (#/vs/...), which never reaches a server, so shared links use
// /s/<code>[/<name>] and /c/<a>/<b>[/<nameA>/<nameB>]. Both are computed with the same engine as the app.
const fs = require("fs");
const path = require("path");
const DATA = require("../data.js");
const Engine = require("../engine.js");
const I18N = require("../i18n.js");
const E = Engine.create(I18N.localize(DATA, null, null).DATA);
// One engine per language, created on first use: names, schools and the regional list are translated.
const PACKS = { en: () => require("../i18n/en.js"), es: () => require("../i18n/es.js") };
const ENGINES = { pt: E };
const engineFor = lang => ENGINES[lang] || (ENGINES[lang] = Engine.create(I18N.localize(DATA, null, PACKS[lang]()).DATA));
const LANGS = ["pt", "en", "es"];
const langOf = l => (LANGS.includes(l) ? l : "pt");
// Every sentence the previews say, per language.
const TXT = {
  pt: { html: "pt-BR", someone: "Alguém", bc: "a.C.", to: "a", dared: w => `${w} te desafiou no ${SITE}`, got: (w, pct, n) => `${w} deu ${pct}% ${n}. E você?`,
    descFlat: "Qual filósofo pensa como você? Faça o teste e compare, eixo por eixo.", desc: (n, s) => `Par filosófico: ${n} (${s}). Faça o teste e descubra quanto vocês pensam parecido.`,
    two: "Duas pessoas", and: "e", friend: " e um amigo", in: "no", compat: "compatíveis", cmpDesc: "Onde pensam igual, onde divergem e quais filósofos têm em comum. Faça o teste e compare também.",
    open: "Abrir o", daredCaps: w => `${w} TE DESAFIOU`, mine: "MEU PAR FILOSÓFICO", balanced: "Perfil equilibrado", q1: "Qual filósofo pensa como ", you: "você?",
    comparison: "COMPARAÇÃO", noDir: "Sem direção", p1: "Pessoa 1", p2: "Pessoa 2", tagline: n => `11 eixos · ${n} pensadores · teste gratuito`, q0: "Qual filósofo", q2: "pensa como " },
  en: { html: "en", someone: "Someone", bc: "BC", to: "to", dared: w => `${w} challenged you on ${SITE}`, got: (w, pct, n) => `${w} got ${pct}% ${n}. What about you?`,
    descFlat: "Which philosopher thinks like you? Take the test and compare, axis by axis.", desc: (n, s) => `Philosophical match: ${n} (${s}). Take the test and see how alike you think.`,
    two: "Two people", and: "and", friend: " and a friend", in: "on", compat: "compatible", cmpDesc: "Where they agree, where they split and which philosophers they share. Take the test and compare too.",
    open: "Open", daredCaps: w => `${w} CHALLENGED YOU`, mine: "MY PHILOSOPHICAL MATCH", balanced: "Balanced profile", q1: "Which philosopher thinks like ", you: "you?",
    comparison: "COMPARISON", noDir: "No direction", p1: "Person 1", p2: "Person 2", tagline: n => `11 axes · ${n} thinkers · free test`, q0: "Which philosopher", q2: "thinks like " },
  es: { html: "es", someone: "Alguien", bc: "a. C.", to: "a", dared: w => `${w} te desafió en ${SITE}`, got: (w, pct, n) => `${w} sacó ${pct}% ${n}. ¿Y tú?`,
    descFlat: "¿Qué filósofo piensa como tú? Haz el test y compara, eje por eje.", desc: (n, s) => `Par filosófico: ${n} (${s}). Haz el test y descubre cuánto se parecen.`,
    two: "Dos personas", and: "y", friend: " y un amigo", in: "en", compat: "compatibles", cmpDesc: "Dónde piensan igual, dónde difieren y qué filósofos comparten. Haz el test y compara tú también.",
    open: "Abrir", daredCaps: w => `${w} TE DESAFIÓ`, mine: "MI PAR FILOSÓFICO", balanced: "Perfil equilibrado", q1: "¿Qué filósofo piensa como ", you: "tú?",
    comparison: "COMPARACIÓN", noDir: "Sin dirección", p1: "Persona 1", p2: "Persona 2", tagline: n => `11 ejes · ${n} pensadores · test gratuito`, q0: "¿Qué filósofo", q2: "piensa como " },
};

const SITE = "Filosofômetro";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Same rule as the app: letters, digits, space, dot, apostrophe and hyphen, at most 24 characters.
const cleanName = s => { try { s = decodeURIComponent(s || ""); } catch (e) { s = ""; } return s.replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 24); };
const decode = c => (typeof c === "string" ? E.decode(c) : null);
const lifeText = (p, T = TXT.pt) => (p.born < 0 ? `${p.approx ? "c. " : ""}${-p.born} ${T.bc}` : `${p.approx ? "c. " : ""}${p.born}`) + (p.died === null ? "" : p.died < 0 ? ` ${T.to} ${-p.died} ${T.bc}` : ` ${T.to} ${p.died}`);

/* ---------- What each link says ---------- */
function inviteInfo(code, rawName, rawLang) {
  const a = decode(code);
  if (!a) return null;
  const lang = langOf(rawLang), T = TXT[lang];
  const r = engineFor(lang).evaluate(a), name = cleanName(rawName), p = r.top.p;
  const who = name || T.someone;
  const title = r.directionless ? T.dared(who) : T.got(who, r.top.pct, p.n);
  const description = r.directionless ? T.descFlat : T.desc(p.n, p.s);
  const hash = `#/vs/${code}${name ? `/${encodeURIComponent(name)}` : ""}`;
  return { kind: "invite", lang, T, r, name, title, description, hash };
}
function compareInfo(codeA, codeB, rawA, rawB, rawLang) {
  const a = decode(codeA), b = decode(codeB);
  if (!a || !b) return null;
  const lang = langOf(rawLang), T = TXT[lang];
  const c = engineFor(lang).comparePeople(a, b), nA = cleanName(rawA), nB = cleanName(rawB);
  const pair = `${nA || T.two}${nB ? ` ${T.and} ${nB}` : nA ? T.friend : ""}`;
  const title = c.pct === null ? `${pair} ${T.in} ${SITE}` : `${pair}: ${c.pct}% ${T.compat}`;
  const description = T.cmpDesc;
  const hash = `#/comparar/${codeA}/${codeB}${nA || nB ? `/${encodeURIComponent(nA)}/${encodeURIComponent(nB)}` : ""}`;
  return { kind: "compare", lang, T, c, nA, nB, title, description, hash };
}

/* ---------- The share page: metadata for crawlers, an instant redirect for people ---------- */
function sharePage(info, origin, imageQuery) {
  const prefix = info.lang === "pt" ? "" : `/${info.lang}`;
  const target = `${origin}${prefix}/${info.hash}`, self = `${origin}${prefix}${info.hash.replace(/^#\/vs\//, "/s/").replace(/^#\/comparar\//, "/c/")}`, image = `${origin}/api/og?${imageQuery}`;
  return `<!doctype html><html lang="${info.T.html}"><head><meta charset="utf-8">
<title>${esc(info.title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${esc(info.description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE}">
<meta property="og:title" content="${esc(info.title)}">
<meta property="og:description" content="${esc(info.description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(info.title)}">
<meta property="og:url" content="${esc(self)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(info.title)}">
<meta name="twitter:description" content="${esc(info.description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="canonical" href="${esc(self)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)})</script>
</head><body style="background:#0F0E0C;color:#F1EADC;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0">
<a href="${esc(target)}" style="color:#F06A43">${info.T.open} ${SITE}</a></body></html>`;
}

/* ---------- The image: 1200 × 630 SVG, rasterized with resvg ---------- */
const W = 1200, H = 630;
const C = { bg: "#0F0E0C", card: "#15130F", ink: "#F1EADC", muted: "#9C9283", accent: "#F06A43", line: "rgba(241,234,220,.16)" };
const serif = "Instrument Serif", sans = "Inter Tight";
// Sigil geometry, identical to the app's: 11 spokes, inner radius 16%.
const R = 100;
const angle = i => -Math.PI / 2 + i * 2 * Math.PI / DATA.AXES.length;
const rad = v => R * (0.16 + 0.84 * (Math.max(-1, Math.min(1, v)) + 1) / 2);
const poly = (v, cx, cy, s) => v.map((x, i) => `${(cx + Math.cos(angle(i)) * rad(x) * s).toFixed(1)},${(cy + Math.sin(angle(i)) * rad(x) * s).toFixed(1)}`).join(" ");
function sigilSVG(cx, cy, s, main, other) {
  let g = `<circle cx="${cx}" cy="${cy}" r="${R * s + 18}" fill="${C.card}" fill-opacity=".94" stroke="${C.line}"/>`;
  [0.33, 0.66, 1].forEach(f => { g += `<circle cx="${cx}" cy="${cy}" r="${(R * (0.16 + 0.84 * f) * s).toFixed(1)}" fill="none" stroke="${C.line}" stroke-width="1.2"/>`; });
  DATA.AXES.forEach((_, i) => { g += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(angle(i)) * R * s).toFixed(1)}" y2="${(cy + Math.sin(angle(i)) * R * s).toFixed(1)}" stroke="${C.line}"/>`; });
  if (other) g += `<polygon points="${poly(other, cx, cy, s)}" fill="none" stroke="${C.ink}" stroke-opacity=".8" stroke-width="2.6" stroke-dasharray="7 7" stroke-linejoin="round"/>`;
  g += `<polygon points="${poly(main, cx, cy, s)}" fill="${C.accent}" fill-opacity=".22" stroke="${C.accent}" stroke-width="3" stroke-linejoin="round"/>`;
  return g;
}
const initials = n => n.split(" ").filter(w => /^[A-ZÀ-Ý]/.test(w)).slice(0, 2).map(w => w[0]).join("");
// Long names step down in size so they always fit their column.
const fitSize = (text, max, width, ratio) => Math.min(max, Math.floor(width / (text.length * ratio)));

// Fetches a Wikimedia portrait and inlines it, so the rasterizer needs no network. Null on any failure.
async function portraitData(p) {
  if (!p.img) return null;
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(p.img, { signal: ctl.signal, headers: { "User-Agent": "Filosofometro/1.0 (https://filosofometro.com.br)" } });
    clearTimeout(t);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    if (!/^image\/(jpeg|png)/.test(type)) return null;
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch (e) { return null; }
}
// Arch-shaped portrait, toned like the site: grayscale with a warm accent wash at the bottom.
function archSVG(x, y, w, h, img, p) {
  const r = w / 2, d = `M${x} ${y + r}A${r} ${r} 0 0 1 ${x + w} ${y + r}L${x + w} ${y + h - 22}Q${x + w} ${y + h} ${x + w - 22} ${y + h}L${x + 22} ${y + h}Q${x} ${y + h} ${x} ${y + h - 22}Z`;
  let g = `<clipPath id="arch"><path d="${d}"/></clipPath><g clip-path="url(#arch)"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1D1A16"/>`;
  if (img) g += `<image href="${img}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMin slice" filter="url(#tone)"/>`;
  else g += `<text x="${x + w / 2}" y="${y + h / 2 + 40}" text-anchor="middle" font-family="${serif}" font-size="130" fill="${C.muted}">${esc(initials(p.n))}</text>`;
  g += `<rect x="${x}" y="${y + h * 0.45}" width="${w}" height="${h * 0.55}" fill="url(#wash)"/></g><path d="${d}" fill="none" stroke="${C.line}" stroke-width="2"/>`;
  return g;
}
const defs = `<defs>
<filter id="tone" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.04" intercept=".02"/><feFuncB type="linear" slope=".9"/></feComponentTransfer></filter>
<linearGradient id="wash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.accent}" stop-opacity="0"/><stop offset="1" stop-color="${C.accent}" stop-opacity=".42"/></linearGradient>
<radialGradient id="glow" cx="0.28" cy="0.4" r="0.7"><stop offset="0" stop-color="${C.accent}" stop-opacity=".26"/><stop offset="1" stop-color="${C.accent}" stop-opacity="0"/></radialGradient>
</defs>`;
const frame = body => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}
<rect width="${W}" height="${H}" fill="${C.bg}"/><rect width="${W}" height="${H}" fill="url(#glow)"/>${body}
<text x="1120" y="590" text-anchor="end" font-family="${sans}" font-size="22" fill="${C.muted}">filosofometro.com.br</text></svg>`;
const brand = (x, y) => `<path d="M${x + 14} ${y - 22}L${x + 28} ${y + 4}L${x} ${y + 4}Z" fill="none" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/><circle cx="${x + 14}" cy="${y - 4}" r="3.6" fill="${C.accent}"/><text x="${x + 42}" y="${y + 2}" font-family="${serif}" font-size="34" fill="${C.ink}">${SITE}</text>`;

// The archetype, the same rule as archetype() in app.js: the strongest pole gives the noun and the second
// qualifies it. The words are the Portuguese keys of the interface; packs translate them.
const ARCH_NOUN = [["Racionalista","Empirista"],["Determinista","Voluntarista"],["Essencialista","Existencialista"],["Deontologista","Pragmatista"],["Individualista","Comunitarista"],["Hedonista","Eudemonista"],["Materialista","Espiritualista"],["Realista","Relativista"],["Tradicionalista","Reformista"],["Quietista","Ativista"],["Institucionalista","Autonomista"]];
const ARCH_OF = [["da Razão","da Experiência"],["do Destino","da Liberdade"],["do Sentido","da Criação"],["do Dever","das Consequências"],["do Indivíduo","da Comunidade"],["do Prazer","da Virtude"],["da Matéria","do Espírito"],["da Certeza","da Dúvida"],["da Tradição","da Ruptura"],["da Aceitação","da Resistência"],["da Ordem","da Autonomia"]];
function archName(v, lang) {
  const ui = (lang && lang !== "pt" ? PACKS[lang]().ui : null) || {}, tr = k => ui[k] || k;
  const t2 = v.map((x, i) => ({ i, x })).filter(o => Math.abs(o.x) >= 0.13).sort((a, b) => Math.abs(b.x) - Math.abs(a.x) || a.i - b.i).slice(0, 2);
  if (t2.length < 2) return tr("Equilibrista");
  const side = o => (o.x < 0 ? 0 : 1);
  return `${tr(ARCH_NOUN[t2[0].i][side(t2[0])])} ${tr(ARCH_OF[t2[1].i][side(t2[1])])}`;
}
async function inviteSVG(info) {
  const { r, name, T } = info, p = r.top.p, img = await portraitData(p);
  const X = 500, colW = 630;
  let b = archSVG(70, 70, 330, 490, img, p) + sigilSVG(390, 470, 0.82, r.scores, p.v);
  b += brand(X, 120);
  b += `<text x="${X}" y="196" font-family="${sans}" font-size="22" letter-spacing="4" fill="${C.muted}">${esc((name ? T.daredCaps(name) : T.mine).toUpperCase())}</text>`;
  if (r.directionless) {
    b += `<text x="${X}" y="330" font-family="${serif}" font-size="96" fill="${C.ink}">${T.balanced}</text>`;
  } else {
    const an = archName(r.scores, info.lang);
    b += `<text x="${X}" y="248" font-family="${serif}" font-style="italic" font-size="${fitSize(an, 46, colW, 0.4)}" fill="${C.accent}">${esc(an)}</text>`;
    b += `<text x="${X}" y="360" font-family="${serif}" font-size="112" fill="${C.accent}">${r.top.pct}%</text>`;
    b += `<text x="${X}" y="438" font-family="${serif}" font-size="${fitSize(p.n, 84, colW, 0.44)}" fill="${C.ink}">${esc(p.n)}</text>`;
    b += `<text x="${X}" y="480" font-family="${sans}" font-size="22" letter-spacing="2" fill="${C.muted}">${esc(`${p.s} · ${lifeText(p, T)}`.toUpperCase())}</text>`;
  }
  b += `<text x="${X}" y="540" font-family="${serif}" font-style="italic" font-size="40" fill="${C.ink}">${esc(T.q1)}<tspan fill="${C.accent}">${esc(T.you)}</tspan></text>`;
  return frame(b);
}
async function compareSVG(info) {
  const { c, nA, nB, T } = info, a = c.a, b = c.b;
  let g = sigilSVG(300, 315, 2.05, b.scores, a.scores);
  g += brand(600, 120);
  g += `<text x="600" y="196" font-family="${sans}" font-size="22" letter-spacing="4" fill="${C.muted}">${T.comparison}</text>`;
  g += `<text x="600" y="330" font-family="${serif}" font-size="${c.pct === null ? 90 : 150}" fill="${C.accent}">${c.pct === null ? T.noDir : `${c.pct}%`}</text>`;
  g += `<text x="600" y="392" font-family="${serif}" font-size="48" fill="${C.ink}">${T.compat}</text>`;
  const who = (n, r, y, dashed) => `<line x1="600" y1="${y - 9}" x2="640" y2="${y - 9}" stroke="${dashed ? C.ink : C.accent}" stroke-width="4" ${dashed ? 'stroke-dasharray="7 6"' : ""}/><text x="656" y="${y}" font-family="${sans}" font-size="26" fill="${C.ink}">${esc(n)}<tspan fill="${C.muted}"> · ${esc(r.top.p.n)}</tspan></text>`;
  g += who(nB || T.p2, b, 462, false) + who(nA || T.p1, a, 508, true);
  return frame(g);
}

// One font database for every image, loaded from the bundled fonts folder.
const FONT_DIR = path.join(__dirname, "..", "fonts");
const fontFiles = fs.readdirSync(FONT_DIR).filter(f => f.endsWith(".ttf")).map(f => path.join(FONT_DIR, f));
function rasterize(svg) {
  const { Resvg } = require("@resvg/resvg-js");
  return new Resvg(svg, { fitTo: { mode: "width", value: W }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: sans } }).render().asPng();
}

// The site-wide preview (og.png at the root), generated once by tests/make-og.js.
async function homeSVG(lang = "pt") {
  const T = TXT[langOf(lang)];
  const ids = ["platao", "simone-de-beauvoir", "nietzsche"], ps = ids.map(id => DATA.PH.find(p => p.id === id)).filter(Boolean);
  const imgs = await Promise.all(ps.map(portraitData));
  let b = brand(70, 120);
  b += `<text x="70" y="270" font-family="${serif}" font-size="104" fill="${C.ink}">${esc(T.q0)}</text>`;
  b += `<text x="70" y="370" font-family="${serif}" font-size="104" fill="${C.ink}">${esc(T.q2)}<tspan font-style="italic" fill="${C.accent}">${esc(T.you)}</tspan></text>`;
  b += `<text x="70" y="450" font-family="${sans}" font-size="26" fill="${C.muted}">${T.tagline(engineFor(langOf(lang)).PH.length + engineFor(langOf(lang)).BRAZIL.length - engineFor(langOf(lang)).PH.filter(x => x.br).length)}</text>`;
  // Three arches, each with its own clip path, overlapping slightly.
  ps.forEach((p, i) => { b += archSVG(760 + i * 120, 120 + (i % 2) * 60, 210, 330, imgs[i], p).replace(/id="arch"/, `id="arch${i}"`).replace(/url\(#arch\)/, `url(#arch${i})`); });
  return frame(b);
}

module.exports = { E, archName, inviteInfo, compareInfo, sharePage, inviteSVG, compareSVG, homeSVG, rasterize, cleanName };
