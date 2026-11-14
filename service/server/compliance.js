'use strict';
/* v30 규정 준수(고용노동부 원격훈련 · 내일배움카드 · 원격평생교육) 서버 기능
   - 학습 활동 로그(cpl_log): 로그인 · 차시별 학습시간 · 본인확인 · IP를 기관 DB에 원본으로 보관 — 별표 1 자료보존
   - 1일 학습시간 제한: 서버가 합산해 판정(브라우저 값을 믿지 않는다)
   - 동시접속 방지: 정책이 켜진 기관은 새 로그인이 이전 세션을 끊는다
   - 본인확인: 실제 제공사(휴대폰 · 공단 MOTP)는 계약 · 규격 확정 뒤 어댑터로 붙인다. 미연동이면 501 provider_missing */
const crypto = require('node:crypto');

const { pwRule } = require('./pwrule');
  /* v38 출석률(화면 attcalc.js DDAtt와 같은 식): 출결 수업 = 회차 클래스의 회차 또는 라이브 · 오프라인 항목. 입력된 회차 + 어제까지 지난 미입력 회차(결석). 수강 제외 회차는 뺀다.
   고용노동부 프로필은 지각 · 조퇴 · 외출 3회 = 결석 1회. 출결 수업이 없으면 null(출석률을 보지 않음). Java CplServiceImpl.attRate와 같은 규칙 */
const ATT_LATE = ['지각', '조퇴', '외출']; const ATT_OK = ['출석', '결석', ...ATT_LATE];
const attRate = (cl, mid, conv, today) => { if (!cl || !mid) return null; const A = cl.att && typeof cl.att === 'object' ? cl.att : {}; const ex = new Set(((((cl.enr || {})[mid]) || {}).ex) || []);
  const U = cl.kind === 'episode' && Array.isArray(cl.sessions) && cl.sessions.length ? cl.sessions.map(x => ({ id: x && x.id, date: String((x && x.date) || '') })) : (Array.isArray(cl.curriculum) ? cl.curriculum : []).filter(i => i && (i.type === 'live' || i.type === 'offline')).map(i => ({ id: i.id, date: String(i.date || i.from || i.at || '').slice(0, 10) }));
  if (!U.length) return null; const stOf = v => String((v && typeof v === 'object' ? v.st : v) || ''); const rows = U.filter(u => !ex.has(u.id)).map(u => ({ date: u.date, st: A[u.id] && typeof A[u.id] === 'object' ? stOf(A[u.id][mid]) : '' }));
  Object.keys(A).forEach(k => { if (k.startsWith(mid + ':') && typeof A[k] !== 'object') rows.push({ date: '', st: stOf(A[k]) }); });
  let D = 0, abs = 0, late = 0; rows.forEach(r => { if (r.st && r.st !== '미입력' && ATT_OK.includes(r.st)) { D++; if (r.st === '결석') abs++; if (ATT_LATE.includes(r.st)) late++; } else if (!r.st && r.date && r.date < today) { D++; abs++; } });
  if (!D) return null; return Math.round((D - (abs + (conv ? Math.floor(late / 3) : 0))) / D * 100); };
