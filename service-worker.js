const CACHE_NAME = "workout-v3";

const FILES = [
    "/",
    "/index.html",
    "/manifest.json",
    "/workoutData.json",
    "/logic.js",
    "/style.css",
    "/export-import.js",

    "/favicons/android-chrome-192x192.png",
    "/favicons/android-chrome-512x512.png",
    "/favicons/apple-touch-icon.png",
    "/favicons/favicon-16x16.png",
    "/favicons/favicon-32x32.png",
    "/favicons/favicon.ico",
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(FILES))
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});