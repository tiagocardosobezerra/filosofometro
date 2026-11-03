// Downloads every cover listed in covers.js into covers/<id>.jpg, so the site serves them itself:
// Open Library takes seconds per image, which left empty frames while the page loaded.
// Usage: node tests/fetch-covers.js   (after tests/make-covers.js; skips files already present)
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const COVERS = require(path.join(ROOT, "covers.js"));
const dir = path.join(ROOT, "covers");
fs.mkdirSync(dir, { recursive: true });

const ids = [...new Set(Object.values(COVERS).flat().filter(Boolean))];
(async () => {
  let got = 0, failed = [];
  for (const id of ids) {
    const file = path.join(dir, `${id}.jpg`);
    if (fs.existsSync(file)) { got++; continue; }
    try {
      const res = await fetch(`https://covers.openlibrary.org/b/id/${id}-M.jpg`, { headers: { "User-Agent": "Filosofometro/1.0 (book covers)" } });
      const buf = Buffer.from(await res.arrayBuffer());
      // Open Library answers a missing cover with a tiny placeholder; keep only real images.
      if (res.ok && buf.length > 1500) { fs.writeFileSync(file, buf); got++; } else failed.push(id);
    } catch (e) { failed.push(id); }
    process.stdout.write(".");
  }
  console.log(`\n${got}/${ids.length} covers saved${failed.length ? `, failed: ${failed.join(", ")}` : ""}`);
})();