function createCompliance({ pool, inTenant, readBody, limit, ip, HttpErr, hashPw, checkPw, pii, crypt, env = {}, mileHook }) {
  const KEY_RE = /^[\w-]{1,60}$/;
  /* 시험 답안 포함 요청이 있어 본문 상한을 넉넉히 둔다 */
  const dev = env.IDV_DEV === '1'; const pending = new Map();
  const policy = async (c, tid) => (await c.query("select doc->'org'->'cpl' p from tenant_state where tenant_id = $1", [tid])).rows[0]?.p || null;
  const rec = (c, tid, sid, kind, o = {}) => c.query('insert into cpl_log (tenant_id, sid, kind, cls, item, secs, ip, ua, eval_cd, chasi) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [tid, sid, kind, o.cls || null, o.item || null, o.secs || 0, o.ip || null, o.ua ? String(o.ua).slice(0, 160) : null, o.evalCd || null, o.chasi == null ? null : o.chasi]);
  const dayMaxOf = P => { const h = +(P && P.dayMax); return P && P.on && h > 0 ? Math.min(24, h) * 3600 : 0; };
  const today = async (c, tid, sid) => +(await c.query("select coalesce(sum(secs), 0) s from cpl_log where tenant_id = $1 and sid = $2 and kind = 'beat' and day = (now() at time zone 'Asia/Seoul')::date", [tid, sid])).rows[0].s;

  /* 로그인 직후: 활동 기록 + 동시접속 방지(최신 로그인만 유지) */
  async function afterLogin(req, tid, sid, keepHash) {
    const P = await inTenant(pool, tid, async c => { const p = await policy(c, tid); if (p && p.on) await rec(c, tid, sid, 'login', { ip: ip(req), ua: req.headers['user-agent'] }); return p; });
    if (P && P.on && P.single) await pool.query('delete from learner_sessions where tenant_id = $1 and sid = $2 and id <> $3', [tid, sid, keepHash]);
  }

  /* 단체가입 최초 로그인 · 중도탈락: 학습 활동 전에 서버가 확인한다 */
  const needSecs = it => { if (+it.cplMin > 0) return +it.cplMin * 60; const d = it.yt && it.yt.dur; if (typeof d === 'number' && d > 0) return d; if (typeof d === 'string' && /^\d+:\d{2}(:\d{2})?$/.test(d)) return d.split(':').map(Number).reduce((a, x) => a * 60 + x, 0); if (+it.dur > 0) return +it.dur; return 600; };
  const videosOf = cl => (Array.isArray(cl && cl.curriculum) ? cl.curriculum : []).filter(i => i && i.type === 'video');
  const itemSecs = async (c, tid, sid, cls) => Object.fromEntries((await c.query("select item, coalesce(sum(secs), 0)::int s from cpl_log where tenant_id = $1 and sid = $2 and cls = $3 and kind = 'beat' group by item", [tid, sid, cls])).rows.map(r => [r.item, r.s]));
  const itemDone = (P, it, secs) => { const s = +secs[it.id] || 0; return +P.itemMin > 0 ? s >= Math.ceil(needSecs(it) * +P.itemMin / 100) : s > 0; };
  const rateOf = (P, cl, secs) => { const V = videosOf(cl); return V.length ? Math.round(V.filter(i => itemDone(P, i, secs)).length / V.length * 100) : 100; };
  async function idvCheck(c, tid, sid, cls, kind) { const P = await policy(c, tid); if (!env.IDV_ENFORCE || env.IDV_ENFORCE !== '1' || !P || !P.on || !(P.idv && (P.idv.phone || P.idv.motp))) return; const hit = async (cd, extra) => !!(await c.query(`select 1 from cpl_log where tenant_id = $1 and sid = $2 and cls = $3 and kind in ('verify-phone', 'verify-motp', 'review') and eval_cd = $4 ${extra} limit 1`, [tid, sid, cls, cd])).rows[0]; if (!(await hit('00', ''))) throw new HttpErr(403, '입과 본인인증을 먼저 진행해 주십시오.', 'idv_required'); const today = "and day = (now() at time zone 'Asia/Seoul')::date"; /* 입과 당일은 입과 인증이 1일 1회 인증을 겸한다(학습자 화면과 같은 기준) */ if (kind === 'beat' && !(await hit('01', today)) && !(await hit('00', today))) throw new HttpErr(403, '오늘의 진도 본인인증을 먼저 진행해 주십시오.', 'idv_required'); if (kind === 'exam-start' && P.idv.motp && !(await hit('02', "and at > now() - interval '60 minutes'"))) throw new HttpErr(403, '평가 응시 전 본인인증을 먼저 진행해 주십시오.', 'idv_required'); }
  /* 진행 조건: 이전 차시 · 진행평가 · 최소 진도율을 서버가 확인한다 */
  async function flowCheck(c, tid, sid, cls, kind, item) { const P = await policy(c, tid); if (!P || !P.on) return; const r = (await c.query("select x c from tenant_state, jsonb_array_elements(doc->'classes') x where tenant_id = $1 and x->>'id' = $2 limit 1", [tid, cls])).rows[0]; if (!r) return; const cl = r.c; const list = Array.isArray(cl.curriculum) ? cl.curriculum : []; const lpR = (await c.query('select lp from learner_progress where tenant_id = $1 and sid = $2', [tid, sid])).rows[0]; const lpI = (((lpR && lpR.lp && lpR.lp.cls) || {})[cls] || {}).items || {}; const quizDone = i => { const x = lpI[i.id] || {}; const T = Array.isArray(x.tries) ? x.tries.map(t => +(t && t.score) || 0) : []; const best = T.length ? Math.max(...T) : x.score; if (best == null) return false; const pr = i.rules && i.rules.pass; return !(pr && pr.on) || +best >= +pr.v; }; const secs = await itemSecs(c, tid, sid, cls);
    if (kind === 'beat' && P.seq) { for (const i of list) { if (!i || i.id === item) break; if ((i.type === 'video' && !itemDone(P, i, secs)) || (i.type === 'quiz' && !quizDone(i))) throw new HttpErr(403, '이전 차시를 먼저 완료해 주십시오.', 'seq_locked'); } }
    if (kind === 'exam-start') { if (P.seq && list.some(i => i && i.type === 'quiz' && !quizDone(i))) throw new HttpErr(403, '진행평가를 먼저 완료해야 최종평가에 응시할 수 있습니다.', 'exam_quiz'); if (+P.rate > 0 && rateOf(P, cl, secs) < +P.rate) throw new HttpErr(403, `진도율 ${+P.rate}% 이상이어야 평가에 응시할 수 있습니다.`, 'exam_rate'); } }
  async function guard(tid, sid, cls, kind, item) { await inTenant(pool, tid, async c => { await idvCheck(c, tid, sid, cls, kind); await flowCheck(c, tid, sid, cls, kind, item); const P = await policy(c, tid); if (!P || !P.on) return; if (P.groupFirst) { const L = (await c.query('select pw_hash from learners where tenant_id = $1 and sid = $2', [tid, sid])).rows[0]; if (L && !L.pw_hash) throw new HttpErr(403, '최초 로그인 본인인증과 비밀번호 변경을 먼저 진행해 주십시오.', 'group_first'); } const D = (await c.query("select 1 from tenant_state, jsonb_array_elements(doc->'members') m, jsonb_array_elements(doc->'classes') x where tenant_id = $1 and m->>'sid' = $2 and x->>'id' = $3 and jsonb_exists(x->'drop', m->>'id') limit 1", [tid, sid, cls])).rows[0]; if (D) throw new HttpErr(403, '중도탈락 처리된 과정입니다. 훈련기관에 문의해 주십시오.', 'dropped'); }); }
  async function route(req, tid, sid) {
    const b = await readBody(req, 128 * 1024); const kind = String(b.kind || '');
    if (['beat', 'attend', 'exam-start'].includes(kind)) await guard(tid, sid, String(b.cls || ''), kind, String(b.item || ''));
    if (kind === 'pw-change') {
      limit(`cplv:${tid}:${sid}`, 10, 600e3); const pw = String(b.pw || ''), cur = String(b.cur || '');
      const P = await inTenant(pool, tid, c => policy(c, tid)); const strict = P && P.on && /^moel-/.test(String(P.profile || '')); if (strict ? !pwRule(pw) : pw.length < 8 || pw.length > 64) throw new HttpErr(400, '비밀번호는 영문 · 숫자 · 특수문자 중 2종 10자 이상 또는 3종 8자 이상입니다.', 'pw_rule');
      if (pii.isAccount(sid)) { await pii.changePw(tid, sid, cur, pw); return { ok: true }; }
      return inTenant(pool, tid, async c => { const L = (await c.query('select pw_hash from learners where tenant_id = $1 and sid = $2', [tid, sid])).rows[0]; if (!L || !L.pw_hash || !(await checkPw(cur, L.pw_hash))) throw new HttpErr(401, '비밀번호가 올바르지 않습니다.', 'login'); await c.query('update learners set pw_hash = $3 where tenant_id = $1 and sid = $2', [tid, sid, await hashPw(pw)]); await rec(c, tid, sid, 'group-pw', { ip: ip(req) }); return { ok: true }; });
    }
    if (kind === 'group-pw') {
      limit(`cplv:${tid}:${sid}`, 10, 600e3); const pw = String(b.pw || ''); if (!pwRule(pw)) throw new HttpErr(400, '비밀번호는 영문 · 숫자 · 특수문자 중 2종 10자 이상 또는 3종 8자 이상입니다.', 'pw_rule');
      return inTenant(pool, tid, async c => { const L = (await c.query('select pw_hash from learners where tenant_id = $1 and sid = $2', [tid, sid])).rows[0]; if (!L) throw new HttpErr(403, '단체가입 계정이 아닙니다.', 'group_none'); if (dev) { const v = (await c.query("select 1 from cpl_log where tenant_id = $1 and sid = $2 and kind in ('verify-phone', 'review') and at > now() - interval '15 minutes' limit 1", [tid, sid])).rows[0]; if (!v) throw new HttpErr(403, '휴대폰 본인인증을 먼저 진행해 주십시오.', 'group_verify'); } await c.query('update learners set pw_hash = $3 where tenant_id = $1 and sid = $2', [tid, sid, await hashPw(pw)]); await rec(c, tid, sid, 'group-pw', { ip: ip(req) }); return { ok: true }; });
    }
    if (kind === 'beat') {
      limit(`cplb:${tid}:${sid}`, 40, 60e3);
      const secs = Math.floor(+b.secs); if (!(secs >= 1 && secs <= 60)) throw new HttpErr(400, '학습시간 값이 올바르지 않습니다.', 'secs');
      const cls = String(b.cls || ''), item = String(b.item || ''); if (!KEY_RE.test(cls) || !KEY_RE.test(item)) throw new HttpErr(400, '과정 정보가 올바르지 않습니다.', 'item');
      return inTenant(pool, tid, async c => { const P = await policy(c, tid); const max = dayMaxOf(P); let s = await today(c, tid, sid); const over = !!max && s >= max;
        const chMax = P && P.on ? Math.floor(+P.dayChasi) || 0 : 0; if (chMax) { const D = (await c.query("select distinct item from cpl_log where tenant_id = $1 and sid = $2 and kind = 'beat' and day = (now() at time zone 'Asia/Seoul')::date", [tid, sid])).rows.map(x => x.item); if (D.length >= chMax && !D.includes(item)) return { today: s, max, over: true, chasi: true }; }
        if (P && P.on && !over) {
          /* 직전 기록 이후 실제로 흐른 시간보다 많이 적립하지 않는다 */
          const el = (await c.query("select extract(epoch from now() - max(at)) e from cpl_log where tenant_id = $1 and sid = $2 and kind = 'beat'", [tid, sid])).rows[0].e;
          const room = el == null ? secs : Math.ceil(+el) + 5; const add = Math.min(secs, room, max ? max - s : secs); if (add > 0) { await rec(c, tid, sid, 'beat', { cls, item, secs: add, ip: ip(req) }); s += add;
            if (mileHook && s >= 600 && s - add < 600) await mileHook((q, v) => c.query(q, v), tid, sid, 'attend_day', 'day', new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), Math.floor(s / 60), 'A', cls); } /* v42 오늘 학습 10분을 넘긴 순간 출석 1회(신뢰 A) */
        }
        return { today: s, max, over: !!max && s >= max }; });
    }
    if (kind === 'review-skip') {
      limit(`cplv:${tid}:${sid}`, 60, 600e3); const evalCd = ['00', '01', '02', '03', '04'].includes(String(b.evalCd)) ? String(b.evalCd) : null; const chasi = Number.isInteger(+b.chasi) && +b.chasi >= 0 && +b.chasi < 1000 ? +b.chasi : null; const cls = KEY_RE.test(String(b.cls || '')) ? String(b.cls) : null;
      return inTenant(pool, tid, async c => { const P = await policy(c, tid); const L = P && P.on && Array.isArray(P.reviewers) ? P.reviewers.map(String) : []; if (!L.includes(String(sid))) throw new HttpErr(403, '심사자로 지정된 계정이 아닙니다.', 'reviewer'); await rec(c, tid, sid, 'review', { cls, evalCd, chasi, ip: ip(req) }); return { ok: true }; });
    }
    if (kind === 'verify-start' || kind === 'verify-confirm') {
      const method = String(b.method || ''); if (!['phone', 'motp'].includes(method)) throw new HttpErr(400, '본인확인 방식이 올바르지 않습니다.', 'method');
      limit(`cplv:${tid}:${sid}`, 10, 600e3);
      if (!dev) throw new HttpErr(501, '본인확인 제공사가 아직 연동되지 않았습니다.', 'provider_missing');
      const k = `${tid}|${sid}|${method}`;
      if (kind === 'verify-start') { const code = String(crypto.randomInt(100000, 1000000)); pending.set(k, { code, exp: Date.now() + 300e3 }); return { ok: true, ttl: 300, dev_code: code }; }
      const p = pending.get(k); if (!p || p.exp < Date.now() || p.code !== String(b.code || '')) throw new HttpErr(400, '인증번호가 올바르지 않습니다.', 'code');
      pending.delete(k); const evalCd = ['00', '01', '02', '03', '04'].includes(String(b.evalCd)) ? String(b.evalCd) : null; const chasi = Number.isInteger(+b.chasi) && +b.chasi >= 0 && +b.chasi < 1000 ? +b.chasi : null; const cls = KEY_RE.test(String(b.cls || '')) ? String(b.cls) : null; await inTenant(pool, tid, c => rec(c, tid, sid, 'verify-' + method, { cls, evalCd, chasi, ip: ip(req), ua: req.headers['user-agent'] })); return { ok: true };
    }
    if (kind === 'attend') {
      limit(`cpla:${tid}:${sid}`, 10, 600e3);
      const cls = String(b.cls || ''), code = String(b.code || '');
      return inTenant(pool, tid, async c => { const P = await policy(c, tid); const A = P && P.on && P.attend; if (!A || A.cls !== cls || A.code !== code || !(+A.exp > Date.now())) throw new HttpErr(400, '출석 코드가 올바르지 않거나 만료되었습니다.', 'attend'); const dup = (await c.query("select 1 from cpl_log where tenant_id = $1 and sid = $2 and kind = 'attend' and cls = $3 and day = (now() at time zone 'Asia/Seoul')::date limit 1", [tid, sid, cls])).rows.length; if (!dup) await rec(c, tid, sid, 'attend', { cls, ip: ip(req), ua: req.headers['user-agent'] }); return { ok: true }; });
    }
    if (kind === 'exam-start') return examStart(tid, sid, String(b.cls || ''), String(b.item || ''));
    if (kind === 'exam-submit') return examSubmit(tid, sid, String(b.attempt || ''), b.ans);
    throw new HttpErr(400, '지원하지 않는 요청입니다.', 'kind');
  }

  /* 서버 출제 · 채점: 정답은 기관 상태에만 있고 학습자에게 보내지 않는다 */
  const notOpen = () => new HttpErr(400, '응시할 수 없는 평가입니다.', 'exam_closed');
  const parseT = (v, end) => { if (!v) return null; let s = String(v); if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += end ? 'T23:59:59' : 'T00:00:00'; if (!/(Z|[+-]\d{2}:\d{2})$/.test(s)) s += '+09:00'; const t = Date.parse(s); return Number.isFinite(t) ? t : null; };
  const norm = s => String(s ?? '').toLowerCase().replace(/\s+/g, '');
  const right = (q, v) => { if (v == null || v === '') return false; const t = q.t; if (t === 'mc') return String(v) === String(q.a); if (t === 'ox') return String(v).toUpperCase() === String(q.a).toUpperCase(); if (t === 'essay') return !!String(v).trim(); if (norm(v) && norm(v) === norm(q.a)) return true; const P = String(q.a ?? '').split(/[,/·]/).map(norm).filter(Boolean); return P.length > 1 && P.every(x => norm(v).includes(x)); };
  async function examItem(c, tid, cls, item) { if (!KEY_RE.test(cls) || !KEY_RE.test(item)) throw notOpen(); const r = (await c.query("select x c, doc->'org'->'cpl' p from tenant_state, jsonb_array_elements(doc->'classes') x where tenant_id = $1 and x->>'id' = $2 limit 1", [tid, cls])).rows[0]; if (!r || !r.p || !r.p.on) throw notOpen(); const it = (r.c.curriculum || []).find(x => x && x.id === item); if (!it || it.type !== 'exam' || !Array.isArray(it.qs) || !it.qs.length) throw notOpen(); return { it, P: r.p }; }
  const classOf = async (c, tid, cls) => (await c.query("select x c from tenant_state, jsonb_array_elements(doc->'classes') x where tenant_id = $1 and x->>'id' = $2 limit 1", [tid, cls])).rows[0].c;
  const qOut = (it, order) => order.map(i => { const q = it.qs[i] || {}; return { i, t: q.t || 'mc', q: String(q.q ?? ''), opts: Array.isArray(q.opts) ? q.opts : [], pts: +q.pts || 1 }; });
  async function examStart(tid, sid, cls, item) { limit(`cplx:${tid}:${sid}`, 30, 600e3);
    return inTenant(pool, tid, async c => { const { it, P: P0 } = await examItem(c, tid, cls, item); const R = it.rules || {}; const now = Date.now();
      const open = (await c.query('select id, qorder, ends_at from cpl_exam where tenant_id = $1 and sid = $2 and cls = $3 and item = $4 and submitted_at is null order by started_at desc limit 1', [tid, sid, cls, item])).rows[0];
      if (open && (!open.ends_at || +new Date(open.ends_at) + 60e3 > now)) return { attempt: open.id, end: open.ends_at ? +new Date(open.ends_at) : 0, qs: qOut(it, open.qorder), resumed: true };
      if (open) await c.query('update cpl_exam set submitted_at = now(), score = 0, pass = false, late = true where id = $1', [open.id]);
      const f = parseT(R.from), to = parseT(R.to, true); if ((f && now < f) || (to && now > to)) throw notOpen();
      const T = (await c.query('select score from cpl_exam where tenant_id = $1 and sid = $2 and cls = $3 and item = $4 and submitted_at is not null', [tid, sid, cls, item])).rows.map(x => +x.score || 0); const rt = R.retry || {}; const best = T.length ? Math.max(...T) : null; const passV = R.pass && R.pass.on ? +R.pass.v : null;
      /* 공단 체크리스트 31: 재응시 불가, N차 평가는 훈련 종료 다음 날부터 1주 이내(규칙을 따로 정하지 않은 시험) */
      if (!R.retry && T.length) { const clsEnd = parseT((await classOf(c, tid, cls)).end, true); const failed = (P0.pass > 0 ? best < +P0.pass : false) && T.length === 1; if (!(failed && clsEnd && now > clsEnd && now <= clsEnd + 7 * 864e5)) throw notOpen(); }
      if (R.retry) { if (rt.mode === 'none' && T.length >= 1) throw notOpen(); if (rt.mode === 'count' && (T.length >= +rt.v || (passV != null && best != null && best >= passV))) throw notOpen(); if (rt.mode === 'score' && best != null && best >= +rt.v) throw notOpen(); }
      const idx = it.qs.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; } const n = +it.cplN > 0 ? Math.min(+it.cplN, idx.length) : idx.length; const order = idx.slice(0, n);
      const id = 'ex' + crypto.randomBytes(12).toString('hex'); const ends = +it.time > 0 ? new Date(now + it.time * 60e3) : null;
      await c.query('insert into cpl_exam (id, tenant_id, sid, cls, item, qorder, ends_at) values ($1, $2, $3, $4, $5, $6, $7)', [id, tid, sid, cls, item, JSON.stringify(order), ends]);
      return { attempt: id, end: ends ? +ends : 0, qs: qOut(it, order), resumed: false }; }); }
  async function examSubmit(tid, sid, attempt, ans) { limit(`cplx:${tid}:${sid}`, 30, 600e3); const A = ans && typeof ans === 'object' && !Array.isArray(ans) ? ans : {};
    return inTenant(pool, tid, async c => { const r = (await c.query('select id, cls, item, qorder, ends_at from cpl_exam where id = $1 and tenant_id = $2 and sid = $3 and submitted_at is null', [attempt, tid, sid])).rows[0]; if (!r) throw new HttpErr(400, '응시 정보가 없거나 이미 제출했습니다.', 'exam_attempt'); const { it, P } = await examItem(c, tid, r.cls, r.item); const R = it.rules || {};
      const late = !!r.ends_at && Date.now() > +new Date(r.ends_at) + 60e3; let sc = 0, tot = 0; const clean = {}; const res = r.qorder.map(i => { const q = it.qs[i] || {}; const p = +q.pts || 1; tot += p; const v = late || A[i] == null ? '' : String(A[i]).slice(0, 2000); clean[i] = v; const ok = right(q, v); if (ok) sc += p; return { i, ok }; });
      const score = Math.round(sc / Math.max(1, tot) * 100); const pass = R.pass && R.pass.on ? score >= +R.pass.v : +P.pass > 0 ? score >= +P.pass : null;
      await c.query('update cpl_exam set submitted_at = now(), answers = $1, score = $2, pass = $3, late = $4 where id = $5', [JSON.stringify(clean), score, pass, late, r.id]);
      if (mileHook && !late) await mileHook((q, v) => c.query(q, v), tid, sid, 'exam_score', 'exam', `${r.cls}/${r.item}#${r.id}`, score, 'A', r.cls); /* v42 시험마다 최고 구간만(재응시는 #응시번호) */
      const clsEnd = parseT((await classOf(c, tid, r.cls)).end, true); const moel = /^moel-/.test(String(P.profile || '')); const hideRes = R.show === 'never' || R.show === 'end' || (moel && !(clsEnd && Date.now() > clsEnd + 7 * 864e5)); return { score, pass, late, res: hideRes ? [] : res }; }); }
  /* 서술형 답안 베낀 답안 검사: 유사도는 화면의 과제 검사와 같은 3-gram */
  const grams = t => { const x = String(t).replace(/\s+/g, ''); const G = new Set(); for (let i = 0; i + 3 <= x.length; i++) G.add(x.slice(i, i + 3)); return G; };
  const simil = (a, b) => { const A = grams(a), B = grams(b); if (!A.size || !B.size) return 0; let n = 0; A.forEach(g => { if (B.has(g)) n++; }); return Math.round(n / (A.size + B.size - n) * 100); };
  const examCopy = a => inTenant(pool, a.tid, async c => { const P = (await policy(c, a.tid)) || {}; const thr = +P.copyThr || 80; const CL = (await c.query("select doc->'classes' x from tenant_state where tenant_id = $1", [a.tid])).rows[0]; const classes = CL && Array.isArray(CL.x) ? CL.x : []; const rows = (await c.query('select sid, cls, item, answers from cpl_exam where tenant_id = $1 and submitted_at is not null order by sid, id limit 5000', [a.tid])).rows; const G = {}; for (const r of rows) { const cl = classes.find(x => x && x.id === r.cls); const it = cl && (cl.curriculum || []).find(x => x && x.id === r.item); const Q = (it && it.qs) || []; for (const [k, v] of Object.entries(r.answers || {})) { if (!Q[+k] || Q[+k].t !== 'essay') continue; const t = String(v == null ? '' : v); if (t.trim().length < 30) continue; ((G[`${r.cls}|${r.item}|${k}`] = G[`${r.cls}|${r.item}|${k}`] || [])).push({ sid: r.sid, t }); } } const out = []; for (const key of Object.keys(G).sort()) { const [cls, item, q] = key.split('|'); const L = G[key]; for (let i = 0; i < L.length && i < 500; i++) for (let j = i + 1; j < L.length && j < 500; j++) { if (L[i].sid === L[j].sid) continue; const s = simil(L[i].t, L[j].t); if (s >= thr) out.push({ cls, item, q: +q, a: L[i].sid, b: L[j].sid, s }); } } out.sort((x, y) => y.s - x.s || (x.cls + x.item + x.q + x.a + x.b < y.cls + y.item + y.q + y.a + y.b ? -1 : 1)); return { rows: out.slice(0, 100), thr }; });
  const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  /* 서버 수료 판정: 학습 로그 · 서버 채점만 사용하고 브라우저 진도는 쓰지 않는다. v38 고용노동부 프로필은 출결 수업 출석률 80% 이상도 */
  const completion = a => inTenant(pool, a.tid, async c => { const P = (await policy(c, a.tid)) || {}; const d = (await c.query("select doc->'classes' cl, doc->'members' ms from tenant_state where tenant_id = $1", [a.tid])).rows[0]; const out = []; if (!d || !Array.isArray(d.cl)) return { rows: out }; const sidOf = {}; (Array.isArray(d.ms) ? d.ms : []).forEach(m => { if (m && m.id) sidOf[m.id] = m.sid || crypt.memberName(m, a.tid); }); const beat = {}; for (const r of (await c.query("select sid, cls, item, coalesce(sum(secs), 0)::int s from cpl_log where tenant_id = $1 and kind = 'beat' group by sid, cls, item order by sid, cls, item", [a.tid])).rows) ((beat[`${r.sid}|${r.cls}`] = beat[`${r.sid}|${r.cls}`] || {}))[r.item] = r.s; const best = {}; for (const r of (await c.query('select sid, cls, item, max(score)::int s from cpl_exam where tenant_id = $1 and submitted_at is not null group by sid, cls, item', [a.tid])).rows) ((best[`${r.sid}|${r.cls}`] = best[`${r.sid}|${r.cls}`] || {}))[r.item] = r.s; const today = kstDay(); for (const cl of d.cl) { if (!cl || !Array.isArray(cl.learners)) continue; const EX = (Array.isArray(cl.curriculum) ? cl.curriculum : []).filter(i => i && i.type === 'exam'); for (const id of cl.learners) { const sid = sidOf[id]; if (!sid) continue; const secs = beat[`${sid}|${cl.id}`] || {}; const rate = rateOf(P, cl, secs); const bs = best[`${sid}|${cl.id}`] || {}; const scores = {}; EX.forEach(e => { if (bs[e.id] != null) scores[e.id] = bs[e.id]; }); const V = Object.values(scores); const score = EX.length && V.length === EX.length ? Math.min(...V) : null; const need = +P.rate || 0; const pass = +P.pass || 0; const moel = /^moel-/.test(String(P.profile || '')); const att = attRate(cl, id, moel, today); const done = rate >= need && (!EX.length || (score != null && score >= pass)) && (!moel || att == null || att >= 80); out.push({ cls: cl.id, sid, rate, score, att, done, items: secs, scores }); } } return { rows: out }; });
  const exams = a => inTenant(pool, a.tid, async c => ({ rows: (await c.query(`select sid, cls, item, score, pass, late, to_char(submitted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') at from cpl_exam where tenant_id = $1 and submitted_at is not null order by submitted_at desc limit 2000`, [a.tid])).rows }));

  /* 어드민: 훈련생별 집계 · 원본 로그 */
  const summary = a => inTenant(pool, a.tid, async c => ({ rows: (await c.query(`select sid, coalesce(sum(secs) filter (where kind = 'beat'), 0)::int secs,
      coalesce(sum(secs) filter (where kind = 'beat' and day = (now() at time zone 'Asia/Seoul')::date), 0)::int today,
      count(distinct ip)::int ips, to_char(max(at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') last, (count(*) filter (where kind like 'verify-%'))::int verified
      from cpl_log where tenant_id = $1 group by sid order by max(at) desc limit 1000`, [a.tid])).rows }));
  const logs = (a, url) => { const sid = url.searchParams.get('sid') || ''; const n = Math.min(2000, Math.max(1, +url.searchParams.get('limit') || 200));
    return inTenant(pool, a.tid, async c => ({ rows: (await c.query(`select id::text, sid, kind, cls, item, secs, ip, ua, eval_cd, chasi, to_char(at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') at from cpl_log where tenant_id = $1 and ($2 = '' or sid = $2) order by cpl_log.id desc limit $3`, [a.tid, sid, n])).rows })); };
  return { afterLogin, route, summary, logs, exams, examCopy, completion };
}
module.exports = { createCompliance, attRate };
