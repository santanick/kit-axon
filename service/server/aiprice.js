'use strict';
/* v47 AI 사용량 요금표 — 기관 월 포함량 · 추가 충전 가격 · 산타 요금제(S.plan)의 단일 원천(Java: cmm/DdAiPrice에 같은 값).
   대표님 확정(2026-11-24): 100만 토큰당 2만 원 고정(부가세 별도, 화면은 부가세 포함 병기). 충전은 10만 원 단위, 많이 살수록 할인(최대 30%).
   충전량은 충전일부터 1년(365일) 동안 쓰고 남은 양은 다음 달로 이어진다(08:13 변경). 기관 설정:
     S.plan   = { code, tier, contract:'sub'|'multi'|'build', aiMonthTokens, since } — 산타 관리자만 바꾼다(PUT /api/santa/orgs/:tid/plan)
     S.aiplan = { monthTokens, overage:'block'|'pack' } — monthTokens는 산타가 S.plan.aiMonthTokens와 함께 넣고, overage만 정운영자가 고른다.
   aiplan이 없으면(기존 기관) 월 한도를 적용하지 않는다(동작 불변). */

const PRICE_PER_M = 20000; /* 100만 토큰당 공급가(원) */
const VAT = 0.1;
const STEP = 100000, MIN_WON = 100000, MAX_WON = 100000000; /* 충전 금액(공급가): 10만 원 단위, 10만 ~ 1억 원 */
/* 할인 구간(공급가 기준 이상 → 할인 %). 이 표 한 곳만 바꾸면 Node · 화면(사용량 API의 price.discounts)이 따라간다. Java DdAiPrice.DISCOUNTS도 같은 값 */
const DISCOUNTS = [[100000, 0], [500000, 5], [1000000, 10], [3000000, 15], [5000000, 20], [10000000, 25], [20000000, 30]];
/* 월 기본 포함량(대표님 2026-11-25 12:45 「월 5만 원 정도를 기본으로(유료 고객 한정) · 유료 전환 전은 적정량」)
   유료(Standard · Pro · Enterprise) = 공급가 5만 원 ÷ 100만 토큰당 2만 원 = 250만 토큰. Enterprise는 산타가 계약에 따라 더 넣는다(0 = 한도 없음).
   체험(14일) = 250만 × 14/30 ≈ 117만 → 내림 100만 토큰(공급가 2만 원 상당). 이미 저장된 기관 값은 바꾸지 않는다(저장값 우선). */
const PAID_MONTH_TOKENS = 2500000;
const TRIAL_TOKENS = 1000000;
const MONTH_MAX = 1e10; /* 산타가 넣을 수 있는 월 포함 토큰 상한 */
const PLAN_CODE = /^(TRIAL|[A-Z][0-9])$/;
const CONTRACTS = ['sub', 'multi', 'build'];

const discountOf = won => { let d = 0; for (const [w, p] of DISCOUNTS) if (won >= w) d = p; return d; };
const validWon = won => Number.isInteger(won) && won % STEP === 0 && won >= MIN_WON && won <= MAX_WON;
/* 충전 견적: 받는 토큰 = 공급가 ÷ (할인 단가) × 100만(소수점 버림), 결제 금액 = 공급가 + 부가세 10% */
function quote(won) {
  won = +won; if (!validWon(won)) return null; const discount = discountOf(won); const vat = Math.round(won * VAT);
  return { won, supply: won, vat, total: won + vat, discount, unit: PRICE_PER_M * (100 - discount) / 100, base: won * 1e6 / PRICE_PER_M, tokens: Math.floor(won * 5000 / (100 - discount)) };
}
/* 화면용 요금 안내(사용량 API에 그대로 싣는다) */
const priceInfo = () => ({ perM: PRICE_PER_M, perMVat: Math.round(PRICE_PER_M * (1 + VAT)), step: STEP, min: MIN_WON, max: MAX_WON, discounts: DISCOUNTS.map(x => x.slice()), paidMonthTokens: PAID_MONTH_TOKENS, trialTokens: TRIAL_TOKENS });
const packId = won => 'w' + (won / STEP); /* ai_credit.pack: w1 = 10만 원 */

