// Calibration and bias audit, run on all three levels (44, 88 and 132 statements) and all three languages.
// It answers three questions with simulated people:
//   1. Is the scale neutral? Agreeing with everything, disagreeing with everything or staying neutral
//      lands exactly in the center, and flipping every answer flips every axis.
//   2. Is there a favoured side, era or thinker? Each pole, each era and each thinker wins about as
//      often as the catalog allows, and every thinker can win at every level.
//   3. Does language change anything? The main ranking is identical in pt, en and es, and every
//      regional list is fair inside its own language.
// Usage: node tests/calibration.js   (exit code 1 if any check fails; writes tests/calibration-report.md)
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const DATA = require(path.join(ROOT, "data.js"));
const Engine = require(path.join(ROOT, "engine.js"));
const I18N = require(path.join(ROOT, "i18n.js"));

const LANGS = { pt: null, en: require(path.join(ROOT, "i18n", "en.js")), es: require(path.join(ROOT, "i18n", "es.js")) };
const ENG = Object.fromEntries(Object.entries(LANGS).map(([l, pack]) => [l, Engine.create(I18N.localize(DATA, null, pack).DATA)]));
const E = ENG.pt, { AXES, PH, LEVELS } = E, QS = DATA.QS;

let seed = 4242;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
// A simulated person: a hidden position on each axis, answered with some noise, on the first n statements.
const answersFor = (lat, n, noise = 1.2) => QS.slice(0, n).map(([, ax, d]) => {
  const x = lat[ax] * d * 1.2 + (rnd() - 0.5) * noise;
  return x > 1.2 ? 0 : x > 0.4 ? 1 : x > -0.4 ? 2 : x > -1.2 ? 3 : 4;
});
const randomLat = () => AXES.map(() => rnd() * 2 - 1);
// Answering exactly like a profile: the answer closest to position × direction on each statement.
const VAL = E.SCALE.map(s => s.value);
const ideal = (v, n) => QS.slice(0, n).map(([, ax, d]) => VAL.reduce((b, x, i) => (Math.abs(x - v[ax] * d * 2) < Math.abs(VAL[b] - v[ax] * d * 2) ? i : b), 0));

const lines = [];
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else fails++; lines.push(`${cond ? "PASS" : "FAIL"} ${msg}`); console.log(`${cond ? "PASS" : "FAIL"} ${msg}`); };
const info = msg => { lines.push(`     ${msg}`); console.log(`     ${msg}`); };
const head = t => { lines.push(`\n## ${t}`); console.log(`\n== ${t}`); };
const pct = x => (x * 100).toFixed(1) + "%";

for (const L of LEVELS) {
  const n = L.n;
  head(`Nível ${L.name} (${n} afirmações)`);

  // 1. Neutral scale.
  const same = c => new Array(n).fill(c);
  const center = [0, 1, 3, 4].every(c => E.axisScores(same(c)).scores.every(x => Math.abs(x) < 1e-12));
  ok(center, `agreeing or disagreeing with everything (any strength) lands exactly at the center on all 11 axes`);
  ok(E.evaluate(same(2)).directionless, `all neutral answers give a profile without direction (no false match)`);
  let mirror = 0;
  for (let k = 0; k < 500; k++) {
    const a = Array.from({ length: n }, () => Math.floor(rnd() * 5)), b = a.map(x => 4 - x);
    const s = E.axisScores(a).scores, m = E.axisScores(b).scores;
    if (s.some((x, i) => Math.abs(x + m[i]) > 1e-12)) mirror++;
  }
  ok(mirror === 0, `flipping every answer flips every axis exactly (500 random answer sets)`);
  const halves = AXES.every((_, ax) => { const qs = QS.slice(0, n).filter(q => q[1] === ax); return qs.filter(q => q[2] > 0).length === qs.filter(q => q[2] < 0).length; });
  ok(halves, `on every axis, half the statements pull to each pole`);

  // 2. Every thinker reachable at this level.
  const missIdeal = PH.filter(p => E.evaluate(ideal(p.v, n)).top.id !== p.id).map(p => p.n);
  ok(missIdeal.length === 0, `every one of the ${PH.length} thinkers wins when answering exactly like them ${missIdeal.join(", ")}`);
  const lowPct = Math.min(...PH.map(p => E.evaluate(ideal(p.v, n)).top.pct));
  ok(lowPct >= 85, `answering exactly like a thinker gives 85% or more (lowest ${lowPct}%)`);

  // 3. Distribution over people spread across every position.
  const M = 6000, wins = {}, eraWins = {}, hit = AXES.map(() => [[0, 0], [0, 0]]);
  let flat = 0;
  for (let k = 0; k < M; k++) {
    const r = E.evaluate(answersFor(randomLat(), n));
    if (r.directionless) { flat++; continue; }
    wins[r.top.id] = (wins[r.top.id] || 0) + 1;
    eraWins[r.top.p.era] = (eraWins[r.top.p.era] || 0) + 1;
    r.scores.forEach((s, ax) => {
      if (Math.abs(s) < 0.5) return;
      const side = s < 0 ? 0 : 1, v = r.top.p.v[ax];
      hit[ax][side][1]++;
      if (Math.abs(v) >= 0.1 && (v < 0 ? 0 : 1) === side) hit[ax][side][0]++;
    });
  }
  const counted = M - flat, shares = PH.map(p => ({ p, s: (wins[p.id] || 0) / counted })).sort((a, b) => b.s - a.s);
  info(`directionless: ${pct(flat / M)} · most frequent: ${shares.slice(0, 3).map(x => `${x.p.n} ${pct(x.s)}`).join(", ")}`);
  ok(flat / M < 0.02, `profiles without direction are rare (${pct(flat / M)} < 2%)`);
  ok(shares.every(x => x.s > 0), `every thinker comes up as a match (${shares.filter(x => x.s > 0).length}/${PH.length})`);
  ok(shares[0].s < 0.06, `no thinker takes more than 6% of results (highest ${pct(shares[0].s)})`);
  const eras = [...new Set(PH.map(p => p.era))];
  const ratio = eras.map(e => ({ e, r: (eraWins[e] || 0) / counted / (PH.filter(p => p.era === e).length / PH.length) }));
  info(`era share of results ÷ share of catalog: ${ratio.map(x => `${x.e} ×${x.r.toFixed(2)}`).join(", ")}`);
  ok(ratio.every(x => x.r > 0.6 && x.r < 1.5), `no era is favoured (each between 0.6× and 1.5× its share)`);
  const poles = AXES.flatMap((a, ax) => [[a.l, hit[ax][0]], [a.r, hit[ax][1]]].map(([nm, [h, t]]) => ({ nm, r: h / t })));
  info(`same-side match for people strongly on a pole, weakest: ${poles.slice().sort((a, b) => a.r - b.r).slice(0, 3).map(x => `${x.nm} ${pct(x.r)}`).join(", ")}`);
  ok(poles.every(x => x.r >= 0.65), `all 22 poles: 65%+ of people strongly on a pole get a match on that side`);
  const sides = AXES.map((_, ax) => hit[ax][0][1] / (hit[ax][0][1] + hit[ax][1][1]));
  ok(sides.every(x => x > 0.4 && x < 0.6), `people land on both poles of every axis in balance (each pole 40% to 60%)`);
}

