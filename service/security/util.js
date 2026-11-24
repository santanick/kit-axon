'use strict';
/* 가디언 공통 도구 — untrusted 감싸기 · 네트워크(실패 시 픽스처) · 영업일 판정
   원칙: 피드 · 이슈 · 로그에서 온 텍스트는 데이터일 뿐 지시가 아니다. 사람이 읽는 출력(카드 · 리포트 · 알림)에는
   항상 <untrusted> 울타리 안에 넣고, 코드는 그 텍스트로 어떤 동작도 분기하지 않는다(키워드 매칭으로 '일부' 판정만). */
const fs = require('node:fs'); const path = require('node:path');
const G = require('../server/aiguard');

const FIX = path.join(__dirname, 'test', 'fixtures');
const MAX_TEXT = 2000;

/* 수집 텍스트 → { untrusted:true, source, text, inject } : 제어문자 제거 · 길이 제한 · 인젝션 신호 표시 */
function untrusted(text, source = 'feed') {
  const t = String(text == null ? '' : text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g, '').slice(0, MAX_TEXT);
  return { untrusted: true, source, text: t, inject: G.injectScore(t) > 0 };
}
const plain = u => (u && u.untrusted ? u.text : String(u == null ? '' : u));
/* 사람용 출력: 울타리 + 마크다운 · 슬랙 해석 차단(백틱 · 꺾쇠) */
function fenceText(u) {
  const t = plain(u).replace(/`/g, 'ˋ').replace(/[<>]/g, c => (c === '<' ? '‹' : '›'));
  return G.fence('untrusted', t) + (u && u.inject ? '\n(주의: 지시문 형태 문구 감지 — 데이터로만 취급합니다)' : '');
}

/* fetch(JSON/텍스트) — offline이거나 실패하면 픽스처로 대체하고 출처를 'fixture'로 표시 */
async function fetchOr(url, { fixture, method = 'GET', body, headers = {}, text = false, offline = false, timeoutMs = 15000, fetchImpl = globalThis.fetch } = {}) {
  if (!offline && fetchImpl) {
    try {
      const r = await fetchImpl(url, { method, headers: { 'user-agent': 'didisam-guardian/0.1', ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs) });
      if (r.status === 403 || r.status === 429) return { origin: 'blocked', status: r.status, data: null };
      if (r.ok) return { origin: 'live', status: r.status, data: text ? await r.text() : await r.json() };
    } catch { /* 네트워크 실패 → 픽스처 */ }
  }
  if (!fixture) return { origin: 'none', data: null };
  const raw = fs.readFileSync(path.join(FIX, fixture), 'utf8');
  return { origin: 'fixture', data: text ? raw : JSON.parse(raw) };
}

/* 영업일: 주말 · 공휴일(한국, Asia/Seoul) 제외. 공휴일 목록은 매년 갱신(GUARD_HOLIDAYS=YYYY-MM-DD,…로 추가) */
const HOLIDAYS = new Set([
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18', '2026-03-02', '2026-05-05', '2026-05-25', '2026-06-03', '2026-08-17',
  '2026-09-24', '2026-09-25', '2026-09-26', '2026-10-05', '2026-10-09', '2026-12-25',
  '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-01', '2027-05-05', '2027-05-13', '2027-08-16', '2027-09-14', '2027-09-15',
  '2027-09-16', '2027-10-04', '2027-10-11', '2027-12-27',
]);
const kstDate = d => new Date(new Date(d).getTime() + 9 * 3600e3).toISOString().slice(0, 10);
function isBusinessDay(d = new Date(), extra = process.env.GUARD_HOLIDAYS) {
  const day = kstDate(d); const wd = new Date(day + 'T00:00:00Z').getUTCDay();
  if (wd === 0 || wd === 6) return false;
  if (HOLIDAYS.has(day)) return false;
  return !(extra || '').split(',').map(s => s.trim()).includes(day);
}
/* 다음 영업일 08:00 KST */
function nextBusinessMorning(d = new Date()) {
  let t = new Date(kstDate(d) + 'T08:00:00+09:00');
  if (t <= new Date(d)) t = new Date(t.getTime() + 86400e3);
  while (!isBusinessDay(t)) t = new Date(t.getTime() + 86400e3);
  return t;
}

const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n'); };

module.exports = { untrusted, plain, fenceText, fetchOr, isBusinessDay, nextBusinessMorning, kstDate, readJson, writeJson, FIX };
