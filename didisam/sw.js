/* 디디쌤 학습자 앱 서비스 워커 v27 — 설치(iOS · Android) · 오프라인 첫 화면.
   네트워크 우선(배포 즉시 새 버전), 실패할 때만 저장본. API · 외부 도메인 · POST는 건드리지 않는다. */
const C = 'didisam-app-v37.3';
const SHELL = ['learner.html', 'learner.css', 'lapp.css', 'ldads.css', 'lapp.js', 'manifest.webmanifest', 'app-icon-192.png'];
/* v34.5 X2 런타임 캐시: 이름이 바뀌지 않는 파일(img/stock · fonts · /api/media/<내용 해시>)만. 최대 160개 · 약 40MB, 오래 안 쓴 것부터 지움(LRU) */
const RTC = 'didisam-rt-media', RT = /\/(img\/stock\/[\w-]+\.webp|fonts\/(?:[\w-]+\/)?[\w.-]+\.(?:woff2|css)|api\/media\/[\w.-]+)$/, RT_N = 300, RT_B = 40 << 20;
const rt = async r => { const c = await caches.open(RTC); const hit = await c.match(r); if (hit) { c.delete(r).then(() => c.put(r, hit.clone())).catch(() => { }); return hit; }
  const res = await fetch(r); if (res.ok && res.type === 'basic' && res.status === 200) { const b = await res.clone().arrayBuffer(); const h = new Headers(res.headers); h.set('x-rt-size', String(b.byteLength));
    await c.put(r, new Response(b, { status: 200, headers: h })).catch(() => { }); const K = await c.keys(); let n = K.length, tot = 0; const sz = await Promise.all(K.map(k => c.match(k).then(m => +(m && m.headers.get('x-rt-size')) || 0)));
    sz.forEach(v => { tot += v; }); for (let i = 0; i < K.length && (n > RT_N || tot > RT_B); i++) { await c.delete(K[i]); n--; tot -= sz[i]; } } return res; };
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).catch(() => { })); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(K => Promise.all(K.filter(k => k.startsWith('didisam-app-') && k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => { const r = e.request; const u = new URL(r.url);
  if (r.method === 'GET' && u.origin === location.origin && RT.test(u.pathname)) { e.respondWith(rt(r)); return; } /* v34.5 X2: 샘플 사진 · /api/media · 글꼴은 저장본 우선(상한 · LRU) */
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  e.respondWith(fetch(r).then(res => { if (res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)).catch(() => { }); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('learner.html', { ignoreSearch: true }) : Response.error())))); });
self.addEventListener('notificationclick', e => { e.notification.close(); const url = (e.notification.data && e.notification.data.url) || 'learner.html?app=1';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(L => { const w = L.find(c => c.url.includes('learner.html')); if (w) { w.navigate(url).catch(() => { }); return w.focus(); } return self.clients.openWindow(url); })); });
