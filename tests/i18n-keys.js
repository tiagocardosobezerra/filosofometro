// Lists every interface string marked L`...` in app.js (with ${} slots numbered {0}, {1}...), the
// engine strings translated with t(), and checks each language pack for missing or extra keys.
// Usage: node tests/i18n-keys.js            report missing keys per language
//        node tests/i18n-keys.js --json     print all keys as JSON (input for translators)
//        node tests/i18n-keys.js --loose    also list Portuguese-looking text outside L`...`
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

// Walks a JS source and returns the raw text of every template literal tagged with L.
// Handles nested templates inside ${}, strings and comments well enough for app.js.
function scan(src) {
  const keys = [], loose = [];
  let i = 0;
  function template(tagged) {
    // i is just past the opening backtick
    const parts = [""]; let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "\\") { parts[parts.length - 1] += src.slice(i, i + 2); i += 2; continue; }
      if (c === "`") { i++; break; }
      if (c === "$" && src[i + 1] === "{") { i += 2; code("}"); parts.push(""); continue; }
      parts[parts.length - 1] += c; i++;
    }
    const key = parts.map((p, n) => (n ? `{${n - 1}}` : "") + p).join("");
    if (tagged) keys.push(key);
    else parts.forEach(p => { if (/[ãõçéêáíóúâ]|\b(você|para|não|com|pensador|eixo)\b/i.test(p.replace(/<[^>]*>/g, ""))) loose.push(p.trim().slice(0, 90)); });
  }
  function str(q) {
    let s = ""; i++;
    while (i < src.length && src[i] !== q) { if (src[i] === "\\") { s += src.slice(i, i + 2); i += 2; continue; } s += src[i++]; }
    i++;
    if (/[ãõçéêáíóúâ]|\b(você|para|não|com)\b/i.test(s) && !/^[\w\-./#:]*$/.test(s)) loose.push(s.slice(0, 90));
  }
  function code(end) {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (end && depth === 0 && c === end) { i++; return; }
      if (c === "{" ) depth++;
      else if (c === "}") depth--;
      if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2) + 2; continue; }
      if (c === '"' || c === "'") { str(c); continue; }
      if (c === "`") { const tagged = /(^|[^\w$.])L\s*$/.test(src.slice(Math.max(0, i - 3), i)); i++; template(tagged); continue; }
      // Regex literals that contain quotes or backticks are rare in app.js; skip the ones after ( , = : [ ! & | ? ;
      if (c === "/" && /[(,=:[!&|?;]\s*$/.test(src.slice(Math.max(0, i - 3), i))) {
        i++; let cls = false;
        while (i < src.length) { const d = src[i]; if (d === "\\") { i += 2; continue; } if (d === "[") cls = true; else if (d === "]") cls = false; else if (d === "/" && !cls) { i++; break; } i++; }
        continue;
      }
      i++;
    }
  }
  code(null);
  return { keys: [...new Set(keys)], loose: [...new Set(loose)] };
}

// Strings that come from data or the engine and are looked up with t().
function engineKeys() {
  const E = require(path.join(ROOT, "engine.js")).create(require(path.join(ROOT, "data.js")));
  return [...E.SCALE.map(s => s.label), ...E.LEVELS.map(l => l.name), E.TIE_BREAK, E.PERCENT_RULE, E.HASH_RULE,
    "Você escolheu quase sempre a mesma opção. O resultado pode não refletir bem o que você pensa.",
    "Suas respostas ficaram muito no centro. O resultado é uma aproximação: refaça escolhendo um lado quando tiver opinião."];
}
function verifyLabels() {
  const src = fs.readFileSync(path.join(ROOT, "verify.js"), "utf8");
  return [...new Set([...src.matchAll(/add\([^,]+,"([^"]+)"/g)].map(m => m[1]))];
}

const { keys, loose } = scan(fs.readFileSync(path.join(ROOT, "app.js"), "utf8"));
const all = [...new Set([...keys, ...engineKeys(), ...verifyLabels()])];
if (process.argv.includes("--json")) { console.log(JSON.stringify(all, null, 1)); return; }
console.log(`${keys.length} L\`\` keys in app.js, ${all.length} with engine and verifier strings`);
for (const lang of ["en", "es"]) {
  const f = path.join(ROOT, "i18n", `${lang}.js`);
  if (!fs.existsSync(f)) { console.log(`${lang}: no pack yet`); continue; }
  global.window = {}; delete require.cache[require.resolve(f)];
  const pack = require(f);
  const ui = pack.ui || {};
  const miss = all.filter(k => !(k in ui)), extra = Object.keys(ui).filter(k => !all.includes(k));
  const slots = all.filter(k => k in ui && (k.match(/\{\d+\}/g) || []).sort().join() !== (ui[k].match(/\{\d+\}/g) || []).sort().join());
  console.log(`${lang}: ${miss.length} missing, ${extra.length} unused, ${slots.length} with different slots`);
  miss.slice(0, 40).forEach(k => console.log("  missing:", k.slice(0, 100)));
  slots.forEach(k => console.log("  slots:", k.slice(0, 100)));
}
if (process.argv.includes("--loose")) { console.log("\nPortuguese-looking text outside L``:"); loose.forEach(s => console.log("  " + s)); }
