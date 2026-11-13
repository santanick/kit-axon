'use strict';
/* v42 학습 마일리지 · 보상 서버 모듈(docs/mileage/04-data-api.md). 업무 규칙은 SQL 함수(sql/15_mileage_fn.sql mil_*)에 있고 여기는 경로 · 권한 · 감사 · 속도 제한만.
   - sql/NN_*.sql : db.js가 lms_schema에 'mileage/<파일>'로 기록하며 이어 붙인다(원장 뒤 — 차감 줄 · 환불 훅이 led_* 표를 쓴다).
   - 운영자 /api/mileage/* : mod-admin.js, 학습자 /api/pub/<tid>/mile-* : mod-pub.js, 소멸 · 고지 · 캐시 대조 : sweep.js.
   - 수집 지점: hook(q, tid, sid, trigger, srcType, srcId, value, trust, cls) — 가입 · 로그인 · cpl · progress 차이분이 같은 트랜잭션의 쿼리 함수로 부른다(세이브포인트, 실패해도 본 작업은 계속).
   - 제품 고정(서버 강제): 국비 과정 금전성 차단(D1, DB 제약 + mil_cash_ok) · 운영자 본인 지급 금지 · 충전 · 환급 · 양도 · 기관 밖 사용 경로 없음. */
const fs = require('node:fs'); const path = require('node:path'); const crypto = require('node:crypto');
const MC = require('../../../didisam/milecalc.js');
const { piiKeys } = require('../pii');
const SQL = path.join(__dirname, 'sql');
function sqlMigrations() { if (!fs.existsSync(SQL)) return []; return fs.readdirSync(SQL).filter(f => /^\d\d_[a-z0-9_]+\.sql$/.test(f)).sort().map(f => ['mileage/' + f, fs.readFileSync(path.join(SQL, f), 'utf8')]); }

/* 오류 코드 → HTTP 상태(04 5.3) */
const STATUS = { mile_off: 403, staff_cap: 403, self_grant: 403, penalty_off: 403, not_found: 404, bill: 404, need_sunset: 409, insufficient: 409, below_threshold: 409, negative_balance: 409, out_of_stock: 409,
  already: 409, limit: 409, state: 409, bill_paid: 409, sunset: 409, need_draft: 409, rate: 429 };
const MSG = { mile_off: '마일리지 제도를 켜지 않은 기관입니다.', funded_blocked: '국비 지원 과정에는 금전성 보상을 쓸 수 없습니다.', ack_required: '안내 내용을 읽고 사유를 입력해 주십시오.', bad_rule: '규칙 값을 확인해 주십시오.',
  hq_pool_locked: '본사 통합 마일리지는 법률 검토 완료 전까지 켤 수 없습니다.', over_tuition: '정가 줄이 등록 교습비를 넘습니다.', over_cap: '상한을 넘습니다.', need_sunset: '적립 이력이 있어 제도 종료 절차로 진행해야 합니다.',
  insufficient: '쓸 수 있는 마일리지가 부족해요.', below_threshold: '아직 기준 점수에 닿지 않았어요.', negative_balance: '마일리지가 음수인 동안에는 신청할 수 없어요.', out_of_stock: '재고가 없어요.', already: '이미 처리했습니다.',
  staff_cap: '이번 달 지급 한도를 넘습니다.', self_grant: '운영자 본인 계정에는 지급할 수 없습니다.', rate: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', amount_mismatch: '계산 값이 서버 값과 다릅니다.',
  bad_points: '신청 포인트를 확인해 주세요.', reason: '사유를 입력해 주십시오.', points: '포인트를 확인해 주십시오.', penalty_off: '감점 기능을 켜지 않은 기관입니다.', state: '이미 처리했거나 처리할 수 없는 상태입니다.',
  bill_paid: '수납이 시작된 청구서에는 차감 줄을 붙일 수 없습니다.', bill: '청구서를 찾지 못했습니다.', kind: '이 보상에는 쓸 수 없습니다.', limit: '이번 달 신청 횟수를 넘었어요.', sunset: '제도가 종료되었습니다.', not_found: '찾지 못했습니다.', need_draft: '켜기 마법사를 먼저 완료해 주십시오.' };

const AZ = 'abcdefghijklmnopqrstuvwxyz0123456789'; const CP = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rid = p => p + Array.from(crypto.randomBytes(12), b => AZ[b % 36]).join('');
const couponCode = () => Array.from(crypto.randomBytes(8), b => CP[b % CP.length]).join('');
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const int = v => { const n = Math.round(+v); return Number.isFinite(n) ? n : NaN; };
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const SID_OK = /^[A-Za-z0-9_.@:-]{1,80}$/;
const TRIG = ['signup', 'first_login', 'attend_day', 'streak', 'lesson_done', 'course_done', 'exam_score', 'assign_submit', 'survey_done', 'noncredit_done', 'review_ok', 'referral_ok', 'tube_goal', 'evidence', 'manual'];
const PARTICIPATION = ['signup', 'first_login', 'attend_day', 'tube_goal', 'streak'];
const FIXED = ['funded_cash', 'no_topup', 'no_cashout', 'no_transfer', 'no_outside', 'tuition_cap', 'ledger_immutable', 'self_grant'];

