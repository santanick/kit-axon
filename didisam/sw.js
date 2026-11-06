/* 디디쌤 학습자 앱 서비스 워커 v27 — 설치(iOS · Android) · 오프라인 첫 화면.
   네트워크 우선(배포 즉시 새 버전), 실패할 때만 저장본. API · 외부 도메인 · POST는 건드리지 않는다. */
const C = 'didisam-app-v30.4';
const SHELL = ['learner.html', 'learner.css', 'lapp.css', 'lapp.js', 'manifest.webmanifest', 'app-icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => { })); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(K => Promise.all(K.filter(k => k.startsWith('didisam-app-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { const r = e.request; const u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  e.respondWith(fetch(r).then(res => { if (res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)).catch(() => { }); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('learner.html', { ignoreSearch: true }) : Response.error())))); });
self.addEventListener('notificationclick', e => { e.notification.close(); const url = (e.notification.data && e.notification.data.url) || 'learner.html?app=1';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => { const w = L.find(c => c.url.includes('learner.html')); if (w) { w.navigate(url).catch(() => { }); return w.focus(); } return self.clients.openWindow(url); })); });
