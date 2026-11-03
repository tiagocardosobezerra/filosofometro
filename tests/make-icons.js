// Regenerates the app icons in icons/ (home screen, splash and favicon sizes) from the brand mark.
// Usage: node tests/make-icons.js
const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");
const OUT = path.join(__dirname, "..", "icons");
// The mark: a triangle with the accent dot, on the dark ink background. "pad" shrinks it for maskable icons,
// whose outer 20% can be cropped into a circle or squircle by the phone.
const mark = (size, pad, radius) => {
  const s = size * (1 - 2 * pad), o = size * pad, k = s / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#0F0E0C"/>
  <g transform="translate(${o} ${o}) scale(${k})"><path d="M16 5.5 27 26.5H5z" fill="none" stroke="#F1EADC" stroke-width="1.5" stroke-linejoin="round"/><circle cx="16" cy="19.5" r="3.1" fill="#F06A43"/></g></svg>`;
};
const png = (svg, size) => new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
fs.mkdirSync(OUT, { recursive: true });
for (const [name, size, pad, radius] of [["icon-192.png", 192, 0.12, 0], ["icon-512.png", 512, 0.12, 0], ["maskable-512.png", 512, 0.22, 0], ["apple-touch-icon.png", 180, 0.14, 0], ["favicon-32.png", 32, 0.04, 7]]) {
  fs.writeFileSync(path.join(OUT, name), png(mark(size, pad, radius), size));
}
console.log("icons written");
