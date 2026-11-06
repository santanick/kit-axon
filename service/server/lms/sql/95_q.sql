-- 묶음 Q — 비교과(SFR-092): 학교 「성장마루」 운영자 설명서의 절차를 디디쌤 안에 그대로 옮긴다.
-- 상태: 임시저장(draft) → 승인처리중(approving) → 접수대기(ready) → 접수중(recruiting) → 운영중(running) → 이수처리중(completing) → 마감처리중(closing) → 마감(closed)
-- 승인 · 마감보고서 승인은 교육혁신본부(정운영자 owner)가 일괄 처리, 나머지는 프로그램 개설 · 운영자(owner · sub, 운영자 지정)가 처리한다.
-- 신청 승인 방식 4종(자동 · 선착순 · 선착순+대기자 자동 승격 · 운영자 승인)은 프로그램 행 잠금(for update)으로 한 트랜잭션에서 처리.
-- 팀 신청 비밀번호는 lms_k_hash(솔트 + 반복 SHA-256)로만 저장. 마감 후에는 신청 · 출석 · 이수 · 지출을 고칠 수 없다.
-- 공통 도우미는 68_k.sql(lms_k_*), 만족도 설문은 묶음 K 표를 쓴다.

create table if not exists lms_q_group (
  tenant_id   text not null references tenants(id) on delete cascade,
  group_id    uuid not null default gen_random_uuid(),
  name        text not null check (length(name) between 1 and 60),
  sort        int not null default 0,
  primary key (tenant_id, group_id)
);
create table if not exists lms_q_program (
  tenant_id   text not null references tenants(id) on delete cascade,
  program_id  uuid not null default gen_random_uuid(),
  group_id    uuid,
  title       text not null check (length(title) between 1 and 120),
  summary     text not null default '',
  detail_html text not null default '',
  tags        text[] not null default '{}',
  cover_url   text not null default '',
  video_url   text not null default '',
  attachments jsonb not null default '[]',                -- [{name, key}] 저장소 키만
  kind        text not null default 'personal' check (kind in ('personal','team')),
  team_min    int not null default 2, team_max int not null default 6,
  place       text not null default '',
  starts_at   timestamptz, ends_at timestamptz,
  total_hours numeric(6,1) not null default 0,
  total_count int not null default 0,
  apply_from  timestamptz, apply_to timestamptz,
  capacity    int,                                        -- 개인: 명, 팀: 팀 수
  approval_mode text not null default 'manual' check (approval_mode in ('auto','fcfs','fcfs_wait','manual')),
  waitlist_max int not null default 0,
  allow_edit  boolean not null default true,              -- 승인 후 신청서 수정
  allow_cancel boolean not null default true,             -- 승인 후 취소
  target      jsonb not null default '{}',                -- {kinds, statuses, grades, genders, units, grad}
  mileage_max int not null default 0,
  comp_index  numeric(6,2) not null default 0,            -- 역량지수
  competencies jsonb not null default '[]',               -- [{code, name, pct, main, goal}] — pct 합 100
  budget      jsonb not null default '[]',                -- [{item, amount}]
  basis       text not null default '',                   -- 개설 근거
  evidence    jsonb not null default '[]',                -- 증빙 파일 [{name, key}]
  form        jsonb not null default '[]',                -- 신청 양식 [{id, type, label, options, required, audience}]
  completion  jsonb not null default '{"attend_min_pct":80,"survey_required":true}',
  pre_survey_id uuid, sat_survey_id uuid,
  status      text not null default 'draft' check (status in ('draft','approving','ready','recruiting','running','completing','closing','closed')),
  certified   boolean not null default false,             -- 우수 프로그램 인증마크
  recommender text not null default '',
  operator_email text,
  created_by  text,
  cloned_from uuid,
  close_report text not null default '',
  created_at  timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, program_id)
);
create index if not exists lms_q_program_st on lms_q_program (tenant_id, status);
create table if not exists lms_q_session (
  tenant_id   text not null,
  session_id  uuid not null default gen_random_uuid(),
  program_id  uuid not null,
  seq         int not null,
  title       text not null,
  starts_at   timestamptz, ends_at timestamptz,
  place       text not null default '',
  hours       numeric(5,1) not null default 0,
  budget      numeric(12,0) not null default 0,
  allow_dup   boolean not null default true,             -- 다른 주제와 중복 참여 허용
  capacity    int,
  primary key (tenant_id, session_id),
  foreign key (tenant_id, program_id) references lms_q_program (tenant_id, program_id) on delete cascade
);
create table if not exists lms_q_team (
  tenant_id   text not null,
  team_id     uuid not null default gen_random_uuid(),
  program_id  uuid not null,
  name        text not null,
  leader_no   text not null,
  pw_hash     text not null,                              -- 평문 저장 금지
  created_at  timestamptz not null default now(),
  primary key (tenant_id, team_id),
  unique (tenant_id, program_id, name),
  foreign key (tenant_id, program_id) references lms_q_program (tenant_id, program_id) on delete cascade
);
create table if not exists lms_q_application (
  tenant_id   text not null,
  program_id  uuid not null,
  member_no   text not null,
  status      text not null default 'applied' check (status in ('applied','approved','waiting','rejected','cancelled')),
  wait_no     int,
  team_id     uuid,
  team_role   text not null default 'member' check (team_role in ('member','leader','tutor')),
  answers     jsonb not null default '{}',
  sessions    uuid[] not null default '{}',               -- 선택한 주제(회차)
  source      text not null default 'web' check (source in ('web','operator','bulk')),
  applied_at  timestamptz not null default now(), decided_at timestamptz,
  completion  text not null default 'pending' check (completion in ('pending','completed','failed')),
  mileage     int not null default 0,
  extra_mileage int not null default 0,
  completion_note text not null default '',
  primary key (tenant_id, program_id, member_no),
  foreign key (tenant_id, program_id) references lms_q_program (tenant_id, program_id) on delete cascade
);
create index if not exists lms_q_app_me on lms_q_application (tenant_id, member_no);
create table if not exists lms_q_attend (
  tenant_id   text not null,
  program_id  uuid not null,
  session_id  uuid not null,
  member_no   text not null,
  status      text not null check (status in ('present','late','absent','excused')),
  at          timestamptz not null default now(),
  primary key (tenant_id, session_id, member_no),
  foreign key (tenant_id, session_id) references lms_q_session (tenant_id, session_id) on delete cascade
);
create table if not exists lms_q_expense (
  tenant_id   text not null,
  expense_id  uuid not null default gen_random_uuid(),
  program_id  uuid not null,
  item        text not null,
  amount      numeric(12,0) not null check (amount >= 0),
  spent_on    date,
  vendor      text not null default '',
  memo        text not null default '',
  created_at  timestamptz not null default now(),
  primary key (tenant_id, expense_id),
  foreign key (tenant_id, program_id) references lms_q_program (tenant_id, program_id) on delete cascade
);
create table if not exists lms_q_cqi (
  tenant_id   text not null,
  program_id  uuid not null,
  content     jsonb not null default '{}',                 -- {goal, result, strengths, improve, next}
  status      text not null default 'draft' check (status in ('draft','requested','approved','rejected')),
  memo        text not null default '',
  decided_by  text, updated_at timestamptz not null default now(),
  primary key (tenant_id, program_id),
  foreign key (tenant_id, program_id) references lms_q_program (tenant_id, program_id) on delete cascade
);
create table if not exists lms_q_history (
  tenant_id   text not null,
  id          bigserial,
  program_id  uuid not null,
  action      text not null,
  from_status text, to_status text,
  actor       text, memo text not null default '',
  at          timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists lms_q_hist_p on lms_q_history (tenant_id, program_id, id);
create table if not exists lms_q_wish (
  tenant_id   text not null,
  member_no   text not null,
  program_id  uuid not null,
  at          timestamptz not null default now(),
  primary key (tenant_id, member_no, program_id),
  foreign key (tenant_id, program_id) references lms_q_program (tenant_id, program_id) on delete cascade
);
create table if not exists lms_q_review (
  tenant_id   text not null,
  program_id  uuid not null,
  member_no   text not null,
  rating      int not null check (rating between 1 and 5),
  body        text not null,
  at          timestamptz not null default now(),
  primary key (tenant_id, program_id, member_no),
  foreign key (tenant_id, program_id) references lms_q_program (tenant_id, program_id) on delete cascade
);
create table if not exists lms_q_board (
  tenant_id   text not null,
  post_id     uuid not null default gen_random_uuid(),
  program_id  uuid not null,
  member_no   text not null,
  body        text not null,
  at          timestamptz not null default now(),
  primary key (tenant_id, post_id),
  foreign key (tenant_id, program_id) references lms_q_program (tenant_id, program_id) on delete cascade
);
create table if not exists lms_q_notify (
  tenant_id   text not null,
  id          bigserial,
  program_id  uuid not null,
  kind        text not null check (kind in ('sms','promote','push')),
  targets     jsonb not null default '[]',
  body        text not null default '',
  status      text not null default 'queued' check (status in ('queued','sent','failed')), -- 실발송은 문자 · 푸시 연동 후
  at          timestamptz not null default now(),
  primary key (tenant_id, id)
);
do $$ declare t text; begin
  foreach t in array array['lms_q_group','lms_q_program','lms_q_session','lms_q_team','lms_q_application','lms_q_attend','lms_q_expense','lms_q_cqi','lms_q_history','lms_q_wish','lms_q_review','lms_q_board','lms_q_notify'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_q_history_id_seq, lms_q_notify_id_seq to didisam_tenant;
end $$;

-- ── 공통 ───────────────────────────────────────────────
create or replace function lms_q_get(pid uuid, lock boolean default false) returns lms_q_program language plpgsql as $$
declare p lms_q_program; begin
  if lock then select * into p from lms_q_program where program_id = pid for update; else select * into p from lms_q_program where program_id = pid; end if;
  if not found then perform lms_k_err(404, 'no_program', '프로그램을 찾을 수 없습니다.'); end if; return p; end $$;
create or replace function lms_q_pid(a jsonb) returns uuid language plpgsql immutable as $$
declare v uuid := lms_k_uuid(a, 'program_id'); begin if v is null then perform lms_k_err(400, 'bad_program', '프로그램을 지정하세요.'); end if; return v; end $$;
-- 운영 권한: 정운영자 전체, 부운영자는 자기가 만들었거나 운영자로 지정된 프로그램
create or replace function lms_q_can(actor jsonb, p lms_q_program) returns void language plpgsql stable as $$
begin
  if actor->>'role' = 'owner' then return; end if;
  if actor->>'role' = 'sub' and (p.created_by = actor->>'email' or p.operator_email = actor->>'email') then return; end if;
  perform lms_k_err(403, 'not_operator', '이 프로그램의 운영자만 처리할 수 있습니다.'); end $$;
create or replace function lms_q_unlocked(p lms_q_program) returns void language plpgsql immutable as $$
begin if p.status = 'closed' then perform lms_k_err(409, 'locked', '마감된 프로그램은 고칠 수 없습니다.'); end if; end $$;
create or replace function lms_q_hist(pid uuid, act text, f text, t text, actor jsonb, memo text) returns void language sql as $$
  insert into lms_q_history (tenant_id, program_id, action, from_status, to_status, actor, memo) values (lms_k_tid(), pid, act, f, t, actor->>'email', coalesce(memo, '')) $$;
create or replace function lms_q_stname(s text) returns text language sql immutable as $$
  select case s when 'draft' then '임시저장' when 'approving' then '승인처리중' when 'ready' then '접수대기' when 'recruiting' then '접수중' when 'running' then '운영중'
    when 'completing' then '이수처리중' when 'closing' then '마감처리중' when 'closed' then '마감' else s end $$;
create or replace function lms_q_counts(pid uuid) returns jsonb language sql stable as $$
  select jsonb_build_object('applied', count(*) filter (where status = 'applied'), 'approved', count(*) filter (where status = 'approved'), 'waiting', count(*) filter (where status = 'waiting'),
    'rejected', count(*) filter (where status = 'rejected'), 'cancelled', count(*) filter (where status = 'cancelled'),
    'teams', count(distinct team_id) filter (where status = 'approved' and team_id is not null), 'completed', count(*) filter (where completion = 'completed'))
  from lms_q_application where program_id = pid $$;
create or replace function lms_q_out(p lms_q_program) returns jsonb language sql stable as $$
  select (to_jsonb(p) - 'tenant_id') || jsonb_build_object('status_name', lms_q_stname(p.status), 'counts', lms_q_counts(p.program_id),
    'group_name', (select name from lms_q_group g where g.group_id = p.group_id),
    'n_sessions', (select count(*) from lms_q_session s where s.program_id = p.program_id),
    'rating', (select round(avg(rating), 1) from lms_q_review r where r.program_id = p.program_id), 'n_wish', (select count(*) from lms_q_wish w where w.program_id = p.program_id)) $$;

-- ── 그룹 ───────────────────────────────────────────────
create or replace function lms_q_groups(actor jsonb, a jsonb) returns jsonb language sql stable as $$
  select jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('group_id', g.group_id, 'name', g.name, 'sort', g.sort, 'n', (select count(*) from lms_q_program p where p.group_id = g.group_id)) order by g.sort, g.name) from lms_q_group g), '[]')) $$;
