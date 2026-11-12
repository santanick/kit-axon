'use strict';
/* v31 환급 에디션 모듈 분리: MODULE=learner|tutor|admin 이면 서비스마다 화면 · API · 역할을 나눈다.
   MODULE이 비어 있으면 기존처럼 한 서비스로 동작한다. Java: cmm/DdModule.java와 같은 규칙. */
const PAGE = { learner: 'learner.html', tutor: 'tutor.html', admin: 'index.html' };
const PUB = /^\/api\/pub\/[^/]+\/(site|login|me|progress|logout|tutor|otp|signup|guardian|pii|withdraw|verify|cpl)$/;
const MEDIA_PUB = /^\/api\/media\/(?:f\/)?[^/]+$/; /* v35: 강의 파일 /api/media/f/:id 도 공개 조회 */
const TUTOR_API = new Set(['GET /api/health', 'GET /api/config', 'POST /api/login', 'POST /api/logout', 'POST /api/password', 'GET /api/me', 'GET /api/state', 'PUT /api/state', 'POST /api/ai/messages', 'GET /api/ai/usage', 'GET /api/learners/progress', 'GET /api/cpl/summary', 'GET /api/cpl/exams', 'GET /api/cpl/logs', 'GET /api/cpl/exam-copy', 'GET /api/cpl/completion']);
const moduleOf = env => { const m = String(env.MODULE || '').trim(); if (m && !PAGE[m]) throw new Error('MODULE은 learner, tutor, admin 중 하나여야 합니다.'); return m; };
function apiAllowed(mod, method, path) {
  if (!mod) return true;
  if (method === 'GET' && MEDIA_PUB.test(path)) return true; /* v34.5 게시 홈페이지 이미지는 모든 모듈에서 공개 */
  if (mod === 'learner') return (method === 'GET' && (path === '/api/health' || path === '/api/config')) || PUB.test(path);
  if (mod === 'tutor') return TUTOR_API.has(`${method} ${path}`);
  return !PUB.test(path);
}
const mcpAllowed = mod => !mod || mod === 'admin';
const roleAllowed = (mod, role) => mod === 'tutor' ? role === 'teacher' : mod === 'admin' ? role !== 'teacher' : mod !== 'learner';
/* 다른 모듈의 화면과 배포 안내는 내주지 않는다. 공통 스크립트 · 스타일 · 이미지는 그대로 쓴다 */
function staticAllowed(mod, pathname) {
  if (!mod) return true;
  const p = pathname.toLowerCase(); if (p.startsWith('/deploy/') || p.startsWith('/native/')) return false;
  if (p.endsWith('/') || p.endsWith('.html') || p.endsWith('.do')) return p === '/' || p === '/' + PAGE[mod];
  return true;
}
function ipv4(s) { const m = /^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i.exec(String(s).trim()); if (!m) return null; const o = m.slice(1).map(Number); if (o.some(x => x > 255)) return null; return ((o[0] * 16777216) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0; }
const parseIps = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
function ipAllowed(list, ip) {
  if (!list.length) return true; const v = ipv4(ip);
  return list.some(rule => { const [a, b] = rule.split('/'); if (b == null) return v != null && ipv4(a) != null ? ipv4(a) === v : a.toLowerCase() === String(ip).trim().toLowerCase(); const n = ipv4(a), bits = Number(b); if (v == null || n == null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false; if (!bits) return true; const mask = (0xFFFFFFFF << (32 - bits)) >>> 0; return ((v & mask) >>> 0) === ((n & mask) >>> 0); });
}

/* 교강사 범위: 운영자가 배정한 과정과 그 수강생만 */
function scope(doc, email) {
  const me = (Array.isArray(doc && doc.admins) ? doc.admins : []).find(x => x && String(x.email || '').toLowerCase() === String(email).toLowerCase());
  const classes = new Set(me && Array.isArray(me.classes) ? me.classes.map(String) : []); const ids = new Set(); const sids = new Set();
  (Array.isArray(doc && doc.classes) ? doc.classes : []).forEach(c => { if (c && classes.has(String(c.id)) && Array.isArray(c.learners)) c.learners.forEach(x => ids.add(String(x))); });
  (Array.isArray(doc && doc.members) ? doc.members : []).forEach(m => { if (m && ids.has(String(m.id)) && m.sid) sids.add(String(m.sid)); });
  return { classes, ids, sids };
}
const VIEW_KEEP = new Set(['org', 'classes', 'members', 'admins', 'me', 'nav', 'settings', 'site', 'lsite', 'guides', 'bld', 'rubrics', 'tuts', 'weeks']);
const SCRUB = ['settings', 'site', 'lsite'];
/* 화면이 읽는 구조만 남기고 값은 지운다 */
const shape = v => Array.isArray(v) ? [] : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).map(k => { const x = v[k]; return [k, Array.isArray(x) ? [] : x && typeof x === 'object' ? {} : null]; })) : v;
const SECRET = /(key|secret|token|password|credential)/i;
function scrub(v) { if (Array.isArray(v)) return v.map(scrub); if (!v || typeof v !== 'object') return v; const o = {}; for (const k of Object.keys(v)) if (!SECRET.test(k)) o[k] = scrub(v[k]); return o; }
function teacherView(doc, email) {
  if (!doc || typeof doc !== 'object') return doc; const sc = scope(doc, email); const out = {};
  for (const k of Object.keys(doc)) { const v = doc[k]; out[k] = VIEW_KEEP.has(k) ? v : shape(v); }
  out.classes = (Array.isArray(doc.classes) ? doc.classes : []).filter(c => c && sc.classes.has(String(c.id)));
  out.members = (Array.isArray(doc.members) ? doc.members : []).filter(m => m && sc.ids.has(String(m.id))).map(m => m.crm && typeof m.crm === 'object' ? { ...m, crm: { st: m.crm.st } } : m); /* 원생 CRM 정보는 재원 상태만 넘긴다 */
  out.admins = (Array.isArray(doc.admins) ? doc.admins : []).filter(x => x && String(x.email || '').toLowerCase() === String(email).toLowerCase());
  if (Array.isArray(doc.tq)) out.tq = doc.tq.filter(x => x && (sc.sids.has(String(x.sid)) || sc.classes.has(String(x.cls))));
  SCRUB.forEach(k => { if (doc[k]) out[k] = scrub(doc[k]); }); return out;
}
const CLASS_LOCK = ['id', 'learners', 'name', 'status', 'price', 'kind', 'legal', 'start', 'end', 'teacher', 'hrd', 'drop'];
function teacherMerge(cur, inc, email) {
  const sc = scope(cur, email); const byId = new Map((Array.isArray(inc && inc.classes) ? inc.classes : []).filter(c => c && c.id != null).map(c => [String(c.id), c]));
  const out = { ...cur };
  out.classes = (Array.isArray(cur.classes) ? cur.classes : []).map(c => { if (!c || !sc.classes.has(String(c.id))) return c; const n = byId.get(String(c.id)); if (!n || typeof n !== 'object' || Array.isArray(n)) return c; const m = { ...n }; for (const k of CLASS_LOCK) { if (k in c) m[k] = c[k]; else delete m[k]; } return m; });
  /* 질문함: 담당 범위의 답변과 새 질문만 받는다 */
  const inScope = x => x && (sc.sids.has(String(x.sid)) || sc.classes.has(String(x.cls)));
  const curQ = Array.isArray(cur.tq) ? cur.tq : []; const incQ = new Map((Array.isArray(inc && inc.tq) ? inc.tq : []).filter(x => x && x.id != null).map(x => [String(x.id), x]));
  if (curQ.length || incQ.size) { const seen = new Set(curQ.map(x => String(x && x.id))); out.tq = curQ.map(x => { if (!inScope(x)) return x; const n = incQ.get(String(x.id)); return n && typeof n === 'object' ? { ...n, id: x.id, sid: x.sid, q: x.q, cls: x.cls } : x; }); for (const [id, n] of incQ) if (!seen.has(id) && inScope(n)) out.tq.push(n); }
  return out;
}
module.exports = { PAGE, moduleOf, apiAllowed, mcpAllowed, roleAllowed, staticAllowed, parseIps, ipAllowed, scope, teacherView, teacherMerge };
