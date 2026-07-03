// 1. Событие установки (инсталляции) сервис-воркера
self.addEventListener('install', (event) => {
  // force SW to become active immediately
  self.skipWaiting();
});

// 2. Событие активации
self.addEventListener('activate', (event) => {
  // allow SW to control all open pages immediately
  event.waitUntil(self.clients.claim());
});

// 3. Перехват сетевых запросов (КРИТИЧЕСКИ ВАЖНО для PWA)
self.addEventListener('fetch', (event) => {
  // Пока мы ничего не кэшируем, просто пропускаем запросы в интернет
  event.respondWith(fetch(event.request));
});