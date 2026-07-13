// ============================================================
// Service Worker — Distribución Segura SST
// ============================================================

const CACHE_VERSION = 'dist-segura-v4';
const BASE = '/distribucion-segura';

const PRECACHE = [
  `${BASE}/login.php`,
  `${BASE}/assets/img/logo-camion.png`,
  `${BASE}/manifest.json`,
];

// ── Instalación: precachear recursos clave ────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// ── Activación: limpiar caches antiguos ──────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first, cache como fallback ─────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Solo manejar peticiones del mismo origen — dejar que CDNs externos
  // pasen directamente al browser sin intervención del SW
  if (url.origin !== self.location.origin) return;

  // Llamadas a la API siempre en red (nunca cachear)
  if (url.pathname.includes('/api/') || url.pathname.includes('/uploads/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Recursos estáticos: network-first con cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
