/* Service worker : l'application fonctionne hors connexion.
   Les données des clients ne passent jamais par ici : elles restent dans le stockage de l'appareil. */
const CACHE = "dsp-1.0.9";
const FILES = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
/* toujours télécharger depuis le serveur (jamais depuis le cache du navigateur) pour avoir la dernière version */
const fresh = u => fetch(new Request(u, { cache: "no-store" }));
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => fresh(f).then(r => { if (r.ok) return c.put(f, r); })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.endsWith("version.json")) return; /* la vérification de version passe toujours par le réseau */
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;
  /* cache d'abord (hors connexion), puis mise à jour en arrière-plan pour la prochaine ouverture */
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = (isFont ? fetch(req) : fresh(req.url)).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || (req.mode === "navigate" ? c.match("index.html") : Response.error());
  }));
});