create or replace function lms_q_group_save(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare gid uuid := lms_k_uuid(a, 'group_id'); nm text := lms_k_t(a, 'name', 60); begin
  if nm = '' then perform lms_k_err(400, 'bad_name', '그룹 이름을 입력하세요.'); end if;
  if gid is null then insert into lms_q_group (tenant_id, name, sort) values (lms_k_tid(), nm, coalesce(lms_k_i(a, 'sort'), 0));
  else update lms_q_group set name = nm, sort = coalesce(lms_k_i(a, 'sort'), sort) where group_id = gid; end if;
  return lms_q_groups(actor, a); end $$;

-- ── 프로그램 목록 · 상세 ───────────────────────────────
create or replace function lms_q_programs(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare r jsonb; q text := lms_k_t(a, 'q', 60); begin
  select coalesce(jsonb_agg(lms_q_out(p) order by p.updated_at desc, p.program_id), '[]') into r from lms_q_program p
   where (lms_k_t(a, 'status') = '' or p.status = lms_k_t(a, 'status'))
     and (lms_k_uuid(a, 'group_id') is null or p.group_id = lms_k_uuid(a, 'group_id'))
     and (q = '' or p.title ilike '%' || q || '%' or exists (select 1 from unnest(p.tags) t where t ilike '%' || q || '%'))
     and (not lms_k_b(a, 'mine') or p.created_by = actor->>'email' or p.operator_email = actor->>'email');
  return jsonb_build_object('items', r, 'by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from lms_q_program group by status) z)); end $$;
create or replace function lms_q_program(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); begin
  if actor->>'role' = 'learner' and p.status in ('draft','approving') then perform lms_k_err(404, 'no_program', '프로그램을 찾을 수 없습니다.'); end if;
  return lms_q_out(p) || jsonb_build_object(
    'sessions', coalesce((select jsonb_agg((to_jsonb(s) - 'tenant_id') || jsonb_build_object('n', (select count(*) from lms_q_application ap where ap.program_id = p.program_id and ap.status = 'approved' and s.session_id = any(ap.sessions))) order by s.seq) from lms_q_session s where s.program_id = p.program_id), '[]'),
    'teams', coalesce((select jsonb_agg(jsonb_build_object('team_id', t.team_id, 'name', t.name, 'leader_no', t.leader_no, 'n', (select count(*) from lms_q_application ap where ap.team_id = t.team_id and ap.status <> 'cancelled')) order by t.created_at) from lms_q_team t where t.program_id = p.program_id), '[]'),
    'spent', (select coalesce(sum(amount), 0) from lms_q_expense e where e.program_id = p.program_id),
    'cqi_status', (select status from lms_q_cqi c where c.program_id = p.program_id)); end $$;

-- ── 등록 · 수정(4단계: 기본정보 · 핵심역량 · 예산 · 신청양식) ──
create or replace function lms_q_check_form(f jsonb) returns jsonb language plpgsql immutable as $$
declare x jsonb; i int := 0; res jsonb := '[]'; ty text; begin
  if jsonb_typeof(f) <> 'array' then perform lms_k_err(400, 'bad_form', '신청 양식 형식이 올바르지 않습니다.'); end if;
  if jsonb_array_length(f) > 50 then perform lms_k_err(400, 'bad_form', '신청 양식 항목은 50개까지입니다.'); end if;
  for x in select * from jsonb_array_elements(f) loop i := i + 1; ty := coalesce(x->>'type', 'text');
    if ty not in ('text','longtext','single','multi','consent','date','file') then perform lms_k_err(400, 'bad_form', i || '번 양식 항목 유형이 올바르지 않습니다.'); end if;
    if lms_k_t(x, 'label', 200) = '' then perform lms_k_err(400, 'bad_form', i || '번 양식 항목 이름을 입력하세요.'); end if;
    if ty in ('single','multi') and coalesce(jsonb_array_length(case jsonb_typeof(x->'options') when 'array' then x->'options' end), 0) < 2 then perform lms_k_err(400, 'bad_form', i || '번 양식 항목 보기를 2개 이상 입력하세요.'); end if;
    res := res || jsonb_build_array(jsonb_build_object('id', coalesce(nullif(lms_k_t(x, 'id', 20), ''), 'f' || i), 'type', ty, 'label', lms_k_t(x, 'label', 200),
      'options', case when ty in ('single','multi') then x->'options' else '[]' end, 'required', coalesce((x->>'required')::boolean, false),
      'audience', case when x->>'audience' in ('all','leader','tutor') then x->>'audience' else 'all' end));
  end loop; return res; end $$;
create or replace function lms_q_check_comp(c jsonb) returns jsonb language plpgsql immutable as $$
declare tot numeric; mains int; begin
  if c is null or jsonb_typeof(c) <> 'array' or jsonb_array_length(c) = 0 then return '[]'; end if;
  if exists (select 1 from jsonb_array_elements(c) x where lms_k_t(x, 'name', 40) = '' or coalesce(lms_k_n(x, 'pct'), -1) not between 0 and 100) then perform lms_k_err(400, 'bad_comp', '핵심역량 이름과 비율(0~100)을 확인하세요.'); end if;
  select sum(lms_k_n(x, 'pct')), count(*) filter (where (x->>'main')::boolean) into tot, mains from jsonb_array_elements(c) x;
  if tot <> 100 then perform lms_k_err(400, 'comp_total', '핵심역량 연관성 비율의 합은 100%여야 합니다(지금 ' || tot || '%).'); end if;
  if mains <> 1 then perform lms_k_err(400, 'comp_main', '주역량을 하나만 지정하세요.'); end if;
  return (select jsonb_agg(jsonb_build_object('code', coalesce(nullif(lms_k_t(x, 'code', 20), ''), lms_k_t(x, 'name', 40)), 'name', lms_k_t(x, 'name', 40), 'pct', lms_k_n(x, 'pct'),
    'main', coalesce((x->>'main')::boolean, false), 'goal', lms_k_t(x, 'goal', 300))) from jsonb_array_elements(c) x); end $$;
create or replace function lms_q_check_budget(b jsonb) returns jsonb language plpgsql immutable as $$
begin
  if b is null or jsonb_typeof(b) <> 'array' then return '[]'; end if;
  if exists (select 1 from jsonb_array_elements(b) x where lms_k_t(x, 'item', 60) = '' or coalesce(lms_k_n(x, 'amount'), -1) < 0) then perform lms_k_err(400, 'bad_budget', '예산 항목 이름과 금액(0 이상)을 확인하세요.'); end if;
  return coalesce((select jsonb_agg(jsonb_build_object('item', lms_k_t(x, 'item', 60), 'amount', lms_k_n(x, 'amount'))) from jsonb_array_elements(b) x), '[]'); end $$;

create or replace function lms_q_program_save(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare pid uuid := lms_k_uuid(a, 'program_id'); p lms_q_program; t text := lms_k_t(a, 'title', 120); am text := coalesce(nullif(lms_k_t(a, 'approval_mode', 12), ''), 'manual');
  s jsonb; i int := 0; full_edit boolean; begin
  if t = '' then perform lms_k_err(400, 'bad_title', '프로그램명을 입력하세요.'); end if;
  if am not in ('auto','fcfs','fcfs_wait','manual') then perform lms_k_err(400, 'bad_mode', '승인 방식은 자동 · 선착순 · 선착순+대기 · 운영자 승인 중 하나입니다.'); end if;
  if lms_k_ts(a, 'apply_from') is not null and lms_k_ts(a, 'apply_to') is not null and lms_k_ts(a, 'apply_to') < lms_k_ts(a, 'apply_from') then perform lms_k_err(400, 'bad_date', '신청 마감이 신청 시작보다 빠릅니다.'); end if;
  if lms_k_ts(a, 'starts_at') is not null and lms_k_ts(a, 'ends_at') is not null and lms_k_ts(a, 'ends_at') < lms_k_ts(a, 'starts_at') then perform lms_k_err(400, 'bad_date', '운영 종료가 시작보다 빠릅니다.'); end if;
  if coalesce(lms_k_i(a, 'mileage_max', 0), -1) < 0 or coalesce(lms_k_i(a, 'capacity', 0), -1) < 0 then perform lms_k_err(400, 'bad_number', '마일리지 · 모집 인원은 0 이상 정수입니다.'); end if;
  if pid is null then
    insert into lms_q_program (tenant_id, title, created_by, operator_email) values (lms_k_tid(), t, actor->>'email', actor->>'email') returning program_id into pid;
    perform lms_q_hist(pid, 'create', null, 'draft', actor, '');
    full_edit := true;
  else
    p := lms_q_get(pid, true); perform lms_q_can(actor, p); perform lms_q_unlocked(p);
    full_edit := p.status in ('draft','approving');
    if not full_edit and (a ? 'competencies' or a ? 'form' or a ? 'approval_mode' or a ? 'kind' or a ? 'sessions') and p.status not in ('ready') then
      perform lms_k_err(409, 'after_open', '접수가 시작된 프로그램은 역량 · 신청 양식 · 승인 방식 · 주제를 바꿀 수 없습니다.'); end if;
    full_edit := p.status in ('draft','approving','ready');
  end if;
  update lms_q_program set title = t, group_id = lms_k_uuid(a, 'group_id'), summary = lms_k_t(a, 'summary', 2000), detail_html = lms_k_t(a, 'detail_html', 50000),
    tags = lms_n_arr(a, 'tags'), cover_url = lms_k_t(a, 'cover_url', 500), video_url = lms_k_t(a, 'video_url', 500),
    attachments = case jsonb_typeof(a->'attachments') when 'array' then a->'attachments' else attachments end, place = lms_k_t(a, 'place', 200),
    starts_at = lms_k_ts(a, 'starts_at'), ends_at = lms_k_ts(a, 'ends_at'), total_hours = coalesce(lms_k_n(a, 'total_hours'), 0), total_count = coalesce(lms_k_i(a, 'total_count'), 0),
    apply_from = lms_k_ts(a, 'apply_from'), apply_to = lms_k_ts(a, 'apply_to'), capacity = nullif(lms_k_i(a, 'capacity', 0), 0),
    approval_mode = case when full_edit then am else approval_mode end, waitlist_max = coalesce(lms_k_i(a, 'waitlist_max'), 0),
    kind = case when full_edit then case when lms_k_t(a, 'kind') = 'team' then 'team' else 'personal' end else kind end,
    team_min = coalesce(lms_k_i(a, 'team_min'), 2), team_max = coalesce(lms_k_i(a, 'team_max'), 6),
    allow_edit = coalesce((a->>'allow_edit')::boolean, allow_edit), allow_cancel = coalesce((a->>'allow_cancel')::boolean, allow_cancel),
    target = case jsonb_typeof(a->'target') when 'object' then a->'target' else target end,
    mileage_max = coalesce(lms_k_i(a, 'mileage_max'), 0), comp_index = coalesce(lms_k_n(a, 'comp_index'), 0),
    competencies = case when full_edit and a ? 'competencies' then lms_q_check_comp(a->'competencies') else competencies end,
    budget = case when a ? 'budget' then lms_q_check_budget(a->'budget') else budget end, basis = lms_k_t(a, 'basis', 4000),
    evidence = case jsonb_typeof(a->'evidence') when 'array' then a->'evidence' else evidence end,
    form = case when full_edit and a ? 'form' then lms_q_check_form(a->'form') else form end,
    completion = case jsonb_typeof(a->'completion') when 'object' then jsonb_build_object('attend_min_pct', coalesce(lms_k_i(a->'completion', 'attend_min_pct'), 80), 'survey_required', lms_k_b(a->'completion', 'survey_required')) else completion end,
    updated_at = now() where program_id = pid;
  if full_edit and jsonb_typeof(a->'sessions') = 'array' then
    if exists (select 1 from lms_q_application where program_id = pid and cardinality(sessions) > 0) then perform lms_k_err(409, 'has_apps', '주제를 고른 신청자가 있어 주제를 바꿀 수 없습니다.'); end if;
    delete from lms_q_session where program_id = pid;
    for s in select * from jsonb_array_elements(a->'sessions') loop i := i + 1;
      if lms_k_t(s, 'title', 200) = '' then perform lms_k_err(400, 'bad_session', i || '번 주제(회차) 이름을 입력하세요.'); end if;
      insert into lms_q_session (tenant_id, program_id, seq, title, starts_at, ends_at, place, hours, budget, allow_dup, capacity)
      values (lms_k_tid(), pid, i, lms_k_t(s, 'title', 200), lms_k_ts(s, 'starts_at'), lms_k_ts(s, 'ends_at'), lms_k_t(s, 'place', 200), coalesce(lms_k_n(s, 'hours'), 0), coalesce(lms_k_n(s, 'budget'), 0),
        coalesce((s->>'allow_dup')::boolean, true), nullif(lms_k_i(s, 'capacity', 0), 0));
    end loop;
    update lms_q_program set total_count = greatest(total_count, i), total_hours = greatest(total_hours, (select coalesce(sum(hours), 0) from lms_q_session where program_id = pid)) where program_id = pid;
  end if;
  return lms_q_program(actor, jsonb_build_object('program_id', pid)); end $$;

-- 기존 프로그램 불러오기(복사 → 임시저장)
create or replace function lms_q_program_clone(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); nid uuid; begin
  insert into lms_q_program (tenant_id, group_id, title, summary, detail_html, tags, cover_url, video_url, attachments, kind, team_min, team_max, place, total_hours, total_count, capacity, approval_mode, waitlist_max,
    allow_edit, allow_cancel, target, mileage_max, comp_index, competencies, budget, basis, form, completion, created_by, operator_email, cloned_from)
  select tenant_id, group_id, coalesce(nullif(lms_k_t(a, 'title', 120), ''), title || ' (복사)'), summary, detail_html, tags, cover_url, video_url, attachments, kind, team_min, team_max, place, total_hours, total_count, capacity, approval_mode, waitlist_max,
    allow_edit, allow_cancel, target, mileage_max, comp_index, competencies, budget, basis, form, completion, actor->>'email', actor->>'email', program_id from lms_q_program where program_id = p.program_id
  returning program_id into nid;
  insert into lms_q_session (tenant_id, program_id, seq, title, place, hours, budget, allow_dup, capacity) select tenant_id, nid, seq, title, place, hours, budget, allow_dup, capacity from lms_q_session where program_id = p.program_id;
  perform lms_q_hist(nid, 'clone', null, 'draft', actor, '불러온 프로그램: ' || p.title);
  return lms_q_program(actor, jsonb_build_object('program_id', nid)); end $$;

-- ── 상태 흐름(역할 검사 · 조건 검사 · 이력) ───────────────
create or replace function lms_q_move(actor jsonb, pid uuid, act text, memo text, rep text) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(pid, true); nxt text; need_owner boolean := false; frm text[]; begin
  case act
    when 'submit' then frm := '{draft}'; nxt := 'approving';
    when 'approve' then frm := '{approving}'; nxt := 'ready'; need_owner := true;
    when 'reject' then frm := '{approving}'; nxt := 'draft'; need_owner := true;
    when 'open' then frm := '{ready}'; nxt := 'recruiting';
    when 'pause' then frm := '{recruiting}'; nxt := 'ready';
    when 'start' then frm := '{recruiting}'; nxt := 'running';
    when 'finish' then frm := '{running}'; nxt := 'completing';
    when 'close_request' then frm := '{completing}'; nxt := 'closing';
    when 'close' then frm := '{closing}'; nxt := 'closed'; need_owner := true;
    when 'reopen' then frm := '{closing}'; nxt := 'completing'; need_owner := true;
    else perform lms_k_err(400, 'bad_action', '처리할 수 없는 단계입니다.');
  end case;
  if need_owner then
    if actor->>'role' <> 'owner' then perform lms_k_err(403, 'owner_only', '승인 · 마감 승인은 교육혁신본부(정운영자)가 처리합니다.'); end if;
  else perform lms_q_can(actor, p); end if;
  if not (p.status = any(frm)) then perform lms_k_err(409, 'bad_status', '「' || lms_q_stname(p.status) || '」 상태에서는 이 처리를 할 수 없습니다.'); end if;
  if act = 'submit' then
    if p.apply_from is null or p.apply_to is null then perform lms_k_err(409, 'need_apply', '신청 기간을 입력해야 승인 요청할 수 있습니다.'); end if;
    if jsonb_array_length(p.competencies) = 0 then perform lms_k_err(409, 'need_comp', '핵심역량 연관성(합 100%)을 입력해야 승인 요청할 수 있습니다.'); end if;
  end if;
  if act in ('reject','reopen') and coalesce(memo, '') = '' then perform lms_k_err(400, 'need_memo', '반려 사유를 입력하세요.'); end if;
  if act = 'close_request' then
    if exists (select 1 from lms_q_application where program_id = pid and status = 'approved' and completion = 'pending') then perform lms_k_err(409, 'completion_pending', '이수 처리가 끝나지 않은 신청자가 있습니다.'); end if;
    if coalesce(rep, '') = '' then perform lms_k_err(400, 'need_report', '마감보고서(운영 결과)를 작성하세요.'); end if;
    update lms_q_program set close_report = rep where program_id = pid;
  end if;
  if act = 'close' then -- 이수자 마일리지 확정
    update lms_q_application set mileage = case when completion = 'completed' then p.mileage_max + extra_mileage else 0 end where program_id = pid;
  end if;
  update lms_q_program set status = nxt, updated_at = now() where program_id = pid;
  perform lms_q_hist(pid, act, p.status, nxt, actor, memo);
  return jsonb_build_object('program_id', pid, 'from', p.status, 'status', nxt, 'status_name', lms_q_stname(nxt)); end $$;
-- 한 건 또는 일괄(program_ids) — 교육혁신본부 일괄 승인
create or replace function lms_q_transition(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare ids uuid[]; r jsonb := '[]'; x uuid; begin
  if jsonb_typeof(a->'program_ids') = 'array' then ids := (select array_agg(v::uuid) from jsonb_array_elements_text(a->'program_ids') v where v ~* '^[0-9a-f-]{36}$');
  else ids := array[lms_q_pid(a)]; end if;
  if coalesce(cardinality(ids), 0) = 0 or cardinality(ids) > 200 then perform lms_k_err(400, 'bad_program', '처리할 프로그램을 1~200개 고르세요.'); end if;
  foreach x in array ids loop r := r || jsonb_build_array(lms_q_move(actor, x, lms_k_t(a, 'action', 20), lms_k_t(a, 'memo', 1000), lms_k_t(a, 'report', 20000))); end loop;
  return jsonb_build_object('ok', true, 'items', r); end $$;
create or replace function lms_q_history(actor jsonb, a jsonb) returns jsonb language sql stable as $$
  select jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('action', h.action, 'from', h.from_status, 'to', h.to_status, 'from_name', lms_q_stname(h.from_status), 'to_name', lms_q_stname(h.to_status), 'actor', h.actor, 'memo', h.memo, 'at', h.at) order by h.id)
    from lms_q_history h where h.program_id = lms_q_pid(a)), '[]')) $$;
create or replace function lms_q_operator(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); em text := lms_k_t(a, 'operator_email', 120); begin
  if em !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then perform lms_k_err(400, 'bad_email', '운영자 이메일 형식이 올바르지 않습니다.'); end if;
  update lms_q_program set operator_email = em, updated_at = now() where program_id = p.program_id;
  perform lms_q_hist(p.program_id, 'operator', p.status, p.status, actor, '운영자 변경: ' || coalesce(p.operator_email, '-') || ' → ' || em);
  return lms_q_out(lms_q_get(p.program_id)); end $$;
create or replace function lms_q_certify(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); begin
  update lms_q_program set certified = lms_k_b(a, 'certified'), recommender = lms_k_t(a, 'recommender', 60), updated_at = now() where program_id = p.program_id;
  perform lms_q_hist(p.program_id, 'certify', p.status, p.status, actor, case when lms_k_b(a, 'certified') then '우수 프로그램 인증' else '인증 해제' end);
  return lms_q_out(lms_q_get(p.program_id)); end $$;

-- ── 신청 ───────────────────────────────────────────────
-- 대상 판정(재적 · 학년 · 단과대 · 학과 · 교수 · 직원 · 외부인). 성별 · 대학원 구분은 학사 연동 후 판정
create or replace function lms_q_target_ok(p lms_q_program, mno text) returns boolean language sql stable as $$
  select lms_k_target_ok(p.target, lms_k_person(mno)) $$;
-- 정원 판정 단위: 개인 = 승인 인원, 팀 = 승인 팀 수
create or replace function lms_q_taken(p lms_q_program) returns int language sql stable as $$
  select case when p.kind = 'team' then (select count(distinct team_id) from lms_q_application where program_id = p.program_id and status = 'approved' and team_id is not null)
              else (select count(*)::int from lms_q_application where program_id = p.program_id and status = 'approved') end $$;
create or replace function lms_q_check_answers(p lms_q_program, ans jsonb, role_ text) returns jsonb language plpgsql stable as $$
declare f jsonb; v jsonb; clean jsonb := '{}'; begin
  if jsonb_typeof(ans) <> 'object' then ans := '{}'; end if;
  for f in select * from jsonb_array_elements(p.form) loop
    if f->>'audience' = 'leader' and role_ <> 'leader' then continue; end if;
    if f->>'audience' = 'tutor' and role_ <> 'tutor' then continue; end if;
    v := ans->(f->>'id');
    if v is null or v = 'null' or v = '""' or v = '[]' or (f->>'type' = 'consent' and v <> 'true') then
      if (f->>'required')::boolean then perform lms_k_err(400, 'required', '「' || (f->>'label') || '」 항목을 입력하세요.'); end if; continue; end if;
    clean := clean || jsonb_build_object(f->>'id', case when jsonb_typeof(v) = 'string' then to_jsonb(left(v #>> '{}', 4000)) else v end);
  end loop; return clean; end $$;
-- 승인 방식 적용(프로그램 행이 잠긴 상태에서만 부른다)
create or replace function lms_q_decide_status(p lms_q_program, joining_team uuid) returns text language plpgsql stable as $$
declare taken int := lms_q_taken(p); leader_st text; nwait int; begin
  if joining_team is not null then select status into leader_st from lms_q_application where team_id = joining_team and team_role = 'leader'; return coalesce(leader_st, 'applied'); end if;
  if p.approval_mode = 'manual' then return 'applied'; end if;
  if p.approval_mode = 'auto' then return 'approved'; end if;
  if p.capacity is null or taken < p.capacity then return 'approved'; end if;
  if p.approval_mode = 'fcfs' then perform lms_k_err(409, 'full', '모집 인원이 찼습니다.'); end if;
  select count(*) into nwait from lms_q_application where program_id = p.program_id and status = 'waiting' and (p.kind <> 'team' or team_role = 'leader');
  if p.waitlist_max > 0 and nwait >= p.waitlist_max then perform lms_k_err(409, 'full', '대기 인원까지 모두 찼습니다.'); end if;
  return 'waiting'; end $$;

create or replace function lms_q_apply(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); mno text := lms_k_no(a); tm jsonb := a->'team'; tid_ uuid; trole text := 'member'; st text; ans jsonb;
  ss uuid[]; wn int; byop boolean := lms_k_b(a, 'by_operator'); begin
  if p.status <> 'recruiting' and not (byop and p.status in ('recruiting','running')) then perform lms_k_err(409, 'not_recruiting', '접수 중인 프로그램이 아닙니다.'); end if;
  if not byop and ((p.apply_from is not null and now() < p.apply_from) or (p.apply_to is not null and now() > p.apply_to)) then perform lms_k_err(409, 'not_period', '신청 기간이 아닙니다.'); end if;
  if byop then perform lms_q_can(actor, p); end if;
  if not lms_q_target_ok(p, mno) then perform lms_k_err(403, 'not_target', '신청 대상이 아닙니다.'); end if;
  if exists (select 1 from lms_q_application where program_id = p.program_id and member_no = mno and status <> 'cancelled') then perform lms_k_err(409, 'dup', '이미 신청한 프로그램입니다.'); end if;
  ss := coalesce((select array_agg(s.session_id) from lms_q_session s where s.program_id = p.program_id and s.session_id::text in (select jsonb_array_elements_text(case jsonb_typeof(a->'sessions') when 'array' then a->'sessions' else '[]' end))), '{}');
  if exists (select 1 from lms_q_session s where s.session_id = any(ss) and not s.allow_dup) and cardinality(ss) > 1 then perform lms_k_err(409, 'no_dup', '중복 참여가 허용되지 않는 주제가 있습니다. 하나만 고르세요.'); end if;
  if exists (select 1 from lms_q_session s where s.session_id = any(ss) and s.capacity is not null
      and (select count(*) from lms_q_application x where x.program_id = p.program_id and x.status = 'approved' and s.session_id = any(x.sessions)) >= s.capacity) then perform lms_k_err(409, 'session_full', '정원이 찬 주제가 있습니다.'); end if;
  if p.kind = 'team' then
    if jsonb_typeof(tm) <> 'object' or lms_k_t(tm, 'name', 40) = '' or length(lms_k_t(tm, 'password', 64)) < 4 then perform lms_k_err(400, 'bad_team', '팀명과 팀 비밀번호(4자 이상)를 입력하세요.'); end if;
    if lms_k_t(tm, 'mode') = 'create' then
      if exists (select 1 from lms_q_team where program_id = p.program_id and name = lms_k_t(tm, 'name', 40)) then perform lms_k_err(409, 'team_exists', '같은 이름의 팀이 이미 있습니다.'); end if;
      insert into lms_q_team (tenant_id, program_id, name, leader_no, pw_hash) values (lms_k_tid(), p.program_id, lms_k_t(tm, 'name', 40), mno, lms_k_hash(lms_k_t(tm, 'password', 64))) returning team_id into tid_;
      trole := 'leader';
    else
      select team_id into tid_ from lms_q_team t where t.program_id = p.program_id and t.name = lms_k_t(tm, 'name', 40) and lms_k_hash_ok(lms_k_t(tm, 'password', 64), t.pw_hash);
      if tid_ is null then perform lms_k_err(403, 'team_auth', '팀명 또는 팀 비밀번호가 올바르지 않습니다.'); end if;
      if (select count(*) from lms_q_application where team_id = tid_ and status <> 'cancelled') >= p.team_max then perform lms_k_err(409, 'team_full', '팀 인원(최대 ' || p.team_max || '명)이 찼습니다.'); end if;
      trole := case when lms_k_t(tm, 'role') = 'tutor' then 'tutor' else 'member' end;
    end if;
  end if;
  ans := lms_q_check_answers(p, a->'answers', trole);
  st := case when byop then 'approved' else lms_q_decide_status(p, case when trole = 'leader' then null else tid_ end) end;
  if st = 'waiting' then select coalesce(max(wait_no), 0) + 1 into wn from lms_q_application where program_id = p.program_id; end if;
  insert into lms_q_application (tenant_id, program_id, member_no, status, wait_no, team_id, team_role, answers, sessions, source, decided_at)
  values (lms_k_tid(), p.program_id, mno, st, wn, tid_, trole, ans, ss, case when byop then 'operator' else 'web' end, case when st in ('approved') then now() end)
  on conflict (tenant_id, program_id, member_no) do update set status = excluded.status, wait_no = excluded.wait_no, team_id = excluded.team_id, team_role = excluded.team_role, answers = excluded.answers,
    sessions = excluded.sessions, source = excluded.source, applied_at = now(), decided_at = excluded.decided_at, completion = 'pending', mileage = 0, extra_mileage = 0;
  return jsonb_build_object('program_id', p.program_id, 'member_no', mno, 'status', st, 'wait_no', wn, 'team_role', trole, 'team_id', tid_,
    'message', case st when 'approved' then '신청이 승인되었습니다.' when 'waiting' then '정원이 차서 대기 ' || wn || '번으로 접수되었습니다. 자리가 나면 자동으로 승인됩니다.' else '신청되었습니다. 운영자 승인을 기다립니다.' end); end $$;

-- 대기자 자동 승격(선착순+대기): 자리 수만큼 대기 번호 순으로 승인, 알림은 발송 대기열(실발송은 연동 후)
create or replace function lms_q_promote(p lms_q_program) returns int language plpgsql as $$
declare free_ int; n int := 0; w record; begin
  if p.approval_mode <> 'fcfs_wait' or p.capacity is null then return 0; end if;
  free_ := p.capacity - lms_q_taken(p);
  for w in select * from lms_q_application where program_id = p.program_id and status = 'waiting' and (p.kind <> 'team' or team_role = 'leader') order by wait_no, applied_at loop
    exit when free_ <= 0;
    update lms_q_application set status = 'approved', decided_at = now(), wait_no = null where program_id = p.program_id and (member_no = w.member_no or (w.team_id is not null and team_id = w.team_id and status = 'waiting'));
    insert into lms_q_notify (tenant_id, program_id, kind, targets, body) values (lms_k_tid(), p.program_id, 'promote', jsonb_build_array(w.member_no), p.title || ' 대기 신청이 승인되었습니다.');
    free_ := free_ - 1; n := n + 1;
  end loop; return n; end $$;
create or replace function lms_q_apply_cancel(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); mno text := lms_k_no(a); ap lms_q_application; n int; begin
  perform lms_q_unlocked(p);
  select * into ap from lms_q_application where program_id = p.program_id and member_no = mno and status in ('applied','approved','waiting');
  if not found then perform lms_k_err(409, 'bad_status', '취소할 수 있는 신청이 없습니다.'); end if;
  if ap.status = 'approved' and (not p.allow_cancel or p.status <> 'recruiting') then perform lms_k_err(409, 'no_cancel', '승인 후 취소가 허용되지 않거나 접수 기간이 끝났습니다.'); end if;
  update lms_q_application set status = 'cancelled', wait_no = null where program_id = p.program_id and (member_no = mno or (ap.team_role = 'leader' and team_id = ap.team_id));
  n := lms_q_promote(p);
  return jsonb_build_object('ok', true, 'member_no', mno, 'status', 'cancelled', 'promoted', n); end $$;
create or replace function lms_q_apply_edit(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); mno text := lms_k_no(a); ap lms_q_application; begin
  perform lms_q_unlocked(p);
  select * into ap from lms_q_application where program_id = p.program_id and member_no = mno and status in ('applied','approved','waiting');
  if not found then perform lms_k_err(409, 'bad_status', '수정할 수 있는 신청이 없습니다.'); end if;
  if ap.status = 'approved' and not p.allow_edit then perform lms_k_err(409, 'no_edit', '승인 후 신청서 수정이 허용되지 않습니다.'); end if;
  update lms_q_application set answers = lms_q_check_answers(p, a->'answers', ap.team_role) where program_id = p.program_id and member_no = mno;
  return jsonb_build_object('ok', true, 'member_no', mno, 'status', ap.status); end $$;

-- ── 신청자 관리 ─────────────────────────────────────────
create or replace function lms_q_aout(ap lms_q_application) returns jsonb language sql stable as $$
  select (to_jsonb(ap) - 'tenant_id') || jsonb_build_object('unit_code', lms_k_person(ap.member_no)->>'unit_code', 'grade_year', (lms_k_person(ap.member_no)->>'grade_year')::int, 'kind_m', lms_k_person(ap.member_no)->>'kind',
    'team_name', (select name from lms_q_team t where t.team_id = ap.team_id),
    'attend', (select jsonb_build_object('present', count(*) filter (where status in ('present','late','excused')), 'total', (select count(*) from lms_q_session s where s.program_id = ap.program_id)) from lms_q_attend t where t.program_id = ap.program_id and t.member_no = ap.member_no)) $$;
create or replace function lms_q_applicants(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); q text := lms_k_t(a, 'q', 40); begin
  if actor->>'role' <> 'teacher' then perform lms_q_can(actor, p); end if;
  return jsonb_build_object('program', lms_q_out(p), 'items', coalesce((select jsonb_agg(lms_q_aout(ap) order by case ap.status when 'approved' then 0 when 'applied' then 1 when 'waiting' then 2 else 3 end, ap.wait_no nulls first, ap.applied_at, ap.member_no)
    from lms_q_application ap where ap.program_id = p.program_id and (lms_k_t(a, 'status') = '' or ap.status = lms_k_t(a, 'status'))
      and (lms_k_t(a, 'unit') = '' or lms_k_person(ap.member_no)->>'unit_code' = lms_k_t(a, 'unit')) and (q = '' or ap.member_no like '%' || q || '%')), '[]')); end $$;
create or replace function lms_q_applicant(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); ap lms_q_application; begin
  perform lms_q_can(actor, p);
  select * into ap from lms_q_application where program_id = p.program_id and member_no = lms_k_no(a);
  if not found then perform lms_k_err(404, 'no_application', '신청서를 찾을 수 없습니다.'); end if;
  return lms_q_aout(ap) || jsonb_build_object('form', p.form, 'title', p.title); end $$;
-- 운영자 추가 · 학번 일괄 등록(승인 상태로 등록)
create or replace function lms_q_applicants_add(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); m text; ok int := 0; errs jsonb := '[]'; begin
  perform lms_q_can(actor, p); perform lms_q_unlocked(p);
  if jsonb_typeof(a->'member_nos') <> 'array' or jsonb_array_length(a->'member_nos') > 2000 then perform lms_k_err(400, 'bad_members', '학번 목록(최대 2,000개)을 보내세요.'); end if;
  for m in select jsonb_array_elements_text(a->'member_nos') loop
    begin
      if m !~ '^[A-Za-z0-9_-]{4,20}$' then perform lms_k_err(400, 'bad_member', '학번 형식 오류'); end if;
      if exists (select 1 from lms_q_application where program_id = p.program_id and member_no = m and status <> 'cancelled') then perform lms_k_err(409, 'dup', '이미 신청함'); end if;
      insert into lms_q_application (tenant_id, program_id, member_no, status, source, decided_at) values (lms_k_tid(), p.program_id, m, 'approved', 'bulk', now())
      on conflict (tenant_id, program_id, member_no) do update set status = 'approved', source = 'bulk', decided_at = now(), wait_no = null, completion = 'pending';
      ok := ok + 1;
    exception when others then errs := errs || jsonb_build_object('member_no', m, 'message', split_part(sqlerrm, '|', 4));
    end;
  end loop;
  perform lms_q_hist(p.program_id, 'bulk_add', p.status, p.status, actor, ok || '명 등록');
  return jsonb_build_object('ok', ok, 'failed', jsonb_array_length(errs), 'errors', errs); end $$;
-- 상태 변경(승인 · 반려 · 대기 · 취소) — 승인은 정원 확인, 취소 · 반려로 자리가 나면 대기자 승격
create or replace function lms_q_applicants_status(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); st text := lms_k_t(a, 'status', 12); m text; n int := 0; ap lms_q_application; pr int; begin
  perform lms_q_can(actor, p); perform lms_q_unlocked(p);
  if st not in ('approved','rejected','waiting','cancelled','applied') then perform lms_k_err(400, 'bad_status', '바꿀 상태가 올바르지 않습니다.'); end if;
  if jsonb_typeof(a->'member_nos') <> 'array' then perform lms_k_err(400, 'bad_members', '학번 목록을 보내세요.'); end if;
  for m in select jsonb_array_elements_text(a->'member_nos') loop
    select * into ap from lms_q_application where program_id = p.program_id and member_no = m;
    if not found or ap.status = st then continue; end if;
    if st = 'approved' and ap.team_role <> 'member' and p.capacity is not null and lms_q_taken(p) >= p.capacity then perform lms_k_err(409, 'full', '모집 인원이 찼습니다(' || m || ').'); end if;
    update lms_q_application set status = st, decided_at = now(), wait_no = case when st = 'waiting' then coalesce(wait_no, (select coalesce(max(wait_no), 0) + 1 from lms_q_application where program_id = p.program_id)) else null end
     where program_id = p.program_id and (member_no = m or (ap.team_role = 'leader' and team_id = ap.team_id and status <> 'cancelled'));
    n := n + 1;
  end loop;
  pr := case when st in ('rejected','cancelled') then lms_q_promote(p) else 0 end;
  perform lms_q_hist(p.program_id, 'app_status', p.status, p.status, actor, n || '명 → ' || st);
  return jsonb_build_object('ok', true, 'changed', n, 'promoted', pr, 'counts', lms_q_counts(p.program_id)); end $$;
create or replace function lms_q_applicants_export(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); hdr text; body text; begin
  perform lms_q_can(actor, p);
  hdr := '학번,학과,학년,상태,대기번호,팀,팀역할,신청일시,이수,마일리지,' || coalesce((select string_agg(lms_k_csv(f->>'label'), ',' order by n) from jsonb_array_elements(p.form) with ordinality x(f, n)), '');
  select coalesce(string_agg(lms_k_csv(ap.member_no) || ',' || lms_k_csv(lms_k_person(ap.member_no)->>'unit_code') || ',' || (lms_k_person(ap.member_no)->>'grade_year') || ',' || lms_k_csv(ap.status) || ',' || coalesce(ap.wait_no::text, '') || ',' ||
      lms_k_csv((select name from lms_q_team t where t.team_id = ap.team_id)) || ',' || ap.team_role || ',' || to_char(ap.applied_at, 'YYYY-MM-DD HH24:MI') || ',' || ap.completion || ',' || (ap.mileage + 0) || ',' ||
      coalesce((select string_agg(lms_k_csv(case jsonb_typeof(ap.answers->(f->>'id')) when 'array' then (select string_agg(v, ';') from jsonb_array_elements_text(ap.answers->(f->>'id')) v) else ap.answers->>(f->>'id') end), ',' order by n) from jsonb_array_elements(p.form) with ordinality x(f, n)), ''),
      E'\r\n' order by ap.applied_at, ap.member_no), '') into body from lms_q_application ap where ap.program_id = p.program_id;
  return jsonb_build_object('filename', '신청자_' || regexp_replace(p.title, '[\\/:*?"<>|\s]+', '_', 'g') || '.csv', 'mime', 'text/csv; charset=utf-8', 'content', chr(65279) || hdr || E'\r\n' || body); end $$;
-- 문자 발송 화면 → 발송 대기열(실발송은 문자 연동 후)
create or replace function lms_q_notify(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); tg jsonb; begin
  perform lms_q_can(actor, p);
  if lms_k_t(a, 'body', 1000) = '' then perform lms_k_err(400, 'bad_body', '보낼 내용을 입력하세요.'); end if;
  tg := case jsonb_typeof(a->'member_nos') when 'array' then a->'member_nos' else (select coalesce(jsonb_agg(member_no order by member_no), '[]') from lms_q_application where program_id = p.program_id and status = coalesce(nullif(lms_k_t(a, 'status'), ''), 'approved')) end;
  insert into lms_q_notify (tenant_id, program_id, kind, targets, body) values (lms_k_tid(), p.program_id, 'sms', tg, lms_k_t(a, 'body', 1000));
  return jsonb_build_object('ok', true, 'targets', jsonb_array_length(tg), 'status', 'queued', 'note', '문자 연동 후 실제 발송됩니다.'); end $$;

-- ── 출석 · 이수 ─────────────────────────────────────────
create or replace function lms_q_attend(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); sid uuid := lms_k_uuid(a, 'session_id'); r jsonb; n int := 0; begin
  perform lms_q_can(actor, p); perform lms_q_unlocked(p);
  if p.status not in ('running','completing') then perform lms_k_err(409, 'bad_status', '운영중 · 이수처리중에만 출석을 입력합니다.'); end if;
  if not exists (select 1 from lms_q_session where session_id = sid and program_id = p.program_id) then perform lms_k_err(404, 'no_session', '주제(회차)를 찾을 수 없습니다.'); end if;
  if jsonb_typeof(a->'records') <> 'array' then perform lms_k_err(400, 'bad_records', '출석 목록을 보내세요.'); end if;
  for r in select * from jsonb_array_elements(a->'records') loop
    if r->>'status' not in ('present','late','absent','excused') then perform lms_k_err(400, 'bad_status', '출석 상태가 올바르지 않습니다.'); end if;
    if not exists (select 1 from lms_q_application where program_id = p.program_id and member_no = r->>'member_no' and status = 'approved') then continue; end if;
    insert into lms_q_attend (tenant_id, program_id, session_id, member_no, status) values (lms_k_tid(), p.program_id, sid, r->>'member_no', r->>'status')
    on conflict (tenant_id, session_id, member_no) do update set status = excluded.status, at = now();
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'saved', n); end $$;
create or replace function lms_q_attendance(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); begin
  return jsonb_build_object('sessions', coalesce((select jsonb_agg(jsonb_build_object('session_id', s.session_id, 'seq', s.seq, 'title', s.title) order by s.seq) from lms_q_session s where s.program_id = p.program_id), '[]'),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('member_no', ap.member_no, 'marks', (select coalesce(jsonb_object_agg(t.session_id, t.status), '{}') from lms_q_attend t where t.program_id = p.program_id and t.member_no = ap.member_no)) order by ap.member_no)
      from lms_q_application ap where ap.program_id = p.program_id and ap.status = 'approved'), '[]')); end $$;
