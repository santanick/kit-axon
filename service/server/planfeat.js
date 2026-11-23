'use strict';
/* v47 요금제 기능 묶음 — 서버 판정(Java cmm/DdPlanFeature와 같은 규칙). 화면 표 원천: didisam/plan.js PLAN_TABLE
   기관 문서 doc.plan = { code, tier, contract, aiMonthTokens, since } (core/v47-ai 산타 관리와 같은 모양)
   - plan 없는 기관 · 정책(aipol) 꺼진 기관은 판정하지 않는다(동작 불변).
   - 요금제 밖 AI 레벨(Standard L2 이상 · Pro L3) · 기능(grade 채점 초안 · vision 비전 대화 = Pro부터) 호출은 403 plan_feature.
   - TRIAL = Pro 14일, 지나면 Standard. 모르는 코드는 Enterprise(잠그지 않음). */
const TIERS = ['standard', 'pro', 'enterprise'];
const NAME = { standard: 'Standard', pro: 'Pro', enterprise: 'Enterprise' };
const CODE_TIER = { E1: 'standard', A1: 'standard', U0: 'standard', G1: 'standard', E2: 'pro', A2: 'pro', U1: 'pro', U2: 'pro', G2: 'pro',
  E3: 'enterprise', E4: 'enterprise', A3: 'enterprise', A4: 'enterprise', U3: 'enterprise', U4: 'enterprise', G3: 'enterprise', G4: 'enterprise', TRIAL: 'pro' };
const MAX_LV = { standard: 'L1', pro: 'L2', enterprise: 'L3' };
const FEAT_MIN = { grade: 'pro', vision: 'pro' };
const TRIAL_DAYS = 14;
const LV = ['L0', 'L1', 'L2', 'L3'];
const rank = t => Math.max(0, TIERS.indexOf(t));
const dayNo = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : NaN; };

/* 단계 판정. today = 'YYYY-MM-DD'(KST). plan 없으면 null */
function tierOf(plan, today) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return null;
  const code = String(plan.code || '').toUpperCase(); const t = String(plan.tier || '').toLowerCase();
  if (code === 'TRIAL') { const s = dayNo(plan.since); const n = dayNo(today); const left = Number.isFinite(s) && Number.isFinite(n) ? s + TRIAL_DAYS - n : TRIAL_DAYS;
    return { tier: left > 0 ? 'pro' : 'standard', code, trial: true, expired: left <= 0 }; }
  return { tier: TIERS.includes(t) ? t : CODE_TIER[code] || 'enterprise', code };
}
/* 판정: 통과면 null, 막히면 { need, name } */
function check(plan, pol, { lvl, feature } = {}, today) {
  if (!pol || pol.on !== true) return null;
  const T = tierOf(plan, today); if (!T) return null;
  if (LV.includes(lvl) && LV.indexOf(lvl) > LV.indexOf(MAX_LV[T.tier])) { const need = TIERS.find(x => LV.indexOf(MAX_LV[x]) >= LV.indexOf(lvl)); return { need, name: NAME[need], tier: T.tier }; }
  const f = FEAT_MIN[feature]; if (f && rank(T.tier) < rank(f)) return { need: f, name: NAME[f], tier: T.tier };
  return null;
}
const MSG = { admin: n => `이 기능은 ${n} 요금제부터 이용할 수 있습니다. 설정 › 요금제에서 확인하거나 산타에 문의하십시오.`,
  learner: () => '이 과제의 AI 도움은 지금 기관 요금제에서 쓸 수 없어요. 막히면 선생님께 질문 넘기기를 이용해 주세요.' };
/* 호출부용: 막히면 HttpErr(403, plan_feature) */
function guard(HttpErr, plan, pol, q, today, learner) {
  const r = check(plan, pol, q, today); if (!r) return;
  throw new HttpErr(403, learner ? MSG.learner() : MSG.admin(r.name), 'plan_feature');
}
module.exports = { TIERS, NAME, CODE_TIER, MAX_LV, FEAT_MIN, TRIAL_DAYS, tierOf, check, guard, MSG };
