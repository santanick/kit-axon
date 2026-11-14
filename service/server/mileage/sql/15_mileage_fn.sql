-- v42 마일리지 업무 규칙(mil_* 함수). Node · Java 서버는 이 함수만 부른다 — 규칙이 한 곳이라 두 서버 결과가 같다.
-- 데모 엔진 didisam/milecalc.js가 같은 규칙을 브라우저에서 돌리고, tests/mileage-vectors.json으로 두 엔진이 같은지 확인한다.
-- 모든 함수는 시각 p_at을 받는다(테스트 재현). 실패는 예외 대신 {error:'<code>'} jsonb로 돌려준다(쓰기 전에 검사).
-- 하루 · 주 · 월 경계는 KST, 주는 월요일 시작, 학기는 3~8월 · 9~2월.

create or replace function mil_kst(t timestamptz) returns date language sql immutable as $$ select (t at time zone 'Asia/Seoul')::date $$;
create or replace function mil_trank(t text) returns int language sql immutable as $$ select case t when 'A' then 1 when 'B' then 2 else 3 end $$;
create or replace function mil_rid(p text) returns text language sql volatile as $$ select p || substr(md5(random()::text || clock_timestamp()::text), 1, 12) $$;
create or replace function mil_term_start(d date) returns date language sql immutable as $$
  select case when extract(month from d) between 3 and 8 then make_date(extract(year from d)::int, 3, 1)
              when extract(month from d) >= 9 then make_date(extract(year from d)::int, 9, 1)
              else make_date(extract(year from d)::int - 1, 9, 1) end $$;
create or replace function mil_win_start(w text, d date) returns date language sql immutable as $$
  select case w when 'day' then d when 'week' then date_trunc('week', d)::date when 'month' then date_trunc('month', d)::date
                when 'term' then mil_term_start(d) when 'year' then date_trunc('year', d)::date else date '1900-01-01' end $$;

-- 만료 시각: 확정일(KST) + n개월(달 끝 보정) 다음 날 0시 KST. term_end: 정책 termEnd 다음 날 0시. none: null
create or replace function mil_exp_at(p_pol jsonb, p_rule jsonb, p_posted timestamptz) returns timestamptz language plpgsql immutable as $$
declare e jsonb := coalesce(p_rule, p_pol, '{"mode":"none"}'); d date := mil_kst(p_posted); begin
  if e->>'mode' in ('months','item') and coalesce((e->>'months')::int, 0) > 0 then
    return ((d + make_interval(months => (e->>'months')::int))::date + 1)::timestamp at time zone 'Asia/Seoul';
  elsif e->>'mode' = 'term_end' and e ? 'termEnd' then return ((e->>'termEnd')::date + 1)::timestamp at time zone 'Asia/Seoul';
  end if; return null; end $$;

create or replace function mil_rem(p_tid text, p_lot text) returns int language sql stable as $$
  select e.points - coalesce((select sum(u.points) from mil_lotuse u where u.tenant_id = p_tid and u.lot_id = p_lot), 0)::int
  from mil_entry e where e.tenant_id = p_tid and e.id = p_lot $$;

-- 남은 lot에서 선입선출 소진(만료 빠른 것 → 먼저 쌓인 것). cash면 전환 가능 lot만. 소진한 양을 돌려준다
create or replace function mil_take(p_tid text, p_sid text, p_unit text, p_entry text, p_amount int, p_cash boolean, p_only text default null) returns int language plpgsql as $$
declare l record; v_left int := p_amount; x int; begin
  if v_left <= 0 then return 0; end if;
  for l in select e.id, mil_rem(p_tid, e.id) rem from mil_entry e
      where e.tenant_id = p_tid and e.sid = p_sid and e.scope_unit = p_unit and e.status = 'posted' and e.points > 0 and e.kind in ('earn','restore','adjust')
        and (not p_cash or e.convertible) and (p_only is null or e.id = p_only)
      order by e.expires_at asc nulls last, e.at asc, e.id loop
    continue when l.rem <= 0; x := least(l.rem, v_left);
    insert into mil_lotuse (tenant_id, entry_id, lot_id, points) values (p_tid, p_entry, l.id, x);
    v_left := v_left - x; exit when v_left = 0;
  end loop; return p_amount - v_left; end $$;

-- 마이너스 상계: 아직 lot에 배분되지 않은 음수 줄(취소 · 감점 · 조정)을 새로 생긴 lot에서 메운다
create or replace function mil_settle(p_tid text, p_sid text, p_unit text) returns void language plpgsql as $$
declare d record; begin
  for d in select e.id, -e.points - coalesce((select sum(u.points) from mil_lotuse u where u.tenant_id = p_tid and u.entry_id = e.id), 0)::int resid
      from mil_entry e where e.tenant_id = p_tid and e.sid = p_sid and e.scope_unit = p_unit and e.status = 'posted' and e.points < 0 and e.kind in ('cancel','penalty','adjust')
      order by e.at, e.id loop
    if d.resid > 0 then perform mil_take(p_tid, p_sid, p_unit, d.id, d.resid, false); end if;
  end loop; end $$;

create or replace function mil_lock(p_tid text, p_sid text, p_unit text) returns void language plpgsql as $$ begin
  insert into mil_wallet (tenant_id, sid, scope_unit) values (p_tid, p_sid, p_unit) on conflict do nothing;
  perform 1 from mil_wallet where tenant_id = p_tid and sid = p_sid and scope_unit = p_unit for update; end $$;

