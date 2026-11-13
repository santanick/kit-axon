'use strict';
/* v40 시설 · 장비 예약 계산 — 화면(didisam/fac-core.js window.facCalc) · Java(DdFac)와 같은 규칙. 기준값: tests/fac-vectors.json
   - 모든 입력 · 출력은 JSON. 시각은 ISO 문자열(오프셋 포함) 또는 epoch ms, 날짜는 KST 'YYYY-MM-DD'.
   - 금액은 원 단위 정수, 할인 · 수수료 · 환불은 10원 미만 내림(coupon.js와 같음). */
const KST = 9 * 3600e3;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const AUDS = ['student', 'staff', 'public'];
const floor10 = n => Math.floor(Math.max(0, n) / 10) * 10;
const ms = t => typeof t === 'number' ? t : Date.parse(t);
const kstDay = t => new Date(ms(t) + KST).toISOString().slice(0, 10);
const kstMin = t => { const d = new Date(ms(t) + KST); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const dayMs = day => Date.parse(day + 'T00:00:00+09:00');
const addDays = (day, n) => new Date(dayMs(day) + n * 864e5 + KST).toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((dayMs(b) - dayMs(a)) / 864e5); /* b − a */
const dow = day => new Date(dayMs(day) + KST).getUTCDay();
const hm = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const toMin = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; };
const isoKst = t => new Date(ms(t) + KST).toISOString().slice(0, 16) + '+09:00';
const won = n => `${Math.round(n).toLocaleString('ko-KR')}원`;

/* 그날 운영 시간 [열림분, 닫힘분] 또는 null(휴무) */
function hoursOf(fac, day) { const H = (fac && fac.hours) || {}; const h = H[dow(day)] !== undefined ? H[dow(day)] : H.all; if (!Array.isArray(h) || h.length < 2) return null; const a = toMin(h[0]), b = toMin(h[1]); return a == null || b == null || b <= a ? null : [a, b]; }
const slotMinOf = fac => Math.max(5, Math.min(240, +(fac && fac.slotMin) || 60));
/* 그날 칸 목록 [{slot, from, to}] */
function slotsOf(fac, day) { const h = hoursOf(fac, day); if (!h) return []; const s = slotMinOf(fac); const out = []; for (let i = 0, m = h[0]; m + s <= h[1]; i++, m += s) out.push({ slot: i, from: hm(m), to: hm(m + s) }); return out; }
/* 칸의 시작 · 종료 시각(epoch ms) */
function slotTime(fac, day, startSlot, slots) { const h = hoursOf(fac, day); if (!h) return null; const s = slotMinOf(fac); const a = dayMs(day) + (h[0] + startSlot * s) * 60e3; return { startAt: a, endAt: a + slots * s * 60e3 }; }

/* 휴관 판정: closed[{from,to,repeat:'weekly'|''}] 또는 운영 시간 없음 */
function closedOn(fac, day) {
  if (!hoursOf(fac, day)) return { closed: true, reason: '운영하지 않는 날이에요.' };
  for (const c of Array.isArray(fac.closed) ? fac.closed : []) { if (!c || !DAY_RE.test(c.from || '')) continue; const to = DAY_RE.test(c.to || '') ? c.to : c.from;
    if (c.repeat === 'weekly' ? day >= c.from && dow(day) === dow(c.from) && (!c.until || day <= c.until) : day >= c.from && day <= to) return { closed: true, reason: String(c.reason || '휴관일이에요.') }; }
  return { closed: false };
}

/* 오픈 판정: 신청 기간(windows) · 오픈 시각(open.daysAhead · open.at) · 휴관 · 지난 날. 서버 시각만 믿는다.
   반환 { ok:true, lastDay } | { ok:false, code:'past'|'closed'|'not_open'|'window', opensAt?, reason? } */
function openState(fac, day, now) {
  if (!DAY_RE.test(String(day || ''))) return { ok: false, code: 'date' };
  const today = kstDay(now);
  if (day < today) return { ok: false, code: 'past' };
  const W = (Array.isArray(fac.windows) ? fac.windows : []).filter(w => w && DAY_RE.test(w.from || '') && DAY_RE.test(w.to || ''));
  if (W.length && !W.some(w => today >= w.from && today <= w.to)) { const nx = W.filter(w => w.from > today).sort((a, b) => a.from < b.from ? -1 : 1)[0]; return { ok: false, code: 'window', ...(nx ? { opensAt: nx.from + 'T00:00+09:00' } : {}) }; }
  const o = fac.open || {}; let lastDay = null;
  if (o.daysAhead != null && +o.daysAhead >= 0) { const at = toMin(o.at) == null ? 0 : toMin(o.at); const n = Math.floor(+o.daysAhead); lastDay = addDays(today, kstMin(now) >= at ? n : n - 1);
    if (day > lastDay) return { ok: false, code: 'not_open', opensAt: `${addDays(day, -n)}T${hm(at)}+09:00` }; }
  const c = closedOn(fac, day); if (c.closed) return { ok: false, code: 'closed', reason: c.reason };
  return { ok: true, ...(lastDay ? { lastDay } : {}) };
}

