// Link previews: the page and the image a chat app shows when someone pastes a Filosofômetro link.
// The browser app routes by hash (#/vs/...), which never reaches a server, so shared links use
// /s/<code>[/<name>] and /c/<a>/<b>[/<nameA>/<nameB>]. Both are computed with the same engine as the app.
const fs = require("fs");
const path = require("path");
const DATA = require("../data.js");
const Engine = require("../engine.js");
const E = Engine.create(DATA);

const SITE = "Filosofômetro";
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// Same rule as the app: letters, digits, space, dot, apostrophe and hyphen, at most 24 characters.
const cleanName = s => { try { s = decodeURIComponent(s || ""); } catch (e) { s = ""; } return s.replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 24); };
const decode = c => (typeof c === "string" ? E.decode(c) : null);
const lifeText = p => (p.born < 0 ? `${p.approx ? "c. " : ""}${-p.born} a.C.` : `${p.approx ? "c. " : ""}${p.born}`) + (p.died === null ? "" : p.died < 0 ? ` a ${-p.died} a.C.` : ` a ${p.died}`);

/* ---------- What each link says ---------- */
function inviteInfo(code, rawName) {
  const a = decode(code);
  if (!a) return null;
  const r = E.evaluate(a), name = cleanName(rawName), p = r.top.p;
  const who = name || "Alguém";
  const title = r.directionless ? `${who} te desafiou no ${SITE}` : `${who} deu ${r.top.pct}% ${p.n}. E você?`;
  const description = r.directionless
    ? "Qual filósofo pensa como você? Faça o teste e compare, eixo por eixo."
    : `Par filosófico: ${p.n} (${p.s}). Faça o teste e descubra quanto vocês pensam parecido.`;
  const hash = `#/vs/${code}${name ? `/${encodeURIComponent(name)}` : ""}`;
  return { kind: "invite", r, name, title, description, hash };
}
function compareInfo(codeA, codeB, rawA, rawB) {
  const a = decode(codeA), b = decode(codeB);
  if (!a || !b) return null;
  const c = E.comparePeople(a, b), nA = cleanName(rawA), nB = cleanName(rawB);
  const pair = `${nA || "Duas pessoas"}${nB ? ` e ${nB}` : nA ? " e um amigo" : ""}`;
  const title = c.pct === null ? `${pair} no ${SITE}` : `${pair}: ${c.pct}% compatíveis`;
  const description = "Onde pensam igual, onde divergem e quais filósofos têm em comum. Faça o teste e compare também.";
  const hash = `#/comparar/${codeA}/${codeB}${nA || nB ? `/${encodeURIComponent(nA)}/${encodeURIComponent(nB)}` : ""}`;
  return { kind: "compare", c, nA, nB, title, description, hash };
}