-- 지갑 캐시 = 원장 합계(진실). 같은 트랜잭션에서 갱신
create or replace function mil_sync(p_tid text, p_sid text, p_unit text, p_at timestamptz default now()) returns jsonb language plpgsql as $$
declare v_bal int; v_pen int; v_conv int; v_win int; v_next jsonb; begin
  select coalesce(sum(points) filter (where status = 'posted'), 0), coalesce(sum(points) filter (where status = 'pending' and kind in ('earn','adjust') and points > 0), 0),
         coalesce(sum(points) filter (where status = 'posted' and kind = 'earn' and at > p_at - interval '12 months'), 0)
    into v_bal, v_pen, v_win from mil_entry where tenant_id = p_tid and sid = p_sid and scope_unit = p_unit;
  with lots as (select e.convertible, e.expires_at, mil_rem(p_tid, e.id) rem from mil_entry e where e.tenant_id = p_tid and e.sid = p_sid and e.scope_unit = p_unit
                  and e.status = 'posted' and e.points > 0 and e.kind in ('earn','restore','adjust'))
  select coalesce(sum(rem) filter (where convertible and rem > 0), 0),
         coalesce((select jsonb_agg(jsonb_build_object('at', x.at, 'points', x.p) order by x.at) from (select expires_at at, sum(rem)::int p from lots where rem > 0 and expires_at is not null group by expires_at order by expires_at limit 3) x), '[]')
    into v_conv, v_next from lots;
  if v_bal < 0 then v_conv := 0; end if; v_conv := least(v_conv, greatest(v_bal, 0));
  insert into mil_wallet (tenant_id, sid, scope_unit, balance, pending, convertible, earned_window, next_expire, updated_at) values (p_tid, p_sid, p_unit, v_bal, v_pen, v_conv, v_win, v_next, now())
    on conflict (tenant_id, sid, scope_unit) do update set balance = excluded.balance, pending = excluded.pending, convertible = excluded.convertible, earned_window = excluded.earned_window, next_expire = excluded.next_expire, updated_at = now();
  return jsonb_build_object('balance', v_bal, 'pending', v_pen, 'convertible', v_conv, 'earnedWindow', v_win, 'nextExpire', v_next); end $$;

create or replace function mil_cash_ok(p_tid text, p_cls text) returns boolean language sql stable as $$
  select not coalesce((select funded from mil_funded where tenant_id = p_tid and cls_id = p_cls), false) $$;

-- 연속 학습 일수: 출석한 날을 거꾸로 세며, 주(월요일 시작)마다 freezePerWeek일까지 빠져도 이어짐
create or replace function mil_streak_calc(p_tid text, p_sid text, p_day date, p_freeze int) returns int language plpgsql stable as $$
declare days date[]; d date := p_day; n int := 0; used jsonb := '{}'; wk text; i int; lo date; begin
  select array_agg(distinct mil_kst(occurred_at)) into days from mil_event where tenant_id = p_tid and sid = p_sid and trigger = 'attend_day' and mil_kst(occurred_at) <= p_day;
  if days is null then return 0; end if; select min(x) into lo from unnest(days) x;
  for i in 0..800 loop
    exit when d < lo;
    if d = any(days) then n := n + 1;
    else wk := date_trunc('week', d)::date::text;
      if coalesce((used->>wk)::int, 0) < p_freeze then used := used || jsonb_build_object(wk, coalesce((used->>wk)::int, 0) + 1); else exit; end if;
    end if; d := d - 1;
  end loop; return n; end $$;

create or replace function mil_post(p_tid text, p_entry text, p_at timestamptz default now()) returns jsonb language plpgsql as $$
declare e mil_entry; pol mil_policy; r mil_rule; begin
  select * into e from mil_entry where tenant_id = p_tid and id = p_entry; if e.id is null then return jsonb_build_object('error', 'not_found'); end if;
  perform mil_lock(p_tid, e.sid, e.scope_unit); if e.status <> 'pending' then return jsonb_build_object('error', 'state'); end if;
  select * into pol from mil_policy where tenant_id = p_tid; select * into r from mil_rule where tenant_id = p_tid and id = e.rule_id and ver = e.rule_ver;
  update mil_entry set status = 'posted', posted_at = p_at, expires_at = case when e.kind in ('earn','adjust') then mil_exp_at(pol.expiry, r.expiry, p_at) end where tenant_id = p_tid and id = p_entry;
  perform mil_settle(p_tid, e.sid, e.scope_unit);
  return jsonb_build_object('ok', true, 'entryId', p_entry, 'wallet', mil_sync(p_tid, e.sid, e.scope_unit, p_at)); end $$;

create or replace function mil_void(p_tid text, p_entry text, p_at timestamptz default now()) returns jsonb language plpgsql as $$
declare e mil_entry; begin
  select * into e from mil_entry where tenant_id = p_tid and id = p_entry; if e.id is null then return jsonb_build_object('error', 'not_found'); end if;
  perform mil_lock(p_tid, e.sid, e.scope_unit); if e.status <> 'pending' then return jsonb_build_object('error', 'state'); end if;
  update mil_entry set status = 'void' where tenant_id = p_tid and id = p_entry;
  return jsonb_build_object('ok', true, 'wallet', mil_sync(p_tid, e.sid, e.scope_unit, p_at)); end $$;

-- 사건 수신 → 규칙 적용 → 적립 줄. 반환 {status:'done|skipped|already', reason?, entries:[{id, ruleId, points, status, convertible}]}
create or replace function mil_emit(p_tid text, p_sid text, p_trigger text, p_src_type text, p_src_id text, p_value numeric, p_trust text,
                                    p_at timestamptz default now(), p_cls text default null, p_unit text default 'lu_root') returns jsonb language plpgsql as $$
