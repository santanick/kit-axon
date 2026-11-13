'use strict';
/* v40 시설 · 장비 예약 서버 모듈(02 명세 3-2 · 4 · 5 · 6 · 9절).
   - sql/NN_*.sql : db.js가 lms 묶음과 같은 방식(lms_schema에 'fac/<파일>'로 기록)으로 이어 붙인다.
   - 공개 /api/pub/<tid>/fac-* : mod-pub.js,  운영자 /api/fac/* : mod-admin.js(경로 매개변수 :id는 match()가 푼다).
   - 설정(시설 · 요금 · 규칙 · 상품)은 기관 문서 게시본 doc.lsite.pub.fac(없으면 doc.fac)이 원본, 예약 · 결제 · 입장은 이 모듈의 표가 원본.
   - 금액은 언제나 서버가 calc.quote로 다시 계산한다. 동시 예약은 advisory 락 + fac_slot 기본키 · 동일인 유일 인덱스가 최종 방어선. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const calc = require('./calc');
const { createQr } = require('./qr');
const { createPay } = require('./pay');
const { sweep, tickAll } = require('./sweep');
const SQL = path.join(__dirname, 'sql');

function sqlMigrations() {
  if (!fs.existsSync(SQL)) return [];
  return fs.readdirSync(SQL).filter(f => /^\d\d_[a-z0-9_]+\.sql$/.test(f)).sort().map(f => ['fac/' + f, fs.readFileSync(path.join(SQL, f), 'utf8')]);
}

const rid = p => p + Array.from(crypto.randomBytes(12), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const hid = (p, s) => p + Array.from(crypto.createHash('sha256').update(s).digest().subarray(0, 12), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
const tail = s => String(s || '').slice(-4);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const ACTIVE = ['requested', 'approved', 'confirmed', 'checked_in'];
const COURSE_Q = `select c->>'id' id, c->>'end' e from tenant_state t, jsonb_array_elements(case when jsonb_typeof(t.doc->'classes') = 'array' then t.doc->'classes' else '[]'::jsonb end) c
  where t.tenant_id = $1 and jsonb_typeof(c->'learners') = 'array' and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(t.doc->'members') = 'array' then t.doc->'members' else '[]'::jsonb end) m where m->>'sid' = $2 and c->'learners' @> jsonb_build_array(m->'id'))`;

function createFac(ctx) {
  const { pool, HttpErr, audit, env = process.env } = ctx;
  /* 기관 범위 트랜잭션 + 알림 메일: 트랜잭션 안에서 모은 메일은 커밋된 뒤에만 보낸다(롤백되면 버림). 메일 미설정이면 mail()이 false */
  const baseTx = ctx.inTenant; const inTenant = async (p, tid, fn) => { const jobs = []; const r = await baseTx(p, tid, async c => { c.facMail = jobs; try { return await fn(c); } finally { c.facMail = null; } }); if (jobs.length) flushMail(tid, jobs); return r; };
  ctx = { ...ctx, inTenant };
  const MAILS = {
    confirmed: d => ['예약이 확정됐어요', `${d.facName || '시설'} ${d.day || ''} ${d.from || ''}~${d.to || ''} 예약이 확정됐어요.\n예약 번호: ${d.booking}\n이용 당일 앱의 「오늘 예약」에서 입장 QR을 열어 주세요.`],
    approved: d => ['신청이 승인됐어요', `${d.facName || '시설'} 신청이 승인됐어요.\n신청 번호: ${d.booking || d.rental}\n결제가 필요하면 앱의 「내 예약」에서 이어서 진행해 주세요.`],
    rejected: d => ['신청이 반려됐어요', `${d.facName || '시설'} 신청이 반려됐어요.\n신청 번호: ${d.booking || d.rental}\n사유: ${d.reason || '-'}`],
    suspended: d => ['예약이 잠시 정지됐어요', `노쇼(미입장 자동 취소)가 ${d.strikes}회 쌓여 ${d.until}까지 ${d.facName || '시설'} 예약을 할 수 없어요.`],
    refund: d => ['환불이 처리됐어요', `${Number(d.amount || 0).toLocaleString('ko-KR')}원 환불이 접수됐어요. 입금까지 영업일 기준 3~5일 걸려요.`]
  };
  function flushMail(tid, jobs) { if (typeof ctx.mail !== 'function') return; for (const j of jobs) { const M = MAILS[j.kind]; if (!M) continue; const [sub, text] = M(j.data); Promise.resolve().then(() => ctx.mail(tid, j.sid, `[디디쌤 시설 예약] ${sub}`, text)).catch(e => ctx.log && ctx.log.error && ctx.log.error('fac mail', e && e.message)); } }
  const qr = createQr(env); const pay = createPay(env, ctx.fetch);
  const E = (status, code, message, extra) => { const e = new HttpErr(status, message, code); if (extra) e.extra = extra; return e; };
  const sweepMs = env.FAC_SWEEP_MS != null ? Math.max(0, +env.FAC_SWEEP_MS) : 60e3; const lastSweep = new Map();
  /* 요청 시 정리: 같은 기관 · 시설 1분에 한 번 */
  async function sweepNow(c, tid, fac) { const k = tid + '|' + (fac || '*'); const t = lastSweep.get(k) || 0; if (sweepMs && Date.now() - t < sweepMs) return null; lastSweep.set(k, Date.now()); if (lastSweep.size > 5000) lastSweep.clear(); return sweep(c, tid, audit, { fac }, { note, onNoShow }); }

  /* 설정 읽기: 게시본 우선, 학번 명단 · 키오스크 PIN은 운영자 문서에서만(게시하지 않음) */
  async function cfg(c, tid) {
    const r = (await c.query("select coalesce(doc->'lsite'->'pub'->'fac', doc->'fac') f, doc->'fac'->'roster' roster, doc->'fac'->'settings'->>'kioskPin' pin, doc->'org'->>'type' type from tenant_state where tenant_id = $1", [tid])).rows[0];
    if (!r) throw E(404, 'tenant', '없는 기관입니다.');
    const F = r.f && typeof r.f === 'object' ? r.f : {}; const facs = Array.isArray(F.facilities) ? F.facilities.filter(x => x && ID_RE.test(String(x.id || ''))) : []; const prods = Array.isArray(F.products) ? F.products.filter(x => x && ID_RE.test(String(x.id || ''))) : [];
    return { on: F.on !== false, facs, prods, roster: Array.isArray(r.roster) ? r.roster.map(String) : [], pin: r.pin || '', type: r.type };
  }
  const facOf = (C, id) => { const f = C.facs.find(x => x.id === id); if (!f) throw E(404, 'fac', '없는 시설입니다.'); return f; };
  const prodOf = (C, id) => { const p = C.prods.find(x => x.id === id); if (!p) throw E(404, 'product', '없는 상품입니다.'); return p; };
  const resList = f => (Array.isArray(f.resources) && f.resources.length ? f.resources : [{ id: 'r1', name: f.name || '자원 1' }]).filter(r => r && r.on !== false && ID_RE.test(String(r.id || '')));
  const resName = (C, fid, r) => { const f = C.facs.find(x => x.id === fid); const x = f && resList(f).find(y => y.id === r); return x ? String(x.name || r) : r; };
  const rules = f => ({ dupSame: true, noShowMin: 15, noShowStrikes: 3, suspendDays: 30, holdMin: 10, maxActive: 0, ...(f.rules || {}) });
  const note = (c, tid, sid, kind, data) => { if (!sid || String(sid).startsWith('walkin-')) return null; if (MAILS[kind] && c.facMail) c.facMail.push({ sid, kind, data }); return c.query("insert into learner_events (tenant_id, sid, type, xid, data) values ($1, $2, 'fac-note', $3, $4)", [tid, sid, str(data.booking || data.pass || data.rental || '', 40), JSON.stringify({ kind, ...data })]); };
  const bkMail = (C, b) => ({ booking: b.id, fac: b.fac_id, facName: (C.facs.find(x => x.id === b.fac_id) || {}).name || '', day: typeof b.day === 'string' ? b.day : calc.kstDay(b.start_at), from: calc.isoKst(b.start_at).slice(11, 16), to: calc.isoKst(b.end_at).slice(11, 16) });
  /* 수강생 자율이용권 자동 발급: 게시본 상품 type 'pass-course' + cls(강좌 id) — 이 학습자가 그 강좌 수강생(doc.classes[].learners ∋ members[sid].id)이면 한 번만 발급 */
  async function ensureCourse(c, tid, sid, C) {
    const P = C.prods.filter(p => p.type === 'pass-course' && p.cls && C.facs.some(f => f.id === p.fac)); if (!P.length) return 0;
    const cls = (await c.query(COURSE_Q, [tid, sid])).rows; let n = 0; const today = calc.kstDay(Date.now());
    for (const p of P) { const k = cls.find(x => x.id === String(p.cls)); if (!k) continue;
      const end = +p.days > 0 ? calc.addDays(today, Math.round(+p.days) - 1) : DAY_RE.test(k.e || '') && k.e >= today ? k.e : calc.addDays(today, 364);
      const total = +p.count > 0 ? Math.round(+p.count) : calc.diffDays(today, end) + 1; const id = hid('ps_', `${tid}|${sid}|course|${p.id}`);
      const r = await c.query("insert into fac_pass (tenant_id, id, sid, product_id, fac_id, aud, kind, total, starts_on, ends_on, status, amount, cls_id, by_staff) values ($1,$2,$3,$4,$5,'student','course',$6,$7,$8,'active',0,$9,'system') on conflict (tenant_id, id) do nothing", [tid, id, sid, p.id, p.fac, total, today, end, String(p.cls)]);
      if (r.rowCount) { n++; await audit(c, tid, 'system', 'fac.pass.course', { pass: id, product: p.id, cls: String(p.cls) }); await note(c, tid, sid, 'pass', { pass: id }); } }
    return n;
  }
  /* 노쇼가 쌓여 정지되면 메일 · 앱 알림(sweep이 부른다) */
  async function onNoShow(c, tid, rows) { const C = await cfg(c, tid); for (const x of rows) { const f = C.facs.find(y => y.id === x.fac_id); if (!f) continue; const until = await suspendedOf(c, tid, f, x.sid);
    if (until) { const R = rules(f); await note(c, tid, x.sid, 'suspended', { fac: f.id, facName: f.name || '', until, strikes: R.noShowStrikes }); } } }
  /* 결제 방식: 이용권 · 0원 → 무료, 온라인은 상점 키가 있을 때만(결정 1) */
  function payModeOf(f, final, want, viaPass) {
    if (viaPass) return 'pass'; if (!final) return 'free';
    const m = f.pay || 'onsite'; if (m === 'free') return 'free';
    if (want === 'onsite') return 'onsite';
    if (m === 'online' || (m === 'after-approve' && want === 'online')) { if (!pay.online()) { if (want === 'online') throw E(409, 'onsite_only', '지금은 현장 결제만 가능해요.'); return 'onsite'; } return 'online'; }
    return m === 'after-approve' ? 'after-approve' : 'onsite';
  }
  /* 구성원 확인(결정 2): 명단이 있으면 자동 대조, 없으면 운영자 승인 */
  function verifyOf(C, q, memberNo) { if (!q.needVerify) return 'none'; if (!memberNo) throw E(403, 'verify', '학번(사번)을 입력해 주세요.'); if (C.roster.length) { if (!C.roster.includes(memberNo)) throw E(403, 'verify', '구성원 명단에서 확인되지 않아요. 일반 요금으로 신청하거나 학번을 다시 확인해 주세요.'); return 'auto'; } return 'manual'; }
  async function suspendedOf(c, tid, f, sid) {
    const R = rules(f); if (!(+R.noShowStrikes > 0)) return null;
    const days = (await c.query("select to_char(day, 'YYYY-MM-DD') d from fac_booking where tenant_id = $1 and sid = $2 and fac_id = $3 and status = 'no_show' and day > current_date - 400 order by day", [tid, sid, f.id])).rows.map(r => r.d);
    const s = calc.suspension({ noShowDays: days, strikes: R.noShowStrikes, days: R.suspendDays, today: calc.kstDay(Date.now()) }); return s.suspended ? s.until : null;
  }
  function cleanExtra(f, extra, consent) {
    const X = Array.isArray(f.extra) ? f.extra.filter(x => x && x.key && x.purpose && +x.keepDays > 0) : []; if (!X.length || !extra || typeof extra !== 'object') return { extra: null, keep: 0 };
    for (const x of X) if (x.required && !str(extra[x.key], 40).trim()) throw E(400, 'extra', `${x.label || x.key}을(를) 입력해 주세요.`);
    if (!consent || consent.extra !== true) { if (X.some(x => x.required)) throw E(400, 'consent', '선택 수집 항목의 수집 · 이용에 동의해 주세요.'); return { extra: null, keep: 0 }; }
    const o = {}; for (const x of X) { const v = str(extra[x.key], 40).trim(); if (v) o[x.key] = v; } return Object.keys(o).length ? { extra: o, keep: Math.max(...X.map(x => +x.keepDays)) } : { extra: null, keep: 0 };
  }
  const bkOut = b => ({ id: b.id, status: b.status, amount: b.amount, payStatus: b.pay_status, holdUntil: b.hold_until ? new Date(b.hold_until).toISOString() : null });

  /* ── 예약 만들기(학습자 fac-book · 운영자 대신 예약 공통) ── */
  async function book(c, tid, who, b) {
    const C = await cfg(c, tid); if (!C.on) throw E(404, 'fac_off', '시설 예약을 쓰지 않는 기관입니다.');
    const f = facOf(C, str(b.fac, 40)); if (f.kind && f.kind !== 'time') throw E(400, 'kind', '시간 예약 시설이 아닙니다.');
    const day = str(b.day, 10); const slot = Math.round(+b.slot), slots = Math.round(+b.slots || 1); const aud = str(b.aud || 'public', 10); const R = rules(f);
    const now = Date.now(); const st = calc.openState(f, day, now);
    if (!st.ok) { if (st.code === 'date' || st.code === 'past') throw E(400, 'date', '날짜를 확인해 주세요.'); if (st.code === 'closed') throw E(409, 'closed', st.reason || '휴관일이에요.'); if (!who.staff) throw E(409, 'not_open', '아직 예약이 열리지 않았어요.', st.opensAt ? { opensAt: st.opensAt } : undefined); }
    const q = calc.quote({ fac: f, aud, day, startSlot: slot, slots });
    if (q.error === 'aud') throw E(403, 'aud', '선택할 수 없는 신청자 구분이에요.'); if (q.error) throw E(400, q.error, '예약 시간을 확인해 주세요.');
    const T = calc.slotTime(f, day, slot, slots); if (T.endAt <= now) throw E(400, 'date', '이미 지난 시간이에요.');
    const sid = who.sid; const memberNo = str(b.memberNo || (who.staff ? '' : sid), 20).trim();
    if (!who.staff) { const until = await suspendedOf(c, tid, f, sid); if (until) throw E(403, 'suspended', `노쇼가 ${R.noShowStrikes}회 쌓여 ${until}까지 예약할 수 없어요.`, { until }); }
    const ver = who.staff ? 'none' : verifyOf(C, q, memberNo);
    let pass = null; const passId = b.passId ? str(b.passId, 40) : '';
    if (passId) { pass = (await c.query("select * from fac_pass where tenant_id = $1 and id = $2 and sid = $3 and status = 'active' and fac_id = $4 and starts_on <= $5::date and ends_on >= $5::date", [tid, passId, sid, f.id, day])).rows[0]; if (!pass) throw E(409, 'pass', '이 날짜에 쓸 수 있는 이용권이 아니에요.'); }
    if (!pass && b.amount != null && Math.round(+b.amount) !== q.final) throw E(400, 'amount', '결제 금액이 요금표와 맞지 않아요. 다시 확인해 주세요.');
    const mode = who.staff ? (q.final ? (b.payMode === 'free' ? 'free' : 'onsite') : 'free') : payModeOf(f, q.final, b.payMode, !!pass);
    const amount = pass || mode === 'free' ? 0 : q.final;
    const id = b.idem ? hid('bk_', `${tid}|${sid}|${str(b.idem, 80)}`) : rid('bk_');
    await c.query('select pg_advisory_xact_lock(hashtext($1))', [`fac|${tid}|${f.id}|${day}`]);
    const prev = (await c.query('select * from fac_booking where tenant_id = $1 and id = $2', [tid, id])).rows[0];
    if (prev) { if (prev.sid !== sid) throw E(409, 'idem', '이미 사용된 요청 번호입니다.'); return { ok: true, booking: bkOut(prev), next: prev.status === 'requested' ? 'wait' : prev.pay_status === 'pending' && prev.pay_mode === 'online' ? 'pay' : 'done', again: true }; }
    if (!who.staff && +R.maxActive > 0) { const n = (await c.query("select count(*)::int n from fac_booking where tenant_id = $1 and sid = $2 and fac_id = $3 and status = any($4) and end_at > now()", [tid, sid, f.id, ACTIVE])).rows[0].n; if (n >= +R.maxActive) throw E(409, 'max_active', `이 시설은 한 번에 ${R.maxActive}건까지 예약할 수 있어요.`); }
    const all = resList(f); const want = b.res ? str(b.res, 40) : ''; if (want && !all.some(r => r.id === want)) throw E(404, 'res', '없는 자원입니다.');
    const per = Math.max(1, Math.min(500, +((f.capacity || {}).perSlot) || 1)); const grp = R.dupSame === false ? null : str(R.exclGroup || f.id, 40);
    let got = null;
    for (const r of want ? all.filter(x => x.id === want) : all) {
      await c.query('savepoint fs'); let ok = true;
      try {
        for (let s = slot; s < slot + slots; s++) {
          const ins = await c.query(`insert into fac_slot (tenant_id, fac_id, res_id, day, slot, seat, booking_id, sid, excl_group)
            select $1, $2, $3, $4, $5, g, $6, $7, $8 from generate_series(1, $9::int) g where not exists (select 1 from fac_slot x where x.tenant_id = $1 and x.res_id = $3 and x.day = $4 and x.slot = $5 and x.seat = g) order by g limit 1
            on conflict (tenant_id, res_id, day, slot, seat) do nothing returning seat`, [tid, f.id, r.id, day, s, id, sid, grp, per]);
          if (!ins.rowCount) { ok = false; break; }
        }
      } catch (e) { await c.query('rollback to savepoint fs'); if (e.code === '23505' && /fac_slot_dup/.test(e.constraint || e.message)) throw E(409, 'dup_same', '같은 시간에 이미 예약한 곳이 있어요.'); throw e; }
      if (ok) { got = r; await c.query('release savepoint fs'); break; } await c.query('rollback to savepoint fs');
    }
    if (!got) { const alt = want ? (await freeRes(c, tid, f, day, slot, slots)).filter(x => x !== want) : []; throw E(409, 'taken', '방금 다른 분이 예약했어요. 다른 자리를 골라 주세요.', { alt }); }
    if (pass && pass.kind === 'count') { const u = await c.query('update fac_pass set used = used + 1 where tenant_id = $1 and id = $2 and used < total', [tid, pass.id]); if (!u.rowCount) throw E(409, 'pass_used_up', '이용권 횟수를 모두 썼어요.'); }
    const status = f.approval || ver === 'manual' ? (who.staff ? 'confirmed' : 'requested') : 'confirmed';
    const payStatus = amount ? 'pending' : 'none'; const hold = status === 'confirmed' && mode === 'online' ? new Date(now + Math.max(1, +R.holdMin || 10) * 60e3) : null;
    const X = who.staff ? { extra: null, keep: 0 } : cleanExtra(f, b.extra, b.consent);
    const row = (await c.query(`insert into fac_booking (tenant_id, id, fac_id, res_id, sid, aud, member_no, day, start_slot, slots, start_at, end_at, noshow_min, status, pay_mode, amount, pay_status, pass_id, note, by_staff, extra, purge_at, hold_until)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) returning *`,
      [tid, id, f.id, got.id, sid, aud, ver === 'none' ? null : memberNo, day, slot, slots, new Date(T.startAt), new Date(T.endAt), Math.max(0, Math.round(+R.noShowMin || 0)), status, mode, amount, payStatus, pass ? pass.id : null, str(b.note, 200) || null, who.staff || null,
        X.extra ? JSON.stringify(X.extra) : null, X.extra ? new Date(T.endAt + X.keep * 864e5) : null, hold])).rows[0];
    if (status === 'confirmed' && mode !== 'online' && !who.staff) await note(c, tid, sid, 'confirmed', bkMail(C, row));
    let orderId; if (mode === 'online' && status === 'confirmed') orderId = await newOrder(c, tid, { booking_id: id }, amount, q.list);
    await audit(c, tid, who.staff || 'learner:' + sid, 'fac.book', { booking: id, fac: f.id, res: got.id, day, slot, slots, amount, mode, status });
    return { ok: true, booking: bkOut(row), next: status === 'requested' ? 'wait' : mode === 'online' ? 'pay' : 'done', ...(orderId ? { orderId } : {}) };
  }
  async function newOrder(c, tid, target, amount, list) { const id = rid('fp_'), order = rid('fo_'); await c.query('insert into fac_payment (tenant_id, id, booking_id, pass_id, rental_id, method, amount, list_amount, toss_order_id, status) values ($1,$2,$3,$4,$5,\'toss\',$6,$7,$8,\'ready\')', [tid, id, target.booking_id || null, target.pass_id || null, target.rental_id || null, amount, list || amount, order]); return order; }
  /* 같은 시간 모든 칸이 빈 자원 */
  async function freeRes(c, tid, f, day, slot, slots) { const per = Math.max(1, +((f.capacity || {}).perSlot) || 1);
    const used = (await c.query('select res_id, slot, count(*)::int n from fac_slot where tenant_id = $1 and fac_id = $2 and day = $3 and slot >= $4 and slot < $5 group by res_id, slot', [tid, f.id, day, slot, slot + slots])).rows;
    return resList(f).map(r => r.id).filter(r => !used.some(u => u.res_id === r && u.n >= per)); }

  /* ── 취소(학습자 · 운영자 공통): 칸 해제 + 환불 자동 계산(pending), 100% 자동이고 토스 결제면 바로 취소 ── */
  async function cancelBooking(c, tid, bk, who, reason, rule) {
    const C = await cfg(c, tid); const f = C.facs.find(x => x.id === bk.fac_id) || {};
    if (!ACTIVE.includes(bk.status) || bk.status === 'checked_in') throw E(409, 'not_cancelable', '취소할 수 없는 예약이에요.');
    if (!who.staff && new Date(bk.start_at).getTime() <= Date.now()) throw E(409, 'not_cancelable', '이용 시작 뒤에는 취소할 수 없어요. 운영자에게 문의해 주세요.');
    await c.query("update fac_booking set status = 'cancelled', cancel_reason = $3, hold_until = null, updated_at = now() where tenant_id = $1 and id = $2", [tid, bk.id, str(reason, 200) || null]);
    await c.query('delete from fac_slot where tenant_id = $1 and booking_id = $2', [tid, bk.id]);
    await c.query("update fac_payment set status = 'cancelled' where tenant_id = $1 and booking_id = $2 and status = 'ready'", [tid, bk.id]);
    if (bk.pass_id && new Date(bk.start_at).getTime() > Date.now()) await c.query("update fac_pass set used = greatest(0, used - 1) where tenant_id = $1 and id = $2 and kind = 'count'", [tid, bk.pass_id]);
    const P = (await c.query("select * from fac_payment where tenant_id = $1 and booking_id = $2 and status = 'paid' order by at desc limit 1", [tid, bk.id])).rows[0];
    let refund = { auto: 0, lines: [] }, status = 'cancelled';
    if (P && P.amount > 0) {
      refund = calc.refund({ rule: rule || f.refund || { type: 'time' }, paid: P.amount, startAt: bk.start_at, now: Date.now() });
      const rf = rid('fr_'); await c.query("insert into fac_refund (tenant_id, id, payment_id, target, rule_type, calc, auto_amount, amount, by_staff, status) values ($1,$2,$3,$4,$5,$6,$7,$7,$8,'pending')", [tid, rf, P.id, 'booking:' + bk.id, (rule || f.refund || { type: 'time' }).type || 'time', JSON.stringify(refund.lines), refund.auto, who.staff || null]);
      if (P.method === 'toss' && P.toss_key && refund.auto === P.amount) { const r = await pay.cancel({ paymentKey: P.toss_key, reason: reason || '예약 취소', amount: refund.auto, idem: 'rf-' + rf }); if (r.ok) { await c.query("update fac_refund set status = 'done', toss_cancel_key = $3 where tenant_id = $1 and id = $2", [tid, rf, r.cancelKey]); await c.query("update fac_booking set pay_status = 'refunded' where tenant_id = $1 and id = $2", [tid, bk.id]); status = 'refunded'; await note(c, tid, bk.sid, 'refund', { booking: bk.id, amount: refund.auto }); } }
    }
    await note(c, tid, bk.sid, 'cancelled', { booking: bk.id, fac: bk.fac_id, refund: refund.auto });
    await audit(c, tid, who.staff || 'learner:' + bk.sid, 'fac.cancel', { booking: bk.id, refund: refund.auto, reason: str(reason, 200) });
    return { ok: true, status, refund: { auto: refund.auto, lines: refund.lines } };
  }

  /* 이용권 · 대여의 상품 규칙 */
  const passRule = (p, aud) => { const r = p.refund || {}; const U = r.unitPrice; return { type: r.type || (p.type === 'pass-count' ? 'pass-count' : 'pass-period'), unitPrice: U && typeof U === 'object' ? (U[aud] != null ? U[aud] : U.public) : U, feeRate: r.feeRate, tiers: r.tiers }; };

  const shared = { ensureCourse, bkMail, E, cfg, facOf, prodOf, resList, resName, rules, note, payModeOf, verifyOf, cleanExtra, book, cancelBooking, freeRes, newOrder, passRule, sweepNow, bkOut, qr, pay, calc, rid, hid, tail, str, DAY_RE, ID_RE, ACTIVE, suspendedOf };
  const pubR = require('./mod-pub')(ctx, shared);
  const adm = require('./mod-admin')(ctx, shared);
  return {
    pub: (req, res, tid, act) => { const fn = pubR[`${req.method} ${act}`]; if (!fn) throw E(404, 'not_found', '없는 주소입니다.'); return fn(req, res, tid); },
    match: (method, p) => adm.match(method, p),
    config: () => ({ payOnline: pay.online() }),
    tick: () => tickAll(pool, inTenant, audit, { note, onNoShow })
  };
}
module.exports = { sqlMigrations, createFac };
