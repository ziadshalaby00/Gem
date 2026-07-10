const CACHE_NAME = "workout-v1";

const FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./data.js",
    "./logic.js",
    "./style.css"
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