declare pol mil_policy; r record; v_ev bigint; v_day date := mil_kst(p_at); v_funded boolean; pts int; v_band int; v_idem text; v_reason text; v_first text;
  v_cap int; v_used int; w text; g mil_group; v_conv boolean; v_st text; v_id text; v_out jsonb := '[]'; v_any boolean := false; v_n int; v_res jsonb; m jsonb; v_unit text := coalesce(p_unit, 'lu_root'); begin
  insert into mil_event (tenant_id, sid, trigger, src_type, src_id, value, trust, cls_id, scope_unit, occurred_at)
    values (p_tid, p_sid, p_trigger, p_src_type, p_src_id, p_value, p_trust, p_cls, v_unit, p_at) on conflict do nothing returning id into v_ev;
  if v_ev is null then return jsonb_build_object('status', 'already', 'reason', 'event'); end if;
  select * into pol from mil_policy where tenant_id = p_tid;
  if pol.tenant_id is null or not pol.is_on then v_reason := 'off';
  elsif pol.sunset is not null and pol.sunset ? 'stopEarnAt' and (pol.sunset->>'stopEarnAt')::timestamptz <= p_at then v_reason := 'sunset'; end if;
  if v_reason is not null then
    update mil_event set status = 'skipped', result = jsonb_build_object('reason', v_reason) where id = v_ev;
    return jsonb_build_object('status', 'skipped', 'reason', v_reason, 'entries', '[]'::jsonb); end if;
  perform mil_lock(p_tid, p_sid, v_unit);
  v_funded := p_cls is not null and not mil_cash_ok(p_tid, p_cls);
  for r in select distinct on (id) * from mil_rule where tenant_id = p_tid and trigger = p_trigger order by id, ver desc loop
    continue when not r.active or (r.starts_on is not null and v_day < r.starts_on) or (r.ends_on is not null and v_day > r.ends_on);
    v_any := true; v_reason := null;
    -- 조건
    if mil_trank(p_trust) > mil_trank(r.trust_min) then v_reason := 'trust';
    elsif r.cond ? 'cls' and r.cond->>'cls' <> '*' and (p_cls is null or not (case jsonb_typeof(r.cond->'cls') when 'array' then r.cond->'cls' ? p_cls else r.cond->>'cls' = p_cls end)) then v_reason := 'cond';
    elsif r.cond ? 'minScore' and coalesce(p_value, 0) < (r.cond->>'minScore')::numeric then v_reason := 'cond';
    elsif r.cond ? 'minMin' and coalesce(p_value, 0) < (r.cond->>'minMin')::numeric then v_reason := 'cond';
    elsif r.cond ? 'maxScore' and coalesce(p_value, 0) > (r.cond->>'maxScore')::numeric then v_reason := 'cond';                    -- 배점 범위(minScore ~ maxScore)
    elsif r.cond ? 'target' and coalesce(p_value, 0) < (r.cond->>'target')::numeric then v_reason := 'cond';                        -- 목표 점수
    elsif r.cond ? 'srcType' and p_src_type <> r.cond->>'srcType' then v_reason := 'cond';                                          -- 예: 진단 완료 srcType 'diag'
    elsif r.cond ? 'dueBy' and v_day > (r.cond->>'dueBy')::date then v_reason := 'cond';                                             -- 필수교육 기한 내(KST)
    elsif r.cond ? 'improve' and coalesce((select coalesce(p_value, 0) - max(value) from mil_event where tenant_id = p_tid and sid = p_sid and trigger = p_trigger and src_type = p_src_type
            and split_part(src_id, '#', 1) = split_part(p_src_id, '#', 1) and id <> v_ev and value is not null), -1e9) < (r.cond->>'improve')::numeric then v_reason := 'cond';   -- 지난 응시 대비 +n점
    end if;
    -- 배점
    pts := 0; v_band := null;
    if v_reason is null then
      case r.score->>'mode'
        when 'band' then select (b->>1)::int, ord::int into pts, v_band from jsonb_array_elements(r.score->'bands') with ordinality t(b, ord) where coalesce(p_value, 0) >= (b->>0)::numeric order by (b->>0)::numeric desc limit 1;
        when 'per_unit' then pts := floor(coalesce(p_value, 0) / greatest(coalesce((r.score->>'unit')::numeric, 1), 1))::int * coalesce((r.score->>'v')::int, 0);
        when 'source' then pts := round(coalesce(p_value, 0))::int;
        else pts := coalesce((r.score->>'v')::int, 0); end case;
      pts := coalesce(pts, 0); if pts <= 0 then v_reason := 'cond'; end if;
    end if;
    -- 멱등(규칙 버전 제외)
    if v_reason is null then
      v_idem := 'e:' || r.id || ':' || p_sid || case r.once when 'ever' then '' when 'per_day' then ':d:' || v_day when 'none' then ':ev:' || v_ev else ':' || p_src_type || ':' || p_src_id end;
      if v_band is not null then
        v_idem := 'e:' || r.id || ':' || p_sid || ':' || p_src_type || ':' || split_part(p_src_id, '#', 1);   -- 재응시는 src_id 끝 #n(사건 유일키만 다름), 구간은 시험마다
        pts := pts - coalesce((select sum(points) from mil_entry where tenant_id = p_tid and kind = 'earn' and status <> 'void' and idem_key like v_idem || ':b%'), 0)::int;
        v_idem := v_idem || ':b' || v_band; if pts <= 0 then v_reason := 'already'; end if;
      end if;
      if v_reason is null and exists (select 1 from mil_entry where tenant_id = p_tid and idem_key = v_idem) then v_reason := 'already'; end if;
    end if;
    -- 한도(규칙 → 항목군 → 1인 하루 총, 남은 만큼만)
    if v_reason is null then
      foreach w in array array['day','week','month','term','year','total'] loop
        continue when not (r.caps ? w); v_cap := (r.caps->>w)::int;
        select coalesce(sum(points), 0) into v_used from mil_entry where tenant_id = p_tid and sid = p_sid and rule_id = r.id and kind = 'earn' and status <> 'void' and mil_kst(at) >= mil_win_start(w, v_day);
        if v_cap - v_used < pts then pts := greatest(v_cap - v_used, 0); if pts = 0 then v_reason := 'cap_' || w; exit; end if; end if;
      end loop;
    end if;
    if v_reason is null and r.group_key is not null then
      select * into g from mil_group where tenant_id = p_tid and key = r.group_key;
      if g.key is not null then foreach w in array array['term','year'] loop
        continue when not (g.caps ? w); v_cap := (g.caps->>w)::int;
        select coalesce(sum(e.points), 0) into v_used from mil_entry e where e.tenant_id = p_tid and e.sid = p_sid and e.kind = 'earn' and e.status <> 'void' and mil_kst(e.at) >= mil_win_start(w, v_day)
          and e.rule_id in (select distinct id from mil_rule where tenant_id = p_tid and group_key = r.group_key);
        if v_cap - v_used < pts then pts := greatest(v_cap - v_used, 0); if pts = 0 then v_reason := 'group_cap'; exit; end if; end if;
      end loop; end if;
    end if;
    if v_reason is null and pol.daily_cap_total is not null then
      select coalesce(sum(points), 0) into v_used from mil_entry where tenant_id = p_tid and sid = p_sid and kind = 'earn' and status <> 'void' and mil_kst(at) = v_day;
      if pol.daily_cap_total - v_used < pts then pts := greatest(pol.daily_cap_total - v_used, 0); if pts = 0 then v_reason := 'day_cap'; end if; end if;
    end if;
    if v_reason is not null then v_first := coalesce(v_first, v_reason); v_out := v_out || jsonb_build_object('ruleId', r.id, 'skipped', v_reason); continue; end if;
    -- 전환 가능(현금성) 여부: 성취형 · 신뢰 잠금 · 국비 아님 · 예산 안
    v_conv := (r.nature = 'achievement' or not coalesce((pol.cash_lock->>'achievementOnly')::boolean, true))
              and mil_trank(p_trust) <= mil_trank(coalesce(pol.cash_lock->>'needTrust', 'B')) and not v_funded;
    if v_conv and pol.budget ? 'monthP' then
      select coalesce(sum(points), 0) into v_used from mil_entry where tenant_id = p_tid and kind = 'earn' and convertible and status <> 'void' and mil_kst(at) >= date_trunc('month', v_day)::date;
      if v_used + pts > (pol.budget->>'monthP')::int then v_conv := false; end if;
    end if;
    v_st := case r.approval when 'auto' then 'posted' when 'over' then case when pts > coalesce(r.approve_over, 0) then 'pending' else 'posted' end else 'pending' end;
    -- 속도 의심: 1시간 30건 이상이면 보류
    if v_st = 'posted' and (select count(*) from mil_entry where tenant_id = p_tid and sid = p_sid and kind = 'earn' and at > p_at - interval '1 hour') >= 30 then
      v_st := 'pending'; insert into mil_flag (tenant_id, id, sid, kind, evidence) values (p_tid, mil_rid('mfl_'), p_sid, 'velocity', jsonb_build_object('event', v_ev)); end if;
    v_id := mil_rid('me_');
    insert into mil_entry (tenant_id, id, sid, scope_unit, kind, points, status, nature, trust, convertible, funded, cls_id, trigger, rule_id, rule_ver, event_id, expires_at, idem_key, at, posted_at)
      values (p_tid, v_id, p_sid, v_unit, 'earn', pts, v_st, r.nature, p_trust, v_conv, v_funded, p_cls, p_trigger, r.id, r.ver, v_ev,
              case when v_st = 'posted' then mil_exp_at(pol.expiry, r.expiry, p_at) end, v_idem, p_at, case when v_st = 'posted' then p_at end);
    if v_st = 'posted' then perform mil_settle(p_tid, p_sid, v_unit); end if;
    v_out := v_out || jsonb_build_object('id', v_id, 'ruleId', r.id, 'points', pts, 'status', v_st, 'convertible', v_conv, 'funded', v_funded);
  end loop;
  v_n := (select count(*) from jsonb_array_elements(v_out) x where x ? 'id');
  v_res := jsonb_build_object('status', case when v_n > 0 then 'done' else 'skipped' end, 'entries', (select coalesce(jsonb_agg(x), '[]') from jsonb_array_elements(v_out) x where x ? 'id'));
  if v_n = 0 then v_res := v_res || jsonb_build_object('reason', case when v_any then v_first else 'no_rule' end); end if;
  update mil_event set status = case when v_n > 0 then 'done' else 'skipped' end, result = v_out where id = v_ev;
  -- 연속 학습: 출석이면 일수 계산 → 마일스톤 사건(마일스톤마다 1회)
  if p_trigger = 'attend_day' then
    v_n := mil_streak_calc(p_tid, p_sid, v_day, coalesce((pol.streak->>'freezePerWeek')::int, 1));
    update mil_wallet set streak = jsonb_build_object('n', v_n, 'last', v_day) where tenant_id = p_tid and sid = p_sid and scope_unit = v_unit;
    for m in select * from jsonb_array_elements(coalesce(pol.streak->'milestones', '[]')) loop
      if v_n >= (m #>> '{}')::int then perform mil_emit(p_tid, p_sid, 'streak', 'streak', m #>> '{}', v_n, p_trust, p_at, null, v_unit); end if;
    end loop;
  end if;
  return v_res || jsonb_build_object('wallet', mil_sync(p_tid, p_sid, v_unit, p_at)); end $$;

-- lot 취소(마이너스 상계). 대기 줄이면 void
create or replace function mil_cancel(p_tid text, p_entry text, p_reason text, p_staff text, p_at timestamptz default now()) returns jsonb language plpgsql as $$
declare e mil_entry; v_id text; begin
  select * into e from mil_entry where tenant_id = p_tid and id = p_entry; if e.id is null or e.points <= 0 or e.kind not in ('earn','adjust','restore') then return jsonb_build_object('error', 'not_found'); end if;
  if coalesce(trim(p_reason), '') = '' then return jsonb_build_object('error', 'reason'); end if;
  perform mil_lock(p_tid, e.sid, e.scope_unit);
  if e.status = 'pending' then return mil_void(p_tid, p_entry, p_at); end if;
  if e.status = 'void' or exists (select 1 from mil_entry where tenant_id = p_tid and idem_key = 'c:' || p_entry) then return jsonb_build_object('error', 'already'); end if;
  v_id := mil_rid('me_');
  insert into mil_entry (tenant_id, id, sid, scope_unit, kind, points, status, nature, trust, cls_id, trigger, rule_id, rule_ver, ref_entry, reason, by_staff, idem_key, at, posted_at)
    values (p_tid, v_id, e.sid, e.scope_unit, 'cancel', -e.points, 'posted', e.nature, e.trust, e.cls_id, e.trigger, e.rule_id, e.rule_ver, p_entry, p_reason, p_staff, 'c:' || p_entry, p_at, p_at);
  perform mil_take(p_tid, e.sid, e.scope_unit, v_id, mil_rem(p_tid, p_entry), false, p_entry);
  perform mil_settle(p_tid, e.sid, e.scope_unit);
  return jsonb_build_object('ok', true, 'entryId', v_id, 'wallet', mil_sync(p_tid, e.sid, e.scope_unit, p_at)); end $$;

-- 소멸 정리: 만료 지난 lot의 남은 양 → expire 줄(멱등 x:<lot>)
create or replace function mil_expire(p_tid text, p_at timestamptz default now(), p_sid text default null) returns int language plpgsql as $$
declare l record; v_id text; v_n int := 0; v_k int; s record; begin
  for l in select e.id, e.sid, e.scope_unit, e.nature, e.trust, mil_rem(p_tid, e.id) rem from mil_entry e
      where e.tenant_id = p_tid and e.status = 'posted' and e.points > 0 and e.kind in ('earn','restore','adjust') and e.expires_at is not null and e.expires_at <= p_at and (p_sid is null or e.sid = p_sid)
      order by e.sid, e.expires_at, e.id loop
    continue when l.rem <= 0;
    perform mil_lock(p_tid, l.sid, l.scope_unit);
    select count(*) into v_k from mil_entry where tenant_id = p_tid and kind = 'expire' and ref_entry = l.id;
    v_id := mil_rid('me_');
    insert into mil_entry (tenant_id, id, sid, scope_unit, kind, points, status, nature, trust, ref_entry, reason, idem_key, at, posted_at)
      values (p_tid, v_id, l.sid, l.scope_unit, 'expire', -l.rem, 'posted', l.nature, l.trust, l.id, '유효기간 만료', 'x:' || l.id || case when v_k > 0 then ':' || (v_k + 1) else '' end, p_at, p_at);
    insert into mil_lotuse (tenant_id, entry_id, lot_id, points) values (p_tid, v_id, l.id, l.rem); v_n := v_n + 1;
  end loop;
  for s in select distinct e.sid, e.scope_unit from mil_entry e where e.tenant_id = p_tid and e.kind = 'expire' and e.at = p_at and (p_sid is null or e.sid = p_sid) loop perform mil_sync(p_tid, s.sid, s.scope_unit, p_at); end loop;
  return v_n; end $$;

-- 수동 지급 · 조정(±). 본인 지급 금지 · 강사 월 한도 · 기준 초과 owner 승인. 감점(p_penalty)은 정책에서 켠 기관만
create or replace function mil_grant(p_tid text, p_staff text, p_owner boolean, p_self boolean, p_sid text, p_unit text, p_points int, p_reason text, p_idem text,
                                     p_at timestamptz default now(), p_penalty boolean default false) returns jsonb language plpgsql as $$
declare pol mil_policy; v_idem text := 'm:' || p_staff || ':' || p_idem; ex mil_entry; v_id text; v_st text := 'posted'; v_used int; v_unit text := coalesce(p_unit, 'lu_root'); begin
  if p_self then return jsonb_build_object('error', 'self_grant'); end if;     -- 제품 고정
  if coalesce(trim(p_reason), '') = '' then return jsonb_build_object('error', 'reason'); end if;
  if p_points is null or p_points = 0 or abs(p_points) > 1000000 then return jsonb_build_object('error', 'points'); end if;
  select * into ex from mil_entry where tenant_id = p_tid and idem_key = v_idem; if ex.id is not null then return jsonb_build_object('ok', true, 'again', true, 'entryId', ex.id, 'status', ex.status); end if;
  select * into pol from mil_policy where tenant_id = p_tid; if pol.tenant_id is null or not pol.is_on then return jsonb_build_object('error', 'mile_off'); end if;
  if p_penalty then
    if not coalesce((pol.penalty->>'on')::boolean, false) then return jsonb_build_object('error', 'penalty_off'); end if;
    if p_points > 0 then p_points := -p_points; end if;
    if pol.penalty ? 'maxOnce' and -p_points > (pol.penalty->>'maxOnce')::int then return jsonb_build_object('error', 'over_cap'); end if;
    if pol.penalty ? 'dayCap' and (select coalesce(-sum(points), 0) from mil_entry where tenant_id = p_tid and sid = p_sid and kind = 'penalty' and mil_kst(at) = mil_kst(p_at)) - p_points > (pol.penalty->>'dayCap')::int then return jsonb_build_object('error', 'over_cap'); end if;
  end if;
  if p_points > 0 and pol.grant_cfg ? 'staffMonthCap' then
    select coalesce(sum(points), 0) into v_used from mil_entry where tenant_id = p_tid and by_staff = p_staff and kind = 'adjust' and points > 0 and status <> 'void' and mil_kst(at) >= date_trunc('month', mil_kst(p_at))::date;
    if v_used + p_points > (pol.grant_cfg->>'staffMonthCap')::int then return jsonb_build_object('error', 'staff_cap'); end if;
  end if;
  if p_points > 0 and not p_owner and p_points > coalesce((pol.grant_cfg->>'approveOver')::int, 1000) then v_st := 'pending'; end if;
  perform mil_lock(p_tid, p_sid, v_unit); v_id := mil_rid('me_');
  insert into mil_entry (tenant_id, id, sid, scope_unit, kind, points, status, nature, trust, convertible, trigger, reason, by_staff, idem_key, expires_at, at, posted_at)
    values (p_tid, v_id, p_sid, v_unit, case when p_penalty then 'penalty' else 'adjust' end, p_points, v_st, 'achievement', 'B', p_points > 0, case when p_penalty then 'penalty' else 'manual' end,
            p_reason, p_staff, v_idem, case when v_st = 'posted' and p_points > 0 then mil_exp_at(pol.expiry, null, p_at) end, p_at, case when v_st = 'posted' then p_at end);
  if v_st = 'posted' then perform mil_settle(p_tid, p_sid, v_unit); end if;
  return jsonb_build_object('ok', true, 'entryId', v_id, 'status', v_st, 'wallet', mil_sync(p_tid, p_sid, v_unit, p_at)); end $$;

-- 보상 신청: 서버 재계산(문턱 · 최소 · 최대 · 단위 · 재고 · 전환 가능 P) → hold 줄(−P, lot 선입선출) → 자동 승인이면 바로 승인
create or replace function mil_redeem_req(p_tid text, p_sid text, p_reward text, p_points int, p_idem text, p_at timestamptz default now()) returns jsonb language plpgsql as $$
declare pol mil_policy; rw mil_reward; ex mil_redeem; v_unit text; w jsonb; v_avail int; v_id text; v_hold text; v_won int; v_n int; v_cls text; begin
  select * into pol from mil_policy where tenant_id = p_tid; if pol.tenant_id is null or not pol.is_on then return jsonb_build_object('error', 'mile_off'); end if;
  if p_idem is not null then select * into ex from mil_redeem where tenant_id = p_tid and idem_key = 'r:' || p_sid || ':' || p_idem;
    if ex.id is not null then return jsonb_build_object('ok', true, 'again', true, 'id', ex.id, 'status', ex.status, 'points', ex.points, 'won', ex.won); end if; end if;
  select * into rw from mil_reward where tenant_id = p_tid and id = p_reward; if rw.id is null or not rw.active then return jsonb_build_object('error', 'not_found'); end if;
  if pol.sunset is not null and pol.sunset ? 'endAt' and (pol.sunset->>'endAt')::timestamptz <= p_at then return jsonb_build_object('error', 'sunset'); end if;
  v_unit := coalesce(rw.link->>'unitId', 'lu_root');
  if rw.cash and jsonb_typeof(rw.audience->'cls') = 'array' then
    for v_cls in select jsonb_array_elements_text(rw.audience->'cls') loop if not mil_cash_ok(p_tid, v_cls) then return jsonb_build_object('error', 'funded_blocked'); end if; end loop; end if;
  perform mil_lock(p_tid, p_sid, v_unit); w := mil_sync(p_tid, p_sid, v_unit, p_at);
  if (w->>'balance')::int < 0 then return jsonb_build_object('error', 'negative_balance'); end if;
  if p_points is null or p_points <= 0 or p_points < rw.min_use or (rw.step > 1 and p_points % rw.step <> 0)
     or (rw.cost ? 'fixedP' and p_points <> (rw.cost->>'fixedP')::int) or (rw.max_use ? 'once' and p_points > (rw.max_use->>'once')::int) then return jsonb_build_object('error', 'bad_points'); end if;
  if rw.max_use ? 'month' and (select coalesce(sum(points), 0) from mil_redeem where tenant_id = p_tid and sid = p_sid and reward_id = rw.id and status not in ('rejected','cancelled') and mil_kst(at) >= date_trunc('month', mil_kst(p_at))::date) + p_points > (rw.max_use->>'month')::int then
    return jsonb_build_object('error', 'bad_points'); end if;
  if (select count(*) from mil_redeem where tenant_id = p_tid and sid = p_sid and mil_kst(at) = mil_kst(p_at)) >= 5 then return jsonb_build_object('error', 'rate'); end if;
  if rw.per_sid ? 'month' and (select count(*) from mil_redeem where tenant_id = p_tid and sid = p_sid and reward_id = rw.id and status not in ('rejected','cancelled') and mil_kst(at) >= date_trunc('month', mil_kst(p_at))::date) >= (rw.per_sid->>'month')::int then
    return jsonb_build_object('error', 'limit'); end if;
  if rw.cash and (w->>'convertible')::int < rw.threshold then return jsonb_build_object('error', 'below_threshold'); end if;
  if rw.stock is not null and (select count(*) from mil_redeem where tenant_id = p_tid and reward_id = rw.id and status in ('requested','approved','fulfilled')) >= rw.stock then return jsonb_build_object('error', 'out_of_stock'); end if;
  v_avail := case when rw.cash then (w->>'convertible')::int else (w->>'balance')::int end;
  if v_avail < p_points then return jsonb_build_object('error', 'insufficient', 'available', v_avail); end if;
  v_id := mil_rid('mrd_'); v_hold := mil_rid('me_');
  v_won := case when rw.kind in ('tuition','coupon','scholar','shop') then floor(p_points * coalesce((rw.cost->>'wonPerP')::numeric, 1))::int else 0 end;
  insert into mil_entry (tenant_id, id, sid, scope_unit, kind, points, status, nature, trust, redeem_id, reason, idem_key, at, posted_at)
    values (p_tid, v_hold, p_sid, v_unit, 'hold', -p_points, 'posted', 'achievement', 'B', v_id, rw.title, 'h:' || v_id, p_at, p_at);
  v_n := mil_take(p_tid, p_sid, v_unit, v_hold, p_points, rw.cash);
  if v_n <> p_points then raise exception 'mil_take shortfall %', v_id; end if;
  insert into mil_redeem (tenant_id, id, sid, scope_unit, reward_id, points, won, status, hold_entry, idem_key, at)
    values (p_tid, v_id, p_sid, v_unit, rw.id, p_points, v_won, 'requested', v_hold, case when p_idem is not null then 'r:' || p_sid || ':' || p_idem end, p_at);
  if rw.approval = 'auto' then return mil_redeem_decide(p_tid, v_id, 'approve', 'auto', null, p_at); end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'requested', 'points', p_points, 'won', v_won, 'wallet', mil_sync(p_tid, p_sid, v_unit, p_at)); end $$;

