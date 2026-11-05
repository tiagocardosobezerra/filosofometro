// Regenerates og.png, the preview image for the site itself (links without a result).
// Usage: node tests/make-og.js
const fs = require("fs");
const path = require("path");
const P = require("../api/_preview.js");
(async () => {
  // One image per language: og.png (Portuguese), og-en.png, og-es.png.
  for (const lang of ["pt", "en", "es"]) {
    const file = lang === "pt" ? "og.png" : `og-${lang}.png`;
    fs.writeFileSync(path.join(__dirname, "..", file), P.rasterize(await P.homeSVG(lang)));
    console.log(`${file} written`);
  }
})();
