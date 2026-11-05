-- v30 묶음 E — 과제(제출 · 루브릭 채점 · 첨삭 · 협업 · 표절 결과 인터페이스) + E·F·H 공용 도우미(lms_x_*)
-- 업무 규칙은 SQL 함수(lms_e_*)에 두고 Node(mod-e.js) · Java(lms.e)는 같은 함수를 부른다 → 두 서버의 JSON이 같다.
-- 함수 규약: fn(ctx jsonb, a jsonb) returns jsonb. ctx = {kind:'staff'|'learner', uid, email, role, sid, ip}
-- 오류: raise … detail 'dd:<상태>:<코드>' → 서버가 {error, message}로 바꾼다. 감사: 결과의 _audit {a, d}를 서버가 audit_log에 기록.

-- ── 공용 도우미 ──
create or replace function lms_x_err(st int, code text, msg text) returns void language plpgsql as $$
begin raise exception using message = msg, detail = 'dd:' || st || ':' || code; end $$;
create or replace function lms_x_tid() returns text language sql stable as $$ select current_setting('app.tenant', true) $$;
create or replace function lms_x_ts(t timestamptz) returns text language sql immutable as $$
  select case when t is null then null else to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end $$;
create or replace function lms_x_n(x numeric) returns float8 language sql immutable as $$ select round(x, 2)::float8 $$;
create or replace function lms_x_ip(t text) returns text language plpgsql immutable as $$
declare v text := coalesce(t, '');
begin
  if v ~* '^::ffff:\d+\.\d+\.\d+\.\d+$' then v := substr(v, 8); end if;
  begin return host(v::inet); exception when others then return v; end;
end $$;
create or replace function lms_x_staff(ctx jsonb) returns void language plpgsql as $$
begin
  if coalesce(ctx->>'kind', '') <> 'staff' then perform lms_x_err(403, 'role', '교수자 · 운영자만 쓸 수 있습니다.'); end if;
end $$;
create or replace function lms_x_admin(ctx jsonb) returns void language plpgsql as $$
begin
  perform lms_x_staff(ctx);
  if coalesce(ctx->>'role', '') not in ('owner', 'sub') then perform lms_x_err(403, 'role', '운영자만 쓸 수 있습니다.'); end if;
end $$;
create or replace function lms_x_uid(ctx jsonb) returns uuid language plpgsql as $$
begin begin return (ctx->>'uid')::uuid; exception when others then return null; end; end $$;
create or replace function lms_x_uuid(v text, what text) returns uuid language plpgsql as $$
begin
  if v is null or v = '' then perform lms_x_err(400, 'required', what || '을(를) 지정하세요.'); end if;
  begin return v::uuid; exception when others then perform lms_x_err(400, 'bad_id', what || ' 형식이 올바르지 않습니다.'); end;
  return null;
end $$;
create or replace function lms_x_str(a jsonb, k text, maxlen int, req boolean, label text) returns text language plpgsql as $$
declare v text := case when jsonb_typeof(a->k) in ('string', 'number') then a->>k else null end;
begin
  v := nullif(btrim(coalesce(v, '')), '');
  if v is null and req then perform lms_x_err(400, 'required', label || '을(를) 입력하세요.'); end if;
  if v is not null and length(v) > maxlen then perform lms_x_err(400, 'too_long', label || '은(는) ' || maxlen || '자 이내로 입력하세요.'); end if;
  return v;
end $$;
create or replace function lms_x_num(a jsonb, k text, lo numeric, hi numeric, dflt numeric, label text) returns numeric language plpgsql as $$
declare v numeric;
begin
  if a->k is null or jsonb_typeof(a->k) = 'null' or (jsonb_typeof(a->k) = 'string' and btrim(a->>k) = '') then return dflt; end if;
  begin v := (a->>k)::numeric; exception when others then perform lms_x_err(400, 'bad_number', label || '은(는) 숫자로 입력하세요.'); end;
  if v < lo or v > hi then perform lms_x_err(400, 'range', label || '은(는) ' || lo || '~' || hi || ' 사이로 입력하세요.'); end if;
  return v;
end $$;
create or replace function lms_x_time(a jsonb, k text, label text) returns timestamptz language plpgsql as $$
begin
  if nullif(a->>k, '') is null then return null; end if;
  begin return (a->>k)::timestamptz; exception when others then perform lms_x_err(400, 'bad_time', label || ' 일시 형식이 올바르지 않습니다.'); end;
  return null;
end $$;
create or replace function lms_x_bool(a jsonb, k text, dflt boolean) returns boolean language sql immutable as $$
  select case when a->k is null or jsonb_typeof(a->k) = 'null' then dflt when jsonb_typeof(a->k) = 'boolean' then (a->>k)::boolean else (a->>k) in ('1', 'true', 'on') end $$;
create or replace function lms_x_section(sec uuid) returns void language plpgsql as $$
begin
  if not exists (select 1 from lms_section where section_id = sec) then perform lms_x_err(404, 'section', '없는 분반입니다.'); end if;
end $$;
-- 학습자 → 학사 구성원(학번 = 학습자 번호)
create or replace function lms_x_learner(ctx jsonb) returns uuid language plpgsql as $$
declare p uuid;
begin
  if coalesce(ctx->>'kind', '') <> 'learner' then perform lms_x_err(403, 'role', '학습자 로그인이 필요합니다.'); end if;
  select person_id into p from lms_person where member_no = ctx->>'sid' and kind = 'student';
  if p is null then perform lms_x_err(403, 'person', '학사 구성원으로 등록되지 않은 학습자입니다.'); end if;
  return p;
end $$;
-- 수강 구분: 'regular' | 'audit' | null(미수강)
create or replace function lms_x_enr(sec uuid, pid uuid) returns text language sql stable as $$
  select kind from lms_enrollment where section_id = sec and person_id = pid and status = 'enrolled' $$;
create or replace function lms_x_audit(a text, d jsonb) returns jsonb language sql immutable as $$ select jsonb_build_object('a', a, 'd', d) $$;
-- 성적 항목 연결(과제 · 시험 → lms_grade_item.source_ref) — 가중치는 교수가 성적 화면에서 정한다
create or replace function lms_x_grade_link(sec uuid, ref text, cat text, nm text, mx numeric) returns uuid language plpgsql as $$
declare i uuid;
begin
  select item_id into i from lms_grade_item where section_id = sec and source_ref = ref;
  if i is null then
    insert into lms_grade_item (tenant_id, section_id, category, name, weight_pct, max_score, source_ref, sort)
    values (lms_x_tid(), sec, cat, nm, 0, mx, ref, 50) returning item_id into i;
  else update lms_grade_item set name = nm, max_score = mx where item_id = i; end if;
  return i;
end $$;
-- 점수 반영(청강생 제외)
create or replace function lms_x_grade_put(sec uuid, item uuid, pid uuid, sc numeric, fb text, by_uid uuid) returns void language plpgsql as $$
begin
  if lms_x_enr(sec, pid) is distinct from 'regular' then return; end if;
  insert into lms_grade_score (tenant_id, item_id, person_id, score, feedback, graded_by, graded_at)
  values (lms_x_tid(), item, pid, sc, fb, by_uid, now())
  on conflict (tenant_id, item_id, person_id) do update set score = excluded.score, feedback = coalesce(excluded.feedback, lms_grade_score.feedback), graded_by = excluded.graded_by, graded_at = now();
