'use strict';
/* v24 홈페이지 벤치마크 읽기(POST /api/site/benchmark) — 운영자 세션 전용
   대표님: '벤치마크할 사이트를 넣으면 해당 부분을 분석해서 유사하게 만들어주는 기능'
   - https만 · 443 포트만 · 계정 정보가 든 주소 금지 · 내부/사설/루프백/링크로컬/멀티캐스트 IP 금지(SSRF), DNS로 확인한 IP에 고정 연결(재바인딩 방지)
   - 리다이렉트 3번까지(매번 다시 검사) · 전체 10초 · 본문 2MB까지만 읽음 · HTML만
   - 스크립트 · 스타일 · 주석을 지우고 제목 · 설명 · 소제목 · 메뉴 · 섹션 글(앞부분) · 색만 돌려준다(구성 참고용 — 화면 문구로 그대로 쓰지 않음) */
const dns = require('node:dns').promises;
const net = require('node:net');
const https = require('node:https');

const MAX = 2 * 1024 * 1024; const TIMEOUT = 10000; const HOPS = 3;
const bad = (status, code, message) => Object.assign(new Error(message), { status, code });

function v4Private(ip) {
  const p = ip.split('.').map(Number); if (p.length !== 4 || p.some(n => !(n >= 0 && n <= 255))) return true;
  const [a, b, c] = p;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) || a >= 224;
}
function isPrivate(ip) {
  ip = String(ip || '').replace(/^\[|\]$/g, '').toLowerCase(); const z = ip.indexOf('%'); if (z >= 0) ip = ip.slice(0, z);
  const fam = net.isIP(ip); if (fam === 4) return v4Private(ip); if (fam !== 6) return true;
  if (ip === '::' || ip === '::1') return true;
  const m4 = ip.match(/^(?:::ffff:|::|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/); if (m4) return v4Private(m4[1]);
  const mh = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/); if (mh) { const h = parseInt(mh[1], 16), l = parseInt(mh[2], 16); return v4Private(`${h >> 8}.${h & 255}.${l >> 8}.${l & 255}`); }
  const first = parseInt(ip.split(':')[0] || '0', 16);
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 고유 로컬
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 링크 로컬
  if ((first & 0xff00) === 0xff00) return true; // 멀티캐스트
  if (/^2001:0?db8:/.test(ip)) return true; // 문서용
  if (/^64:ff9b:/.test(ip) || /^2002:/.test(ip)) return true; // NAT64 · 6to4(내부 IPv4로 우회 방지)
  return false;
}
function checkUrl(raw) {
  let u; try { u = new URL(String(raw || '').trim()); } catch (e) { throw bad(400, 'bad_url', '주소 형식이 올바르지 않습니다.'); }
  if (u.protocol !== 'https:') throw bad(400, 'https_only', 'https:// 로 시작하는 주소만 읽을 수 있습니다.');
  if (u.username || u.password) throw bad(400, 'bad_url', '계정 정보가 들어간 주소는 쓸 수 없습니다.');
  if (u.port && u.port !== '443') throw bad(400, 'bad_port', '기본 포트(443) 주소만 읽을 수 있습니다.');
  if (String(raw).length > 500) throw bad(400, 'bad_url', '주소가 너무 깁니다.');
  const h = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!h || h === 'localhost' || /\.(localhost|local|internal|lan|home|corp)$/.test(h) || (!net.isIP(h) && !h.includes('.'))) throw bad(400, 'private', '내부 주소는 읽을 수 없습니다.');
  if (net.isIP(h) && isPrivate(h)) throw bad(400, 'private', '내부 주소는 읽을 수 없습니다.');
  return u;
}
async function resolveSafe(u, lookup) {
  const h = u.hostname.replace(/^\[|\]$/g, '');
  const L = net.isIP(h) ? [{ address: h, family: net.isIP(h) }] : await lookup(h, { all: true }).catch(() => { throw bad(400, 'dns', '주소를 찾지 못했습니다.'); });
  if (!L || !L.length) throw bad(400, 'dns', '주소를 찾지 못했습니다.');
  if (L.some(a => isPrivate(a.address))) throw bad(400, 'private', '내부 주소는 읽을 수 없습니다.');
  return L[0];
}
/* 기본 전송: 확인한 IP로 고정 연결(인증서는 원래 호스트 이름으로 검증) */
function httpsGet(u, addr, signal) {
  return new Promise((ok, no) => {
    const req = https.request({ protocol: 'https:', hostname: u.hostname.replace(/^\[|\]$/g, ''), port: 443, path: u.pathname + u.search, method: 'GET', signal,
      lookup: (h, o, cb) => (o && o.all ? cb(null, [{ address: addr.address, family: addr.family }]) : cb(null, addr.address, addr.family)),
      headers: { 'user-agent': 'DidisamBenchmark/1.0 (+homepage structure reference)', accept: 'text/html,application/xhtml+xml;q=0.9', 'accept-language': 'ko,en;q=0.7' } }, res => ok({ status: res.statusCode, headers: res.headers, stream: res }));
    req.on('error', no); req.end();
  });
}
async function readCapped(stream, max) {
  const chunks = []; let n = 0;
  for await (const c of stream) { const b = Buffer.isBuffer(c) ? c : Buffer.from(c); if (n + b.length > max) { chunks.push(b.subarray(0, max - n)); n = max; if (stream.destroy) stream.destroy(); break; } chunks.push(b); n += b.length; }
  return { buf: Buffer.concat(chunks), cut: n >= max };
}
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·' };
const dec = s => String(s || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => { if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''; } return ENT[e.toLowerCase()] ?? m; });
const txt = h => dec(String(h || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
function extract(html, base) {
  let h = String(html || '');
  const metaTag = name => { const m = h.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, 'i')); if (!m) return ''; const c = m[0].match(/content=["']([^"']*)["']/i); return c ? dec(c[1]).trim() : ''; };
  const title = txt((h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]).slice(0, 120);
  const desc = (metaTag('description') || metaTag('og:description')).slice(0, 300);
  const theme = metaTag('theme-color');
  const styles = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n') + [...h.matchAll(/style=["']([^"']*)["']/gi)].map(m => m[1]).join(';');
  h = h.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|noscript|template|svg|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<(script|style|link|meta|iframe|object|embed)\b[^>]*>/gi, ' ');
  const headings = [...h.matchAll(/<h([1-3])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m => txt(m[2]).slice(0, 120)).filter(Boolean).slice(0, 40);
  const navHtml = [...h.matchAll(/<(nav|header)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m => m[2]).join(' ');
  const nav = [...new Set([...navHtml.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(m => txt(m[1]).slice(0, 30)).filter(t => t && t.length <= 30))].slice(0, 40);
  const body = (h.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, h])[1];
  let parts = [...body.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)].map(m => m[1]);
  if (parts.length < 2) parts = body.split(/<h[12]\b/i).slice(1).map(x => '<h2' + x);
  const kind = s => /<form\b|<input\b/i.test(s) ? 'form' : /<img\b/gi.test(s) && (s.match(/<img\b/gi) || []).length >= 3 ? 'gallery' : /<(ul|ol)\b/i.test(s) && (s.match(/<li\b/gi) || []).length >= 3 ? 'list' : /\d[\d,.]*\s*(%|명|개|건|년|\+)/.test(txt(s)) ? 'stats' : 'text';
  const sections = parts.slice(0, 20).map(s => ({ heading: txt((s.match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i) || [])[1]).slice(0, 120), text: txt(s.replace(/<h[1-4]\b[^>]*>[\s\S]*?<\/h[1-4]>/i, '')).slice(0, 400), kind: kind(s), images: (s.match(/<img\b/gi) || []).length })).filter(x => x.heading || x.text);
  const cnt = {}; [...(styles + ' ' + theme).matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)].forEach(m => { let c = m[1].toLowerCase(); if (c.length === 3) c = c.split('').map(x => x + x).join(''); if (/^(fff{4}|0{6}|f{6})$/.test(c)) return; cnt[c] = (cnt[c] || 0) + 1; });
  const colors = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => '#' + c);
  if (theme && /^#[0-9a-f]{6}$/i.test(theme) && !colors.includes(theme.toLowerCase())) colors.unshift(theme.toLowerCase());
  return { url: base, title, desc, headings, nav, sections, colors: colors.slice(0, 6), images: (body.match(/<img\b/gi) || []).length };
}
async function benchmark(raw, opts = {}) {
  const lookup = opts.lookup || dns.lookup; const get = opts.get || httpsGet;
  const ac = new AbortController(); const timer = setTimeout(() => ac.abort(), opts.timeout || TIMEOUT);
  try {
    let u = checkUrl(raw);
    for (let hop = 0; hop <= HOPS; hop++) {
      const addr = await resolveSafe(u, lookup);
      let r; try { r = await get(u, addr, ac.signal); } catch (e) { throw ac.signal.aborted ? bad(504, 'timeout', '사이트 응답이 10초 안에 오지 않았습니다.') : bad(502, 'fetch', '사이트에 연결하지 못했습니다.'); }
      if (r.status >= 300 && r.status < 400 && r.headers.location) { if (r.stream && r.stream.resume) r.stream.resume(); if (hop === HOPS) throw bad(502, 'redirects', '이동(리다이렉트)이 너무 많습니다.'); u = checkUrl(new URL(r.headers.location, u).href); continue; }
      if (r.status !== 200) { if (r.stream && r.stream.resume) r.stream.resume(); throw bad(502, 'status', `사이트가 응답하지 않았습니다(${r.status}).`); }
      const ct = String(r.headers['content-type'] || ''); if (ct && !/text\/html|application\/xhtml/i.test(ct)) { if (r.stream && r.stream.destroy) r.stream.destroy(); throw bad(415, 'type', '웹페이지(HTML)만 읽을 수 있습니다.'); }
      const len = +r.headers['content-length'] || 0; if (len > MAX * 4) { if (r.stream && r.stream.destroy) r.stream.destroy(); throw bad(413, 'too_large', '페이지가 너무 큽니다.'); }
      let got; try { got = await readCapped(r.stream, MAX); } catch (e) { throw ac.signal.aborted ? bad(504, 'timeout', '사이트 응답이 10초 안에 오지 않았습니다.') : bad(502, 'fetch', '페이지를 읽지 못했습니다.'); }
      const cs = (ct.match(/charset=([\w-]+)/i) || [])[1] || 'utf-8'; let html; try { html = new TextDecoder(cs.toLowerCase() === 'euc-kr' ? 'euc-kr' : cs, { fatal: false }).decode(got.buf); } catch (e) { html = got.buf.toString('utf8'); }
      return { ...extract(html, u.href), truncated: got.cut };
    }
    throw bad(502, 'redirects', '이동(리다이렉트)이 너무 많습니다.');
  } finally { clearTimeout(timer); }
}
module.exports = { benchmark, extract, isPrivate, checkUrl };
