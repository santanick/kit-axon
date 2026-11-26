'use strict';
/* 마켓 상태 전환(1시간 tick) — r3(policy v1.3 제19 · 19조의2, code-changes C3-3 · C11):
   · 만료 고지: 이용 기간 종료 90 · 30 · 7일 전(주말이면 직전 금요일) 한 번씩 — 감사 로그 market.lapse_notice(X1 문구) · 계약 terms.notices에 기록(중복 방지 · 분쟁 증빙)
   · 기간 종료(carry_end < 오늘): 계약 ended, 남은 한도 소멸 — 장부 mk_entry kind 'lapse'(유료분 크레딧 · 금액), 감사 로그 market.lapse{contract, paid, bonus}. 자동 이월 없음.
   · (이전 계약 호환) end < 오늘 ≤ carry_end인 계약은 carry로 바꾸고 credit_carry 장부를 남긴다(r3 이후 계약은 carry_end = end라 해당 없음).
   · 견적 만료 · 사전 승인 요청 30일 만료. 한 번에 각 200건. */
const NOTICE_DAYS = [90, 30, 7];
const X1 = (name, n, end, left, bonus) => `[디디쌤] ${name} 콘텐츠 패스 이용 기간이 ${n}일 남았습니다(만료 ${end.replace(/-/g, '.')}). 남은 이용 한도 ${left.toLocaleString('ko-KR')}크레딧(보너스 ${bonus.toLocaleString('ko-KR')} 포함)은 만료일에 소멸하며 환불되지 않습니다. 만료 전 또는 만료 후 30일 안에 갱신하면 남은 유료 한도 중 일부(직전 유료 한도의 20%까지)를 새 계약으로 옮길 수 있습니다.`;
/* 오늘 보낼 고지 단계: 남은 일수가 90 · 30 · 7이거나, 오늘이 금요일이고 그 날이 주말(토 · 일)에 걸리면 미리 */
function dueNotice(day, end, addDays) {
  const dow = new Date(day + 'T00:00:00Z').getUTCDay();
  for (const n of NOTICE_DAYS) { const t = addDays(end, -n); if (t === day) return n; if (dow === 5 && (addDays(day, 1) === t || addDays(day, 2) === t)) return n; }
  return 0;
}
async function tick(pool, S) {
  const lapsed = []; const notices = [];
  const n = await S.tx(async c => {
    const day = S.kstDay(); const calc = S.calc; let n = 0;
    /* 이전 계약 호환: 유효 만료 → 이월 */
    const carry = (await c.query("update mk_contract set status = 'carry' where id in (select id from mk_contract where status = 'active' and kind = 'credit' and \"end\" < $1::date and carry_end >= $1::date limit 200) returning id, buyer_tid", [day])).rows;
    for (const k of carry) { const r = (await c.query('select coalesce(sum(remain), 0)::int n from mk_credit_wallet where contract_id = $1', [k.id])).rows[0].n;
      await c.query("insert into mk_entry (kind, contract_id, party_tid, credits, ref) values ('credit_carry', $1, $2, $3, $4)", [k.id, k.buyer_tid, r, day]); }
    n += carry.length;
    /* 기간 종료 → 소멸 */
    const ended = (await c.query("update mk_contract set status = 'ended' where id in (select id from mk_contract where status in ('active','carry') and carry_end < $1::date limit 200) returning id, buyer_tid", [day])).rows;
    for (const k of ended) { const w = (await c.query("select coalesce(sum(remain) filter (where lot <> 'bonus'), 0)::int paid, coalesce(sum(remain) filter (where lot = 'bonus'), 0)::int bonus from mk_credit_wallet where contract_id = $1", [k.id])).rows[0];
      await c.query("insert into mk_entry (kind, contract_id, party_tid, credits, amount, ref) values ('lapse', $1, $2, $3, $4, $5)", [k.id, k.buyer_tid, w.paid, w.paid * calc.WON, day]);
      lapsed.push({ tid: k.buyer_tid, contract: k.id, paid: w.paid, bonus: w.bonus }); }
    n += ended.length;
    /* 만료 고지 90 · 30 · 7일 */
    const act = (await c.query("select k.id, k.buyer_tid, to_char(k.carry_end, 'YYYY-MM-DD') ce, coalesce(k.terms, '{}'::jsonb) terms from mk_contract k where k.status = 'active' and k.kind = 'credit' and k.carry_end between $1::date and $1::date + 92 limit 200", [day])).rows;
    for (const k of act) { const d = dueNotice(day, k.ce, calc.addDays); if (!d) continue; const sent = (k.terms.notices || []).map(String); if (sent.includes(String(d))) continue;
      const w = (await c.query("select coalesce(sum(remain), 0)::int left, coalesce(sum(remain) filter (where lot = 'bonus'), 0)::int bonus from mk_credit_wallet where contract_id = $1", [k.id])).rows[0];
      await c.query("update mk_contract set terms = jsonb_set(coalesce(terms, '{}'::jsonb), '{notices}', coalesce(terms->'notices', '[]'::jsonb) || to_jsonb($2::text)) where id = $1", [k.id, String(d)]);
      notices.push({ tid: k.buyer_tid, contract: k.id, d, text: X1('우리 기관', d, k.ce, w.left, w.bonus) }); n++; }
    n += (await c.query("update mk_quote set status = 'expired' where id in (select id from mk_quote where status in ('ready','sent','cp_wait') and valid_to < $1::date limit 200)", [day])).rowCount;
    n += (await c.query("update mk_preapproval set status = 'expired' where id in (select id from mk_preapproval where status = 'asked' and at < now() - interval '30 days' limit 200)")).rowCount;
    return n;
  });
  for (const x of lapsed) await S.log(x.tid, 'system', 'market.lapse', { contract: x.contract, paid: x.paid, bonus: x.bonus });
  for (const x of notices) await S.log(x.tid, 'system', 'market.lapse_notice', { contract: x.contract, d: x.d, text: x.text });
  return n;
}
module.exports = { tick, dueNotice, NOTICE_DAYS };
