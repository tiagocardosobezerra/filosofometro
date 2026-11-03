// Test battery for the Filosofômetro engine, verifier and catalog.
// Usage: node tests/engine-test.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.join(__dirname, "..");
const DATA = require(path.join(ROOT, "data.js"));
const Engine = require(path.join(ROOT, "engine.js"));
const Verify = require(path.join(ROOT, "verify.js"));
const E = Engine.create(DATA);
const { AXES, QS, PH } = DATA;
const clone = x => JSON.parse(JSON.stringify(x));

let fails = 0, passes = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); cond ? passes++ : fails++; };
const info = msg => console.log("INFO " + msg);
const section = t => console.log(`\n## ${t}`);

// Seeded RNG so runs are repeatable.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const VAL = E.SCALE.map(s => s.value);
const nearest = w => VAL.reduce((b, v, i) => (Math.abs(v - w) < Math.abs(VAL[b] - w) ? i : b), 0);
const ideal = v => QS.map(([, ax, d]) => nearest(v[ax] * d * 2));
const mild = v => ideal(v).map(i => (i === 0 ? 1 : i === 4 ? 3 : i));
const noisy = v => QS.map(([, ax, d]) => {
  const x = v[ax] * d * 0.8 + (rnd() - 0.5) * 1.6;
  return x > 1.2 ? 0 : x > 0.4 ? 1 : x > -0.4 ? 2 : x > -1.2 ? 3 : 4;
});
const randomAnswers = () => QS.map(() => Math.floor(rnd() * 5));
const randomPh = () => PH[Math.floor(rnd() * PH.length)];
const top = a => E.evaluate(a).top.p;
const meanAbs = v => v.reduce((t, x) => t + Math.abs(x), 0) / v.length;
// Answers that put exactly the given sum (−8..8) on each axis, using the axis' statements in order.
function answersForSums(sums) {
  const a = QS.map(() => 2);
  AXES.forEach((_, ax) => {
    let left = sums[ax];
    QS.forEach(([, x, d], i) => {
      if (x !== ax || left === 0) return;
      const step = Math.max(-2, Math.min(2, left)) * d; // value to give, in agree terms
      a[i] = VAL.indexOf(step); left -= step * d;
    });
  });
  return a;
}

section("Catálogo");
ok(QS.every(([t, ax, d]) => t && ax >= 0 && ax < AXES.length && (d === 1 || d === -1)), "every statement has a valid axis and direction");
AXES.forEach((a, i) => {
  const q = QS.filter(x => x[1] === i), pos = q.filter(x => x[2] === 1).length;
  ok(q.length === 4 && pos === 2, `axis ${a.l}/${a.r}: 4 statements, 2 per direction`);
});
ok(new Set(QS.map(q => q[0])).size === QS.length, "statements are unique");
ok(QS.every(q => typeof q[3] === "string" && q[3].length > 10 && typeof q[4] === "string" && q[4].length > 10 && q[3] !== q[4]), "every statement has an example for each extreme");
ok(PH.every(p => p.v.length === AXES.length && p.v.every(x => x >= -1 && x <= 1 && Math.abs(x * 10 - Math.round(x * 10)) < 1e-9)), "every thinker has 11 positions in [-1,1], in steps of 0.1");
ok(new Set(PH.map(p => p.n)).size === PH.length && new Set(PH.map(p => p.id)).size === PH.length, "names and ids are unique");
ok(PH.every(p => /^[a-z0-9-]+$/.test(p.id)), "ids are plain ASCII, so the id tie-break never depends on locale");
ok(PH.every(p => p.n && p.s && p.q && p.b && p.era && p.img && p.wiki), "every thinker has school, era, quote, book, portrait and source");
let minPair = [9, ""];
for (let i = 0; i < PH.length; i++) for (let j = i + 1; j < PH.length; j++) {
  const d = PH[i].v.reduce((t, x, k) => t + Math.abs(x - PH[j].v[k]), 0) / AXES.length;
  if (d < minPair[0]) minPair = [d, `${PH[i].n} / ${PH[j].n}`];
}
info(`closest pair: ${minPair[1]} (${minPair[0].toFixed(3)})`);
ok(minPair[0] >= 0.1, "no two thinkers are near duplicates (mean distance ≥ 0.10)");
const ci = PH.map(p => meanAbs(p.v)).reduce((t, x) => t + x, 0) / PH.length;
ok(Math.abs(ci - E.catalogIntensity) < 1e-15, `catalog intensity ${E.catalogIntensity.toFixed(6)} matches an independent computation`);
ok(PH.every(p => { const n = E.normalize(p.v); return !n.capped && n.k > 0; }), "no thinker is capped or directionless, so every thinker is compared at full shape");