-- 이수 판정: 출석률 + 만족도 설문 응답 자동 확인(+ K 게이트 completion) — 이수처리중에만
create or replace function lms_q_completion_run(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); ap lms_q_application; tot int; att int; pct int; why text; nc int := 0; nf int := 0; begin
  perform lms_q_can(actor, p); perform lms_q_unlocked(p);
  if p.status <> 'completing' then perform lms_k_err(409, 'bad_status', '이수처리중 상태에서만 이수 판정을 합니다.'); end if;
  select count(*) into tot from lms_q_session where program_id = p.program_id;
  for ap in select * from lms_q_application where program_id = p.program_id and status = 'approved' order by member_no loop
    select count(*) into att from lms_q_attend t where t.program_id = p.program_id and t.member_no = ap.member_no and t.status in ('present','late','excused');
    pct := case when tot = 0 then 100 else round(100.0 * att / tot) end; why := '';
    if pct < coalesce((p.completion->>'attend_min_pct')::int, 0) then why := '출석률 ' || pct || '%'; end if;
    if why = '' and coalesce((p.completion->>'survey_required')::boolean, false) and p.sat_survey_id is not null
       and not exists (select 1 from lms_k_response r where r.survey_id = p.sat_survey_id and r.member_hash = lms_k_mhash(p.sat_survey_id, ap.member_no)) then why := '만족도 설문 미응답'; end if;
    if why = '' and (lms_k_gate_check(ap.member_no, 'completion', 'program', p.program_id::text)->>'blocked')::boolean then why := '설문 미참여'; end if;
    update lms_q_application set completion = case when why = '' then 'completed' else 'failed' end, completion_note = why,
      mileage = case when why = '' then p.mileage_max + extra_mileage else 0 end where program_id = p.program_id and member_no = ap.member_no;
    if why = '' then nc := nc + 1; else nf := nf + 1; end if;
  end loop;
  perform lms_q_hist(p.program_id, 'completion', p.status, p.status, actor, '이수 ' || nc || ' · 미이수 ' || nf);
  return jsonb_build_object('ok', true, 'completed', nc, 'failed', nf, 'items', (lms_q_applicants(actor, jsonb_build_object('program_id', p.program_id, 'status', 'approved')))->'items'); end $$;