const needVerifyOf = (fac, aud) => !!fac && fac.verify && fac.verify !== 'none' && (aud === 'student' || aud === 'staff');

/* 견적: 시간 예약 = prices[aud].slot × 칸 수. 이용권 · 대여 상품 = 상품 정가(prices[aud], 없으면 days × unitPrice[aud]) − 할인(discountRate %, 10원 내림한 결제액 기준).
   반환 { list, off, final, deposit, lines, needVerify, pay, approval } | { error } */
function quote({ fac, aud, day, startSlot, slots, product }) {
  if (!fac) return { error: 'fac' };
  if (!AUDS.includes(aud) || (Array.isArray(fac.audience) && fac.audience.length && !fac.audience.includes(aud))) return { error: 'aud' };
  const pay = fac.pay || 'free', approval = !!fac.approval, needVerify = needVerifyOf(fac, aud);
  if (product) {
    const P = product.prices && product.prices[aud]; const days = Math.max(0, Math.round(+product.days || 0)); const U = product.unitPrice && product.unitPrice[aud];
    const list = P != null && P !== '' ? Math.max(0, Math.round(+P)) : U != null ? Math.max(0, Math.round(days * +U)) : null; if (list == null) return { error: 'price' };
    const rate = Math.max(0, Math.min(100, +product.discountRate || 0)); const final = pay === 'free' ? 0 : rate ? floor10(list * (100 - rate) / 100) : list; const off = pay === 'free' ? list : list - final; const deposit = product.type === 'rent' ? Math.max(0, Math.round(+product.deposit || 0)) : 0;
    const lines = [{ label: product.name ? String(product.name) : '이용권', amount: list }]; if (off) lines.push({ label: pay === 'free' ? '무료 이용' : `할인 ${rate}%`, amount: -off }); if (deposit) lines.push({ label: '보증금(반납 시 돌려받아요)', amount: deposit });
    return { list, off, final, deposit, lines, needVerify, pay, approval };
  }
  const n = Math.round(+slots || 0), s0 = Math.round(+startSlot); const mn = Math.max(1, +fac.minSlots || 1), mx = Math.max(mn, +fac.maxSlots || 1);
  if (!(n >= mn && n <= mx)) return { error: 'slots' };
  const S = slotsOf(fac, day); if (!Number.isInteger(s0) || s0 < 0 || s0 + n > S.length) return { error: 'slot' };
  const unit = Math.max(0, Math.round(+((fac.prices || {})[aud] || {}).slot || 0)); const list = unit * n; const final = pay === 'free' ? 0 : list; const off = list - final;
  const lines = [{ label: `${S[s0].from}~${S[s0 + n - 1].to} ${n}칸 × ${won(unit)}`, amount: list }]; if (off) lines.push({ label: '무료 이용', amount: -off });
  return { list, off, final, deposit: 0, lines, needVerify, pay, approval };
}

/* 이용권 기간: 결제일 포함 days일. 같은 상품이 유효하면 기존 만료일 다음 날부터(연장 구매) */
function passPeriod(product, today, prevEnd) { const start = prevEnd && prevEnd >= today ? addDays(prevEnd, 1) : today; const kind = product.type === 'pass-count' ? 'count' : product.type === 'pass-course' ? 'course' : 'period';
  const days = Math.max(1, Math.round(+(kind === 'count' ? product.expireDays || 365 : product.days || 30)));
  return { kind, startsOn: start, endsOn: addDays(start, days - 1), total: kind === 'count' ? Math.max(1, Math.round(+product.count || 1)) : days }; }

/* 환불 계산 — 결정 4(월이용권), 02 명세 4절. 반환 { auto, lines, rate? }
   time: steps [{beforeH, rate}] 위에서부터 시작까지 남은 시간 ≥ beforeH인 첫 구간, 마지막 {rate}는 그 밖.
   pass-period: 사용 횟수 구간(tiers [{max, deduct}], 기본 0:0 · 5:5 · 10:10, 그 이상 환불 없음) → 결제액 − 단가 × deduct − 결제액 × feeRate%.
   pass-count: 결제액 − 단가 × 사용 횟수 − 결제액 × feeRate% (tiers가 있으면 위와 같은 구간식).
   rent: 보증금 − 연체료 − 파손 차감. 모두 0 미만은 0, 10원 미만 내림. */