-- 승인(release + use) · 반려 · 취소(release만, 사유 필수 = 반려)
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
  insert into mil_lotuse (tenant_id, entry_id, lot_id, points) select p_tid, v_rel, lot_id, -points from mil_lotuse where tenant_id = p_tid and entry_id = d.hold_entry;
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

create or replace function mil_redeem_fulfil(p_tid text, p_id text, p_fulfil jsonb) returns jsonb language plpgsql as $$
declare d mil_redeem; begin
  update mil_redeem set status = 'fulfilled', fulfil = fulfil || coalesce(p_fulfil, '{}') where tenant_id = p_tid and id = p_id and status = 'approved' returning * into d;
  if d.id is null then return jsonb_build_object('error', 'state'); end if; return jsonb_build_object('ok', true, 'id', p_id, 'status', 'fulfilled', 'fulfil', d.fulfil); end $$;

-- 복원 lot: 원 사용 줄이 쓴 lot의 가장 이른 만료일을 물려받고, 이미 지났으면 바로 소멸
create or replace function mil_restore(p_tid text, p_redeem text, p_points int, p_reason text, p_staff text, p_idem text, p_at timestamptz) returns text language plpgsql as $$
declare d mil_redeem; v_id text; v_exp timestamptz; v_conv boolean; begin
  select * into d from mil_redeem where tenant_id = p_tid and id = p_redeem; if p_points <= 0 then return null; end if;
  if exists (select 1 from mil_entry where tenant_id = p_tid and idem_key = p_idem) then return null; end if;
  select min(e.expires_at), bool_and(e.convertible) into v_exp, v_conv from mil_lotuse u join mil_entry e on e.tenant_id = u.tenant_id and e.id = u.lot_id where u.tenant_id = p_tid and u.entry_id = d.use_entry;
  v_id := mil_rid('me_');
  insert into mil_entry (tenant_id, id, sid, scope_unit, kind, points, status, nature, trust, convertible, redeem_id, ref_entry, expires_at, reason, by_staff, idem_key, at, posted_at)
    values (p_tid, v_id, d.sid, d.scope_unit, 'restore', p_points, 'posted', 'achievement', 'B', coalesce(v_conv, false), d.id, d.use_entry, v_exp, p_reason, p_staff, p_idem, p_at, p_at);
  perform mil_settle(p_tid, d.sid, d.scope_unit);
  if v_exp is not null and v_exp <= p_at then perform mil_expire(p_tid, p_at, d.sid); end if;
  return v_id; end $$;

