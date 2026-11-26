/* 디디쌤 콘텐츠 마켓 v1.1(크레딧형 패스 + CP 선택 참여) — 계산 공용(브라우저 window.marketCalc · Node require).
   Node service/server/market/calc.js(이 파일 사본 · 테스트가 동일성 확인) · Java DdMarketCalc · 화면(market.js · mkcp.js · mkops.js · lmarket.js)이 모두 같은 값을 내야 한다.
   기준값: tests/market-vectors.json(서비스 기획서 v1.1 10장 · f/vec.py 42개와 같은 키). 규칙을 바꾸면 벡터 · Java를 함께 바꾼다.
   - 원 · 크레딧은 정수, 나눗셈은 내림. 과정 크레딧 환산(정가 → 크레딧)만 올림. 비율은 bp(1/10000) 정수.
   - 날짜는 'YYYY-MM-DD'(KST 달력 날짜) 문자열. 1인 과정 수는 ×10 정수(1.5 → 15)로 계산한다. */
(function (root) {
  'use strict';
  const WON = 1000;            /* 1크레딧 = 1,000원(부가세 별도) */
  const CP_BP = 6500, SANTA_BP = 3500;
  const BONUS_MAX_BP = 700;    /* 보너스 상한 7% */
  const GUARD_BP = 3000;       /* 마진 가드 30% */
  const BONUS_STEPS = [{ from: 30000000, bp: 300 }, { from: 50000000, bp: 700 }]; const BUNDLE_BP = 700;
  const RESTORE_HOURS = 168, RESTORE_PROG_LT = 10;
  const ALERT_BP = [2000, 1000];
  const SINGLE_CP_BP = 7000;   /* 개별 임대: 견적가의 70%가 CP 후보(산타 30%) */
  const int = v => { const n = Math.trunc(+v); return Number.isFinite(n) ? n : 0; };
  const fdiv = (a, b) => Math.floor(a / b);
  const cdiv = (a, b) => -Math.floor(-a / b);

  /* 1) 과정 크레딧 = ⌈CP 정가(1인) ÷ 1,000⌉ */
  const credits = price => Math.max(0, cdiv(int(price), WON));

  /* 2) 보너스율: 번들 또는 5,000만 원 이상 7% · 3,000만 원 이상 3% · 그 밖 0(상한 7%) */
  function bonusBp(amount, bundle) {
    const a = int(amount); let b = bundle ? BUNDLE_BP : 0;
    for (const s of BONUS_STEPS) if (a >= s.from) b = Math.max(b, s.bp);
    return Math.min(BONUS_MAX_BP, b);
  }
  /* wallet(구매액, 번들, 보너스율 지정?) → {base, bonus, bonusBp, total}. 지정 보너스율은 0~상한만(넘으면 bonusOver: true) */
  function wallet(amount, bundle, bp) {
    const base = Math.max(0, fdiv(int(amount), WON)); const want = bp == null ? bonusBp(amount, bundle) : int(bp);
    const use = Math.max(0, Math.min(BONUS_MAX_BP, want)); const bonus = fdiv(base * use, 10000);
    return { base, bonus, bonusBp: use, total: base + bonus, ...(want > BONUS_MAX_BP ? { bonusOver: true } : {}) };
  }

  /* 3) 예상 수강: 수강 건수 = ⌊크레딧 ÷ 평균 과정 크레딧⌋, 인원 = ⌊수강 건수 × 10 ÷ 1인 과정 수×10⌋ */
  const cpp10 = v => { const n = Math.round(+v * 10); return n > 0 ? n : 15; };
  function estimate(totalCredits, avgCredits, coursesPerPerson) {
    const t = Math.max(0, int(totalCredits)); const avg = Math.max(1, int(avgCredits)); const k = cpp10(coursesPerPerson == null ? 1.5 : coursesPerPerson);
    const enrollments = fdiv(t, avg); return { total: t, enrollments, people: fdiv(enrollments * 10, k) };
  }

  /* 4) 마진 가드(전량 소진 가정): santaBp = ⌊(구매액 − (구매 + 보너스) 크레딧 × 650) × 10000 ÷ 구매액⌋ ≥ 3000 */
  function guard(amount, bp) {
    const a = int(amount); const base = fdiv(a, WON); const cr = base + fdiv(base * int(bp), 10000);
    const cpMax = fdiv(cr * WON * CP_BP, 10000); const santaBp = a > 0 ? fdiv((a - cpMax) * 10000, a) : 0;
    return { credits: cr, cpMax, santaBp, ok: a > 0 && santaBp >= GUARD_BP && int(bp) <= BONUS_MAX_BP };
  }
  /* 부분 소진 참고치: used = ⌊크레딧 × pct ÷ 100⌋ */
  function partial(amount, totalCredits, pct) {
    const used = fdiv(int(totalCredits) * int(pct), 100); const cp = fdiv(used * WON * CP_BP, 10000); return { used, cp, santa: int(amount) - cp };
  }
  /* 예산형 계산기(A3 · A10 · POST /credit/plan): 예산 → 크레딧 → 예상 수강 · 인원 + 마진 가드 */
  function plan(o) {
    o = o || {}; const avg = Math.max(1, int(o.avgCredits || 45));
    let budget = int(o.budget);
    if (!(budget > 0) && int(o.people) > 0) budget = cdiv(int(o.people) * cpp10(o.coursesPerPerson == null ? 1.5 : o.coursesPerPerson) * avg, 10) * WON; /* 인원 → 필요 크레딧(보너스 전) */
    const w = wallet(budget, !!o.bundle, o.bonusBp); const g = guard(budget, w.bonusBp); const e = estimate(w.total, avg, o.coursesPerPerson);
    return { budget, credits: w.base, bonusBp: w.bonusBp, bonusCredits: w.bonus, total: w.total, avgCredits: avg, enrollments: e.enrollments, people: e.people, santaBp: g.santaBp, cpMax: g.cpMax, ok: g.ok && !w.bonusOver, ...(w.bonusOver ? { bonusOver: true } : {}) };
  }

  /* 5) CP 수량 할인(한계 적용 · CP 부담): n번째 수강(1부터) 차감 크레딧. volRules [{fromN, offBp}] 중 fromN ≤ n인 가장 큰 규칙 */
  function discCredits(price, offBp) { return cdiv(fdiv(int(price) * (10000 - int(offBp)), 10000), WON); }
  function useCredits(price, nth, volRules) {
    let best = null; for (const r of volRules || []) if (r && int(r.fromN) > 0 && int(nth) >= int(r.fromN) && (!best || int(r.fromN) > int(best.fromN))) best = r;
    return best ? discCredits(price, best.offBp) : credits(price);
  }
  /* n건 누적 합(V1 · V3): {total, full, disc} — 규칙 하나(fromN, offBp) 기준 */
  function deductMany(price, n, fromN, offBp) {
    const full = credits(price); const disc = discCredits(price, offBp == null ? 1000 : offBp); const f = int(fromN == null ? 500 : fromN); const k = Math.min(int(n), f - 1);
    return { total: k * full + Math.max(0, int(n) - k) * disc, full, disc };
  }

  /* 6) 복원: 차감 후 168시간 이내 · 진도 10% 미만 */
  const restorable = (hours, progPct) => +hours <= RESTORE_HOURS && +progPct < RESTORE_PROG_LT;
  const hoursBetween = (fromIso, toIso) => (Date.parse(toIso) - Date.parse(fromIso)) / 3600e3;

  /* 7) 월 소진 정산: CP별 순소진 = 차감 − 복원, CP 지급 = ⌊순소진 × 1,000 × 65%⌋, 산타 = 총 소진액 − CP 합 */
  const cpOf = cr => fdiv(int(cr) * WON * CP_BP, 10000);
  function settle(rows) {
    /* rows [{cp, used, restored, cpBp?}] — cpBp(차등 요율 · 오리지널 0)가 있으면 그 요율, 없으면 6500 */
    const by = {}; for (const r of rows || []) { if (!r) continue; const k = String(r.cp); const x = by[k] || (by[k] = { cp: k, used: 0, restored: 0 }); x.used += int(r.used); x.restored += int(r.restored); if (r.cpBp != null) x.cpBp = int(r.cpBp); }
    const lines = Object.keys(by).sort().map(k => { const x = by[k]; const net = x.used - x.restored; const l = { cp: k, used: x.used, restored: x.restored, net, cpAmount: x.cpBp == null ? cpOf(net) : fdiv(net * x.cpBp, 10) }; if (x.cpBp != null) l.cpBp = x.cpBp; return l; });
    const net = lines.reduce((s, l) => s + l.net, 0); const cp = lines.reduce((s, l) => s + l.cpAmount, 0); const gross = net * WON;
    return { lines, net, gross, cp, santa: gross - cp };
  }
  const sum = a => (a || []).reduce((s, v) => s + int(v), 0);

  /* 8) 유효 · 이월: 유효 = 시작 + 1년 − 1일(2/29 시작은 다음 해 3/1 기준), 이월 = 그 다음 1년 */
  const pd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? [+m[1], +m[2], +m[3]] : null; };
  const fmt = t => new Date(t).toISOString().slice(0, 10);
  const U = (y, m, d) => Date.UTC(y, m - 1, d);
  const addDays = (s, n) => { const p = pd(s); return p ? fmt(U(p[0], p[1], p[2]) + n * 864e5) : null; };
  const lastDay = (y, m) => new Date(U(y, m + 1, 0)).getUTCDate();
  function yearOn(y, m, d) { return m === 2 && d === 29 && lastDay(y, 2) < 29 ? fmt(U(y, 3, 1)) : fmt(U(y, m, d)); }
  function expiry(start) {
    const p = pd(start); if (!p) return null; const v = yearOn(p[0] + 1, p[1], p[2]); const q = pd(v);
    return { validTo: addDays(v, -1), carryTo: addDays(v, -1) }; /* r3: 자동 이월 폐지 — carryTo = validTo(기존 코드 호환) */
  }
  /* 사용 순서: 만료(carryTo) 이른 로트 → 구매(paid · topup · carry) → 보너스 → id. lots [{id?, kind|lot, exp|carryTo, remain}] */
  const lotRank = k => k === 'bonus' ? 1 : 0;
  function lotOrder(lots) {
    return (lots || []).filter(Boolean).map((l, i) => ({ l, i })).sort((a, b) => {
      const ea = String(a.l.exp || a.l.carryTo || ''), eb = String(b.l.exp || b.l.carryTo || '');
      return ea < eb ? -1 : ea > eb ? 1 : lotRank(a.l.kind || a.l.lot) - lotRank(b.l.kind || b.l.lot) || String(a.l.id || '').localeCompare(String(b.l.id || '')) || a.i - b.i; }).map(x => x.l);
  }
  function useLots(lots, n) {
    let left = int(n); const out = [];
    for (const l of lotOrder(lots)) { const r = Math.max(0, int(l.remain)); const t = Math.min(r, Math.max(0, left)); left -= t; out.push({ id: l.id, kind: l.kind || l.lot, take: t, remain: r - t }); }
    return { lots: out, short: Math.max(0, left) };
  }

  /* 9) 기관 통제 */
  const capOk = (usedMonth, course, cap) => cap == null || cap === '' || int(cap) <= 0 ? true : int(usedMonth) + int(course) <= int(cap);
  const needApproval = (course, th) => th == null || th === '' || int(th) <= 0 ? false : int(course) >= int(th);
  function alertOf(bal, total, bps) {
    const L = (bps && bps.length ? bps : ALERT_BP).map(int).filter(x => x > 0).sort((a, b) => a - b); const b = int(bal) * 10000, t = int(total);
    for (const x of L) if (b <= t * x) return 'r' + (x / 100); return '';
  }

  /* 화면 공용 이름(개발자 3 market.js와 같은 규칙) — 위 함수의 별칭 · 다른 반환형 */
  const alertLevel = (total, bal, bps) => { if (!(int(total) > 0)) return 0; const r = alertOf(bal, total, bps); return r ? int(r.slice(1)) : 0; }; /* 잔액 ≤ 10% → 10, ≤ 20% → 20, 그 밖 0 */
  const preNeeded = (preFrom, course) => needApproval(course, preFrom);
  const validity = start => expiry(start); /* { validTo: 시작 + 1년 − 1일, carryTo = validTo(r3 자동 이월 없음) } */

  /* 10) 단가 변경: 신청일 다음 달 1일부터(소급 없음) */
  function effectiveFrom(asked) { const p = pd(asked); if (!p) return null; return p[1] === 12 ? fmt(U(p[0] + 1, 1, 1)) : fmt(U(p[0], p[1] + 1, 1)); }
  /* history [{effectiveFrom, listPrice, ...}] → day에 쓰는 행(effectiveFrom ≤ day 중 가장 늦은 것) */
  function priceAt(history, day) {
    let best = null; for (const h of history || []) if (h && h.effectiveFrom && h.effectiveFrom <= day && (!best || h.effectiveFrom >= best.effectiveFrom)) best = h; return best;
  }

  /* 11) opt-in: 출시 + N개월 개별 전용(말일 넘침은 그 달 말일), 최소 참여 = 참여 시작 + 1년 */
  function addMonths(s, n) { const p = pd(s); if (!p) return null; const m = p[1] - 1 + int(n); const y = p[0] + Math.floor(m / 12), mm = ((m % 12) + 12) % 12 + 1; return fmt(U(y, mm, Math.min(p[2], lastDay(y, mm)))); }
  const eligibleFrom = (launch, months) => addMonths(launch, months);
  function optinMinEnd(from) { const p = pd(from); return p ? yearOn(p[0] + 1, p[1], p[2]) : null; }
  /* 현재 모드: single_until이면 day ≥ 출시 + N개월일 때 credit */
  function optinMode(o, day) {
    if (!o || o.withdrawnAt) return 'single'; if (o.mode === 'single_until') { const f = eligibleFrom(o.launchedAt || o.creditFrom, o.singleMonths); return f && day >= f ? 'credit' : 'single_until'; } return o.mode === 'credit' ? 'credit' : 'single';
  }

  /* 12) 개별 판매 전용(v1.0 유지): CP 후보 = 견적가 × 70%, floor 합 이하면 자동 승인, 최소 견적가 = ⌈floor × 10 ÷ 7⌉ */
  const singleCand = price => fdiv(int(price) * SINGLE_CP_BP, 10000);
  const singleAuto = (price, floorSum) => singleCand(price) >= int(floorSum);
  const singleMin = floorSum => cdiv(int(floorSum) * 10000, SINGLE_CP_BP);
  function singleGuard(price, cpPay, reward) { const p = int(price); const s = p > 0 ? fdiv((p - int(cpPay) - int(reward || 0)) * 10000, p) : 0; return { santaBp: s, ok: p > 0 && s >= GUARD_BP }; }

  /* 13) 유지 규칙: 중개 30/15/35 · B2C 공급가 = ⌊부가세 포함 × 10 ÷ 11⌋(마켓 유입 CP 70 · 산타 30 / 자체 유입 판매자 90 · 산타 10) · 경로 60/15/25 */
  const pct = (v, p) => fdiv(int(v) * p, 100);
  const broker = amount => ({ market: pct(amount, 30), direct: pct(amount, 15), agency: pct(amount, 35) });
  function b2c(vatPrice) { const sup = fdiv(int(vatPrice) * 10, 11); return { supply: sup, market: { cp: pct(sup, 70), santa: pct(sup, 30) }, self: { seller: pct(sup, 90), santa: sup - pct(sup, 90) } }; }
  function path(vatPrice) { const sup = fdiv(int(vatPrice) * 10, 11); return { supply: sup, cp: pct(sup, 60), curator: pct(sup, 15), santa: pct(sup, 25) }; }

  /* ── 마진 개선 1차(dev-addendum): M1 산타 오리지널 · M2 CP 프로모션 진열 · M3 CP별 차등 요율 ── */
  const RATE = { standard: 6500, exclusive: 6000, agency: 5500, overseas: 5000 }; /* CP 몫 bp, 6500 초과 금지 */
  const SLOT = { home_top: { cap: 3, fee: 500000, label: '마켓 홈 추천' }, shelf_top: { cap: 3, fee: 300000, label: '학습자 진열대 첫 줄' }, new_launch: { cap: 10, fee: 200000, label: '신규 출시', launchDays: 90 } };
  const ORIG_CAP_BP = 3000, PROMO_MAX_MONTHS = 3;
  const RATE_BPS = [6500, 6000, 5500, 5000];
  const rateKindOf = bp => Object.keys(RATE).find(k => RATE[k] === int(bp)) || null;
  /* 요율 지정 검사: 네 값 중 하나 + CP 서면 동의 번호 → null(통과) | 'mk_cp_rate' */
  const rateCheck = (bp, agreeRef) => RATE_BPS.includes(int(bp)) && String(agreeRef || '').trim() ? null : 'mk_cp_rate';
  /* rows [{effectiveFrom, cpBp}] 중 effectiveFrom ≤ day 최신(없으면 6500) */
  function rateAt(rows, day) { let b = null; for (const r of rows || []) if (r && r.effectiveFrom <= day && (!b || r.effectiveFrom >= b.effectiveFrom)) b = r; return b ? int(b.cpBp) : CP_BP; }
  const cpBpOf = (product, cpBp) => product && (product.ownerKind === 'santa' || product.owner_kind === 'santa') ? 0 : cpBp == null ? CP_BP : int(cpBp);
  /* 순소진 한 줄: cp = net × cpBp ÷ 10(1크레딧 1,000원), santa = net × 1,000 − cp */
  function settleLine(net, cpBp) { const b = int(cpBp); if (b !== 0 && !RATE_BPS.includes(b)) return { error: 'mk_cp_rate' }; const cp = fdiv(int(net) * b, 10); return { cp, santa: int(net) * WON - cp }; }
  const promoFee = (slot, months) => SLOT[slot] ? SLOT[slot].fee * int(months) : 0;
  /* 신청 검사 → { fee } | { error }. o: {approvedInMonth(달별 최대), optin, reviewed, orig, launchDays, thisYm} */
  function promoCheck(slot, months, o) {
    o = o || {}; const S = SLOT[slot]; const M = Array.isArray(months) ? months.map(String) : [];
    if (!S || o.orig || (o.optin || 'credit') !== 'credit' || o.reviewed === false || (slot === 'new_launch' && int(o.launchDays) > S.launchDays)) return { error: 'mk_promo_target' };
    if (!M.length || M.length > (slot === 'new_launch' ? 1 : PROMO_MAX_MONTHS) || M.some(m => !/^\d{4}-\d{2}$/.test(m) || m <= String(o.thisYm || '')) || new Set(M).size !== M.length) return { error: 'mk_promo_months' };
    if (int(o.approvedInMonth) >= S.cap) return { error: 'mk_promo_full' };
    return { fee: S.fee * M.length };
  }
  function promoDeduct(total, fee, carryIn) { const t = int(total), f = int(fee) + int(carryIn); const d = Math.min(t, f); return { deduct: d, pay: t - d, carryOut: f - d }; }
  const origCapOk = (colCount, origCount) => (int(origCount) + 1) * 10000 <= ORIG_CAP_BP * (int(colCount) + 1);
  /* 인식 매출: 소진 크레딧 × 계약 구매액 ÷ 계약 총크레딧(반올림) */
  const recognized = (credits, amount, totalCredits) => int(totalCredits) > 0 ? fdiv(2 * int(credits) * int(amount) + int(totalCredits), 2 * int(totalCredits)) : 0;
  /* lines [{source, credits, cpBp}] → { bySource[{source, credits, gross, cp, santa, santaBp}], gross, cp, santa, santaBp } */
  function santaMix(lines) {
    /* 줄 두 모양: 크레딧 줄 {source, credits, cpBp} · 금액 줄 {source, amount, cp}(프로모션 수수료 · 개별 임대 · 중개 · B2C — cp는 CP · 판매자 지급액, 없으면 0) */
    const by = {}; for (const l of lines || []) { if (!l) continue; const k = String(l.source || 'credit_cp'); const x = by[k] || (by[k] = { source: k, credits: 0, gross: 0, cp: 0, santa: 0 });
      if (l.amount != null) { const g = int(l.amount), c = Math.min(g, Math.max(0, int(l.cp))); x.gross += g; x.cp += c; x.santa += g - c; continue; }
      const r = settleLine(l.credits, l.cpBp == null ? CP_BP : l.cpBp); if (r.error) continue;
      x.credits += int(l.credits); x.gross += int(l.credits) * WON; x.cp += r.cp; x.santa += r.santa; }
    const L = Object.keys(by).sort().map(k => ({ ...by[k], santaBp: by[k].gross > 0 ? fdiv(by[k].santa * 10000, by[k].gross) : 0 }));
    const gross = L.reduce((s, x) => s + x.gross, 0), cp = L.reduce((s, x) => s + x.cp, 0); return { bySource: L, gross, cp, santa: gross - cp, santaBp: gross > 0 ? fdiv((gross - cp) * 10000, gross) : 0 };
  }

  /* 소멸 · 이월 · 해지 환불(policy v1.3 제19 · 19조의2 · 40조, code-changes r3 C3) — 크레딧은 「연간 콘텐츠 이용권」의 이용 한도.
     · 기간 종료(validTo 다음 날) 모든 로트 소멸, 자동 이월 없음. · 해지(기관 사정) = ⌊max(0, 남은 유료 − 사용 보너스) × 1,000 × (1 − 위약금 10%)⌋, 14일 이내 · 사용 0이면 전액,
       산타 귀책 = 남은 유료 × 1,000 전액. · public_license는 계약 조건 우선(contract, 금액만 계산) · public_postpaid는 선불 없음(none).
     lots [{lot, credits, remain, validTo|carryTo}], o { start, usedTotal, cause, penaltyBp, buyerMode } */
  const PENALTY_BP = 1000, CARRY_BP = 2000, CARRY_MAX_BP = 5000, RENEW_GRACE_DAYS = 30, REFUND_FULL_DAYS = 14;
  function refundOf(lots, day, o) { o = o || {}; const L = (lots || []).map(l => ({ lot: l.lot || l.kind || 'paid', credits: int(l.credits), remain: int(l.remain), to: l.validTo || l.carryTo || l.exp || '' }));
    const P = L.filter(l => l.lot !== 'bonus'), B = L.filter(l => l.lot === 'bonus'); const pen = Math.min(PENALTY_BP, Math.max(0, o.penaltyBp == null ? PENALTY_BP : int(o.penaltyBp)));
    const bonusUsed = B.reduce((s, l) => s + Math.max(0, l.credits - l.remain), 0); const paidAll = P.reduce((s, l) => s + l.credits, 0);
    const live = P.filter(l => !l.to || day <= l.to); const paidUnused = live.reduce((s, l) => s + l.remain, 0); const out = (mode, amount, penalty, pu) => ({ mode, paidUnused: pu == null ? paidUnused : pu, bonusUsed, penalty, amount });
    if (o.buyerMode === 'public_postpaid') return out('none', 0, 0);
    if (!live.length) return out('none', 0, 0, 0); /* 기간 종료 — 소멸, 환불 없음 */
    if (o.start && int(o.usedTotal || 0) === 0 && day <= addDays(o.start, REFUND_FULL_DAYS - 1)) return out('full', paidAll * WON, 0, paidAll);
    if (o.cause === 'santa') return out('santa_fault', paidUnused * WON, 0);
    const base = Math.max(0, paidUnused - bonusUsed) * WON; const amount = fdiv(base * (10000 - pen), 10000);
    return out(o.buyerMode === 'public_license' ? 'contract' : 'terminate', amount, base - amount); }
  /* 갱신 이월: 직전 validTo + 30일 안에 맺은 갱신만. 이월 = min(남은 유료, ⌊min(직전 유료, 갱신 유료) × carryBp ÷ 10000⌋), carryBp 기본 20% · 상한 50%. 보너스 · 이월분은 다시 옮기지 않음 */
  function carryOf(prev, renew, o) { o = o || {}; const bp = Math.min(CARRY_MAX_BP, Math.max(0, o.carryBp == null ? CARRY_BP : int(o.carryBp))); const unused = Math.max(0, int(prev && prev.paidUnused));
    const limit = fdiv(Math.min(int(prev && prev.paidCredits), int(renew && renew.paidCredits)) * bp, 10000);
    if (!prev || !renew || !prev.validTo || !renew.signedAt || renew.signedAt > addDays(prev.validTo, RENEW_GRACE_DAYS)) return { ok: false, credits: 0, limit, lapse: unused, reason: 'late' };
    const credits = Math.min(unused, limit); return { ok: true, credits, limit, lapse: unused - credits, reason: '' }; }

  /* 세금계산서(r3 C4, 부가가치세법 제15 · 17조): 계약 확정 = 「발행 대기」 레코드. 작성일 = 구매 확정일, 공급가액 = 이용권 가격(보너스 제외 — 무상 제공분은 공급가액 미포함), 부가세 10% 내림.
     환불 확정 시 수정세금계산서(전액 = 계약 해제, 일부 = 공급가액 감소) — 작성일 = 환불 확정일, 금액은 음수, 원 세금계산서(fixOf)에 연결 */
  function taxOf(supply, bonusCredits, day) { const sp = Math.max(0, int(supply)); const vat = fdiv(sp, 10);
    return { status: 'wait', date: day, supply: sp, vat, total: sp + vat, bonusCredits: Math.max(0, int(bonusCredits || 0)), bonusInSupply: false, no: null, fixes: [] }; }
  function taxFixOf(tax, refundAmount, day) { const amt = Math.min(Math.max(0, int(refundAmount)), int(tax && tax.supply)); if (!amt) return null; const vat = fdiv(amt, 10);
    return { status: 'wait', kind: amt >= int(tax.supply) ? 'cancel' : 'reduce', date: day, supply: -amt, vat: -vat, total: -(amt + vat), fixOf: (tax && tax.no) || 'issue' }; }

  const rules = () => ({ won: WON, cpBp: CP_BP, santaBp: SANTA_BP, guardBp: GUARD_BP, bonus: { steps: BONUS_STEPS.map(s => ({ ...s })), bundleBp: BUNDLE_BP, maxBp: BONUS_MAX_BP }, validMonths: 12, carryMonths: 12, restore: { hours: RESTORE_HOURS, progLtPct: RESTORE_PROG_LT }, alertBp: ALERT_BP.slice() });

  const api = { WON, CP_BP, SANTA_BP, BONUS_MAX_BP, GUARD_BP, rules, credits, bonusBp, wallet, estimate, guard, partial, plan, discCredits, useCredits, deductMany, restorable, hoursBetween, cpOf, settle, sum,
    RATE, SLOT, ORIG_CAP_BP, PROMO_MAX_MONTHS, rateKindOf, rateCheck, rateAt, cpBpOf, settleLine, promoFee, promoCheck, promoDeduct, origCapOk, recognized, santaMix, nextMonth1: d => effectiveFrom(d),
    expiry, validity, addDays, addMonths, lotOrder, useLots, capOk, needApproval, preNeeded, alertOf, alertLevel, effectiveFrom, priceAt, eligibleFrom, optinMinEnd, optinMode, singleCand, singleAuto, singleMin, singleGuard, broker, b2c, path, refundOf, carryOf, taxOf, taxFixOf, PENALTY_BP, CARRY_BP, CARRY_MAX_BP };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.marketCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
