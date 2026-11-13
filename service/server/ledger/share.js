'use strict';
/* v41 PG 쉐어 리포트(09 3절 GET /api/ledger/share?ym&unit). 단위별 쉐어 대상 결제액(토스 경유 온라인 결제 − 그 환불) · 쉐어율 · 예상 쉐어(calc.share),
   토스 정산 파일을 가져온 달은 실제 쉐어와 차이. 산타는 PG가 아니라 파트너 — 쉐어는 토스가 산타에 지급한다(08 전략). */
module.exports = (ctx, S) => {
  const { pool, inTenant } = ctx; const { calc, YM_RE } = S;
  async function report(a, Q) {
    const ym = YM_RE.test(Q.get('ym') || '') ? Q.get('ym') : S.kstDay().slice(0, 7); const from = ym + '-01'; const end = new Date(Date.parse(from + 'T00:00:00Z')); end.setUTCMonth(end.getUTCMonth() + 1); end.setUTCDate(0); const to = end.toISOString().slice(0, 10);
    return inTenant(pool, a.tid, async c => { await S.needOn(c, a.tid); const U = await S.unitsOf(c, a.tid); const UC = S.unitCalc(U); const unit = Q.get('unit') || null; const scope = unit ? calc.unitScope(unit, UC, true) : null;
      const rows = (await S.rowsOf(c, a.tid, from, to)).filter(r => !scope || scope.has(r.unit)); const sh = calc.share(rows, UC); const name = new Map(U.map(u => [u.id, u.name]));
      const imp = (await c.query("select meta from led_import where tenant_id = $1 and kind = 'toss_settle' and meta->>'ym' = $2 and (meta->>'hasShare')::boolean", [a.tid, ym])).rows;
      const actual = imp.length && !unit ? imp.reduce((s, r) => s + (+r.meta.shareActual || 0), 0) : null;
      return { ok: true, ym, unit, units: sh.units.map(x => ({ ...x, name: name.get(x.unit) || x.unit })), eligible: sh.eligible, estimate: sh.estimate, actual, diff: actual == null ? null : actual - sh.estimate }; });
  }
  return { report };
};
