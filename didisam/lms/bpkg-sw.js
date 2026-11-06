/* v30 묶음 B — 콘텐츠 패키지(SCORM · HTML5) 서비스 워커. 범위: /lms/bpkg/<패키지>/<경로>
   브라우저가 zip을 풀어 Cache Storage(lmsb-pkg-v1)에 넣은 파일을 그대로 돌려주고, 없으면(다른 기기 · 캐시 삭제)
   운영 서버 GET /api/lms/b/scorm-file?pkg=&path= 에서 받아 캐시한다. SCO는 같은 출처 iframe이라 window.parent.API(_1484_11)를 찾는다. */
'use strict';
const CACHE = 'lmsb-pkg-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); const m = u.pathname.match(/\/lms\/bpkg\/([0-9a-f-]{36})\/(.+)$/);
  if (!m || e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE); const key = new URL(u.pathname, u.origin).href;
    const hit = await c.match(key); if (hit) return hit;
    try {
      const r = await fetch(`/api/lms/b/scorm-file?pkg=${m[1]}&path=${encodeURIComponent(decodeURIComponent(m[2]))}`, { credentials: 'same-origin' });
      if (!r.ok) return new Response('패키지 파일을 찾을 수 없습니다.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
      const j = await r.json(); const bin = atob(j.b64); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
      const res = new Response(new Blob([b], { type: j.mime }), { headers: { 'content-type': j.mime } }); await c.put(key, res.clone()); return res;
    } catch (x) { return new Response('패키지 파일을 불러오지 못했습니다.', { status: 504, headers: { 'content-type': 'text/plain; charset=utf-8' } }); }
  })());
});
