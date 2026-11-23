'use strict';
/* v46 Ver2 학습 이벤트 표준(learning_event) — 형식 검증 · 저장 · 조회 · lp 차이분 이벤트. Java: egovframework.didisam.lev(같은 규칙)
   원칙: 학습자 자유 글을 넣지 않는다(val은 숫자 · 참거짓 · 짧은 코드만). 식별자는 학번 또는 간편가입 가명 learner_id(sid)만.
   신뢰: A = 서버 판정(튜터 · 힌트 · 채점 승인), C = 학습자 보고(클라이언트 묶음 · lp 차이분). */
const VERBS = ['attempt', 'hint', 'submit', 'revise', 'reflect', 'mastery', 'ai.ask', 'vision', 'goal'];
const LV = ['', 'L0', 'L1', 'L2', 'L3'];
const OBJ_RE = /^[\w-]{1,60}(\/[\w-]{1,60})?$/;
const KEY_RE = /^[a-zA-Z][\w]{0,15}$/;
const CODE_RE = /^[\w.:-]{1,24}$/;
const MAX_BATCH = 50;

class LevErr extends Error { constructor(msg, code) { super(msg); this.code = code; } }
/* 값 검증: 키 8개 이하, 값은 유한수 · 참거짓 · 24자 이하 코드(공백 · 문장 불가). 글처럼 보이면 거부(free_text) */
function cleanVal(v) {
  if (v == null) return {};
  if (typeof v !== 'object' || Array.isArray(v)) throw new LevErr('val은 객체여야 합니다.', 'lev_val');
  const out = {}; const ks = Object.keys(v); if (ks.length > 8) throw new LevErr('val 항목이 너무 많습니다.', 'lev_val');
  for (const k of ks) {
    if (!KEY_RE.test(k)) throw new LevErr('val 키 형식이 올바르지 않습니다.', 'lev_val');
    const x = v[k];
    if (typeof x === 'number') { if (!Number.isFinite(x)) throw new LevErr('val 숫자가 올바르지 않습니다.', 'lev_val'); out[k] = Math.round(x * 1000) / 1000; }
    else if (typeof x === 'boolean') out[k] = x;
    else if (typeof x === 'string') { if (!CODE_RE.test(x)) throw new LevErr('이벤트에는 학습자 글을 넣을 수 없습니다(길이 · 종류만).', 'lev_free_text'); out[k] = x; }
    else throw new LevErr('val 값 형식이 올바르지 않습니다.', 'lev_val');
  }
  return out;
}
/* 이벤트 1건 검증. 허용 키 밖(글 필드 t · text · q 등)이 있으면 거부 */
function cleanEvent(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) throw new LevErr('이벤트 형식이 올바르지 않습니다.', 'lev_form');
  for (const k of Object.keys(e)) if (!['verb', 'obj', 'lvl', 'val', 'at'].includes(k)) throw new LevErr(`허용하지 않는 필드(${String(k).slice(0, 20)})입니다.`, k === 'text' || k === 't' || k === 'q' || k === 'body' ? 'lev_free_text' : 'lev_form');
  if (!VERBS.includes(e.verb)) throw new LevErr('verb가 올바르지 않습니다.', 'lev_verb');
  const obj = e.obj == null ? '' : String(e.obj); if (obj && !OBJ_RE.test(obj)) throw new LevErr('obj 형식이 올바르지 않습니다.', 'lev_obj');
  const lvl = e.lvl == null ? '' : String(e.lvl); if (!LV.includes(lvl)) throw new LevErr('lvl이 올바르지 않습니다.', 'lev_lvl');
  let at = null; if (e.at != null) { const d = new Date(String(e.at)); const now = Date.now(); if (isNaN(d) || d.getTime() > now + 5 * 60e3 || d.getTime() < now - 30 * 864e5) throw new LevErr('at이 올바르지 않습니다.', 'lev_at'); at = d.toISOString(); }
  return { verb: e.verb, obj, lvl, val: cleanVal(e.val), at };
}
async function insert(c, tid, sid, evs, src, trust) {
  let n = 0;
  for (const e of evs) { await c.query('insert into learning_event (tenant_id, sid, verb, obj, lvl, val, src, trust, at) values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9::timestamptz, now()))', [tid, String(sid), e.verb, e.obj || '', e.lvl || '', JSON.stringify(e.val || {}), src, trust, e.at || null]); n++; }
  return n;
}
/* 학습자 묶음(POST /api/pub/<tid>/lev): 최대 50건, 하나라도 틀리면 전체 거부(400) */
function cleanBatch(b) {
  const list = Array.isArray(b) ? b : b && Array.isArray(b.ev) ? b.ev : null;
  if (!list || !list.length) throw new LevErr('보낼 이벤트가 없습니다.', 'lev_form');
  if (list.length > MAX_BATCH) throw new LevErr(`한 번에 ${MAX_BATCH}건까지 보낼 수 있습니다.`, 'lev_batch');
  return list.map(cleanEvent);
}
/* 서버 판정 이벤트(신뢰 A) — 튜터 · 힌트 호출에서 */
const server = (c, tid, sid, evs) => insert(c, tid, sid, evs.map(cleanEvent), 'server', 'A');

