/* v40 시설 · 장비 예약 — 계산 규칙(화면 공용: 스튜디오 fac.js · 학습자 lfac.js).
   서버(service/server/fac/calc.js) · Java(DdFac)와 같은 규칙이며 tests/fac-vectors.json으로 대조한다.
   계산 함수만 둔다(화면 · 저장 없음). 금액은 원 단위 정수, 10원 미만은 내림(쿠폰과 같은 방식).
   window.facCalc / module.exports(Node 테스트) 둘 다 제공. */
(function (root) {
  'use strict';
  const floor10 = n => Math.max(0, Math.floor((Number(n) || 0) / 10) * 10);
  const toMin = hm => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm || '')); return m ? +m[1] * 60 + +m[2] : null; };
  const toHM = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const dow = day => new Date(day + 'T00:00:00Z').getUTCDay();
  const addDays = (day, n) => { const t = new Date(day + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
  const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5);
  const won = n => (Number(n) || 0).toLocaleString('ko-KR') + '원';
  /* 'YYYY-MM-DDTHH:MM'(KST, 시간대 표기 없음) → 분 단위 절대값 */
  const absMin = s => { const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(String(s || '')); if (!m) return NaN; return Date.parse(m[1] + 'T00:00:00Z') / 6e4 + +m[2] * 60 + +m[3]; };

  /* 운영 시간: hours[요일] = [열림, 닫힘] | null. 휴관(closed)은 날짜 범위 또는 반복 요일(repeat: '0,6') */
  function dayHours(fac, day) {
    const h = fac && fac.hours ? fac.hours[dow(day)] : null; if (!h || !h[0] || !h[1]) return null;
    const cl = (fac.closed || []).find(c => (c.from && day >= c.from && day <= (c.to || c.from)) || (c.repeat && String(c.repeat).split(',').map(Number).includes(dow(day))));
    if (cl) return { closed: true, reason: cl.reason || '휴관' };
    return { from: toMin(h[0]), to: toMin(h[1]) };
  }
  /* 시간 칸 목록: [{slot, sm, em, from, to}] */
  function slots(fac, day) {
    const H = dayHours(fac, day); if (!H || H.closed) return [];
    const st = Math.max(5, +fac.slotMin || 60); const out = [];
    for (let m = H.from, i = 0; m + st <= H.to; m += st, i++) out.push({ slot: i, sm: m, em: m + st, from: toHM(m), to: toHM(m + st) });
    return out;
  }
  /* 오픈 판정: 신청 기간(windows) → 운영 시간 · 휴관 → 오픈 시각(open.daysAhead · open.at) */
  function isOpen(fac, day, now) {
    const today = String(now).slice(0, 10), nowM = toMin(String(now).slice(11, 16)) || 0;
    if (day < today) return { open: false, reason: 'past' };
    const W = fac.windows || [];
    if (W.length && !W.some(w => today >= w.from && today <= w.to)) return { open: false, reason: 'window' };
    const H = dayHours(fac, day); if (!H) return { open: false, reason: 'off' };
    if (H.closed) return { open: false, reason: 'closed', note: H.reason };
    const o = fac.open || {}; const ahead = +o.daysAhead || 0; if (!ahead) return { open: true };
    const at = toMin(o.at || '00:00') || 0; const far = addDays(today, nowM >= at ? ahead : ahead - 1);
    if (day > far) return { open: false, reason: 'not_open', opensAt: addDays(day, -ahead) + 'T' + toHM(at) };
    return { open: true };
  }
  /* 견적: 시간 예약은 칸당 단가 × 칸 수, 이용권은 정가 × (1 − 할인율), 대여는 기간 단가 × 기간 수 + 보증금(별도) */
  function quote(q) {
    const fac = q.fac || {}, p = q.product || null, aud = q.aud || 'public'; const lines = []; let list = 0, off = 0;
    if (p && /^pass-/.test(p.type)) {
      list = Math.max(0, Math.round(+((p.prices || {})[aud]) || 0)); const r = Math.min(100, Math.max(0, +p.discountRate || 0));
      lines.push(`${p.name} 정가 ${won(list)}`); off = list - floor10(list * (100 - r) / 100); if (off) lines.push(`기간 할인 ${r}% −${won(off)}`);
    } else if (p && p.type === 'rent') {
      const unit = Math.max(0, Math.round(+((p.prices || {})[aud]) || 0)); const n = Math.max(1, +q.units || 1); list = unit * n;
      lines.push(`${p.name} ${won(unit)} × ${n}${p.per === 'month' ? '개월' : '일'}`);
    } else {
      const unit = Math.max(0, Math.round(+(((fac.prices || {})[aud] || {}).slot) || 0)); const n = Math.max(1, +q.slots || 1); list = unit * n;
      lines.push(`${unit ? won(unit) : '무료'} × ${n}칸`);
      /* 시간대 할증(선택): fac.peak = [{ dows:[1..5], from:'18:00', add:3000, aud? }] — q.day · q.sm(시작 분)이 있을 때 칸마다 적용 */
      if (unit && q.day && q.sm != null) (fac.peak || []).forEach(pk => { if (pk.aud && pk.aud !== aud) return; const f = toMin(pk.from) || 0, st = Math.max(5, +fac.slotMin || 60); let k = 0;
        for (let i = 0; i < n; i++) if ((pk.dows || []).map(Number).includes(dow(q.day)) && +q.sm + i * st >= f) k++;
        if (k && +pk.add) { list += k * +pk.add; lines.push(`${pk.label || pk.from + ' 이후'} +${won(+pk.add)} × ${k}칸`); } });
    }
    const final = floor10(list - off); const deposit = p && p.type === 'rent' ? Math.max(0, +p.deposit || 0) : 0;
    if (deposit) lines.push(`보증금 ${won(deposit)}(반납 시 돌려드림)`);
    const pay = final === 0 ? (fac.approval ? 'after-approve' : 'free') : (fac.pay || 'onsite');
    return { list, off, final, deposit, lines, pay, approval: !!fac.approval, needVerify: fac.verify === 'sid' && aud !== 'public' };
  }
  /* 월이용권 기본 구간(결정 4): 미사용 0회 · 1~5회 5회분 · 6~10회 10회분 · 11회 이상 환불 없음 */
  const PASS_TIERS = [{ upTo: 0, charge: 0 }, { upTo: 5, charge: 5 }, { upTo: 10, charge: 10 }];
  /* 환불: { rule:{type, steps|tiers|feeRate|unitPrice}, paid, usedCount, startAt, now, deposit, lateFee, damage } → { auto, lines } */
  function refund(q) {
    const R = q.rule || {}, paid = Math.max(0, +q.paid || 0); const lines = []; let auto = 0;
    if (R.type === 'time') {
      const h = (absMin(q.startAt) - absMin(q.now)) / 60; const S = (R.steps || []).slice();
      const st = S.find(s => s.beforeH == null || h >= +s.beforeH) || { rate: 0 }; auto = floor10(paid * (+st.rate || 0) / 100);
      lines.push(`시작 ${h >= 0 ? Math.floor(h) + '시간 전' : '이후'} 취소 → ${+st.rate || 0}% 환불`); lines.push(`${won(paid)} × ${+st.rate || 0}% = ${won(auto)}`);
    } else if (R.type === 'pass-period' || R.type === 'pass-count') {
      const used = Math.max(0, +q.usedCount || 0), unit = Math.max(0, +R.unitPrice || 0), fee = floor10(paid * (+R.feeRate || 0) / 100);
      let charge = used;
      if (R.type === 'pass-period') { const T = (R.tiers && R.tiers.length ? R.tiers : PASS_TIERS).slice().sort((a, b) => a.upTo - b.upTo); const t = T.find(x => used <= x.upTo); charge = t ? t.charge : null; }
      if (charge == null) { auto = 0; lines.push(`이용 ${used}회 — 환불 구간을 넘어 환불이 없습니다`); }
      else { auto = floor10(paid - unit * charge - fee); lines.push(`결제액 ${won(paid)}`); if (charge) lines.push(`− 일일권 ${won(unit)} × ${charge}회 = ${won(unit * charge)}`); if (fee) lines.push(`− 수수료 ${+R.feeRate}% = ${won(fee)}`); lines.push(`= ${won(auto)}`); }
    } else if (R.type === 'rent') {
      const dep = Math.max(0, +q.deposit || 0), lf = Math.max(0, +q.lateFee || 0), dm = Math.max(0, +q.damage || 0); auto = Math.max(0, dep - lf - dm);
      lines.push(`보증금 ${won(dep)}`); if (lf) lines.push(`− 연체료 ${won(lf)}`); if (dm) lines.push(`− 파손 차감 ${won(dm)}`); lines.push(`= ${won(auto)}`);
    } else { auto = paid; lines.push(`전액 환불 ${won(paid)}`); }
    return { auto, lines };
  }
  /* 연체료 = min(상한(보증금), 연체일 × 1일 연체료) */
  function lateFee(q) { const d = Math.max(0, dayDiff(q.dueDay, q.returnDay)); const f = d * Math.max(0, +q.perDay || 0); const cap = +q.cap > 0 ? +q.cap : Infinity; return { days: d, fee: Math.min(cap, f) }; }
  /* 중복 판정: 같은 자원 같은 시간 정원 초과 → taken, 같은 사람이 같은 묶음(excl) 시간 겹침 → dup_same */
  const ACTIVE = ['requested', 'approved', 'confirmed', 'checked_in'];
  function conflict(list, r) {
    const ov = b => b.day === r.day && b.sm < r.em && r.sm < b.em && ACTIVE.includes(b.status || 'confirmed');
    const L = (list || []).filter(ov);
    if (r.sid && L.some(b => b.sid === r.sid && (b.res === r.res || (r.excl && b.excl === r.excl)))) return 'dup_same';
    const used = L.filter(b => b.res === r.res).reduce((a, b) => a + Math.max(1, +b.n || 1), 0);
    if (used + Math.max(1, +r.n || 1) > Math.max(1, +r.perSlot || 1)) return 'taken';
    return null;
  }
  /* 노쇼: 시작 후 noShowMin분이 지나도 입장 기록 없음. 누적 banAfter회(기본 3)면 banDays(기본 30)일 예약 정지 */
  function noShow(q) { const late = absMin(q.now) - absMin(q.startAt); return !q.checkedIn && late >= Math.max(1, +q.noShowMin || 15); }
  function ban(q) { const n = +q.count || 0, after = +q.banAfter || 3; if (n < after) return { banned: false }; return { banned: true, until: addDays(q.day, +q.banDays || 30) }; }

  const api = { floor10, toMin, toHM, dow, addDays, dayDiff, dayHours, slots, isOpen, quote, refund, lateFee, conflict, noShow, ban, PASS_TIERS };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.facCalc = api;
})(typeof window !== 'undefined' ? window : null);
