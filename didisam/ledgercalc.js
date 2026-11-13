/* v41.0 통합 수납 원장 — 계산 공용(브라우저 window.ledgerCalc · Node require). 09 개발 규격 4절.
   Node service/server/ledger(이 파일을 그대로 require) · Java DdLedgerCalc · 화면(ledger.js · lledger.js)이 모두 같은 값을 내야 한다.
   기준값: tests/ledger-vectors.json. 규칙을 바꾸면 벡터 · Java를 함께 바꾼다.
   - 금액은 원 단위 정수. 환불 비율 계산은 10원 미만 내림(시설 floor10과 같음), PG 쉐어는 원 단위 내림.
   - 청구 줄(charge): {id, bill, amount, due, at, status}. amount 음수 줄 = 할인(같은 bill의 양수 줄에 앞에서부터 먼저 깎는다).
   - 정렬(오래된 순): due(없으면 '9999-12-31') → at → id. */
(function (root) {
  'use strict';
  const int = v => { const n = Math.round(+v); return Number.isFinite(n) ? n : 0; };
  const floor10 = n => Math.floor(Math.max(0, n) / 10) * 10;
  const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  const ord = (a, b) => cmp(a.due || '9999-12-31', b.due || '9999-12-31') || cmp(String(a.at || ''), String(b.at || '')) || cmp(String(a.id), String(b.id));

  /* 줄별 실제 낼 금액(due): 같은 bill의 할인(음수 합)을 양수 줄에 정렬 순서대로 먼저 깎는다. void 줄은 0 */
  function dueOf(charges) {
    const live = (charges || []).filter(c => c && c.status !== 'void'); const out = {}; const bills = {};
    for (const c of live) { const k = c.bill || c.id; (bills[k] = bills[k] || []).push(c); }
    for (const k of Object.keys(bills)) {
      const L = bills[k].slice().sort(ord); let disc = -L.filter(c => int(c.amount) < 0).reduce((s, c) => s + int(c.amount), 0);
      for (const c of L) { const a = int(c.amount); if (a <= 0) { out[c.id] = 0; continue; } const d = Math.min(a, disc); disc -= d; out[c.id] = a - d; }
    }
    return out;
  }

  /* balance(charges, allocs) → {lines:[{id,bill,due,paid,balance,status}], total, paid, balance}
     allocs: [{charge, amount}] (수납 배분 − 정정 · 환불로 되돌린 배분은 음수로 넣는다) */
  function balance(charges, allocs) {
    const D = dueOf(charges); const P = {};
    for (const a of allocs || []) if (a && a.charge != null) P[a.charge] = (P[a.charge] || 0) + int(a.amount);
    const live = (charges || []).filter(c => c && c.status !== 'void').slice().sort(ord);
    const lines = live.map(c => { const due = D[c.id] || 0; const paid = Math.max(0, P[c.id] || 0); const bal = Math.max(0, due - paid);
      return { id: c.id, bill: c.bill || c.id, due, paid, balance: bal, status: bal === 0 ? 'paid' : paid > 0 ? 'partial' : 'open' }; });
    /* 할인 줄(음수) 상태는 같은 bill 양수 줄을 따른다 */
    const byBill = {}; for (const l of lines) if (l.due > 0) { const b = byBill[l.bill] || (byBill[l.bill] = { due: 0, bal: 0, paid: 0 }); b.due += l.due; b.bal += l.balance; b.paid += l.paid; }
    for (const l of lines) if (l.due === 0) { const b = byBill[l.bill]; l.status = !b || b.bal === 0 ? 'paid' : b.paid > 0 ? 'partial' : 'open'; }
    const total = lines.reduce((s, l) => s + l.due, 0), paid = lines.reduce((s, l) => s + Math.min(l.paid, l.due), 0);
    return { lines, total, paid, balance: total - paid };
  }

  /* allocate(receiptAmount, openCharges) — 오래된 청구부터 잔액만큼 채운다.
     openCharges: [{id, due?, at?, balance}] → {allocs:[{charge, amount}], rest} (rest > 0 이면 잔액 초과 → 서버는 400 over_balance) */
  function allocate(receiptAmount, openCharges) {
    let left = int(receiptAmount); const allocs = [];
    for (const c of (openCharges || []).filter(x => x && int(x.balance) > 0).slice().sort(ord)) { if (left <= 0) break; const a = Math.min(left, int(c.balance)); allocs.push({ charge: c.id, amount: a }); left -= a; }
    return { allocs, rest: left };
  }

  /* 단위 트리: 자신 + 하위 전부 */
  function unitScope(unit, units, rollup) {
    if (!unit) return null; const set = new Set([unit]); if (!rollup) return set;
    let grew = true; while (grew) { grew = false; for (const u of units || []) if (u && u.parent && set.has(u.parent) && !set.has(u.id)) { set.add(u.id); grew = true; } }
    return set;
  }

  /* summary(rows, {from,to,unit,rollup,units}) — 대시보드 · 리포트의 모든 숫자는 이 함수 하나에서.
     rows: [{kind:'charge', id, unit, day, amount, itemType, balance, status}
            |{kind:'receipt', id, unit, day, amount, method, status, shareEligible}
            |{kind:'refund', id, unit, day, amount, status, receipt, shareEligible}]
     day = KST 'YYYY-MM-DD'(청구는 청구일 · 수납은 paid_at · 환불은 확정일). 수납은 status 'paid', 환불은 'done', 청구는 void 제외만 센다. */
  function summary(rows, opt) {
    const o = opt || {}; const U = unitScope(o.unit, o.units, o.rollup);
    const inR = r => (!o.from || r.day >= o.from) && (!o.to || r.day <= o.to) && (!U || U.has(r.unit));
    const R = (rows || []).filter(r => r && inR(r));
    const rc = R.filter(r => r.kind === 'receipt' && r.status === 'paid'), rf = R.filter(r => r.kind === 'refund' && r.status === 'done'), ch = R.filter(r => r.kind === 'charge' && r.status !== 'void');
    const sum = (a, f) => a.reduce((s, r) => s + int(f ? f(r) : r.amount), 0);
    const paid = sum(rc), refund = sum(rf), net = paid - refund;
    const charged = sum(ch.filter(r => int(r.amount) > 0)) + sum(ch.filter(r => int(r.amount) < 0));
    const unpaid = sum(ch, r => Math.max(0, int(r.balance)));
    const collectRate = charged > 0 ? Math.floor((charged - unpaid) * 1000 / charged) / 10 : 0;
    const add = (m, k, v) => { m[k] = (m[k] || 0) + v; return m; };
    const byMethod = rc.reduce((m, r) => add(m, r.method || 'etc', int(r.amount)), {});
    const byItem = ch.reduce((m, r) => add(m, r.itemType || 'etc', int(r.amount)), {});
    const byUnit = {}; for (const r of rc) add(byUnit, r.unit, int(r.amount)); for (const r of rf) add(byUnit, r.unit, -int(r.amount));
    const dm = {}; const dd = d => dm[d] || (dm[d] = { day: d, paid: 0, refund: 0, net: 0 });
    for (const r of rc) { const x = dd(r.day); x.paid += int(r.amount); x.net += int(r.amount); }
    for (const r of rf) { const x = dd(r.day); x.refund += int(r.amount); x.net -= int(r.amount); }
    const daily = Object.keys(dm).sort().map(k => dm[k]);
    const sh = share(R, o.units || []);
    return { net, paid, refund, charged, unpaid, collectRate, byMethod, byItem, byUnit, daily, share: { eligible: sh.eligible, estimate: sh.estimate } };
  }

  /* share(rows, units) — PG 쉐어 추정. 단위별 쉐어 대상(share_eligible 수납 paid − 그 수납의 환불 done) × share_rate_bp ÷ 10000, 단위별 원 단위 내림 후 합산.
     units: [{id, parent, shareRateBp}] (없으면 40bp = 0.4%) */
  function share(rows, units) {
    const rate = {}; for (const u of units || []) if (u && u.id != null) rate[u.id] = u.shareRateBp == null ? 40 : int(u.shareRateBp);
    const el = {};
    for (const r of rows || []) { if (!r || !r.shareEligible) continue;
      if (r.kind === 'receipt' && r.status === 'paid') el[r.unit] = (el[r.unit] || 0) + int(r.amount);
      if (r.kind === 'refund' && r.status === 'done') el[r.unit] = (el[r.unit] || 0) - int(r.amount); }
    const list = Object.keys(el).sort().map(u => { const e = Math.max(0, el[u]); const bp = rate[u] == null ? 40 : rate[u]; return { unit: u, eligible: e, rateBp: bp, estimate: Math.floor(e * bp / 10000) }; });
    return { units: list, eligible: list.reduce((s, x) => s + x.eligible, 0), estimate: list.reduce((s, x) => s + x.estimate, 0) };
  }

  /* refund({rule, paid, used, total, months, month, refunded, auto}) — 02 §3-1.
     rule: hakwon_law · lifelong_law(학습자 사유: 시작 전 전액 · 1/3 전 2/3 · 1/2 전 1/2 · 이후 0, 여러 달이면 현재 달은 이 기준 + 남은 달 전액)
           org_fault · remote · session(남은 비율 = (total − used)/total) · full · none · book(used>0이면 0) · manual(원금, 직원이 수정) · facility(auto 그대로)
     used/total: 현재 달의 경과 · 총 교습시간(분) 또는 회차. months: 총 개월(기본 1), month: 사유 발생 달(1부터, 0이면 시작 전).
     결과 { auto, lines:[{label, amount}], lawCheck } — auto ≤ paid − refunded. 학원법 · 평생교육법 · 교재는 원문 미확인이라 lawCheck:true */
  function refund(x) {
    const a = x || {}; const rule = String(a.rule || 'manual'); const paid = Math.max(0, int(a.paid)); const cap = Math.max(0, paid - Math.max(0, int(a.refunded)));
    const used = Math.max(0, +a.used || 0), total = Math.max(0, +a.total || 0); const lines = []; let auto = 0; let lawCheck = false;
    const month1 = amt => { if (used <= 0) return { r: amt, l: '시작 전 전액' }; if (!total) return { r: 0, l: '총 시간 미입력' };
      if (used * 3 < total) return { r: floor10(amt * 2 / 3), l: '1/3 경과 전 2/3' }; if (used * 2 < total) return { r: floor10(amt / 2), l: '1/2 경과 전 1/2' }; return { r: 0, l: '1/2 경과 후 반환 없음' }; };
    if (rule === 'hakwon_law' || rule === 'lifelong_law') {
      lawCheck = true; const months = Math.max(1, int(a.months || 1)); const m = Math.max(0, Math.min(months, int(a.month == null ? 1 : a.month)));
      if (m === 0 || (m === 1 && used <= 0)) { auto = paid; lines.push({ label: '시작 전 전액', amount: paid }); }
      else { const per = Math.floor(paid / months); const cur = month1(m === months ? paid - per * (months - 1) : per); lines.push({ label: `${m}개월 차 ${cur.l}`, amount: cur.r }); auto = cur.r;
        const rest = months - m; if (rest > 0) { const r2 = per * rest; lines.push({ label: `남은 ${rest}개월 전액`, amount: r2 }); auto += r2; } }
    } else if (rule === 'org_fault' || rule === 'remote' || rule === 'session') {
      const r = total > 0 ? floor10(paid * Math.max(0, total - used) / total) : paid; auto = r; lines.push({ label: rule === 'remote' ? '수강분 공제' : rule === 'session' ? '잔여 회차' : '기관 사유 잔여분', amount: r });
    } else if (rule === 'full') { auto = paid; lines.push({ label: '전액', amount: paid }); }
    else if (rule === 'none') { auto = 0; lines.push({ label: '환불 없음', amount: 0 }); }
    else if (rule === 'book') { lawCheck = true; auto = used > 0 ? 0 : paid; lines.push({ label: used > 0 ? '사용 · 다운로드 후 반환 없음' : '미사용 전액', amount: auto }); }
    else if (rule === 'facility') { auto = a.auto == null ? paid : Math.max(0, int(a.auto)); lines.push({ label: '시설 규정', amount: auto }); }
    else { auto = paid; lines.push({ label: '직원 확인', amount: paid }); }
    if (auto > cap) { lines.push({ label: '이미 환불한 금액 차감', amount: cap - auto }); auto = cap; }
    return { auto, lines, lawCheck };
  }

  /* match(importRows, cands, {dayTol}) — 파일 가져오기 자동 대사.
     importRows: [{day, amount, ref}], cands: [{id, day, amount, keys:[...]}] (학번 · 주문번호 · 승인번호 등)
     규칙: ref가 keys에 있고 금액이 같고 날짜 차이 ≤ dayTol(null이면 날짜 무시)인 첫 미사용 후보(정렬: day → id). 한 후보는 한 번만.
     결과 {matched:[{row, id}], unmatched:[{row, reason:'amount'|'day'|'none'}]} — reason: 같은 ref 후보는 있으나 금액 다름 'amount', 날짜 다름 'day', 없음 'none' */
  function match(importRows, cands, opt) {
    const tol = opt && opt.dayTol != null ? int(opt.dayTol) : null; const used = new Set(); const matched = [], unmatched = [];
    const C = (cands || []).filter(Boolean).slice().sort((a, b) => cmp(String(a.day || ''), String(b.day || '')) || cmp(String(a.id), String(b.id)));
    const dd = (a, b) => Math.abs(Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 864e5;
    (importRows || []).forEach((r, i) => {
      const ref = String(r && r.ref != null ? r.ref : '').trim(); const amt = int(r && r.amount);
      const same = ref ? C.filter(c => !used.has(c.id) && (c.keys || []).map(String).includes(ref)) : [];
      const hit = same.find(c => int(c.amount) === amt && (tol == null || !r.day || !c.day || dd(r.day, c.day) <= tol));
      if (hit) { used.add(hit.id); matched.push({ row: i, id: hit.id }); return; }
      unmatched.push({ row: i, reason: !same.length ? 'none' : same.some(c => int(c.amount) === amt) ? 'day' : 'amount' });
    });
    return { matched, unmatched };
  }

  /* CSV 한 줄 나누기(따옴표 · 쉼표) — 가져오기 공용 */
  function csvRows(text) {
    const out = []; let row = [], cell = '', q = false; const s = String(text || '').replace(/^﻿/, '');
    for (let i = 0; i < s.length; i++) { const ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
      if (ch === '"') q = true; else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x !== '')) out.push(row); row = []; } else cell += ch; }
    row.push(cell); if (row.some(x => x !== '')) out.push(row); return out;
  }

  const api = { floor10, dueOf, balance, allocate, unitScope, summary, share, refund, match, csvRows };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ledgerCalc = api;
})(typeof window !== 'undefined' ? window : null);