end $$;

-- ── 표 ──
create table if not exists lms_file (
  tenant_id text not null references tenants(id) on delete cascade,
  file_id uuid not null default gen_random_uuid(),
  owner_kind text not null check (owner_kind in ('staff', 'learner')),
  owner_ref text not null,                 -- 운영자 uid 또는 학습자 person_id
  name text not null, mime text not null, size int not null, sha256 text not null,
  data bytea not null,                      -- 연동 후: 객체 저장소 키로 대체(CDN 연동 지점)
  created_at timestamptz not null default now(),
  primary key (tenant_id, file_id)
);
create table if not exists lms_rubric (
  tenant_id text not null references tenants(id) on delete cascade,
  rubric_id uuid not null default gen_random_uuid(),
  section_id uuid,                          -- null = 운영자 템플릿(기관 공용)
  name text not null,
  criteria jsonb not null default '[]',     -- [{key, name, levels:[{label, score, desc}]}]
  is_template boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (tenant_id, rubric_id)
);
create table if not exists lms_assignment (
  tenant_id text not null references tenants(id) on delete cascade,
  asg_id uuid not null default gen_random_uuid(),
  section_id uuid not null,
  title text not null, body text not null default '',
  kind text not null default 'individual' check (kind in ('individual', 'team')),
  submit_types text[] not null default '{text,file}',
  max_files smallint not null default 5,
  open_at timestamptz, due_at timestamptz, late_until timestamptz,
  late_penalty_pct numeric(5,2) not null default 0,
  max_score numeric(7,2) not null default 100,
  rubric_id uuid,
  plag_on boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, asg_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create index if not exists lms_asg_sec on lms_assignment (tenant_id, section_id);
create table if not exists lms_asg_team (
  tenant_id text not null, team_id uuid not null default gen_random_uuid(), asg_id uuid not null,
  name text not null, members uuid[] not null default '{}',
  primary key (tenant_id, team_id),
  foreign key (tenant_id, asg_id) references lms_assignment (tenant_id, asg_id) on delete cascade
);
create table if not exists lms_submission (
  tenant_id text not null, sub_id uuid not null default gen_random_uuid(), asg_id uuid not null,
  owner_key text not null,                  -- 'p:<person>' 또는 't:<team>'
  person_id uuid, team_id uuid,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'graded', 'returned')),
  body text not null default '', files jsonb not null default '[]',
  version int not null default 0, saved_at timestamptz, submitted_at timestamptz, late boolean not null default false,
  score numeric(7,2), rubric_scores jsonb not null default '{}', feedback text, annotations jsonb not null default '[]', feedback_files jsonb not null default '[]',
  graded_by uuid, graded_at timestamptz, ip text,
  primary key (tenant_id, sub_id), unique (tenant_id, asg_id, owner_key),
  foreign key (tenant_id, asg_id) references lms_assignment (tenant_id, asg_id) on delete cascade
);
create table if not exists lms_submission_ver (
  tenant_id text not null, sub_id uuid not null, ver int not null,
  body text not null, files jsonb not null, by_ref text, note text, at timestamptz not null default now(),
  primary key (tenant_id, sub_id, ver),
  foreign key (tenant_id, sub_id) references lms_submission (tenant_id, sub_id) on delete cascade
);
create table if not exists lms_plag_result (
  tenant_id text not null, sub_id uuid not null,
  engine text not null, status text not null check (status in ('queued', 'done', 'error')),
  similarity numeric(5,2), matches jsonb not null default '[]',
  requested_at timestamptz not null default now(), finished_at timestamptz,
  primary key (tenant_id, sub_id),
  foreign key (tenant_id, sub_id) references lms_submission (tenant_id, sub_id) on delete cascade
);
do $$ declare t text; begin
  foreach t in array array['lms_file','lms_rubric','lms_assignment','lms_asg_team','lms_submission','lms_submission_ver','lms_plag_result'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
end $$;

-- ── 내부 도우미(E) ──
create or replace function lms_e_asg(id uuid) returns lms_assignment language plpgsql as $$
declare r lms_assignment;
begin
  select * into r from lms_assignment where asg_id = id;
  if r.asg_id is null then perform lms_x_err(404, 'assignment', '없는 과제입니다.'); end if;
  return r;
end $$;
create or replace function lms_e_asg_json(r lms_assignment) returns jsonb language sql stable as $$
  select jsonb_build_object('asg_id', r.asg_id, 'section_id', r.section_id, 'title', r.title, 'body', r.body, 'kind', r.kind,
    'submit_types', to_jsonb(r.submit_types), 'max_files', r.max_files, 'open_at', lms_x_ts(r.open_at), 'due_at', lms_x_ts(r.due_at),
    'late_until', lms_x_ts(r.late_until), 'late_penalty_pct', lms_x_n(r.late_penalty_pct), 'max_score', lms_x_n(r.max_score),
    'rubric_id', r.rubric_id, 'plag_on', r.plag_on, 'status', r.status) $$;
create or replace function lms_e_rubric_json(id uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('rubric_id', rubric_id, 'section_id', section_id, 'name', name, 'criteria', criteria, 'is_template', is_template)
  from lms_rubric where rubric_id = id $$;
create or replace function lms_e_files_json(f jsonb) returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('file_id', x.file_id, 'name', x.name, 'mime', x.mime, 'size', x.size) order by o.n), '[]')
  from jsonb_array_elements_text(coalesce(f, '[]')) with ordinality o(v, n) join lms_file x on x.file_id::text = o.v $$;
-- 학습자의 제출 소유 키(팀 과제는 팀)
create or replace function lms_e_owner(r lms_assignment, pid uuid) returns text language plpgsql as $$
declare t uuid;
begin
  if r.kind = 'individual' then return 'p:' || pid; end if;
  select team_id into t from lms_asg_team where asg_id = r.asg_id and pid = any(members);
  if t is null then perform lms_x_err(409, 'no_team', '아직 팀이 배정되지 않았습니다. 교수자에게 문의하세요.'); end if;
  return 't:' || t;
end $$;
-- 파일 목록 검증: 본인(또는 팀원) 소유 파일만
create or replace function lms_e_check_files(a jsonb, k text, maxn int, refs text[]) returns jsonb language plpgsql as $$
declare out jsonb := '[]'; v text; n int := 0;
begin
  if a->k is null or jsonb_typeof(a->k) = 'null' then return '[]'; end if;
  if jsonb_typeof(a->k) <> 'array' then perform lms_x_err(400, 'files', '첨부 파일 목록 형식이 올바르지 않습니다.'); end if;
  for v in select jsonb_array_elements_text(a->k) loop
    n := n + 1;
    if n > maxn then perform lms_x_err(400, 'too_many', '첨부 파일은 ' || maxn || '개까지 올릴 수 있습니다.'); end if;
    if not exists (select 1 from lms_file where file_id::text = v and (refs is null or owner_ref = any(refs))) then
      perform lms_x_err(400, 'file', '첨부 파일을 찾을 수 없습니다. 다시 올려 주세요.'); end if;
    if not out ? v then out := out || to_jsonb(v); end if;
  end loop;
  return out;
