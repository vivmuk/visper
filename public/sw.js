// Visper service worker: makes the app installable, opens instantly, and
// keeps the journal readable offline.
//
// - App shell & static assets: cache-first (they're content-hashed).
// - Page navigations: network-first, falling back to the cached app shell.
// - GET /api/entries: network-first, falling back to the last copy, so the
//   journal can be read offline. Cleared on sign-out.
// - Everything else (POST, other APIs): network only.
const VERSION = "visper-v2";
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const DATA_CACHE = "visper-data";

const SHELL = [
  "/",
  "/manifest.json",
  "/art/bg-mobile.webp",
  "/art/offline.webp",
  "/art/empty-journal.webp",
  "/icons/icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE && k !== DATA_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-data") {
    event.waitUntil(caches.delete(DATA_CACHE));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(fallbackUrl || request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(fallbackUrl || request, { ignoreVary: true });
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL_CACHE, "/"));
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/art/") ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (url.pathname === "/api/entries") {
    event.respondWith(networkFirst(request, DATA_CACHE));
  }
});
