'use strict';
/* qa7 d5 · YouTube 제목 서버 프록시(GET /api/oembed?url=) — 운영 CSP(connect-src 'self')를 넓히지 않고 서버가 대신 읽는다
   · 로그인 필요(운영자 · 교수자) · youtube.com · www/m.youtube.com · youtu.be 주소만 · 영상 id(11자)만 뽑아 www.youtube.com/oembed로 고정 요청
   · 연결은 홈페이지 벤치마크와 같은 SSRF 가드(bench.js checkUrl · resolveSafe(사설 IP 차단) · IP 고정 연결) · 리다이렉트 따르지 않음 · 64KB · 5초
   · 응답은 title · thumbnail_url(i.ytimg.com https만) 두 값만 · 서버 메모리 10분 캐시(최대 500개)
   · 시험 모드: OEMBED_MOCK=1(운영 NODE_ENV=production에서는 무시) → 외부 접속 없이 「시험 영상 <id>」
   · Java 대응: service-egov/.../bench/service/impl/DdOembed.java(같은 판정 · 같은 오류 코드) */
const { checkUrl, resolveSafe, httpsGet, readCapped } = require('./bench');
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const TTL = 10 * 60e3, CAP = 500, MAX = 64 * 1024, TIMEOUT = 5000;
const bad = (status, code, message) => Object.assign(new Error(message), { status, code });

/** 입력 주소 → 영상 id(11자). 허용하지 않는 주소는 400 */
function ytIdOf(raw) {
  raw = String(raw == null ? '' : raw).trim();
  if (!raw || raw.length > 500) throw bad(400, 'bad_url', 'YouTube 영상 주소를 넣어 주십시오.');
  let u; try { u = new URL(raw); } catch (e) { throw bad(400, 'bad_url', 'YouTube 영상 주소를 넣어 주십시오.'); }
  if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password || (u.port && u.port !== '443' && u.port !== '80')) throw bad(400, 'bad_url', 'YouTube 영상 주소를 넣어 주십시오.');
  const h = u.hostname.toLowerCase(); if (!HOSTS.has(h)) throw bad(400, 'not_youtube', 'YouTube(youtube.com · youtu.be) 주소만 제목을 읽을 수 있습니다.');
  let id = '';
  if (h === 'youtu.be') id = u.pathname.split('/')[1] || '';
  else if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
  else { const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/); id = m ? m[1] : ''; }
  if (!/^[\w-]{11}$/.test(id)) throw bad(400, 'bad_url', 'YouTube 영상 주소에서 영상 번호를 찾지 못했습니다.');
  return id;
}
const thumbOk = t => (typeof t === 'string' && /^https:\/\/i\d?\.ytimg\.com\/[\w./-]{1,200}$/.test(t) ? t : '');

function createOembed({ env = process.env, lookup, get } = {}) {
  const C = new Map();
  const mock = env.OEMBED_MOCK === '1' && env.NODE_ENV !== 'production';
  async function fetchOne(id) {
    if (mock) return { title: `시험 영상 ${id}`, thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
    const u = checkUrl('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id));
    const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), TIMEOUT);
    try {
      const addr = await resolveSafe(u, lookup || require('node:dns').promises.lookup);
      let r; try { r = await (get || httpsGet)(u, addr, ac.signal); } catch (e) { throw bad(502, 'fetch', 'YouTube에 연결하지 못했습니다. 제목을 직접 입력해 주십시오.'); }
      if (r.status !== 200) { if (r.stream && r.stream.resume) r.stream.resume(); throw bad(404, 'not_found', '영상 정보를 찾지 못했습니다(비공개 · 삭제된 영상일 수 있습니다). 제목을 직접 입력해 주십시오.'); }
      let j; try { j = JSON.parse((await readCapped(r.stream, MAX)).buf.toString('utf8')); } catch (e) { throw bad(502, 'fetch', '영상 정보를 읽지 못했습니다. 제목을 직접 입력해 주십시오.'); }
      return { title: String((j && j.title) || '').replace(/\s+/g, ' ').trim().slice(0, 200), thumbnail_url: thumbOk(j && j.thumbnail_url) };
    } finally { clearTimeout(timer); }
  }
  /** url → { title, thumbnail_url } (10분 캐시) */
  async function lookupTitle(raw) {
    const id = ytIdOf(raw); const hit = C.get(id);
    if (hit && Date.now() - hit.at < TTL) return { ...hit.v };
    const v = await fetchOne(id); C.delete(id); C.set(id, { v, at: Date.now() });
    while (C.size > CAP) C.delete(C.keys().next().value);
    return { ...v };
  }
  return { lookupTitle, ytIdOf, mock };
}
module.exports = { createOembed, ytIdOf };