-- 이행 후 회수(쿠폰 무효 · 청구 줄 void 뒤 호출): 전부 복원
create or replace function mil_redeem_reclaim(p_tid text, p_id text, p_reason text, p_staff text, p_at timestamptz default now()) returns jsonb language plpgsql as $$
declare d mil_redeem; begin
  select * into d from mil_redeem where tenant_id = p_tid and id = p_id; if d.id is null then return jsonb_build_object('error', 'not_found'); end if;
  if d.status not in ('approved','fulfilled') then return jsonb_build_object('error', 'state'); end if;
  if coalesce(trim(p_reason), '') = '' then return jsonb_build_object('error', 'reason'); end if;
  perform mil_lock(p_tid, d.sid, d.scope_unit);
  perform mil_restore(p_tid, d.id, d.points, p_reason, p_staff, 'rc:' || d.id, p_at);
  update mil_redeem set status = 'reclaimed', reason = p_reason, decided_by = p_staff, decided_at = p_at where tenant_id = p_tid and id = p_id;
  return jsonb_build_object('ok', true, 'id', p_id, 'status', 'reclaimed', 'wallet', mil_sync(p_tid, d.sid, d.scope_unit, p_at)); end $$;

-- 학원비 차감 줄(v41 원장 음수 줄 src_type 'mileage'): 열린 청구서(수납 배분 0) · 국비 아님 · billPct 이하 · 순합 ≥ 0
create or replace function mil_add_line(p_tid text, p_bill text, p_redeem text, p_at timestamptz default now()) returns jsonb language plpgsql as $$
declare d mil_redeem; rw mil_reward; v_sum int; v_sid text; v_unit text; v_pct int; v_cid text; c record; begin
  select * into d from mil_redeem where tenant_id = p_tid and id = p_redeem; if d.id is null then return jsonb_build_object('error', 'not_found'); end if;
  if d.status <> 'approved' then return jsonb_build_object('error', 'state'); end if;
  select * into rw from mil_reward where tenant_id = p_tid and id = d.reward_id; if rw.kind <> 'tuition' then return jsonb_build_object('error', 'kind'); end if;
  select sum(amount) filter (where status <> 'void'), min(sid), min(unit_id) into v_sum, v_sid, v_unit from led_charge where tenant_id = p_tid and bill_id = p_bill;
  if v_sum is null then return jsonb_build_object('error', 'bill'); end if;
  if v_sid <> d.sid then return jsonb_build_object('error', 'bill'); end if;
  for c in select src_id from led_charge where tenant_id = p_tid and bill_id = p_bill and src_type in ('class','cls') and status <> 'void' loop
    if not mil_cash_ok(p_tid, c.src_id) then return jsonb_build_object('error', 'funded_blocked'); end if; end loop;
  if exists (select 1 from led_alloc a join led_charge ch on ch.tenant_id = a.tenant_id and ch.id = a.charge_id where a.tenant_id = p_tid and ch.bill_id = p_bill) then return jsonb_build_object('error', 'bill_paid'); end if;
  if exists (select 1 from led_charge where tenant_id = p_tid and bill_id = p_bill and src_type = 'mileage' and status <> 'void') then return jsonb_build_object('error', 'already'); end if;
  v_pct := coalesce((rw.max_use->>'billPct')::int, 30);
  if d.won > floor(v_sum * v_pct / 100.0) then return jsonb_build_object('error', 'over_cap', 'max', floor(v_sum * v_pct / 100.0)::int); end if;
  v_cid := 'lc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
  insert into led_charge (tenant_id, id, bill_id, unit_id, sid, item_type, title, amount, src_type, src_id, idem_key, status, created_at)
    values (p_tid, v_cid, p_bill, v_unit, d.sid, 'etc', '마일리지 차감', -d.won, 'mileage', d.id, 'mil:' || d.id, 'open', p_at);
  return mil_redeem_fulfil(p_tid, d.id, jsonb_build_object('billId', p_bill, 'chargeId', v_cid)); end $$;