-- 개별 이수 수정 · 추가 마일리지(마감 후 수정 불가)
create or replace function lms_q_completion_set(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); ap lms_q_application; c text := lms_k_t(a, 'completion', 10); ex int := coalesce(lms_k_i(a, 'extra_mileage'), 0); begin
  perform lms_q_can(actor, p); perform lms_q_unlocked(p);
  if p.status not in ('completing','closing') then perform lms_k_err(409, 'bad_status', '이수처리중 · 마감처리중에만 이수를 고칩니다.'); end if;
  if c not in ('completed','failed','pending') then perform lms_k_err(400, 'bad_completion', '이수 상태가 올바르지 않습니다.'); end if;
  if ex < 0 or ex > 1000 then perform lms_k_err(400, 'bad_mileage', '추가 마일리지는 0~1000입니다.'); end if;
  update lms_q_application set completion = c, extra_mileage = ex, completion_note = lms_k_t(a, 'note', 200), mileage = case when c = 'completed' then p.mileage_max + ex else 0 end
   where program_id = p.program_id and member_no = lms_k_no(a) and status = 'approved' returning * into ap;
  if ap is null then perform lms_k_err(404, 'no_application', '승인된 신청자가 아닙니다.'); end if;
  return lms_q_aout(ap); end $$;