end $$;

-- ── 파일(업로드 · 내려받기) ──
create or replace function lms_e_file_put(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare nm text := lms_x_str(a, 'name', 200, true, '파일 이름'); mm text := coalesce(lms_x_str(a, 'mime', 100, false, '파일 형식'), 'application/octet-stream');
  d bytea; kind text; ref text; id uuid;
begin
  if ctx->>'kind' = 'learner' then kind := 'learner'; ref := lms_x_learner(ctx)::text; else perform lms_x_staff(ctx); kind := 'staff'; ref := ctx->>'uid'; end if;
  if nm ~ '[/\\]' or nm ~ '[[:cntrl:]]' then perform lms_x_err(400, 'name', '파일 이름에 쓸 수 없는 문자가 있습니다.'); end if;
  if mm !~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$' then perform lms_x_err(400, 'mime', '파일 형식이 올바르지 않습니다.'); end if;
  begin d := decode(coalesce(a->>'b64', ''), 'base64'); exception when others then perform lms_x_err(400, 'b64', '파일 내용(base64)이 올바르지 않습니다.'); end;
  if d is null or length(d) = 0 then perform lms_x_err(400, 'empty', '빈 파일은 올릴 수 없습니다.'); end if;
  if length(d) > 2 * 1024 * 1024 then perform lms_x_err(413, 'too_large', '파일은 2MB까지 올릴 수 있습니다.'); end if;
  insert into lms_file (tenant_id, owner_kind, owner_ref, name, mime, size, sha256, data)
  values (lms_x_tid(), kind, ref, nm, mm, length(d), encode(sha256(d), 'hex'), d) returning file_id into id;
  return jsonb_build_object('file_id', id, 'name', nm, 'mime', mm, 'size', length(d), 'sha256', encode(sha256(d), 'hex'));
end $$;
create or replace function lms_e_file_get(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare id uuid := lms_x_uuid(a->>'id', '파일'); f lms_file; pid uuid;
begin
  select * into f from lms_file where file_id = id;
  if f.file_id is null then perform lms_x_err(404, 'file', '없는 파일입니다.'); end if;
  if ctx->>'kind' = 'learner' then
    pid := lms_x_learner(ctx);
    if not (f.owner_ref = pid::text
      or exists (select 1 from lms_submission s left join lms_asg_team t on t.team_id = s.team_id
                  where (s.person_id = pid or pid = any(t.members)) and (s.files ? id::text or s.feedback_files ? id::text))
      or exists (select 1 from lms_assignment g join lms_enrollment e on e.section_id = g.section_id and e.person_id = pid and e.status = 'enrolled'
                  where g.status <> 'draft' and g.body like '%' || id::text || '%')
      or (to_regclass('lms_exam_attempt') is not null and exists (select 1 from lms_f_learner_files(pid) x where x = id))) then
      perform lms_x_err(403, 'forbidden', '이 파일을 볼 권한이 없습니다.'); end if;
  else perform lms_x_staff(ctx); end if;
  return jsonb_build_object('file_id', f.file_id, 'name', f.name, 'mime', f.mime, 'size', f.size, 'sha256', f.sha256, 'b64', translate(encode(f.data, 'base64'), E'\n', ''));
end $$;

-- ── 분반 목록(E · F · H 화면 공용) ──
create or replace function lms_e_sections(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
begin
  perform lms_x_staff(ctx);
  return jsonb_build_object('sections', coalesce((select jsonb_agg(jsonb_build_object('section_id', s.section_id, 'term_id', s.term_id, 'course_code', s.course_code,
      'course_name', c.name, 'section_no', s.section_no, 'title', s.title,
      'regular', (select count(*) from lms_enrollment e where e.section_id = s.section_id and e.status = 'enrolled' and e.kind = 'regular'),
      'audit', (select count(*) from lms_enrollment e where e.section_id = s.section_id and e.status = 'enrolled' and e.kind = 'audit'))
      order by s.term_id desc, s.course_code, s.section_no)
    from (select * from lms_section where status <> 'archived' and (nullif(a->>'term', '') is null or term_id = a->>'term') order by term_id desc, course_code, section_no limit 500) s
    join lms_course c on c.course_code = s.course_code), '[]'));
end $$;

-- ── 과제(교수자) ──
create or replace function lms_e_list(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_x_uuid(a->>'section', '분반');
begin
  perform lms_x_staff(ctx); perform lms_x_section(sec);
  return jsonb_build_object('assignments', coalesce((select jsonb_agg(lms_e_asg_json(g) || jsonb_build_object(
      'submitted', (select count(*) from lms_submission s where s.asg_id = g.asg_id and s.status <> 'draft'),
      'graded', (select count(*) from lms_submission s where s.asg_id = g.asg_id and s.status in ('graded', 'returned')),
      'drafts', (select count(*) from lms_submission s where s.asg_id = g.asg_id and s.status = 'draft'),
      'targets', case when g.kind = 'team' then (select count(*) from lms_asg_team t where t.asg_id = g.asg_id)
                      else (select count(*) from lms_enrollment e where e.section_id = g.section_id and e.status = 'enrolled') end)
      order by g.due_at nulls last, g.created_at)
    from lms_assignment g where g.section_id = sec), '[]'));
end $$;

create or replace function lms_e_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare id uuid; sec uuid; r lms_assignment; ty text[]; rb uuid; ttl text; bd text; kd text; st text;
  op timestamptz; du timestamptz; lu timestamptz; pen numeric; mx numeric; mf numeric;
begin
  perform lms_x_staff(ctx);
  if nullif(a->>'asg_id', '') is not null then r := lms_e_asg(lms_x_uuid(a->>'asg_id', '과제')); sec := r.section_id;
  else sec := lms_x_uuid(a->>'section_id', '분반'); perform lms_x_section(sec); end if;
  ttl := lms_x_str(a, 'title', 200, true, '과제 제목');
  bd := coalesce(lms_x_str(a, 'body', 20000, false, '과제 설명'), '');
  kd := coalesce(a->>'kind', coalesce(r.kind, 'individual'));
  if kd not in ('individual', 'team') then perform lms_x_err(400, 'kind', '과제 유형은 개인 · 팀 중에서 고르세요.'); end if;
  st := coalesce(a->>'status', coalesce(r.status, 'draft'));
  if st not in ('draft', 'published', 'closed') then perform lms_x_err(400, 'status', '상태가 올바르지 않습니다.'); end if;
  if jsonb_typeof(a->'submit_types') = 'array' then
    select array_agg(distinct v order by v) into ty from jsonb_array_elements_text(a->'submit_types') v;
    if ty is null or not ty <@ array['file', 'text'] then perform lms_x_err(400, 'submit_types', '제출 방식은 온라인 문서(text) · 파일(file)에서 고르세요.'); end if;
  else ty := coalesce(r.submit_types, '{file,text}'); end if;
  op := lms_x_time(a, 'open_at', '공개'); du := lms_x_time(a, 'due_at', '마감'); lu := lms_x_time(a, 'late_until', '지각 제출 마감');
  if du is not null and op is not null and du < op then perform lms_x_err(400, 'due', '마감은 공개 이후여야 합니다.'); end if;
  if lu is not null and (du is null or lu < du) then perform lms_x_err(400, 'late', '지각 제출 마감은 마감 이후여야 합니다.'); end if;
  pen := lms_x_num(a, 'late_penalty_pct', 0, 100, 0, '지각 감점(%)');
  mx := lms_x_num(a, 'max_score', 1, 1000, 100, '만점');
  mf := lms_x_num(a, 'max_files', 0, 10, 5, '첨부 파일 수');
  rb := case when nullif(a->>'rubric_id', '') is null then null else lms_x_uuid(a->>'rubric_id', '루브릭') end;
  if rb is not null and not exists (select 1 from lms_rubric where rubric_id = rb and (section_id is null or section_id = sec)) then perform lms_x_err(400, 'rubric', '이 분반에서 쓸 수 없는 루브릭입니다.'); end if;
  if r.asg_id is null then
    insert into lms_assignment (tenant_id, section_id, title, body, kind, submit_types, max_files, open_at, due_at, late_until, late_penalty_pct, max_score, rubric_id, plag_on, status, created_by)
    values (lms_x_tid(), sec, ttl, bd, kd, ty, mf, op, du, lu, pen, mx, rb, lms_x_bool(a, 'plag_on', false), st, lms_x_uid(ctx)) returning * into r;
  else
    update lms_assignment set title = ttl, body = bd, kind = kd, submit_types = ty, max_files = mf, open_at = op, due_at = du, late_until = lu,
      late_penalty_pct = pen, max_score = mx, rubric_id = rb, plag_on = lms_x_bool(a, 'plag_on', r.plag_on), status = st, updated_at = now()
    where asg_id = r.asg_id returning * into r;
  end if;
  perform lms_x_grade_link(sec, 'asg:' || r.asg_id, 'assignment', r.title, r.max_score);
  return jsonb_build_object('assignment', lms_e_asg_json(r), '_audit', lms_x_audit('lms.e.save', jsonb_build_object('asg', r.asg_id, 'status', r.status)));
end $$;

create or replace function lms_e_delete(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_assignment;
begin
  perform lms_x_staff(ctx); r := lms_e_asg(lms_x_uuid(a->>'asg_id', '과제'));
  if exists (select 1 from lms_submission where asg_id = r.asg_id and status <> 'draft') and not lms_x_bool(a, 'force', false) then
    perform lms_x_err(409, 'has_submissions', '제출물이 있는 과제입니다. 정말 지우려면 force를 켜세요.'); end if;
  delete from lms_grade_item where section_id = r.section_id and source_ref = 'asg:' || r.asg_id;
  delete from lms_assignment where asg_id = r.asg_id;
  return jsonb_build_object('ok', true, '_audit', lms_x_audit('lms.e.delete', jsonb_build_object('asg', r.asg_id)));
end $$;

-- 제출 현황(정규 · 청강 모두 표시, 성적 반영은 정규만)
create or replace function lms_e_status(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_assignment; rows jsonb;
begin
  perform lms_x_staff(ctx); r := lms_e_asg(lms_x_uuid(a->>'asg', '과제'));
  if r.kind = 'team' then
    select coalesce(jsonb_agg(jsonb_build_object('owner', 't:' || t.team_id, 'team', t.name,
        'members', (select coalesce(jsonb_agg(p.member_no order by p.member_no), '[]') from lms_person p where p.person_id = any(t.members)),
        'sub_id', s.sub_id, 'status', coalesce(s.status, 'none'), 'version', coalesce(s.version, 0), 'saved_at', lms_x_ts(s.saved_at), 'submitted_at', lms_x_ts(s.submitted_at),
        'late', coalesce(s.late, false), 'score', lms_x_n(s.score), 'files', coalesce(jsonb_array_length(s.files), 0), 'similarity', lms_x_n(pr.similarity)) order by t.name), '[]')
      into rows from lms_asg_team t left join lms_submission s on s.asg_id = r.asg_id and s.owner_key = 't:' || t.team_id
      left join lms_plag_result pr on pr.sub_id = s.sub_id where t.asg_id = r.asg_id;
  else
    select coalesce(jsonb_agg(jsonb_build_object('owner', 'p:' || p.person_id, 'member_no', p.member_no, 'unit_code', p.unit_code, 'enroll', e.kind,
        'sub_id', s.sub_id, 'status', coalesce(s.status, 'none'), 'version', coalesce(s.version, 0), 'saved_at', lms_x_ts(s.saved_at), 'submitted_at', lms_x_ts(s.submitted_at),
        'late', coalesce(s.late, false), 'score', lms_x_n(s.score), 'files', coalesce(jsonb_array_length(s.files), 0), 'similarity', lms_x_n(pr.similarity)) order by p.member_no), '[]')
      into rows from lms_enrollment e join lms_person p on p.person_id = e.person_id
      left join lms_submission s on s.asg_id = r.asg_id and s.owner_key = 'p:' || p.person_id
      left join lms_plag_result pr on pr.sub_id = s.sub_id
      where e.section_id = r.section_id and e.status = 'enrolled';
  end if;
  return jsonb_build_object('assignment', lms_e_asg_json(r), 'rubric', case when r.rubric_id is null then null else lms_e_rubric_json(r.rubric_id) end, 'rows', rows,
    'counts', jsonb_build_object('none', (select count(*) from jsonb_array_elements(rows) x where x->>'status' = 'none'),
      'draft', (select count(*) from jsonb_array_elements(rows) x where x->>'status' = 'draft'),
      'submitted', (select count(*) from jsonb_array_elements(rows) x where x->>'status' = 'submitted'),
      'graded', (select count(*) from jsonb_array_elements(rows) x where x->>'status' in ('graded', 'returned')),
      'late', (select count(*) from jsonb_array_elements(rows) x where (x->>'late')::boolean)));
end $$;

create or replace function lms_e_sub_json(s lms_submission, staff boolean) returns jsonb language sql stable as $$
  select jsonb_build_object('sub_id', s.sub_id, 'asg_id', s.asg_id, 'owner', s.owner_key, 'status', s.status, 'body', s.body, 'files', lms_e_files_json(s.files),
    'version', s.version, 'saved_at', lms_x_ts(s.saved_at), 'submitted_at', lms_x_ts(s.submitted_at), 'late', s.late,
    'score', lms_x_n(s.score), 'rubric_scores', s.rubric_scores, 'feedback', s.feedback, 'annotations', s.annotations,
    'feedback_files', lms_e_files_json(s.feedback_files), 'graded_at', lms_x_ts(s.graded_at))
    || case when staff then jsonb_build_object('ip', s.ip,
         'member_no', (select member_no from lms_person where person_id = s.person_id),
         'team', (select name from lms_asg_team where team_id = s.team_id)) else '{}'::jsonb end $$;

create or replace function lms_e_sub(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_submission;
begin
  perform lms_x_staff(ctx);
  select * into s from lms_submission where sub_id = lms_x_uuid(a->>'id', '제출물');
  if s.sub_id is null then perform lms_x_err(404, 'submission', '없는 제출물입니다.'); end if;
  return jsonb_build_object('submission', lms_e_sub_json(s, true),
    'plagiarism', (select jsonb_build_object('engine', engine, 'status', status, 'similarity', lms_x_n(similarity), 'matches', matches, 'finished_at', lms_x_ts(finished_at)) from lms_plag_result where sub_id = s.sub_id));
end $$;

-- 채점 반영(점수 → 성적 항목, 팀 과제는 팀원 모두)
create or replace function lms_e_apply_grade(r lms_assignment, s lms_submission, by_uid uuid) returns void language plpgsql as $$
declare item uuid; p uuid;
begin
  if s.score is null then return; end if;
  item := lms_x_grade_link(r.section_id, 'asg:' || r.asg_id, 'assignment', r.title, r.max_score);
  if s.team_id is not null then
    for p in select unnest(members) from lms_asg_team where team_id = s.team_id loop perform lms_x_grade_put(r.section_id, item, p, s.score, null, by_uid); end loop;
  else perform lms_x_grade_put(r.section_id, item, s.person_id, s.score, null, by_uid); end if;
end $$;

create or replace function lms_e_grade(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_submission; r lms_assignment; rub jsonb; sc numeric; rs jsonb := '{}'; c jsonb; lv numeric; tot numeric := 0; full_ numeric := 0; ff jsonb; ann jsonb;
begin
  perform lms_x_staff(ctx);
  select * into s from lms_submission where sub_id = lms_x_uuid(a->>'sub_id', '제출물');
  if s.sub_id is null then perform lms_x_err(404, 'submission', '없는 제출물입니다.'); end if;
  r := lms_e_asg(s.asg_id);
  if s.status = 'draft' and not lms_x_bool(a, 'allow_draft', false) then perform lms_x_err(409, 'not_submitted', '아직 제출하지 않은 과제입니다.'); end if;
  if jsonb_typeof(a->'rubric_scores') = 'object' and r.rubric_id is not null then
    select criteria into rub from lms_rubric where rubric_id = r.rubric_id;
    for c in select * from jsonb_array_elements(rub) loop
      select max((l->>'score')::numeric) into lv from jsonb_array_elements(c->'levels') l; full_ := full_ + coalesce(lv, 0);
      if a->'rubric_scores' ? (c->>'key') then
        begin lv := (a->'rubric_scores'->>(c->>'key'))::numeric; exception when others then perform lms_x_err(400, 'rubric_score', '루브릭 점수는 숫자로 입력하세요.'); end;
        if not exists (select 1 from jsonb_array_elements(c->'levels') l where (l->>'score')::numeric = lv) then
          perform lms_x_err(400, 'rubric_level', '「' || (c->>'name') || '」 기준에 없는 수준 점수입니다.'); end if;
        tot := tot + lv; rs := rs || jsonb_build_object(c->>'key', lms_x_n(lv));
      end if;
    end loop;
    sc := case when full_ > 0 then round(tot / full_ * r.max_score, 2) else 0 end;
  else sc := lms_x_num(a, 'score', 0, r.max_score, s.score, '점수'); end if;
  if sc is not null and s.late and r.late_penalty_pct > 0 and not lms_x_bool(a, 'no_penalty', false) then sc := round(sc * (100 - r.late_penalty_pct) / 100, 2); end if;
  ff := lms_e_check_files(a, 'feedback_files', 10, null);
  ann := case when jsonb_typeof(a->'annotations') = 'array' then (select coalesce(jsonb_agg(jsonb_build_object('quote', left(coalesce(x->>'quote', ''), 500), 'comment', left(coalesce(x->>'comment', ''), 2000))), '[]') from (select * from jsonb_array_elements(a->'annotations') limit 100) t(x)) else s.annotations end;
  update lms_submission set score = sc, rubric_scores = rs, feedback = coalesce(lms_x_str(a, 'feedback', 10000, false, '피드백'), feedback),
    annotations = ann, feedback_files = case when a ? 'feedback_files' then ff else feedback_files end,
    status = case when lms_x_bool(a, 'return', false) then 'returned' else 'graded' end, graded_by = lms_x_uid(ctx), graded_at = now()
  where sub_id = s.sub_id returning * into s;
  perform lms_e_apply_grade(r, s, lms_x_uid(ctx));
  return jsonb_build_object('submission', lms_e_sub_json(s, true), '_audit', lms_x_audit('lms.e.grade', jsonb_build_object('sub', s.sub_id, 'score', lms_x_n(s.score))));
end $$;

create or replace function lms_e_bulk_feedback(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_assignment; s lms_submission; n int := 0; fb text := lms_x_str(a, 'feedback', 10000, true, '피드백'); sc numeric;
begin
  perform lms_x_staff(ctx); r := lms_e_asg(lms_x_uuid(a->>'asg_id', '과제'));
  sc := lms_x_num(a, 'score', 0, r.max_score, null, '점수');
  for s in select * from lms_submission where asg_id = r.asg_id and status <> 'draft'
    and (lms_x_bool(a, 'all', false) or (jsonb_typeof(a->'sub_ids') = 'array' and a->'sub_ids' ? sub_id::text)) loop
    update lms_submission set feedback = case when coalesce(feedback, '') = '' then fb else feedback || E'\n\n' || fb end,
      score = coalesce(sc, score), status = case when coalesce(sc, score) is not null then 'graded' else status end,
      graded_by = lms_x_uid(ctx), graded_at = now() where sub_id = s.sub_id returning * into s;
    perform lms_e_apply_grade(r, s, lms_x_uid(ctx)); n := n + 1;
  end loop;
  if n = 0 then perform lms_x_err(400, 'empty', '피드백을 보낼 제출물을 고르세요.'); end if;
  return jsonb_build_object('updated', n, '_audit', lms_x_audit('lms.e.bulk_feedback', jsonb_build_object('asg', r.asg_id, 'n', n)));
end $$;

-- 일괄 다운로드: 학번(팀)/파일 경로 목록 + 내용(base64). 묶기(zip)는 화면이 한다.
create or replace function lms_e_bundle(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_assignment; out jsonb := '[]'; s record; f record; tot bigint := 0;
begin
  perform lms_x_staff(ctx); r := lms_e_asg(lms_x_uuid(a->>'asg', '과제'));
  for s in select x.*, coalesce(p.member_no, t.name, 'unknown') who from lms_submission x left join lms_person p on p.person_id = x.person_id and x.team_id is null
           left join lms_asg_team t on t.team_id = x.team_id where x.asg_id = r.asg_id and x.status <> 'draft' order by 2 loop
    if s.body <> '' then out := out || jsonb_build_object('path', s.who || '/본문.txt', 'b64', translate(encode(convert_to(s.body, 'UTF8'), 'base64'), E'\n', '')); end if;
    for f in select lf.* from jsonb_array_elements_text(s.files) v join lms_file lf on lf.file_id::text = v loop
      tot := tot + f.size; if tot > 20 * 1024 * 1024 then perform lms_x_err(413, 'too_large', '내려받을 파일이 20MB를 넘습니다. 제출물을 나눠 받으세요.'); end if;
      out := out || jsonb_build_object('path', s.who || '/' || f.name, 'b64', translate(encode(f.data, 'base64'), E'\n', ''));
    end loop;
  end loop;
  return jsonb_build_object('name', r.title, 'files', out, '_audit', lms_x_audit('lms.e.bundle', jsonb_build_object('asg', r.asg_id, 'n', jsonb_array_length(out))));
end $$;

-- 루브릭(운영자 템플릿 + 분반 루브릭)
create or replace function lms_e_rubrics(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := case when nullif(a->>'section', '') is null then null else lms_x_uuid(a->>'section', '분반') end;
begin
  perform lms_x_staff(ctx);
  return jsonb_build_object('rubrics', coalesce((select jsonb_agg(lms_e_rubric_json(rubric_id) order by is_template desc, name)
    from lms_rubric where section_id is null or section_id = sec), '[]'));
end $$;
create or replace function lms_e_rubric_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare id uuid; sec uuid; tpl boolean := lms_x_bool(a, 'is_template', false); crit jsonb := '[]'; c jsonb; l jsonb; i int := 0; lv jsonb; nm text;
begin
  perform lms_x_staff(ctx);
  if tpl then perform lms_x_admin(ctx); sec := null; else sec := lms_x_uuid(a->>'section_id', '분반'); perform lms_x_section(sec); end if;
  nm := lms_x_str(a, 'name', 100, true, '루브릭 이름');
  if jsonb_typeof(a->'criteria') <> 'array' or jsonb_array_length(a->'criteria') = 0 or jsonb_array_length(a->'criteria') > 20 then
    perform lms_x_err(400, 'criteria', '평가 기준을 1~20개 입력하세요.'); end if;
  for c in select * from jsonb_array_elements(a->'criteria') loop
    i := i + 1; lv := '[]';
    if jsonb_typeof(c) <> 'object' or nullif(btrim(coalesce(c->>'name', '')), '') is null then perform lms_x_err(400, 'criteria', i || '번째 평가 기준 이름을 입력하세요.'); end if;
    if jsonb_typeof(c->'levels') <> 'array' or jsonb_array_length(c->'levels') = 0 or jsonb_array_length(c->'levels') > 10 then perform lms_x_err(400, 'levels', '「' || (c->>'name') || '」 수준을 1~10개 입력하세요.'); end if;
    for l in select * from jsonb_array_elements(c->'levels') loop
      begin lv := lv || jsonb_build_object('label', left(coalesce(l->>'label', ''), 40), 'score', lms_x_n((l->>'score')::numeric), 'desc', left(coalesce(l->>'desc', ''), 500));
      exception when others then perform lms_x_err(400, 'levels', '「' || (c->>'name') || '」 수준 점수는 숫자로 입력하세요.'); end;
    end loop;
    crit := crit || jsonb_build_object('key', coalesce(nullif(left(c->>'key', 20), ''), 'c' || i), 'name', left(c->>'name', 100), 'levels', lv);
  end loop;
  if nullif(a->>'rubric_id', '') is not null then
    id := lms_x_uuid(a->>'rubric_id', '루브릭');
    update lms_rubric set name = nm, criteria = crit where rubric_id = id and is_template = tpl and section_id is not distinct from sec;
    if not found then perform lms_x_err(404, 'rubric', '없는 루브릭입니다.'); end if;
  else
    insert into lms_rubric (tenant_id, section_id, name, criteria, is_template) values (lms_x_tid(), sec, nm, crit, tpl) returning rubric_id into id;
  end if;
  return jsonb_build_object('rubric', lms_e_rubric_json(id), '_audit', lms_x_audit('lms.e.rubric_save', jsonb_build_object('rubric', id, 'template', tpl)));
end $$;

-- 팀 편성(직접 · 자동)
create or replace function lms_e_teams(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_assignment; t jsonb; mem uuid[]; m text; pid uuid; seen uuid[] := '{}'; sz int; i int := 0; p record; cur uuid[] := '{}';
begin
  perform lms_x_staff(ctx); r := lms_e_asg(lms_x_uuid(a->>'asg_id', '과제'));
  if r.kind <> 'team' then perform lms_x_err(400, 'kind', '팀 과제에서만 팀을 편성할 수 있습니다.'); end if;
  if exists (select 1 from lms_submission where asg_id = r.asg_id) then perform lms_x_err(409, 'has_submissions', '이미 작성 중인 팀이 있어 다시 편성할 수 없습니다.'); end if;
  delete from lms_asg_team where asg_id = r.asg_id;
  if nullif(a->>'auto', '') is not null then
    sz := lms_x_num(a, 'auto', 2, 20, 3, '팀 인원')::int;
    for p in select e.person_id from lms_enrollment e where e.section_id = r.section_id and e.status = 'enrolled' order by random() loop
      cur := cur || p.person_id;
      if array_length(cur, 1) = sz then i := i + 1; insert into lms_asg_team (tenant_id, asg_id, name, members) values (lms_x_tid(), r.asg_id, i || '팀', cur); cur := '{}'; end if;
    end loop;
    if array_length(cur, 1) > 0 then
      if i = 0 then insert into lms_asg_team (tenant_id, asg_id, name, members) values (lms_x_tid(), r.asg_id, '1팀', cur);
      else update lms_asg_team set members = members || cur where team_id = (select team_id from lms_asg_team where asg_id = r.asg_id order by name desc limit 1); end if;
    end if;
  else
    if jsonb_typeof(a->'teams') <> 'array' then perform lms_x_err(400, 'teams', '팀 목록을 입력하세요.'); end if;
    for t in select * from jsonb_array_elements(a->'teams') loop
      i := i + 1; mem := '{}';
      for m in select jsonb_array_elements_text(coalesce(t->'members', '[]')) loop
        select p2.person_id into pid from lms_person p2 join lms_enrollment e on e.person_id = p2.person_id and e.section_id = r.section_id and e.status = 'enrolled' where p2.member_no = m;
        if pid is null then perform lms_x_err(400, 'member', '수강생이 아닌 학번입니다: ' || m); end if;
        if pid = any(seen) then perform lms_x_err(400, 'dup', '한 학생을 두 팀에 넣을 수 없습니다: ' || m); end if;
        seen := seen || pid; mem := mem || pid;
      end loop;
      insert into lms_asg_team (tenant_id, asg_id, name, members) values (lms_x_tid(), r.asg_id, coalesce(nullif(left(t->>'name', 40), ''), i || '팀'), mem);
    end loop;
  end if;
  return jsonb_build_object('teams', coalesce((select jsonb_agg(jsonb_build_object('team_id', team_id, 'name', name,
      'members', (select coalesce(jsonb_agg(p3.member_no order by p3.member_no), '[]') from lms_person p3 where p3.person_id = any(members))) order by name)
    from lms_asg_team where asg_id = r.asg_id), '[]'), '_audit', lms_x_audit('lms.e.teams', jsonb_build_object('asg', r.asg_id)));
end $$;

-- 표절 검사: 연동 지점. 엔진 미연결 상태에서는 「강좌 내 상호 비교」 모의 어댑터(단어 집합 Jaccard)로 결과 형식만 채운다.
create or replace function lms_e_words(t text) returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct w), '{}') from regexp_split_to_table(lower(coalesce(t, '')), '[^[:alnum:]가-힣]+') w where length(w) >= 2 $$;
create or replace function lms_e_plag_run(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_assignment; s record; o record; best numeric; m jsonb; n int := 0; sim numeric;
begin
  perform lms_x_staff(ctx); r := lms_e_asg(lms_x_uuid(a->>'asg_id', '과제'));
  for s in select sub_id, owner_key, lms_e_words(body) w from lms_submission where asg_id = r.asg_id and status <> 'draft' loop
    best := 0; m := '[]';
    for o in select x.sub_id, coalesce(p.member_no, t.name) who, lms_e_words(x.body) w from lms_submission x left join lms_person p on p.person_id = x.person_id and x.team_id is null
             left join lms_asg_team t on t.team_id = x.team_id where x.asg_id = r.asg_id and x.status <> 'draft' and x.sub_id <> s.sub_id loop
      sim := case when cardinality(s.w) + cardinality(o.w) = 0 then 0 else
        round(100.0 * (select count(*) from (select unnest(s.w) intersect select unnest(o.w)) q) / (select count(*) from (select unnest(s.w) union select unnest(o.w)) q), 2) end;
      if sim > 0 then m := m || jsonb_build_object('source', '강좌 내 제출물 ' || o.who, 'pct', lms_x_n(sim)); end if;
      if sim > best then best := sim; end if;
    end loop;
    m := coalesce((select jsonb_agg(x order by (x->>'pct')::numeric desc) from (select x from jsonb_array_elements(m) x order by (x->>'pct')::numeric desc limit 3) q), '[]');
    insert into lms_plag_result (tenant_id, sub_id, engine, status, similarity, matches, requested_at, finished_at)
    values (lms_x_tid(), s.sub_id, 'stub-local', 'done', best, m, now(), now())
    on conflict (tenant_id, sub_id) do update set engine = excluded.engine, status = 'done', similarity = excluded.similarity, matches = excluded.matches, requested_at = now(), finished_at = now();
    n := n + 1;
  end loop;
  return lms_e_plag(ctx, jsonb_build_object('asg', r.asg_id)) || jsonb_build_object('checked', n, '_audit', lms_x_audit('lms.e.plag_run', jsonb_build_object('asg', r.asg_id, 'n', n)));
end $$;
create or replace function lms_e_plag(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_assignment;
begin
  perform lms_x_staff(ctx); r := lms_e_asg(lms_x_uuid(a->>'asg', '과제'));
  return jsonb_build_object('engine', jsonb_build_object('name', 'stub-local', 'connected', false,
      'note', '모사 검색 엔진 미연결 — 강좌 내 제출물 상호 비교(데모 어댑터) 결과입니다. 연동 후 동작: 외부 표절 검사 엔진에 제출물을 보내고 결과를 이 형식으로 받습니다.'),
    'results', coalesce((select jsonb_agg(jsonb_build_object('sub_id', s.sub_id, 'owner', coalesce(p.member_no, t.name), 'engine', pr.engine, 'status', pr.status,
        'similarity', lms_x_n(pr.similarity), 'matches', pr.matches, 'finished_at', lms_x_ts(pr.finished_at)) order by pr.similarity desc nulls last, 2)
      from lms_submission s join lms_plag_result pr on pr.sub_id = s.sub_id left join lms_person p on p.person_id = s.person_id and s.team_id is null
      left join lms_asg_team t on t.team_id = s.team_id where s.asg_id = r.asg_id), '[]'));
end $$;

-- ── 학습자 ──
create or replace function lms_e_my(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare pid uuid := lms_x_learner(ctx); sec uuid := lms_x_uuid(a->>'section', '분반'); hidden boolean;
begin
  if lms_x_enr(sec, pid) is null then perform lms_x_err(403, 'not_enrolled', '수강 중인 분반이 아닙니다.'); end if;
  hidden := to_regclass('lms_grade_policy') is not null and lms_h_hidden(sec);
  return jsonb_build_object('assignments', coalesce((select jsonb_agg(lms_e_asg_json(g) || jsonb_build_object(
      'rubric', case when g.rubric_id is null then null else lms_e_rubric_json(g.rubric_id) end,
      'team', (select jsonb_build_object('team_id', t.team_id, 'name', t.name, 'members', (select coalesce(jsonb_agg(p.member_no order by p.member_no), '[]') from lms_person p where p.person_id = any(t.members)))
               from lms_asg_team t where t.asg_id = g.asg_id and pid = any(t.members)),
      'submission', (select case when hidden then lms_e_sub_json(s, false) || jsonb_build_object('score', null, 'rubric_scores', '{}'::jsonb, 'score_hidden', true)
                                 when s.status in ('graded', 'returned') then lms_e_sub_json(s, false)
                                 else lms_e_sub_json(s, false) || jsonb_build_object('score', null, 'rubric_scores', '{}'::jsonb, 'feedback', null, 'annotations', '[]'::jsonb, 'feedback_files', '[]'::jsonb) end
                     from lms_submission s where s.asg_id = g.asg_id and (s.owner_key = 'p:' || pid or s.team_id in (select team_id from lms_asg_team where asg_id = g.asg_id and pid = any(members)))))
      order by g.due_at nulls last, g.created_at)
    from lms_assignment g where g.section_id = sec and g.status <> 'draft' and (g.open_at is null or g.open_at <= now())), '[]'), 'now', lms_x_ts(now()));
end $$;

create or replace function lms_e_learner_sub(ctx jsonb, asg uuid, out r lms_assignment, out s lms_submission, out pid uuid, out okey text) language plpgsql as $$
begin
  pid := lms_x_learner(ctx); r := lms_e_asg(asg);
  if lms_x_enr(r.section_id, pid) is null or r.status = 'draft' then perform lms_x_err(403, 'not_enrolled', '제출할 수 없는 과제입니다.'); end if;
  okey := lms_e_owner(r, pid);
  select * into s from lms_submission where asg_id = r.asg_id and owner_key = okey;
end $$;

-- 초안 자동 저장(팀 과제: base_version으로 동시 편집 충돌 확인 · 저장마다 버전 기록)
create or replace function lms_e_draft(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare x record; r lms_assignment; s0 lms_submission; pid uuid; okey text; bd text := coalesce(lms_x_str(a, 'body', 200000, false, '본문'), ''); fl jsonb; refs text[]; bv int; s lms_submission;
begin
  select * into x from lms_e_learner_sub(ctx, lms_x_uuid(a->>'asg_id', '과제')); r := x.r; s0 := x.s; pid := x.pid; okey := x.okey;
  if r.status = 'closed' or (now() > coalesce(r.late_until, r.due_at)) then perform lms_x_err(409, 'closed', '제출 기간이 끝났습니다.'); end if;
  if r.open_at is not null and now() < r.open_at then perform lms_x_err(409, 'not_open', '아직 공개되지 않은 과제입니다.'); end if;
  if s0.status in ('submitted', 'graded', 'returned') then perform lms_x_err(409, 'submitted', '이미 제출했습니다. 수정하려면 제출을 취소하세요.'); end if;
  if not ('text' = any(r.submit_types)) and bd <> '' then perform lms_x_err(400, 'text_off', '이 과제는 파일로만 제출합니다.'); end if;
  refs := case when r.kind = 'team' then (select array_agg(m::text) from lms_asg_team t, unnest(t.members) m where 't:' || t.team_id = okey) else array[pid::text] end;
  fl := case when a ? 'files' then lms_e_check_files(a, 'files', case when 'file' = any(r.submit_types) then r.max_files else 0 end, refs) else coalesce(s0.files, '[]') end;
  bv := lms_x_num(a, 'base_version', 0, 1000000, null, '기준 버전')::int;
  if s0.sub_id is not null and bv is not null and bv <> s0.version then
    perform lms_x_err(409, 'conflict', '다른 팀원이 먼저 저장했습니다(현재 버전 ' || s0.version || '). 새로 불러온 뒤 다시 저장하세요.'); end if;
  if s0.sub_id is null then
    insert into lms_submission (tenant_id, asg_id, owner_key, person_id, team_id, body, files, version, saved_at, ip)
    values (lms_x_tid(), r.asg_id, okey, pid, case when okey like 't:%' then substr(okey, 3)::uuid end, bd, fl, 1, now(), lms_x_ip(ctx->>'ip')) returning * into s;
    insert into lms_submission_ver (tenant_id, sub_id, ver, body, files, by_ref, note) values (lms_x_tid(), s.sub_id, 1, bd, fl, ctx->>'sid', lms_x_str(a, 'note', 200, false, '메모'));
  elsif s0.body is distinct from bd or s0.files is distinct from fl then
    update lms_submission set body = bd, files = fl, version = version + 1, saved_at = now(), person_id = pid, ip = lms_x_ip(ctx->>'ip') where sub_id = s0.sub_id returning * into s;
    insert into lms_submission_ver (tenant_id, sub_id, ver, body, files, by_ref, note) values (lms_x_tid(), s.sub_id, s.version, bd, fl, ctx->>'sid', lms_x_str(a, 'note', 200, false, '메모'));
    delete from lms_submission_ver where sub_id = s.sub_id and ver <= s.version - 50;
  else s := s0; end if;
  return jsonb_build_object('submission', lms_e_sub_json(s, false), 'saved', true);
end $$;

create or replace function lms_e_submit(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare x record; r lms_assignment; s0 lms_submission; pid uuid; okey text; s lms_submission;
begin
  select * into x from lms_e_learner_sub(ctx, lms_x_uuid(a->>'asg_id', '과제')); r := x.r; s0 := x.s; pid := x.pid; okey := x.okey;
  if s0.sub_id is null then perform lms_x_err(400, 'empty', '먼저 내용을 작성하거나 파일을 올리세요.'); end if;
  if lms_x_bool(a, 'cancel', false) then
    if s0.status <> 'submitted' then perform lms_x_err(409, 'state', '제출 상태에서만 취소할 수 있습니다.'); end if;
    if now() > coalesce(r.late_until, r.due_at) then perform lms_x_err(409, 'closed', '제출 기간이 끝나 취소할 수 없습니다.'); end if;
    update lms_submission set status = 'draft', submitted_at = null, late = false where sub_id = s0.sub_id returning * into s;
    return jsonb_build_object('submission', lms_e_sub_json(s, false), '_audit', lms_x_audit('lms.e.unsubmit', jsonb_build_object('sub', s.sub_id)));
  end if;
  if s0.status <> 'draft' then perform lms_x_err(409, 'submitted', '이미 제출했습니다.'); end if;
  if r.status = 'closed' or now() > coalesce(r.late_until, r.due_at) then perform lms_x_err(409, 'closed', '제출 기간이 끝났습니다.'); end if;
  if btrim(s0.body) = '' and jsonb_array_length(s0.files) = 0 then perform lms_x_err(400, 'empty', '본문이나 첨부 파일이 있어야 제출할 수 있습니다.'); end if;
  update lms_submission set status = 'submitted', submitted_at = now(), late = (r.due_at is not null and now() > r.due_at), person_id = pid, ip = lms_x_ip(ctx->>'ip')
  where sub_id = s0.sub_id returning * into s;
  if r.plag_on then insert into lms_plag_result (tenant_id, sub_id, engine, status) values (lms_x_tid(), s.sub_id, 'stub-local', 'queued')
    on conflict (tenant_id, sub_id) do update set status = 'queued', requested_at = now(); end if;
  return jsonb_build_object('submission', lms_e_sub_json(s, false), '_audit', lms_x_audit('lms.e.submit', jsonb_build_object('sub', s.sub_id, 'late', s.late)));
end $$;

create or replace function lms_e_sub_access(ctx jsonb, id uuid) returns lms_submission language plpgsql as $$
declare s lms_submission; pid uuid;
begin
  select * into s from lms_submission where sub_id = id;
  if s.sub_id is null then perform lms_x_err(404, 'submission', '없는 제출물입니다.'); end if;
  if ctx->>'kind' = 'learner' then
    pid := lms_x_learner(ctx);
    if not (s.owner_key = 'p:' || pid or exists (select 1 from lms_asg_team t where t.team_id = s.team_id and pid = any(t.members))) then
      perform lms_x_err(403, 'forbidden', '이 제출물을 볼 권한이 없습니다.'); end if;
  else perform lms_x_staff(ctx); end if;
  return s;
end $$;
create or replace function lms_e_versions(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_submission := lms_e_sub_access(ctx, lms_x_uuid(a->>'sub', '제출물'));
begin
  return jsonb_build_object('sub_id', s.sub_id, 'current', s.version, 'versions', coalesce((select jsonb_agg(jsonb_build_object('ver', v.ver, 'by', v.by_ref, 'note', v.note, 'at', lms_x_ts(v.at),
      'chars', length(v.body), 'files', jsonb_array_length(v.files), 'body', v.body) order by v.ver desc) from lms_submission_ver v where v.sub_id = s.sub_id), '[]'));
end $$;
create or replace function lms_e_restore(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_submission := lms_e_sub_access(ctx, lms_x_uuid(a->>'sub_id', '제출물')); v lms_submission_ver; n int := lms_x_num(a, 'ver', 1, 1000000, null, '버전')::int;
begin
  if ctx->>'kind' <> 'learner' then perform lms_x_err(403, 'role', '작성자만 되돌릴 수 있습니다.'); end if;
  if s.status <> 'draft' then perform lms_x_err(409, 'submitted', '제출을 취소한 뒤 되돌리세요.'); end if;
  select * into v from lms_submission_ver where sub_id = s.sub_id and ver = n;
  if v.sub_id is null then perform lms_x_err(404, 'version', '없는 버전입니다.'); end if;
  update lms_submission set body = v.body, files = v.files, version = version + 1, saved_at = now() where sub_id = s.sub_id returning * into s;
  insert into lms_submission_ver (tenant_id, sub_id, ver, body, files, by_ref, note) values (lms_x_tid(), s.sub_id, s.version, v.body, v.files, ctx->>'sid', n || '번 버전으로 되돌림');
  return jsonb_build_object('submission', lms_e_sub_json(s, false));
end $$;
