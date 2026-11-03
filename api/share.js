// /s/<code>[/<name>] and /c/<a>/<b>[/<nameA>/<nameB>] (rewritten here by vercel.json): a page whose metadata
// gives chat apps a title and a picture of the result, and which sends people straight to the app.
const P = require("./_preview.js");

module.exports = (req, res) => {
  const q = req.query || {};
  const info = q.a ? P.compareInfo(q.a, q.b, q.na, q.nb) : P.inviteInfo(q.code, q.name);
  const proto = req.headers["x-forwarded-proto"] || "https", host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;
  if (!info) { res.statusCode = 302; res.setHeader("Location", `${origin}/`); res.end(); return; }
  const v = P.E.fingerprint();
  const params = new URLSearchParams(info.kind === "compare"
    ? { a: q.a, b: q.b, ...(info.nA ? { na: info.nA } : {}), ...(info.nB ? { nb: info.nB } : {}), v }
    : { code: q.code, ...(info.name ? { name: info.name } : {}), v });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=31536000");
  res.end(P.sharePage(info, origin, params.toString()));
};
