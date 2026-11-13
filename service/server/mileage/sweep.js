'use strict';
/* v42 마일리지 자동 정리(04 2.2 · 4.3): 만료 lot 소멸(mil_expire) → 소멸 · 종료 고지 대상 기록(mil_notice_due, 매월 1회 · 30 · 3일 전) → 지갑 캐시와 원장 합계 대조(다르면 감사 로그 후 다시 씀).
   고지는 mil_notice에 남고 학습자 앱 mile-my가 읽어 알림함에 보인다(정보형 문구, 야간 발송 없음). 1시간 tick, 한 기관 실패가 나머지를 막지 않는다. */
async function sweep(c, tid, audit, at) {
  const p = (await c.query('select is_on from mil_policy where tenant_id = $1', [tid])).rows[0]; if (!p) return { expired: 0, notices: 0, fixed: 0 };
  const T = at || new Date().toISOString();
  const expired = +(await c.query('select mil_expire($1,$2) n', [tid, T])).rows[0].n;
  const notices = (await c.query('select sid, kind, ym, points from mil_notice_due($1,$2)', [tid, T])).rows;
  const bad = (await c.query("select w.sid, w.scope_unit, w.balance, coalesce((select sum(points) from mil_entry e where e.tenant_id = w.tenant_id and e.sid = w.sid and e.scope_unit = w.scope_unit and e.status = 'posted'), 0)::int s from mil_wallet w where w.tenant_id = $1", [tid])).rows.filter(x => x.balance !== x.s);
  for (const x of bad) await c.query('select mil_sync($1,$2,$3)', [tid, x.sid, x.scope_unit]);
  if (bad.length && audit) await audit(c, tid, 'system', 'mileage.wallet_mismatch', { n: bad.length, sids: bad.slice(0, 20).map(x => x.sid) });
  if ((expired || notices.length) && audit) await audit(c, tid, 'system', 'mileage.sweep', { expired, notices: notices.length });
  return { expired, notices: notices.length, fixed: bad.length };
}
async function tickAll(pool, inTenant, audit) {
  const { rows } = await pool.query('select id from tenants'); let n = 0;
  for (const { id } of rows) { try { const r = await inTenant(pool, id, c => sweep(c, id, audit)); n += r.expired + r.notices; } catch (e) { /* 다음 기관 계속 */ } }
  return n;
}
module.exports = { sweep, tickAll };
