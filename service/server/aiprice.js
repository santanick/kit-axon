'use strict';
/* v47 AI 사용량 요금표 — 기관 월 포함량 · 추가 충전 상품 가격의 단일 원천(Java: cmm/DdAiPrice에 같은 값).
   방향(대표님): AI는 구독료와 별도로 쓴 만큼. 추가 토큰 가격 = 원가 단가 × 2.5, 부가세 별도(결제 금액 = 공급가 + 부가세 10%).
   기관 설정 S.aiplan = { monthTokens, overage: 'block'|'pack' } — 없으면(기존 기관) 월 한도를 적용하지 않는다(동작 불변). */

/* 확인 필요: 100만 토큰당 원가(원, 입력 · 출력 혼합 평균). 자리값입니다 — 실제 모델 단가 · 환율 · 입출력 비율 확정 후 바꿉니다. */
const COST_KRW_PER_M = 7500;
const MARKUP = 2.5;
const VAT = 0.1;
/* 확인 필요: 구독료에 포함되는 기본 월 토큰(자리값). 고객군별 요금제 확정 후 바꿉니다. */
const MONTH_DEFAULT = 2000000;
/* 기관이 고를 수 있는 월 포함량(정운영자만 바꿀 수 있고, 이 값들 밖은 서버가 받지 않음) */
const TIERS = [1000000, 2000000, 5000000, 10000000, 20000000, 50000000];
/* 추가 충전 상품 */
const PACKS = [{ id: 'p1m', tokens: 1000000, name: '100만 토큰' }, { id: 'p5m', tokens: 5000000, name: '500만 토큰' }, { id: 'p20m', tokens: 20000000, name: '2,000만 토큰' }];

/* 가격: 공급가는 100원 단위 반올림 */
const priceOf = tokens => { const supply = Math.round(tokens / 1e6 * COST_KRW_PER_M * MARKUP / 100) * 100; const vat = Math.round(supply * VAT); return { supply, vat, total: supply + vat }; };
const packs = () => PACKS.map(p => ({ ...p, ...priceOf(p.tokens) }));
const packOf = id => { const p = PACKS.find(x => x.id === id); return p ? { ...p, ...priceOf(p.tokens) } : null; };

/* 기관 설정 정규화. on은 aiplan이 있고 monthTokens가 양수일 때만 */
function planOf(raw) {
  const p = raw && typeof raw === 'object' ? raw : null;
  const on = !!p && Number.isFinite(+p.monthTokens) && +p.monthTokens > 0;
  return { on, monthTokens: on && TIERS.includes(Math.round(+p.monthTokens)) ? Math.round(+p.monthTokens) : MONTH_DEFAULT, overage: p && p.overage === 'block' ? 'block' : 'pack' };
}
/* 비교용 열쇠(jsonb는 키 순서를 바꾸므로 값만 비교) */
const planKey = raw => raw && typeof raw === 'object' ? `${Math.round(+raw.monthTokens || 0)}|${raw.overage === 'block' ? 'block' : raw.overage === 'pack' ? 'pack' : ''}` : '';
const validPlan = raw => raw == null || (typeof raw === 'object' && (raw.monthTokens == null || TIERS.includes(+raw.monthTokens)) && (raw.overage == null || raw.overage === 'block' || raw.overage === 'pack'));

/* 이달 상태(KST). today = 'YYYY-MM-DD' */
const monthOf = today => today.slice(0, 7);
async function monthState(c, tid, plan, today) {
  const month = monthOf(today);
  const used = +(await c.query('select coalesce(sum(tin + tout), 0)::bigint n from ai_usage where tenant_id = $1 and day >= $2::date', [tid, month + '-01'])).rows[0].n;
  const credit = +(await c.query("select coalesce(sum(tokens), 0)::bigint n from ai_credit where tenant_id = $1 and month = $2 and status = 'paid'", [tid, month])).rows[0].n;
  return stateOf(plan, month, used, credit);
}
/* 계산만(Java DdAiPrice.state와 같은 규칙): 80% 주의 · 100% 초과. 포함량을 넘으면 충전량에서 빠진다 */
function stateOf(plan, month, used, credit) {
  const included = plan.monthTokens; const limit = included + credit;
  const pct = limit > 0 ? Math.floor(used * 100 / limit) : 0;
  const creditLeft = Math.max(0, Math.min(credit, limit - Math.max(used, included)));
  return { month, used, included, credit, creditLeft, remaining: Math.max(0, limit - used), pct, state: !plan.on ? 'off' : pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok' };
}
/* 차단 문구: 학습자(해요체) · 운영자(합니다체) */
const MSG_LEARNER = '이번 달 AI 사용량을 다 썼어요. 선생님께 질문을 넘겨 주세요';
const MSG_STAFF = '이번 달 AI 사용량(포함량 + 추가 충전량)을 모두 썼습니다. 설정 → AI 사용량에서 추가 충전하십시오.';

module.exports = { COST_KRW_PER_M, MARKUP, VAT, MONTH_DEFAULT, TIERS, PACKS, priceOf, packs, packOf, planOf, planKey, validPlan, monthOf, monthState, stateOf, MSG_LEARNER, MSG_STAFF };