-- 이수증(인쇄용 HTML)
create or replace function lms_q_certificate(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); ap lms_q_application; begin
  select * into ap from lms_q_application where program_id = p.program_id and member_no = lms_k_no(a);
  if not found or ap.completion <> 'completed' then perform lms_k_err(409, 'not_completed', '이수한 학생만 이수증을 받을 수 있습니다.'); end if;
  if p.status not in ('closing','closed') then perform lms_k_err(409, 'not_closed', '마감처리 단계부터 이수증을 발급합니다.'); end if;
  return jsonb_build_object('filename', '이수증_' || ap.member_no || '.html', 'mime', 'text/html; charset=utf-8',
    'content', '<!doctype html><html lang="ko"><meta charset="utf-8"><title>이수증</title><body style="font-family:sans-serif;max-width:720px;margin:40px auto;text-align:center;border:6px double #333;padding:48px">'
      || '<h1 style="letter-spacing:12px">이 수 증</h1><p>학번: ' || ap.member_no || '</p><p>프로그램: ' || p.title || '</p><p>운영 기간: ' || coalesce(to_char(p.starts_at, 'YYYY.MM.DD'), '-') || ' ~ ' || coalesce(to_char(p.ends_at, 'YYYY.MM.DD'), '-') || ' · ' || p.total_hours || '시간</p>'
      || '<p>역량: ' || coalesce((select string_agg((x->>'name') || ' ' || (x->>'pct') || '%', ', ') from jsonb_array_elements(p.competencies) x), '-') || ' · 마일리지 ' || ap.mileage || '</p>'
      || '<p style="margin:32px 0">위 학생은 비교과 프로그램을 성실히 이수하였음을 증명합니다.</p><p><b>교육혁신본부</b></p></body></html>'); end $$;