/* 기관 설정 정규화. on은 aiplan이 있고 monthTokens가 양수일 때만 */
const okTokens = v => Number.isInteger(+v) && +v > 0 && +v <= MONTH_MAX;
/* 체험 종료(대표님 2026-11-25): 요금제(S.plan)가 TRIAL이고 since + 14일이 지나면(since가 1일째, 15일째부터) 월 포함량 0 · on=true
   → 충전분(이월 포함)만 쓸 수 있고 없으면 429 trial_ended(충전 · 유료 전환 안내). plan · today를 넘기지 않으면 기존 동작 그대로 */
const TRIAL_DAYS = 14;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const trialEnded = (contract, today) => !!contract && typeof contract === 'object' && contract.code === 'TRIAL' && DAY_RE.test(String(contract.since || '')) && DAY_RE.test(String(today || '')) && today >= addDays(contract.since, TRIAL_DAYS);
const trialOn = (contract, today) => !!contract && typeof contract === 'object' && contract.code === 'TRIAL' && DAY_RE.test(String(contract.since || '')) && DAY_RE.test(String(today || '')) && contract.since <= today && today < addDays(contract.since, TRIAL_DAYS);
/* 충전 거절(409 overage_block)은 유료 기관만 — 체험 종료 기관은 차단 설정이어도 충전을 허용한다(통합 결정 2026-11-25) */
const topupBlocked = plan => !!plan.on && plan.overage === 'block' && !plan.trialEnded;
function planOf(raw, contract, today) {
  const p = raw && typeof raw === 'object' ? raw : null; const on = !!p && okTokens(p.monthTokens); const overage = p && p.overage === 'block' ? 'block' : 'pack';
  if (trialEnded(contract, today)) return { on: true, monthTokens: 0, overage, trialEnded: true };
  /* 체험 중(대표님 2026-11-25 「14일 합계 100만」): 달을 넘겨도 since ~ 종료일 합계로 판정 → trialSince가 있으면 월 집계 대신 since부터 누적 */
  const ts = on && trialOn(contract, today) ? { trialSince: contract.since } : {};
  return { on, monthTokens: on ? +p.monthTokens : TRIAL_TOKENS, overage, ...ts };
}
const ovKey = raw => raw && typeof raw === 'object' ? (raw.overage === 'block' ? 'block' : raw.overage === 'pack' ? 'pack' : '') : '';
const validPlan = raw => raw == null || (typeof raw === 'object' && !Array.isArray(raw) && (raw.monthTokens == null || okTokens(raw.monthTokens)) && (raw.overage == null || raw.overage === 'block' || raw.overage === 'pack'));
/* PUT /api/state: 포함량(aiplan.monthTokens) · 요금제(plan)는 저장된 값이 원천 — 기관이 보낸 값은 버린다(포함량 변경은 산타에 문의).
   예외: 아직 aiplan이 없는 기관이 체험 기본값(TRIAL_TOKENS)을 켜는 것만 받는다(한도가 생기는 쪽이라 권한 문제 없음). overage는 그대로 받는다(정운영자 확인은 호출부). */
