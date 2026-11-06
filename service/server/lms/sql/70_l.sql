-- v30 학사 LMS 묶음 L — 일정 · 알림 · 메시지 (SFR-012 · 040 · 070 · 071 · 029)
-- 업무 로직은 SQL 함수(lms_l)에 두고 Node(mod-l.js) · Java(lms.l)가 같은 함수를 불러 같은 JSON을 낸다.
-- 주체(principal): 'u:<운영자 uuid>' 또는 'p:<학번 · 사번>'. 이름 · 연락처는 저장하지 않는다.
-- 푸시 · SMS · 알림톡 · 메일 실발송은 하지 않는다 — lms_noti_outbox가 연동 지점(외부 발송기가 queued를 가져가 ack한다).

-- ── 공용 도우미(L · M · P 공용) ──
create or replace function lmsx_err(st int, code text, msg text) returns void language plpgsql as $$
begin raise exception '%', msg using errcode = 'P0001', detail = 'lms:' || st || ':' || code; end $$;
create or replace function lmsx_ts(t timestamptz) returns text language sql immutable as $$
  select case when t is null then null else to_char(t at time zone 'Asia/Seoul', 'YYYY-MM-DD"T"HH24:MI:SS"+09:00"') end $$;
create or replace function lmsx_ip(ip text) returns text language sql immutable as $$
  select case when coalesce(ip, '') = '' then '' when replace(ip, '::ffff:', '') ~ '^\d+\.\d+\.\d+\.\d+$' then regexp_replace(replace(ip, '::ffff:', ''), '\.\d+$', '.*') when ip = '::1' then '127.0.0.*' else regexp_replace(ip, ':[0-9a-fA-F]*$', ':*') end $$;
create or replace function lmsx_admin(me jsonb) returns void language plpgsql as $$
begin if coalesce(me->>'role', '') not in ('owner', 'sub') then perform lmsx_err(403, 'role', '관리자만 사용할 수 있습니다.'); end if; end $$;
create or replace function lmsx_txt(q jsonb, k text, mx int, req boolean default false) returns text language plpgsql as $$
declare v text := btrim(coalesce(q->>k, ''));
begin
  if req and v = '' then perform lmsx_err(400, 'bad_input', k || ' 값을 입력하세요.'); end if;
  if length(v) > mx then perform lmsx_err(400, 'bad_input', k || ' 값이 너무 깁니다(최대 ' || mx || '자).'); end if;
  return v;
end $$;
create or replace function lmsx_tsq(q jsonb, k text, req boolean default false) returns timestamptz language plpgsql as $$
declare v text := btrim(coalesce(q->>k, ''));
begin
  if v = '' then if req then perform lmsx_err(400, 'bad_input', k || ' 일시를 입력하세요.'); end if; return null; end if;
  if v !~ '^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?)?([+-]\d{2}:?\d{2}|Z)?$' then perform lmsx_err(400, 'bad_input', k || ' 일시 형식이 올바르지 않습니다.'); end if;
  if v ~ '^\d{4}-\d{2}-\d{2}$' then return (v || ' 00:00')::timestamp at time zone 'Asia/Seoul'; end if;
  if v ~ '([+-]\d{2}:?\d{2}|Z)$' then return v::timestamptz; end if;
  return v::timestamp at time zone 'Asia/Seoul';
exception when others then if sqlstate = 'P0001' then raise; end if; perform lmsx_err(400, 'bad_input', k || ' 일시가 올바르지 않습니다.'); return null;
end $$;
create or replace function lmsx_uuid(q jsonb, k text, req boolean default true) returns uuid language plpgsql as $$
declare v text := btrim(coalesce(q->>k, ''));
begin
  if v = '' and not req then return null; end if;
  if v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then perform lmsx_err(400, 'bad_input', k || ' 값이 올바르지 않습니다.'); end if;
  return v::uuid;
end $$;
create or replace function lmsx_audit(me jsonb, action text, detail jsonb) returns void language sql as $$
  insert into audit_log (tenant_id, actor, action, detail) values (current_setting('app.tenant', true), coalesce(me->>'email', ''), action, detail) $$;
create or replace function lmsx_int(q jsonb, k text, dflt int, lo int, hi int) returns int language plpgsql as $$
declare v text := btrim(coalesce(q->>k, ''));
begin
  if v = '' then return dflt; end if;
  if v !~ '^-?\d{1,9}$' then perform lmsx_err(400, 'bad_input', k || ' 값은 숫자여야 합니다.'); end if;
  return greatest(lo, least(hi, v::int));
end $$;