-- ── 설문 연결 · 만족도 자동 생성(역량별 교육목표 문항 자동 삽입) · 결과 일괄 다운로드 ──
create or replace function lms_q_survey_link(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); k text := lms_k_t(a, 'kind', 5); sid uuid := lms_k_uuid(a, 'survey_id'); begin
  perform lms_q_can(actor, p); perform lms_q_unlocked(p);
  if k not in ('pre','sat') then perform lms_k_err(400, 'bad_kind', '사전(pre) · 만족도(sat) 중 하나입니다.'); end if;
  if sid is not null then perform lms_k_get_survey(sid); update lms_k_survey set scope = 'program', scope_ref = p.program_id::text where survey_id = sid; end if;
  if k = 'pre' then update lms_q_program set pre_survey_id = sid where program_id = p.program_id; else update lms_q_program set sat_survey_id = sid where program_id = p.program_id; end if;
  return lms_q_out(lms_q_get(p.program_id)); end $$;
create or replace function lms_q_survey_auto(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); sid uuid; qs jsonb; begin
  perform lms_q_can(actor, p); perform lms_q_unlocked(p);
  if p.sat_survey_id is not null then perform lms_k_err(409, 'exists', '이미 만족도 설문이 연결되어 있습니다.'); end if;
  qs := '[{"type":"likert5","text":{"ko":"프로그램 내용에 전반적으로 만족한다.","en":"Overall I am satisfied with the program."}},{"type":"likert5","text":{"ko":"운영(일정 · 장소 · 안내)이 적절했다.","en":"Operation was appropriate."}}]'::jsonb
    || coalesce((select jsonb_agg(jsonb_build_object('type', 'likert5', 'text', jsonb_build_object('ko', '[' || (x->>'name') || '] ' || coalesce(nullif(x->>'goal', ''), x->>'name' || ' 역량이 향상되었다') || ' — 이 교육목표를 달성했다.'), 'meta', jsonb_build_object('competency', x->>'code'))) from jsonb_array_elements(p.competencies) x), '[]')
    || '[{"type":"longtext","required":false,"text":{"ko":"좋았던 점과 개선할 점","en":"Comments"}}]'::jsonb;
  insert into lms_k_survey (tenant_id, title, i18n, langs, scope, scope_ref, kind, gate_steps, created_by) values (lms_k_tid(), p.title || ' 만족도 조사', jsonb_build_object('en', 'Satisfaction survey'), '{ko,en}', 'program', p.program_id::text, 'satisfaction', '{}', actor->>'email') returning survey_id into sid;
  perform lms_k_put_questions(sid, qs);
  update lms_q_program set sat_survey_id = sid where program_id = p.program_id;
  return lms_k_survey_get(actor, jsonb_build_object('survey_id', sid)); end $$;