function keepPlan(doc, cur, today) {
  const ov = doc.aiplan && doc.aiplan.overage ? (doc.aiplan.overage === 'block' ? 'block' : 'pack') : null;
  const sp = cur && cur.aiplan && okTokens(cur.aiplan.monthTokens) ? cur.aiplan : null; const out = { ...doc }; delete out.aiplan; delete out.plan;
  if (sp) out.aiplan = { monthTokens: +sp.monthTokens, overage: ov || (sp.overage === 'block' ? 'block' : 'pack') };
  else if (doc.aiplan && +doc.aiplan.monthTokens === TRIAL_TOKENS) out.aiplan = { monthTokens: TRIAL_TOKENS, overage: ov || 'pack' };
  if (cur && cur.plan && typeof cur.plan === 'object') out.plan = cur.plan;
  else if (out.aiplan && !sp) out.plan = { code: 'TRIAL', tier: 'pro', contract: 'sub', aiMonthTokens: TRIAL_TOKENS, since: today };
  return out;
}
/* 산타 관리자 입력 검증 → { plan, memo } 또는 오류 문구 */
function santaInput(b, today) {
  const code = String(b && b.code || '').trim().toUpperCase(); if (!PLAN_CODE.test(code)) return { err: '요금제 코드는 TRIAL 또는 영문 대문자 1자 + 숫자 1자(E1 · U0 · G4 등)입니다.', code: 'plan_code' };
  const raw = b && b.aiMonthTokens; const t = raw == null || raw === '' ? (code === 'TRIAL' ? TRIAL_TOKENS : PAID_MONTH_TOKENS) : +raw; /* 비우면 기본 포함량 */ if (!(Number.isInteger(t) && t >= 0 && t <= MONTH_MAX)) return { err: '월 포함 토큰은 0 이상 정수(최대 100억)입니다. 0이면 한도 없음입니다.', code: 'plan_tokens' };
  const contract = CONTRACTS.includes(b && b.contract) ? b.contract : 'sub';
  const since = /^\d{4}-\d{2}-\d{2}$/.test(String(b && b.since || '')) ? String(b.since) : today;
  const tier = String(b && b.tier || '').trim().slice(0, 30); const memo = String(b && b.memo || '').trim().slice(0, 500);
  return { plan: { code, tier, contract, aiMonthTokens: t, since }, memo };
}
const santaSet = env => new Set(String(env.SANTA_ADMIN_EMAILS == null ? 'nick@didisam.com,nick@didicast.com' : env.SANTA_ADMIN_EMAILS).split(',').map(x => x.trim().toLowerCase()).filter(Boolean)); /* 기본 산타 관리자: nick@didisam.com(대표님 2026-11-24 지정), 환경변수로 바꾸거나 추가 */

/* 충전량: 충전일부터 365일(만료일까지 사용, 남은 양은 다음 달로 이어짐 — 대표님 2026-11-24 08:13).
   매달 월 포함량을 먼저 쓰고, 넘는 양은 충전량에서 오래된 것(만료일 빠른 것)부터 뺀다. 남은 양은 사용 기록(ai_usage, 일 단위)으로 다시 계산한다.
   지난달 포함량도 지금 포함량으로 본다(산타가 포함량을 바꾸면 지난달 계산도 그 값 기준). Java DdAiPrice.sim과 같은 규칙 */
