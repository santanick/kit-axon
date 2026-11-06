-- v30 묶음 B — 강의실 구성(주차 · 차시 · 학습자원 · SCORM · 조건부/순차/수준별/적응형 · 템플릿 · 복사 · 백업 · 휴지통 · 버전 · 공유 · 역할/메뉴)
-- 업무 규칙은 SQL 함수(lms_b_api)에 한 번만 두고 Node(mod-b.js) · Java(lms.b)가 같은 함수를 불러 같은 JSON을 돌려준다.
-- 오류는 SQLSTATE 'DD<상태>' + message(한국어) + hint(오류 코드)로 올리고, 두 서버가 {error, message}로 바꾼다.
-- 함수는 모두 set timezone = 'UTC'(두 서버의 세션 시간대가 달라도 시각 문자열이 같게).

-- ── 표 ──────────────────────────────────────────────
alter table lms_session add column if not exists title text not null default '';
alter table lms_session add column if not exists prereq uuid[] not null default '{}';   -- 선후 관계: 먼저 마쳐야 하는 차시

create table if not exists lms_b_week (
  tenant_id text not null, section_id uuid not null, week_no smallint not null,
  title text not null default '', starts_on date, ends_on date, summary text not null default '',
  plan jsonb not null default '{}',                      -- 수업계획서 주차 계획(학사 원천 또는 수동)
  primary key (tenant_id, section_id, week_no),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_b_opt (
  tenant_id text not null, section_id uuid not null,
  template text, sequential boolean not null default false,
  adaptive jsonb not null default '[]',                 -- [{if_res, below, then:[res], else:[res]}]
  menu jsonb not null default '[]',                     -- 강의실 메뉴 모듈 [{id, on}]
  updated_at timestamptz not null default now(),
  primary key (tenant_id, section_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_b_file (
  tenant_id text not null, file_id uuid not null default gen_random_uuid(), section_id uuid not null,
  name text not null, mime text not null, size int not null, data bytea not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, file_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_b_resource (
  tenant_id text not null, res_id uuid not null default gen_random_uuid(), section_id uuid not null, session_id uuid,
  kind text not null check (kind in ('file','url','page','folder','label','video','scorm','html5')),
  title text not null, body jsonb not null default '{}', visible boolean not null default true, sort int not null default 0,
  ver int not null default 1, completion jsonb not null default '{}', access jsonb not null default '{}',
  share text not null default 'private' check (share in ('private','shared')), origin_id uuid,
  owner_label text, created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, deleted_by text,
  primary key (tenant_id, res_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade,
  foreign key (tenant_id, session_id) references lms_session (tenant_id, session_id) on delete set null (session_id)
);
create index if not exists lms_b_res_sec on lms_b_resource (tenant_id, section_id, deleted_at);
create table if not exists lms_b_res_ver (
  tenant_id text not null, res_id uuid not null, ver int not null, snap jsonb not null, by_label text, at timestamptz not null default now(),
  primary key (tenant_id, res_id, ver),
  foreign key (tenant_id, res_id) references lms_b_resource (tenant_id, res_id) on delete cascade
);
create table if not exists lms_b_history (
  tenant_id text not null, id bigserial, section_id uuid not null, obj text not null, obj_id text not null,
  action text not null, snap jsonb, by_label text, at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists lms_b_hist_sec on lms_b_history (tenant_id, section_id, at desc);
create table if not exists lms_b_progress (
  tenant_id text not null, res_id uuid not null, person_id uuid not null,
  status text not null check (status in ('in_progress','completed','passed','failed')),
  score numeric(7,2), time_sec int not null default 0, views int not null default 0, updated_at timestamptz not null default now(),
  primary key (tenant_id, res_id, person_id),
  foreign key (tenant_id, res_id) references lms_b_resource (tenant_id, res_id) on delete cascade,
  foreign key (tenant_id, person_id) references lms_person (tenant_id, person_id)
);
create table if not exists lms_b_level (
  tenant_id text not null, section_id uuid not null, person_id uuid not null,
  level text not null check (level in ('basic','standard','advanced')), set_by text, at timestamptz not null default now(),
  primary key (tenant_id, section_id, person_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_b_template (
  tenant_id text not null, tpl_id uuid not null default gen_random_uuid(), name text not null,
  mode text not null default 'personal', data jsonb not null, by_label text, created_at timestamptz not null default now(),
  primary key (tenant_id, tpl_id)
);
create table if not exists lms_b_backup (
  tenant_id text not null, backup_id uuid not null default gen_random_uuid(), section_id uuid not null,
  parts text[] not null, data jsonb not null, bytes int not null, note text not null default '', by_label text,
  created_at timestamptz not null default now(),
  primary key (tenant_id, backup_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_b_role_perm (
  tenant_id text not null, role text not null check (role in ('professor','ta','staff','grader','student')),
  perm text not null, allowed boolean not null, primary key (tenant_id, role, perm)
);
create table if not exists lms_b_menu_pref (
  tenant_id text not null, section_id uuid not null, who text not null, hidden text[] not null default '{}', ord text[] not null default '{}',
  primary key (tenant_id, section_id, who),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_b_pkg (
  tenant_id text not null, pkg_id uuid not null default gen_random_uuid(), res_id uuid not null,
  version text not null check (version in ('1.2','2004','none')), manifest jsonb not null, bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  primary key (tenant_id, pkg_id),
  foreign key (tenant_id, res_id) references lms_b_resource (tenant_id, res_id) on delete cascade
);
create table if not exists lms_b_pkg_file (
  tenant_id text not null, pkg_id uuid not null, path text not null, mime text not null, data bytea not null,
  primary key (tenant_id, pkg_id, path),
  foreign key (tenant_id, pkg_id) references lms_b_pkg (tenant_id, pkg_id) on delete cascade
);
create table if not exists lms_b_scorm_att (
  tenant_id text not null, res_id uuid not null, who text not null, person_id uuid, sco text not null,
  cmi jsonb not null default '{}', status text, success text, score numeric(7,2), total_sec numeric(12,2) not null default 0,
  sessions int not null default 0, updated_at timestamptz not null default now(),
  primary key (tenant_id, res_id, who, sco),
  foreign key (tenant_id, res_id) references lms_b_resource (tenant_id, res_id) on delete cascade
);

do $$ declare t text; begin
  foreach t in array array['lms_b_week','lms_b_opt','lms_b_file','lms_b_resource','lms_b_res_ver','lms_b_history','lms_b_progress','lms_b_level','lms_b_template','lms_b_backup','lms_b_role_perm','lms_b_menu_pref','lms_b_pkg','lms_b_pkg_file','lms_b_scorm_att'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_b_history_id_seq to didisam_tenant;
end $$;

-- ── 공통 도우미(B · C · D 공용) ─────────────────────────
create or replace function lmsb_tid() returns text language sql stable as $$ select current_setting('app.tenant', true) $$;
create or replace function lmsb_err(st int, code text, msg text) returns void language plpgsql as $$
begin raise exception using errcode = 'DD' || st::text, message = msg, hint = code; end $$;
create or replace function lmsb_uuid(v text) returns uuid language sql immutable as $$
  select case when v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v::uuid end $$;
-- 문자열 인자: 앞뒤 공백 제거, 최대 길이, 필수 여부
create or replace function lmsb_t(p jsonb, k text, mx int default 200, req boolean default false, lab text default null) returns text language plpgsql as $$
declare v text := btrim(coalesce(case when jsonb_typeof(p->k) in ('object','array') then (p->k)::text else p->>k end, ''));
begin
  if req and v = '' then perform lmsb_err(400, 'input', format('%s을(를) 입력하세요.', coalesce(lab, k))); end if;
  if length(v) > mx then perform lmsb_err(400, 'input', format('%s은(는) %s자 이내로 입력하세요.', coalesce(lab, k), mx)); end if;
  return v;
end $$;
create or replace function lmsb_i(p jsonb, k text, lo numeric, hi numeric, def numeric) returns numeric language plpgsql as $$
declare v text := btrim(coalesce(p->>k, '')); n numeric;
begin
  if v = '' then return def; end if;
  begin n := v::numeric; exception when others then perform lmsb_err(400, 'input', format('%s은(는) 숫자로 입력하세요.', k)); end;
  if n < lo or n > hi then perform lmsb_err(400, 'input', format('%s은(는) %s~%s 사이로 입력하세요.', k, lo, hi)); end if;
  return n;
end $$;
create or replace function lmsb_bool(p jsonb, k text, def boolean) returns boolean language sql immutable as $$
  select case when p->k is null or jsonb_typeof(p->k) = 'null' then def when jsonb_typeof(p->k) = 'boolean' then (p->k)::text = 'true' else lower(p->>k) in ('1','true','y','on') end $$;
create or replace function lmsb_date(p jsonb, k text) returns date language plpgsql as $$
declare v text := btrim(coalesce(p->>k, ''));
begin
  if v = '' then return null; end if;
  if v !~ '^\d{4}-\d{2}-\d{2}$' then perform lmsb_err(400, 'input', format('%s 날짜 형식(YYYY-MM-DD)을 확인하세요.', k)); end if;
  begin return v::date; exception when others then perform lmsb_err(400, 'input', format('%s 날짜를 확인하세요.', k)); end;
end $$;
create or replace function lmsb_tstz(p jsonb, k text) returns timestamptz language plpgsql as $$
declare v text := btrim(coalesce(p->>k, ''));
begin
  if v = '' then return null; end if;
  if v !~ '^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$' then perform lmsb_err(400, 'input', format('%s 일시 형식을 확인하세요.', k)); end if;
  begin return (case when v ~ '(Z|[+-]\d{2}:?\d{2})$' then v else v || '+09:00' end)::timestamptz; exception when others then perform lmsb_err(400, 'input', format('%s 일시를 확인하세요.', k)); end;
end $$;
create or replace function lmsb_id(p jsonb, k text, lab text default '대상') returns uuid language plpgsql as $$
declare u uuid := lmsb_uuid(p->>k);
begin if u is null then perform lmsb_err(400, 'input', format('%s을(를) 지정하세요.', lab)); end if; return u; end $$;
create or replace function lmsb_ids(p jsonb, k text) returns uuid[] language sql immutable as $$
  select coalesce(array_agg(lmsb_uuid(x)) filter (where lmsb_uuid(x) is not null), '{}') from jsonb_array_elements_text(case when jsonb_typeof(p->k) = 'array' then p->k else '[]' end) x $$;
create or replace function lmsb_sec(p jsonb) returns uuid language plpgsql as $$
declare u uuid := lmsb_uuid(p->>'section');
begin
  if u is null or not exists (select 1 from lms_section where tenant_id = lmsb_tid() and section_id = u) then perform lmsb_err(404, 'section', '강의실(분반)을 찾을 수 없습니다.'); end if;
  return u;
end $$;
-- 행위자: 스튜디오 운영자(정 · 부운영자 = admin, 교수자 계정 = professor) 또는 학번 전환(as, SSO 연동 후에는 SSO 신원으로 고정)
create or replace function lmsb_actor(sec uuid, p jsonb, x jsonb) returns jsonb language plpgsql as $$
declare no text := nullif(btrim(coalesce(p->>'as', '')), ''); pr record; r text;
begin
  -- 학습자 포털 세션: 학번(또는 간편가입 계정의 학번)으로 고정 — as로 다른 사람이 될 수 없다
  if x->>'kind' = 'learner' then
    no := coalesce((select member_no from lms_person where tenant_id = lmsb_tid() and member_no = x->>'sid'),
      (select la.student_no from learner_accounts la where la.tenant_id = lmsb_tid() and lmsb_uuid(x->>'sid') is not null and la.learner_id = lmsb_uuid(x->>'sid')));
    if no is null then perform lmsb_err(403, 'person', '학사 정보에 등록된 학번이 아닙니다. 학교 학사 담당 부서에 문의하세요.'); end if;
  end if;
  if no is null then
    return jsonb_build_object('pid', null, 'no', null, 'role', case when x->>'role' = 'teacher' then 'professor' else 'admin' end,
      'label', case x->>'role' when 'owner' then '정운영자' when 'sub' then '부운영자' else '교수자' end, 'uid', x->>'uid');
  end if;
  select person_id, member_no, kind into pr from lms_person where tenant_id = lmsb_tid() and member_no = no;
  if not found then perform lmsb_err(404, 'person', '해당 학번(사번)의 구성원이 없습니다.'); end if;
  if sec is null then r := case pr.kind when 'student' then 'student' when 'professor' then 'professor' else 'staff' end;
  else
    select case min(case role when 'professor' then 1 when 'co_professor' then 1 when 'ta' then 2 when 'grader' then 3 else 4 end)
      when 1 then 'professor' when 2 then 'ta' when 3 then 'grader' when 4 then 'staff' end into r
      from lms_section_staff where tenant_id = lmsb_tid() and section_id = sec and person_id = pr.person_id;
    if r is null then
      if exists (select 1 from lms_enrollment where tenant_id = lmsb_tid() and section_id = sec and person_id = pr.person_id and status = 'enrolled') then r := 'student';
      elsif pr.kind = 'staff' then r := 'staff';
      else perform lmsb_err(403, 'member', '이 강의실의 구성원이 아닙니다.'); end if;
    end if;
  end if;
  return jsonb_build_object('pid', pr.person_id, 'no', pr.member_no, 'role', r, 'label', pr.member_no, 'uid', x->>'uid');
end $$;
create or replace function lmsb_who(a jsonb) returns text language sql immutable as $$ select coalesce(a->>'pid', 'uid:' || coalesce(a->>'uid', '-')) $$;
create or replace function lmsb_perms() returns text[] language sql immutable as $$
  select array['course.view','structure.edit','resource.edit','resource.share','backup','trash','menu.edit','perm.manage','activity.manage','activity.join','grade','board.manage','board.write'] $$;
create or replace function lmsb_perm_default(role text, perm text) returns boolean language sql immutable as $$
  select case role when 'admin' then true
    when 'professor' then perm <> 'perm.manage'
    when 'staff' then perm in ('course.view','structure.edit','resource.edit','resource.share','backup','trash','menu.edit','perm.manage','activity.manage','board.manage','board.write')
    when 'ta' then perm in ('course.view','structure.edit','resource.edit','trash','activity.manage','activity.join','grade','board.manage','board.write')
    when 'grader' then perm in ('course.view','grade','board.write','activity.join')
    when 'student' then perm in ('course.view','activity.join','board.write')
    else false end $$;
create or replace function lmsb_can(a jsonb, perm text) returns boolean language sql stable as $$
  select a->>'role' = 'admin' or coalesce((select allowed from lms_b_role_perm where tenant_id = lmsb_tid() and role = a->>'role' and lms_b_role_perm.perm = lmsb_can.perm), lmsb_perm_default(a->>'role', perm)) $$;
create or replace function lmsb_need(a jsonb, perm text) returns void language plpgsql as $$
begin
  if not lmsb_can(a, perm) then perform lmsb_err(403, 'role', format('이 작업을 할 권한이 없습니다(%s · %s).', lmsb_role_name(a->>'role'), perm)); end if;
end $$;
create or replace function lmsb_role_name(r text) returns text language sql immutable as $$
  select case r when 'admin' then '운영자' when 'professor' then '교수' when 'ta' then '조교' when 'staff' then '교직원' when 'grader' then '채점자' when 'student' then '학생' else r end $$;
create or replace function lmsb_mgr(a jsonb) returns boolean language sql immutable as $$ select a->>'role' in ('admin','professor','ta','staff') $$;
create or replace function lmsb_hist(sec uuid, obj text, oid text, act text, snap jsonb, a jsonb) returns void language sql as $$
  insert into lms_b_history (tenant_id, section_id, obj, obj_id, action, snap, by_label) values (lmsb_tid(), sec, obj, oid, act, snap, a->>'label') $$;

-- ── 자원 JSON · 접근 판정 ─────────────────────────────
create or replace function lmsb_res_json(r lms_b_resource) returns jsonb language sql immutable as $$
  select jsonb_build_object('id', r.res_id, 'session_id', r.session_id, 'kind', r.kind, 'title', r.title, 'body', r.body, 'visible', r.visible,
    'sort', r.sort, 'ver', r.ver, 'completion', r.completion, 'access', r.access, 'share', r.share, 'origin_id', r.origin_id,
    'owner', r.owner_label, 'updated_at', r.updated_at, 'deleted_at', r.deleted_at) $$;
-- 학습자 한 명의 자원별 열림 · 완료 판정(조건부 · 수준별 · 순차 · 차시 선후)
create or replace function lmsb_access(sec uuid, pid uuid) returns table (res_id uuid, open boolean, why text, done boolean, status text, score numeric) language plpgsql as $$
declare
  seqon boolean := coalesce((select o.sequential from lms_b_opt o where o.tenant_id = lmsb_tid() and o.section_id = sec), false);
  lvl text := (select l.level from lms_b_level l where l.tenant_id = lmsb_tid() and l.section_id = sec and l.person_id = pid);
  pm jsonb; sm jsonb; prev_ok boolean := true; r record; o boolean; w text; d boolean; x text; lv jsonb; ps uuid;
begin
  select coalesce(jsonb_object_agg(g.res_id::text, jsonb_build_object('st', g.status, 'sc', g.score)), '{}') into pm
    from lms_b_progress g join lms_b_resource rr on rr.tenant_id = g.tenant_id and rr.res_id = g.res_id where g.tenant_id = lmsb_tid() and rr.section_id = sec and g.person_id = pid;
  -- 차시별 완료 여부(완료 조건이 있는 자원을 모두 마쳤는가)
  select coalesce(jsonb_object_agg(q.session_id::text, q.ok), '{}') into sm from (
    select rr.session_id, bool_and(coalesce(pm->rr.res_id::text->>'st', '') in ('completed','passed')) ok
    from lms_b_resource rr where rr.tenant_id = lmsb_tid() and rr.section_id = sec and rr.deleted_at is null and rr.visible and rr.session_id is not null and rr.completion ? 'type'
    group by rr.session_id) q;
  for r in select rr.*, s.prereq, coalesce(s.week_no, 0) wk, coalesce(s.seq, 0) sq from lms_b_resource rr left join lms_session s on s.tenant_id = rr.tenant_id and s.session_id = rr.session_id
    where rr.tenant_id = lmsb_tid() and rr.section_id = sec and rr.deleted_at is null order by coalesce(s.week_no, 0), coalesce(s.seq, 0), rr.sort, rr.created_at loop
    o := r.visible; w := case when r.visible then null else '비공개 자원입니다.' end;
    d := coalesce(pm->r.res_id::text->>'st', '') in ('completed','passed');
    if o and r.access ? 'from' and now() < (r.access->>'from')::timestamptz then o := false; w := '공개 전입니다(' || (r.access->>'from') || ').'; end if;
    if o and r.access ? 'until' and now() > (r.access->>'until')::timestamptz then o := false; w := '이용 기간이 끝났습니다.'; end if;
    if o and jsonb_typeof(r.access->'after') = 'array' then
      for x in select jsonb_array_elements_text(r.access->'after') loop
        if coalesce(pm->x->>'st', '') not in ('completed','passed') and exists (select 1 from lms_b_resource z where z.tenant_id = lmsb_tid() and z.res_id = lmsb_uuid(x) and z.deleted_at is null) then
          o := false; w := '이수 조건: 「' || coalesce((select z.title from lms_b_resource z where z.tenant_id = lmsb_tid() and z.res_id = lmsb_uuid(x)), '?') || '」을(를) 먼저 완료하세요.'; exit; end if;
      end loop;
    end if;
    if o and jsonb_typeof(r.access->'min_score') = 'object' and coalesce((pm->(r.access->'min_score'->>'res')->>'sc')::numeric, -1) < coalesce((r.access->'min_score'->>'score')::numeric, 0) then
      o := false; w := '점수 조건: 「' || coalesce((select z.title from lms_b_resource z where z.tenant_id = lmsb_tid() and z.res_id = lmsb_uuid(r.access->'min_score'->>'res')), '?') || '」 ' || (r.access->'min_score'->>'score') || '점 이상이 필요합니다.'; end if;
    lv := r.access->'levels';
    if o and jsonb_typeof(lv) = 'array' and jsonb_array_length(lv) > 0 and not (lv ? coalesce(lvl, 'standard')) then o := false; w := '수준별 학습: 다른 수준(' || (select string_agg(case e when 'basic' then '기초' when 'standard' then '표준' else '심화' end, '·') from jsonb_array_elements_text(lv) e) || ') 대상 자원입니다.'; end if;
    if o and r.prereq is not null then
      foreach ps in array r.prereq loop
        if coalesce((sm->>ps::text)::boolean, true) = false then o := false; w := '선수 차시를 먼저 마치세요.'; exit; end if;
      end loop;
    end if;
    if o and seqon and not prev_ok then o := false; w := '순차 학습: 앞 순서의 자원을 먼저 완료하세요.'; end if;
    if r.visible and r.completion ? 'type' and not d then prev_ok := false; end if;
    res_id := r.res_id; open := o; why := w; done := d; status := pm->r.res_id::text->>'st'; score := (pm->r.res_id::text->>'sc')::numeric;
    return next;
  end loop;
end $$;

-- ── 구조 내보내기 · 가져오기(템플릿 · 복사 · 백업 공용) ──────────
create or replace function lmsb_export(sec uuid, parts text[]) returns jsonb language plpgsql as $$
declare o jsonb := jsonb_build_object('format', 'didisam-lms-course', 'v', 1, 'parts', to_jsonb(parts),
  'term_start', (select t.starts_on from lms_section s join lms_term t on t.tenant_id = s.tenant_id and t.term_id = s.term_id where s.tenant_id = lmsb_tid() and s.section_id = sec));
begin
  if 'structure' = any(parts) then
    o := o || jsonb_build_object(
      'weeks', coalesce((select jsonb_agg(jsonb_build_object('week_no', w.week_no, 'title', w.title, 'starts_on', w.starts_on, 'ends_on', w.ends_on, 'summary', w.summary, 'plan', w.plan) order by w.week_no) from lms_b_week w where w.tenant_id = lmsb_tid() and w.section_id = sec), '[]'),
      'sessions', coalesce((select jsonb_agg(jsonb_build_object('key', s.session_id, 'week_no', s.week_no, 'seq', s.seq, 'title', s.title, 'kind', s.kind, 'starts_at', s.starts_at, 'ends_at', s.ends_at, 'open_at', s.open_at, 'close_at', s.close_at, 'required_sec', s.required_sec, 'prereq', to_jsonb(s.prereq)) order by s.week_no, s.seq) from lms_session s where s.tenant_id = lmsb_tid() and s.section_id = sec), '[]'),
      'opt', coalesce((select jsonb_build_object('sequential', x.sequential, 'adaptive', x.adaptive, 'menu', x.menu, 'template', x.template) from lms_b_opt x where x.tenant_id = lmsb_tid() and x.section_id = sec), '{}'));
  end if;
  if 'resources' = any(parts) then
    o := o || jsonb_build_object('resources', coalesce((select jsonb_agg(jsonb_build_object('key', r.res_id, 'session_key', r.session_id, 'kind', r.kind, 'title', r.title, 'body', r.body, 'visible', r.visible, 'sort', r.sort, 'completion', r.completion, 'access', r.access, 'share', r.share) order by r.created_at)
      from lms_b_resource r where r.tenant_id = lmsb_tid() and r.section_id = sec and r.deleted_at is null), '[]'));
  end if;
  if 'activities' = any(parts) then o := o || jsonb_build_object('activities', lmsc_export(sec)); end if;
  if 'boards' = any(parts) then o := o || jsonb_build_object('boards', lmsd_export(sec)); end if;
  return o;
end $$;

-- 가져오기: 주차 · 차시는 (주차, 차시) 기준 덮어쓰기(출석 기록 보존), 자원은 replace면 기존 것을 휴지통으로 보낸 뒤 새로 넣는다
create or replace function lmsb_import(sec uuid, d jsonb, parts text[], repl boolean, shift int, a jsonb) returns jsonb language plpgsql as $$
declare smap jsonb := '{}'; rmap jsonb := '{}'; e jsonb; nid uuid; n_w int := 0; n_s int := 0; n_r int := 0; iv interval := make_interval(days => coalesce(shift, 0)); fix jsonb; k text; v text;
begin
  if d->>'format' is distinct from 'didisam-lms-course' then perform lmsb_err(400, 'format', '디디쌤 강좌 백업 형식이 아닙니다.'); end if;
  if 'structure' = any(parts) and jsonb_typeof(d->'weeks') = 'array' then
    for e in select * from jsonb_array_elements(d->'weeks') loop
      insert into lms_b_week (tenant_id, section_id, week_no, title, starts_on, ends_on, summary, plan)
      values (lmsb_tid(), sec, (e->>'week_no')::int, left(coalesce(e->>'title', ''), 200), (e->>'starts_on')::date + coalesce(shift, 0), (e->>'ends_on')::date + coalesce(shift, 0), left(coalesce(e->>'summary', ''), 4000), coalesce(e->'plan', '{}'))
      on conflict (tenant_id, section_id, week_no) do update set title = excluded.title, starts_on = excluded.starts_on, ends_on = excluded.ends_on, summary = excluded.summary, plan = excluded.plan;
      n_w := n_w + 1;
    end loop;
    for e in select * from jsonb_array_elements(coalesce(d->'sessions', '[]')) loop
      insert into lms_session (tenant_id, section_id, week_no, seq, kind, title, starts_at, ends_at, open_at, close_at, required_sec)
      values (lmsb_tid(), sec, (e->>'week_no')::int, coalesce((e->>'seq')::int, 1), coalesce(e->>'kind', 'class'), left(coalesce(e->>'title', ''), 200),
        (e->>'starts_at')::timestamptz + iv, (e->>'ends_at')::timestamptz + iv, (e->>'open_at')::timestamptz + iv, (e->>'close_at')::timestamptz + iv, coalesce((e->>'required_sec')::int, 0))
      on conflict (tenant_id, section_id, week_no, seq) do update set kind = excluded.kind, title = excluded.title, starts_at = excluded.starts_at, ends_at = excluded.ends_at, open_at = excluded.open_at, close_at = excluded.close_at, required_sec = excluded.required_sec
      returning session_id into nid;
      if e ? 'key' then smap := smap || jsonb_build_object(e->>'key', nid); end if;
      n_s := n_s + 1;
    end loop;
    -- 선후 관계 키 다시 잇기
    for e in select * from jsonb_array_elements(coalesce(d->'sessions', '[]')) loop
      if jsonb_typeof(e->'prereq') = 'array' and jsonb_array_length(e->'prereq') > 0 then
        update lms_session set prereq = (select coalesce(array_agg((smap->>p)::uuid) filter (where smap ? p), '{}') from jsonb_array_elements_text(e->'prereq') p)
        where tenant_id = lmsb_tid() and section_id = sec and week_no = (e->>'week_no')::int and seq = coalesce((e->>'seq')::int, 1);
      end if;
    end loop;
    if jsonb_typeof(d->'opt') = 'object' and d->'opt' <> '{}' then
      insert into lms_b_opt (tenant_id, section_id, template, sequential, adaptive, menu) values (lmsb_tid(), sec, d->'opt'->>'template', coalesce((d->'opt'->>'sequential')::boolean, false), coalesce(d->'opt'->'adaptive', '[]'), coalesce(d->'opt'->'menu', '[]'))
      on conflict (tenant_id, section_id) do update set template = excluded.template, sequential = excluded.sequential, adaptive = excluded.adaptive, menu = excluded.menu, updated_at = now();
    end if;
  end if;
  if 'resources' = any(parts) and jsonb_typeof(d->'resources') = 'array' then
    if repl then
      update lms_b_resource set deleted_at = now(), deleted_by = a->>'label' where tenant_id = lmsb_tid() and section_id = sec and deleted_at is null;
    end if;
    for e in select * from jsonb_array_elements(d->'resources') loop
      insert into lms_b_resource (tenant_id, section_id, session_id, kind, title, body, visible, sort, completion, access, share, owner_label)
      values (lmsb_tid(), sec, case when smap ? (e->>'session_key') then (smap->>(e->>'session_key'))::uuid
                                    when lmsb_uuid(e->>'session_key') is not null and exists (select 1 from lms_session s where s.tenant_id = lmsb_tid() and s.section_id = sec and s.session_id = lmsb_uuid(e->>'session_key')) then lmsb_uuid(e->>'session_key') end,
        e->>'kind', left(coalesce(e->>'title', ''), 200), coalesce(e->'body', '{}'), coalesce((e->>'visible')::boolean, true), coalesce((e->>'sort')::int, 0),
        coalesce(e->'completion', '{}'), coalesce(e->'access', '{}'), coalesce(e->>'share', 'private'), a->>'label')
      returning res_id into nid;
      insert into lms_b_res_ver (tenant_id, res_id, ver, snap, by_label) select lmsb_tid(), nid, 1, lmsb_res_json(r), a->>'label' from lms_b_resource r where r.tenant_id = lmsb_tid() and r.res_id = nid;
      if e ? 'key' then rmap := rmap || jsonb_build_object(e->>'key', nid); end if;
      n_r := n_r + 1;
    end loop;
    -- 접근 조건의 자원 키 다시 잇기 + 기간 이동
    for nid, fix in select r.res_id, r.access from lms_b_resource r where r.tenant_id = lmsb_tid() and r.section_id = sec and r.deleted_at is null and r.access <> '{}' and r.res_id in (select (value #>> '{}')::uuid from jsonb_each(rmap)) loop
      if jsonb_typeof(fix->'after') = 'array' then fix := jsonb_set(fix, '{after}', coalesce((select jsonb_agg(coalesce(rmap->x, to_jsonb(x))) from jsonb_array_elements_text(fix->'after') x), '[]')); end if;
      if jsonb_typeof(fix->'min_score') = 'object' and rmap ? (fix->'min_score'->>'res') then fix := jsonb_set(fix, '{min_score,res}', rmap->(fix->'min_score'->>'res')); end if;
      foreach k in array array['from','until'] loop
        v := fix->>k; if v is not null and coalesce(shift, 0) <> 0 then fix := jsonb_set(fix, array[k], to_jsonb(to_char((v::timestamptz + iv) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))); end if;
      end loop;
      update lms_b_resource set access = fix where tenant_id = lmsb_tid() and res_id = nid;
    end loop;
    -- 적응형 규칙의 자원 키
    update lms_b_opt set adaptive = coalesce((select jsonb_agg(jsonb_build_object('if_res', coalesce(rmap->(q->>'if_res'), q->'if_res'), 'below', q->'below',
        'then', coalesce((select jsonb_agg(coalesce(rmap->t, to_jsonb(t))) from jsonb_array_elements_text(coalesce(q->'then', '[]')) t), '[]'),
        'else', coalesce((select jsonb_agg(coalesce(rmap->t, to_jsonb(t))) from jsonb_array_elements_text(coalesce(q->'else', '[]')) t), '[]'))) from jsonb_array_elements(adaptive) q), '[]')
      where tenant_id = lmsb_tid() and section_id = sec and jsonb_array_length(adaptive) > 0;
  end if;
  if 'activities' = any(parts) and d ? 'activities' then perform lmsc_import(sec, d->'activities', repl, a); end if;
  if 'boards' = any(parts) and d ? 'boards' then perform lmsd_import(sec, d->'boards', repl, a); end if;
  return jsonb_build_object('weeks', n_w, 'sessions', n_s, 'resources', n_r);
end $$;

-- 기본 템플릿(온라인 · 블렌디드 · 오프라인 · 개인 학습형)
create or replace function lmsb_builtin(k text) returns jsonb language plpgsql immutable as $$
declare w int; ws jsonb := '[]'; ss jsonb := '[]'; rs jsonb := '[]'; nweeks int := case k when 'personal' then 6 else 15 end; kk text;
begin
  if k not in ('online','blended','offline','personal') then return null; end if;
  for w in 1..nweeks loop
    ws := ws || jsonb_build_object('week_no', w, 'title', case when k = 'personal' then w || '단계' when w = 8 then '중간고사' when w = 15 then '기말고사' else w || '주차' end, 'summary', '', 'plan', '{}');
    if k = 'online' then
      ss := ss || jsonb_build_object('key', 'w' || w || 's1', 'week_no', w, 'seq', 1, 'title', '강의 영상', 'kind', 'online', 'required_sec', 1500) || jsonb_build_object('key', 'w' || w || 's2', 'week_no', w, 'seq', 2, 'title', '확인 학습', 'kind', 'online', 'required_sec', 600);
      rs := rs || jsonb_build_object('key', 'r' || w || 'a', 'session_key', 'w' || w || 's1', 'kind', 'video', 'title', w || '주차 강의 영상', 'body', jsonb_build_object('url', ''), 'completion', jsonb_build_object('type', 'view'))
               || jsonb_build_object('key', 'r' || w || 'b', 'session_key', 'w' || w || 's2', 'kind', 'page', 'title', w || '주차 정리 노트', 'body', jsonb_build_object('html', '<p>이번 주 핵심 내용을 정리합니다.</p>'), 'completion', jsonb_build_object('type', 'view'));
    elsif k = 'blended' then
      ss := ss || jsonb_build_object('key', 'w' || w || 's1', 'week_no', w, 'seq', 1, 'title', '대면 수업', 'kind', 'class') || jsonb_build_object('key', 'w' || w || 's2', 'week_no', w, 'seq', 2, 'title', '온라인 사전 학습', 'kind', 'online', 'required_sec', 900);
      rs := rs || jsonb_build_object('key', 'r' || w || 'a', 'session_key', 'w' || w || 's2', 'kind', 'video', 'title', w || '주차 사전 학습 영상', 'body', jsonb_build_object('url', ''), 'completion', jsonb_build_object('type', 'view'))
               || jsonb_build_object('key', 'r' || w || 'b', 'session_key', 'w' || w || 's1', 'kind', 'label', 'title', w || '주차 대면 수업 안내', 'body', jsonb_build_object('text', '강의실 · 준비물을 확인하세요.'));
    elsif k = 'offline' then
      ss := ss || jsonb_build_object('key', 'w' || w || 's1', 'week_no', w, 'seq', 1, 'title', '대면 수업', 'kind', 'class');
      rs := rs || jsonb_build_object('key', 'r' || w || 'a', 'session_key', 'w' || w || 's1', 'kind', 'label', 'title', w || '주차 수업 자료', 'body', jsonb_build_object('text', '수업 자료를 올려 주세요.'));
    else
      ss := ss || jsonb_build_object('key', 'w' || w || 's1', 'week_no', w, 'seq', 1, 'title', w || '단계 학습', 'kind', 'online', 'required_sec', 1200);
      rs := rs || jsonb_build_object('key', 'r' || w || 'a', 'session_key', 'w' || w || 's1', 'kind', 'page', 'title', w || '단계 학습 자료', 'body', jsonb_build_object('html', '<p>스스로 학습하고 다음 단계로 넘어갑니다.</p>'), 'completion', jsonb_build_object('type', 'view'));
    end if;
  end loop;
  return jsonb_build_object('format', 'didisam-lms-course', 'v', 1, 'parts', '["structure","resources"]'::jsonb, 'weeks', ws, 'sessions', ss, 'resources', rs,
    'opt', jsonb_build_object('template', k, 'sequential', k = 'personal', 'adaptive', '[]'::jsonb, 'menu', '[]'::jsonb));
end $$;

-- ── SCORM 시간 형식 ───────────────────────────────────
create or replace function lmsb_dur(v text) returns numeric language plpgsql immutable as $$
declare m text[];
begin
  if v is null or v = '' then return 0; end if;
  m := regexp_match(v, '^(\d{1,4}):(\d{2}):(\d{2}(\.\d{1,2})?)$');
  if m is not null then return m[1]::numeric * 3600 + m[2]::numeric * 60 + m[3]::numeric; end if;
  if v ~ '^P' then begin return extract(epoch from v::interval); exception when others then return 0; end; end if;
  return 0;
end $$;
create or replace function lmsb_dur_fmt(s numeric, ver text) returns text language sql immutable as $$
  select case when ver = '1.2' then lpad((floor(s / 3600))::int::text, 4, '0') || ':' || lpad((floor(mod(s, 3600) / 60))::int::text, 2, '0') || ':' || to_char(mod(s, 60), 'FM00.00')
    else 'PT' || floor(s / 3600)::int || 'H' || floor(mod(s, 3600) / 60)::int || 'M' || trim(to_char(mod(s, 60), 'FM990.00')) || 'S' end $$;

-- ── API ──────────────────────────────────────────────
create or replace function lms_b_api(op text, p jsonb, x jsonb) returns jsonb language plpgsql set timezone = 'UTC' as $$
declare
  sec uuid; a jsonb; r record; o jsonb; id uuid; id2 uuid; n int; v text; d jsonb; parts text[]; k text; b bytea;
  tid text := lmsb_tid();
begin
  if tid is null then perform lmsb_err(401, 'auth', '로그인이 필요합니다.'); end if;
  -- 강의실이 필요 없는 조회
  if op = 'sections' then
    a := lmsb_actor(null, p, x);
    return jsonb_build_object('me', a, 'sections', coalesce((select jsonb_agg(jsonb_build_object('id', s.section_id, 'term', s.term_id, 'course', s.course_code, 'no', s.section_no, 'title', s.title, 'mode', s.mode, 'status', s.status,
      'enrolled', (select count(*) from lms_enrollment e where e.tenant_id = s.tenant_id and e.section_id = s.section_id and e.status = 'enrolled'),
      'resources', (select count(*) from lms_b_resource z where z.tenant_id = s.tenant_id and z.section_id = s.section_id and z.deleted_at is null)) order by s.term_id desc, s.course_code, s.section_no)
      from lms_section s where s.tenant_id = tid and (a->>'pid' is null or a->>'role' = 'staff'
        or exists (select 1 from lms_section_staff f where f.tenant_id = tid and f.section_id = s.section_id and f.person_id = (a->>'pid')::uuid)
        or exists (select 1 from lms_enrollment e where e.tenant_id = tid and e.section_id = s.section_id and e.person_id = (a->>'pid')::uuid and e.status = 'enrolled'))), '[]'));
  elsif op = 'templates' then
    a := lmsb_actor(null, p, x);
    return jsonb_build_object('builtin', jsonb_build_array(
        jsonb_build_object('id', 'online', 'name', '온라인 강좌', 'mode', 'online', 'desc', '15주 · 주차별 영상 + 확인 학습, 진도 기반 출석'),
        jsonb_build_object('id', 'blended', 'name', '블렌디드(플립러닝)', 'mode', 'blended', 'desc', '15주 · 대면 수업 + 온라인 사전 학습'),
        jsonb_build_object('id', 'offline', 'name', '오프라인 강좌', 'mode', 'offline', 'desc', '15주 · 대면 수업 자료 중심'),
        jsonb_build_object('id', 'personal', 'name', '개인 학습형', 'mode', 'personal', 'desc', '6단계 · 순차 학습(앞 단계를 마쳐야 다음 단계 열림)')),
      'mine', coalesce((select jsonb_agg(jsonb_build_object('id', t.tpl_id, 'name', t.name, 'mode', t.mode, 'by', t.by_label, 'created_at', t.created_at,
        'weeks', jsonb_array_length(coalesce(t.data->'weeks', '[]')), 'resources', jsonb_array_length(coalesce(t.data->'resources', '[]'))) order by t.created_at desc) from lms_b_template t where t.tenant_id = tid), '[]'));
  elsif op = 'library' then
    a := lmsb_actor(null, p, x); perform lmsb_need(a, 'resource.edit');
    return jsonb_build_object('items', coalesce((select jsonb_agg(lmsb_res_json(z) || jsonb_build_object('section', s.title, 'section_id', s.section_id, 'term', s.term_id) order by z.updated_at desc)
      from lms_b_resource z join lms_section s on s.tenant_id = z.tenant_id and s.section_id = z.section_id where z.tenant_id = tid and z.share = 'shared' and z.deleted_at is null and z.kind not in ('scorm','html5')), '[]'));
  elsif op = 'perms' then
    a := lmsb_actor(null, p, x);
    return jsonb_build_object('roles', '["professor","ta","staff","grader","student"]'::jsonb, 'perms', to_jsonb(lmsb_perms()),
      'grid', (select jsonb_object_agg(rl, (select jsonb_object_agg(pm, lmsb_can(jsonb_build_object('role', rl), pm)) from unnest(lmsb_perms()) pm)) from unnest(array['professor','ta','staff','grader','student']) rl),
      'can_edit', lmsb_can(a, 'perm.manage'));
  elsif op = 'perm-set' then
    a := lmsb_actor(null, p, x); perform lmsb_need(a, 'perm.manage');
    v := lmsb_t(p, 'role', 20, true, '역할'); k := lmsb_t(p, 'perm', 40, true, '권한');
    if v not in ('professor','ta','staff','grader','student') or not (k = any(lmsb_perms())) then perform lmsb_err(400, 'input', '역할 또는 권한 이름이 올바르지 않습니다.'); end if;
    if v = 'professor' and k = 'course.view' and not lmsb_bool(p, 'allowed', true) then perform lmsb_err(400, 'input', '교수의 강의실 보기 권한은 끌 수 없습니다.'); end if;
    insert into lms_b_role_perm values (tid, v, k, lmsb_bool(p, 'allowed', true)) on conflict (tenant_id, role, perm) do update set allowed = excluded.allowed;
    return jsonb_build_object('ok', true, 'role', v, 'perm', k, 'allowed', lmsb_bool(p, 'allowed', true));
  elsif op = 'file' then
    id := lmsb_id(p, 'id', '파일');
    select f.* into r from lms_b_file f where f.tenant_id = tid and f.file_id = id;
    if not found then perform lmsb_err(404, 'file', '파일을 찾을 수 없습니다.'); end if;
    a := lmsb_actor(r.section_id, p, x); perform lmsb_need(a, 'course.view');
    return jsonb_build_object('id', r.file_id, 'name', r.name, 'mime', r.mime, 'size', r.size, 'b64', translate(encode(r.data, 'base64'), E'\n', ''));
  elsif op in ('scorm', 'scorm-file', 'scorm-commit', 'scorm-report', 'scorm-file-put') then
    if op = 'scorm-file-put' or (op = 'scorm-file' and p ? 'pkg') then
      id := lmsb_id(p, 'pkg', '패키지');
      select z.section_id, g.res_id, g.pkg_id, g.bytes into r from lms_b_pkg g join lms_b_resource z on z.tenant_id = g.tenant_id and z.res_id = g.res_id where g.tenant_id = tid and g.pkg_id = id;
    else
      id := lmsb_id(p, 'resource', '학습 자원');
      select z.section_id, z.res_id, g.pkg_id, g.bytes, g.version, g.manifest, z.title, z.kind into r from lms_b_resource z join lms_b_pkg g on g.tenant_id = z.tenant_id and g.res_id = z.res_id where z.tenant_id = tid and z.res_id = id and z.deleted_at is null;
    end if;
    if not found then perform lmsb_err(404, 'resource', '콘텐츠 패키지를 찾을 수 없습니다.'); end if;
    a := lmsb_actor(r.section_id, p, x);
    if op = 'scorm-file-put' then
      perform lmsb_need(a, 'resource.edit');
      v := lmsb_t(p, 'path', 300, true, '경로');
      if v ~ '(^/|\.\.|\\|^[a-z]+:)' then perform lmsb_err(400, 'input', '패키지 안의 상대 경로만 올릴 수 있습니다.'); end if;
      begin b := decode(coalesce(p->>'b64', ''), 'base64'); exception when others then perform lmsb_err(400, 'input', '파일 내용(base64)이 올바르지 않습니다.'); end;
      if length(b) > 5 * 1024 * 1024 then perform lmsb_err(413, 'too_large', '패키지 파일 하나는 5MB 이하만 올릴 수 있습니다.'); end if;
      if r.bytes + length(b) > 60 * 1024 * 1024 then perform lmsb_err(413, 'too_large', '패키지 전체는 60MB 이하만 올릴 수 있습니다.'); end if;
      insert into lms_b_pkg_file values (tid, r.pkg_id, v, left(coalesce(nullif(p->>'mime', ''), 'application/octet-stream'), 100), b)
        on conflict (tenant_id, pkg_id, path) do update set mime = excluded.mime, data = excluded.data;
      update lms_b_pkg set bytes = (select coalesce(sum(length(f.data)), 0) from lms_b_pkg_file f where f.tenant_id = tid and f.pkg_id = r.pkg_id) where tenant_id = tid and pkg_id = r.pkg_id;
      return jsonb_build_object('ok', true, 'path', v, 'size', length(b));
    elsif op = 'scorm-file' then
      perform lmsb_need(a, 'course.view');
      select f.mime, f.data into r from lms_b_pkg_file f where f.tenant_id = tid and f.pkg_id = r.pkg_id and f.path = lmsb_t(p, 'path', 300, true, '경로');
      if not found then perform lmsb_err(404, 'file', '패키지에 없는 파일입니다.'); end if;
      return jsonb_build_object('mime', r.mime, 'b64', translate(encode(r.data, 'base64'), E'\n', ''));
    elsif op = 'scorm' then
      perform lmsb_need(a, 'course.view');
      return jsonb_build_object('id', r.res_id, 'pkg_id', r.pkg_id, 'title', r.title, 'kind', r.kind, 'version', r.version, 'manifest', r.manifest, 'bytes', r.bytes,
        'files', (select count(*) from lms_b_pkg_file f where f.tenant_id = tid and f.pkg_id = r.pkg_id),
        'me', jsonb_build_object('no', a->'no', 'role', a->'role'),
        'att', coalesce((select jsonb_object_agg(t.sco, jsonb_build_object('cmi', t.cmi, 'status', t.status, 'success', t.success, 'score', t.score, 'total_sec', t.total_sec, 'sessions', t.sessions))
          from lms_b_scorm_att t where t.tenant_id = tid and t.res_id = r.res_id and t.who = lmsb_who(a)), '{}'));
    elsif op = 'scorm-report' then
      perform lmsb_need(a, 'grade');
      return jsonb_build_object('rows', coalesce((select jsonb_agg(jsonb_build_object('who', coalesce(pp.member_no, '미리보기'), 'sco', t.sco, 'status', t.status, 'success', t.success, 'score', t.score, 'total_sec', t.total_sec, 'sessions', t.sessions, 'updated_at', t.updated_at) order by pp.member_no nulls last, t.sco)
        from lms_b_scorm_att t left join lms_person pp on pp.tenant_id = t.tenant_id and pp.person_id = t.person_id where t.tenant_id = tid and t.res_id = r.res_id), '[]'));
    else -- scorm-commit
      perform lmsb_need(a, 'course.view');
      declare cmi jsonb := p->'cmi'; vsco text := lmsb_t(p, 'sco', 200, true, 'SCO'); ver text := r.version; st text; su text; sc numeric; ses numeric; tot numeric; prev record; fin boolean := lmsb_bool(p, 'finish', false); pst text;
      begin
        if jsonb_typeof(cmi) <> 'object' then perform lmsb_err(400, 'input', 'cmi 데이터 형식이 올바르지 않습니다.'); end if;
        if (select count(*) from jsonb_object_keys(cmi)) > 2000 then perform lmsb_err(413, 'too_large', 'cmi 항목이 너무 많습니다.'); end if;
        if exists (select 1 from jsonb_each(cmi) e where e.key !~ '^(cmi|adl)\.[A-Za-z0-9_.]{1,200}$' or jsonb_typeof(e.value) not in ('string','number') or length(e.value #>> '{}') > case when e.key like '%suspend_data' then 64000 else 4096 end) then
          perform lmsb_err(400, 'input', 'cmi 요소 이름 또는 값이 SCORM 데이터 모델에 맞지 않습니다.'); end if;
        if not exists (select 1 from jsonb_array_elements(coalesce(r.manifest->'scos', '[]')) s where s->>'id' = vsco) then perform lmsb_err(404, 'sco', '패키지에 없는 SCO입니다.'); end if;
        select * into prev from lms_b_scorm_att t where t.tenant_id = tid and t.res_id = r.res_id and t.who = lmsb_who(a) and t.sco = vsco;
        if ver = '1.2' then st := cmi->>'cmi.core.lesson_status'; su := case when st in ('passed','failed') then st end; sc := nullif(cmi->>'cmi.core.score.raw', '')::numeric; ses := lmsb_dur(cmi->>'cmi.core.session_time');
        else st := cmi->>'cmi.completion_status'; su := cmi->>'cmi.success_status';
          sc := coalesce(case when nullif(cmi->>'cmi.score.scaled', '') is not null then round((cmi->>'cmi.score.scaled')::numeric * 100, 2) end, nullif(cmi->>'cmi.score.raw', '')::numeric); ses := lmsb_dur(cmi->>'cmi.session_time'); end if;
        tot := coalesce(prev.total_sec, 0) + case when fin then ses else 0 end;
        cmi := cmi - 'cmi.core.session_time' - 'cmi.session_time' || case when ver = '1.2' then jsonb_build_object('cmi.core.total_time', lmsb_dur_fmt(tot, '1.2')) else jsonb_build_object('cmi.total_time', lmsb_dur_fmt(tot, '2004')) end;
        if ver = '1.2' and fin and coalesce(cmi->>'cmi.core.exit', '') <> 'suspend' then cmi := cmi || '{"cmi.core.entry":""}'; elsif ver = '1.2' then cmi := cmi || '{"cmi.core.entry":"resume"}'; end if;
        insert into lms_b_scorm_att (tenant_id, res_id, who, person_id, sco, cmi, status, success, score, total_sec, sessions, updated_at)
          values (tid, r.res_id, lmsb_who(a), (a->>'pid')::uuid, vsco, cmi, st, su, sc, tot, case when fin then 1 else 0 end, now())
          on conflict (tenant_id, res_id, who, sco) do update set cmi = excluded.cmi, status = excluded.status, success = excluded.success, score = excluded.score, total_sec = excluded.total_sec,
            sessions = lms_b_scorm_att.sessions + case when fin then 1 else 0 end, updated_at = now();
        if a->>'pid' is not null then
          -- 패키지 전체 판정: 모든 SCO가 완료(또는 합격)면 완료
          select case when bool_or(t.success = 'failed') then 'failed'
                      when count(*) filter (where t.status in ('completed','passed') or t.success = 'passed') >= greatest(1, jsonb_array_length(coalesce(r.manifest->'scos', '[]'))) then case when bool_or(t.success = 'passed' or t.status = 'passed') then 'passed' else 'completed' end
                      else 'in_progress' end, avg(t.score), sum(t.total_sec) into pst, sc, tot
            from lms_b_scorm_att t where t.tenant_id = tid and t.res_id = r.res_id and t.who = lmsb_who(a);
          insert into lms_b_progress (tenant_id, res_id, person_id, status, score, time_sec, views) values (tid, r.res_id, (a->>'pid')::uuid, pst, sc, tot::int, 1)
            on conflict (tenant_id, res_id, person_id) do update set status = excluded.status, score = excluded.score, time_sec = excluded.time_sec, views = lms_b_progress.views + case when fin then 1 else 0 end, updated_at = now();
        end if;
        return jsonb_build_object('ok', true, 'status', st, 'success', su, 'score', sc, 'total_sec', tot, 'total_time', cmi->>(case when ver = '1.2' then 'cmi.core.total_time' else 'cmi.total_time' end), 'progress', pst);
      end;
    end if;
  end if;

  -- 자원 · 백업 · 템플릿 단위로 강의실 찾기
  if op in ('res-save') and lmsb_uuid(p->>'id') is not null then
    sec := (select z.section_id from lms_b_resource z where z.tenant_id = tid and z.res_id = lmsb_uuid(p->>'id'));
    if sec is null then perform lmsb_err(404, 'resource', '학습 자원을 찾을 수 없습니다.'); end if;
  elsif op in ('res-del','res-restore','res-purge','res-revert','res-versions','progress-mark') then
    id := lmsb_id(p, case when op = 'progress-mark' then 'resource' else 'id' end, '학습 자원');
    sec := (select z.section_id from lms_b_resource z where z.tenant_id = tid and z.res_id = id);
    if sec is null then perform lmsb_err(404, 'resource', '학습 자원을 찾을 수 없습니다.'); end if;
  elsif op in ('restore','backup-get','backup-del') then
    id := lmsb_id(p, 'backup', '백업');
    sec := (select z.section_id from lms_b_backup z where z.tenant_id = tid and z.backup_id = id);
    if sec is null then perform lmsb_err(404, 'backup', '백업을 찾을 수 없습니다.'); end if;
  elsif op = 'copy' then
    sec := lmsb_uuid(p->>'to'); if sec is null or not exists (select 1 from lms_section where tenant_id = tid and section_id = sec) then perform lmsb_err(404, 'section', '복사해 넣을 강의실을 찾을 수 없습니다.'); end if;
  else
    sec := lmsb_sec(p);
  end if;
  a := lmsb_actor(sec, p, x);

  if op = 'overview' then
    perform lmsb_need(a, 'course.view');
    select s.*, t.starts_on t_from, t.ends_on t_to, t.name t_name into r from lms_section s join lms_term t on t.tenant_id = s.tenant_id and t.term_id = s.term_id where s.tenant_id = tid and s.section_id = sec;
    create temp table if not exists lmsb_acc (res_id uuid primary key, open boolean, why text, done boolean, status text, score numeric) on commit drop;
    delete from lmsb_acc;
    if a->>'pid' is not null and a->>'role' = 'student' then insert into lmsb_acc select * from lmsb_access(sec, (a->>'pid')::uuid); end if;
    return jsonb_build_object(
      'section', jsonb_build_object('id', r.section_id, 'title', r.title, 'term', r.term_id, 'term_name', r.t_name, 'course', r.course_code, 'no', r.section_no, 'mode', r.mode, 'starts_on', r.t_from, 'ends_on', r.t_to, 'syllabus', r.syllabus),
      'me', a || jsonb_build_object('role_name', lmsb_role_name(a->>'role'), 'can', (select jsonb_object_agg(pm, lmsb_can(a, pm)) from unnest(lmsb_perms()) pm),
        'level', (select l.level from lms_b_level l where l.tenant_id = tid and l.section_id = sec and l.person_id = (a->>'pid')::uuid)),
      'opt', coalesce((select jsonb_build_object('template', o2.template, 'sequential', o2.sequential, 'adaptive', o2.adaptive, 'menu', o2.menu) from lms_b_opt o2 where o2.tenant_id = tid and o2.section_id = sec), '{"template":null,"sequential":false,"adaptive":[],"menu":[]}'),
      'weeks', coalesce((select jsonb_agg(q.j order by q.wk) from (
        select wk, jsonb_build_object('week_no', wk, 'title', coalesce(w.title, ''), 'starts_on', coalesce(w.starts_on, r.t_from + (wk - 1) * 7), 'ends_on', coalesce(w.ends_on, r.t_from + (wk - 1) * 7 + 6), 'summary', coalesce(w.summary, ''), 'plan', coalesce(w.plan, '{}'),
          'sessions', coalesce((select jsonb_agg(jsonb_build_object('id', s.session_id, 'seq', s.seq, 'title', s.title, 'kind', s.kind, 'starts_at', s.starts_at, 'ends_at', s.ends_at, 'open_at', s.open_at, 'close_at', s.close_at, 'required_sec', s.required_sec, 'prereq', to_jsonb(s.prereq),
              'att', (select jsonb_build_object('present', count(*) filter (where t.status = 'present'), 'late', count(*) filter (where t.status = 'late'), 'absent', count(*) filter (where t.status = 'absent'), 'excused', count(*) filter (where t.status = 'excused'), 'total', count(*)) from lms_attendance t where t.tenant_id = tid and t.session_id = s.session_id),
              'resources', coalesce((select jsonb_agg(lmsb_res_json(z) || coalesce((select jsonb_build_object('open', c.open, 'why', c.why, 'done', c.done, 'status', c.status, 'score', c.score) from lmsb_acc c where c.res_id = z.res_id), '{}') order by z.sort, z.created_at)
                from lms_b_resource z where z.tenant_id = tid and z.section_id = sec and z.session_id = s.session_id and z.deleted_at is null and (z.visible or lmsb_mgr(a))), '[]')) order by s.seq)
            from lms_session s where s.tenant_id = tid and s.section_id = sec and s.week_no = wk), '[]')) j
        from (select week_no wk from lms_b_week where tenant_id = tid and section_id = sec union select week_no from lms_session where tenant_id = tid and section_id = sec) ww
        left join lms_b_week w on w.tenant_id = tid and w.section_id = sec and w.week_no = ww.wk) q), '[]'),
      'common', coalesce((select jsonb_agg(lmsb_res_json(z) || coalesce((select jsonb_build_object('open', c.open, 'why', c.why, 'done', c.done, 'status', c.status, 'score', c.score) from lmsb_acc c where c.res_id = z.res_id), '{}') order by z.sort, z.created_at)
        from lms_b_resource z where z.tenant_id = tid and z.section_id = sec and z.session_id is null and z.deleted_at is null and (z.visible or lmsb_mgr(a))), '[]'),
      'enroll', (select jsonb_build_object('enrolled', count(*) filter (where e.status = 'enrolled'), 'regular', count(*) filter (where e.status = 'enrolled' and e.kind = 'regular'), 'audit', count(*) filter (where e.status = 'enrolled' and e.kind = 'audit'),
          'dropped', count(*) filter (where e.status = 'dropped'), 'pending', count(*) filter (where e.status = 'pending'), 'capacity', r.capacity,
          'by_unit', coalesce((select jsonb_agg(jsonb_build_object('unit', u.unit, 'n', u.n) order by u.n desc, u.unit) from (select coalesce(pp.unit_code, '미지정') unit, count(*) n from lms_enrollment e2 join lms_person pp on pp.tenant_id = e2.tenant_id and pp.person_id = e2.person_id where e2.tenant_id = tid and e2.section_id = sec and e2.status = 'enrolled' group by 1) u), '[]'),
          'by_year', coalesce((select jsonb_agg(jsonb_build_object('year', u.y, 'n', u.n) order by u.y) from (select coalesce(pp.grade_year, 0) y, count(*) n from lms_enrollment e2 join lms_person pp on pp.tenant_id = e2.tenant_id and pp.person_id = e2.person_id where e2.tenant_id = tid and e2.section_id = sec and e2.status = 'enrolled' group by 1) u), '[]'),
          'by_day', coalesce((select jsonb_agg(jsonb_build_object('day', u.dd, 'n', u.n) order by u.dd) from (select (e2.enrolled_at at time zone 'Asia/Seoul')::date dd, count(*) n from lms_enrollment e2 where e2.tenant_id = tid and e2.section_id = sec group by 1) u), '[]'))
        from lms_enrollment e where e.tenant_id = tid and e.section_id = sec),
      'staff', coalesce((select jsonb_agg(jsonb_build_object('no', pp.member_no, 'role', f.role) order by f.role, pp.member_no) from lms_section_staff f join lms_person pp on pp.tenant_id = f.tenant_id and pp.person_id = f.person_id where f.tenant_id = tid and f.section_id = sec), '[]'),
      'roster', case when lmsb_mgr(a) then coalesce((select jsonb_agg(jsonb_build_object('no', pp.member_no, 'unit', pp.unit_code, 'kind', e.kind) order by pp.member_no) from lms_enrollment e join lms_person pp on pp.tenant_id = e.tenant_id and pp.person_id = e.person_id where e.tenant_id = tid and e.section_id = sec and e.status = 'enrolled'), '[]') else '[]' end);
  elsif op = 'week-save' then
    perform lmsb_need(a, 'structure.edit');
    n := lmsb_i(p, 'week_no', 1, 30, null); if n is null then perform lmsb_err(400, 'input', '주차를 입력하세요.'); end if;
    insert into lms_b_week (tenant_id, section_id, week_no, title, starts_on, ends_on, summary, plan) values (tid, sec, n, lmsb_t(p, 'title', 200), lmsb_date(p, 'starts_on'), lmsb_date(p, 'ends_on'), lmsb_t(p, 'summary', 4000), case when jsonb_typeof(p->'plan') = 'object' then p->'plan' else '{}' end)
      on conflict (tenant_id, section_id, week_no) do update set title = excluded.title, starts_on = excluded.starts_on, ends_on = excluded.ends_on, summary = excluded.summary, plan = case when jsonb_typeof(p->'plan') = 'object' then excluded.plan else lms_b_week.plan end;
    if lmsb_date(p, 'ends_on') < lmsb_date(p, 'starts_on') then perform lmsb_err(400, 'input', '종료일이 시작일보다 빠릅니다.'); end if;
    return jsonb_build_object('ok', true, 'week_no', n);
  elsif op = 'week-del' then
    perform lmsb_need(a, 'structure.edit'); n := lmsb_i(p, 'week_no', 1, 30, 0);
    if exists (select 1 from lms_session where tenant_id = tid and section_id = sec and week_no = n) then perform lmsb_err(409, 'busy', '차시가 남아 있는 주차는 삭제할 수 없습니다. 차시를 먼저 정리하세요.'); end if;
    delete from lms_b_week where tenant_id = tid and section_id = sec and week_no = n;
    return jsonb_build_object('ok', true);
  elsif op = 'session-save' then
    perform lmsb_need(a, 'structure.edit');
    id := lmsb_uuid(p->>'id'); v := coalesce(nullif(lmsb_t(p, 'kind', 20), ''), 'class');
    if v not in ('class','online','live','exam','holiday') then perform lmsb_err(400, 'input', '차시 유형이 올바르지 않습니다.'); end if;
    if lmsb_tstz(p, 'close_at') < lmsb_tstz(p, 'open_at') then perform lmsb_err(400, 'input', '인정 종료가 시작보다 빠릅니다.'); end if;
    if exists (select 1 from unnest(lmsb_ids(p, 'prereq')) q where q = id or not exists (select 1 from lms_session s where s.tenant_id = tid and s.section_id = sec and s.session_id = q)) then perform lmsb_err(400, 'input', '선수 차시는 같은 강의실의 다른 차시만 고를 수 있습니다.'); end if;
    begin
      if id is null then
        insert into lms_session (tenant_id, section_id, week_no, seq, kind, title, starts_at, ends_at, open_at, close_at, required_sec, prereq)
        values (tid, sec, lmsb_i(p, 'week_no', 1, 30, 1), lmsb_i(p, 'seq', 1, 20, coalesce((select max(seq) + 1 from lms_session where tenant_id = tid and section_id = sec and week_no = lmsb_i(p, 'week_no', 1, 30, 1)), 1)),
          v, lmsb_t(p, 'title', 200), lmsb_tstz(p, 'starts_at'), lmsb_tstz(p, 'ends_at'), lmsb_tstz(p, 'open_at'), lmsb_tstz(p, 'close_at'), lmsb_i(p, 'required_sec', 0, 86400, 0), lmsb_ids(p, 'prereq'))
        returning session_id into id;
      else
        update lms_session set week_no = lmsb_i(p, 'week_no', 1, 30, week_no), seq = lmsb_i(p, 'seq', 1, 20, seq), kind = v, title = lmsb_t(p, 'title', 200), starts_at = lmsb_tstz(p, 'starts_at'), ends_at = lmsb_tstz(p, 'ends_at'),
          open_at = lmsb_tstz(p, 'open_at'), close_at = lmsb_tstz(p, 'close_at'), required_sec = lmsb_i(p, 'required_sec', 0, 86400, required_sec), prereq = lmsb_ids(p, 'prereq')
        where tenant_id = tid and section_id = sec and session_id = id;
        if not found then perform lmsb_err(404, 'session', '차시를 찾을 수 없습니다.'); end if;
      end if;
    exception when unique_violation then perform lmsb_err(409, 'dup', '같은 주차에 같은 차시 번호가 이미 있습니다.');
    end;
    insert into lms_b_week (tenant_id, section_id, week_no) select tid, sec, s.week_no from lms_session s where s.tenant_id = tid and s.session_id = id on conflict do nothing;
    perform lmsb_hist(sec, 'session', id::text, 'save', null, a);
    return jsonb_build_object('ok', true, 'id', id);
  elsif op = 'session-del' then
    perform lmsb_need(a, 'structure.edit'); id := lmsb_id(p, 'id', '차시');
    if exists (select 1 from lms_attendance where tenant_id = tid and session_id = id) then perform lmsb_err(409, 'busy', '출석 기록이 있는 차시는 삭제할 수 없습니다.'); end if;
    update lms_b_resource set deleted_at = now(), deleted_by = a->>'label', session_id = null where tenant_id = tid and section_id = sec and session_id = id and deleted_at is null;
    update lms_session set prereq = array_remove(prereq, id) where tenant_id = tid and section_id = sec and id = any(prereq);
    delete from lms_session where tenant_id = tid and section_id = sec and session_id = id;
    if not found then perform lmsb_err(404, 'session', '차시를 찾을 수 없습니다.'); end if;
    perform lmsb_hist(sec, 'session', id::text, 'delete', null, a);
    return jsonb_build_object('ok', true);
  elsif op = 'res-save' then
    perform lmsb_need(a, 'resource.edit');
    id := lmsb_uuid(p->>'id'); v := lmsb_t(p, 'kind', 20);
    id2 := lmsb_uuid(p->>'session_id');
    if id2 is not null and not exists (select 1 from lms_session where tenant_id = tid and section_id = sec and session_id = id2) then perform lmsb_err(400, 'input', '차시가 이 강의실에 없습니다.'); end if;
    d := case when jsonb_typeof(p->'body') = 'object' then p->'body' else '{}' end;
    if length(d::text) > 400000 then perform lmsb_err(413, 'too_large', '자원 내용이 너무 큽니다.'); end if;
    if v = 'url' and coalesce(d->>'url', '') !~* '^https?://' then perform lmsb_err(400, 'input', 'URL은 http:// 또는 https://로 시작해야 합니다.'); end if;
    if p ? 'share' and p->>'share' not in ('private','shared') then perform lmsb_err(400, 'input', '공유 범위가 올바르지 않습니다.'); end if;
    if p->>'share' = 'shared' then perform lmsb_need(a, 'resource.share'); end if;
    if id is null then
      if v not in ('file','url','page','folder','label','video','scorm','html5','assign','exam') then perform lmsb_err(400, 'input', '자원 유형이 올바르지 않습니다.'); end if;
      if v = 'assign' and not exists (select 1 from lms_assignment g where g.tenant_id = tid and g.section_id = sec and g.asg_id = lmsb_uuid(d->>'ref')) then perform lmsb_err(400, 'input', '이 강의실의 과제를 고르세요.'); end if;
      if v = 'exam' and not exists (select 1 from lms_exam g where g.tenant_id = tid and g.section_id = sec and g.exam_id = lmsb_uuid(d->>'ref')) then perform lmsb_err(400, 'input', '이 강의실의 시험을 고르세요.'); end if;
      insert into lms_b_resource (tenant_id, section_id, session_id, kind, title, body, visible, sort, completion, access, share, owner_label)
      values (tid, sec, id2, v, lmsb_t(p, 'title', 200, true, '제목'), d, lmsb_bool(p, 'visible', true), lmsb_i(p, 'sort', -1000, 100000, coalesce((select max(sort) + 1 from lms_b_resource where tenant_id = tid and section_id = sec and session_id is not distinct from id2), 0)),
        case when jsonb_typeof(p->'completion') = 'object' then p->'completion' else '{}' end, case when jsonb_typeof(p->'access') = 'object' then p->'access' else '{}' end, coalesce(nullif(p->>'share', ''), 'private'), a->>'label')
      returning res_id into id;
    else
      perform lmsb_hist(sec, 'resource', id::text, 'update', (select lmsb_res_json(z) from lms_b_resource z where z.tenant_id = tid and z.res_id = id), a);
      update lms_b_resource set session_id = case when p ? 'session_id' then id2 else session_id end, title = coalesce(nullif(lmsb_t(p, 'title', 200), ''), title), body = case when p ? 'body' then d else body end,
        visible = lmsb_bool(p, 'visible', visible), sort = lmsb_i(p, 'sort', -1000, 100000, sort), completion = case when jsonb_typeof(p->'completion') = 'object' then p->'completion' else completion end,
        access = case when jsonb_typeof(p->'access') = 'object' then p->'access' else access end, share = coalesce(nullif(p->>'share', ''), share), ver = ver + 1, updated_at = now()
      where tenant_id = tid and res_id = id and deleted_at is null;
      if not found then perform lmsb_err(409, 'deleted', '휴지통에 있는 자원은 먼저 복구하세요.'); end if;
    end if;
    insert into lms_b_res_ver (tenant_id, res_id, ver, snap, by_label) select tid, z.res_id, z.ver, lmsb_res_json(z), a->>'label' from lms_b_resource z where z.tenant_id = tid and z.res_id = id;
    perform lmsb_ext_res(id); -- 과제 · 시험 자원: 이미 있는 제출 · 응시 결과를 바로 반영
    return (select lmsb_res_json(z) from lms_b_resource z where z.tenant_id = tid and z.res_id = id);
  elsif op = 'ext-list' then
    -- 연결할 과제(E) · 시험(F) 목록
    perform lmsb_need(a, 'resource.edit');
    return jsonb_build_object('assignments', coalesce((select jsonb_agg(jsonb_build_object('id', g.asg_id, 'title', g.title, 'kind', g.kind, 'status', g.status, 'due_at', g.due_at, 'max_score', g.max_score) order by g.created_at) from lms_assignment g where g.tenant_id = tid and g.section_id = sec), '[]'),
      'exams', coalesce((select jsonb_agg(jsonb_build_object('id', g.exam_id, 'title', g.title, 'status', g.status, 'close_at', g.close_at, 'score_policy', g.score_policy) order by g.created_at) from lms_exam g where g.tenant_id = tid and g.section_id = sec), '[]'));
  elsif op = 'res-del' then
    perform lmsb_need(a, 'resource.edit');
    update lms_b_resource set deleted_at = now(), deleted_by = a->>'label' where tenant_id = tid and res_id = id and deleted_at is null;
    if not found then perform lmsb_err(409, 'deleted', '이미 휴지통에 있습니다.'); end if;
    perform lmsb_hist(sec, 'resource', id::text, 'trash', (select lmsb_res_json(z) from lms_b_resource z where z.tenant_id = tid and z.res_id = id), a);
    return jsonb_build_object('ok', true);
  elsif op = 'res-restore' then
    perform lmsb_need(a, 'trash');
    update lms_b_resource set deleted_at = null, deleted_by = null,
      session_id = case when exists (select 1 from lms_session s where s.tenant_id = tid and s.session_id = lms_b_resource.session_id) then session_id end
      where tenant_id = tid and res_id = id and deleted_at is not null;
    if not found then perform lmsb_err(409, 'state', '휴지통에 없는 자원입니다.'); end if;
    perform lmsb_hist(sec, 'resource', id::text, 'restore', null, a);
    return (select lmsb_res_json(z) from lms_b_resource z where z.tenant_id = tid and z.res_id = id);
  elsif op = 'res-purge' then
    perform lmsb_need(a, 'trash');
    if lmsb_mgr(a) is false or a->>'role' = 'ta' then perform lmsb_err(403, 'role', '영구 삭제는 교수 · 교직원 · 운영자만 할 수 있습니다.'); end if;
    perform lmsb_hist(sec, 'resource', id::text, 'purge', (select lmsb_res_json(z) from lms_b_resource z where z.tenant_id = tid and z.res_id = id), a);
    delete from lms_b_resource where tenant_id = tid and res_id = id and deleted_at is not null;
    if not found then perform lmsb_err(409, 'state', '휴지통에 있는 자원만 영구 삭제할 수 있습니다.'); end if;
    return jsonb_build_object('ok', true);
  elsif op = 'res-versions' then
    perform lmsb_need(a, 'resource.edit');
    return jsonb_build_object('versions', coalesce((select jsonb_agg(jsonb_build_object('ver', v2.ver, 'by', v2.by_label, 'at', v2.at, 'snap', v2.snap) order by v2.ver desc) from lms_b_res_ver v2 where v2.tenant_id = tid and v2.res_id = id), '[]'));
  elsif op = 'res-revert' then
    perform lmsb_need(a, 'resource.edit');
    select snap into d from lms_b_res_ver where tenant_id = tid and res_id = id and ver = lmsb_i(p, 'ver', 1, 1000000, 0);
    if d is null then perform lmsb_err(404, 'ver', '그 버전이 없습니다.'); end if;
    update lms_b_resource set title = d->>'title', body = d->'body', completion = d->'completion', access = d->'access', visible = (d->>'visible')::boolean, ver = ver + 1, updated_at = now() where tenant_id = tid and res_id = id and deleted_at is null;
    if not found then perform lmsb_err(409, 'deleted', '휴지통에 있는 자원은 먼저 복구하세요.'); end if;
    insert into lms_b_res_ver (tenant_id, res_id, ver, snap, by_label) select tid, z.res_id, z.ver, lmsb_res_json(z), a->>'label' from lms_b_resource z where z.tenant_id = tid and z.res_id = id;
    perform lmsb_hist(sec, 'resource', id::text, 'revert', jsonb_build_object('to', d->'ver'), a);
    return (select lmsb_res_json(z) from lms_b_resource z where z.tenant_id = tid and z.res_id = id);
  elsif op = 'res-reuse' then
    perform lmsb_need(a, 'resource.edit');
    id := lmsb_id(p, 'src', '공유 자원');
    select z.* into r from lms_b_resource z where z.tenant_id = tid and z.res_id = id and z.deleted_at is null and (z.share = 'shared' or z.section_id = sec);
    if not found then perform lmsb_err(404, 'resource', '공유된 자원이 아니거나 없습니다.'); end if;
    id2 := lmsb_uuid(p->>'session_id');
    if id2 is not null and not exists (select 1 from lms_session where tenant_id = tid and section_id = sec and session_id = id2) then perform lmsb_err(400, 'input', '차시가 이 강의실에 없습니다.'); end if;
    insert into lms_b_resource (tenant_id, section_id, session_id, kind, title, body, visible, completion, share, origin_id, owner_label)
      values (tid, sec, id2, r.kind, r.title, r.body, true, r.completion, 'private', r.res_id, a->>'label') returning res_id into id;
    insert into lms_b_res_ver (tenant_id, res_id, ver, snap, by_label) select tid, z.res_id, 1, lmsb_res_json(z), a->>'label' from lms_b_resource z where z.tenant_id = tid and z.res_id = id;
    return (select lmsb_res_json(z) from lms_b_resource z where z.tenant_id = tid and z.res_id = id);
  elsif op = 'progress-mark' then
    perform lmsb_need(a, 'course.view');
    if a->>'pid' is null then return jsonb_build_object('ok', true, 'preview', true); end if;
    if a->>'role' = 'student' and not coalesce((select c.open from lmsb_access(sec, (a->>'pid')::uuid) c where c.res_id = id), false) then perform lmsb_err(403, 'locked', '아직 열리지 않은 자원입니다.'); end if;
    select z.completion, z.kind into r from lms_b_resource z where z.tenant_id = tid and z.res_id = id; d := r.completion;
    -- 과제 · 시험 · SCORM 점수는 연동(트리거 · cmi)으로만 들어온다: 열람 기록만 남긴다
    if r.kind in ('assign','exam','scorm') then return jsonb_build_object('ok', true, 'status', (select g.status from lms_b_progress g where g.tenant_id = tid and g.res_id = id and g.person_id = (a->>'pid')::uuid), 'linked', true); end if;
    insert into lms_b_progress (tenant_id, res_id, person_id, status, score, time_sec, views) values (tid, id, (a->>'pid')::uuid, 'in_progress', null, lmsb_i(p, 'time_sec', 0, 864000, 0), 1)
      on conflict (tenant_id, res_id, person_id) do update set views = lms_b_progress.views + 1, time_sec = lms_b_progress.time_sec + excluded.time_sec, updated_at = now();
    update lms_b_progress g set status = case
        when g.status in ('completed','passed') then g.status
        when d->>'type' = 'time' and g.time_sec >= coalesce((d->>'sec')::int, 0) then 'completed'
        when d->>'type' = 'score' and g.score is not null then case when g.score >= coalesce((d->>'score')::numeric, 0) then 'passed' else 'failed' end
        when coalesce(d->>'type', 'view') = 'view' then 'completed' else g.status end
      where g.tenant_id = tid and g.res_id = id and g.person_id = (a->>'pid')::uuid;
    return (select jsonb_build_object('ok', true, 'status', g.status, 'score', g.score, 'time_sec', g.time_sec, 'views', g.views) from lms_b_progress g where g.tenant_id = tid and g.res_id = id and g.person_id = (a->>'pid')::uuid);
  elsif op = 'progress' then
    perform lmsb_need(a, 'grade');
    return jsonb_build_object(
      'resources', coalesce((select jsonb_agg(jsonb_build_object('id', z.res_id, 'title', z.title, 'kind', z.kind, 'gated', z.completion ? 'type') order by coalesce(s.week_no, 0), coalesce(s.seq, 0), z.sort) from lms_b_resource z left join lms_session s on s.tenant_id = z.tenant_id and s.session_id = z.session_id where z.tenant_id = tid and z.section_id = sec and z.deleted_at is null and z.kind <> 'label'), '[]'),
      'students', coalesce((select jsonb_agg(jsonb_build_object('no', pp.member_no, 'unit', pp.unit_code, 'level', coalesce(l.level, 'standard'),
          'done', (select count(*) from lms_b_progress g join lms_b_resource z on z.tenant_id = g.tenant_id and z.res_id = g.res_id where g.tenant_id = tid and z.section_id = sec and z.deleted_at is null and g.person_id = e.person_id and g.status in ('completed','passed')),
          'cells', coalesce((select jsonb_object_agg(g.res_id::text, jsonb_build_object('st', g.status, 'sc', g.score, 't', g.time_sec)) from lms_b_progress g join lms_b_resource z on z.tenant_id = g.tenant_id and z.res_id = g.res_id where g.tenant_id = tid and z.section_id = sec and g.person_id = e.person_id), '{}')) order by pp.member_no)
        from lms_enrollment e join lms_person pp on pp.tenant_id = e.tenant_id and pp.person_id = e.person_id left join lms_b_level l on l.tenant_id = e.tenant_id and l.section_id = e.section_id and l.person_id = e.person_id
        where e.tenant_id = tid and e.section_id = sec and e.status = 'enrolled'), '[]'));
  elsif op = 'level-set' then
    perform lmsb_need(a, 'grade');
    v := lmsb_t(p, 'level', 20, true, '수준'); if v not in ('basic','standard','advanced') then perform lmsb_err(400, 'input', '수준은 기초 · 표준 · 심화 중에서 고르세요.'); end if;
    select pp.person_id into id from lms_person pp join lms_enrollment e on e.tenant_id = pp.tenant_id and e.person_id = pp.person_id and e.section_id = sec where pp.tenant_id = tid and pp.member_no = lmsb_t(p, 'no', 20, true, '학번');
    if id is null then perform lmsb_err(404, 'person', '이 강의실 수강생이 아닙니다.'); end if;
    insert into lms_b_level values (tid, sec, id, v, a->>'label', now()) on conflict (tenant_id, section_id, person_id) do update set level = excluded.level, set_by = excluded.set_by, at = now();
    return jsonb_build_object('ok', true, 'no', p->>'no', 'level', v);
  elsif op = 'level-auto' then
    -- 진단 자원 점수로 수준 자동 배정(기준 점수 low 미만 기초, high 이상 심화)
    perform lmsb_need(a, 'grade'); id := lmsb_id(p, 'res', '진단 자원');
    insert into lms_b_level (tenant_id, section_id, person_id, level, set_by)
      select tid, sec, g.person_id, case when g.score < lmsb_i(p, 'low', 0, 100000, 60) then 'basic' when g.score >= lmsb_i(p, 'high', 0, 100000, 85) then 'advanced' else 'standard' end, '자동(진단)'
      from lms_b_progress g join lms_b_resource z on z.tenant_id = g.tenant_id and z.res_id = g.res_id where g.tenant_id = tid and g.res_id = id and z.section_id = sec and g.score is not null
      on conflict (tenant_id, section_id, person_id) do update set level = excluded.level, set_by = excluded.set_by, at = now();
    get diagnostics n = row_count;
    return jsonb_build_object('ok', true, 'assigned', n);
  elsif op = 'opt-set' then
    perform lmsb_need(a, 'structure.edit');
    if jsonb_typeof(p->'adaptive') = 'array' and (jsonb_array_length(p->'adaptive') > 50 or exists (select 1 from jsonb_array_elements(p->'adaptive') q where lmsb_uuid(q->>'if_res') is null or jsonb_typeof(q->'below') <> 'number')) then
      perform lmsb_err(400, 'input', '적응형 규칙 형식(기준 자원 · 기준 점수)을 확인하세요.'); end if;
    insert into lms_b_opt (tenant_id, section_id, sequential, adaptive) values (tid, sec, lmsb_bool(p, 'sequential', false), case when jsonb_typeof(p->'adaptive') = 'array' then p->'adaptive' else '[]' end)
      on conflict (tenant_id, section_id) do update set sequential = lmsb_bool(p, 'sequential', lms_b_opt.sequential), adaptive = case when jsonb_typeof(p->'adaptive') = 'array' then p->'adaptive' else lms_b_opt.adaptive end, updated_at = now();
    return (select jsonb_build_object('ok', true, 'sequential', o2.sequential, 'adaptive', o2.adaptive) from lms_b_opt o2 where o2.tenant_id = tid and o2.section_id = sec);
  elsif op = 'next' then
    -- 적응형 경로: 규칙(기준 자원 점수 < below → then, 이상 → else) + 아직 안 끝낸 열린 자원 순서대로
    perform lmsb_need(a, 'course.view');
    if a->>'pid' is null then return jsonb_build_object('preview', true, 'recommend', '[]'::jsonb, 'next', null); end if;
    create temp table if not exists lmsb_acc2 (res_id uuid primary key, open boolean, why text, done boolean, status text, score numeric) on commit drop;
    delete from lmsb_acc2; insert into lmsb_acc2 select * from lmsb_access(sec, (a->>'pid')::uuid);
    o := '[]';
    for d in select q from lms_b_opt o2, jsonb_array_elements(o2.adaptive) q where o2.tenant_id = tid and o2.section_id = sec loop
      select c.score into r from lmsb_acc2 c where c.res_id = lmsb_uuid(d->>'if_res');
      if found and r.score is not null then
        o := o || coalesce((select jsonb_agg(jsonb_build_object('id', z.res_id, 'title', z.title, 'kind', z.kind, 'why', case when r.score < (d->>'below')::numeric then '보충 학습(기준 ' || (d->>'below') || '점 미만)' else '심화 학습(기준 ' || (d->>'below') || '점 이상)' end, 'done', c.done))
          from jsonb_array_elements_text(case when r.score < (d->>'below')::numeric then coalesce(d->'then', '[]') else coalesce(d->'else', '[]') end) t
          join lms_b_resource z on z.tenant_id = tid and z.res_id = lmsb_uuid(t) and z.deleted_at is null left join lmsb_acc2 c on c.res_id = z.res_id), '[]');
      end if;
    end loop;
    return jsonb_build_object('recommend', o, 'level', (select l.level from lms_b_level l where l.tenant_id = tid and l.section_id = sec and l.person_id = (a->>'pid')::uuid),
      'next', (select jsonb_build_object('id', z.res_id, 'title', z.title, 'kind', z.kind) from lmsb_access(sec, (a->>'pid')::uuid) c join lms_b_resource z on z.tenant_id = tid and z.res_id = c.res_id where c.open and not c.done and z.kind <> 'label' limit 1),
      'done', (select count(*) from lmsb_acc2 where done), 'total', (select count(*) from lmsb_acc2 c join lms_b_resource z on z.tenant_id = tid and z.res_id = c.res_id where z.kind <> 'label' and z.visible));
  elsif op = 'timeline' then
    perform lmsb_need(a, 'course.view');
    select s.syllabus, t.starts_on t_from, t.ends_on t_to into r from lms_section s join lms_term t on t.tenant_id = s.tenant_id and t.term_id = s.term_id where s.tenant_id = tid and s.section_id = sec;
    return jsonb_build_object('term_from', r.t_from, 'term_to', r.t_to, 'today', (now() at time zone 'Asia/Seoul')::date, 'syllabus_weeks', coalesce(jsonb_array_length(case when jsonb_typeof(r.syllabus->'weeks') = 'array' then r.syllabus->'weeks' end), 0),
      'weeks', coalesce((select jsonb_agg(jsonb_build_object('week_no', g.wk, 'title', coalesce(w.title, ''), 'from', coalesce(w.starts_on, r.t_from + (g.wk - 1) * 7), 'to', coalesce(w.ends_on, r.t_from + (g.wk - 1) * 7 + 6),
          'plan', coalesce(w.plan, '{}'), 'summary', coalesce(w.summary, ''),
          'items', coalesce((select jsonb_agg(jsonb_build_object('seq', s.seq, 'title', s.title, 'kind', s.kind, 'open_at', s.open_at, 'close_at', s.close_at, 'resources', (select count(*) from lms_b_resource z where z.tenant_id = tid and z.session_id = s.session_id and z.deleted_at is null)) order by s.seq) from lms_session s where s.tenant_id = tid and s.section_id = sec and s.week_no = g.wk), '[]')) order by g.wk)
        from (select week_no wk from lms_b_week where tenant_id = tid and section_id = sec union select week_no from lms_session where tenant_id = tid and section_id = sec) g
        left join lms_b_week w on w.tenant_id = tid and w.section_id = sec and w.week_no = g.wk), '[]'));
  elsif op = 'syllabus-import' then
    -- 연동 지점: 학사 수업계획서(lms_section.syllabus.weeks — 학사 동기화가 채움) 또는 붙여넣은 주차 계획 [{week, title, plan}]
    perform lmsb_need(a, 'structure.edit');
    d := case when jsonb_typeof(p->'weeks') = 'array' then p->'weeks' else (select case when jsonb_typeof(s.syllabus->'weeks') = 'array' then s.syllabus->'weeks' end from lms_section s where s.tenant_id = tid and s.section_id = sec) end;
    if d is null or jsonb_array_length(d) = 0 then perform lmsb_err(409, 'no_syllabus', '수업계획서 주차 계획이 없습니다. 학사 연동 후 동작하며, 지금은 주차 계획을 붙여 넣어 반영할 수 있습니다.'); end if;
    if jsonb_array_length(d) > 30 or exists (select 1 from jsonb_array_elements(d) e where coalesce(e->>'week', '') !~ '^\d{1,2}$' or (e->>'week')::int not between 1 and 30) then perform lmsb_err(400, 'input', '주차 번호(1~30)를 확인하세요.'); end if;
    insert into lms_b_week (tenant_id, section_id, week_no, title, plan)
      select tid, sec, (e->>'week')::int, left(coalesce(e->>'title', ''), 200), jsonb_build_object('plan', left(coalesce(e->>'plan', ''), 2000), 'method', left(coalesce(e->>'method', ''), 100), 'from', 'syllabus') from jsonb_array_elements(d) e
      on conflict (tenant_id, section_id, week_no) do update set title = case when excluded.title <> '' then excluded.title else lms_b_week.title end, plan = excluded.plan;
    get diagnostics n = row_count;
    return jsonb_build_object('ok', true, 'weeks', n);
  elsif op = 'template-apply' then
    perform lmsb_need(a, 'structure.edit');
    v := lmsb_t(p, 'template', 40, true, '템플릿');
    d := coalesce(lmsb_builtin(v), (select t.data from lms_b_template t where t.tenant_id = tid and t.tpl_id = lmsb_uuid(v)));
    if d is null then perform lmsb_err(404, 'template', '템플릿을 찾을 수 없습니다.'); end if;
    n := coalesce((select (t.starts_on - (d->>'term_start')::date) from lms_section s join lms_term t on t.tenant_id = s.tenant_id and t.term_id = s.term_id where s.tenant_id = tid and s.section_id = sec and d ? 'term_start' and d->>'term_start' is not null), 0);
    o := lmsb_import(sec, d, array['structure','resources'], false, n, a);
    if lmsb_builtin(v) is not null then
      update lms_section set mode = case v when 'online' then 'online' when 'blended' then 'blended' when 'offline' then 'offline' else mode end where tenant_id = tid and section_id = sec;
    end if;
    perform lmsb_hist(sec, 'course', sec::text, 'template', jsonb_build_object('template', v), a);
    return o || jsonb_build_object('ok', true);
  elsif op = 'template-save' then
    perform lmsb_need(a, 'structure.edit');
    insert into lms_b_template (tenant_id, name, mode, data, by_label) values (tid, lmsb_t(p, 'name', 60, true, '템플릿 이름'), coalesce(nullif(lmsb_t(p, 'mode', 20), ''), 'personal'), lmsb_export(sec, array['structure','resources']), a->>'label') returning tpl_id into id;
    return jsonb_build_object('ok', true, 'id', id);
  elsif op = 'template-del' then
    perform lmsb_need(a, 'structure.edit');
    delete from lms_b_template where tenant_id = tid and tpl_id = lmsb_id(p, 'id', '템플릿');
    if not found then perform lmsb_err(404, 'template', '템플릿을 찾을 수 없습니다.'); end if;
    return jsonb_build_object('ok', true);
  elsif op = 'copy' then
    -- 이전 학기 강의실 복사 · 가져오기(기간은 두 학기 시작일 차이만큼 자동 이동, shift_days로 직접 지정 가능)
    perform lmsb_need(a, 'structure.edit');
    id := lmsb_uuid(p->>'from');
    if id is null or id = sec or not exists (select 1 from lms_section where tenant_id = tid and section_id = id) then perform lmsb_err(404, 'section', '가져올 강의실을 찾을 수 없습니다.'); end if;
    perform lmsb_need(lmsb_actor(id, p, x), 'course.view');
    select coalesce(array_agg(q), '{}') into parts from jsonb_array_elements_text(case when jsonb_typeof(p->'parts') = 'array' then p->'parts' else '["structure","resources"]' end) q where q in ('structure','resources','activities','boards');
    if cardinality(parts) = 0 then perform lmsb_err(400, 'input', '가져올 항목을 고르세요.'); end if;
    n := coalesce(lmsb_i(p, 'shift_days', -3650, 3650, null)::int, (select t2.starts_on - t1.starts_on from lms_section s1 join lms_term t1 on t1.tenant_id = s1.tenant_id and t1.term_id = s1.term_id, lms_section s2 join lms_term t2 on t2.tenant_id = s2.tenant_id and t2.term_id = s2.term_id
      where s1.tenant_id = tid and s1.section_id = id and s2.tenant_id = tid and s2.section_id = sec));
    o := lmsb_import(sec, lmsb_export(id, parts), parts, false, n, a);
    perform lmsb_hist(sec, 'course', sec::text, 'copy', jsonb_build_object('from', id, 'parts', parts, 'shift_days', n), a);
    return o || jsonb_build_object('ok', true, 'shift_days', n);
  elsif op = 'shift' then
    -- 기간 일괄 변경
    perform lmsb_need(a, 'structure.edit');
    n := lmsb_i(p, 'days', -3650, 3650, 0);
    if n = 0 then perform lmsb_err(400, 'input', '옮길 일수를 입력하세요.'); end if;
    update lms_b_week set starts_on = starts_on + n, ends_on = ends_on + n where tenant_id = tid and section_id = sec;
    update lms_session set starts_at = starts_at + make_interval(days => n), ends_at = ends_at + make_interval(days => n), open_at = open_at + make_interval(days => n), close_at = close_at + make_interval(days => n) where tenant_id = tid and section_id = sec;
    update lms_b_resource set access = access
        || case when access ? 'from' then jsonb_build_object('from', to_char(((access->>'from')::timestamptz + make_interval(days => n)) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) else '{}' end
        || case when access ? 'until' then jsonb_build_object('until', to_char(((access->>'until')::timestamptz + make_interval(days => n)) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')) else '{}' end
      where tenant_id = tid and section_id = sec and (access ? 'from' or access ? 'until');
    perform lmsb_hist(sec, 'course', sec::text, 'shift', jsonb_build_object('days', n), a);
    return jsonb_build_object('ok', true, 'days', n, 'sessions', (select count(*) from lms_session where tenant_id = tid and section_id = sec));
  elsif op = 'backups' then
    perform lmsb_need(a, 'backup');
    return jsonb_build_object('backups', coalesce((select jsonb_agg(jsonb_build_object('id', z.backup_id, 'parts', to_jsonb(z.parts), 'bytes', z.bytes, 'note', z.note, 'by', z.by_label, 'created_at', z.created_at,
      'counts', jsonb_build_object('weeks', jsonb_array_length(coalesce(z.data->'weeks', '[]')), 'sessions', jsonb_array_length(coalesce(z.data->'sessions', '[]')), 'resources', jsonb_array_length(coalesce(z.data->'resources', '[]')))) order by z.created_at desc)
      from lms_b_backup z where z.tenant_id = tid and z.section_id = sec), '[]'));
  elsif op = 'backup' or op = 'backup-import' then
    perform lmsb_need(a, 'backup');
    if op = 'backup' then
      select coalesce(array_agg(q), '{}') into parts from jsonb_array_elements_text(case when jsonb_typeof(p->'parts') = 'array' then p->'parts' else '["structure","resources","activities","boards"]' end) q where q in ('structure','resources','activities','boards');
      if cardinality(parts) = 0 then perform lmsb_err(400, 'input', '백업할 항목을 고르세요.'); end if;
      d := lmsb_export(sec, parts);
    else
      d := p->'data';
      if jsonb_typeof(d) <> 'object' or d->>'format' is distinct from 'didisam-lms-course' then perform lmsb_err(400, 'format', '디디쌤 강좌 백업 파일이 아닙니다.'); end if;
      select coalesce(array_agg(q), '{}') into parts from jsonb_array_elements_text(coalesce(d->'parts', '[]')) q where q in ('structure','resources','activities','boards');
    end if;
    insert into lms_b_backup (tenant_id, section_id, parts, data, bytes, note, by_label) values (tid, sec, parts, d, length(d::text), lmsb_t(p, 'note', 200), a->>'label') returning backup_id into id;
    return jsonb_build_object('ok', true, 'id', id, 'parts', to_jsonb(parts), 'bytes', length(d::text));
  elsif op = 'backup-get' then
    perform lmsb_need(a, 'backup');
    return (select z.data from lms_b_backup z where z.tenant_id = tid and z.backup_id = id);
  elsif op = 'backup-del' then
    perform lmsb_need(a, 'backup');
    delete from lms_b_backup where tenant_id = tid and backup_id = id;
    return jsonb_build_object('ok', true);
  elsif op = 'restore' then
    -- 복구: 전체(백업에 든 모든 항목) 또는 부분(parts), replace = 기존 자원을 휴지통으로 보내고 백업으로 바꿈, merge = 덧붙임
    perform lmsb_need(a, 'backup');
    if a->>'role' not in ('admin','professor','staff') then perform lmsb_err(403, 'role', '복구는 교수 · 교직원 · 운영자만 할 수 있습니다.'); end if;
    select z.data, z.parts into r from lms_b_backup z where z.tenant_id = tid and z.backup_id = id;
    select coalesce(array_agg(q), '{}') into parts from jsonb_array_elements_text(case when jsonb_typeof(p->'parts') = 'array' then p->'parts' else to_jsonb(r.parts) end) q where q = any(r.parts);
    if cardinality(parts) = 0 then perform lmsb_err(400, 'input', '복구할 항목을 고르세요(백업에 든 항목만).'); end if;
    v := coalesce(nullif(lmsb_t(p, 'mode', 10), ''), 'replace'); if v not in ('replace','merge') then perform lmsb_err(400, 'input', '복구 방식은 replace 또는 merge입니다.'); end if;
    o := lmsb_import(sec, r.data, parts, v = 'replace', 0, a);
    perform lmsb_hist(sec, 'course', sec::text, 'restore', jsonb_build_object('backup', id, 'parts', parts, 'mode', v), a);
    return o || jsonb_build_object('ok', true, 'parts', to_jsonb(parts), 'mode', v);
  elsif op = 'trash' then
    perform lmsb_need(a, 'trash');
    return jsonb_build_object(
      'items', coalesce((select jsonb_agg(lmsb_res_json(z) || jsonb_build_object('deleted_by', z.deleted_by) order by z.deleted_at desc) from lms_b_resource z where z.tenant_id = tid and z.section_id = sec and z.deleted_at is not null), '[]'),
      'history', coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'obj', h.obj, 'obj_id', h.obj_id, 'action', h.action, 'by', h.by_label, 'at', h.at, 'title', coalesce(h.snap->>'title', (select z.title from lms_b_resource z where z.tenant_id = tid and z.res_id = lmsb_uuid(h.obj_id)))) order by h.id desc)
        from (select * from lms_b_history h2 where h2.tenant_id = tid and h2.section_id = sec order by h2.id desc limit 200) h), '[]'));
  elsif op = 'file-put' then
    perform lmsb_need(a, 'board.write');
    begin b := decode(coalesce(p->>'b64', ''), 'base64'); exception when others then perform lmsb_err(400, 'input', '파일 내용(base64)이 올바르지 않습니다.'); end;
    if length(b) = 0 then perform lmsb_err(400, 'input', '빈 파일입니다.'); end if;
    if length(b) > 3 * 1024 * 1024 then perform lmsb_err(413, 'too_large', '파일은 3MB 이하만 올릴 수 있습니다(대용량은 CDN 연동 후 동작).'); end if;
    v := lmsb_t(p, 'name', 200, true, '파일 이름');
    if v ~* '\.(exe|bat|cmd|com|scr|js|vbs|ps1|sh|msi|jar)$' then perform lmsb_err(400, 'input', '실행 파일은 올릴 수 없습니다.'); end if;
    insert into lms_b_file (tenant_id, section_id, name, mime, size, data) values (tid, sec, v, left(coalesce(nullif(p->>'mime', ''), 'application/octet-stream'), 100), length(b), b) returning file_id into id;
    return jsonb_build_object('id', id, 'name', v, 'size', length(b), 'mime', left(coalesce(nullif(p->>'mime', ''), 'application/octet-stream'), 100));
  elsif op = 'scorm-pkg' then
    -- 패키지 등록: 브라우저가 zip을 풀어 imsmanifest.xml을 읽은 결과(manifest)를 받는다. 파일은 scorm-file-put으로 따로 올린다.
    perform lmsb_need(a, 'resource.edit');
    d := p->'manifest'; v := coalesce(d->>'version', '');
    if jsonb_typeof(d) <> 'object' or v not in ('1.2','2004','none') then perform lmsb_err(400, 'input', '패키지 정보(SCORM 1.2 · 2004 · 비표준 HTML5)를 확인하세요.'); end if;
    if jsonb_typeof(d->'scos') <> 'array' or jsonb_array_length(d->'scos') = 0 or jsonb_array_length(d->'scos') > 300 then perform lmsb_err(400, 'input', '실행할 SCO(시작 파일)가 없습니다.'); end if;
    if exists (select 1 from jsonb_array_elements(d->'scos') s where coalesce(s->>'id', '') = '' or coalesce(s->>'href', '') = '' or s->>'href' ~ '(^/|\.\.|\\|^[a-zA-Z][a-zA-Z0-9+.-]*:)') then perform lmsb_err(400, 'input', 'SCO 시작 경로는 패키지 안의 상대 경로여야 합니다.'); end if;
    if length(d::text) > 200000 then perform lmsb_err(413, 'too_large', '매니페스트가 너무 큽니다.'); end if;
    id2 := lmsb_uuid(p->>'session_id');
    if id2 is not null and not exists (select 1 from lms_session where tenant_id = tid and section_id = sec and session_id = id2) then perform lmsb_err(400, 'input', '차시가 이 강의실에 없습니다.'); end if;
    insert into lms_b_resource (tenant_id, section_id, session_id, kind, title, body, completion, owner_label)
      values (tid, sec, id2, case when v = 'none' then 'html5' else 'scorm' end, coalesce(nullif(lmsb_t(p, 'title', 200), ''), left(coalesce(d->>'title', '콘텐츠 패키지'), 200)),
        jsonb_build_object('version', v, 'scos', (select jsonb_agg(jsonb_build_object('id', s->>'id', 'title', s->>'title')) from jsonb_array_elements(d->'scos') s)), jsonb_build_object('type', case when v = 'none' then 'view' else 'scorm' end), a->>'label')
      returning res_id into id;
    insert into lms_b_pkg (tenant_id, res_id, version, manifest) values (tid, id, v, d) returning pkg_id into id2;
    update lms_b_resource set body = body || jsonb_build_object('pkg', id2) where tenant_id = tid and res_id = id;
    insert into lms_b_res_ver (tenant_id, res_id, ver, snap, by_label) select tid, z.res_id, 1, lmsb_res_json(z), a->>'label' from lms_b_resource z where z.tenant_id = tid and z.res_id = id;
    return jsonb_build_object('ok', true, 'id', id, 'pkg_id', id2);
  elsif op = 'menu' then
    perform lmsb_need(a, 'course.view');
    return jsonb_build_object('modules', coalesce((select o2.menu from lms_b_opt o2 where o2.tenant_id = tid and o2.section_id = sec), '[]'),
      'pref', coalesce((select jsonb_build_object('hidden', to_jsonb(m.hidden), 'order', to_jsonb(m.ord)) from lms_b_menu_pref m where m.tenant_id = tid and m.section_id = sec and m.who = lmsb_who(a)), '{"hidden":[],"order":[]}'),
      'can_edit', lmsb_can(a, 'menu.edit'));
  elsif op = 'menu-set' then
    perform lmsb_need(a, 'menu.edit');
    if jsonb_typeof(p->'modules') <> 'array' or jsonb_array_length(p->'modules') > 40 or exists (select 1 from jsonb_array_elements(p->'modules') q where coalesce(q->>'id', '') !~ '^[a-z0-9_-]{1,30}$') then perform lmsb_err(400, 'input', '메뉴 모듈 형식을 확인하세요.'); end if;
    insert into lms_b_opt (tenant_id, section_id, menu) values (tid, sec, (select jsonb_agg(jsonb_build_object('id', q->>'id', 'on', coalesce((q->>'on')::boolean, true))) from jsonb_array_elements(p->'modules') q))
      on conflict (tenant_id, section_id) do update set menu = excluded.menu, updated_at = now();
    return jsonb_build_object('ok', true);
  elsif op = 'menu-pref' then
    perform lmsb_need(a, 'course.view');
    insert into lms_b_menu_pref values (tid, sec, lmsb_who(a),
      (select coalesce(array_agg(q), '{}') from jsonb_array_elements_text(case when jsonb_typeof(p->'hidden') = 'array' then p->'hidden' else '[]' end) q where q ~ '^[a-z0-9_-]{1,30}$'),
      (select coalesce(array_agg(q), '{}') from jsonb_array_elements_text(case when jsonb_typeof(p->'order') = 'array' then p->'order' else '[]' end) q where q ~ '^[a-z0-9_-]{1,30}$'))
      on conflict (tenant_id, section_id, who) do update set hidden = excluded.hidden, ord = excluded.ord;
    return jsonb_build_object('ok', true);
  end if;
  perform lmsb_err(404, 'not_found', '없는 주소입니다.');
  return null;
end $$;