/* ---------- The share page: metadata for crawlers, an instant redirect for people ---------- */
function sharePage(info, origin, imageQuery) {
  const target = `${origin}/${info.hash}`, image = `${origin}/api/og?${imageQuery}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
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
<meta property="og:url" content="${esc(target)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(info.title)}">
<meta name="twitter:description" content="${esc(info.description)}">
<meta name="twitter:image" content="${esc(image)}">
<link rel="canonical" href="${esc(target)}">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)})</script>
</head><body style="background:#0F0E0C;color:#F1EADC;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0">
<a href="${esc(target)}" style="color:#F06A43">Abrir o ${SITE}</a></body></html>`;
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
    const res = await fetch(p.img, { signal: ctl.signal, headers: { "User-Agent": "Filosofometro/1.0 (https://filosofometro.vercel.app)" } });
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

async function inviteSVG(info) {
  const { r, name } = info, p = r.top.p, img = await portraitData(p);
  const X = 500, colW = 630;
  let b = archSVG(70, 70, 330, 490, img, p) + sigilSVG(390, 470, 0.82, r.scores, p.v);
  b += brand(X, 120);
  b += `<text x="${X}" y="196" font-family="${sans}" font-size="22" letter-spacing="4" fill="${C.muted}">${esc((name ? `${name} TE DESAFIOU` : "MEU PAR FILOSÓFICO").toUpperCase())}</text>`;
  if (r.directionless) {
    b += `<text x="${X}" y="330" font-family="${serif}" font-size="96" fill="${C.ink}">Perfil equilibrado</text>`;
  } else {
    b += `<text x="${X}" y="318" font-family="${serif}" font-size="140" fill="${C.accent}">${r.top.pct}%</text>`;
    b += `<text x="${X}" y="420" font-family="${serif}" font-size="${fitSize(p.n, 104, colW, 0.44)}" fill="${C.ink}">${esc(p.n)}</text>`;
    b += `<text x="${X}" y="468" font-family="${sans}" font-size="22" letter-spacing="2" fill="${C.muted}">${esc(`${p.s} · ${lifeText(p)}`.toUpperCase())}</text>`;
  }
  b += `<text x="${X}" y="540" font-family="${serif}" font-style="italic" font-size="40" fill="${C.ink}">Qual filósofo pensa como <tspan fill="${C.accent}">você?</tspan></text>`;
  return frame(b);
}
async function compareSVG(info) {
  const { c, nA, nB } = info, a = c.a, b = c.b;
  let g = sigilSVG(300, 315, 2.05, b.scores, a.scores);
  g += brand(600, 120);
  g += `<text x="600" y="196" font-family="${sans}" font-size="22" letter-spacing="4" fill="${C.muted}">COMPARAÇÃO</text>`;
  g += `<text x="600" y="330" font-family="${serif}" font-size="${c.pct === null ? 90 : 150}" fill="${C.accent}">${c.pct === null ? "Sem direção" : `${c.pct}%`}</text>`;
  g += `<text x="600" y="392" font-family="${serif}" font-size="48" fill="${C.ink}">compatíveis</text>`;
  const who = (n, r, y, dashed) => `<line x1="600" y1="${y - 9}" x2="640" y2="${y - 9}" stroke="${dashed ? C.ink : C.accent}" stroke-width="4" ${dashed ? 'stroke-dasharray="7 6"' : ""}/><text x="656" y="${y}" font-family="${sans}" font-size="26" fill="${C.ink}">${esc(n)}<tspan fill="${C.muted}"> · ${esc(r.top.p.n)}</tspan></text>`;
  g += who(nB || "Pessoa 2", b, 462, false) + who(nA || "Pessoa 1", a, 508, true);
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
async function homeSVG() {
  const ids = ["platao", "simone-de-beauvoir", "nietzsche"], ps = ids.map(id => DATA.PH.find(p => p.id === id)).filter(Boolean);
  const imgs = await Promise.all(ps.map(portraitData));
  let b = brand(70, 120);
  b += `<text x="70" y="270" font-family="${serif}" font-size="104" fill="${C.ink}">Qual filósofo</text>`;
  b += `<text x="70" y="370" font-family="${serif}" font-size="104" fill="${C.ink}">pensa como <tspan font-style="italic" fill="${C.accent}">você?</tspan></text>`;
  b += `<text x="70" y="450" font-family="${sans}" font-size="26" fill="${C.muted}">11 eixos · ${DATA.PH.length + DATA.BR.length} pensadores · teste gratuito</text>`;
  // Three arches, each with its own clip path, overlapping slightly.
  ps.forEach((p, i) => { b += archSVG(760 + i * 120, 120 + (i % 2) * 60, 210, 330, imgs[i], p).replace(/id="arch"/, `id="arch${i}"`).replace(/url\(#arch\)/, `url(#arch${i})`); });
  return frame(b);
}

module.exports = { E, inviteInfo, compareInfo, sharePage, inviteSVG, compareSVG, homeSVG, rasterize, cleanName };