/* lp 차이분 → 이벤트(신뢰 C): 새로 완료된 항목 submit · 점수, 비전 작성 · 수정 vision, 목표 달성 goal, 힌트 단계 상승은 튜터 경로가 기록하므로 제외 */
function diffLp(prev, next) {
  const P = prev && typeof prev === 'object' ? prev : {}, N = next && typeof next === 'object' ? next : {}; const out = [];
  for (const [cid, r] of Object.entries(N.cls || {})) {
    const pi = (((P.cls || {})[cid] || {}).items) || {};
    for (const [iid, x] of Object.entries((r && r.items) || {})) {
      if (!x || !x.done || (pi[iid] && pi[iid].done) || !OBJ_RE.test(`${cid}/${iid}`)) continue;
      const val = { done: true }; if (Number.isFinite(+x.score) && x.score !== '' && x.score != null) val.score = Math.round(+x.score * 10) / 10;
      out.push({ verb: 'submit', obj: `${cid}/${iid}`, val });
    }
  }
  const V = N.vision, PV = P.vision;
  if (V && typeof V === 'object' && V.at && (!PV || PV.at !== V.at)) out.push({ verb: 'vision', obj: '', val: { goals: Array.isArray(V.goals) ? Math.min(9, V.goals.length) : 0, edit: !!PV } });
  const pg = new Set(((PV && Array.isArray(PV.goals)) ? PV.goals : []).filter(g => g && g.done).map((g, i) => String(g.id || i)));
  ((V && Array.isArray(V.goals)) ? V.goals : []).forEach((g, i) => { const id = String((g && g.id) || i); if (g && g.done && !pg.has(id)) out.push({ verb: 'goal', obj: /^[\w-]{1,60}$/.test(id) ? id : '', val: { n: i + 1 } }); });
  return out.slice(0, 100);
}
/* 조회(GET /api/lev): cls(과정 id) · sid · verb · after(id), 최대 500건. scope(교수자)면 담당 반 · 학생만 */
async function query(c, tid, q, scope) {
  const w = ['tenant_id = $1']; const a = [tid];
  const cls = String(q.get('cls') || ''), sid = String(q.get('sid') || ''), verb = String(q.get('verb') || ''), after = Math.max(0, Math.round(+q.get('after') || 0));
  if (cls) { if (!/^[\w-]{1,60}$/.test(cls)) throw new LevErr('cls 형식이 올바르지 않습니다.', 'lev_obj'); a.push(cls + '/%'); w.push(`(obj like $${a.length})`); }
  if (sid) { a.push(sid); w.push(`sid = $${a.length}`); }
  if (verb) { if (!VERBS.includes(verb)) throw new LevErr('verb가 올바르지 않습니다.', 'lev_verb'); a.push(verb); w.push(`verb = $${a.length}`); }
  if (after) { a.push(after); w.push(`id > $${a.length}`); }
  const rows = (await c.query(`select id, sid, verb, obj, lvl, val, src, trust, at from learning_event where ${w.join(' and ')} order by id limit 500`, a)).rows
    .filter(r => !scope || (scope.sids.has(String(r.sid)) && (!r.obj.includes('/') || scope.classes.has(r.obj.split('/')[0]))));
  return { rows: rows.map(r => ({ id: +r.id, sid: r.sid, verb: r.verb, obj: r.obj, lvl: r.lvl, val: r.val, src: r.src, trust: r.trust, at: r.at })), next: rows.length ? +rows[rows.length - 1].id : after };
}
module.exports = { VERBS, MAX_BATCH, LevErr, cleanEvent, cleanVal, cleanBatch, insert, server, diffLp, query };
