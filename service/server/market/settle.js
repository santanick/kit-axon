'use strict';
/* 마켓 월 소진 정산 · 분기 지급 마감(2인 확인) · 지급 지시 파일(spec v1.1 6-4 · 8-4 · 9-2, dev-addendum M1 · M2 · M3).
   - 월 집계: 그 달(KST) 차감 − 그 차감의 복원 = 순소진. CP 몫 = 순소진 × CP 요율(그 달 1일 기준, 기본 6500bp) ÷ 10. 산타 오리지널(owner_kind santa)은 CP 줄 없이 산타 100%.
   - 정산서 lines는 기관 단위 가명 집계(수강 5건 미만은 「5명 미만」), 학습자 개인 정보 없음.
   - 분기 마감: 실행자와 다른 산타 운영자가 확정. 확정 때 장부(cp_use · santa_use · santa_orig · promo_fee · payout) 기록, 프로모션 수수료는 CP 몫에서 공제(이월 포함).
   - 돈은 움직이지 않는다: 지급은 「지급 지시 파일」(CSV)까지. */
module.exports = (ctx, S) => {
  const { E, calc, rid, tx, q1, orgOf, monthsOf, quarterOf, kstDay } = S;
  const MASK = 5;
  const nameCache = new Map();
  const nameOf = async tid => { if (!nameCache.has(tid)) { const o = await orgOf(tid).catch(() => ({ name: '' })); nameCache.set(tid, o.name || ''); if (nameCache.size > 2000) nameCache.clear(); } return nameCache.get(tid); };
  async function rateRows(c, cpTid) { return (await c.query("select rate_kind, cp_bp, to_char(effective_from, 'YYYY-MM-DD') ef from mk_cp_rate where cp_tid = $1 order by effective_from, id", [cpTid])).rows.map(r => ({ effectiveFrom: r.ef, cpBp: r.cp_bp, rateKind: r.rate_kind })); }
  const rateOn = (rows, day) => { const bp = calc.rateAt(rows, day); return { cpBp: bp, rateKind: calc.rateKindOf(bp) || 'standard' }; };

  /* 그 달 순소진 재료: [{cp, owner_kind, buyer, product, used, restored, n}] */
  async function monthRows(c, ym) {
    return (await c.query(`select u.cp_tid cp, p.owner_kind ok, u.buyer_tid buyer, u.product_id product, p.title,
        sum(u.credits)::int used, coalesce(sum(r.cr), 0)::int restored, count(*) filter (where not u.restored)::int n
      from mk_credit_use u join mk_product p on p.id = u.product_id
      left join lateral (select -credits cr from mk_credit_use x where x.kind = 'restore' and x.restore_of = u.id) r on true
      where u.kind = 'use' and to_char(u.at at time zone 'Asia/Seoul', 'YYYY-MM') = $1
      group by u.cp_tid, p.owner_kind, u.buyer_tid, u.product_id, p.title order by u.cp_tid, u.buyer_tid, u.product_id`, [ym])).rows;
  }

  /* POST /api/market/settle/month { ym } — 초안 정산서(draft)는 다시 돌리면 새 값으로 바뀐다. 확정(final) · 이의(disputed)는 그대로 */
  async function month(ym, by) {
    const cur = kstDay().slice(0, 7); if (!S.YM_RE.test(ym) || ym > cur) throw E(400, 'ym', '정산 월을 확인하십시오(이번 달까지).');
    const rows = await tx(c => monthRows(c, ym));
    const names = new Map(); for (const r of rows) if (!names.has(r.buyer)) names.set(r.buyer, await nameOf(r.buyer));
    return tx(async c => {
      const cps = {}; const orig = { used: 0, restored: 0, net: 0 };
      for (const r of rows) {
        if (r.ok === 'santa') { orig.used += r.used; orig.restored += r.restored; orig.net += r.used - r.restored; continue; }
        const x = cps[r.cp] || (cps[r.cp] = { used: 0, restored: 0, lines: [] }); x.used += r.used; x.restored += r.restored;
        x.lines.push({ buyer: names.get(r.buyer) || '기관', product: r.product, title: r.title, enrollments: r.n < MASK ? `${MASK}명 미만` : r.n, net: r.used - r.restored });
      }
      const out = [];
      for (const cp of Object.keys(cps).sort()) {
        const x = cps[cp]; const rt = rateOn(await rateRows(c, cp), ym + '-01'); const net = x.used - x.restored; const L = calc.settleLine(net, rt.cpBp);
        const ex = await q1(c, 'select * from mk_stmt where cp_tid = $1 and ym = $2 for update', [cp, ym]);
        if (ex && ex.status !== 'draft') { out.push(stmtOut(ex)); continue; }
        const v = [cp, ym, quarterOf(ym), x.used, x.restored, net, rt.cpBp, L.cp, L.cp, JSON.stringify(x.lines), rt.rateKind];
        const row = ex ? await q1(c, 'update mk_stmt set used = $4, restored = $5, net = $6, cp_bp = $7, cp_amount = $8, total = $9 + adj, lines = $10, rate_kind = $11, at = now() where cp_tid = $1 and ym = $2 and quarter = $3 returning *', v)
          : await q1(c, 'insert into mk_stmt (id, cp_tid, ym, quarter, used, restored, net, cp_bp, cp_amount, total, lines, rate_kind) values ($12,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *', [...v, rid('ms_')]);
        out.push(stmtOut(row));
      }
      await c.query("update mk_credit_use set settle_ym = $1 where kind = 'use' and settle_ym is null and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') = $1", [ym]);
      const mix = calc.santaMix([...out.map(s => ({ source: s.cpBp === 6500 ? 'credit_cp' : 'credit_cp_rate', credits: s.net, cpBp: s.cpBp })), { source: 'credit_orig', credits: orig.net, cpBp: 0 }]);
      return { ok: true, ym, partial: ym === cur, stmts: out, orig: { ...orig, santa: orig.net * calc.WON }, totals: { net: mix.gross / calc.WON, gross: mix.gross, cp: mix.cp, santa: mix.santa, santaBp: mix.santaBp, bySource: mix.bySource }, by };
    });
  }
  const stmtOut = s => ({ id: s.id, cpTid: s.cp_tid, ym: s.ym, quarter: s.quarter, used: s.used, restored: s.restored, net: s.net, cpBp: s.cp_bp, rateKind: s.rate_kind, cpAmount: s.cp_amount, adj: s.adj, total: s.total,
    promoFee: s.promo_fee, promoCarryIn: s.promo_carry_in, promoCarryOut: s.promo_carry_out, pay: s.pay, status: s.status, lines: s.lines, closeId: s.close_id });

  /* 분기 계산(실행 · 확정 공용) */
  async function quarterCalc(c, quarter) {
    const M = monthsOf(quarter);
    const st = (await c.query('select * from mk_stmt where ym = any($1) order by cp_tid, ym', [M])).rows;
    const promos = (await c.query("select cp_tid, sum(fee)::int fee from mk_promo where ym = any($1) and status = 'ok' group by cp_tid", [M])).rows; const P = new Map(promos.map(p => [p.cp_tid, p.fee]));
    const prev = await q1(c, "select totals from mk_close where status = 'confirmed' and quarter < $1 order by quarter desc limit 1", [quarter]);
    const carry = new Map(((prev && prev.totals.cps) || []).map(x => [x.cp, x.carryOut || 0]));
    const by = {}; for (const s of st) { const x = by[s.cp_tid] || (by[s.cp_tid] = { cp: s.cp_tid, net: 0, cpAmount: 0, months: [] }); x.net += s.net; x.cpAmount += s.total; x.months.push(s.ym); }
    for (const cp of new Set([...P.keys(), ...carry.keys()])) if (!by[cp] && ((P.get(cp) || 0) + (carry.get(cp) || 0)) > 0) by[cp] = { cp, net: 0, cpAmount: 0, months: [] };
    const cps = []; for (const cp of Object.keys(by).sort()) { const x = by[cp]; const fee = P.get(cp) || 0, cin = carry.get(cp) || 0; const d = calc.promoDeduct(x.cpAmount, fee, cin);
      cps.push({ cp, name: await nameOf(cp), net: x.net, cpAmount: x.cpAmount, promoFee: fee, carryIn: cin, deduct: d.deduct, pay: d.pay, carryOut: d.carryOut, months: x.months }); }
    const orig = (await c.query(`select coalesce(sum(u.credits) filter (where u.kind = 'use'), 0)::int used, coalesce(-sum(u.credits) filter (where u.kind = 'restore'), 0)::int restored
      from mk_credit_use u join mk_product p on p.id = u.product_id where p.owner_kind = 'santa' and (u.kind = 'use' and to_char(u.at at time zone 'Asia/Seoul', 'YYYY-MM') = any($1)
        or u.kind = 'restore' and u.restore_of in (select id from mk_credit_use where kind = 'use' and to_char(at at time zone 'Asia/Seoul', 'YYYY-MM') = any($1)))`, [M])).rows[0];
    const net = st.reduce((s, x) => s + x.net, 0); const cp = st.reduce((s, x) => s + x.total, 0); const origNet = orig.used - orig.restored;
    const checks = [{ k: 'disputed', ok: !st.some(s => s.status === 'disputed'), n: st.filter(s => s.status === 'disputed').length }, { k: 'closed', ok: !st.some(s => s.close_id), n: st.filter(s => s.close_id).length }];
    return { st, checks, totals: { quarter, used: st.reduce((s, x) => s + x.used, 0), restored: st.reduce((s, x) => s + x.restored, 0), net, cp, santa: net * calc.WON - cp, orig: origNet, santaOrig: origNet * calc.WON,
      promoFee: cps.reduce((s, x) => s + x.deduct, 0), pay: cps.reduce((s, x) => s + x.pay, 0), cps } };
  }
  const closeOut = z => ({ id: z.id, quarter: z.quarter, runBy: z.run_by, confirmBy: z.confirm_by, checks: z.checks, totals: z.totals, status: z.status, at: z.at, confirmedAt: z.confirmed_at });

  async function close(quarter, by) {
    if (!S.Q_RE.test(quarter)) throw E(400, 'quarter', '분기를 YYYY-Q1 형식으로 입력하십시오.');
    return tx(async c => {
      const ex = await q1(c, "select * from mk_close where quarter = $1 and status <> 'cancelled' for update", [quarter]);
      if (ex && ex.status === 'confirmed') throw E(409, 'mk_close_done', '이미 확정한 분기입니다.');
      const Q = await quarterCalc(c, quarter);
      const row = ex ? await q1(c, 'update mk_close set run_by = $2, checks = $3, totals = $4, at = now() where id = $1 returning *', [ex.id, by, JSON.stringify(Q.checks), JSON.stringify(Q.totals)])
        : await q1(c, 'insert into mk_close (id, quarter, run_by, checks, totals) values ($1,$2,$3,$4,$5) returning *', [rid('mz_'), quarter, by, JSON.stringify(Q.checks), JSON.stringify(Q.totals)]);
      return { ok: true, close: closeOut(row), checks: Q.checks, totals: Q.totals };
    });
  }
  async function confirm(id, by) {
    return tx(async c => {
      const z = await q1(c, 'select * from mk_close where id = $1 for update', [id]); if (!z) throw E(404, 'close', '없는 마감입니다.');
      if (z.status !== 'run') throw E(409, 'mk_close_done', '이미 확정한 분기입니다.');
      if (z.run_by === by) throw E(409, 'mk_close_same_user');
      const Q = await quarterCalc(c, z.quarter); /* 확정 시점 다시 계산(실행 뒤 바뀐 정산서 반영) */
      if (Q.checks.some(x => !x.ok)) throw E(409, 'mk_close_check', '이의 신청 중이거나 이미 마감된 정산서가 있어 확정할 수 없습니다.', { checks: Q.checks });
      const M = monthsOf(z.quarter); const T = Q.totals;
      for (const x of T.cps) {
        await c.query("update mk_stmt set status = 'final', close_id = $3, pay = null where cp_tid = $1 and ym = any($2)", [x.cp, M, id]);
        const last = Q.st.filter(s => s.cp_tid === x.cp).pop();
        if (last) await c.query('update mk_stmt set promo_fee = $2, promo_carry_in = $3, promo_carry_out = $4, pay = $5 where id = $1', [last.id, x.promoFee, x.carryIn, x.carryOut, x.pay]);
        if (x.cpAmount) await c.query("insert into mk_entry (kind, party_tid, amount, credits, ref) values ('cp_use', $1, $2, $3, $4)", [x.cp, -x.cpAmount, x.net, id]);
        if (x.deduct) await c.query("insert into mk_entry (kind, party_tid, amount, ref) values ('promo_fee', $1, $2, $3)", [x.cp, x.deduct, id]);
        if (x.carryOut) await c.query("insert into mk_entry (kind, party_tid, amount, ref) values ('promo_carry', $1, 0, $2)", [x.cp, `${id}:${x.carryOut}`]);
        await c.query("insert into mk_entry (kind, party_tid, amount, ref) values ('payout', $1, $2, $3)", [x.cp, -x.pay, id]);
      }
      await c.query("update mk_promo set status = 'done', close_id = $2 where ym = any($1) and status = 'ok'", [M, id]);
      if (T.santa) await c.query("insert into mk_entry (kind, amount, credits, ref) values ('santa_use', $1, $2, $3)", [T.santa, T.net, id]);
      if (T.santaOrig) await c.query("insert into mk_entry (kind, amount, credits, ref) values ('santa_orig', $1, $2, $3)", [T.santaOrig, T.orig, id]);
      const row = await q1(c, "update mk_close set status = 'confirmed', confirm_by = $2, confirmed_at = now(), totals = $3, checks = $4 where id = $1 returning *", [id, by, JSON.stringify(T), JSON.stringify(Q.checks)]);
      return { ok: true, close: closeOut(row), totals: T };
    });
  }
  /* 지급 지시 파일(CSV, UTF-8 BOM). 계좌는 암호문이라 등록 여부만 */
  async function exportCsv(id) {
    const z = await tx(c => q1(c, 'select * from mk_close where id = $1', [id])); if (!z) throw E(404, 'close', '없는 마감입니다.');
    if (z.status !== 'confirmed') throw E(409, 'mk_close_open', '확정한 분기만 지급 지시 파일을 받을 수 있습니다.');
    const acct = new Map((await tx(c => c.query('select tid, payout_bank_enc is not null b from mk_party'))).rows.map(r => [r.tid, r.b]));
    const esc = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const L = [['분기', 'CP 기관', 'CP 이름', '순소진 크레딧', 'CP 몫(원)', '프로모션 공제(원)', '다음 분기 이월 공제(원)', '지급 지시액(원)', '계좌 등록', '상태'].join(',')];
    for (const x of z.totals.cps || []) L.push([z.quarter, x.cp, x.name, x.net, x.cpAmount, x.deduct, x.carryOut, x.pay, acct.get(x.cp) ? '등록됨' : '미등록', '지급 지시(송금 전)'].map(esc).join(','));
    return '﻿' + L.join('\r\n') + '\r\n';
  }
  return { month, close, confirm, exportCsv, stmtOut, quarterCalc };
};
