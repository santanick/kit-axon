'use strict';
/* v38 A-17 쿠폰 · 할인 코드 — 서버 계산(학습자 화면 didisam/coupon.js · Java DdCoupon과 같은 규칙).
   - POST /api/pub/<tid>/coupon {code, cls}: 로그인한 학습자만. 코드 목록은 돌려주지 않고 이 코드의 결과만.
   - pay 이벤트에 cpn이 있으면 서버가 쿠폰 · 가격(게시본 강좌 가격, lshop priceOf와 같은 계산)을 다시 계산해 금액이 다르면 거절, 맞으면 cpnOff · cpnOk를 붙여 저장.
   - 사용 횟수 = 이 코드가 담긴 pay 이벤트 수(운영자 문서를 서버가 고치지 않는다). */
const norm = s => String(s || '').toUpperCase().replace(/\s+/g, '').slice(0, 20);
const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
/* 게시본 강좌의 판매가(할인 · 얼리버드 반영) — didisam/lshop.js priceOf와 같다 */
function priceOf(x, day) { if (!x) return 0; let p = +x.price || 0; const d = x.discount; if (d && d.on && (!d.until || day <= d.until)) p -= d.type === 'amount' ? (+d.v || 0) : Math.round(p * (+d.v || 0) / 100);
  const e = x.recruit && x.recruit.early; if (e && e.on && (!e.until || day <= e.until)) p -= Math.round(p * (+e.rate || 0) / 100); return Math.max(0, Math.round(p)); }
function calc(list, code, cls, price, used, day) {
  const k = norm(code); if (!k) return { ok: false, msg: '쿠폰 코드를 입력해 주세요.' };
  const c = (Array.isArray(list) ? list : []).find(x => x && norm(x.code) === k && x.on !== false);
  if (!c) return { ok: false, msg: '없는 쿠폰 코드예요. 코드를 다시 확인해 주세요.' };
  if (c.from && day && day < c.from) return { ok: false, msg: `${c.from}부터 쓸 수 있는 쿠폰이에요.` };
  if (c.until && day && day > c.until) return { ok: false, msg: '사용 기한이 지난 쿠폰이에요.' };
  if (Array.isArray(c.cls) && c.cls.length && !c.cls.includes(cls)) return { ok: false, msg: '이 강좌에는 쓸 수 없는 쿠폰이에요.' };
  if (+c.max > 0 && (+used || 0) >= +c.max) return { ok: false, msg: '사용 횟수가 모두 끝난 쿠폰이에요.' };
  const p = Math.max(0, Math.round(+price || 0)); if (!p) return { ok: false, msg: '결제 금액이 없는 강좌에는 쓸 수 없어요.' };
  const v = Math.max(0, +c.v || 0); const off = c.type === 'amount' ? Math.min(p, Math.round(v)) : Math.min(p, Math.floor(p * Math.min(100, v) / 100 / 10) * 10);
  if (!off) return { ok: false, msg: '할인 금액이 0원인 쿠폰이에요.' };
  return { ok: true, code: k, off, final: p - off, label: c.type === 'amount' ? `${off.toLocaleString('ko-KR')}원 할인` : `${Math.min(100, v)}% 할인` };
}
/* c: 기관 범위 트랜잭션 연결. 쿠폰 · 게시본 강좌 · 사용 횟수를 읽어 계산 */
/* personal(code, cls): v42 마일리지 개인 쿠폰(1회용 · 본인 sid만, mileage/index.js personalCoupon). 기관 쿠폰에 없는 코드일 때만 확인한다 */
async function check(c, tid, code, cls, personal) {
  const r = (await c.query("select doc->'coupons' cp, doc->'lsite'->'pub'->'classes' cl, doc->'lsite'->'pub'->'pay' pay from tenant_state where tenant_id = $1", [tid])).rows[0];
  if (!r) return { ok: false, msg: '없는 기관입니다.' }; if (r.pay === false) return { ok: false, msg: '이 기관은 결제를 받지 않아요.' };
  const x = (Array.isArray(r.cl) ? r.cl : []).find(k => k && k.id === cls); if (!x) return { ok: false, msg: '강좌를 찾지 못했어요.' };
  const used = +((await c.query("select count(*)::int n from learner_events where tenant_id = $1 and type = 'pay' and upper(data->>'cpn') = $2", [tid, norm(code)])).rows[0] || {}).n || 0;
  const R = calc(r.cp, code, cls, priceOf(x, kstDay()), used, kstDay());
  if (!R.ok && personal && norm(code) && !(Array.isArray(r.cp) && r.cp.some(k => k && norm(k.code) === norm(code)))) { const P = await personal(norm(code), cls); if (P) { if (!P.ok) return P;
    const p = priceOf(x, kstDay()); if (!p) return { ok: false, msg: '결제 금액이 없는 강좌에는 쓸 수 없어요.' }; const off = Math.min(p, Math.max(0, Math.round(+P.off || 0))); return { ok: true, code: norm(code), off, final: p - off, label: P.label, personal: true }; } }
  return R;
}
module.exports = { norm, calc, priceOf, check, kstDay };