const DEF_TIERS = [{ max: 0, deduct: 0 }, { max: 5, deduct: 5 }, { max: 10, deduct: 10 }];
function refund({ rule, paid, used, startAt, now, deposit, lateFee, deductions }) {
  const R = rule || {}; const p = Math.max(0, Math.round(+paid || 0)); const lines = [];
  if (R.type === 'time') {
    const h = (ms(startAt) - ms(now)) / 3600e3; const steps = Array.isArray(R.steps) && R.steps.length ? R.steps : [{ beforeH: 24, rate: 100 }, { rate: 0 }];
    if (h <= 0) { lines.push({ label: '이용 시작 후에는 환불되지 않아요', amount: 0 }); return { auto: 0, rate: 0, lines }; }
    const st = steps.find(x => x && (x.beforeH == null || h >= +x.beforeH)) || { rate: 0 }; const rate = Math.max(0, Math.min(100, +st.rate || 0)); const auto = rate === 100 ? p : floor10(p * rate / 100);
    lines.push({ label: '결제액', amount: p }); lines.push({ label: st.beforeH == null ? `시작 전 그 밖의 구간: ${rate}% 환불` : `시작 ${st.beforeH}시간 전까지: ${rate}% 환불`, amount: auto - p });
    return { auto, rate, lines };
  }
  if (R.type === 'pass-period' || R.type === 'pass-count') {
    const n = Math.max(0, Math.round(+used || 0)); const unit = Math.max(0, Math.round(+R.unitPrice || 0)); const fee = floor10(p * Math.max(0, +(R.feeRate == null ? 10 : R.feeRate)) / 100);
    const tiers = Array.isArray(R.tiers) && R.tiers.length ? R.tiers : R.type === 'pass-period' ? DEF_TIERS : null;
    let deduct;
    if (tiers) { const t = tiers.slice().sort((a, b) => a.max - b.max).find(x => n <= +x.max); if (!t) { lines.push({ label: '결제액', amount: p }, { label: `${n}회 이용: 환불 없음`, amount: -p }); return { auto: 0, lines }; } deduct = +t.deduct || 0; }
    else deduct = n;
    const auto = floor10(p - unit * deduct - fee);
    lines.push({ label: '결제액', amount: p }); if (deduct) lines.push({ label: `이용 ${n}회: 일일권 ${won(unit)} × ${deduct}회`, amount: -unit * deduct }); lines.push({ label: `수수료 ${R.feeRate == null ? 10 : R.feeRate}%`, amount: -fee });
    return { auto, lines };
  }
  if (R.type === 'rent') {
    const d = Math.max(0, Math.round(+deposit || 0)), lf = Math.max(0, Math.round(+lateFee || 0)), dd = Math.max(0, Math.round(+deductions || 0));
    lines.push({ label: '보증금', amount: d }); if (lf) lines.push({ label: '연체료', amount: -lf }); if (dd) lines.push({ label: '파손 · 분실 차감', amount: -dd });
    return { auto: Math.max(0, d - lf - dd), lines };
  }
  lines.push({ label: '결제액(전액 환불)', amount: p }); return { auto: p, lines };
}

/* 연체료 = min(보증금 상한, 연체일 × 일 연체료). 반납일이 기한 다음 날부터 연체 */
function lateFee({ dueDay, returnDay, perDay, cap }) { const d = Math.max(0, diffDays(dueDay, returnDay)); const f = d * Math.max(0, Math.round(+perDay || 0)); return { days: d, fee: cap != null && +cap > 0 ? Math.min(+cap, f) : f }; }

/* 노쇼: 확정 예약이 시작 후 noShowMin분 안에 입장하지 않으면 */
function isNoShow({ status, checkedIn, startAt, noShowMin, now }) { if (status !== 'confirmed' || checkedIn) return false; const m = noShowMin == null ? 15 : +noShowMin; if (!(m > 0)) return false; return ms(now) >= ms(startAt) + m * 60e3; }

/* 예약 정지(결정 3): 노쇼 날짜를 시간순으로 세어 strikes(기본 3)회째 날부터 days(기본 30)일 정지, 정지 뒤 다시 0부터.
   반환 { suspended, until(정지 마지막 날), count(현재 누적) } */
function suspension({ noShowDays, strikes, days, today }) {
  const k = Math.max(1, +strikes || 3), D = Math.max(1, +days || 30); let n = 0, until = null;
  for (const d of (Array.isArray(noShowDays) ? noShowDays : []).filter(x => DAY_RE.test(x)).sort()) { if (until && d <= until) continue; n++; if (n >= k) { until = addDays(d, D - 1); n = 0; } }
  return { suspended: !!until && today <= until, until, count: n };
}

/* 동일인 중복: 같은 날 · 같은 묶음(exclGroup)에서 칸이 겹치면 true */
function dupSame(existing, req) { const a0 = +req.startSlot, a1 = a0 + (+req.slots); return (Array.isArray(existing) ? existing : []).some(b => b && b.sid === req.sid && b.day === req.day && (b.group || '') === (req.group || '') && +b.startSlot < a1 && a0 < +b.startSlot + (+b.slots)); }

module.exports = { AUDS, floor10, kstDay, kstMin, dayMs, addDays, diffDays, dow, isoKst, hoursOf, slotsOf, slotTime, closedOn, openState, quote, passPeriod, refund, lateFee, isNoShow, suspension, dupSame, needVerifyOf };