-- v41 환불 확정 훅: 그 수납이 배분된 청구서의 차감 사용 P × ratio 복원(10P 내림), 전액 환불이면 그 과정 적립 취소
create or replace function mil_on_refund(p_tid text, p_receipt text, p_ratio numeric, p_at timestamptz default now(), p_round int default 10) returns jsonb language plpgsql as $$
declare v_bills text[]; d mil_redeem; v_pts int; v_rest int := 0; v_can int := 0; c record; e record; begin
  select array_agg(distinct ch.bill_id) into v_bills from led_alloc a join led_charge ch on ch.tenant_id = a.tenant_id and ch.id = a.charge_id where a.tenant_id = p_tid and a.receipt_id = p_receipt;
  if v_bills is null then return jsonb_build_object('ok', true, 'restored', 0, 'cancelled', 0); end if;
  for d in select * from mil_redeem where tenant_id = p_tid and status = 'fulfilled' and fulfil->>'billId' = any(v_bills) loop
    perform mil_lock(p_tid, d.sid, d.scope_unit);
    v_pts := floor(d.points * least(greatest(p_ratio, 0), 1) / greatest(p_round, 1))::int * greatest(p_round, 1);
    if mil_restore(p_tid, d.id, v_pts, '환불 복원', 'system', 'rs:' || d.id || ':' || p_receipt, p_at) is not null then v_rest := v_rest + v_pts; end if;
    perform mil_sync(p_tid, d.sid, d.scope_unit, p_at);
  end loop;
  if p_ratio >= 1 then
    for c in select distinct sid, src_id from led_charge where tenant_id = p_tid and bill_id = any(v_bills) and src_type in ('class','cls') loop
      for e in select id from mil_entry where tenant_id = p_tid and sid = c.sid and cls_id = c.src_id and kind = 'earn' and status in ('posted','pending') loop
        if (mil_cancel(p_tid, e.id, '과정 환불', 'system', p_at)) ? 'ok' then v_can := v_can + 1; end if;
      end loop;
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'restored', v_rest, 'cancelled', v_can); end $$;

