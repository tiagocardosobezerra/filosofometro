// Regenerates og.png, the preview image for the site itself (links without a result).
// Usage: node tests/make-og.js
const fs = require("fs");
const path = require("path");
const P = require("../api/_preview.js");
(async () => {
  fs.writeFileSync(path.join(__dirname, "..", "og.png"), P.rasterize(await P.homeSVG()));
  console.log("og.png written");
})();