create or replace function lms_q_survey_results(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare ids uuid[]; res text := ''; x record; begin
  if jsonb_typeof(a->'program_ids') = 'array' then ids := (select array_agg(v::uuid) from jsonb_array_elements_text(a->'program_ids') v where v ~* '^[0-9a-f-]{36}$'); else ids := array[lms_q_pid(a)]; end if;
  for x in select p.title, k.kind_, k.sid from lms_q_program p, lateral (values ('사전', p.pre_survey_id), ('만족도', p.sat_survey_id)) k(kind_, sid) where p.program_id = any(ids) and k.sid is not null order by p.title, k.kind_ loop
    res := res || lms_k_csv('[' || x.title || '] ' || x.kind_ || ' 설문') || E'\r\n' || lms_k_export_csv(x.sid, 'ko') || E'\r\n\r\n';
  end loop;
  if res = '' then perform lms_k_err(404, 'no_survey', '연결된 설문이 없습니다.'); end if;
  return jsonb_build_object('filename', '비교과_설문결과_일괄.csv', 'mime', 'text/csv; charset=utf-8', 'content', chr(65279) || res); end $$;

-- ── 예산 · 지출(지출품의서) · 운영계획서 ─────────────────
create or replace function lms_q_budget(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); begin
  return jsonb_build_object('program_id', p.program_id, 'items', coalesce((select jsonb_agg(jsonb_build_object('item', b->>'item', 'amount', (b->>'amount')::numeric,
      'spent', (select coalesce(sum(e.amount), 0) from lms_q_expense e where e.program_id = p.program_id and e.item = b->>'item'))) from jsonb_array_elements(p.budget) b), '[]'),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('seq', s.seq, 'title', s.title, 'budget', s.budget) order by s.seq) from lms_q_session s where s.program_id = p.program_id), '[]'),
    'expenses', coalesce((select jsonb_agg((to_jsonb(e) - 'tenant_id') order by e.spent_on nulls last, e.created_at) from lms_q_expense e where e.program_id = p.program_id), '[]'),
    'total', (select coalesce(sum((b->>'amount')::numeric), 0) from jsonb_array_elements(p.budget) b), 'spent', (select coalesce(sum(amount), 0) from lms_q_expense e where e.program_id = p.program_id)); end $$;
create or replace function lms_q_expense_save(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); eid uuid := lms_k_uuid(a, 'expense_id'); it text := lms_k_t(a, 'item', 60); amt numeric := lms_k_n(a, 'amount'); begin
  perform lms_q_can(actor, p); perform lms_q_unlocked(p);
  if p.status not in ('running','completing','closing') then perform lms_k_err(409, 'bad_status', '지출 내역은 운영 · 마감 단계에서 관리합니다.'); end if;
  if it = '' or amt is null or amt < 0 then perform lms_k_err(400, 'bad_expense', '예산 항목과 금액(0 이상)을 입력하세요.'); end if;
  if not exists (select 1 from jsonb_array_elements(p.budget) b where b->>'item' = it) then perform lms_k_err(400, 'bad_item', '예산 항목에 없는 지출입니다.'); end if;
  if eid is null then insert into lms_q_expense (tenant_id, program_id, item, amount, spent_on, vendor, memo) values (lms_k_tid(), p.program_id, it, amt, lms_k_ts(a, 'spent_on')::date, lms_k_t(a, 'vendor', 100), lms_k_t(a, 'memo', 500));
  else update lms_q_expense set item = it, amount = amt, spent_on = lms_k_ts(a, 'spent_on')::date, vendor = lms_k_t(a, 'vendor', 100), memo = lms_k_t(a, 'memo', 500) where expense_id = eid and program_id = p.program_id; end if;
  return lms_q_budget(actor, a); end $$;
create or replace function lms_q_expense_delete(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a), true); begin
  perform lms_q_can(actor, p); perform lms_q_unlocked(p);
  delete from lms_q_expense where expense_id = lms_k_uuid(a, 'expense_id') and program_id = p.program_id; return lms_q_budget(actor, a); end $$;
