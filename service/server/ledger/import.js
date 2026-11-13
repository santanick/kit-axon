'use strict';
/* v41 파일 가져오기 · 자동 대사(09 3절 POST /api/ledger/import {kind, csv, fileName}).
   vbank(대학 등록금 가상계좌 수납 결과): 학번 + 금액 → 미납 청구서 잔액과 일치하면 vbank_ext 수납(쉐어 제외)으로 원장 반영(같은 줄 재가져오기는 idem으로 무시).
   van(VAN 매입 내역): 승인번호 + 금액 + 날짜(±1일) → 단말 수납 확인. toss_settle(토스 정산): 주문번호 + 금액 + 날짜(±3일) → 온라인 수납 확인, 쉐어 열이 있으면 실제 쉐어로 저장.
   CSV 첫 줄은 열 이름(한글 · 영문). 이름 · 연락처 · 카드번호 열은 읽지 않고 저장하지 않는다. */
const COL = { day: /^(day|date|입금일|입금일자|거래일|거래일자|승인일|승인일자|정산일|일자|결제일)$/i, amount: /^(amount|금액|입금액|승인금액|결제금액|거래금액)$/i, share: /^(share|쉐어|파트너쉐어|파트너수수료)$/i,
  vbank: /^(ref|sid|학번|수험번호|납부자번호)$/i, van: /^(ref|approval|approvalno|승인번호)$/i, toss_settle: /^(ref|orderid|주문번호)$/i };
const dayOf = s => { const m = /^(\d{4})[-./]?(\d{2})[-./]?(\d{2})/.exec(String(s || '').trim()); return m ? `${m[1]}-${m[2]}-${m[3]}` : ''; };
const amt = s => { const n = Math.round(+String(s || '').replace(/[,\s원]/g, '')); return Number.isFinite(n) ? n : NaN; };
module.exports = (ctx, S) => {
  const { pool, inTenant, audit } = ctx; const { E, calc, str } = S;
  function parse(kind, csv) {
    const rows = calc.csvRows(csv); if (rows.length < 2) throw E(400, 'csv', '가져올 내용이 없습니다.'); if (rows.length > 20001) throw E(413, 'too_large', '한 번에 2만 줄까지 가져올 수 있습니다.');
    const H = rows[0].map(h => String(h).trim().replace(/\s/g, '')); const ix = k => H.findIndex(h => COL[k].test(h));
    const d = ix('day'), a = ix('amount'), r = ix(kind), sh = ix('share'); if (a < 0 || r < 0) throw E(400, 'columns', '금액 · 번호 열을 찾지 못했습니다. 첫 줄 열 이름을 확인해 주십시오.', { need: ['amount', kind === 'vbank' ? '학번' : kind === 'van' ? '승인번호' : '주문번호'] });
    return rows.slice(1).map(x => ({ day: d >= 0 ? dayOf(x[d]) : '', amount: amt(x[a]), ref: str(x[r], 60).trim(), share: sh >= 0 ? amt(x[sh]) : null }));
  }
  async function run(a, b) {
    const kind = String(b.kind || ''); if (!['vbank', 'van', 'toss_settle'].includes(kind)) throw E(400, 'kind', '가져올 파일 종류를 확인해 주십시오.');
    const rows = parse(kind, b.csv); const fileName = str(b.fileName, 120) || null;
    return inTenant(pool, a.tid, async c => { await S.needOn(c, a.tid); let cands = [], tol = null, already = 0; const made = [];
      if (kind === 'vbank') {
        const bills = (await c.query("select distinct bill_id from led_charge where tenant_id = $1 and status in ('open','partial')", [a.tid])).rows.map(r => r.bill_id);
        const L = bills.length ? await S.linesOf(c, a.tid, { bills }) : { bal: { lines: [] }, by: new Map() }; const G = new Map();
        for (const l of L.bal.lines) { if (l.balance <= 0) continue; const x = L.by.get(l.id); const g = G.get(l.bill) || { id: l.bill, day: x.due || '', amount: 0, keys: [x.sid], unit: x.unit_id, ids: [] }; g.amount += l.balance; g.ids.push(l.id); G.set(l.bill, g); }
        cands = [...G.values()];
      } else if (kind === 'van') { tol = 1; cands = (await c.query("select id, to_char(paid_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') as day, amount, approval_no from led_receipt where tenant_id = $1 and method = 'desk_card' and status = 'paid' and approval_no is not null and paid_at > now() - interval '120 days'", [a.tid])).rows.map(r => ({ id: r.id, day: r.day, amount: r.amount, keys: [r.approval_no] })); }
      else { tol = 3; cands = (await c.query("select id, to_char(paid_at at time zone 'Asia/Seoul', 'YYYY-MM-DD') as day, amount, toss_order_id, toss_payment_key from led_receipt where tenant_id = $1 and channel = 'toss' and status = 'paid' and paid_at > now() - interval '120 days'", [a.tid])).rows.map(r => ({ id: r.id, day: r.day, amount: r.amount, keys: [r.toss_order_id, r.toss_payment_key].filter(Boolean) })); }
      /* 이미 가져온 가상계좌 줄은 건너뛴다(재실행 안전) */
      const idemOf = r => `imp:vbank:${r.ref}:${r.day}:${r.amount}`; const keep = [];
      if (kind === 'vbank') { const have = new Set((await c.query('select idem_key from led_receipt where tenant_id = $1 and idem_key = any($2)', [a.tid, rows.map(idemOf)])).rows.map(r => r.idem_key)); rows.forEach((r, i) => { if (have.has(idemOf(r))) already++; else keep.push(i); }); } else rows.forEach((r, i) => keep.push(i));
      const M = calc.match(keep.map(i => rows[i]), cands, { dayTol: tol }); const byId = new Map(cands.map(x => [x.id, x]));
      if (kind === 'vbank') for (const m of M.matched) { const r = rows[keep[m.row]], g = byId.get(m.id);
        const { row } = await S.record(c, a.tid, { unit: g.unit, sid: g.keys[0], chargeIds: g.ids, method: 'vbank_ext', channel: 'import', amount: r.amount, paidAt: r.day ? new Date(r.day + 'T12:00:00+09:00') : new Date(), shareEligible: false, by: a.email, idem: idemOf(r) }); made.push(row.id); }
      const unmatched = M.unmatched.map(u => { const r = rows[keep[u.row]]; return { row: keep[u.row] + 2, reason: u.reason, day: r.day, amount: r.amount, ref: r.ref }; });
      const meta = kind === 'toss_settle' ? { shareActual: rows.reduce((s, r) => s + (Number.isFinite(r.share) ? r.share : 0), 0), ym: (rows.find(r => r.day) || { day: '' }).day.slice(0, 7), hasShare: rows.some(r => r.share != null) } : {};
      const id = S.rid('li_'); await c.query('insert into led_import (tenant_id, id, kind, file_name, rows, matched, unmatched, meta, by_staff) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)', [a.tid, id, kind, fileName, rows.length, M.matched.length, JSON.stringify(unmatched), JSON.stringify(meta), a.email]);
      await audit(c, a.tid, a.email, 'ledger.import', { import: id, kind, rows: rows.length, matched: M.matched.length, receipts: made.length });
      return { ok: true, import: { id, kind, rows: rows.length, matched: M.matched.length, already, receipts: made, unmatched, meta } }; });
  }
  return { run, parse };
};
