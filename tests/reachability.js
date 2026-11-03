// Reachability audit: proves every thinker (and so every school) can be the result
// of a real set of 44 answers, and measures how large each thinker's region is.
// Usage: node tests/reachability.js   (writes tests/reachability-report.md)
const fs = require("fs");
const path = require("path");
const DATA = require(path.join(__dirname, "..", "data.js"));
const Engine = require(path.join(__dirname, "..", "engine.js"));
const E = Engine.create(DATA);
const { AXES, QS, PH } = DATA;

let seed = 2026;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const VAL = E.SCALE.map(s => s.value);
const nearest = w => VAL.reduce((b, v, i) => (Math.abs(v - w) < Math.abs(VAL[b] - w) ? i : b), 0);
const ideal = v => QS.map(([, ax, d]) => nearest(v[ax] * d * 2));
const winner = a => E.evaluate(a).top.id;
const margin = (a, id) => {
  const r = E.evaluate(a).ranking;
  const me = r.find(x => x.id === id), best = r.find(x => x.id !== id);
  return best.distance - me.distance; // > 0 means the thinker wins by that much
};

// 1. Search: start from random answers and greedily change one answer at a time
// toward the target. Independent of how the ideal profile is built.
function search(id, restarts = 30, maxSteps = 300) {
  for (let s = 0; s < restarts; s++) {
    let a = QS.map(() => Math.floor(rnd() * 5)), m = margin(a, id);
    for (let step = 0; step < maxSteps; step++) {
      if (m > 0) return { found: true, steps: step, restarts: s, answers: a };
      let best = null;
      for (let i = 0; i < a.length; i++) for (let c = 0; c < 5; c++) {
        if (c === a[i]) continue;
        const b = a.slice(); b[i] = c;
        const mb = margin(b, id);
        if (!best || mb > best.m) best = { a: b, m: mb };
      }
      if (best.m <= m) break;
      a = best.a; m = best.m;
    }
  }
  return { found: false };
}

// 2. Robustness: answer like the thinker, but each answer slips one step with probability 30%.
function robustness(p, n = 400) {
  const base = ideal(p.v);
  let wins = 0, top3 = 0;
  for (let k = 0; k < n; k++) {
    const a = base.map(x => (rnd() < 0.3 ? Math.max(0, Math.min(4, x + (rnd() < 0.5 ? -1 : 1))) : x));
    const r = E.evaluate(a).ranking;
    if (r[0].id === p.id) wins++;
    if (r.slice(0, 3).some(x => x.id === p.id)) top3++;
  }
  return { win: wins / n, top3: top3 / n };
}

// 3. Region size: people spread evenly over every possible position on the 11 axes.
const N = 60000, basin = Object.fromEntries(PH.map(p => [p.id, 0]));
for (let k = 0; k < N; k++) {
  const v = AXES.map(() => rnd() * 2 - 1);
  const a = QS.map(([, ax, d]) => { const x = v[ax] * d * 2 + (rnd() - 0.5); return nearest(x); });
  basin[winner(a)]++;
}

const rows = [];
let allIdeal = true, allSearch = true;
for (const p of PH) {
  const idealWins = winner(ideal(p.v)) === p.id;
  const idealMargin = margin(ideal(p.v), p.id);
  const s = search(p.id);
  const rob = robustness(p);
  allIdeal = allIdeal && idealWins; allSearch = allSearch && s.found;
  rows.push({ p, idealWins, idealMargin, s, rob, share: basin[p.id] / N });
  process.stdout.write(".");
}
console.log();

const schools = {};
rows.forEach(r => { (schools[r.p.s] = schools[r.p.s] || []).push(r); });
const pct = x => (x * 100).toFixed(1) + "%";
const sorted = rows.slice().sort((a, b) => a.share - b.share);

let md = `# Auditoria de alcance do motor\n\n`;
md += `Motor v${E.VERSION} · catálogo \`${E.fingerprint()}\` · ${PH.length} pensadores · ${Object.keys(schools).length} correntes\n\n`;
md += `## Resultado\n\n`;
md += `- **Perfil exato:** ${rows.filter(r => r.idealWins).length}/${PH.length} pensadores vencem quando alguém responde exatamente como eles.\n`;
md += `- **Busca independente:** ${rows.filter(r => r.s.found).length}/${PH.length} pensadores foram alcançados por uma busca que parte de respostas aleatórias e muda uma resposta por vez.\n`;
md += `- **Correntes:** ${Object.values(schools).filter(rs => rs.some(r => r.idealWins && r.s.found)).length}/${Object.keys(schools).length} correntes são alcançáveis.\n`;
md += `- **Região:** com ${N.toLocaleString("pt-BR")} pessoas espalhadas por todas as posições possíveis, ${rows.filter(r => r.share > 0).length}/${PH.length} pensadores aparecem. Menor região: ${sorted[0].p.n} (${pct(sorted[0].share)}). Maior: ${sorted.at(-1).p.n} (${pct(sorted.at(-1).share)}).\n`;
md += `- **Robustez:** respondendo como o pensador, mas com 30% das respostas desviadas em um passo, a mediana é ${pct(rows.map(r => r.rob.win).sort((a, b) => a - b)[Math.floor(rows.length / 2)])} de vitória e ${pct(rows.map(r => r.rob.top3).sort((a, b) => a - b)[Math.floor(rows.length / 2)])} de top 3.\n\n`;
md += `## Por pensador\n\n| Pensador | Corrente | Perfil exato | Folga | Busca | Robustez (vence / top 3) | Região |\n|---|---|---|--:|---|--:|--:|\n`;
for (const r of rows) {
  md += `| ${r.p.n} | ${r.p.s} | ${r.idealWins ? "vence" : "**não vence**"} | ${r.idealMargin.toFixed(3)} | ${r.s.found ? `achado em ${r.s.steps} passos` : "**não achado**"} | ${pct(r.rob.win)} / ${pct(r.rob.top3)} | ${pct(r.share)} |\n`;
}
md += `\n**Folga:** quanto o pensador ganha do segundo colocado no próprio perfil (distância média). Quanto maior, mais nítido.\n\n`;
md += `**Região:** fatia das pessoas simuladas que recebem esse pensador como resultado.\n`;
fs.writeFileSync(path.join(__dirname, "reachability-report.md"), md);

console.log(`ideal ${rows.filter(r => r.idealWins).length}/${PH.length} · search ${rows.filter(r => r.s.found).length}/${PH.length} · present in region ${rows.filter(r => r.share > 0).length}/${PH.length}`);
console.log(`smallest regions: ${sorted.slice(0, 6).map(r => `${r.p.n} ${pct(r.share)}`).join(", ")}`);
console.log(`largest regions: ${sorted.slice(-4).map(r => `${r.p.n} ${pct(r.share)}`).join(", ")}`);
console.log(`least robust: ${rows.slice().sort((a, b) => a.rob.win - b.rob.win).slice(0, 6).map(r => `${r.p.n} ${pct(r.rob.win)}/${pct(r.rob.top3)}`).join(", ")}`);
console.log(`smallest margins: ${rows.slice().sort((a, b) => a.idealMargin - b.idealMargin).slice(0, 5).map(r => `${r.p.n} ${r.idealMargin.toFixed(3)}`).join(", ")}`);
process.exit(allIdeal && allSearch ? 0 : 1);
