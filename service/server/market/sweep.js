'use strict';
/* 마켓 상태 전환(1시간 tick): 유효 만료 → 이월(carry, credit_carry 장부) · 이월 만료 → ended(차감만 막고 남은 유료 크레딧은 그대로 둔다 — 최초 구매일부터 5년 안 95% 환불 · 100% 전환 근거, calc.refundOf · policy v1.2 제40조) ·
   견적 만료 · 사전 승인 요청 30일 만료. 한 번에 각 200건. */
async function tick(pool, S) {
  return S.tx(async c => {
    const day = S.kstDay(); let n = 0;
    const carry = (await c.query("update mk_contract set status = 'carry' where id in (select id from mk_contract where status = 'active' and kind = 'credit' and \"end\" < $1::date limit 200) returning id, buyer_tid", [day])).rows;
    for (const k of carry) { const r = (await c.query('select coalesce(sum(remain), 0)::int n from mk_credit_wallet where contract_id = $1', [k.id])).rows[0].n;
      await c.query("insert into mk_entry (kind, contract_id, party_tid, credits, ref) values ('credit_carry', $1, $2, $3, $4)", [k.id, k.buyer_tid, r, day]); }
    n += carry.length;
    n += (await c.query("update mk_contract set status = 'ended' where id in (select id from mk_contract where status in ('active','carry') and carry_end < $1::date limit 200)", [day])).rowCount;
    n += (await c.query("update mk_quote set status = 'expired' where id in (select id from mk_quote where status in ('ready','sent','cp_wait') and valid_to < $1::date limit 200)", [day])).rowCount;
    n += (await c.query("update mk_preapproval set status = 'expired' where id in (select id from mk_preapproval where status = 'asked' and at < now() - interval '30 days' limit 200)")).rowCount;
    return n;
  });
}
module.exports = { tick };
