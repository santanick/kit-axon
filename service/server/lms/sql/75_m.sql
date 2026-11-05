-- v30 학사 LMS 묶음 M — 관리자: 사용자 관리 · 사용자 전환(감사 · 시간 제한) · 접속 로그/통계 · 로그 검색 · 팝업 · 배너 · 시스템 모니터링 (SFR-051 · 054 · 055 · 057 · 058)
-- 업무 로직은 lms_m(op, me, q). 앱 계층은 IP · UA · 프로세스 지표만 넣는다. 구성원은 학번 · 학과 · 학적만 다룬다.

create table if not exists lms_access_log (
  tenant_id text not null references tenants(id) on delete cascade,
  id bigserial, at timestamptz not null default now(),
  principal text not null, imp_by text,
  kind text not null check (kind in ('login','logout','view','activity','upload','download','grade_change')),
  path text not null default '', section_id uuid, bytes bigint not null default 0,
  device text not null default 'pc', browser text not null default 'other', ip_masked text not null default '',
  primary key (tenant_id, id)
);
create index if not exists lms_access_log_at on lms_access_log (tenant_id, at desc);
create index if not exists lms_access_log_p on lms_access_log (tenant_id, principal, at desc);
create table if not exists lms_impersonation (
  tenant_id text not null references tenants(id) on delete cascade,
  imp_id uuid not null default gen_random_uuid(),
  admin_principal text not null, admin_email text not null default '',
  target_member_no text not null, reason text not null,
  started_at timestamptz not null default now(), expires_at timestamptz not null, ended_at timestamptz,
  ip_masked text not null default '',
  primary key (tenant_id, imp_id)
);
create table if not exists lms_user_control (
  tenant_id text not null, person_id uuid not null,
  blocked boolean not null default false, reason text not null default '', until timestamptz,
  updated_by text, updated_at timestamptz not null default now(),
  primary key (tenant_id, person_id),
  foreign key (tenant_id, person_id) references lms_person (tenant_id, person_id) on delete cascade
);
create table if not exists lms_popup (
  tenant_id text not null references tenants(id) on delete cascade,
  popup_id uuid not null default gen_random_uuid(),
  kind text not null check (kind in ('popup','banner')),
  group_key text not null default '',              -- 같은 그룹 배너 여러 장 → 팝업 1개에 넘겨 보기
  title text not null, body text not null default '', link text not null default '',
  audience text[] not null default '{student,professor,staff,external,admin}',
  starts_at timestamptz not null default now(), ends_at timestamptz,
  sort smallint not null default 0, enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id, popup_id)
);
create table if not exists lms_mon_threshold (
  tenant_id text not null references tenants(id) on delete cascade,
  metric text not null check (metric in ('cpu_load','mem_pct','disk_pct','heap_pct','sis_fail')),
  warn numeric not null, crit numeric not null,
  primary key (tenant_id, metric), check (crit >= warn)
);
create table if not exists lms_mon_sample (
  tenant_id text not null references tenants(id) on delete cascade,
  id bigserial, at timestamptz not null default now(),
  node text not null default '', vals jsonb not null, level text not null check (level in ('ok','warn','crit')), alerts jsonb not null default '[]',
  primary key (tenant_id, id)
);
create index if not exists lms_mon_sample_at on lms_mon_sample (tenant_id, at desc);