head("Idiomas");
// The main ranking must not depend on the language: same ids, same order, same distances.
let langDiff = 0;
for (let k = 0; k < 1000; k++) {
  const a = answersFor(randomLat(), LEVELS[k % 3].n);
  const base = ENG.pt.evaluate(a).ranking;
  for (const l of ["en", "es"]) {
    const r = ENG[l].evaluate(a).ranking;
    if (r.some((x, i) => x.id !== base[i].id || Math.abs(x.distance - base[i].distance) > 1e-12)) langDiff++;
  }
}
ok(langDiff === 0, `the main ranking is identical in pt, en and es (1000 answer sets, all levels)`);
for (const [l, El] of Object.entries(ENG)) {
  const pool = El.BRAZIL, seen = {};
  const miss = pool.filter(p => El.evaluate(ideal(p.v, 44)).brazil[0].p.id !== p.id).map(p => p.n);
  ok(miss.length === 0, `${l}: every one of the ${pool.length} regional thinkers wins the regional ranking for their own profile ${miss.join(", ")}`);
  const M = 6000;
  for (let k = 0; k < M; k++) { const id = El.evaluate(answersFor(randomLat(), 44)).brazil[0].p.id; seen[id] = (seen[id] || 0) + 1; }
  const shares = pool.map(p => ({ p, s: (seen[p.id] || 0) / M })).sort((a, b) => b.s - a.s);
  info(`${l}: most frequent regional matches ${shares.slice(0, 3).map(x => `${x.p.n} ${pct(x.s)}`).join(", ")} · least ${shares.slice(-2).map(x => `${x.p.n} ${pct(x.s)}`).join(", ")}`);
  ok(shares.every(x => x.s > 0), `${l}: every regional thinker comes up for someone (${shares.filter(x => x.s > 0).length}/${pool.length})`);
  // A pool of about 25 people cannot cover every region of the map evenly; the Portuguese list, the reference,
  // reaches about 2.5× a fair share. The same limit, 4×, holds every language to one standard.
  ok(shares[0].s < 4 / pool.length, `${l}: no regional thinker takes more than 4× a fair share (highest ${pct(shares[0].s)} = ${(shares[0].s * pool.length).toFixed(1)}×)`);
}

const md = `# Auditoria de calibração e viés\n\nMotor v${E.VERSION} · ${PH.length} pensadores · níveis ${LEVELS.map(l => l.n).join(", ")} · idiomas pt, en, es\n\n**${passes} verificações passaram, ${fails} falharam.**\n${lines.join("\n")}\n`;
fs.writeFileSync(path.join(__dirname, "calibration-report.md"), md);
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