/* 행 → 응답(카멜) */
const polOut = p => p && { on: p.is_on, ver: p.ver, unitName: p.unit_name, template: p.template, expiry: p.expiry, notice: p.notice, budget: p.budget, dailyCapTotal: p.daily_cap_total, league: p.league, streak: p.streak, scope: p.scope,
  tiers: p.tiers, tierWindow: p.tier_window, cashLock: p.cash_lock, sunset: p.sunset, rank: p.rank, penalty: p.penalty, grantCfg: p.grant_cfg, shop: p.shop, recommended: p.recommended, updatedBy: p.updated_by, updatedAt: p.updated_at };
const ruleOut = r => ({ id: r.id, ver: r.ver, trigger: r.trigger, nature: r.nature, label: r.label, cond: r.cond, score: r.score, caps: r.caps, once: r.once, groupKey: r.group_key, trustMin: r.trust_min, approval: r.approval,
  approveOver: r.approve_over, expiry: r.expiry, record: r.record, startsOn: r.starts_on, endsOn: r.ends_on, active: r.active });
const rwOut = r => ({ id: r.id, kind: r.kind, title: r.title, cost: r.cost, minUse: r.min_use, maxUse: r.max_use, step: r.step, threshold: r.threshold, stock: r.stock, perSid: r.per_sid, approval: r.approval, cash: r.cash,
  audience: r.audience, link: r.link, active: r.active });
const enOut = e => ({ id: e.id, sid: e.sid, unit: e.scope_unit, kind: e.kind, points: e.points, status: e.status, nature: e.nature, trust: e.trust, convertible: e.convertible, funded: e.funded, cls: e.cls_id, trigger: e.trigger,
  ruleId: e.rule_id, ruleVer: e.rule_ver, redeemId: e.redeem_id, refEntry: e.ref_entry, expiresAt: e.expires_at, reason: e.reason, byStaff: e.by_staff, at: e.at, postedAt: e.posted_at });
const rdOut = d => ({ id: d.id, sid: d.sid, unit: d.scope_unit, rewardId: d.reward_id, points: d.points, won: d.won, status: d.status, fulfil: d.fulfil, decidedBy: d.decided_by, decidedAt: d.decided_at, reason: d.reason, at: d.at });

