'use strict';
/* 디디쌤 콘텐츠 마켓 v1.1 서버 모듈(서비스 기획서 v1.1 7~10장). ledger/와 같은 구조.
   - sql/NN_*.sql : db.js가 lms_schema에 'market/<파일>'로 기록하며 이어 붙인다.
   - 운영자 · CP · 산타 /api/market/* · 학습자 /api/pub/<tid>/mk-* : routes.js, 월 집계 · 분기 마감 · 지급 지시 : settle.js, 상태 전환 : sweep.js.
   - 계산은 calc.js 하나(didisam/marketcalc.js 사본 · 테스트가 동일성 확인). 금액 · 크레딧은 언제나 서버가 다시 계산한다.
   - 시범 플래그: mk_party.pilot(산타 관리자가 켬, 기관 문서 org.mk.pilot에도 같이 기록). 꺼진 기관의 구매 · 학습자 경로는 403 mk_off.
   - 돈은 움직이지 않는다: 계약 활성은 「세금계산서 발행 대기」까지, CP 지급은 「지급 지시 파일」까지. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const calc = require('./calc');
const { AsyncLocalStorage } = require('node:async_hooks');
const als = new AsyncLocalStorage(); /* 요청 범위 { tid, santa } — 라우트 권한 함수가 채우고 tx()가 RLS 세션 변수로 넘긴다 */
const SQL = path.join(__dirname, 'sql');

function sqlMigrations() {
  if (!fs.existsSync(SQL)) return [];
  return fs.readdirSync(SQL).filter(f => /^\d\d_[a-z0-9_]+\.sql$/.test(f)).sort().map(f => ['market/' + f, fs.readFileSync(path.join(SQL, f), 'utf8')]);
}

const AZ = 'abcdefghijklmnopqrstuvwxyz0123456789';
const rid = p => p + Array.from(crypto.randomBytes(12), b => AZ[b % 36]).join('');
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const int = v => { const n = Math.round(+v); return Number.isFinite(n) ? n : NaN; };
const kstDay = t => new Date((t ? new Date(t).getTime() : Date.now()) + 9 * 3600e3).toISOString().slice(0, 10);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/; const YM_RE = /^\d{4}-\d{2}$/; const Q_RE = /^\d{4}-Q[1-4]$/;
const quarterOf = ym => `${ym.slice(0, 4)}-Q${Math.floor((+ym.slice(5, 7) - 1) / 3) + 1}`;
const monthsOf = q => { const y = q.slice(0, 4), n = +q.slice(6); return [1, 2, 3].map(i => `${y}-${String((n - 1) * 3 + i).padStart(2, '0')}`); };

/* 마켓 오류 코드(8-6) — 운영자 합니다체 · 학습자 해요체 */
const MSG = {
  mk_off: '콘텐츠 마켓 시범 기관이 아닙니다. 산타에 시범 운영을 요청하십시오.',
  mk_plan: '디디쌤 유료 구독 기관만 구매 · 판매할 수 있습니다.',
  mk_margin: '보너스를 포함한 산타 몫이 30% 미만이라 계약 · 견적을 만들 수 없습니다. 아래 대안 중 하나를 고르십시오.',
  mk_single_margin: '이 조합은 산타 몫이 30% 미만이라 견적을 만들 수 없습니다. 예산을 올리거나, 인원 · 과정을 줄이거나, CP에 승인 요청을 보내십시오.',
  mk_bonus_max: '보너스 크레딧은 구매 크레딧의 7%까지만 줄 수 있습니다.',
  mk_floor: '최저가가 정가보다 높습니다. 최저가를 정가 이하로 입력하십시오.',
  mk_price_step: '정가는 분기에 한 번, 30% 이내로만 올릴 수 있습니다.',
  mk_check: '사전 검수를 통과하지 못한 항목이 있습니다. 표시된 항목을 고친 뒤 다시 제출하십시오.',
  mk_quote_state: '이 견적은 만료되었거나 CP 승인을 기다리고 있습니다.',
  mk_restore_window: '복원은 차감 후 7일 이내, 진도 10% 미만일 때만 할 수 있습니다. 그 밖의 경우 [이의 신청]으로 산타에 요청하십시오.',
  mk_close_same_user: '마감 실행자와 다른 산타 운영자가 확정해야 합니다.',
  mk_cp: 'CP로 등록된 기관만 쓸 수 있습니다. 산타에 CP 등록을 요청하십시오.',
  mk_cap: '이번 달 사용할 수 있는 크레딧을 모두 썼어요. 다음 달 1일에 다시 열려요.',
  mk_balance: '지금은 이 과정을 시작할 수 없어요. 담당 선생님께 알려 드렸어요.',
  mk_pre: '이 과정은 담당 선생님 승인 후 시작할 수 있어요.',
  mk_scope: '우리 학교 패스에 포함되지 않은 과정이에요.',
  mk_learner_off: '지금은 콘텐츠 마켓을 이용할 수 없어요.',
  mk_terms: '크레딧 이용 조건에 동의해야 구매를 확정할 수 있습니다.',
  mk_credit_scope: '크레딧은 산타가 공급하는 콘텐츠에만 쓸 수 있습니다.'
};

