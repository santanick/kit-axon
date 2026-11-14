-- v42.1 보상 화면 요청(R): 리워드 숍 켜기(policy.shop), 신청 P 줄여 승인(adjust), 승인 · 반려 때 남은 hold만 되돌림.
alter table mil_policy add column if not exists shop jsonb not null default '{"on":false}';

-- 신청 P 줄이기(requested만, 줄이는 방향만): 차액만 release(+), lot 소진은 나중에 잡은 것부터 되돌림
create or replace function mil_redeem_adjust(p_tid text, p_id text, p_points int, p_staff text, p_reason text, p_at timestamptz default now()) returns jsonb language plpgsql as $$
declare d mil_redeem; rw mil_reward; v_diff int; v_left int; v_rel text; u record; x int; begin
  select * into d from mil_redeem where tenant_id = p_tid and id = p_id; if d.id is null then return jsonb_build_object('error', 'not_found'); end if;
  perform mil_lock(p_tid, d.sid, d.scope_unit); select * into d from mil_redeem where tenant_id = p_tid and id = p_id for update;
  if d.status <> 'requested' then return jsonb_build_object('error', 'state', 'status', d.status); end if;
  select * into rw from mil_reward where tenant_id = p_tid and id = d.reward_id;
  if p_points is null or p_points <= 0 or p_points >= d.points or p_points < rw.min_use or (rw.step > 1 and p_points % rw.step <> 0) then return jsonb_build_object('error', 'bad_points'); end if;
  v_diff := d.points - p_points; v_left := v_diff; v_rel := mil_rid('me_');
  insert into mil_entry (tenant_id, id, sid, scope_unit, kind, points, status, redeem_id, ref_entry, reason, by_staff, idem_key, at, posted_at)
    values (p_tid, v_rel, d.sid, d.scope_unit, 'release', v_diff, 'posted', d.id, d.hold_entry, coalesce(p_reason, '신청 P 조정'), p_staff, 'ra:' || d.id || ':' || p_points, p_at, p_at);
  for u in select lot_id, sum(points)::int p, max(id) mx from mil_lotuse where tenant_id = p_tid and entry_id in (select id from mil_entry where tenant_id = p_tid and redeem_id = d.id and kind in ('hold','release')) group by lot_id having sum(points) > 0 order by max(id) desc loop
    x := least(u.p, v_left); insert into mil_lotuse (tenant_id, entry_id, lot_id, points) values (p_tid, v_rel, u.lot_id, -x); v_left := v_left - x; exit when v_left = 0;
  end loop;
  update mil_redeem set points = p_points, won = case when rw.kind in ('tuition','coupon','scholar','shop') then floor(p_points * coalesce((rw.cost->>'wonPerP')::numeric, 1))::int else 0 end where tenant_id = p_tid and id = p_id returning * into d;
  return jsonb_build_object('ok', true, 'id', p_id, 'status', 'requested', 'points', d.points, 'won', d.won, 'wallet', mil_sync(p_tid, d.sid, d.scope_unit, p_at)); end $$;

-- 승인(release + use) · 반려 · 취소: release는 남은 hold(조정분 제외)만, lot 소진도 그만큼만 되돌림
create or replace function mil_redeem_decide(p_tid text, p_id text, p_decision text, p_staff text, p_reason text, p_at timestamptz default now()) returns jsonb language plpgsql as $$
declare d mil_redeem; rw mil_reward; v_rel text; v_use text; begin
  select * into d from mil_redeem where tenant_id = p_tid and id = p_id; if d.id is null then return jsonb_build_object('error', 'not_found'); end if;
  perform mil_lock(p_tid, d.sid, d.scope_unit); select * into d from mil_redeem where tenant_id = p_tid and id = p_id for update;
  if d.status <> 'requested' then return jsonb_build_object('error', 'state', 'status', d.status); end if;
  if p_decision = 'reject' and coalesce(trim(p_reason), '') = '' then return jsonb_build_object('error', 'reason'); end if;
  select * into rw from mil_reward where tenant_id = p_tid and id = d.reward_id;
  v_rel := mil_rid('me_');
  insert into mil_entry (tenant_id, id, sid, scope_unit, kind, points, status, redeem_id, ref_entry, reason, by_staff, idem_key, at, posted_at)
    values (p_tid, v_rel, d.sid, d.scope_unit, 'release', d.points, 'posted', d.id, d.hold_entry, p_reason, p_staff, 'rl:' || d.id, p_at, p_at);
  insert into mil_lotuse (tenant_id, entry_id, lot_id, points)
    select p_tid, v_rel, lot_id, -sum(points)::int from mil_lotuse where tenant_id = p_tid and entry_id in (select id from mil_entry where tenant_id = p_tid and redeem_id = d.id and kind in ('hold','release') and id <> v_rel)
    group by lot_id having sum(points) > 0;
  if p_decision = 'approve' then
    v_use := mil_rid('me_');
    insert into mil_entry (tenant_id, id, sid, scope_unit, kind, points, status, redeem_id, reason, by_staff, idem_key, at, posted_at)
      values (p_tid, v_use, d.sid, d.scope_unit, 'use', -d.points, 'posted', d.id, rw.title, p_staff, 'u:' || d.id, p_at, p_at);
    if mil_take(p_tid, d.sid, d.scope_unit, v_use, d.points, rw.cash) <> d.points then raise exception 'mil_take shortfall %', d.id; end if;
    update mil_redeem set status = 'approved', use_entry = v_use, decided_by = p_staff, decided_at = p_at where tenant_id = p_tid and id = p_id;
  else
    update mil_redeem set status = case when p_decision = 'cancel' then 'cancelled' else 'rejected' end, reason = p_reason, decided_by = p_staff, decided_at = p_at where tenant_id = p_tid and id = p_id;
  end if;
  return jsonb_build_object('ok', true, 'id', p_id, 'status', case p_decision when 'approve' then 'approved' when 'cancel' then 'cancelled' else 'rejected' end, 'points', d.points, 'won', d.won,
    'kind', rw.kind, 'wallet', mil_sync(p_tid, d.sid, d.scope_unit, p_at)); end $$;
