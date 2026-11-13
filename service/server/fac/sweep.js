'use strict';
/* v40 자동 정리(02 명세 5-6) — 크론 없이 「요청 때 정리(주) + 1시간 tick(보조)」.
   ① 결제 대기 보류(hold_until) 만료 → expired + 칸 해제 ② 시작 후 noshow_min분 미입장 확정 예약 → no_show + 칸 해제(환불 없음)
   ③ (tick) 반납 기한 지난 대여 → overdue, 선택 수집 항목(extra) 보관 기한 지나면 삭제, 기간 지난 이용권 → expired.
   결과는 audit(actor 'system'), 학습자 앱 알림 learner_events 'fac-note'. 한 번에 200건 상한. */
const LIMIT = 200;
async function sweep(c, tid, audit, opt = {}) {
  const fac = opt.fac || null;
  const ex = (await c.query(`update fac_booking set status = 'expired', pay_status = 'none', updated_at = now(), cancel_reason = '결제 시간 초과'
    where tenant_id = $1 and id in (select id from fac_booking where tenant_id = $1 and status = 'confirmed' and pay_status = 'pending' and pay_mode = 'online' and hold_until < now() and ($2::text is null or fac_id = $2) limit ${LIMIT}) returning id, sid`, [tid, fac])).rows;
  const ns = (await c.query(`update fac_booking b set status = 'no_show', updated_at = now(), cancel_reason = '시작 후 미입장 자동 취소'
    where tenant_id = $1 and id in (select id from fac_booking x where x.tenant_id = $1 and x.status = 'confirmed' and x.noshow_min > 0 and x.start_at + make_interval(mins => x.noshow_min) <= now() and ($2::text is null or x.fac_id = $2)
      and not exists (select 1 from fac_checkin k where k.tenant_id = $1 and k.booking_id = x.id) limit ${LIMIT}) returning id, sid, fac_id`, [tid, fac])).rows;
  const ids = ex.map(x => x.id).concat(ns.map(x => x.id));
  if (ids.length) {
    await c.query('delete from fac_slot where tenant_id = $1 and booking_id = any($2)', [tid, ids]);
    await c.query("update fac_payment set status = 'cancelled' where tenant_id = $1 and booking_id = any($2) and status = 'ready'", [tid, ex.map(x => x.id)]);
    for (const x of ns) await c.query("insert into learner_events (tenant_id, sid, type, xid, data) values ($1, $2, 'fac-note', $3, $4)", [tid, x.sid, x.id, JSON.stringify({ kind: 'no_show', booking: x.id, fac: x.fac_id })]);
    await audit(c, tid, 'system', 'fac.sweep', { expired: ex.map(x => x.id), noShow: ns.map(x => x.id) });
  }
  let overdue = 0, purged = 0, passes = 0;
  if (opt.daily) {
    overdue = (await c.query("update fac_rental set status = 'overdue' where tenant_id = $1 and status = 'lent' and due_day < (now() at time zone 'Asia/Seoul')::date", [tid])).rowCount;
    purged = (await c.query('update fac_booking set extra = null, purge_at = null where tenant_id = $1 and purge_at < now()', [tid])).rowCount;
    passes = (await c.query("update fac_pass set status = 'expired' where tenant_id = $1 and status = 'active' and ends_on < (now() at time zone 'Asia/Seoul')::date", [tid])).rowCount;
    if (overdue || purged || passes) await audit(c, tid, 'system', 'fac.tick', { overdue, purged, passes });
  }
  return { expired: ex.length, noShow: ns.length, overdue, purged, passes };
}
/* 1시간 tick: 예약 · 대여 · 이용권이 있는 기관만 */
async function tickAll(pool, inTenant, audit) {
  const { rows } = await pool.query('select id from tenants'); let n = 0;
  for (const { id } of rows) { try { const r = await inTenant(pool, id, async c => { const has = (await c.query("select (exists (select 1 from fac_booking where tenant_id = $1 and status in ('requested','approved','confirmed')) or exists (select 1 from fac_rental where tenant_id = $1 and status = 'lent') or exists (select 1 from fac_booking where tenant_id = $1 and purge_at is not null) or exists (select 1 from fac_pass where tenant_id = $1 and status = 'active')) h", [id])).rows[0].h; return has ? sweep(c, id, audit, { daily: true }) : null; }); if (r) n++; } catch (e) { /* 한 기관 실패가 나머지를 막지 않는다 */ } }
  return n;
}
module.exports = { sweep, tickAll };
