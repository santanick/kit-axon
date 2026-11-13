'use strict';
/* v41.0 통합 수납 원장 서버 모듈(docs/ledger/09-dev-spec-v41.md). 시설(fac/)과 같은 구조.
   - sql/NN_*.sql : db.js가 lms_schema에 'ledger/<파일>'로 기록하며 이어 붙인다. 시설 결제 · 환불 이중 기록은 SQL 트리거(legacy_ref 유일).
   - 공개 /api/pub/<tid>/ledger-* : mod-pub.js, 운영자 /api/ledger/* : mod-admin.js, 가져오기 · 대사 : import.js, 쉐어 : share.js, 자동 정리 : sweep.js.
   - 계산은 calc.js 하나(didisam/ledgercalc.js와 같은 파일 · 테스트가 동일성 확인). 금액은 언제나 서버가 다시 계산한다.
   - 토스: fac/pay.js createPay 재사용. 키 선택은 청구 단위에서 위로 올라가며 처음 만나는 단위 비밀키, 없으면 TOSS_SECRET_KEY. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const calc = require('./calc');
const { createPay } = require('../fac/pay');
const { piiKeys } = require('../pii');
const SQL = path.join(__dirname, 'sql');

function sqlMigrations() {
  if (!fs.existsSync(SQL)) return [];
  return fs.readdirSync(SQL).filter(f => /^\d\d_[a-z0-9_]+\.sql$/.test(f)).sort().map(f => ['ledger/' + f, fs.readFileSync(path.join(SQL, f), 'utf8')]);
}

const AZ = 'abcdefghijklmnopqrstuvwxyz0123456789';
const rid = p => p + Array.from(crypto.randomBytes(12), b => AZ[b % 36]).join('');
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const int = v => { const n = Math.round(+v); return Number.isFinite(n) ? n : NaN; };
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/; const YM_RE = /^\d{4}-\d{2}$/; const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
const kstDay = t => new Date((t ? new Date(t).getTime() : Date.now()) + 9 * 3600e3).toISOString().slice(0, 10);
const ITEM = ['tuition', 'book', 'facility', 'pass', 'rental', 'program', 'event', 'etc'];

function createLedger(ctx) {
  const { pool, inTenant, HttpErr, audit, env = process.env } = ctx;
  const E = (status, code, message, extra) => { const e = new HttpErr(status, message, code); if (extra) e.extra = extra; return e; };
  const K = piiKeys(env);
  /* 단위 토스 비밀키 암호화(statecrypt와 같은 형식 enc1:v1.iv.tag.ct, AAD = {tid}|ledger|unit|{id}|toss_secret). Java DdLedger와 같은 규칙 */
  const PFX = 'enc1:';
  const aad = (tid, id) => `${tid}|ledger|unit|${id}|toss_secret`;
  function seal(tid, id, v) { if (!K) throw E(503, 'state_key', '암호화 키(PII_KEY)가 없어 비밀키를 저장할 수 없습니다.'); const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', K.enc, iv); c.setAAD(Buffer.from(aad(tid, id)));
    const ct = Buffer.concat([c.update(String(v), 'utf8'), c.final()]); return `${PFX}v1.${iv.toString('base64url')}.${c.getAuthTag().toString('base64url')}.${ct.toString('base64url')}`; }
  function open(tid, id, s) { if (!s || !K) return ''; try { const [, iv, tag, ct] = s.slice(PFX.length).split('.'); const d = crypto.createDecipheriv('aes-256-gcm', K.enc, Buffer.from(iv, 'base64url')); d.setAAD(Buffer.from(aad(tid, id))); d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8'); } catch { return ''; } }

  /* 기관 플래그: doc.ledger.on === true 또는 doc.org.ledger_on === true */
  async function isOn(c, tid) { const r = (await c.query("select coalesce(doc->'ledger'->>'on', doc->'org'->>'ledger_on') v from tenant_state where tenant_id = $1", [tid])).rows[0]; if (!r) throw E(404, 'tenant', '없는 기관입니다.'); return r.v === 'true'; }
  async function needOn(c, tid) { if (!(await isOn(c, tid))) throw E(403, 'ledger_off', '매출 · 수납 기능을 켜지 않은 기관입니다.'); }
  async function ensureRoot(c, tid) { await c.query("insert into led_unit (tenant_id, id, kind, name) values ($1, 'lu_root', 'hq', '기관 전체') on conflict do nothing", [tid]); }
  async function unitsOf(c, tid) { await ensureRoot(c, tid); return (await c.query('select * from led_unit where tenant_id = $1 order by sort, created_at, id', [tid])).rows; }
  const unitCalc = U => U.map(u => ({ id: u.id, parent: u.parent_id, shareRateBp: u.share_rate_bp }));
  async function unitOf(c, tid, id) { const u = (await c.query('select * from led_unit where tenant_id = $1 and id = $2', [tid, str(id || 'lu_root', 30)])).rows[0]; if (!u || !u.active) throw E(404, 'unit', '없는 단위입니다.'); return u; }

  /* 토스 키 선택(단위 → 상위 → 기관 기본) */
  async function payFor(c, tid, unitId) {
    const U = await unitsOf(c, tid); const by = new Map(U.map(u => [u.id, u])); let u = by.get(unitId) || by.get('lu_root'); const seen = new Set();
    while (u && !seen.has(u.id)) { seen.add(u.id); if (u.toss_secret_enc) { const key = open(tid, u.id, u.toss_secret_enc); if (key) return { pay: createPay({ TOSS_SECRET_KEY: key, TOSS_URL: env.TOSS_URL }, ctx.fetch), clientKey: u.toss_client_key || env.TOSS_CLIENT_KEY || '', unit: u.id }; } u = u.parent_id ? by.get(u.parent_id) : null; }
    const pay = createPay(env, ctx.fetch); return { pay, clientKey: env.TOSS_CLIENT_KEY || '', unit: null };
  }

  /* 청구 잔액: 지정한 청구(또는 sid)의 청구서 전체 줄 + 배분 → calc.balance */
  async function linesOf(c, tid, { sid, ids, bills }) {
    const cond = ids ? 'id = any($2)' : bills ? 'bill_id = any($2)' : 'sid = $2';
    const base = (await c.query(`select distinct bill_id from led_charge where tenant_id = $1 and ${cond}`, [tid, ids || bills || sid])).rows.map(r => r.bill_id);
    if (!base.length) return { charges: [], bal: calc.balance([], []), by: new Map() };
    const charges = (await c.query("select *, to_char(due_date, 'YYYY-MM-DD') due, to_char(created_at at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.US') at_s from led_charge where tenant_id = $1 and bill_id = any($2)", [tid, base])).rows;
    const allocs = (await c.query('select charge_id, sum(amount)::int amount from led_alloc where tenant_id = $1 and charge_id = any($2) group by charge_id', [tid, charges.map(x => x.id)])).rows;
    const bal = calc.balance(charges.map(x => ({ id: x.id, bill: x.bill_id, amount: x.amount, due: x.due, at: x.at_s, status: x.status })), allocs.map(a => ({ charge: a.charge_id, amount: a.amount })));
    const by = new Map(charges.map(x => [x.id, x])); return { charges, bal, by };
  }
  async function refreshStatus(c, tid, bills) {
    if (!bills.length) return; const { bal, by } = await linesOf(c, tid, { bills });
    for (const l of bal.lines) { const x = by.get(l.id); if (x && x.status !== l.status) await c.query('update led_charge set status = $3 where tenant_id = $1 and id = $2', [tid, l.id, l.status]); }
  }
  /* 수납 기록 + 배분(오래된 청구부터). chargeIds · sid가 없으면 배분 없는 수납(현장 즉석 결제) */
  async function record(c, tid, r) {
    let allocs = [], bills = [];
    if ((r.chargeIds && r.chargeIds.length) || r.sid) {
      const L = await linesOf(c, tid, r.chargeIds && r.chargeIds.length ? { ids: r.chargeIds } : { sid: r.sid });
      if (r.chargeIds && r.chargeIds.length) { if (L.charges.filter(x => r.chargeIds.includes(x.id)).length !== new Set(r.chargeIds).size) throw E(404, 'charge', '없는 청구입니다.');
        if (r.sid && L.charges.some(x => r.chargeIds.includes(x.id) && x.sid !== r.sid)) throw E(400, 'charge', '다른 학습자의 청구입니다.'); }
      const open = L.bal.lines.filter(l => !r.chargeIds || !r.chargeIds.length || r.chargeIds.includes(l.id)).map(l => ({ ...l, due: (L.by.get(l.id) || {}).due, at: (L.by.get(l.id) || {}).at_s }));
      const A = calc.allocate(r.amount, open); if (A.rest > 0) throw E(400, 'over_balance', '청구 잔액보다 큰 금액입니다.', { balance: r.amount - A.rest });
      allocs = A.allocs; bills = [...new Set(allocs.map(a => L.by.get(a.charge).bill_id))];
      if (!r.sid && allocs.length) r.sid = L.by.get(allocs[0].charge).sid;
    }
    const id = r.id || rid('lp_');
    const row = (await c.query(`insert into led_receipt (tenant_id, id, unit_id, sid, method, channel, amount, paid_at, status, toss_payment_key, toss_order_id, approval_no, card_issuer, installment, terminal_id, share_eligible, recorded_by, diff_reason, idem_key, charge_ids, link_hash)
      values ($1,$2,$3,$4,$5,$6,$7,$8,'paid',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) returning *`,
      [tid, id, r.unit, r.sid || null, r.method, r.channel, r.amount, r.paidAt || new Date(), r.paymentKey || null, r.orderId || null, r.approvalNo || null, r.cardIssuer || null, r.installment || null, r.terminalId || null, !!r.shareEligible, r.by || null, r.diffReason || null, r.idem || null, r.chargeIds && r.chargeIds.length ? r.chargeIds : null, r.linkHash || null])).rows[0];
    for (const a of allocs) await c.query('insert into led_alloc (tenant_id, receipt_id, charge_id, amount) values ($1,$2,$3,$4)', [tid, id, a.charge, a.amount]);
    await refreshStatus(c, tid, bills); return { row, allocs };
  }
  /* 온라인 승인 후 ready 수납을 paid로 바꾸고 배분 */
  async function settle(c, tid, rc, paymentKey, receiptUrl) {
    const L = await linesOf(c, tid, { ids: rc.charge_ids || [] }); const open = L.bal.lines.filter(l => (rc.charge_ids || []).includes(l.id)).map(l => ({ ...l, due: L.by.get(l.id).due, at: L.by.get(l.id).at_s }));
    const A = calc.allocate(rc.amount, open); /* 승인 사이 다른 경로로 일부 납부됐으면 남는 금액은 배분 없이 수납만(환불 대상으로 오늘 할 일에 표시) */
    await c.query("update led_receipt set status = 'paid', paid_at = now(), toss_payment_key = $3, diff_reason = $4, receipt_url = $5 where tenant_id = $1 and id = $2", [tid, rc.id, paymentKey, A.rest > 0 ? 'over_paid' : null, receiptUrl || null]);
    for (const a of A.allocs) await c.query('insert into led_alloc (tenant_id, receipt_id, charge_id, amount) values ($1,$2,$3,$4)', [tid, rc.id, a.charge, a.amount]);
    await refreshStatus(c, tid, [...new Set(A.allocs.map(a => L.by.get(a.charge).bill_id))]);
  }

  /* 집계 재료: 범위 안 청구(잔액 포함) · 수납 · 환불 → calc 행 */
  async function rowsOf(c, tid, from, to) {
    const ch = (await c.query("select id, bill_id, unit_id, item_type, amount, status, to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') d from led_charge where tenant_id = $1 and (created_at at time zone 'Asia/Seoul')::date between $2 and $3", [tid, from, to])).rows;
    const L = ch.length ? await linesOf(c, tid, { bills: [...new Set(ch.map(x => x.bill_id))] }) : { bal: { lines: [] } }; const B = new Map(L.bal.lines.map(l => [l.id, l.balance]));
    const rc = (await c.query("select id, unit_id, amount, method, status, share_eligible, to_char(paid_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') d from led_receipt where tenant_id = $1 and status = 'paid' and (paid_at at time zone 'Asia/Seoul')::date between $2 and $3", [tid, from, to])).rows;
    const rf = (await c.query("select f.id, f.amount, f.status, f.receipt_id, r.unit_id, r.share_eligible, to_char(coalesce(f.done_at, f.at) at time zone 'Asia/Seoul', 'YYYY-MM-DD') d from led_refund f join led_receipt r on r.tenant_id = f.tenant_id and r.id = f.receipt_id where f.tenant_id = $1 and f.status = 'done' and (coalesce(f.done_at, f.at) at time zone 'Asia/Seoul')::date between $2 and $3", [tid, from, to])).rows;
    return [
      ...ch.map(x => ({ kind: 'charge', id: x.id, unit: x.unit_id, day: x.d, amount: x.amount, itemType: x.item_type, balance: B.get(x.id) || 0, status: x.status })),
      ...rc.map(x => ({ kind: 'receipt', id: x.id, unit: x.unit_id, day: x.d, amount: x.amount, method: x.method, status: x.status, shareEligible: x.share_eligible })),
      ...rf.map(x => ({ kind: 'refund', id: x.id, unit: x.unit_id, day: x.d, amount: x.amount, status: x.status, receipt: x.receipt_id, shareEligible: x.share_eligible }))];
  }
  const range = q => { const t = kstDay(); const from = DAY_RE.test(q.get('from') || '') ? q.get('from') : t.slice(0, 8) + '01'; const to = DAY_RE.test(q.get('to') || '') ? q.get('to') : t; if (from > to) throw E(400, 'range', '기간을 확인해 주십시오.'); return { from, to }; };

  /* 결제창 이탈 ready → 30분 뒤 failed */
  const sweepMs = env.LEDGER_SWEEP_MS != null ? Math.max(0, +env.LEDGER_SWEEP_MS) : 60e3; const last = new Map();
  async function sweepNow(c, tid) { const t = last.get(tid) || 0; if (sweepMs && Date.now() - t < sweepMs) return 0; last.set(tid, Date.now()); if (last.size > 5000) last.clear(); return require('./sweep').sweep(c, tid, audit); }

  const shared = { E, calc, rid, sha, str, int, kstDay, DAY_RE, YM_RE, ID_RE, ITEM, seal, isOn, needOn, ensureRoot, unitsOf, unitCalc, unitOf, payFor, linesOf, refreshStatus, record, settle, rowsOf, range, sweepNow };
  const pubR = require('./mod-pub')(ctx, shared);
  const adm = require('./mod-admin')(ctx, shared);
  return {
    pub: (req, res, tid, act) => { const fn = pubR[`${req.method} ${act}`]; if (!fn) throw E(404, 'not_found', '없는 주소입니다.'); return fn(req, res, tid); },
    match: (method, p) => adm.match(method, p),
    tick: () => require('./sweep').tickAll(pool, inTenant, audit)
  };
}
module.exports = { sqlMigrations, createLedger };
