// public/sw.js - Service Worker PWA para Nexus-Flow
const CACHE_NAME = 'nexus-flow-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // PWA minimal fetch pass-through
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
