const CACHE_NAME = "workout-v7";

const FILES = [
    "/",
    "/index.html",
    "/manifest.json",
    "/workoutData.json",
    "/logic.js",
    "/style.css",
    "/export-import.js",
    "/drive-sync.js",
    "/import-menu.js",
    "/favicons/android-chrome-192x192.png",
    "/favicons/android-chrome-512x512.png",
    "/favicons/apple-touch-icon.png",
    "/favicons/favicon-16x16.png",
    "/favicons/favicon-32x32.png",
    "/favicons/favicon.ico",
];

self.addEventListener("install", event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") return;
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200 && response.type === "basic") {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    if (event.request.mode === "navigate") {
                        return caches.match("/index.html");
                    }
                    return new Response("Offline", {
                        status: 503,
                        statusText: "Offline",
                        headers: { "Content-Type": "text/plain" }
                    });
                })
            )
    );
});