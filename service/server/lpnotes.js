'use strict';
/* v43.6 셀프러닝 노트(학습자 lnote.js) — 학습 기록 lp.notes · lp.conn 정리 규칙. Java PubServiceImpl.cleanNotes · cleanConn과 같은 규칙(tests/lpnotes-vectors.json).
   notes: { v:1, items ≤120, cards ≤300, goal, sync } — 계약에 있는 키 · 길이 · 개수만 남기고 나머지(이름 · 연락처 등)는 버린다.
   - 노트 id 'n'+base36, 카드 id 'k'+base36. 같은 id가 여러 번이면 앞의 것 하나만.
   - 노트 묶음 직렬화가 NOTES_BYTES(UTF-8)를 넘으면 뒤(오래된) 노트부터 뺀다 — 학습자 화면(lnote.js)이 먼저 막으므로 안전장치.
   conn: gcal{on, mode, at} · gh{on, url(https://github.com/아이디/저장소만), at} · push{on, at}(앱 알림). 비밀값(토큰 · 키)은 받지 않는다. */
const N_MAX = 120, K_MAX = 300, NOTES_BYTES = 360 * 1024;
const NID = /^n[0-9a-z]{1,24}$/, KID = /^k[0-9a-z]{1,24}$/, LID = /^[\w-]{1,40}$/, DAY = /^\d{4}-\d{2}-\d{2}$/;
const GH = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/, MODE = /^[a-z]{1,12}$/;
const SRC = ['me', 'tutor', 'quiz', 'yt', 'file', 'exam'], CSRC = ['note', 'quiz'];
const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
/* 한 줄 글: 꺾쇠 · 제어 문자 제거 */
const line = (v, n) => String(v == null ? '' : v).replace(/[<>]/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
/* 본문: 줄바꿈 · 탭은 남기고 그 밖의 제어 문자만 제거(꺾쇠는 화면이 이스케이프하므로 코드 예시를 위해 남김) */
const body = (v, n) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').slice(0, n);
const int = (v, lo, hi, d) => { const x = Math.round(+v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

function cleanNote(x) {
  if (!isObj(x) || !NID.test(String(x.id || ''))) return null;
  const t = line(x.t, 80), b = body(x.b, 1500); if (!t && !b.trim()) return null;
  const tags = []; for (const g of Array.isArray(x.tags) ? x.tags.slice(0, 20) : []) { const s = line(g, 20).replace(/^#/, ''); if (s && !tags.includes(s)) tags.push(s); if (tags.length >= 5) break; }
  return { id: String(x.id), t, b, cid: LID.test(String(x.cid || '')) ? String(x.cid) : '', lid: LID.test(String(x.lid || '')) ? String(x.lid) : '', tags,
    src: SRC.includes(x.src) ? x.src : 'me', st: x.st === 'ok' ? 'ok' : 'draft', pin: x.pin === true, at: line(x.at, 30), up: line(x.up, 30) };
}
function cleanCard(x) {
  if (!isObj(x) || !KID.test(String(x.id || ''))) return null;
  const f = line(x.f, 120); if (!f) return null;
  const ef = Math.round(Math.min(2.8, Math.max(1.3, Number.isFinite(+x.ef) ? +x.ef : 2.5)) * 100) / 100;
  return { id: String(x.id), nid: NID.test(String(x.nid || '')) ? String(x.nid) : '', f, k: body(x.k, 240), due: DAY.test(String(x.due || '')) ? String(x.due) : today(),
    iv: int(x.iv, 1, 180, 1), ef, n: int(x.n, 0, 9999, 0), src: CSRC.includes(x.src) ? x.src : 'note' };
}
function cleanNotes(N) {
  if (!isObj(N)) return null;
  const uniq = (A, fn, max) => { const seen = new Set(), out = []; for (const x of Array.isArray(A) ? A.slice(0, max * 2) : []) { const y = fn(x); if (!y || seen.has(y.id)) continue; seen.add(y.id); out.push(y); if (out.length >= max) break; } return out; };
  const o = { v: 1, items: uniq(N.items, cleanNote, N_MAX), cards: uniq(N.cards, cleanCard, K_MAX), goal: null, sync: {} };
  const ids = new Set(o.items.map(x => x.id)); o.cards.forEach(c => { if (c.nid && !ids.has(c.nid)) c.nid = ''; });
  if (isObj(N.goal)) { const exam = line(N.goal.exam, 40), date = String(N.goal.date || ''); if (exam && DAY.test(date)) o.goal = { exam, date }; }
  const S = isObj(N.sync) ? N.sync : {};
  if (isObj(S.notion)) o.sync.notion = { on: S.notion.on === true, at: line(S.notion.at, 30), page: line(S.notion.page, 60) };
  if (isObj(S.gdocs)) o.sync.gdocs = { on: S.gdocs.on === true, at: line(S.gdocs.at, 30) };
  /* 크기 안전장치: 오래된(뒤쪽) 노트부터 뺀다 */
  const size = () => Buffer.byteLength(JSON.stringify(o));
  while (o.items.length && size() > NOTES_BYTES) { const gone = o.items.pop(); o.cards.forEach(c => { if (c.nid === gone.id) c.nid = ''; }); }
  while (o.cards.length && size() > NOTES_BYTES) o.cards.pop();
  return o;
}
function cleanConn(C) {
  if (!isObj(C)) return null; const o = {};
  if (isObj(C.gcal)) o.gcal = { on: C.gcal.on === true, mode: MODE.test(String(C.gcal.mode || '')) ? String(C.gcal.mode) : '', at: line(C.gcal.at, 30) };
  if (isObj(C.gh)) { const u = String(C.gh.url || '').trim().replace(/\/+$/, ''); if (u.length <= 200 && GH.test(u)) o.gh = { on: C.gh.on === true, url: u, at: line(C.gh.at, 30) }; }
  if (isObj(C.push)) o.push = { on: C.push.on === true, at: line(C.push.at, 30) };
  return o;
}
module.exports = { cleanNotes, cleanConn, N_MAX, K_MAX, NOTES_BYTES };
