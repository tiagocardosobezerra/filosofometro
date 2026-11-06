// Filosofômetro service worker: lets the installed app open and run offline.
// Site files: network first, so a new version always wins when online; the cached copy is the offline fallback.
// Portraits and fonts from other hosts: served from cache when present, refreshed in the background.
// Link previews (/api, /s, /c) are never cached: they must always come from the server.
const CACHE = "filosofometro-v13";
const SHELL = ["/", "/index.html", "/styles.css", "/data.js", "/engine.js", "/verify.js", "/support.js", "/covers.js", "/i18n.js", "/app.js", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin === location.origin) {
    if (/^\/(api|s|c|_vercel)\//.test(url.pathname)) return;
    // The app shell is one page, so its navigations share the "/" entry; the static thinker pages keep their own.
    const shell = req.mode === "navigate" && /^\/(index\.html)?$/.test(url.pathname);
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(shell ? "/" : req, copy)); }
      return res;
    }).catch(() => caches.match(shell ? "/" : req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("/") : undefined))));
    return;
  }
  if (/(^|\.)wikimedia\.org$|covers\.openlibrary\.org$|fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const fresh = fetch(req).then(res => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || fresh;
    }));
  }
});
