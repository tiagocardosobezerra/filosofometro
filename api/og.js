// GET /api/og?code=<answers>[&name=] or /api/og?a=<answers>&b=<answers>[&na=&nb=]: the 1200 × 630 preview image.
const P = require("./_preview.js");

module.exports = async (req, res) => {
  const q = req.query || {};
  const info = q.a ? P.compareInfo(q.a, q.b, q.na, q.nb) : P.inviteInfo(q.code, q.name);
  if (!info) { res.statusCode = 400; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.end("Link inválido"); return; }
  const svg = info.kind === "compare" ? await P.compareSVG(info) : await P.inviteSVG(info);
  const png = P.rasterize(svg);
  res.setHeader("Content-Type", "image/png");
  // The same answers always give the same image for a given catalog, so it can be cached for a long time.
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=31536000, immutable");
  res.end(png);
};