-- ── 표 ──
create table if not exists lms_cal_event (
  tenant_id text not null references tenants(id) on delete cascade,
  event_id uuid not null default gen_random_uuid(),
  scope text not null check (scope in ('academic','course','personal')),
  section_id uuid,
  owner text,
  title text not null check (length(title) between 1 and 120),
  kind text not null default 'event' check (kind in ('event','deadline','exam','holiday','todo')),
  starts_at timestamptz not null, ends_at timestamptz,
  all_day boolean not null default false,
  done boolean not null default false,
  created_by text, created_at timestamptz not null default now(),
  primary key (tenant_id, event_id)
);
create index if not exists lms_cal_event_at on lms_cal_event (tenant_id, starts_at);
create table if not exists lms_dm_room (
  tenant_id text not null references tenants(id) on delete cascade,
  room_id uuid not null default gen_random_uuid(),
  kind text not null check (kind in ('direct','group','broadcast')),
  title text not null default '', direct_key text,
  created_by text, created_at timestamptz not null default now(),
  primary key (tenant_id, room_id), unique (tenant_id, direct_key)
);
create table if not exists lms_dm_member (
  tenant_id text not null, room_id uuid not null, principal text not null,
  role text not null default 'member' check (role in ('owner','member')),
  last_read_id bigint not null default 0, joined_at timestamptz not null default now(),
  primary key (tenant_id, room_id, principal),
  foreign key (tenant_id, room_id) references lms_dm_room (tenant_id, room_id) on delete cascade
);
create index if not exists lms_dm_member_p on lms_dm_member (tenant_id, principal);
create table if not exists lms_dm_message (
  tenant_id text not null, id bigserial, room_id uuid not null, sender text not null,
  body text not null default '', attachments jsonb not null default '[]', lang text not null default 'ko',
  created_at timestamptz not null default now(),
  primary key (tenant_id, id),
  foreign key (tenant_id, room_id) references lms_dm_room (tenant_id, room_id) on delete cascade
);
create index if not exists lms_dm_message_room on lms_dm_message (tenant_id, room_id, id);
create table if not exists lms_noti_rule (
  tenant_id text not null references tenants(id) on delete cascade,
  rule_id uuid not null default gen_random_uuid(),
  owner text not null,
  event text not null check (event in ('resource_new','qna_new','due_before','analytics')),
  section_id uuid,
  params jsonb not null default '{}',
  channels text[] not null default '{inapp}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id, rule_id)
);
create table if not exists lms_noti_quiet (
  tenant_id text not null references tenants(id) on delete cascade,
  principal text not null, starts time not null, ends time not null, enabled boolean not null default true,
  primary key (tenant_id, principal)
);
create table if not exists lms_noti_outbox (
  tenant_id text not null references tenants(id) on delete cascade,
  id bigserial, principal text not null,
  channel text not null check (channel in ('inapp','push','sms','kakao','email')),
  title text not null, body text not null default '', ref text,
  status text not null default 'queued' check (status in ('queued','held_quiet','sent','failed','cancelled')),
  not_before timestamptz, created_at timestamptz not null default now(), sent_at timestamptz,
  primary key (tenant_id, id)
);
create unique index if not exists lms_noti_outbox_ref on lms_noti_outbox (tenant_id, principal, channel, ref) where ref is not null;
create index if not exists lms_noti_outbox_st on lms_noti_outbox (tenant_id, status, id);