section("Ordem de apresentação");
ok(E.ORDER.length === QS.length && new Set(E.ORDER).size === QS.length && E.ORDER.every(i => i >= 0 && i < QS.length), "presentation order is a permutation of the 44 statements");
ok(E.ORDER.every((q, k) => QS[q][1] === k % AXES.length), "presentation order is round-robin across the 11 axes");
ok(E.evaluate(randomAnswers()).perQuestion.every(q => E.ORDER[q.shown - 1] === q.i), "each answer reports the position it was shown in");

section("Cálculo dos eixos");
let mism = 0;
for (let k = 0; k < 3000; k++) {
  const a = randomAnswers();
  const ref = AXES.map((_, ax) => {
    const idx = QS.map((q, i) => i).filter(i => QS[i][1] === ax);
    return idx.reduce((t, i) => t + [2, 1, 0, -1, -2][a[i]] * QS[i][2], 0) / (2 * idx.length);
  });
  if (E.axisScores(a).scores.some((x, i) => Math.abs(x - ref[i]) > 1e-12)) mism++;
}
ok(mism === 0, "axis scores equal an independent reference on 3000 random answer sets");
ok([0, 2, 4].every(c => E.axisScores(QS.map(() => c)).scores.every(x => x === 0)), "agree-all, neutral-all and disagree-all land on the exact center");
AXES.forEach((a, ax) => {
  const sums = AXES.map(() => 0); sums[ax] = 8; const r = E.axisScores(answersForSums(sums)).scores;
  sums[ax] = -8; const l = E.axisScores(answersForSums(sums)).scores;
  ok(r[ax] === 1 && l[ax] === -1 && r.every((x, i) => i === ax || x === 0), `axis ${a.l}/${a.r} reaches both ends without moving the others`);
});

section("Normalização");
let normBad = 0;
for (let k = 0; k < 3000; k++) {
  const u = E.axisScores(randomAnswers()).scores, n = E.normalize(u), m = meanAbs(u);
  if (m < E.PARAMS.minIntensity) { if (n.k !== 0 || n.v.some(x => x !== 0)) normBad++; continue; }
  const want = Math.min(E.PARAMS.maxGain, E.catalogIntensity / m);
  if (n.k !== want || n.capped !== (E.catalogIntensity / m > E.PARAMS.maxGain) || n.v.some((x, i) => x !== u[i] * want)) normBad++;
}
ok(normBad === 0, "normalization uses one factor = min(maxGain, catalog ÷ intensity), and flags the cap");
{
  const sums = AXES.map(() => 0); sums[0] = 5; // one mildly answered axis: 5/8 → intensity 0.057
  const r = E.evaluate(answersForSums(sums));
  ok(r.user.capped && r.user.k === E.PARAMS.maxGain && Math.max(...r.user.v.map(Math.abs)) <= E.PARAMS.maxGain, `one mild axis is capped at ${E.PARAMS.maxGain}x instead of being blown up (factor ${r.user.k})`);
}

section("Perfil sem direção");
{
  const sums = AXES.map((_, i) => (i === 0 ? 4 : 0)); // 4/8 on one axis → intensity 0.045 < 0.05
  const a = answersForSums(sums), r = E.evaluate(a);
  ok(r.directionless && r.user.k === 0, "a profile below the minimum intensity is marked directionless");
  ok(r.ranking.every(x => x.pct === null) && r.opposite === null, "a directionless profile gets no percentages and no opposite");
  ok(r.ranking.every((x, i) => i === 0 || r.ranking[i - 1].rawDistance <= x.rawDistance + 1e-9), "a directionless profile is ranked by raw distance");
  const flat = E.evaluate(QS.map(() => 2));
  ok(flat.directionless && flat.ranking[0].rawDistance === Math.min(...flat.ranking.map(x => x.rawDistance)), "all-neutral answers rank the most central thinker first");
}