const CREDIT_DAYS = 365;
const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
/* credits: [{ id, tokens, day(충전일 KST), expires(만료일, 이 날까지 사용) }], usage: [{ day, n }](earliest 충전월 1일부터) → 충전별 남은 양 · 이달 충전 차감량 · 지금 남은 양 */
/* since(체험 시작일)를 주면 since 이후 사용은 한 구간(체험 합계)으로 본다 */
function simCredits(credits, usage, included, today, since) {
  const L = credits.map(c => ({ ...c, expires: c.expires || addDays(c.day, CREDIT_DAYS), left: +c.tokens })).sort((a, b) => a.day < b.day ? -1 : a.day > b.day ? 1 : a.expires < b.expires ? -1 : a.expires > b.expires ? 1 : String(a.id) < String(b.id) ? -1 : 1);
  const month = since ? 'T' : monthOf(today); const cum = {}; let thisMonth = 0;
  for (const u of usage.slice().sort((a, b) => a.day < b.day ? -1 : 1)) {
    if (u.day > today) continue; const m = since && u.day >= since ? 'T' : u.day.slice(0, 7); const prev = cum[m] || 0; const cur = prev + (+u.n || 0); cum[m] = cur;
    let over = Math.max(0, cur - included) - Math.max(0, prev - included);
    for (const c of L) { if (over <= 0) break; if (c.left <= 0 || c.day > u.day || c.expires < u.day) continue; const t = Math.min(c.left, over); c.left -= t; over -= t; if (m === month) thisMonth += t; }
  }
  const live = L.filter(c => c.expires >= today && c.day <= today); const left = live.reduce((a, c) => a + c.left, 0);
  return { list: L, live, thisMonth, left, credit: thisMonth + left };
}
/* 이달 상태(KST). today = 'YYYY-MM-DD'. 만료일이 1년 넘게 지난 충전은 지금 남은 충전과 겹친 적이 없으므로 읽지 않는다 */
const monthOf = today => today.slice(0, 7);
async function monthState(c, tid, plan, today) {
  const month = monthOf(today); const since = plan.trialSince || ''; const from0 = since || month + '-01'; /* 체험 중: 체험 시작일부터 누적 */
  const used = +(await c.query('select coalesce(sum(tin + tout), 0)::bigint n from ai_usage where tenant_id = $1 and day >= $2::date', [tid, from0])).rows[0].n;
  const credits = (await c.query("select id, pack, tokens::bigint tokens, amount, to_char(paid_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') pday, to_char(paid_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') at, expires_at::text expires from ai_credit where tenant_id = $1 and status = 'paid' and expires_at >= $2::date - 366 order by paid_at", [tid, today])).rows.map(r => ({ ...r, day: r.pday, tokens: +r.tokens }));
  const cf = credits.length ? credits[0].day.slice(0, 7) + '-01' : from0; const from = cf < from0 ? cf : from0;
  const usage = credits.length ? (await c.query('select day::text, (tin + tout)::bigint n from ai_usage where tenant_id = $1 and day >= $2::date order by day', [tid, from])).rows.map(r => ({ day: r.day, n: +r.n })) : [];
  const sim = simCredits(credits, usage, plan.monthTokens, today, since);
  return { ...stateOf(plan, month, used, sim.credit), from: from0, ...(since ? { trialSince: since } : {}), credits: sim.live.map(x => ({ pack: x.pack, tokens: x.tokens, amount: x.amount, at: x.at, day: x.day, expires: x.expires, left: x.left })) };
}
/* 계산만(Java DdAiPrice.state와 같은 규칙): 80% 주의 · 100% 초과. 포함량을 넘으면 충전량에서 빠진다 */
function stateOf(plan, month, used, credit) {
  const included = plan.monthTokens; const limit = included + credit;
  const pct = limit > 0 ? Math.floor(used * 100 / limit) : plan.on ? 100 : 0; /* 한도 0(체험 종료 · 충전 없음)은 초과 */
  const creditLeft = Math.max(0, Math.min(credit, limit - Math.max(used, included)));
  return { month, used, included, credit, creditLeft, remaining: Math.max(0, limit - used), pct, state: !plan.on ? 'off' : pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok' };
}
/* 차단 문구: 학습자(해요체) · 운영자(합니다체) */
const MSG_LEARNER = '이번 달 AI 사용량을 다 썼어요. 선생님께 질문을 넘겨 주세요';
const MSG_STAFF = '이번 달 AI 사용량(포함량 + 추가 충전량)을 모두 썼습니다. 설정 → AI 사용량에서 추가 충전하십시오.';
const MSG_TRIAL_LEARNER = '무료 체험 기간이 끝나 지금은 AI를 쓸 수 없어요. 선생님께 질문을 넘겨 주세요';
const MSG_TRIAL_STAFF = '무료 체험 기간(14일)이 끝나 AI 월 포함량이 0입니다. 설정 → AI 사용량에서 추가 충전하거나 유료 요금제로 전환하십시오.';
/* 차단 판정(429): 포함량 + 쓸 수 있는 충전량을 다 썼을 때. 체험 종료는 code trial_ended, 그 밖은 ai_month_quota → { code, message } 또는 null */
function blockOf(plan, used, credit, learner) {
  if (!plan.on || used < plan.monthTokens + credit) return null;
  return plan.trialEnded ? { code: 'trial_ended', message: learner ? MSG_TRIAL_LEARNER : MSG_TRIAL_STAFF } : { code: 'ai_month_quota', message: learner ? MSG_LEARNER : MSG_STAFF };
}

module.exports = { TRIAL_DAYS, trialEnded, trialOn, topupBlocked, blockOf, MSG_TRIAL_LEARNER, MSG_TRIAL_STAFF, PRICE_PER_M, VAT, STEP, MIN_WON, MAX_WON, DISCOUNTS, TRIAL_TOKENS, PAID_MONTH_TOKENS, MONTH_MAX, CONTRACTS, CREDIT_DAYS, addDays, simCredits, discountOf, validWon, quote, priceInfo, packId, planOf, ovKey, validPlan, keepPlan, santaInput, santaSet, monthOf, monthState, stateOf, MSG_LEARNER, MSG_STAFF };