do $$ declare t text; begin
  foreach t in array array['lms_cal_event','lms_dm_room','lms_dm_member','lms_dm_message','lms_noti_rule','lms_noti_quiet','lms_noti_outbox'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_dm_message_id_seq, lms_noti_outbox_id_seq to didisam_tenant;
end $$;

-- ── 방해금지 시간: 지금 막혀 있으면 풀리는 시각, 아니면 null ──
create or replace function lms_l_quiet_until(p text) returns timestamptz language plpgsql as $$
declare r record; lt timestamp := now() at time zone 'Asia/Seoul'; t time := lt::time; e timestamp;
begin
  select * into r from lms_noti_quiet where tenant_id = current_setting('app.tenant', true) and principal = p and enabled;
  if not found or r.starts = r.ends then return null; end if;
  if (r.starts < r.ends and t >= r.starts and t < r.ends) or (r.starts > r.ends and (t >= r.starts or t < r.ends)) then
    e := lt::date + r.ends; if e <= lt then e := e + interval '1 day'; end if;
    return e at time zone 'Asia/Seoul';
  end if;
  return null;
end $$;

-- 발송 대기열에 넣기(같은 ref는 한 번만). inapp은 방해금지와 무관하게 즉시 'sent'(알림함)
create or replace function lms_l_enqueue(p text, ch text, ttl text, bd text, rf text) returns text language plpgsql as $$
declare qu timestamptz; st text; n int;
begin
  if ch = 'inapp' then st := 'sent'; qu := null;
  else qu := lms_l_quiet_until(p); st := case when qu is null then 'queued' else 'held_quiet' end; end if;
  insert into lms_noti_outbox (tenant_id, principal, channel, title, body, ref, status, not_before, sent_at)
  values (current_setting('app.tenant', true), p, ch, left(ttl, 120), left(bd, 1000), rf, st, qu, case when st = 'sent' then now() end)
  on conflict do nothing;
  get diagnostics n = row_count;
  return case when n = 0 then 'dup' else st end;
end $$;

create or replace function lms_l_ev(e lms_cal_event) returns jsonb language sql as $$
  select jsonb_build_object('id', e.event_id, 'scope', e.scope, 'section_id', e.section_id, 'title', e.title, 'kind', e.kind,
    'starts_at', lmsx_ts(e.starts_at), 'ends_at', lmsx_ts(e.ends_at), 'all_day', e.all_day, 'done', e.done, 'mine', true, 'src', 'event') $$;

create or replace function lms_l_ics_esc(s text) returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(s, ''), '\', '\\'), ';', '\;'), ',', '\,'), E'\n', '\n') $$;
create or replace function lms_l_ics_ts(t timestamptz) returns text language sql immutable as $$
  select to_char(t at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"') $$;

-- ── 디스패처 ──
create or replace function lms_l(op text, me jsonb, q jsonb) returns jsonb language plpgsql as $$
declare
  tid text := current_setting('app.tenant', true);
  my text := case when coalesce(me->>'learner', '') <> '' then 'p:' || (me->>'learner') else 'u:' || coalesce(me->>'uid', '') end; -- 학습자 앱 세션이면 학번 주체
  adm boolean := coalesce(me->>'role', '') in ('owner', 'sub');
  ev lms_cal_event; fl lms_file; f timestamptz; t timestamptz; v_id uuid; v_txt text; r record; arr jsonb; n int; n2 int; out jsonb; k text; mem text[];
begin
  if op = 'cal.list' then
    f := coalesce(lmsx_tsq(q, 'from'), date_trunc('month', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul');
    t := coalesce(lmsx_tsq(q, 'to'), f + interval '42 days');
    if t < f or t - f > interval '400 days' then perform lmsx_err(400, 'bad_input', '조회 기간은 400일 이내여야 합니다.'); end if;
    v_txt := lmsx_txt(q, 'scope', 20);
    select coalesce(jsonb_agg(x order by x->>'starts_at', x->>'title'), '[]') into arr from (
      select lms_l_ev(e) x from lms_cal_event e
       where e.tenant_id = tid and e.starts_at >= f and e.starts_at < t and (e.scope <> 'personal' or e.owner = my)
         and (v_txt = '' or e.scope = v_txt)
      union all
      select jsonb_build_object('id', s.session_id, 'scope', 'course', 'section_id', s.section_id, 'title', sc.title || ' ' || s.week_no || '주 ' || s.seq || '차시', 'kind', case when s.kind = 'exam' then 'exam' else 'event' end,
        'starts_at', lmsx_ts(coalesce(s.starts_at, s.open_at)), 'ends_at', lmsx_ts(coalesce(s.ends_at, s.close_at)), 'all_day', false, 'done', false, 'mine', false, 'src', 'session')
        from lms_session s join lms_section sc on sc.tenant_id = s.tenant_id and sc.section_id = s.section_id
       where s.tenant_id = tid and coalesce(s.starts_at, s.open_at) >= f and coalesce(s.starts_at, s.open_at) < t and (v_txt = '' or v_txt = 'course')
      union all
      select jsonb_build_object('id', tm.term_id || ':' || w.k, 'scope', 'academic', 'section_id', null, 'title', tm.name || case when w.k = 's' then ' 개강' else ' 종강' end, 'kind', 'event',
        'starts_at', lmsx_ts(w.d::timestamp at time zone 'Asia/Seoul'), 'ends_at', null, 'all_day', true, 'done', false, 'mine', false, 'src', 'term')
        from lms_term tm cross join lateral (values ('s', tm.starts_on), ('e', tm.ends_on)) w(k, d)
       where tm.tenant_id = tid and (w.d::timestamp at time zone 'Asia/Seoul') >= f and (w.d::timestamp at time zone 'Asia/Seoul') < t and (v_txt = '' or v_txt = 'academic')
    ) z;
    return jsonb_build_object('from', lmsx_ts(f), 'to', lmsx_ts(t), 'items', arr);

  elsif op = 'cal.add' then
    v_txt := lmsx_txt(q, 'scope', 20, true);
    if v_txt not in ('academic', 'course', 'personal') then perform lmsx_err(400, 'bad_input', '구분은 학사 · 강좌 · 개인 중 하나입니다.'); end if;
    if v_txt in ('academic', 'course') and not adm and coalesce(me->>'role', '') <> 'teacher' then perform lmsx_err(403, 'role', '학사 · 강좌 일정은 운영자 · 교수자만 등록할 수 있습니다.'); end if;
    if v_txt = 'academic' and not adm then perform lmsx_err(403, 'role', '학사 일정은 관리자만 등록할 수 있습니다.'); end if;
    k := coalesce(nullif(lmsx_txt(q, 'kind', 20), ''), 'event');
    if k not in ('event','deadline','exam','holiday','todo') then perform lmsx_err(400, 'bad_input', '일정 종류가 올바르지 않습니다.'); end if;
    v_id := case when v_txt = 'course' then lmsx_uuid(q, 'section_id') else null end;
    if v_id is not null and not exists (select 1 from lms_section where tenant_id = tid and section_id = v_id) then perform lmsx_err(404, 'not_found', '없는 분반입니다.'); end if;
    f := lmsx_tsq(q, 'starts_at', true); t := lmsx_tsq(q, 'ends_at');
    if t is not null and t < f then perform lmsx_err(400, 'bad_input', '끝나는 일시가 시작보다 앞섭니다.'); end if;
    insert into lms_cal_event (tenant_id, scope, section_id, owner, title, kind, starts_at, ends_at, all_day, created_by)
    values (tid, v_txt, v_id, case when v_txt = 'personal' then my end, lmsx_txt(q, 'title', 120, true), k, f, t, coalesce((q->>'all_day')::boolean, false), my)
    returning * into ev;
    perform lmsx_audit(me, 'lms.cal.add', jsonb_build_object('scope', v_txt, 'kind', k));
    return jsonb_build_object('ok', true, 'item', lms_l_ev(ev));

  elsif op = 'cal.done' then
    v_id := lmsx_uuid(q, 'id');
    update lms_cal_event set done = coalesce((q->>'done')::boolean, not done) where tenant_id = tid and event_id = v_id and (owner = my or (scope <> 'personal' and adm)) returning * into ev;
    if not found then perform lmsx_err(404, 'not_found', '없는 일정입니다.'); end if;
    return jsonb_build_object('ok', true, 'item', lms_l_ev(ev));

  elsif op = 'cal.del' then
    v_id := lmsx_uuid(q, 'id');
    delete from lms_cal_event where tenant_id = tid and event_id = v_id and (owner = my or (scope <> 'personal' and adm));
    get diagnostics n = row_count;
    if n = 0 then perform lmsx_err(404, 'not_found', '없는 일정입니다.'); end if;
    perform lmsx_audit(me, 'lms.cal.del', jsonb_build_object('id', v_id));
    return jsonb_build_object('ok', true);

  elsif op = 'cal.ics' then
    out := lms_l('cal.list', me, q);
    select string_agg(
      'BEGIN:VEVENT' || E'\r\n' || 'UID:' || (x->>'id') || '@didisam' || E'\r\n' ||
      case when (x->>'all_day')::boolean then 'DTSTART;VALUE=DATE:' || to_char((x->>'starts_at')::timestamptz at time zone 'Asia/Seoul', 'YYYYMMDD')
           else 'DTSTART:' || lms_l_ics_ts((x->>'starts_at')::timestamptz) end || E'\r\n' ||
      case when x->>'ends_at' is not null and not (x->>'all_day')::boolean then 'DTEND:' || lms_l_ics_ts((x->>'ends_at')::timestamptz) || E'\r\n' else '' end ||
      'DTSTAMP:' || lms_l_ics_ts((x->>'starts_at')::timestamptz) || E'\r\n' ||
      'SUMMARY:' || lms_l_ics_esc(x->>'title') || E'\r\n' ||
      'CATEGORIES:' || upper(x->>'scope') || ',' || upper(x->>'kind') || E'\r\n' ||
      'END:VEVENT' || E'\r\n', '' order by x->>'starts_at', x->>'title'), count(*)::int
      into v_txt, n from jsonb_array_elements(out->'items') x;
    return jsonb_build_object('n', n, 'ics', 'BEGIN:VCALENDAR' || E'\r\n' || 'VERSION:2.0' || E'\r\n' || 'PRODID:-//DiDiSam//LMS Calendar//KO' || E'\r\n' || 'CALSCALE:GREGORIAN' || E'\r\n' || 'X-WR-TIMEZONE:Asia/Seoul' || E'\r\n' || coalesce(v_txt, '') || 'END:VCALENDAR' || E'\r\n');

  elsif op = 'cal.d1' then
    -- 미이수 D-1: 24시간 안에 인정 기간이 끝나는 온라인 차시에서 아직 출석(인정)이 없는 수강생에게 푸시 대기열
    perform lmsx_admin(me);
    n := 0; n2 := 0;
    for r in select s.session_id, s.close_at, sc.title, s.week_no, s.seq, p.member_no
               from lms_session s join lms_section sc on sc.tenant_id = s.tenant_id and sc.section_id = s.section_id
               join lms_enrollment en on en.tenant_id = s.tenant_id and en.section_id = s.section_id and en.status = 'enrolled' and en.kind = 'regular'
               join lms_person p on p.tenant_id = en.tenant_id and p.person_id = en.person_id
              where s.tenant_id = tid and s.close_at > now() and s.close_at <= now() + interval '24 hours'
                and not exists (select 1 from lms_attendance a where a.tenant_id = s.tenant_id and a.session_id = s.session_id and a.person_id = en.person_id and a.status in ('present','late','excused'))
              order by p.member_no, s.close_at
    loop
      k := lms_l_enqueue('p:' || r.member_no, 'push', '[D-1] ' || r.title || ' ' || r.week_no || '주 ' || r.seq || '차시 미이수', '학습 인정 기간이 ' || to_char(r.close_at at time zone 'Asia/Seoul', 'MM-DD HH24:MI') || '에 끝납니다.', 'd1:' || r.session_id);
      if k = 'queued' then n := n + 1; elsif k = 'held_quiet' then n2 := n2 + 1; end if;
    end loop;
    perform lmsx_audit(me, 'lms.cal.d1', jsonb_build_object('queued', n, 'held', n2));
    return jsonb_build_object('queued', n, 'held', n2);

  -- ── DM ──
  elsif op = 'dm.rooms' then
    select coalesce(jsonb_agg(x order by x->>'last_at' desc nulls last), '[]') into arr from (
      select jsonb_build_object('id', rm.room_id, 'kind', rm.kind, 'title', rm.title,
        'members', (select jsonb_agg(m2.principal order by m2.principal) from lms_dm_member m2 where m2.tenant_id = tid and m2.room_id = rm.room_id),
        'unread', (select count(*) from lms_dm_message g where g.tenant_id = tid and g.room_id = rm.room_id and g.id > m.last_read_id and g.sender <> my)::int,
        'last', (select g.body from lms_dm_message g where g.tenant_id = tid and g.room_id = rm.room_id order by g.id desc limit 1),
        'last_at', (select lmsx_ts(g.created_at) from lms_dm_message g where g.tenant_id = tid and g.room_id = rm.room_id order by g.id desc limit 1)) x
      from lms_dm_room rm join lms_dm_member m on m.tenant_id = rm.tenant_id and m.room_id = rm.room_id and m.principal = my
      where rm.tenant_id = tid) z;
    return jsonb_build_object('me', my, 'items', arr);

  elsif op = 'dm.open' then
    k := coalesce(nullif(lmsx_txt(q, 'kind', 20), ''), 'direct');
    if k not in ('direct', 'group') then perform lmsx_err(400, 'bad_input', '방 종류는 1:1 또는 그룹입니다.'); end if;
    if jsonb_typeof(q->'members') is distinct from 'array' then perform lmsx_err(400, 'bad_input', '대화 상대(members)를 고르세요.'); end if;
    select coalesce(array_agg(distinct v), '{}') into mem from jsonb_array_elements_text(q->'members') v where v <> my;
    if cardinality(mem) = 0 or cardinality(mem) > 200 then perform lmsx_err(400, 'bad_input', '대화 상대는 1~200명입니다.'); end if;
    if k = 'direct' and cardinality(mem) <> 1 then perform lmsx_err(400, 'bad_input', '1:1 대화는 상대가 한 명이어야 합니다.'); end if;
    foreach v_txt in array mem loop
      if v_txt !~ '^p:[A-Za-z0-9_-]{4,20}$' or not exists (select 1 from lms_person where tenant_id = tid and member_no = substr(v_txt, 3)) then
        perform lmsx_err(404, 'not_found', '없는 구성원입니다: ' || left(v_txt, 30)); end if;
    end loop;
    if k = 'direct' then
      v_txt := least(my, mem[1]) || '|' || greatest(my, mem[1]);
      select room_id into v_id from lms_dm_room where tenant_id = tid and direct_key = v_txt;
      if found then return jsonb_build_object('id', v_id, 'created', false); end if;
    end if;
    insert into lms_dm_room (tenant_id, kind, title, direct_key, created_by)
    values (tid, k, case when k = 'group' then coalesce(nullif(lmsx_txt(q, 'title', 60), ''), '그룹 대화') else '' end, case when k = 'direct' then v_txt end, my) returning room_id into v_id;
    insert into lms_dm_member (tenant_id, room_id, principal, role) values (tid, v_id, my, 'owner');
    insert into lms_dm_member (tenant_id, room_id, principal) select tid, v_id, unnest(mem);
    return jsonb_build_object('id', v_id, 'created', true);

  elsif op in ('dm.send', 'dm.msgs', 'dm.read') then
    v_id := lmsx_uuid(q, 'room_id');
    if not exists (select 1 from lms_dm_member where tenant_id = tid and room_id = v_id and principal = my) then perform lmsx_err(404, 'not_found', '참여하지 않은 대화방입니다.'); end if;
    if op = 'dm.send' then
      v_txt := lmsx_txt(q, 'body', 2000);
      -- 첨부: 바이트는 파일 저장소(lms_file, POST /api/lms/e/file)에 먼저 올리고 file_id만 보낸다. 본인이 올린 파일 · 허용 형식만
      arr := coalesce(q->'attachments', '[]');
      if jsonb_typeof(arr) <> 'array' or jsonb_array_length(arr) > 10 then perform lmsx_err(400, 'bad_input', '첨부는 10개까지입니다.'); end if;
      out := '[]';
      for r in select a from jsonb_array_elements(arr) a loop
        if coalesce(r.a->>'file_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then perform lmsx_err(400, 'file', '첨부 파일을 먼저 올리세요(file_id).'); end if;
        select * into fl from lmsx_my_file(me, (r.a->>'file_id')::uuid);
        if fl.file_id is null then perform lmsx_err(400, 'file', '첨부 파일을 찾을 수 없습니다(본인이 올린 파일만 첨부할 수 있습니다).'); end if;
        if lmsx_file_ok(fl.name, fl.mime) is not null then perform lmsx_err(400, 'file_type', lmsx_file_ok(fl.name, fl.mime)); end if;
        out := out || jsonb_build_array(jsonb_build_object('file_id', fl.file_id, 'name', fl.name, 'size', fl.size, 'mime', fl.mime,
          'kind', case when fl.mime like 'image/%' then 'image' when fl.mime like 'audio/%' then 'voice' else 'file' end));
      end loop;
      arr := out;
      if v_txt = '' and jsonb_array_length(arr) = 0 then perform lmsx_err(400, 'bad_input', '보낼 내용을 입력하세요.'); end if;
      insert into lms_dm_message (tenant_id, room_id, sender, body, attachments, lang) values (tid, v_id, my, v_txt, arr, coalesce(nullif(lmsx_txt(q, 'lang', 10), ''), 'ko')) returning id into n;
      update lms_dm_member set last_read_id = n where tenant_id = tid and room_id = v_id and principal = my;
      return jsonb_build_object('ok', true, 'id', n);
    elsif op = 'dm.read' then
      update lms_dm_member set last_read_id = greatest(last_read_id, coalesce((select max(id) from lms_dm_message where tenant_id = tid and room_id = v_id), 0))
       where tenant_id = tid and room_id = v_id and principal = my;
      return jsonb_build_object('ok', true);
    else
      n := lmsx_int(q, 'after', 0, 0, 2000000000);
      select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'sender', g.sender, 'mine', g.sender = my, 'body', g.body, 'attachments', g.attachments, 'lang', g.lang, 'at', lmsx_ts(g.created_at),
        'read_by', (select count(*) from lms_dm_member m where m.tenant_id = tid and m.room_id = v_id and m.principal <> g.sender and m.last_read_id >= g.id)::int) order by g.id), '[]')
        into arr from (select * from lms_dm_message where tenant_id = tid and room_id = v_id and id > n order by id desc limit 200) g;
      select jsonb_build_object('id', room_id, 'kind', kind, 'title', title) into out from lms_dm_room where tenant_id = tid and room_id = v_id;
      return jsonb_build_object('room', out, 'members', (select count(*) from lms_dm_member where tenant_id = tid and room_id = v_id)::int, 'items', arr);
    end if;

  elsif op = 'dm.file' then
    -- 대화방 첨부 내려받기: 그 방 참여자만, 그 방 메시지에 붙은 파일만
    v_id := lmsx_uuid(q, 'room_id');
    if not exists (select 1 from lms_dm_member where tenant_id = tid and room_id = v_id and principal = my) then perform lmsx_err(404, 'not_found', '참여하지 않은 대화방입니다.'); end if;
    v_txt := lmsx_uuid(q, 'file_id')::text;
    if not exists (select 1 from lms_dm_message g, jsonb_array_elements(g.attachments) a where g.tenant_id = tid and g.room_id = v_id and a->>'file_id' = v_txt) then perform lmsx_err(404, 'not_found', '이 대화방의 첨부 파일이 아닙니다.'); end if;
    select * into fl from lms_file where tenant_id = tid and file_id = v_txt::uuid;
    if fl.file_id is null then perform lmsx_err(404, 'not_found', '파일이 지워졌습니다.'); end if;
    return jsonb_build_object('file_id', fl.file_id, 'name', fl.name, 'mime', fl.mime, 'size', fl.size, 'sha256', fl.sha256, 'b64', translate(encode(fl.data, 'base64'), E'\n', ''));

  elsif op = 'dm.broadcast' then
    if not adm and coalesce(me->>'role', '') <> 'teacher' then perform lmsx_err(403, 'role', '일괄 발송은 운영자 · 교수자만 할 수 있습니다.'); end if;
    v_txt := lmsx_txt(q, 'body', 2000, true);
    if coalesce(q->>'section_id', '') <> '' then
      v_id := lmsx_uuid(q, 'section_id');
      select coalesce(array_agg('p:' || p.member_no order by p.member_no), '{}') into mem from lms_enrollment e join lms_person p on p.tenant_id = e.tenant_id and p.person_id = e.person_id
       where e.tenant_id = tid and e.section_id = v_id and e.status = 'enrolled';
    elsif jsonb_typeof(q->'members') = 'array' then
      select coalesce(array_agg(distinct 'p:' || p.member_no order by 'p:' || p.member_no), '{}') into mem from jsonb_array_elements_text(q->'members') v join lms_person p on p.tenant_id = tid and 'p:' || p.member_no = v;
    else perform lmsx_err(400, 'bad_input', '받는 사람(분반 또는 구성원)을 고르세요.'); end if;
    if cardinality(mem) = 0 then perform lmsx_err(400, 'bad_input', '받는 사람이 없습니다.'); end if;
    if cardinality(mem) > 5000 then perform lmsx_err(400, 'bad_input', '한 번에 5,000명까지 보낼 수 있습니다.'); end if;
    insert into lms_dm_room (tenant_id, kind, title, created_by) values (tid, 'broadcast', coalesce(nullif(lmsx_txt(q, 'title', 60), ''), '일괄 안내'), my) returning room_id into v_id;
    insert into lms_dm_member (tenant_id, room_id, principal, role) values (tid, v_id, my, 'owner');
    insert into lms_dm_member (tenant_id, room_id, principal) select tid, v_id, unnest(mem);
    insert into lms_dm_message (tenant_id, room_id, sender, body) values (tid, v_id, my, v_txt) returning id into n;
    update lms_dm_member set last_read_id = n where tenant_id = tid and room_id = v_id and principal = my;
    n := 0; n2 := 0;
    foreach k in array mem loop
      perform lms_l_enqueue(k, 'inapp', coalesce(nullif(lmsx_txt(q, 'title', 60), ''), '일괄 안내'), v_txt, 'bc:' || v_id);
      if coalesce((q->>'push')::boolean, false) then
        if lms_l_enqueue(k, 'push', coalesce(nullif(lmsx_txt(q, 'title', 60), ''), '일괄 안내'), v_txt, 'bc:' || v_id) = 'held_quiet' then n2 := n2 + 1; else n := n + 1; end if;
      end if;
    end loop;
    perform lmsx_audit(me, 'lms.dm.broadcast', jsonb_build_object('to', cardinality(mem)));
    return jsonb_build_object('ok', true, 'id', v_id, 'to', cardinality(mem), 'push_queued', n, 'push_held', n2);

  -- ── 알림 규칙 · 방해금지 ──
  elsif op = 'noti.rules' then
    select coalesce(jsonb_agg(jsonb_build_object('id', rule_id, 'event', event, 'section_id', section_id, 'params', params, 'channels', to_jsonb(channels), 'enabled', enabled) order by created_at, rule_id), '[]')
      into arr from lms_noti_rule where tenant_id = tid and owner = my;
    select jsonb_build_object('starts', to_char(starts, 'HH24:MI'), 'ends', to_char(ends, 'HH24:MI'), 'enabled', enabled) into out from lms_noti_quiet where tenant_id = tid and principal = my;
    return jsonb_build_object('items', arr, 'quiet', out, 'quiet_now', lms_l_quiet_until(my) is not null);

  elsif op = 'noti.rule_save' then
    k := lmsx_txt(q, 'event', 20, true);
    if k not in ('resource_new','qna_new','due_before','analytics') then perform lmsx_err(400, 'bad_input', '알림 조건이 올바르지 않습니다.'); end if;
    if jsonb_typeof(q->'channels') is distinct from 'array' then perform lmsx_err(400, 'bad_input', '받을 채널을 고르세요.'); end if;
    select coalesce(array_agg(distinct c), '{}') into mem from jsonb_array_elements_text(q->'channels') c;
    if cardinality(mem) = 0 or not mem <@ array['inapp','push','sms','kakao','email'] then perform lmsx_err(400, 'bad_input', '채널은 알림함 · 푸시 · SMS · 알림톡 · 메일 중에서 고릅니다.'); end if;
    out := coalesce(q->'params', '{}');
    if jsonb_typeof(out) <> 'object' then perform lmsx_err(400, 'bad_input', 'params 형식이 올바르지 않습니다.'); end if;
    if k = 'due_before' then
      n := coalesce((out->>'hours')::int, 24); if n < 1 or n > 168 then perform lmsx_err(400, 'bad_input', '마감 알림은 1~168시간 전으로 정합니다.'); end if;
      out := jsonb_build_object('hours', n);
    elsif k = 'analytics' then
      if coalesce(out->>'metric', '') not in ('absent_count', 'late_count') or coalesce(out->>'op', '') not in ('>=', '>') then perform lmsx_err(400, 'bad_input', '분석 조건은 결석 · 지각 횟수와 >= 또는 > 비교입니다.'); end if;
      out := jsonb_build_object('metric', out->>'metric', 'op', out->>'op', 'value', greatest(1, least(coalesce((out->>'value')::int, 3), 100)));
    else out := '{}'; end if;
    v_id := lmsx_uuid(q, 'section_id', false);
    if coalesce(q->>'id', '') <> '' then
      update lms_noti_rule set event = k, section_id = v_id, params = out, channels = mem, enabled = coalesce((q->>'enabled')::boolean, true)
       where tenant_id = tid and rule_id = lmsx_uuid(q, 'id') and owner = my returning rule_id into v_id;
      if not found then perform lmsx_err(404, 'not_found', '없는 규칙입니다.'); end if;
    else
      if (select count(*) from lms_noti_rule where tenant_id = tid and owner = my) >= 50 then perform lmsx_err(400, 'too_many', '알림 규칙은 50개까지입니다.'); end if;
      insert into lms_noti_rule (tenant_id, owner, event, section_id, params, channels, enabled) values (tid, my, k, v_id, out, mem, coalesce((q->>'enabled')::boolean, true)) returning rule_id into v_id;
    end if;
    return jsonb_build_object('ok', true, 'id', v_id, 'params', out);

  elsif op = 'noti.rule_del' then
    delete from lms_noti_rule where tenant_id = tid and rule_id = lmsx_uuid(q, 'id') and owner = my;
    get diagnostics n = row_count; if n = 0 then perform lmsx_err(404, 'not_found', '없는 규칙입니다.'); end if;
    return jsonb_build_object('ok', true);

  elsif op = 'noti.quiet' then
    if coalesce(q->>'starts', '') !~ '^([01]\d|2[0-3]):[0-5]\d$' or coalesce(q->>'ends', '') !~ '^([01]\d|2[0-3]):[0-5]\d$' then perform lmsx_err(400, 'bad_input', '방해금지 시간은 HH:MM 형식입니다.'); end if;
    insert into lms_noti_quiet (tenant_id, principal, starts, ends, enabled) values (tid, my, (q->>'starts')::time, (q->>'ends')::time, coalesce((q->>'enabled')::boolean, true))
    on conflict (tenant_id, principal) do update set starts = excluded.starts, ends = excluded.ends, enabled = excluded.enabled;
    return jsonb_build_object('ok', true, 'quiet_now', lms_l_quiet_until(my) is not null);

  elsif op = 'noti.fire' then
    -- 업무 이벤트(자원 등록 · Q&A 등록)를 규칙에 맞춰 대기열에 넣는다. 다른 묶음(자료실 · Q&A)이 호출하는 지점.
    if not adm and coalesce(me->>'role', '') <> 'teacher' then perform lmsx_err(403, 'role', '운영자 · 교수자만 실행할 수 있습니다.'); end if;
    k := lmsx_txt(q, 'event', 20, true);
    if k not in ('resource_new', 'qna_new') then perform lmsx_err(400, 'bad_input', '이벤트는 resource_new · qna_new입니다.'); end if;
    v_id := lmsx_uuid(q, 'section_id', false); v_txt := lmsx_txt(q, 'title', 120, true);
    n := 0; n2 := 0;
    for r in select * from lms_noti_rule where tenant_id = tid and enabled and event = k and (section_id is null or section_id = v_id) order by created_at, event, params::text loop
      foreach k in array r.channels loop
        if lms_l_enqueue(r.owner, k, case when r.event = 'resource_new' then '[자료 등록] ' else '[Q&A] ' end || v_txt, lmsx_txt(q, 'body', 500), 'ev:' || r.rule_id || ':' || md5(v_txt || coalesce(q->>'ref', ''))) = 'held_quiet' then n2 := n2 + 1; else n := n + 1; end if;
      end loop; k := r.event;
    end loop;
    return jsonb_build_object('queued', n, 'held', n2);

  elsif op = 'noti.scan' then
    -- 마감 n시간 전 · 분석 조건 규칙 평가(주기 실행 지점: 운영 스케줄러가 호출)
    perform lmsx_admin(me);
    n := 0; n2 := 0;
    update lms_noti_outbox set status = 'queued' where tenant_id = tid and status = 'held_quiet' and not_before <= now();
    get diagnostics n2 = row_count;
    for r in select ru.*, e.event_id, e.title etitle, e.starts_at from lms_noti_rule ru join lms_cal_event e on e.tenant_id = ru.tenant_id and e.kind in ('deadline', 'exam')
               and e.starts_at > now() and e.starts_at <= now() + make_interval(hours => (ru.params->>'hours')::int) and (ru.section_id is null or e.section_id = ru.section_id)
               and (e.scope <> 'personal' or e.owner = ru.owner)
              where ru.tenant_id = tid and ru.enabled and ru.event = 'due_before' order by ru.created_at, e.starts_at, e.title loop
      foreach k in array r.channels loop
        if lms_l_enqueue(r.owner, k, '[마감 ' || (r.params->>'hours') || '시간 전] ' || r.etitle, to_char(r.starts_at at time zone 'Asia/Seoul', 'MM-DD HH24:MI') || ' 마감', 'due:' || r.rule_id || ':' || r.event_id) <> 'dup' then n := n + 1; end if;
      end loop;
    end loop;
    for r in select ru.rule_id, ru.owner, ru.channels, ru.params, sc.title, x.cnt, x.member_no from lms_noti_rule ru
               join lateral (select a.person_id, p.member_no, s.section_id, count(*) cnt from lms_attendance a join lms_session s on s.tenant_id = a.tenant_id and s.session_id = a.session_id
                               join lms_person p on p.tenant_id = a.tenant_id and p.person_id = a.person_id
                              where a.tenant_id = tid and a.status = case when ru.params->>'metric' = 'late_count' then 'late' else 'absent' end and (ru.section_id is null or s.section_id = ru.section_id)
                              group by 1, 2, 3) x on (case when ru.params->>'op' = '>' then x.cnt > (ru.params->>'value')::int else x.cnt >= (ru.params->>'value')::int end)
               join lms_section sc on sc.tenant_id = tid and sc.section_id = x.section_id
              where ru.tenant_id = tid and ru.enabled and ru.event = 'analytics' order by ru.created_at, x.member_no, sc.title loop
      foreach k in array r.channels loop
        if lms_l_enqueue(r.owner, k, '[학습 분석] ' || r.title || ' ' || r.member_no, case when r.params->>'metric' = 'late_count' then '지각 ' else '결석 ' end || r.cnt || '회', 'an:' || r.rule_id || ':' || r.member_no || ':' || r.cnt) <> 'dup' then n := n + 1; end if;
      end loop;
    end loop;
    return jsonb_build_object('queued', n, 'released', n2);

  elsif op = 'noti.inbox' then
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title, 'body', body, 'at', lmsx_ts(created_at)) order by id desc), '[]') into arr
      from (select * from lms_noti_outbox where tenant_id = tid and principal = my and channel = 'inapp' order by id desc limit 50) o;
    return jsonb_build_object('items', arr);

  elsif op = 'noti.outbox' then
    perform lmsx_admin(me);
    v_txt := lmsx_txt(q, 'status', 20);
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'principal', principal, 'channel', channel, 'title', title, 'status', status, 'not_before', lmsx_ts(not_before), 'at', lmsx_ts(created_at)) order by id desc), '[]') into arr
      from (select * from lms_noti_outbox where tenant_id = tid and (v_txt = '' or status = v_txt) and channel <> 'inapp' order by id desc limit 200) o;
    select coalesce(jsonb_object_agg(status, c), '{}') into out from (select status, count(*)::int c from lms_noti_outbox where tenant_id = tid and channel <> 'inapp' group by status) s;
    return jsonb_build_object('items', arr, 'counts', out);

  elsif op = 'noti.ack' then
    -- 외부 발송기(연동 지점)가 보낸 결과를 돌려준다
    perform lmsx_admin(me);
    k := lmsx_txt(q, 'status', 20, true);
    if k not in ('sent', 'failed', 'cancelled') then perform lmsx_err(400, 'bad_input', '결과는 sent · failed · cancelled입니다.'); end if;
    if jsonb_typeof(q->'ids') is distinct from 'array' or jsonb_array_length(q->'ids') > 1000 then perform lmsx_err(400, 'bad_input', 'ids(최대 1,000개)를 보내세요.'); end if;
    update lms_noti_outbox set status = k, sent_at = case when k = 'sent' then now() end
     where tenant_id = tid and status in ('queued', 'held_quiet') and id in (select (v)::bigint from jsonb_array_elements_text(q->'ids') v where v ~ '^\d{1,15}$');
    get diagnostics n = row_count;
    return jsonb_build_object('ok', true, 'n', n);
  end if;
  perform lmsx_err(404, 'not_found', '없는 주소입니다.');
  return null;
end $$;