do $$ declare t text; begin
  foreach t in array array['lms_access_log','lms_impersonation','lms_user_control','lms_popup','lms_mon_threshold','lms_mon_sample'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_access_log_id_seq, lms_mon_sample_id_seq to didisam_tenant;
end $$;

create or replace function lms_m_device(ua text) returns text language sql immutable as $$
  select case when ua ~* 'ipad|tablet' then 'tablet' when ua ~* 'mobile|android|iphone' then 'mobile' else 'pc' end $$;
create or replace function lms_m_browser(ua text) returns text language sql immutable as $$
  select case when ua ~* 'whale/' then 'whale' when ua ~* 'samsungbrowser' then 'samsung' when ua ~* 'edg/' then 'edge' when ua ~* 'firefox/' then 'firefox'
              when ua ~* 'chrome/|crios/' then 'chrome' when ua ~* 'safari/' then 'safari' else 'other' end $$;
create or replace function lms_m_person(p lms_person) returns jsonb language sql as $$
  select jsonb_build_object('id', p.person_id, 'member_no', p.member_no, 'kind', p.kind, 'unit_code', p.unit_code, 'status', p.status, 'grade_year', p.grade_year, 'source', p.source, 'last_login_at', lmsx_ts(p.last_login_at)) $$;
create or replace function lms_m_imp(i lms_impersonation) returns jsonb language sql as $$
  select case when i.imp_id is null then null else jsonb_build_object('id', i.imp_id, 'target', i.target_member_no, 'reason', i.reason, 'started_at', lmsx_ts(i.started_at), 'expires_at', lmsx_ts(i.expires_at), 'ended_at', lmsx_ts(i.ended_at),
    'active', i.ended_at is null and i.expires_at > now()) end $$;
create or replace function lms_m_popup(x lms_popup) returns jsonb language sql as $$
  select jsonb_build_object('id', x.popup_id, 'kind', x.kind, 'group_key', x.group_key, 'title', x.title, 'body', x.body, 'link', x.link, 'audience', to_jsonb(x.audience),
    'starts_at', lmsx_ts(x.starts_at), 'ends_at', lmsx_ts(x.ends_at), 'sort', x.sort, 'enabled', x.enabled) $$;
create or replace function lms_m_th_seed() returns void language sql as $$
  insert into lms_mon_threshold (tenant_id, metric, warn, crit)
  select current_setting('app.tenant', true), m, w, c from (values ('cpu_load', 70, 90), ('mem_pct', 80, 92), ('disk_pct', 80, 90), ('heap_pct', 80, 95), ('sis_fail', 1, 3)) v(m, w, c)
  on conflict do nothing $$;

create or replace function lms_m(op text, me jsonb, q jsonb) returns jsonb language plpgsql as $$
declare
  tid text := current_setting('app.tenant', true);
  my text := 'u:' || coalesce(me->>'uid', '');
  f timestamptz; t timestamptz; v_id uuid; v_txt text; k text; r record; arr jsonb; out jsonb; n int; mem text[]; im lms_impersonation; pp lms_person; px lms_popup;
begin
  if op = 'access.hit' then
    -- 화면 열람 · 활동 · 업로드 기록(모든 역할). 사용자 전환 중이면 대상 학번으로, 전환한 관리자를 함께 남긴다
    k := coalesce(nullif(lmsx_txt(q, 'kind', 20), ''), 'view');
    if k not in ('login','logout','view','activity','upload','download') then perform lmsx_err(400, 'bad_input', '기록 종류가 올바르지 않습니다.'); end if;
    select * into im from lms_impersonation where tenant_id = tid and admin_principal = my and ended_at is null and expires_at > now() order by started_at desc limit 1;
    v_id := lmsx_uuid(q, 'section_id', false);
    insert into lms_access_log (tenant_id, principal, imp_by, kind, path, section_id, bytes, device, browser, ip_masked)
    values (tid, case when im.imp_id is null then my else 'p:' || im.target_member_no end, case when im.imp_id is null then null else my end, k, lmsx_txt(q, 'path', 200), v_id,
            greatest(0, least(coalesce(nullif(q->>'bytes', '')::bigint, 0), 10737418240)), lms_m_device(coalesce(me->>'ua', '')), lms_m_browser(coalesce(me->>'ua', '')), lmsx_ip(me->>'ip'));
    return jsonb_build_object('ok', true, 'as', case when im.imp_id is null then null else im.target_member_no end);
  end if;

  perform lmsx_admin(me);

  if op = 'users.list' then
    v_txt := lmsx_txt(q, 'q', 40); k := lmsx_txt(q, 'kind', 20);
    n := lmsx_int(q, 'page', 1, 1, 10000);
    select coalesce(jsonb_agg(x order by x->>'member_no'), '[]') into arr from (
      select lms_m_person(p) || jsonb_build_object('enrolled', (select count(*) from lms_enrollment e where e.tenant_id = tid and e.person_id = p.person_id and e.status = 'enrolled')::int,
        'blocked', coalesce(uc.blocked and (uc.until is null or uc.until > now()), false)) x
      from lms_person p left join lms_user_control uc on uc.tenant_id = p.tenant_id and uc.person_id = p.person_id
      where p.tenant_id = tid and (v_txt = '' or p.member_no like '%' || v_txt || '%' or coalesce(p.unit_code, '') ilike '%' || v_txt || '%')
        and (k = '' or p.kind = k) and (coalesce(q->>'status', '') = '' or p.status = q->>'status')
      order by p.member_no limit 50 offset (n - 1) * 50) z;
    select count(*)::int into n from lms_person p where p.tenant_id = tid and (v_txt = '' or p.member_no like '%' || v_txt || '%' or coalesce(p.unit_code, '') ilike '%' || v_txt || '%') and (k = '' or p.kind = k) and (coalesce(q->>'status', '') = '' or p.status = q->>'status');
    return jsonb_build_object('total', n, 'items', arr,
      'kinds', (select coalesce(jsonb_object_agg(kind, c), '{}') from (select kind, count(*)::int c from lms_person where tenant_id = tid group by kind) s));

  elsif op = 'users.get' then
    select * into pp from lms_person where tenant_id = tid and member_no = lmsx_txt(q, 'member_no', 20, true);
    if not found then perform lmsx_err(404, 'not_found', '없는 구성원입니다.'); end if;
    select coalesce(jsonb_agg(jsonb_build_object('section_id', s.section_id, 'title', s.title, 'term_id', s.term_id, 'course_code', s.course_code, 'kind', e.kind, 'status', e.status) order by s.term_id desc, s.title), '[]') into arr
      from lms_enrollment e join lms_section s on s.tenant_id = e.tenant_id and s.section_id = e.section_id where e.tenant_id = tid and e.person_id = pp.person_id;
    select coalesce(jsonb_agg(jsonb_build_object('at', lmsx_ts(a.at), 'kind', a.kind, 'path', a.path, 'device', a.device, 'browser', a.browser, 'ip', a.ip_masked, 'imp_by', a.imp_by) order by a.id desc), '[]') into out
      from (select * from lms_access_log where tenant_id = tid and principal = 'p:' || pp.member_no order by id desc limit 30) a;
    return jsonb_build_object('person', lms_m_person(pp), 'enrollments', arr, 'access', out,
      'staff', (select coalesce(jsonb_agg(jsonb_build_object('section_id', ss.section_id, 'role', ss.role) order by ss.role, ss.section_id), '[]') from lms_section_staff ss where ss.tenant_id = tid and ss.person_id = pp.person_id),
      'control', (select jsonb_build_object('blocked', blocked, 'reason', reason, 'until', lmsx_ts(until)) from lms_user_control where tenant_id = tid and person_id = pp.person_id));

  elsif op = 'users.save' then
    v_txt := lmsx_txt(q, 'member_no', 20, true);
    if v_txt !~ '^[A-Za-z0-9_-]{4,20}$' then perform lmsx_err(400, 'bad_input', '학번 · 사번은 영문 · 숫자 4~20자입니다.'); end if;
    if q ? 'name' or q ? 'phone' or q ? 'email' then perform lmsx_err(400, 'pii', '이름 · 연락처는 저장하지 않습니다(학번 · 학과 · 학적만).'); end if;
    k := coalesce(nullif(lmsx_txt(q, 'kind', 20), ''), 'student');
    if k not in ('student','professor','staff','external') then perform lmsx_err(400, 'bad_input', '구분이 올바르지 않습니다.'); end if;
    if coalesce(q->>'status', 'active') not in ('active','leave','graduated','expelled','withdrawn','retired') then perform lmsx_err(400, 'bad_input', '학적 상태가 올바르지 않습니다.'); end if;
    insert into lms_person (tenant_id, member_no, kind, unit_code, status, grade_year, source)
    values (tid, v_txt, k, nullif(lmsx_txt(q, 'unit_code', 20), ''), coalesce(nullif(q->>'status', ''), 'active'), nullif(lmsx_int(q, 'grade_year', 0, 0, 9), 0), 'manual')
    on conflict (tenant_id, member_no) do update set kind = excluded.kind, unit_code = excluded.unit_code, status = excluded.status, grade_year = excluded.grade_year
    returning * into pp;
    perform lmsx_audit(me, 'lms.user.save', jsonb_build_object('member_no', v_txt));
    return jsonb_build_object('ok', true, 'person', lms_m_person(pp));

  elsif op = 'users.control' then
    select * into pp from lms_person where tenant_id = tid and member_no = lmsx_txt(q, 'member_no', 20, true);
    if not found then perform lmsx_err(404, 'not_found', '없는 구성원입니다.'); end if;
    insert into lms_user_control (tenant_id, person_id, blocked, reason, until, updated_by) values (tid, pp.person_id, coalesce((q->>'blocked')::boolean, true), lmsx_txt(q, 'reason', 200), lmsx_tsq(q, 'until'), my)
    on conflict (tenant_id, person_id) do update set blocked = excluded.blocked, reason = excluded.reason, until = excluded.until, updated_by = excluded.updated_by, updated_at = now();
    perform lmsx_audit(me, 'lms.user.control', jsonb_build_object('member_no', pp.member_no, 'blocked', coalesce((q->>'blocked')::boolean, true)));
    return jsonb_build_object('ok', true);

  -- ── 사용자 전환(감사 · 최대 30분) ──
  elsif op = 'imp.start' then
    if me->>'role' <> 'owner' then perform lmsx_err(403, 'role', '사용자 전환은 정운영자만 할 수 있습니다.'); end if;
    select * into pp from lms_person where tenant_id = tid and member_no = lmsx_txt(q, 'member_no', 20, true);
    if not found then perform lmsx_err(404, 'not_found', '없는 구성원입니다.'); end if;
    v_txt := lmsx_txt(q, 'reason', 200, true);
    if length(v_txt) < 5 then perform lmsx_err(400, 'bad_input', '전환 사유를 5자 이상 입력하세요.'); end if;
    n := lmsx_int(q, 'minutes', 15, 1, 30);
    update lms_impersonation set ended_at = now() where tenant_id = tid and admin_principal = my and ended_at is null;
    insert into lms_impersonation (tenant_id, admin_principal, admin_email, target_member_no, reason, expires_at, ip_masked)
    values (tid, my, coalesce(me->>'email', ''), pp.member_no, v_txt, now() + make_interval(mins => n), lmsx_ip(me->>'ip')) returning * into im;
    perform lmsx_audit(me, 'lms.imp.start', jsonb_build_object('target', pp.member_no, 'minutes', n, 'reason', v_txt));
    return jsonb_build_object('ok', true, 'imp', lms_m_imp(im), 'minutes', n);

  elsif op = 'imp.current' then
    select * into im from lms_impersonation where tenant_id = tid and admin_principal = my and ended_at is null and expires_at > now() order by started_at desc limit 1;
    select coalesce(jsonb_agg(lms_m_imp(i) || jsonb_build_object('admin', i.admin_email) order by i.started_at desc), '[]') into arr
      from (select * from lms_impersonation where tenant_id = tid order by started_at desc limit 20) i;
    return jsonb_build_object('current', lms_m_imp(im), 'history', arr);

  elsif op = 'imp.end' then
    update lms_impersonation set ended_at = now() where tenant_id = tid and admin_principal = my and ended_at is null and expires_at > now() returning * into im;
    get diagnostics n = row_count;
    if n = 0 then perform lmsx_err(404, 'not_found', '진행 중인 사용자 전환이 없습니다.'); end if;
    perform lmsx_audit(me, 'lms.imp.end', jsonb_build_object('target', im.target_member_no));
    return jsonb_build_object('ok', true);

  -- ── 접속 통계 ──
  elsif op = 'stats' then
    f := coalesce(lmsx_tsq(q, 'from'), (date_trunc('day', now() at time zone 'Asia/Seoul') - interval '29 days') at time zone 'Asia/Seoul');
    t := coalesce(lmsx_tsq(q, 'to'), now() + interval '1 second');
    if t < f or t - f > interval '731 days' then perform lmsx_err(400, 'bad_input', '통계 기간은 2년 이내여야 합니다.'); end if;
    with L as (select *, at at time zone 'Asia/Seoul' lt from lms_access_log where tenant_id = tid and at >= f and at < t),
         first_seen as (select principal, min(at) fa from lms_access_log where tenant_id = tid group by principal)
    select jsonb_build_object(
      'from', lmsx_ts(f), 'to', lmsx_ts(t),
      'total', (select count(*) from L)::int, 'users', (select count(distinct principal) from L)::int,
      'by_month', (select coalesce(jsonb_object_agg(kk, c), '{}') from (select to_char(lt, 'YYYY-MM') kk, count(*)::int c from L group by 1) s),
      'by_day', (select coalesce(jsonb_object_agg(kk, c), '{}') from (select to_char(lt, 'YYYY-MM-DD') kk, count(*)::int c from L group by 1) s),
      'by_dow', (select coalesce(jsonb_object_agg(kk, c), '{}') from (select extract(dow from lt)::int::text kk, count(*)::int c from L group by 1) s),
      'by_hour', (select coalesce(jsonb_object_agg(kk, c), '{}') from (select lpad(extract(hour from lt)::int::text, 2, '0') kk, count(*)::int c from L group by 1) s),
      'by_term', (select coalesce(jsonb_object_agg(kk, c), '{}') from (select coalesce(tm.term_id, '학기 외') kk, count(*)::int c from L left join lms_term tm on tm.tenant_id = tid and L.lt::date between tm.starts_on and tm.ends_on group by 1) s),
      'by_device', (select coalesce(jsonb_object_agg(device, c), '{}') from (select device, count(*)::int c from L group by 1) s),
      'by_browser', (select coalesce(jsonb_object_agg(browser, c), '{}') from (select browser, count(*)::int c from L group by 1) s),
      'by_kind', (select coalesce(jsonb_object_agg(kind, c), '{}') from (select kind, count(*)::int c from L group by 1) s),
      'new_users', (select count(*) from first_seen where fa >= f and fa < t)::int,
      'returning_users', (select count(distinct L.principal) from L join first_seen fs on fs.principal = L.principal and fs.fa < f)::int,
      'upload_bytes', (select coalesce(sum(bytes), 0) from L where kind = 'upload')::bigint,
      'top_sections', (select coalesce(jsonb_agg(jsonb_build_object('section_id', s.section_id, 'title', s.title, 'hits', x.c, 'users', x.u) order by x.c desc, s.title), '[]')
                         from (select section_id, count(*)::int c, count(distinct principal)::int u from L where section_id is not null group by 1 order by 2 desc limit 10) x join lms_section s on s.tenant_id = tid and s.section_id = x.section_id),
      'term_board', (select coalesce(jsonb_agg(jsonb_build_object('term_id', tm.term_id, 'name', tm.name, 'operating', tm.is_operating,
                        'sections', (select count(*) from lms_section s where s.tenant_id = tid and s.term_id = tm.term_id)::int,
                        'enrollments', (select count(*) from lms_enrollment e join lms_section s on s.tenant_id = e.tenant_id and s.section_id = e.section_id where e.tenant_id = tid and s.term_id = tm.term_id and e.status = 'enrolled')::int,
                        'attendance_rate', (select round(100.0 * count(*) filter (where a.status in ('present','late','excused')) / nullif(count(*), 0), 1) from lms_attendance a join lms_session ss on ss.tenant_id = a.tenant_id and ss.session_id = a.session_id join lms_section s on s.tenant_id = ss.tenant_id and s.section_id = ss.section_id where a.tenant_id = tid and s.term_id = tm.term_id))
                        order by tm.starts_on desc), '[]') from lms_term tm where tm.tenant_id = tid)
    ) into out;
    return out;

  -- ── 로그 검색 ──
  elsif op = 'logs' then
    f := coalesce(lmsx_tsq(q, 'from'), now() - interval '7 days'); t := coalesce(lmsx_tsq(q, 'to'), now() + interval '1 second');
    k := lmsx_txt(q, 'kind', 20); v_txt := lmsx_txt(q, 'who', 80);
    if k <> '' and k not in ('login','logout','grade','activity','view','upload','admin') then perform lmsx_err(400, 'bad_input', '로그 종류가 올바르지 않습니다.'); end if;
    n := lmsx_int(q, 'page', 1, 1, 1000);
    select coalesce(jsonb_agg(x order by x->>'at' desc, x->>'src', x->>'what'), '[]') into arr from (
      select * from (
        select jsonb_build_object('at', lmsx_ts(a.at), 'src', 'audit', 'kind', case when a.action like 'login%' then 'login' when a.action like 'logout%' then 'logout' when a.action ~ 'grade' then 'grade' else 'admin' end,
                 'who', coalesce(a.actor, ''), 'what', a.action, 'detail', coalesce(a.detail, '{}'::jsonb), 'ip', '', 'browser', '', 'device', '', 'path', '') x, a.at
          from audit_log a where a.tenant_id = tid and a.at >= f and a.at < t and (v_txt = '' or coalesce(a.actor, '') ilike '%' || v_txt || '%')
           and (k = '' or (k = 'login' and a.action like 'login%') or (k = 'logout' and a.action like 'logout%') or (k = 'grade' and a.action ~ 'grade') or (k = 'admin' and a.action not like 'login%' and a.action !~ 'grade'))
        union all
        select jsonb_build_object('at', lmsx_ts(l.at), 'src', 'access', 'kind', l.kind, 'who', l.principal, 'what', l.kind || case when l.imp_by is not null then ' (전환: ' || l.imp_by || ')' else '' end,
                 'detail', jsonb_build_object('section_id', l.section_id, 'bytes', l.bytes), 'ip', l.ip_masked, 'browser', l.browser, 'device', l.device, 'path', l.path) x, l.at
          from lms_access_log l where l.tenant_id = tid and l.at >= f and l.at < t and (v_txt = '' or l.principal ilike '%' || v_txt || '%')
           and (k = '' or l.kind = k or (k = 'grade' and l.kind = 'grade_change'))
        union all
        select jsonb_build_object('at', lmsx_ts(g.at), 'src', 'grade', 'kind', 'grade', 'who', coalesce(g.by_person::text, ''), 'what', '성적 변경', 'detail', jsonb_build_object('before', g.before, 'after', g.after, 'reason', g.reason, 'section_id', g.section_id), 'ip', '', 'browser', '', 'device', '', 'path', '') x, g.at
          from lms_grade_history g where g.tenant_id = tid and g.at >= f and g.at < t and (k = '' or k = 'grade') and v_txt = ''
      ) u order by u.at desc limit 100 offset (n - 1) * 100) z;
    return jsonb_build_object('items', arr, 'page', n);

  -- ── 팝업 · 배너 ──
  elsif op = 'popup.list' then
    select coalesce(jsonb_agg(lms_m_popup(x) order by x.kind, x.group_key, x.sort, x.title), '[]') into arr from lms_popup x where x.tenant_id = tid;
    return jsonb_build_object('items', arr);

  elsif op = 'popup.save' then
    k := lmsx_txt(q, 'kind', 10, true);
    if k not in ('popup', 'banner') then perform lmsx_err(400, 'bad_input', '종류는 팝업 · 배너입니다.'); end if;
    if jsonb_typeof(coalesce(q->'audience', '[]')) <> 'array' then perform lmsx_err(400, 'bad_input', '대상 형식이 올바르지 않습니다.'); end if;
    select coalesce(array_agg(distinct a order by a), '{}') into mem from jsonb_array_elements_text(coalesce(q->'audience', '["student","professor","staff","external","admin"]')) a;
    if cardinality(mem) = 0 or not mem <@ array['student','professor','staff','external','admin'] then perform lmsx_err(400, 'bad_input', '대상은 학생 · 교수 · 직원 · 외부 · 관리자 중에서 고릅니다.'); end if;
    v_txt := lmsx_txt(q, 'link', 300);
    if v_txt <> '' and v_txt !~ '^(https://|/)' then perform lmsx_err(400, 'bad_input', '링크는 https:// 또는 /로 시작해야 합니다.'); end if;
    f := coalesce(lmsx_tsq(q, 'starts_at'), now()); t := lmsx_tsq(q, 'ends_at');
    if t is not null and t <= f then perform lmsx_err(400, 'bad_input', '게시 종료가 시작보다 앞섭니다.'); end if;
    if coalesce(q->>'id', '') <> '' then
      update lms_popup set kind = k, group_key = lmsx_txt(q, 'group_key', 40), title = lmsx_txt(q, 'title', 80, true), body = lmsx_txt(q, 'body', 2000), link = v_txt, audience = mem, starts_at = f, ends_at = t,
             sort = lmsx_int(q, 'sort', 0, -100, 100), enabled = coalesce((q->>'enabled')::boolean, true) where tenant_id = tid and popup_id = lmsx_uuid(q, 'id') returning * into px;
      if not found then perform lmsx_err(404, 'not_found', '없는 팝업 · 배너입니다.'); end if;
    else
      insert into lms_popup (tenant_id, kind, group_key, title, body, link, audience, starts_at, ends_at, sort, enabled)
      values (tid, k, lmsx_txt(q, 'group_key', 40), lmsx_txt(q, 'title', 80, true), lmsx_txt(q, 'body', 2000), v_txt, mem, f, t, lmsx_int(q, 'sort', 0, -100, 100), coalesce((q->>'enabled')::boolean, true)) returning * into px;
    end if;
    perform lmsx_audit(me, 'lms.popup.save', jsonb_build_object('kind', k));
    return jsonb_build_object('ok', true, 'item', lms_m_popup(px));

  elsif op = 'popup.del' then
    delete from lms_popup where tenant_id = tid and popup_id = lmsx_uuid(q, 'id');
    get diagnostics n = row_count; if n = 0 then perform lmsx_err(404, 'not_found', '없는 팝업 · 배너입니다.'); end if;
    return jsonb_build_object('ok', true);

  elsif op = 'popup.preview' then
    -- 사용자 유형별 노출: 배너는 목록, 팝업은 그룹별로 묶어 한 창(여러 장 넘겨 보기)
    k := coalesce(nullif(lmsx_txt(q, 'audience', 20), ''), 'student');
    if k not in ('student','professor','staff','external','admin') then perform lmsx_err(400, 'bad_input', '대상 유형이 올바르지 않습니다.'); end if;
    select coalesce(jsonb_agg(lms_m_popup(x) order by x.sort, x.title), '[]') into arr from lms_popup x
     where x.tenant_id = tid and x.enabled and x.kind = 'banner' and k = any(x.audience) and x.starts_at <= now() and (x.ends_at is null or x.ends_at > now());
    select coalesce(jsonb_agg(jsonb_build_object('group', g, 'slides', s) order by g), '[]') into out from (
      select case when x.group_key = '' then x.popup_id::text else x.group_key end g, jsonb_agg(lms_m_popup(x) order by x.sort, x.title) s from lms_popup x
       where x.tenant_id = tid and x.enabled and x.kind = 'popup' and k = any(x.audience) and x.starts_at <= now() and (x.ends_at is null or x.ends_at > now()) group by 1) z;
    return jsonb_build_object('audience', k, 'banners', arr, 'popups', out);

  -- ── 시스템 모니터링 ──
  elsif op = 'mon.th' then
    perform lms_m_th_seed();
    select coalesce(jsonb_object_agg(metric, jsonb_build_object('warn', warn, 'crit', crit)), '{}') into out from lms_mon_threshold where tenant_id = tid;
    return jsonb_build_object('thresholds', out);

  elsif op = 'mon.th_save' then
    perform lms_m_th_seed();
    k := lmsx_txt(q, 'metric', 20, true);
    if k not in ('cpu_load','mem_pct','disk_pct','heap_pct','sis_fail') then perform lmsx_err(400, 'bad_input', '지표가 올바르지 않습니다.'); end if;
    if coalesce(q->>'warn', '') !~ '^\d{1,4}(\.\d+)?$' or coalesce(q->>'crit', '') !~ '^\d{1,4}(\.\d+)?$' or (q->>'crit')::numeric < (q->>'warn')::numeric then perform lmsx_err(400, 'bad_input', '임계치는 숫자이고 위험 ≥ 주의여야 합니다.'); end if;
    update lms_mon_threshold set warn = (q->>'warn')::numeric, crit = (q->>'crit')::numeric where tenant_id = tid and metric = k;
    perform lmsx_audit(me, 'lms.mon.threshold', jsonb_build_object('metric', k, 'warn', q->>'warn', 'crit', q->>'crit'));
    return lms_m('mon.th', me, q);

  elsif op = 'mon.sample' then
    -- q.metrics는 앱 계층(Node os · fs.statfs / Java OperatingSystemMXBean · File)이 채운다
    perform lms_m_th_seed();
    out := coalesce(q->'metrics', '{}');
    out := jsonb_build_object(
      'cpu_load', round(coalesce((out->>'load1')::numeric, 0) / greatest(coalesce((out->>'cpus')::numeric, 1), 1) * 100, 1),
      'mem_pct', round(100 - coalesce((out->>'mem_free')::numeric, 0) * 100 / greatest(coalesce((out->>'mem_total')::numeric, 1), 1), 1),
      'disk_pct', round(100 - coalesce((out->>'disk_free')::numeric, 0) * 100 / greatest(coalesce((out->>'disk_total')::numeric, 1), 1), 1),
      'heap_pct', round(coalesce((out->>'heap_used')::numeric, 0) * 100 / greatest(coalesce((out->>'heap_max')::numeric, 1), 1), 1),
      'sis_fail', (select count(*) from lms_sis_sync_run where tenant_id = tid and started_at > now() - interval '24 hours' and jsonb_array_length(errors) > 0)::int,
      'load', jsonb_build_array(coalesce((out->>'load1')::numeric, 0), coalesce((out->>'load5')::numeric, 0), coalesce((out->>'load15')::numeric, 0)),
      'cpus', coalesce((out->>'cpus')::int, 1), 'mem_total', coalesce((out->>'mem_total')::bigint, 0), 'disk_total', coalesce((out->>'disk_total')::bigint, 0),
      'uptime', coalesce((out->>'uptime')::bigint, 0), 'runtime', coalesce(out->>'runtime', ''));
    select coalesce(jsonb_agg(jsonb_build_object('metric', th.metric, 'value', (out->>th.metric)::numeric, 'level', case when (out->>th.metric)::numeric >= th.crit then 'crit' else 'warn' end, 'warn', th.warn, 'crit', th.crit) order by th.metric), '[]') into arr
      from lms_mon_threshold th where th.tenant_id = tid and (out->>th.metric)::numeric >= th.warn;
    k := case when exists (select 1 from jsonb_array_elements(arr) a where a->>'level' = 'crit') then 'crit' when jsonb_array_length(arr) > 0 then 'warn' else 'ok' end;
    insert into lms_mon_sample (tenant_id, node, vals, level, alerts) values (tid, coalesce(out->>'runtime', ''), out, k, arr);
    delete from lms_mon_sample where tenant_id = tid and at < now() - interval '7 days';
    -- 위험이면 관리자 SMS 통지 대기열(실발송은 연동 후, 30분에 한 번)
    if k = 'crit' then perform lms_l_enqueue('role:admin', 'sms', '[시스템 위험] ' || (select string_agg(a->>'metric', ', ') from jsonb_array_elements(arr) a where a->>'level' = 'crit'), '모니터링 임계치 초과', 'mon:' || to_char(now() at time zone 'Asia/Seoul', 'YYYYMMDDHH24') || ':' || (extract(minute from now())::int / 30)); end if;
    return jsonb_build_object('level', k, 'values', out, 'alerts', arr);

  elsif op = 'mon.history' then
    select coalesce(jsonb_agg(jsonb_build_object('at', lmsx_ts(s.at), 'level', s.level, 'cpu_load', s.vals->'cpu_load', 'mem_pct', s.vals->'mem_pct', 'disk_pct', s.vals->'disk_pct', 'heap_pct', s.vals->'heap_pct') order by s.id desc), '[]') into arr
      from (select * from lms_mon_sample where tenant_id = tid order by id desc limit 60) s;
    return jsonb_build_object('items', arr, 'sis_runs', (select coalesce(jsonb_agg(jsonb_build_object('scope', scope, 'at', lmsx_ts(started_at), 'errors', jsonb_array_length(errors)) order by run_id desc), '[]') from (select * from lms_sis_sync_run where tenant_id = tid order by run_id desc limit 10) z));
  end if;
  perform lmsx_err(404, 'not_found', '없는 주소입니다.');
  return null;
end $$;
