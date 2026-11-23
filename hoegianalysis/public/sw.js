// 회기랩 서비스 워커: 페이지 이동이 네트워크 오류로 실패할 때만 오프라인 안내 화면을 보여준다.
// 그 밖의 요청(API, 이미지, 출석체크 등)은 건드리지 않는다. 캐시를 바꾸면 VERSION을 올린다.
const VERSION = 'hoegilab-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
