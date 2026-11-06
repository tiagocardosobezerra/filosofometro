// Builds the language packs i18n/en.js and i18n/es.js from the translation sources in i18n/src/:
// <lang>-ui.json (interface), <lang>-qs.json (statements), <lang>-ph-a.json and <lang>-ph-b.json
// (thinkers), <lang>-regional.json (the regional list). Axes, eras and small fixed words live below.
// Usage: node tests/make-i18n.js   (run again after editing any source file)
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "i18n", "src");
const DATA = require(path.join(ROOT, "data.js"));

const FIXED = {
  en: {
    regionName: "English-speaking world",
    axes: [
      ["knowledge", "Reason", "Experience"], ["will", "Fate", "Freedom"], ["meaning", "Given meaning", "Created meaning"],
      ["ethics", "Duty", "Consequences"], ["social life", "Individual", "Community"], ["happiness", "Pleasure", "Virtue"],
      ["reality", "Matter", "Spirit"], ["truth", "Certainty", "Doubt"], ["change", "Tradition", "Rupture"],
      ["suffering", "Accept", "Resist"], ["power", "Authority", "Autonomy"],
    ],
    eras: { "Antiguidade grega e romana": "Greek and Roman antiquity", "Medieval e Renascimento": "Medieval and Renaissance", "Modernidade": "Modern era", "Contemporâneos": "Contemporary", "Oriente": "Eastern thought" },
    words: { "código de respostas ausente ou inválido": "answer code missing or invalid", "diverge no eixo": "differs on axis", "diverge em": "differs at", "conferem": "match", "auditoria": "audit", "atual": "current", "fator": "factor", "esperado": "expected", " de ": " of " },
  },
  es: {
    regionName: "Iberoamérica",
    axes: [
      ["conocimiento", "Razón", "Experiencia"], ["voluntad", "Destino", "Libertad"], ["sentido", "Sentido dado", "Sentido creado"],
      ["ética", "Deber", "Consecuencia"], ["vida social", "Individuo", "Comunidad"], ["felicidad", "Placer", "Virtud"],
      ["realidad", "Materia", "Espíritu"], ["verdad", "Certeza", "Duda"], ["cambio", "Tradición", "Ruptura"],
      ["sufrimiento", "Aceptar", "Resistir"], ["poder", "Autoridad", "Autonomía"],
    ],
    eras: { "Antiguidade grega e romana": "Antigüedad griega y romana", "Medieval e Renascimento": "Edad Media y Renacimiento", "Modernidade": "Modernidad", "Contemporâneos": "Contemporáneos", "Oriente": "Oriente" },
    words: { "código de respostas ausente ou inválido": "código de respuestas ausente o no válido", "diverge no eixo": "difiere en el eje", "diverge em": "difiere en", "conferem": "coinciden", "auditoria": "auditoría", "atual": "actual", "fator": "factor", "esperado": "esperado" },
  },
};

const read = f => JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8"));
for (const lang of Object.keys(FIXED)) {
  const F = FIXED[lang];
  const ph = { ...read(`${lang}-ph-a.json`), ...read(`${lang}-ph-b.json`) };
  const qs = read(`${lang}-qs.json`);
  const regional = read(`${lang}-regional.json`).map(p => ({ ...p, era: F.regionName }));
  const ui = fs.existsSync(path.join(SRC, `${lang}-ui.json`)) ? read(`${lang}-ui.json`) : {};
  // Statement examples name thinkers in short forms ("Calvin", "Beauvoir"); the app matches them by name.
  // Any name the app cannot match on its own is listed here so its portrait still shows.
  const byName = n => DATA.PH.find(p => ph[p.id].n === n) || DATA.PH.find(p => ph[p.id].n.endsWith(" " + n)) || DATA.PH.find(p => ph[p.id].n.split(" ").includes(n));
  const alias = {};
  for (const q of qs) for (const ex of [q[1], q[2]]) {
    const n = ex.slice(0, ex.indexOf(": "));
    if (byName(n)) continue;
    const pt = DATA.QS[qs.indexOf(q)][ex === q[1] ? 3 : 4];
    const ptName = pt.slice(0, pt.indexOf(": "));
    const hit = { "Espinosa": "spinoza", "Calvino": "joao-calvino", "Lao Tsé": "lao-tse" }[ptName] || (DATA.PH.find(p => p.n === ptName || p.n.endsWith(" " + ptName) || p.n.split(" ").includes(ptName)) || {}).id;
    if (hit) alias[n] = hit; else console.warn(`${lang}: no thinker for "${n}"`);
  }
  // Checks: every thinker and statement translated, no dashes anywhere.
  const miss = DATA.PH.filter(p => !ph[p.id]).map(p => p.id);
  if (miss.length) throw new Error(`${lang}: thinkers without translation: ${miss.join(", ")}`);
  if (qs.length !== DATA.QS.length) throw new Error(`${lang}: ${qs.length} statements, expected ${DATA.QS.length}`);
  // Schools of thought: name, summary, text and ideas for every corrente in correntes.js.
  const correntes = read(`${lang}-correntes.json`);
  const missC = require(path.join(ROOT, "correntes.js")).filter(c => !correntes[c.id]).map(c => c.id);
  if (missC.length) throw new Error(`${lang}: correntes without translation: ${missC.join(", ")}`);
  const pack = { lang, regionName: F.regionName, axes: F.axes.map(([name, l, r]) => ({ name, l, r })), eras: F.eras, words: F.words, alias, ui, qs, ph, regional, correntes };
  const json = JSON.stringify(pack);
  if (/[—–]/.test(json)) console.warn(`${lang}: contains a long dash`);
  fs.mkdirSync(path.join(ROOT, "i18n"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "i18n", `${lang}.js`),
    `// Generated by tests/make-i18n.js from i18n/src/${lang}-*.json. Edit the sources, not this file.\n` +
    `(function(root){\nconst PACK=${JSON.stringify(pack, null, 0).replace(/\},\{"id"/g, '},\n{"id"').replace(/\],\["/g, '],\n["')};\n` +
    `if(typeof module!=="undefined")module.exports=PACK;else root.AgoraLang=PACK;\n})(this);\n`);
  console.log(`${lang}: ${Object.keys(ph).length} thinkers, ${qs.length} statements, ${regional.length} regional, ${Object.keys(ui).length} interface strings, ${Object.keys(alias).length} aliases`);
}
