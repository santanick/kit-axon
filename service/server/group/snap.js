'use strict';
/* 통합 센터 집계(spec 2-5 「집계 작업 순서」) — 교차 없이 두 단계:
   ① inTenant(소속 기관)로 원본을 읽어 숫자만 계산 → ② 별도 트랜잭션 didisam_group + app.tenant = 소속 기관으로 grp_kpi_day · grp_kpi_month · grp_lx에 쓴다.
   동의하지 않은 키는 쓰지 않는다. tick: 하루 1회 전날 · 오늘 집계, 초대 만료, 끝난 연결 집계 365일 뒤 삭제, 멱등 7일 뒤 삭제. */
module.exports = (ctx, S) => {
  const { pool, inTenant, log } = ctx; const { K, txIn, kstDay } = S;
  /* ① 소속 기관 범위 계산(숫자만) */
  async function measure(childTid, day, share, wantLx) {
    const doc = await S.docOf(childTid); const v = K.fromDoc(doc, day);
    if (share.ai) { const r = await inTenant(pool, childTid, async c => (await c.query('select coalesce(sum(calls),0)::int calls, coalesce(sum(tin + tout),0)::bigint tok from ai_usage where tenant_id = $1 and day = $2::date', [childTid, day])).rows[0]).catch(() => null);
      v.aiCalls = r ? +r.calls : 0; v.aiTok = r ? +r.tok : 0; }
    if (share.revenue) { /* 통합 수납 원장 합계만(개인 기록 아님): 그날 수납 − 그날 환불 */
      const r = await inTenant(pool, childTid, async c => { const p = (await c.query("select coalesce(sum(amount),0)::bigint n from led_receipt where tenant_id = $1 and status = 'paid' and (paid_at at time zone 'Asia/Seoul')::date = $2::date", [childTid, day])).rows[0].n;
        /* 환불: 완료(status='done')된 건을 완료 시각 coalesce(done_at, at)의 KST 날짜로(ledger/index.js 마감과 같은 기준). led_refund에는 created_at이 없다 */
        const f = (await c.query("select coalesce(sum(amount),0)::bigint n from led_refund where tenant_id = $1 and status = 'done' and (coalesce(done_at, at) at time zone 'Asia/Seoul')::date = $2::date", [childTid, day])).rows[0].n; return +p - +f; }).catch(e => { if (log && log.warn) log.warn('grp.rev', childTid, e.message); return null; });
      v.rev = r == null ? 0 : r; }
    return { v, lx: wantLx ? K.lxRows(doc) : null };
  }
  /* ② 소속 기관 범위로 집계 표에 쓰기(RLS: child_tid = app.tenant · active 연결) */
  async function store(link, salt, day, m) {
    return txIn({ tid: link.child_tid, gid: link.group_id }, async c => {
      await c.query('insert into grp_kpi_day (group_id, child_tid, day, v) values ($1,$2,$3,$4) on conflict (group_id, child_tid, day) do update set v = excluded.v, at = now()', [link.group_id, link.child_tid, day, JSON.stringify(m.v)]);
      const rows = (await c.query("select to_char(day, 'YYYY-MM-DD') as day, v from grp_kpi_day where group_id = $1 and child_tid = $2 and to_char(day, 'YYYY-MM') = $3", [link.group_id, link.child_tid, day.slice(0, 7)])).rows;
      await c.query('insert into grp_kpi_month (group_id, child_tid, ym, v) values ($1,$2,$3,$4) on conflict (group_id, child_tid, ym) do update set v = excluded.v, at = now()', [link.group_id, link.child_tid, day.slice(0, 7), JSON.stringify(K.combine(rows))]);
      await c.query('delete from grp_lx where group_id = $1 and child_tid = $2', [link.group_id, link.child_tid]);
      if (m.lx && m.lx.length) { const ym = day.slice(0, 7); const by = new Map(); for (const x of m.lx) { if (!x.no) continue; const g = S.gkey(salt, x.no); const o = by.get(g) || { g, dept: x.dept, enr: 0, cmp: 0 }; o.enr += x.enr; o.cmp += x.cmp; by.set(g, o); }
        const L = [...by.values()]; for (let i = 0; i < L.length; i += 500) { const part = L.slice(i, i + 500);
          await c.query('insert into grp_lx (group_id, gkey, child_tid, dept, enr, cmp, last_ym) select $1, x->>0, $2, nullif(x->>1, \'\'), (x->>2)::int, (x->>3)::int, $3 from jsonb_array_elements($4::jsonb) x', [link.group_id, link.child_tid, ym, JSON.stringify(part.map(o => [o.g, o.dept || '', o.enr, o.cmp]))]); } }
      return true; });
  }
  /* 한 연결 집계(실패해도 다른 연결은 계속) */
  async function one(link, day) {
    const g = await txIn({ santa: true }, async c => (await c.query('select kind, salt from grp_group where id = $1', [link.group_id])).rows[0]); if (!g) return false;
    const share = link.share || {}; const m = await measure(link.child_tid, day, share, g.kind === 'univ' && !!share.learnerAgg);
    return store(link, g.salt, day, m);
  }
  /* 묶음 전체(지금 새로 고침 · 다시 만들기) */
  async function group(gid, days) {
    const links = await txIn({ santa: true }, async c => (await c.query("select * from grp_link where group_id = $1 and status = 'active'", [gid])).rows); let n = 0;
    for (const l of links) for (const d of days) { try { if (await one(l, d)) n++; } catch (e) { if (log && log.warn) log.warn('grp.snap', gid, e.message); } } return n;
  }
  let lastDay = '';
  async function tick() {
    await txIn({ santa: true }, async c => {
      await c.query("update grp_link set status = 'expired', ended_at = now() where status = 'invited' and expires_at < now()");
      /* 판정 ②: 끝난 연결의 집계 스냅숏은 365일 보관 후 삭제(같은 연결이 다시 active면 유지) */
      for (const t of ['grp_kpi_day', 'grp_kpi_month', 'grp_lx']) await c.query(`delete from ${t} x where not exists (select 1 from grp_link l where l.group_id = x.group_id and l.child_tid = x.child_tid and (l.status = 'active' or l.ended_at > now() - interval '365 days'))`);
      await c.query("delete from grp_idem where at < now() - interval '7 days'").catch(() => {});
    });
    const today = kstDay(); if (lastDay === today) return 0; lastDay = today; const yest = K.addDays(today, -1);
    const gids = await txIn({ santa: true }, async c => (await c.query("select id from grp_group where pilot and status = 'active'")).rows.map(r => r.id)); let n = 0;
    for (const gid of gids) n += await group(gid, [yest, today]); return n;
  }
  return { measure, store, one, group, tick };
};