section("Empates");
let tieRuns = 0, firstPlaceTies = 0, tieBad = 0;
for (let k = 0; k < 4000; k++) {
  const r = E.evaluate(randomAnswers()), rows = r.ranking;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    const tiedD = Math.abs(a.distance - b.distance) <= E.PARAMS.eps;
    if (!tiedD) continue;
    tieRuns++; if (i === 1) firstPlaceTies++;
    const tiedR = Math.abs(a.rawDistance - b.rawDistance) <= E.PARAMS.eps;
    if (!b.tiedWithPrev || !a.tiedWithNext) tieBad++;
    if (!tiedR && a.rawDistance > b.rawDistance) tieBad++;
    if (tiedR && !(a.p.id < b.p.id)) tieBad++;
  }
}
info(`ties seen: ${tieRuns} adjacent pairs, ${firstPlaceTies} on first place`);
ok(tieRuns > 0 && tieBad === 0, "every tie is flagged and broken by raw distance, then id, exactly as documented");
{
  const before = E.evaluate(randomAnswers());
  const renamed = clone(DATA); renamed.PH.forEach(p => { p.n = "Z " + p.n; });
  const after = Engine.create(renamed).evaluate(before.answers);
  ok(after.ranking.every((x, i) => x.p.id === before.ranking[i].p.id), "renaming thinkers never reorders the ranking (tie-break uses ids, not names)");
}

section("Trilha de auditoria");
let traceBad = 0;
for (let k = 0; k < 500; k++) {
  const r = E.evaluate(noisy(randomPh().v));
  const sums = AXES.map((_, ax) => r.perQuestion.filter(q => q.axis === ax).reduce((t, q) => t + q.contribution, 0));
  const axisOk = r.perAxis.every((a, i) => a.sum === sums[i] && a.score === a.sum / a.max);
  const distOk = r.ranking.every(x => x.distance === x.perAxis.reduce((t, a) => t + a.diff, 0) / AXES.length);
  const pctOk = r.ranking.every(x => x.pct === Math.max(1, Math.min(100, Math.round(100 * Math.exp(-((x.distance / E.PARAMS.tau) ** 2))))));
  const kOk = r.ranking.every(x => x.perAxis.every((a, i) => a.user === r.scores[i] * x.k && a.thinker === a.thinkerRaw * x.thinkerK));
  const rankOk = r.ranking.every((x, i) => x.rank === i + 1);
  if (!(axisOk && distOk && pctOk && kOk && rankOk && r.top === r.ranking[0] && r.opposite === r.ranking.at(-1))) traceBad++;
}
ok(traceBad === 0, "trace is self-consistent: sums, scores, factors, distances, percents and ranks recompute exactly (500 results)");
const a0 = noisy(PH[3].v);
ok(JSON.stringify(E.auditJSON(E.evaluate(a0))) === JSON.stringify(E.auditJSON(E.evaluate(a0.slice()))), "same answers give byte-identical audits (deterministic)");