create or replace function lms_q_h(v text) returns text language sql immutable as $$ select replace(replace(replace(replace(coalesce(v, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;') $$;
create or replace function lms_q_doc(title text, body text, fmt text, fname text) returns jsonb language sql immutable as $$
  select jsonb_build_object('filename', fname || case when fmt = 'doc' then '.doc' else '.html' end, 'mime', case when fmt = 'doc' then 'application/msword' else 'text/html; charset=utf-8' end,
    'content', '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' || lms_q_h(title) || '</title><style>body{font-family:sans-serif;max-width:800px;margin:24px auto;line-height:1.6}table{border-collapse:collapse;width:100%}td,th{border:1px solid #444;padding:6px;text-align:left}h1{font-size:22px}</style></head><body>' || body || '</body></html>') $$;
create or replace function lms_q_expense_doc(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); b jsonb := lms_q_budget(actor, a); begin
  return lms_q_doc('지출품의서', '<h1>지출품의서</h1><p>프로그램: ' || lms_q_h(p.title) || '</p><table><tr><th>일자</th><th>예산 항목</th><th>거래처</th><th>내용</th><th>금액(원)</th></tr>' ||
    coalesce((select string_agg('<tr><td>' || coalesce(e->>'spent_on', '') || '</td><td>' || lms_q_h(e->>'item') || '</td><td>' || lms_q_h(e->>'vendor') || '</td><td>' || lms_q_h(e->>'memo') || '</td><td>' || to_char((e->>'amount')::numeric, 'FM999,999,999,990') || '</td></tr>', '') from jsonb_array_elements(b->'expenses') e), '') ||
    '<tr><th colspan="4">합계</th><th>' || to_char((b->>'spent')::numeric, 'FM999,999,999,990') || '</th></tr></table><p>위와 같이 지출하고자 합니다.</p><p>담당: ' || lms_q_h(coalesce(p.operator_email, '')) || '</p>', lms_k_t(a, 'format', 5), '지출품의서_' || regexp_replace(p.title, '[\\/:*?"<>|\s]+', '_', 'g')); end $$;
create or replace function lms_q_plan(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); begin
  return lms_q_doc('운영계획서', '<h1>비교과 프로그램 운영계획서</h1><table>' ||
    '<tr><th>프로그램명</th><td>' || lms_q_h(p.title) || '</td></tr><tr><th>개요</th><td>' || lms_q_h(p.summary) || '</td></tr><tr><th>개설 근거</th><td>' || lms_q_h(p.basis) || '</td></tr>' ||
    '<tr><th>운영 형태</th><td>' || case p.kind when 'team' then '팀(' || p.team_min || '~' || p.team_max || '명)' else '개인' end || ' · 모집 ' || coalesce(p.capacity::text, '제한 없음') || ' · 승인 방식 ' ||
      case p.approval_mode when 'auto' then '자동 승인' when 'fcfs' then '선착순' when 'fcfs_wait' then '선착순+대기자 자동 승격' else '운영자 승인' end || '</td></tr>' ||
    '<tr><th>신청 기간</th><td>' || coalesce(to_char(p.apply_from, 'YYYY.MM.DD HH24:MI'), '-') || ' ~ ' || coalesce(to_char(p.apply_to, 'YYYY.MM.DD HH24:MI'), '-') || '</td></tr>' ||
    '<tr><th>운영 기간 · 장소</th><td>' || coalesce(to_char(p.starts_at, 'YYYY.MM.DD'), '-') || ' ~ ' || coalesce(to_char(p.ends_at, 'YYYY.MM.DD'), '-') || ' · ' || lms_q_h(p.place) || ' · 총 ' || p.total_hours || '시간 / ' || p.total_count || '회</td></tr>' ||
    '<tr><th>마일리지 · 역량지수</th><td>' || p.mileage_max || ' · ' || p.comp_index || '</td></tr></table><h2>핵심역량 연관성</h2><table><tr><th>역량</th><th>구분</th><th>비율</th><th>교육목표</th></tr>' ||
    coalesce((select string_agg('<tr><td>' || lms_q_h(x->>'name') || '</td><td>' || case when (x->>'main')::boolean then '주역량' else '부역량' end || '</td><td>' || (x->>'pct') || '%</td><td>' || lms_q_h(x->>'goal') || '</td></tr>', '') from jsonb_array_elements(p.competencies) x), '') ||
    '</table><h2>주제(회차)</h2><table><tr><th>회차</th><th>주제</th><th>일시</th><th>장소</th><th>시간</th><th>예산</th></tr>' ||
    coalesce((select string_agg('<tr><td>' || s.seq || '</td><td>' || lms_q_h(s.title) || '</td><td>' || coalesce(to_char(s.starts_at, 'MM.DD HH24:MI'), '-') || '</td><td>' || lms_q_h(s.place) || '</td><td>' || s.hours || '</td><td>' || to_char(s.budget, 'FM999,999,990') || '</td></tr>', '' order by s.seq) from lms_q_session s where s.program_id = p.program_id), '') ||
    '</table><h2>예산</h2><table><tr><th>항목</th><th>금액(원)</th></tr>' || coalesce((select string_agg('<tr><td>' || lms_q_h(b->>'item') || '</td><td>' || to_char((b->>'amount')::numeric, 'FM999,999,999,990') || '</td></tr>', '') from jsonb_array_elements(p.budget) b), '') || '</table>',
    lms_k_t(a, 'format', 5), '운영계획서_' || regexp_replace(p.title, '[\\/:*?"<>|\s]+', '_', 'g')); end $$;

-- ── CQI 보고서(작성 · 승인 요청 · 관리부서 승인 · 다운로드 · 다중 선택 일괄 작성) ──
create or replace function lms_q_cqi_auto(p lms_q_program) returns jsonb language sql stable as $$
  select jsonb_build_object('applicants', (lms_q_counts(p.program_id)->>'approved')::int, 'completed', (lms_q_counts(p.program_id)->>'completed')::int,
    'completion_rate', case when (lms_q_counts(p.program_id)->>'approved')::int = 0 then 0 else round(100.0 * (lms_q_counts(p.program_id)->>'completed')::int / (lms_q_counts(p.program_id)->>'approved')::int, 1) end,
    'satisfaction', (select round(avg((r.answers->>(q.qid::text))::numeric), 2) from lms_k_question q join lms_k_response r on r.survey_id = q.survey_id where q.survey_id = p.sat_survey_id and q.type = 'likert5' and jsonb_typeof(r.answers->(q.qid::text)) = 'number'),
    'budget', (select coalesce(sum((b->>'amount')::numeric), 0) from jsonb_array_elements(p.budget) b), 'spent', (select coalesce(sum(amount), 0) from lms_q_expense e where e.program_id = p.program_id)) $$;
create or replace function lms_q_cqi(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); c lms_q_cqi; begin
  select * into c from lms_q_cqi where program_id = p.program_id;
  return jsonb_build_object('program_id', p.program_id, 'title', p.title, 'program_status', p.status, 'auto', lms_q_cqi_auto(p), 'exists', c.program_id is not null,
    'content', coalesce(c.content, '{}'), 'status', coalesce(c.status, 'none'), 'memo', coalesce(c.memo, ''), 'decided_by', c.decided_by, 'updated_at', c.updated_at); end $$;
create or replace function lms_q_cqi_save(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare ids uuid[]; x uuid; p lms_q_program; n int := 0; ct jsonb; begin
  if jsonb_typeof(a->'program_ids') = 'array' then ids := (select array_agg(v::uuid) from jsonb_array_elements_text(a->'program_ids') v where v ~* '^[0-9a-f-]{36}$'); else ids := array[lms_q_pid(a)]; end if;
  if coalesce(cardinality(ids), 0) = 0 then perform lms_k_err(400, 'bad_program', '프로그램을 고르세요.'); end if;
  ct := case jsonb_typeof(a->'content') when 'object' then a->'content' else '{}' end;
  foreach x in array ids loop
    p := lms_q_get(x); perform lms_q_can(actor, p);
    if p.status not in ('closing','closed') then perform lms_k_err(409, 'bad_status', '「' || p.title || '」은(는) 마감처리 단계 이후에 CQI를 작성합니다.'); end if;
    if exists (select 1 from lms_q_cqi where program_id = x and status in ('requested','approved')) then perform lms_k_err(409, 'cqi_locked', '「' || p.title || '」 CQI는 승인 요청 · 승인 후 고칠 수 없습니다.'); end if;
    insert into lms_q_cqi (tenant_id, program_id, content, status) values (lms_k_tid(), x, ct || jsonb_build_object('auto', lms_q_cqi_auto(p)), 'draft')
    on conflict (tenant_id, program_id) do update set content = excluded.content, status = 'draft', updated_at = now();
    n := n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'saved', n); end $$;
create or replace function lms_q_cqi_request(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); begin perform lms_q_can(actor, p);
  update lms_q_cqi set status = 'requested', updated_at = now() where program_id = p.program_id and status in ('draft','rejected');
  if not found then perform lms_k_err(409, 'bad_status', '작성 중 · 반려된 CQI만 승인 요청합니다.'); end if;
  return lms_q_cqi(actor, a); end $$;
create or replace function lms_q_cqi_decide(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); ok boolean := lms_k_b(a, 'approve'); begin
  if actor->>'role' <> 'owner' then perform lms_k_err(403, 'owner_only', 'CQI 승인은 관리부서(정운영자)가 합니다.'); end if;
  if not ok and lms_k_t(a, 'memo') = '' then perform lms_k_err(400, 'need_memo', '반려 사유를 입력하세요.'); end if;
  update lms_q_cqi set status = case when ok then 'approved' else 'rejected' end, memo = lms_k_t(a, 'memo', 1000), decided_by = actor->>'email', updated_at = now() where program_id = p.program_id and status = 'requested';
  if not found then perform lms_k_err(409, 'bad_status', '승인 요청된 CQI만 처리합니다.'); end if;
  return lms_q_cqi(actor, a); end $$;
create or replace function lms_q_cqi_doc(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare c jsonb := lms_q_cqi(actor, a); ct jsonb := c->'content'; au jsonb := lms_q_cqi_auto(lms_q_get(lms_q_pid(a))); begin
  if not (c->>'exists')::boolean then perform lms_k_err(404, 'no_cqi', 'CQI 보고서가 없습니다.'); end if;
  return lms_q_doc('CQI 보고서', '<h1>CQI(지속적 품질 개선) 보고서</h1><p>프로그램: ' || lms_q_h(c->>'title') || ' · 상태: ' || (c->>'status') || '</p><table>' ||
    '<tr><th>참여 · 이수</th><td>' || (au->>'applicants') || '명 참여 · ' || (au->>'completed') || '명 이수(' || (au->>'completion_rate') || '%)</td></tr>' ||
    '<tr><th>만족도(5점)</th><td>' || coalesce(au->>'satisfaction', '-') || '</td></tr><tr><th>예산 집행</th><td>' || to_char((au->>'spent')::numeric, 'FM999,999,999,990') || ' / ' || to_char((au->>'budget')::numeric, 'FM999,999,999,990') || '원</td></tr>' ||
    '<tr><th>목표 달성</th><td>' || lms_q_h(ct->>'goal') || '</td></tr><tr><th>운영 성과</th><td>' || lms_q_h(ct->>'result') || '</td></tr><tr><th>잘된 점</th><td>' || lms_q_h(ct->>'strengths') || '</td></tr>' ||
    '<tr><th>개선할 점</th><td>' || lms_q_h(ct->>'improve') || '</td></tr><tr><th>차기 반영 계획</th><td>' || lms_q_h(ct->>'next') || '</td></tr></table>', lms_k_t(a, 'format', 5), 'CQI_' || regexp_replace(c->>'title', '[\\/:*?"<>|\s]+', '_', 'g')); end $$;

-- ── 학생 화면: 목록 · 찜 · 나의 신청 · 역량 지수 · 후기 · 활동게시판 ──
create or replace function lms_q_student_programs(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare mno text := lms_k_no(a); q text := lms_k_t(a, 'q', 60); begin
  return jsonb_build_object('items', coalesce((select jsonb_agg(lms_q_out(p) || jsonb_build_object('wished', exists (select 1 from lms_q_wish w where w.program_id = p.program_id and w.member_no = mno),
      'my_status', (select status from lms_q_application ap where ap.program_id = p.program_id and ap.member_no = mno), 'eligible', lms_q_target_ok(p, mno))
      order by case p.status when 'recruiting' then 0 when 'ready' then 1 when 'running' then 2 else 3 end, p.certified desc, p.apply_to nulls last, p.title)
    from lms_q_program p where p.status in ('ready','recruiting','running','completing','closing','closed')
      and (q = '' or p.title ilike '%' || q || '%' or exists (select 1 from unnest(p.tags) t where t ilike '%' || q || '%'))
      and (lms_k_t(a, 'status') = '' or p.status = lms_k_t(a, 'status')) and (not lms_k_b(a, 'wished') or exists (select 1 from lms_q_wish w where w.program_id = p.program_id and w.member_no = mno))
      and (lms_k_t(a, 'comp') = '' or p.competencies @> jsonb_build_array(jsonb_build_object('code', lms_k_t(a, 'comp'))))), '[]')); end $$;
create or replace function lms_q_wish(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_k_no(a); p lms_q_program := lms_q_get(lms_q_pid(a)); on_ boolean; begin
  delete from lms_q_wish where member_no = mno and program_id = p.program_id; on_ := not found;
  if on_ then insert into lms_q_wish (tenant_id, member_no, program_id) values (lms_k_tid(), mno, p.program_id); end if;
  return jsonb_build_object('ok', true, 'program_id', p.program_id, 'on', on_); end $$;
-- 나의 역량 지수: 이수 프로그램의 마일리지 · 역량지수를 역량 비율로 나눠 합산(마감 전은 예정)
create or replace function lms_q_student_me(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare mno text := lms_k_no(a); begin
  return jsonb_build_object('member_no', mno,
    'applications', coalesce((select jsonb_agg(lms_q_aout(ap) || jsonb_build_object('title', p.title, 'program_status', p.status, 'status_name', lms_q_stname(p.status), 'allow_edit', p.allow_edit, 'allow_cancel', p.allow_cancel) order by ap.applied_at desc)
      from lms_q_application ap join lms_q_program p on p.program_id = ap.program_id where ap.member_no = mno), '[]'),
    'mileage', (select coalesce(sum(ap.mileage), 0) from lms_q_application ap join lms_q_program p on p.program_id = ap.program_id where ap.member_no = mno and ap.completion = 'completed' and p.status = 'closed'),
    'mileage_expected', (select coalesce(sum(ap.mileage), 0) from lms_q_application ap join lms_q_program p on p.program_id = ap.program_id where ap.member_no = mno and ap.completion = 'completed' and p.status <> 'closed'),
    'competency', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'name', name, 'index', round(idx, 2), 'mileage', round(mil, 1)) order by name) from (
      select x->>'code' code, x->>'name' name, sum(p.comp_index * (x->>'pct')::numeric / 100) idx, sum(ap.mileage * (x->>'pct')::numeric / 100) mil
      from lms_q_application ap join lms_q_program p on p.program_id = ap.program_id, jsonb_array_elements(p.competencies) x
      where ap.member_no = mno and ap.completion = 'completed' group by 1, 2) z), '[]')); end $$;
create or replace function lms_q_review(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_k_no(a); p lms_q_program := lms_q_get(lms_q_pid(a)); rt int := lms_k_i(a, 'rating'); begin
  if not exists (select 1 from lms_q_application where program_id = p.program_id and member_no = mno and status = 'approved') then perform lms_k_err(403, 'not_participant', '참여한 학생만 후기를 남길 수 있습니다.'); end if;
  if p.status not in ('running','completing','closing','closed') then perform lms_k_err(409, 'bad_status', '운영이 시작된 뒤에 후기를 남길 수 있습니다.'); end if;
  if rt is null or rt not between 1 and 5 or lms_k_t(a, 'body', 2000) = '' then perform lms_k_err(400, 'bad_review', '별점(1~5)과 후기를 입력하세요.'); end if;
  insert into lms_q_review (tenant_id, program_id, member_no, rating, body) values (lms_k_tid(), p.program_id, mno, rt, lms_k_t(a, 'body', 2000))
  on conflict (tenant_id, program_id, member_no) do update set rating = excluded.rating, body = excluded.body, at = now();
  return lms_q_reviews(actor, a); end $$;
create or replace function lms_q_reviews(actor jsonb, a jsonb) returns jsonb language sql stable as $$
  select jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('member_no', left(r.member_no, 4) || '****', 'rating', r.rating, 'body', r.body, 'at', r.at) order by r.at desc, r.member_no) from lms_q_review r where r.program_id = lms_q_pid(a)), '[]'),
    'avg', (select round(avg(rating), 1) from lms_q_review r where r.program_id = lms_q_pid(a))) $$;
create or replace function lms_q_board(actor jsonb, a jsonb) returns jsonb language sql stable as $$
  select jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('post_id', b.post_id, 'member_no', left(b.member_no, 4) || '****', 'body', b.body, 'at', b.at) order by b.at desc, b.post_id) from lms_q_board b where b.program_id = lms_q_pid(a)), '[]')) $$;
create or replace function lms_q_board_post(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_k_no(a); p lms_q_program := lms_q_get(lms_q_pid(a)); begin
  if not exists (select 1 from lms_q_application where program_id = p.program_id and member_no = mno and status = 'approved') then perform lms_k_err(403, 'not_participant', '참여 학생만 활동게시판에 글을 쓸 수 있습니다.'); end if;
  if lms_k_t(a, 'body', 2000) = '' then perform lms_k_err(400, 'bad_body', '내용을 입력하세요.'); end if;
  insert into lms_q_board (tenant_id, program_id, member_no, body) values (lms_k_tid(), p.program_id, mno, lms_k_t(a, 'body', 2000));
  return lms_q_board(actor, a); end $$;