-- 소멸 고지 대상(정책 notice): 6개월 안 소멸분 매월 1회 + daysBefore(30 · 3일 전) 각 1회, 제도 종료 예고 매월. 새로 기록한 고지만 돌려준다
create or replace function mil_notice_due(p_tid text, p_at timestamptz default now()) returns setof mil_notice language plpgsql as $$
declare pol mil_policy; v_day date := mil_kst(p_at); v_mb int; n jsonb; x record; begin
  select * into pol from mil_policy where tenant_id = p_tid; if pol.tenant_id is null then return; end if;
  v_mb := coalesce((pol.notice->>'monthsBefore')::int, 6);
  if v_mb > 0 then
    return query insert into mil_notice (tenant_id, sid, scope_unit, kind, ym, points, due_at)
      select p_tid, e.sid, e.scope_unit, 'expire_month', to_char(v_day, 'YYYY-MM'), sum(mil_rem(p_tid, e.id))::int, min(e.expires_at) from mil_entry e
      where e.tenant_id = p_tid and e.status = 'posted' and e.points > 0 and e.kind in ('earn','restore','adjust') and e.expires_at > p_at and e.expires_at <= p_at + make_interval(months => v_mb) and mil_rem(p_tid, e.id) > 0
      group by e.sid, e.scope_unit on conflict do nothing returning *;
  end if;
  for n in select * from jsonb_array_elements(coalesce(pol.notice->'daysBefore', '[]')) loop
    return query insert into mil_notice (tenant_id, sid, scope_unit, kind, ym, points, due_at)
      select p_tid, e.sid, e.scope_unit, case when (n #>> '{}')::int >= 7 then 'expire_d30' else 'expire_d3' end, mil_kst(e.expires_at - interval '1 second')::text || ':' || (n #>> '{}'), sum(mil_rem(p_tid, e.id))::int, e.expires_at from mil_entry e
      where e.tenant_id = p_tid and e.status = 'posted' and e.points > 0 and e.kind in ('earn','restore','adjust') and e.expires_at > p_at and e.expires_at <= p_at + make_interval(days => (n #>> '{}')::int) and mil_rem(p_tid, e.id) > 0
      group by e.sid, e.scope_unit, e.expires_at on conflict do nothing returning *;
  end loop;
  if pol.sunset is not null and pol.sunset ? 'noticeAt' and (pol.sunset->>'noticeAt')::timestamptz <= p_at and (not (pol.sunset ? 'endAt') or (pol.sunset->>'endAt')::timestamptz > p_at) then
    return query insert into mil_notice (tenant_id, sid, scope_unit, kind, ym, points, due_at)
      select p_tid, w.sid, w.scope_unit, 'sunset', to_char(v_day, 'YYYY-MM'), w.balance, (pol.sunset->>'endAt')::timestamptz from mil_wallet w where w.tenant_id = p_tid and w.balance > 0
      on conflict do nothing returning *;
  end if;
end $$;