section("Auditoria basta sozinha");
// Recompute the ranking using ONLY the audit file: no catalog, no engine.
function fromAuditOnly(j) {
  const P = j.engine.params, ci = j.engine.catalogIntensity;
  const vals = Object.fromEntries(j.scale.map(s => [s.code, s.value]));
  const sums = {}, counts = {};
  j.answers.items.forEach(it => { sums[it.axis] = (sums[it.axis] || 0) + vals[it.answer] * it.direction; counts[it.axis] = (counts[it.axis] || 0) + 1; });
  const pos = j.axes.map(a => sums[a.id] / (2 * counts[a.id]));
  const shape = v => { const m = meanAbs(v); if (m < P.minIntensity) return v.map(() => 0); const f = Math.min(P.maxGain, ci / m); return v.map(x => x * f); };
  const u = shape(pos), flat = meanAbs(pos) < P.minIntensity;
  const rows = j.ranking.map(t => {
    const s = shape(t.positions);
    const d = s.reduce((acc, x, i) => acc + Math.abs(x - u[i]), 0) / pos.length;
    const raw = t.positions.reduce((acc, x, i) => acc + Math.abs(x - pos[i]), 0) / pos.length;
    return { id: t.id, d, raw, pct: flat ? null : Math.max(1, Math.min(100, Math.round(100 * Math.exp(-((d / P.tau) ** 2))))) };
  });
  const same = (a, b) => Math.abs(a - b) <= P.eps;
  rows.sort((a, b) => (same(a.d, b.d) ? 0 : a.d - b.d) || (same(a.raw, b.raw) ? 0 : a.raw - b.raw) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return rows;
}
let auditOnlyBad = 0;
for (let k = 0; k < 400; k++) {
  const j = JSON.parse(JSON.stringify(E.auditJSON(E.evaluate(k % 2 ? randomAnswers() : noisy(randomPh().v)))));
  const rows = fromAuditOnly(j);
  if (rows.some((x, i) => x.id !== j.ranking[i].id || x.pct !== j.ranking[i].percent || x.d !== j.ranking[i].distance || x.raw !== j.ranking[i].rawDistance)) auditOnlyBad++;
}
ok(auditOnlyBad === 0, "the audit file alone (after JSON round-trip) recomputes the exact ranking, distances and percents (400 results)");
ok(E.auditJSON(E.evaluate(a0)).answers.code === E.encode(a0) && E.auditJSON(E.evaluate(a0)).answers.shownOrder.join() === E.ORDER.join(), "the audit carries the answer code and the order shown");

section("Verificador independente");
const current = { catalog: E.fingerprint(), code: E.codeFingerprint() };
let verifyBad = 0, verifyN = 0;
const gens = [randomAnswers, () => noisy(randomPh().v), () => ideal(randomPh().v), () => mild(randomPh().v)];
for (let k = 0; k < 3000; k++) {
  const a = gens[k % gens.length]();
  const checks = Verify.checkAudit(DATA, JSON.parse(JSON.stringify(E.auditJSON(E.evaluate(a)))), current);
  verifyN++; if (!checks.every(c => c.ok)) verifyBad++;
}
ok(verifyBad === 0, `engine and independent verifier agree on every number, ties included (${verifyN} results)`);
{
  const sums = AXES.map(() => 0); sums[0] = 4;
  ok(Verify.checkAudit(DATA, E.auditJSON(E.evaluate(answersForSums(sums))), current).every(c => c.ok), "they also agree on a directionless profile");
}
// Tampering: every edited field must be caught.
const good = E.auditJSON(E.evaluate(noisy(PH[20].v)));
const tamper = (label, fn) => { const j = clone(good); fn(j); ok(Verify.checkAudit(DATA, j, current).some(c => !c.ok), `tampering is caught: ${label}`); };
tamper("percent", j => { j.ranking[0].percent += 1; });
tamper("distance", j => { j.ranking[5].distance += 1e-6; });
tamper("raw distance", j => { j.ranking[7].rawDistance += 1e-6; });
tamper("thinker factor", j => { j.ranking[3].factor *= 1.01; });
tamper("thinker normalized value", j => { j.ranking[2].normalized[4] += 0.01; });
tamper("per-axis difference", j => { j.ranking[9].diffs[1] += 0.01; });
tamper("ranking order", j => { [j.ranking[0], j.ranking[1]] = [j.ranking[1], j.ranking[0]]; });
tamper("axis score", j => { j.axes[6].score += 0.125; });
tamper("user factor", j => { j.user.factor += 0.1; });
tamper("answer contribution", j => { j.answers.items[10].contribution *= -1; });
tamper("constant τ", j => { j.engine.params.tau = 0.8; });
tamper("catalog fingerprint", j => { j.engine.catalog = "00000000"; });
tamper("engine fingerprint", j => { j.engine.code = "00000000"; });
tamper("answer code", j => { j.answers.code = j.answers.code.slice(0, -1) + ((+j.answers.code.at(-1) + 1) % 5); });

section("Impressões digitais");
ok(/^[0-9a-f]{8}$/.test(E.fingerprint()) && E.fingerprint() === Engine.fingerprint(DATA), "catalog fingerprint is stable");
ok(Engine.fnv(JSON.stringify(E.fingerprintInput())) === E.fingerprint(), "catalog fingerprint is FNV-1a of exactly the exported fingerprintInput");
const changed = (label, fn) => { const d = clone(DATA); fn(d); ok(Engine.fingerprint(d) !== E.fingerprint(), `catalog fingerprint changes when ${label}`); };
changed("one position changes", d => { d.PH[0].v[0] = d.PH[0].v[0] === 1 ? 0.9 : d.PH[0].v[0] + 0.1; });
changed("a thinker is renamed", d => { d.PH[5].n += " "; });
changed("a statement direction flips", d => { d.QS[3][2] *= -1; });
ok(E.evaluate(a0).code === Engine.codeFingerprint() && E.auditJSON(E.evaluate(a0)).engine.code === Engine.codeFingerprint(), "engine code fingerprint is in every result and audit");
{
  // Load the engine from source with CRLF and with a one-character change to a helper.
  const src = fs.readFileSync(path.join(ROOT, "engine.js"), "utf8").replace(/\r\n/g, "\n");
  const load = s => { const m = { exports: {} }; vm.runInNewContext(s, { module: m }); return m.exports; };
  ok(load(src.replace(/\n/g, "\r\n")).codeFingerprint() === Engine.codeFingerprint(), "engine code fingerprint ignores line endings (CRLF = LF)");
  const mutated = src.replace("Math.round(100*Math.exp", "Math.floor(100*Math.exp");
  ok(mutated !== src && load(mutated).codeFingerprint() !== Engine.codeFingerprint(), "engine code fingerprint changes when a helper outside create() changes");
  const epsChanged = src.replace("eps:1e-9", "eps:1e-3");
  ok(epsChanged !== src && load(epsChanged).codeFingerprint() !== Engine.codeFingerprint(), "engine code fingerprint changes when a constant changes");
}

section("Cada pensador é alcançável");
const missFull = PH.filter(p => top(ideal(p.v)).id !== p.id).map(p => p.n);
ok(missFull.length === 0, `every thinker wins their own profile ${missFull.join(", ")}`);
const rankMild = p => E.evaluate(mild(p.v)).ranking.findIndex(x => x.id === p.id);
const out3 = PH.filter(p => rankMild(p) >= 3).map(p => `${p.n} #${rankMild(p) + 1}`);
info(`answered without "totalmente": ${PH.length - out3.length}/${PH.length} in top 3 ${out3.join(", ")}`);
ok(out3.length <= 2 && PH.every(p => rankMild(p) < 5), `answered without "totalmente": every thinker top 5, at most 2 outside top 3`);

section("Robustez");
let same = 0, inTop3 = 0, N = 3000;
for (let k = 0; k < N; k++) {
  const a = noisy(randomPh().v), b = a.slice();
  for (let j = 0; j < 2; j++) { const i = Math.floor(rnd() * b.length); b[i] = Math.max(0, Math.min(4, b[i] + (rnd() < 0.5 ? -1 : 1))); }
  const t1 = top(a).id, r2 = E.evaluate(b).ranking;
  if (r2[0].id === t1) same++;
  if (r2.slice(0, 3).some(x => x.id === t1)) inTop3++;
}
info(`2 small answer changes: same match ${(same / N * 100).toFixed(1)}%, still top 3 ${(inTop3 / N * 100).toFixed(1)}%`);
ok(inTop3 / N > 0.95, "result is stable to small answer changes (top 3 > 95%)");
let rec1 = 0, rec5 = 0;
for (let k = 0; k < N; k++) {
  const p = randomPh(), r = E.evaluate(noisy(p.v)).ranking;
  if (r[0].id === p.id) rec1++;
  if (r.slice(0, 5).some(x => x.id === p.id)) rec5++;
}
info(`noisy answerer modeled on a thinker: top 1 ${(rec1 / N * 100).toFixed(1)}%, top 5 ${(rec5 / N * 100).toFixed(1)}%`);
ok(rec5 / N > 0.93, "noisy answerer finds the source thinker in top 5 (> 93%)");
AXES.forEach((a, ax) => {
  let changedTop = 0;
  for (let k = 0; k < 800; k++) {
    const ans = noisy(randomPh().v), neutral = ans.map((x, i) => (QS[i][1] === ax ? 2 : x));
    if (top(ans).id !== top(neutral).id) changedTop++;
  }
  ok(changedTop / 800 > 0.08, `axis ${a.l}/${a.r} matters: changes the match for ${(changedTop / 8).toFixed(1)}% of users`);
});

section("Percentuais");
const med = xs => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const tops = [], opps = [], seconds = [];
for (let k = 0; k < 2000; k++) { const r = E.evaluate(noisy(randomPh().v)); if (r.directionless) continue; tops.push(r.top.pct); seconds.push(r.ranking[1].pct); opps.push(r.opposite.pct); }
info(`median percent: match ${med(tops)}, runner-up ${med(seconds)}, opposite ${med(opps)}`);
const idealPcts = PH.map(p => E.evaluate(ideal(p.v)).top.pct);
info(`ideal answerers: lowest match percent ${Math.min(...idealPcts)}`);
ok(Math.min(...idealPcts) >= 85, "answering exactly like a thinker gives 85% or more");
ok(med(tops) >= 65 && med(opps) <= 35, "typical match reads high (median ≥ 65%) and typical opposite reads low (≤ 35%)");

section("Distribuição");
const dist = gen => { const w = {}; for (let k = 0; k < 6000; k++) { const n = top(gen()).n; w[n] = (w[n] || 0) + 1; } return Object.entries(w).sort((a, b) => b[1] - a[1]); };
const dReal = dist(() => noisy(randomPh().v));
info(`realistic users: ${dReal.length} distinct, top ${dReal.slice(0, 3).map(([n, c]) => `${n} ${(c / 60).toFixed(1)}%`).join(", ")}`);
ok(dReal.length === PH.length, "every thinker comes up for realistic users");
ok(dReal[0][1] / 6000 < 0.05, "no thinker takes more than 5% of realistic users");
const dSpread = dist(() => noisy(AXES.map(() => rnd() * 2 - 1)));
info(`users spread over all positions: ${dSpread.length} distinct, top ${dSpread.slice(0, 3).map(([n, c]) => `${n} ${(c / 60).toFixed(1)}%`).join(", ")}`);
ok(dSpread[0][1] / 6000 < 0.08, "no thinker takes more than 8% of users spread over all positions");
AXES.forEach((a, ax) => {
  [-1, 1].forEach(sign => {
    const got = new Set();
    for (let k = 0; k < 800; k++) got.add(top(noisy(AXES.map((_, i) => (i === ax ? 0.9 * sign : rnd() * 2 - 1)))).id);
    ok(got.size >= 12, `pole ${sign < 0 ? a.l : a.r}: ${got.size} distinct matches for users strongly on it (12+)`);
  });
});

section("Aviso de confiabilidade");
ok([0, 1, 2, 3, 4].every(c => E.evaluate(QS.map(() => c)).note?.code === "repeat"), "note fires when one option is used for everything");
{
  // Boundary: 36 of 44 identical answers is 81.8% (note), 35 of 44 is 79.5% (no repeat note).
  const mk = n => { const a = ideal(PH[30].v).map(x => (x === 1 ? 0 : x)); let c = a.filter(x => x === 1).length; for (let i = 0; i < a.length && c < n; i++) if (a[i] !== 1) { a[i] = 1; c++; } for (let i = 0; i < a.length && c > n; i++) if (a[i] === 1) { a[i] = 0; c--; } return a; };
  ok(E.evaluate(mk(36)).note?.code === "repeat" && E.evaluate(mk(35)).note?.code !== "repeat", "repeat note starts exactly at 36 of 44 identical answers");
  // Center boundary: total |sum| 13/88 = 0.1477 (note) vs 14/88 = 0.1591 (no center note).
  // Mixed contributions per axis keep any single option well under the repeat threshold.
  const PATTERN = { 1: [2, -1, 1, -1], 2: [2, -1, 2, -1] };
  const mixed = sums => { const a = QS.map(() => 2), seen = AXES.map(() => 0);
    QS.forEach(([, ax, d], i) => { a[i] = VAL.indexOf(PATTERN[sums[ax]][seen[ax]++] * d); }); return a; };
  const s1 = AXES.map((_, i) => (i < 2 ? 2 : 1)), s2 = AXES.map((_, i) => (i < 3 ? 2 : 1));
  const r1 = E.evaluate(mixed(s1)), r2 = E.evaluate(mixed(s2));
  info(`center boundary: intensity ${r1.user.intensity.toFixed(4)} → ${r1.note?.code}, ${r2.user.intensity.toFixed(4)} → ${r2.note?.code || "none"}`);
  ok(r1.user.intensity < E.PARAMS.centerWarning && r1.note?.code === "center" && r2.user.intensity >= E.PARAMS.centerWarning && r2.note === null, `center note follows the ${E.PARAMS.centerWarning} threshold exactly`);
}
let flagged = 0;
for (let k = 0; k < 3000; k++) if (E.evaluate(noisy(randomPh().v)).note) flagged++;
info(`note shown to ${(flagged / 30).toFixed(1)}% of realistic answerers`);
ok(flagged / 3000 < 0.05, "note stays quiet for realistic answerers (< 5%)");

section("Links");
const a1 = noisy(PH[10].v);
ok(E.decode(E.encode(a1)).join() === a1.join(), "encode/decode round-trips");
ok([E.decode("0".repeat(QS.length - 1)), E.decode("0".repeat(QS.length + 1)), E.decode("5".repeat(QS.length)), E.decode("0".repeat(QS.length) + "\n"), E.decode("x"), E.decode(null)].every(x => x === null), "malformed codes are rejected: 43 and 45 digits, digit 5, trailing newline, junk, null");
let threw = false; try { E.evaluate([1, 2, 3]); } catch (e) { threw = true; }
ok(threw, "evaluate refuses invalid answer arrays");

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