function createMileage(ctx) {
  const { pool, inTenant, HttpErr, env = process.env } = ctx;
  const E = (code, extra, status) => { const e = new HttpErr(status || STATUS[code] || 400, MSG[code] || code, code); if (extra) e.extra = extra; return e; };
  /* SQL 함수 결과 {error}를 HTTP 오류로 */
  const ok = r => { if (r && r.error) { const { error, ...x } = r; throw E(error, Object.keys(x).length ? x : null); } return r; };
  const one = async (c, q, a) => (await c.query(q, a)).rows[0].r;
  const K = (() => { try { return piiKeys(env); } catch { return null; } })();
  const bidx = (tid, v) => K && crypto.createHmac('sha256', K.idx).update(`${tid}|email|${String(v).trim().toLowerCase()}`).digest('base64url');
  /* 본인 지급 금지: 직원 이메일과 같은 이메일로 가입한 학습자 sid 집합(pii.identity 블라인드 인덱스 대조, Java DdPii와 같은 규칙) */
  async function selfSids(tid, email) { const b = bidx(tid, email); if (!b) return new Set();
    try { return new Set((await pool.query('select learner_id::text id from pii.identity where tid = $1 and email_bidx = $2', [tid, b])).rows.map(r => r.id)); } catch { return new Set(); } }
  async function docOf(c, tid) { const r = (await c.query("select doc->'org' org, doc->'mileage' mil from tenant_state where tenant_id = $1", [tid])).rows[0]; return r || {}; }
  /* 모듈 플래그: 기관 문서 org.mileage_on === false 또는 mileage.on === false면 꺼짐(D2: 탭은 기본 보이고 제도는 마법사로 켬) */
  async function modOn(c, tid) { const d = await docOf(c, tid); return !(d.org && d.org.mileage_on === false) && !(d.mil && d.mil.on === false); }
  async function needMod(c, tid) { if (!(await modOn(c, tid))) throw E('mile_off'); }
  async function pol(c, tid) { return (await c.query('select * from mil_policy where tenant_id = $1', [tid])).rows[0] || null; }
  async function ensurePol(c, tid) { await c.query('insert into mil_policy (tenant_id) values ($1) on conflict do nothing', [tid]); return pol(c, tid); }
  async function policyOn(c, tid) { const p = await pol(c, tid); return !!(p && p.is_on); }

  /* 수집 지점 훅: q = 같은 트랜잭션의 쿼리 함수(c.query 또는 pii의 L). 제도가 꺼져 있으면 사건도 남기지 않는다(소급 없음) */
  async function hook(q, tid, sid, trigger, srcType, srcId, value, trust, cls, at) {
    try { await q('savepoint mil_hook');
      const r = (await q("select case when exists (select 1 from mil_policy where tenant_id = $1 and is_on) then mil_emit($1,$2,$3,$4,$5,$6,$7,coalesce($8::timestamptz, now()),$9,'lu_root') end r",
        [tid, String(sid), trigger, srcType, String(srcId), value == null ? null : value, trust || 'A', at || null, cls || null])).rows[0].r;
      await q('release savepoint mil_hook'); return r;
    } catch (e) { try { await q('rollback to savepoint mil_hook'); } catch { /* 트랜잭션 밖 */ } if (ctx.log && ctx.log.error) ctx.log.error('mileage hook', trigger, e.message); return null; }
  }
  /* PUT progress 차이분(신뢰 C): 이전 lp와 비교해 새로 완료된 차시 · 튜브 오늘 목표 달성 · 학습한 날만 */
  function diffLp(prev, next) { const out = []; const P = prev || {}, N = next || {};
    for (const [cid, c] of Object.entries(N.cls || {})) { const items = (c && c.items) || {}; const pit = ((P.cls || {})[cid] || {}).items || {};
      for (const [iid, it] of Object.entries(items)) if (it && it.done && !(pit[iid] && pit[iid].done)) out.push({ trigger: 'lesson_done', srcType: 'item', srcId: `${cid}/${iid}`, cls: cid }); }
    const ts = (N.tube && N.tube.sec) || {}, ps = (P.tube && P.tube.sec) || {}, goal = +((N.tube && N.tube.goal) || 0);
    for (const [day, sec] of Object.entries(ts)) { if (!/^\d{4}-\d\d-\d\d$/.test(day)) continue; const before = +ps[day] || 0;
      if (sec >= 60 && before < 60) out.push({ trigger: 'attend_day', srcType: 'day', srcId: day, value: Math.floor(sec / 60) });
      if (goal > 0 && sec >= goal * 60 && before < goal * 60) out.push({ trigger: 'tube_goal', srcType: 'day', srcId: day, value: Math.floor(sec / 60) }); }
    return out.slice(0, 50); }
  async function emitDiff(c, tid, sid, prev, next) { if (!(await policyOn(c, tid))) return 0; let n = 0; for (const x of diffLp(prev, next)) { const r = await hook(q2(c), tid, sid, x.trigger, x.srcType, x.srcId, x.value, 'C', x.cls); if (r && r.status === 'done') n++; } return n; }
  const q2 = c => (s, a) => c.query(s, a);
  /* v41 원장 환불 확정 훅: 같은 트랜잭션. ratio = 환불액 / 실납부액 */
  async function onRefund(c, tid, receiptId, ratio) { if (!(await pol(c, tid))) return null; return one(c, "select mil_on_refund($1,$2,$3,now(),coalesce((select (grant_cfg->>'restoreRound')::int from mil_policy where tenant_id = $1), 10)) r", [tid, receiptId, ratio]); }
  /* 개인 쿠폰(1회용, 본인 sid만): coupon.js check()가 기관 쿠폰에 없을 때 부른다 */
  async function personalCoupon(c, tid, sid, code, cls) {
    const d = (await c.query("select d.*, w.audience from mil_redeem d join mil_reward w on w.tenant_id = d.tenant_id and w.id = d.reward_id where d.tenant_id = $1 and d.fulfil->>'couponCode' = $2 and d.status = 'fulfilled'", [tid, code])).rows[0];
    if (!d || d.sid !== sid) return null;
    if (cls && !(await one(c, 'select mil_cash_ok($1,$2) r', [tid, cls]))) return { ok: false, msg: '국비 지원 과정에는 마일리지 쿠폰을 쓸 수 없어요.', code: 'funded_blocked' };
    const used = +(await c.query("select count(*)::int n from learner_events where tenant_id = $1 and type = 'pay' and upper(data->>'cpn') = $2", [tid, code])).rows[0].n;
    if (used > 0) return { ok: false, msg: '이미 사용한 쿠폰이에요.' };
    if (d.fulfil.until && new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) > d.fulfil.until) return { ok: false, msg: '사용 기한이 지난 쿠폰이에요.' };
    return { ok: true, personal: true, off: d.won, label: `마일리지 쿠폰 ${d.won.toLocaleString('ko-KR')}원 할인` }; }

  const shared = { E, ok, one, str, int, sha, rid, couponCode, SID_OK, TRIG, PARTICIPATION, FIXED, MC, polOut, ruleOut, rwOut, enOut, rdOut, needMod, modOn, pol, ensurePol, policyOn, selfSids, docOf, hook, env };
  const adm = require('./mod-admin')(ctx, shared);
  const pubR = require('./mod-pub')(ctx, shared);
  const sweep = require('./sweep');
  return {
    pub: (req, res, tid, act) => { const fn = pubR[`${req.method} ${act}`]; if (!fn) throw E('not_found'); return fn(req, res, tid); },
    match: (method, p) => adm.match(method, p),
    hook, emitDiff, diffLp, onRefund, personalCoupon,
    tick: () => sweep.tickAll(pool, inTenant, ctx.audit)
  };
}
module.exports = { sqlMigrations, createMileage, STATUS };
