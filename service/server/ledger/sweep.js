'use strict';
/* v41 원장 자동 정리: 결제창 이탈로 남은 온라인 수납 ready → 30분 뒤 failed(09 3절). 요청 때 정리(주) + 1시간 tick(보조), 한 번에 200건. */
async function sweep(c, tid, audit) {
  const r = (await c.query("update led_receipt set status = 'failed' where tenant_id = $1 and id in (select id from led_receipt where tenant_id = $1 and status = 'ready' and created_at < now() - interval '30 minutes' limit 200) returning id", [tid])).rows;
  if (r.length) await audit(c, tid, 'system', 'ledger.sweep', { failed: r.map(x => x.id) });
  return r.length;
}
async function tickAll(pool, inTenant, audit) {
  const { rows } = await pool.query('select id from tenants'); let n = 0;
  for (const { id } of rows) { try { n += await inTenant(pool, id, c => sweep(c, id, audit)); } catch (e) { /* 한 기관 실패가 나머지를 막지 않는다 */ } }
  return n;
}
module.exports = { sweep, tickAll };