function createMarket(ctx) {
  const { pool, inTenant, HttpErr, audit, env = process.env } = ctx;
  const E = (status, code, message, extra) => { const e = new HttpErr(status, message || MSG[code] || '요청을 처리할 수 없습니다.', code); if (extra) e.extra = extra; return e; };
  const pepper = String(env.MK_SALT || env.SESSION_PEPPER || env.PII_KEY || 'mk-dev');
  /* 학습자 가명 키: 기관별 솔트 SHA-256(마켓 표에는 학습자 ID를 두지 않는다) */
  const sidHash = (tid, sid) => crypto.createHmac('sha256', pepper).update(`mk|${tid}|${sid}`).digest('hex');

  /* 마켓 트랜잭션: SET LOCAL ROLE didisam_market(RLS 강제) + app.tenant(요청 기관) + app.santa(산타 운영 경로만). 범위가 없으면 아무 행도 보이지 않는다 */
  async function txIn(scope, fn) {
    const c = await pool.connect(); const s = scope || {};
    try { await c.query('begin'); await c.query('set local role didisam_market'); await c.query("select set_config('app.tenant', $1, true), set_config('app.santa', $2, true)", [String(s.tid || ''), s.santa ? '1' : '0']);
      const r = await fn(c); await c.query('commit'); return r; }
    catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  }
  const tx = fn => txIn(als.getStore(), fn);
  const txAs = (scope, fn) => txIn(scope, fn); /* 시스템 집계(예: 철회 영향 기관 수)만 — 개인 단위 값을 돌려주지 않는 곳에서 */
  const scopeSet = (tid, santa) => { const st = als.getStore(); if (st) { st.tid = tid; st.santa = !!santa; } };
  const q1 = async (c, sql, a) => (await c.query(sql, a)).rows[0];
  /* 기관 감사 기록(기관 audit_log, 실패해도 본 처리는 유지) */
  const log = (tid, actor, action, detail) => inTenant(pool, tid, c => audit(c, tid, actor, action, detail)).catch(() => {});
  /* 멱등: 같은 (기관, 경로, idem)이면 첫 응답을 다시 돌려준다 */
  async function idem(c, tid, route, key, fn) {
    if (!key) throw E(400, 'idem', '멱등 키(idem)가 필요합니다.');
    const k = str(key, 80); const ex = await q1(c, 'select resp from mk_idem where tid = $1 and route = $2 and key = $3', [tid, route, k]); if (ex) return { ...ex.resp, again: true };
    const out = await fn(); await c.query('insert into mk_idem (tid, route, key, resp) values ($1,$2,$3,$4)', [tid, route, k, JSON.stringify(out)]); return out;
  }

  /* 기관 문서 값(plan · 이름 · 유형) — RLS 범위 안에서 읽는다 */
  async function orgOf(tid) {
    return inTenant(pool, tid, async c => { const r = (await c.query("select doc->'plan' plan, doc->'org'->>'name' name, doc->'org'->>'type' type, doc->'org'->'mk' mk from tenant_state where tenant_id = $1", [tid])).rows[0];
      const t = (await pool.query('select name, type from tenants where id = $1', [tid])).rows[0] || {}; return { plan: r && r.plan, name: (r && r.name) || t.name || '', type: (r && r.type) || t.type || '', mk: r && r.mk }; });
  }
  async function party(c, tid) { return (await q1(c, 'select * from mk_party where tid = $1', [tid])) || { tid, kind: 'buyer', pilot: false, active: true }; }
  /* 유료 구독: doc.plan.code가 있고 TRIAL이 아니다 */
  const paidPlan = p => !!(p && typeof p === 'object' && p.code && String(p.code).toUpperCase() !== 'TRIAL');
  async function eligible(tid) { const o = await orgOf(tid); return paidPlan(o.plan) ? { ok: true } : { ok: false, reason: 'mk_plan' }; }
  async function needPilot(c, tid) { const p = await party(c, tid); if (!p.pilot) throw E(403, 'mk_off'); return p; }
  async function needPaid(tid) { if (!(await eligible(tid)).ok) throw E(403, 'mk_plan'); }
  const isCp = p => p && p.kind === 'cp' && p.active;

  /* 상품 현재 단가 · 참여 상태(day 기준) */
  async function priceRows(c, pid) { return (await c.query("select *, to_char(effective_from, 'YYYY-MM-DD') ef from mk_price where product_id = $1 order by effective_from, id", [pid])).rows; }
  function priceNow(rows, day) { let best = null; for (const r of rows) if (r.ef <= day && (!best || r.ef > best.ef || (r.ef === best.ef && +r.id > +best.id))) best = r; return best; }
  async function optinRow(c, pid) { return q1(c, "select *, to_char(credit_from, 'YYYY-MM-DD') cf, to_char(min_until, 'YYYY-MM-DD') mu from mk_optin where product_id = $1 order by id desc limit 1", [pid]); }
  function optinNow(o, product, day) {
    if (!o) return 'single'; return calc.optinMode({ mode: o.mode, singleMonths: o.single_months, launchedAt: product && product.launched_at ? kstDay(product.launched_at) : o.cf, creditFrom: o.cf, withdrawnAt: o.withdrawn_at }, day);
  }

  /* 계약 지갑 · 잔액 */
  async function lotsOf(c, cid) { return (await c.query("select *, to_char(valid_to, 'YYYY-MM-DD') vt, to_char(carry_to, 'YYYY-MM-DD') ct from mk_credit_wallet where contract_id = $1 order by carry_to, (lot = 'bonus'), id", [cid])).rows; }
  const lotOut = l => ({ id: l.id, lot: l.lot, credits: l.credits, remain: l.remain, validTo: l.vt, carryTo: l.ct });
  const liveLots = (L, day) => L.filter(l => l.ct >= day);
  /* 기관의 지금 쓰는 크레딧 계약(활성 · 이월, 이월 만료 전) */
  async function liveContract(c, tid, day) {
    return q1(c, "select *, to_char(start, 'YYYY-MM-DD') s, to_char(\"end\", 'YYYY-MM-DD') e, to_char(carry_end, 'YYYY-MM-DD') ce from mk_contract where buyer_tid = $1 and kind = 'credit' and status in ('active','carry') and carry_end >= $2::date and start <= $2::date order by start desc limit 1", [tid, day]);
  }

  const shared = { E, MSG, calc, rid, str, int, kstDay, DAY_RE, YM_RE, Q_RE, quarterOf, monthsOf, tx, txAs, als, scopeSet, q1, log, idem, orgOf, party, paidPlan, eligible, needPilot, needPaid, isCp, priceRows, priceNow, optinRow, optinNow, lotsOf, lotOut, liveLots, liveContract, sidHash };
  shared.settle = require('./settle')(ctx, shared);
  const R = require('./routes')(ctx, shared);
  return {
    pub: (req, res, tid, act) => { const fn = R.pub[`${req.method} ${act}`]; if (!fn) throw E(404, 'not_found', '없는 주소입니다.'); return als.run({}, () => fn(req, res, tid)); },
    match: (method, p) => { const fn = R.match(method, p); return fn && ((req, res) => als.run({}, () => fn(req, res))); },
    tick: () => als.run({ tid: '', santa: true }, () => require('./sweep').tick(pool, shared))
  };
}
module.exports = { sqlMigrations, createMarket, MSG };
