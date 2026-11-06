-- v30 묶음 C — 학습활동: 토론(단일주제 · 자유발언, 보드 · 스레드형, 팀별 토론방) · 위키(공동 편집 · 버전) · 팀 프로젝트(팀 구성 · 팀 한정 과제 · 진행 현황)
--   · 자기/동료 평가(익명 · 배정 개수 · 자동/수동 배정 · 점수 집계) · 강좌 대화방 · 간편 설문 · 플립러닝 사전 과제 · 사전 질문 · 수업 평가 자료(제출 → 교수 평가 → 공지)
-- 공통 도우미(lmsb_*)는 20_b.sql. 업무 규칙 · 응답 JSON은 lms_c_api 한 곳(Node mod-c.js · Java lms.c가 같은 함수를 부른다).

create table if not exists lms_c_team (
  tenant_id text not null, team_id uuid not null default gen_random_uuid(), section_id uuid not null,
  set_name text not null default '기본', name text not null, created_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, team_id), foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_c_team_member (
  tenant_id text not null, team_id uuid not null, person_id uuid not null, leader boolean not null default false,
  primary key (tenant_id, team_id, person_id), foreign key (tenant_id, team_id) references lms_c_team (tenant_id, team_id) on delete cascade,
  foreign key (tenant_id, person_id) references lms_person (tenant_id, person_id)
);
create table if not exists lms_c_forum (
  tenant_id text not null, forum_id uuid not null default gen_random_uuid(), section_id uuid not null, team_id uuid,
  kind text not null default 'free' check (kind in ('single','free')), layout text not null default 'thread' check (layout in ('board','thread')),
  title text not null, prompt text not null default '', anonymous boolean not null default false, opens_at timestamptz, closes_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, forum_id), foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade,
  foreign key (tenant_id, team_id) references lms_c_team (tenant_id, team_id) on delete cascade
);
create table if not exists lms_c_post (
  tenant_id text not null, post_id uuid not null default gen_random_uuid(), forum_id uuid not null, parent_id uuid,
  author_pid uuid, author_label text not null, title text not null default '', body text not null,
  created_at timestamptz not null default clock_timestamp(), edited_at timestamptz, deleted_at timestamptz,
  primary key (tenant_id, post_id), foreign key (tenant_id, forum_id) references lms_c_forum (tenant_id, forum_id) on delete cascade
);
create table if not exists lms_c_wiki (
  tenant_id text not null, page_id uuid not null default gen_random_uuid(), section_id uuid not null, team_id uuid,
  title text not null, body text not null default '', ver int not null default 1, updated_by text, updated_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, page_id), foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade,
  foreign key (tenant_id, team_id) references lms_c_team (tenant_id, team_id) on delete cascade
);
create table if not exists lms_c_wiki_ver (
  tenant_id text not null, page_id uuid not null, ver int not null, title text not null, body text not null, note text not null default '', by_label text, at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, page_id, ver), foreign key (tenant_id, page_id) references lms_c_wiki (tenant_id, page_id) on delete cascade
);
create table if not exists lms_c_task (
  tenant_id text not null, task_id uuid not null default gen_random_uuid(), section_id uuid not null, team_id uuid,
  title text not null, body text not null default '', due_at timestamptz, created_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, task_id), foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade,
  foreign key (tenant_id, team_id) references lms_c_team (tenant_id, team_id) on delete cascade
);
create table if not exists lms_c_task_status (
  tenant_id text not null, task_id uuid not null, team_id uuid not null, status text not null check (status in ('todo','doing','done')),
  note text not null default '', by_label text, at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, task_id, team_id), foreign key (tenant_id, task_id) references lms_c_task (tenant_id, task_id) on delete cascade,
  foreign key (tenant_id, team_id) references lms_c_team (tenant_id, team_id) on delete cascade
);
create table if not exists lms_c_review (
  tenant_id text not null, review_id uuid not null default gen_random_uuid(), section_id uuid not null,
  title text not null, body text not null default '', anonymous boolean not null default true, per_reviewer smallint not null default 2,
  mode text not null default 'auto' check (mode in ('auto','manual')), self boolean not null default true,
  criteria jsonb not null default '[]', due_at timestamptz, created_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, review_id), foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_c_review_sub (
  tenant_id text not null, review_id uuid not null, person_id uuid not null, content text not null, at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, review_id, person_id), foreign key (tenant_id, review_id) references lms_c_review (tenant_id, review_id) on delete cascade,
  foreign key (tenant_id, person_id) references lms_person (tenant_id, person_id)
);
create table if not exists lms_c_review_alloc (
  tenant_id text not null, alloc_id uuid not null default gen_random_uuid(), review_id uuid not null, reviewer uuid not null, reviewee uuid not null,
  scores jsonb, total numeric(7,2), comment text, done_at timestamptz,
  primary key (tenant_id, alloc_id), unique (tenant_id, review_id, reviewer, reviewee),
  foreign key (tenant_id, review_id) references lms_c_review (tenant_id, review_id) on delete cascade
);
create table if not exists lms_c_chat (
  tenant_id text not null, msg_id bigserial, section_id uuid not null, author_pid uuid, author_label text not null, body text not null, at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, msg_id), foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create index if not exists lms_c_chat_sec on lms_c_chat (tenant_id, section_id, msg_id);
create table if not exists lms_c_poll (
  tenant_id text not null, poll_id uuid not null default gen_random_uuid(), section_id uuid not null,
  question text not null, options jsonb not null, multi boolean not null default false, anonymous boolean not null default true,
  closes_at timestamptz, closed boolean not null default false, created_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, poll_id), foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_c_poll_vote (
  tenant_id text not null, poll_id uuid not null, who text not null, person_id uuid, choices int[] not null, at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, poll_id, who), foreign key (tenant_id, poll_id) references lms_c_poll (tenant_id, poll_id) on delete cascade
);
create table if not exists lms_c_pretask (
  tenant_id text not null, task_id uuid not null default gen_random_uuid(), section_id uuid not null, session_id uuid,
  kind text not null check (kind in ('pretask','question','eval')), title text not null, body text not null default '',
  due_at timestamptz, published_at timestamptz, notice_id uuid, created_at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, task_id), foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade,
  foreign key (tenant_id, session_id) references lms_session (tenant_id, session_id) on delete set null (session_id)
);
create table if not exists lms_c_pretask_sub (
  tenant_id text not null, task_id uuid not null, person_id uuid not null, body text not null, score numeric(7,2), feedback text,
  graded_by text, graded_at timestamptz, at timestamptz not null default clock_timestamp(),
  primary key (tenant_id, task_id, person_id), foreign key (tenant_id, task_id) references lms_c_pretask (tenant_id, task_id) on delete cascade,
  foreign key (tenant_id, person_id) references lms_person (tenant_id, person_id)
);

do $$ declare t text; begin
  foreach t in array array['lms_c_team','lms_c_team_member','lms_c_forum','lms_c_post','lms_c_wiki','lms_c_wiki_ver','lms_c_task','lms_c_task_status','lms_c_review','lms_c_review_sub','lms_c_review_alloc','lms_c_chat','lms_c_poll','lms_c_poll_vote','lms_c_pretask','lms_c_pretask_sub'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_c_chat_msg_id_seq to didisam_tenant;
end $$;

-- 내 팀(학생) — 관리자는 null(모든 팀)
create or replace function lmsc_myteams(sec uuid, a jsonb) returns uuid[] language sql stable as $$
  select case when lmsb_mgr(a) or a->>'pid' is null then null else coalesce((select array_agg(m.team_id) from lms_c_team_member m join lms_c_team t on t.tenant_id = m.tenant_id and t.team_id = m.team_id where m.tenant_id = lmsb_tid() and t.section_id = sec and m.person_id = (a->>'pid')::uuid), '{}') end $$;
create or replace function lmsc_seeteam(sec uuid, a jsonb, team uuid) returns boolean language sql stable as $$
  select team is null or lmsc_myteams(sec, a) is null or team = any(lmsc_myteams(sec, a)) $$;
create or replace function lmsc_who(pid uuid, label text, anon boolean, a jsonb) returns text language sql stable as $$
  select case when anon and a->>'role' not in ('admin','professor') and pid is distinct from (a->>'pid')::uuid then '익명'
    else coalesce((select member_no from lms_person where tenant_id = lmsb_tid() and person_id = pid), label) end $$;
create or replace function lmsc_team_json(t lms_c_team) returns jsonb language sql stable as $$
  select jsonb_build_object('id', t.team_id, 'set', t.set_name, 'name', t.name,
    'members', coalesce((select jsonb_agg(jsonb_build_object('no', p.member_no, 'unit', p.unit_code, 'leader', m.leader) order by m.leader desc, p.member_no) from lms_c_team_member m join lms_person p on p.tenant_id = m.tenant_id and p.person_id = m.person_id where m.tenant_id = t.tenant_id and m.team_id = t.team_id), '[]')) $$;
create or replace function lmsc_pid_of(sec uuid, no text) returns uuid language plpgsql stable as $$
declare id uuid;
begin
  select p.person_id into id from lms_person p join lms_enrollment e on e.tenant_id = p.tenant_id and e.person_id = p.person_id and e.section_id = sec and e.status = 'enrolled' where p.tenant_id = lmsb_tid() and p.member_no = no;
  if id is null then perform lmsb_err(404, 'person', format('%s은(는) 이 강의실 수강생이 아닙니다.', no)); end if;
  return id;
end $$;
create or replace function lmsc_open(o timestamptz, c timestamptz) returns boolean language sql stable as $$ select (o is null or now() >= o) and (c is null or now() <= c) $$;

-- 백업 · 복사용(묶음 B lmsb_export/import가 부른다): 팀 없는 활동 정의만
create or replace function lmsc_export(sec uuid) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'forums', coalesce((select jsonb_agg(jsonb_build_object('kind', f.kind, 'layout', f.layout, 'title', f.title, 'prompt', f.prompt, 'anonymous', f.anonymous) order by f.created_at) from lms_c_forum f where f.tenant_id = lmsb_tid() and f.section_id = sec and f.team_id is null), '[]'),
    'wiki', coalesce((select jsonb_agg(jsonb_build_object('title', w.title, 'body', w.body) order by w.updated_at) from lms_c_wiki w where w.tenant_id = lmsb_tid() and w.section_id = sec and w.team_id is null), '[]'),
    'polls', coalesce((select jsonb_agg(jsonb_build_object('question', q.question, 'options', q.options, 'multi', q.multi, 'anonymous', q.anonymous) order by q.created_at) from lms_c_poll q where q.tenant_id = lmsb_tid() and q.section_id = sec), '[]'),
    'pretasks', coalesce((select jsonb_agg(jsonb_build_object('kind', k.kind, 'title', k.title, 'body', k.body) order by k.created_at) from lms_c_pretask k where k.tenant_id = lmsb_tid() and k.section_id = sec), '[]'),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('title', r.title, 'body', r.body, 'anonymous', r.anonymous, 'per_reviewer', r.per_reviewer, 'mode', r.mode, 'self', r.self, 'criteria', r.criteria) order by r.created_at) from lms_c_review r where r.tenant_id = lmsb_tid() and r.section_id = sec), '[]')) $$;
create or replace function lmsc_import(sec uuid, d jsonb, repl boolean, a jsonb) returns void language plpgsql as $$
declare e jsonb; pid uuid;
begin
  if repl then
    delete from lms_c_forum where tenant_id = lmsb_tid() and section_id = sec and team_id is null;
    delete from lms_c_wiki where tenant_id = lmsb_tid() and section_id = sec and team_id is null;
    delete from lms_c_poll where tenant_id = lmsb_tid() and section_id = sec;
    delete from lms_c_pretask where tenant_id = lmsb_tid() and section_id = sec;
    delete from lms_c_review where tenant_id = lmsb_tid() and section_id = sec;
  end if;
  for e in select * from jsonb_array_elements(coalesce(d->'forums', '[]')) loop insert into lms_c_forum (tenant_id, section_id, kind, layout, title, prompt, anonymous) values (lmsb_tid(), sec, coalesce(e->>'kind', 'free'), coalesce(e->>'layout', 'thread'), left(e->>'title', 200), coalesce(e->>'prompt', ''), coalesce((e->>'anonymous')::boolean, false)); end loop;
  for e in select * from jsonb_array_elements(coalesce(d->'wiki', '[]')) loop
    insert into lms_c_wiki (tenant_id, section_id, title, body, updated_by) values (lmsb_tid(), sec, left(e->>'title', 200), coalesce(e->>'body', ''), a->>'label') returning page_id into pid;
    insert into lms_c_wiki_ver (tenant_id, page_id, ver, title, body, note, by_label) values (lmsb_tid(), pid, 1, left(e->>'title', 200), coalesce(e->>'body', ''), '가져오기', a->>'label');
  end loop;
  for e in select * from jsonb_array_elements(coalesce(d->'polls', '[]')) loop insert into lms_c_poll (tenant_id, section_id, question, options, multi, anonymous) values (lmsb_tid(), sec, left(e->>'question', 300), coalesce(e->'options', '[]'), coalesce((e->>'multi')::boolean, false), coalesce((e->>'anonymous')::boolean, true)); end loop;
  for e in select * from jsonb_array_elements(coalesce(d->'pretasks', '[]')) loop insert into lms_c_pretask (tenant_id, section_id, kind, title, body) values (lmsb_tid(), sec, e->>'kind', left(e->>'title', 200), coalesce(e->>'body', '')); end loop;
  for e in select * from jsonb_array_elements(coalesce(d->'reviews', '[]')) loop insert into lms_c_review (tenant_id, section_id, title, body, anonymous, per_reviewer, mode, self, criteria) values (lmsb_tid(), sec, left(e->>'title', 200), coalesce(e->>'body', ''), coalesce((e->>'anonymous')::boolean, true), coalesce((e->>'per_reviewer')::int, 2), coalesce(e->>'mode', 'auto'), coalesce((e->>'self')::boolean, true), coalesce(e->'criteria', '[]')); end loop;
end $$;

create or replace function lms_c_api(op text, p jsonb, x jsonb) returns jsonb language plpgsql set timezone = 'UTC' as $$
declare
  tid text := lmsb_tid(); sec uuid; a jsonb; r record; id uuid; id2 uuid; n int; v text; d jsonb; mt uuid[]; anon boolean; k int; arr uuid[]; ch int[];
begin
  if tid is null then perform lmsb_err(401, 'auth', '로그인이 필요합니다.'); end if;
  -- 대상으로 강의실 찾기
  if op in ('forum','forum-del') or (op = 'forum-save' and lmsb_uuid(p->>'id') is not null) or op = 'post' then
    id := lmsb_id(p, case when op = 'post' then 'forum' else 'id' end, '토론'); select f.* into r from lms_c_forum f where f.tenant_id = tid and f.forum_id = id; if not found then perform lmsb_err(404, 'forum', '토론을 찾을 수 없습니다.'); end if; sec := r.section_id;
  elsif op in ('post-edit','post-del') then
    id := lmsb_id(p, 'id', '글'); select f.section_id into sec from lms_c_post q join lms_c_forum f on f.tenant_id = q.tenant_id and f.forum_id = q.forum_id where q.tenant_id = tid and q.post_id = id; if sec is null then perform lmsb_err(404, 'post', '글을 찾을 수 없습니다.'); end if;
  elsif op in ('wiki-page','wiki-revert') or (op = 'wiki-save' and lmsb_uuid(p->>'id') is not null) then
    id := lmsb_id(p, 'id', '위키 문서'); sec := (select w.section_id from lms_c_wiki w where w.tenant_id = tid and w.page_id = id); if sec is null then perform lmsb_err(404, 'wiki', '위키 문서를 찾을 수 없습니다.'); end if;
  elsif op in ('team-del','team-member') or (op = 'team-save' and lmsb_uuid(p->>'id') is not null) then
    id := lmsb_id(p, case when op = 'team-member' then 'team' else 'id' end, '팀'); sec := (select t.section_id from lms_c_team t where t.tenant_id = tid and t.team_id = id); if sec is null then perform lmsb_err(404, 'team', '팀을 찾을 수 없습니다.'); end if;
  elsif op in ('task-del','task-status') or (op = 'task-save' and lmsb_uuid(p->>'id') is not null) then
    id := lmsb_id(p, case when op = 'task-status' then 'task' else 'id' end, '팀 과제'); sec := (select t.section_id from lms_c_task t where t.tenant_id = tid and t.task_id = id); if sec is null then perform lmsb_err(404, 'task', '팀 과제를 찾을 수 없습니다.'); end if;
  elsif op in ('review','review-del','review-submit','review-alloc') or (op = 'review-save' and lmsb_uuid(p->>'id') is not null) then
    id := lmsb_id(p, case when op in ('review-submit','review-alloc') then 'review' else 'id' end, '동료 평가'); sec := (select t.section_id from lms_c_review t where t.tenant_id = tid and t.review_id = id); if sec is null then perform lmsb_err(404, 'review', '동료 평가를 찾을 수 없습니다.'); end if;
  elsif op = 'review-score' then
    id := lmsb_id(p, 'alloc', '평가 배정'); sec := (select t.section_id from lms_c_review_alloc l join lms_c_review t on t.tenant_id = l.tenant_id and t.review_id = l.review_id where l.tenant_id = tid and l.alloc_id = id); if sec is null then perform lmsb_err(404, 'alloc', '평가 배정을 찾을 수 없습니다.'); end if;
  elsif op in ('poll-vote','poll-close','poll-del') or (op = 'poll-save' and lmsb_uuid(p->>'id') is not null) then
    id := lmsb_id(p, case when op = 'poll-vote' then 'poll' else 'id' end, '설문'); sec := (select t.section_id from lms_c_poll t where t.tenant_id = tid and t.poll_id = id); if sec is null then perform lmsb_err(404, 'poll', '설문을 찾을 수 없습니다.'); end if;
  elsif op in ('pretask-del','pretask-submit','pretask-publish','pretask') or (op = 'pretask-save' and lmsb_uuid(p->>'id') is not null) then
    id := lmsb_id(p, case when op = 'pretask-submit' then 'task' else 'id' end, '사전 과제'); sec := (select t.section_id from lms_c_pretask t where t.tenant_id = tid and t.task_id = id); if sec is null then perform lmsb_err(404, 'pretask', '사전 과제를 찾을 수 없습니다.'); end if;
  elsif op = 'pretask-grade' then
    id := lmsb_id(p, 'task', '사전 과제'); sec := (select t.section_id from lms_c_pretask t where t.tenant_id = tid and t.task_id = id); if sec is null then perform lmsb_err(404, 'pretask', '사전 과제를 찾을 수 없습니다.'); end if;
  else
    sec := lmsb_sec(p);
  end if;
  a := lmsb_actor(sec, p, x); perform lmsb_need(a, 'course.view'); mt := lmsc_myteams(sec, a);

  -- ── 토론 ──
  if op = 'forums' then
    return jsonb_build_object('me', a || jsonb_build_object('manage', lmsb_can(a, 'activity.manage')), 'forums', coalesce((select jsonb_agg(jsonb_build_object('id', f.forum_id, 'kind', f.kind, 'layout', f.layout, 'title', f.title, 'prompt', f.prompt, 'anonymous', f.anonymous, 'opens_at', f.opens_at, 'closes_at', f.closes_at, 'open', lmsc_open(f.opens_at, f.closes_at),
        'team', case when f.team_id is null then null else (select jsonb_build_object('id', t.team_id, 'name', t.name) from lms_c_team t where t.tenant_id = tid and t.team_id = f.team_id) end,
        'posts', (select count(*) from lms_c_post q where q.tenant_id = tid and q.forum_id = f.forum_id and q.deleted_at is null),
        'last_at', (select max(q.created_at) from lms_c_post q where q.tenant_id = tid and q.forum_id = f.forum_id)) order by f.team_id nulls first, f.created_at)
      from lms_c_forum f where f.tenant_id = tid and f.section_id = sec and (mt is null or f.team_id is null or f.team_id = any(mt))), '[]'));
  elsif op = 'forum' then
    if not lmsc_seeteam(sec, a, r.team_id) then perform lmsb_err(403, 'team', '우리 팀 토론방이 아닙니다.'); end if;
    return jsonb_build_object('forum', jsonb_build_object('id', r.forum_id, 'kind', r.kind, 'layout', r.layout, 'title', r.title, 'prompt', r.prompt, 'anonymous', r.anonymous, 'opens_at', r.opens_at, 'closes_at', r.closes_at, 'open', lmsc_open(r.opens_at, r.closes_at), 'team_id', r.team_id),
      'can_post', lmsb_can(a, 'activity.join') or lmsb_can(a, 'activity.manage'), 'can_thread', r.kind = 'free' or lmsb_can(a, 'activity.manage'),
      'posts', coalesce((select jsonb_agg(jsonb_build_object('id', q.post_id, 'parent', q.parent_id, 'title', q.title, 'body', case when q.deleted_at is null then q.body else '(삭제된 글입니다)' end, 'deleted', q.deleted_at is not null,
          'author', lmsc_who(q.author_pid, q.author_label, r.anonymous, a), 'mine', q.author_pid is not distinct from (a->>'pid')::uuid and (a->>'pid' is not null or q.author_pid is null), 'created_at', q.created_at, 'edited_at', q.edited_at) order by q.created_at)
        from lms_c_post q where q.tenant_id = tid and q.forum_id = r.forum_id), '[]'));
  elsif op = 'forum-save' then
    perform lmsb_need(a, 'activity.manage');
    v := coalesce(nullif(lmsb_t(p, 'kind', 10), ''), 'free'); if v not in ('single','free') then perform lmsb_err(400, 'input', '토론 방식은 단일주제(single) · 자유발언(free)입니다.'); end if;
    if coalesce(nullif(p->>'layout', ''), 'thread') not in ('board','thread') then perform lmsb_err(400, 'input', '보기 방식은 보드형 · 스레드형입니다.'); end if;
    if lmsb_tstz(p, 'closes_at') < lmsb_tstz(p, 'opens_at') then perform lmsb_err(400, 'input', '마감이 시작보다 빠릅니다.'); end if;
    if lmsb_uuid(p->>'id') is not null then
      update lms_c_forum set kind = v, layout = coalesce(nullif(p->>'layout', ''), 'thread'), title = lmsb_t(p, 'title', 200, true, '제목'), prompt = lmsb_t(p, 'prompt', 8000), anonymous = lmsb_bool(p, 'anonymous', false), opens_at = lmsb_tstz(p, 'opens_at'), closes_at = lmsb_tstz(p, 'closes_at') where tenant_id = tid and forum_id = id;
      return jsonb_build_object('ok', true, 'id', id, 'count', 1);
    end if;
    -- 팀별 토론방: team_mode = 'each'면 팀마다 하나씩
    if p->>'team_mode' = 'each' then
      if not exists (select 1 from lms_c_team t where t.tenant_id = tid and t.section_id = sec and t.set_name = coalesce(nullif(p->>'team_set', ''), t.set_name)) then perform lmsb_err(409, 'no_team', '팀이 없습니다. 팀 프로젝트에서 팀을 먼저 구성하세요.'); end if;
      insert into lms_c_forum (tenant_id, section_id, team_id, kind, layout, title, prompt, anonymous, opens_at, closes_at)
        select tid, sec, t.team_id, v, coalesce(nullif(p->>'layout', ''), 'thread'), lmsb_t(p, 'title', 200, true, '제목') || ' — ' || t.name, lmsb_t(p, 'prompt', 8000), lmsb_bool(p, 'anonymous', false), lmsb_tstz(p, 'opens_at'), lmsb_tstz(p, 'closes_at')
        from lms_c_team t where t.tenant_id = tid and t.section_id = sec and t.set_name = coalesce(nullif(p->>'team_set', ''), t.set_name) order by t.name;
      get diagnostics n = row_count; return jsonb_build_object('ok', true, 'count', n);
    end if;
    id2 := lmsb_uuid(p->>'team_id'); if id2 is not null and not exists (select 1 from lms_c_team t where t.tenant_id = tid and t.section_id = sec and t.team_id = id2) then perform lmsb_err(400, 'input', '팀이 이 강의실에 없습니다.'); end if;
    insert into lms_c_forum (tenant_id, section_id, team_id, kind, layout, title, prompt, anonymous, opens_at, closes_at)
      values (tid, sec, id2, v, coalesce(nullif(p->>'layout', ''), 'thread'), lmsb_t(p, 'title', 200, true, '제목'), lmsb_t(p, 'prompt', 8000), lmsb_bool(p, 'anonymous', false), lmsb_tstz(p, 'opens_at'), lmsb_tstz(p, 'closes_at')) returning forum_id into id;
    return jsonb_build_object('ok', true, 'id', id, 'count', 1);
  elsif op = 'forum-del' then
    perform lmsb_need(a, 'activity.manage'); delete from lms_c_forum where tenant_id = tid and forum_id = id; return jsonb_build_object('ok', true);
  elsif op = 'post' then
    if not (lmsb_can(a, 'activity.join') or lmsb_can(a, 'activity.manage')) then perform lmsb_err(403, 'role', '토론에 글을 쓸 권한이 없습니다.'); end if;
    if not lmsc_seeteam(sec, a, r.team_id) then perform lmsb_err(403, 'team', '우리 팀 토론방이 아닙니다.'); end if;
    if not lmsc_open(r.opens_at, r.closes_at) and not lmsb_mgr(a) then perform lmsb_err(403, 'closed', '토론 기간이 아닙니다.'); end if;
    id2 := lmsb_uuid(p->>'parent');
    if id2 is not null and not exists (select 1 from lms_c_post q where q.tenant_id = tid and q.forum_id = r.forum_id and q.post_id = id2 and q.deleted_at is null) then perform lmsb_err(404, 'post', '답글을 달 글이 없습니다.'); end if;
    if id2 is null and r.kind = 'single' and not lmsb_can(a, 'activity.manage') then perform lmsb_err(403, 'single', '단일주제 토론은 교수자가 연 주제에 답글로만 참여합니다.'); end if;
    insert into lms_c_post (tenant_id, forum_id, parent_id, author_pid, author_label, title, body) values (tid, r.forum_id, id2, (a->>'pid')::uuid, a->>'label', lmsb_t(p, 'title', 200), lmsb_t(p, 'body', 20000, true, '내용')) returning post_id into id;
    return jsonb_build_object('ok', true, 'id', id);
  elsif op = 'post-edit' or op = 'post-del' then
    select q.*, f.section_id fsec into r from lms_c_post q join lms_c_forum f on f.tenant_id = q.tenant_id and f.forum_id = q.forum_id where q.tenant_id = tid and q.post_id = id;
    if not ((r.author_pid is not distinct from (a->>'pid')::uuid and (a->>'pid' is not null or a->>'role' = 'admin')) or (op = 'post-del' and lmsb_can(a, 'activity.manage'))) then perform lmsb_err(403, 'owner', '내가 쓴 글만 고칠 수 있습니다.'); end if;
    if r.deleted_at is not null then perform lmsb_err(409, 'deleted', '삭제된 글입니다.'); end if;
    if op = 'post-edit' then update lms_c_post set body = lmsb_t(p, 'body', 20000, true, '내용'), title = coalesce(nullif(lmsb_t(p, 'title', 200), ''), title), edited_at = now() where tenant_id = tid and post_id = id;
    else update lms_c_post set deleted_at = now() where tenant_id = tid and post_id = id; end if;
    return jsonb_build_object('ok', true);
  -- ── 위키 ──
  elsif op = 'wiki' then
    return jsonb_build_object('pages', coalesce((select jsonb_agg(jsonb_build_object('id', w.page_id, 'title', w.title, 'ver', w.ver, 'updated_by', w.updated_by, 'updated_at', w.updated_at,
        'team', case when w.team_id is null then null else (select jsonb_build_object('id', t.team_id, 'name', t.name) from lms_c_team t where t.tenant_id = tid and t.team_id = w.team_id) end,
        'editors', (select count(distinct v2.by_label) from lms_c_wiki_ver v2 where v2.tenant_id = tid and v2.page_id = w.page_id)) order by w.team_id nulls first, w.title)
      from lms_c_wiki w where w.tenant_id = tid and w.section_id = sec and (mt is null or w.team_id is null or w.team_id = any(mt))), '[]'), 'can_edit', lmsb_can(a, 'activity.join') or lmsb_can(a, 'activity.manage'));
  elsif op = 'wiki-page' then
    select w.* into r from lms_c_wiki w where w.tenant_id = tid and w.page_id = id;
    if not lmsc_seeteam(sec, a, r.team_id) then perform lmsb_err(403, 'team', '우리 팀 위키가 아닙니다.'); end if;
    return jsonb_build_object('id', r.page_id, 'title', r.title, 'body', r.body, 'ver', r.ver, 'team_id', r.team_id, 'updated_by', r.updated_by, 'updated_at', r.updated_at,
      'versions', coalesce((select jsonb_agg(jsonb_build_object('ver', v2.ver, 'title', v2.title, 'body', v2.body, 'note', v2.note, 'by', v2.by_label, 'at', v2.at) order by v2.ver desc) from lms_c_wiki_ver v2 where v2.tenant_id = tid and v2.page_id = r.page_id), '[]'));
  elsif op = 'wiki-save' then
    if not (lmsb_can(a, 'activity.join') or lmsb_can(a, 'activity.manage')) then perform lmsb_err(403, 'role', '위키를 편집할 권한이 없습니다.'); end if;
    if lmsb_uuid(p->>'id') is null then
      id2 := lmsb_uuid(p->>'team_id');
      if id2 is not null and not exists (select 1 from lms_c_team t where t.tenant_id = tid and t.section_id = sec and t.team_id = id2) then perform lmsb_err(400, 'input', '팀이 이 강의실에 없습니다.'); end if;
      if not lmsc_seeteam(sec, a, id2) then perform lmsb_err(403, 'team', '우리 팀 위키만 만들 수 있습니다.'); end if;
      insert into lms_c_wiki (tenant_id, section_id, team_id, title, body, updated_by) values (tid, sec, id2, lmsb_t(p, 'title', 200, true, '제목'), lmsb_t(p, 'body', 200000), a->>'label') returning page_id into id;
      insert into lms_c_wiki_ver (tenant_id, page_id, ver, title, body, note, by_label) values (tid, id, 1, lmsb_t(p, 'title', 200), lmsb_t(p, 'body', 200000), lmsb_t(p, 'note', 200), a->>'label');
      return jsonb_build_object('ok', true, 'id', id, 'ver', 1);
    end if;
    select w.* into r from lms_c_wiki w where w.tenant_id = tid and w.page_id = id for update;
    if not lmsc_seeteam(sec, a, r.team_id) then perform lmsb_err(403, 'team', '우리 팀 위키가 아닙니다.'); end if;
    -- 공동 편집 충돌: 내가 읽은 버전(base_ver) 뒤로 다른 사람이 저장했으면 409
    if lmsb_i(p, 'base_ver', 0, 1000000, r.ver) <> r.ver then perform lmsb_err(409, 'conflict', format('다른 사람이 먼저 저장했습니다(현재 v%s, %s). 최신 내용을 불러와 다시 편집하세요.', r.ver, r.updated_by)); end if;
    update lms_c_wiki set title = coalesce(nullif(lmsb_t(p, 'title', 200), ''), title), body = lmsb_t(p, 'body', 200000), ver = ver + 1, updated_by = a->>'label', updated_at = now() where tenant_id = tid and page_id = id;
    insert into lms_c_wiki_ver (tenant_id, page_id, ver, title, body, note, by_label) select tid, w.page_id, w.ver, w.title, w.body, lmsb_t(p, 'note', 200), a->>'label' from lms_c_wiki w where w.tenant_id = tid and w.page_id = id;
    return jsonb_build_object('ok', true, 'id', id, 'ver', r.ver + 1);
  elsif op = 'wiki-revert' then
    if not (lmsb_can(a, 'activity.join') or lmsb_can(a, 'activity.manage')) then perform lmsb_err(403, 'role', '위키를 편집할 권한이 없습니다.'); end if;
    select v2.* into r from lms_c_wiki_ver v2 where v2.tenant_id = tid and v2.page_id = id and v2.ver = lmsb_i(p, 'ver', 1, 1000000, 0);
    if not found then perform lmsb_err(404, 'ver', '그 버전이 없습니다.'); end if;
    update lms_c_wiki set title = r.title, body = r.body, ver = ver + 1, updated_by = a->>'label', updated_at = now() where tenant_id = tid and page_id = id returning ver into n;
    insert into lms_c_wiki_ver (tenant_id, page_id, ver, title, body, note, by_label) values (tid, id, n, r.title, r.body, format('v%s로 되돌림', r.ver), a->>'label');
    return jsonb_build_object('ok', true, 'ver', n);
  -- ── 팀 ──
  elsif op = 'teams' then
    return jsonb_build_object('manage', lmsb_can(a, 'activity.manage'), 'mine', to_jsonb(coalesce(mt, '{}'::uuid[])),
      'teams', coalesce((select jsonb_agg(lmsc_team_json(t) order by t.set_name, t.name) from lms_c_team t where t.tenant_id = tid and t.section_id = sec), '[]'),
      'unassigned', case when lmsb_mgr(a) then coalesce((select jsonb_agg(p2.member_no order by p2.member_no) from lms_enrollment e join lms_person p2 on p2.tenant_id = e.tenant_id and p2.person_id = e.person_id where e.tenant_id = tid and e.section_id = sec and e.status = 'enrolled'
        and not exists (select 1 from lms_c_team_member m join lms_c_team t on t.tenant_id = m.tenant_id and t.team_id = m.team_id where m.tenant_id = tid and t.section_id = sec and m.person_id = e.person_id)), '[]') else '[]' end,
      'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', k.task_id, 'title', k.title, 'body', k.body, 'due_at', k.due_at, 'team_id', k.team_id, 'ref_asg', k.ref_asg,
          'ref_title', (select g.title from lms_assignment g where g.tenant_id = tid and g.asg_id = k.ref_asg),
          'status', coalesce((select jsonb_object_agg(s.team_id::text, jsonb_build_object('status', s.status, 'note', s.note, 'by', s.by_label, 'at', s.at)) from lms_c_task_status s where s.tenant_id = tid and s.task_id = k.task_id), '{}')) order by k.due_at nulls last, k.created_at)
        from lms_c_task k where k.tenant_id = tid and k.section_id = sec and (mt is null or k.team_id is null or k.team_id = any(mt))), '[]'));
  elsif op = 'team-save' then
    perform lmsb_need(a, 'activity.manage');
    if lmsb_uuid(p->>'id') is not null then update lms_c_team set name = lmsb_t(p, 'name', 60, true, '팀 이름'), set_name = coalesce(nullif(lmsb_t(p, 'set', 60), ''), set_name) where tenant_id = tid and team_id = id; return jsonb_build_object('ok', true, 'id', id); end if;
    insert into lms_c_team (tenant_id, section_id, set_name, name) values (tid, sec, coalesce(nullif(lmsb_t(p, 'set', 60), ''), '기본'), lmsb_t(p, 'name', 60, true, '팀 이름')) returning team_id into id;
    return jsonb_build_object('ok', true, 'id', id);
  elsif op = 'team-del' then
    perform lmsb_need(a, 'activity.manage'); delete from lms_c_team where tenant_id = tid and team_id = id; return jsonb_build_object('ok', true);
  elsif op = 'team-member' then
    perform lmsb_need(a, 'activity.manage'); id2 := lmsc_pid_of(sec, lmsb_t(p, 'no', 20, true, '학번'));
    if lmsb_bool(p, 'remove', false) then delete from lms_c_team_member where tenant_id = tid and team_id = id and person_id = id2; return jsonb_build_object('ok', true); end if;
    -- 같은 팀 묶음(set)에서는 한 팀에만
    delete from lms_c_team_member m using lms_c_team t where m.tenant_id = tid and t.tenant_id = tid and t.team_id = m.team_id and m.person_id = id2 and t.section_id = sec and t.set_name = (select set_name from lms_c_team where tenant_id = tid and team_id = id) and m.team_id <> id;
    if lmsb_bool(p, 'leader', false) then update lms_c_team_member set leader = false where tenant_id = tid and team_id = id; end if;
    insert into lms_c_team_member values (tid, id, id2, lmsb_bool(p, 'leader', false)) on conflict (tenant_id, team_id, person_id) do update set leader = excluded.leader;
    return jsonb_build_object('ok', true);
  elsif op = 'team-auto' then
    -- 자동 구성: 팀 크기(size) 또는 팀 수(count), 학과 고르게(by=dept) 또는 무작위(학번 해시 순서)
    perform lmsb_need(a, 'activity.manage');
    v := coalesce(nullif(lmsb_t(p, 'set', 60), ''), '기본');
    select array_agg(e.person_id order by case when p->>'by' = 'dept' then coalesce(p2.unit_code, '') end, md5(p2.member_no || v)) into arr from lms_enrollment e join lms_person p2 on p2.tenant_id = e.tenant_id and p2.person_id = e.person_id where e.tenant_id = tid and e.section_id = sec and e.status = 'enrolled';
    if arr is null then perform lmsb_err(409, 'no_student', '수강생이 없습니다.'); end if;
    n := coalesce(lmsb_i(p, 'count', 1, 100, null)::int, ceil(cardinality(arr)::numeric / lmsb_i(p, 'size', 1, 50, 4))::int); n := greatest(1, least(n, cardinality(arr)));
    delete from lms_c_team where tenant_id = tid and section_id = sec and set_name = v;
    for k in 1..n loop insert into lms_c_team (tenant_id, section_id, set_name, name) values (tid, sec, v, k || '팀'); end loop;
    insert into lms_c_team_member (tenant_id, team_id, person_id, leader)
      select tid, t.team_id, q.pid, q.rk <= n from (select pid, row_number() over () rk from unnest(arr) pid) q
      join lms_c_team t on t.tenant_id = tid and t.section_id = sec and t.set_name = v and t.name = (((q.rk - 1) % n) + 1) || '팀';
    return jsonb_build_object('ok', true, 'teams', n, 'members', cardinality(arr));
  elsif op = 'task-save' then
    perform lmsb_need(a, 'activity.manage');
    id2 := lmsb_uuid(p->>'team_id'); if id2 is not null and not exists (select 1 from lms_c_team t where t.tenant_id = tid and t.section_id = sec and t.team_id = id2) then perform lmsb_err(400, 'input', '팀이 이 강의실에 없습니다.'); end if;
    -- E 과제와 연결하면 팀원 제출 현황으로 진행 상태가 자동으로 바뀐다
    if lmsb_uuid(p->>'ref_asg') is not null and not exists (select 1 from lms_assignment g where g.tenant_id = tid and g.section_id = sec and g.asg_id = lmsb_uuid(p->>'ref_asg')) then perform lmsb_err(400, 'input', '이 강의실의 과제를 고르세요.'); end if;
    if lmsb_uuid(p->>'id') is not null then update lms_c_task set title = lmsb_t(p, 'title', 200, true, '제목'), body = lmsb_t(p, 'body', 8000), due_at = lmsb_tstz(p, 'due_at'), team_id = id2, ref_asg = lmsb_uuid(p->>'ref_asg') where tenant_id = tid and task_id = id;
    else insert into lms_c_task (tenant_id, section_id, team_id, title, body, due_at, ref_asg) values (tid, sec, id2, lmsb_t(p, 'title', 200, true, '제목'), lmsb_t(p, 'body', 8000), lmsb_tstz(p, 'due_at'), lmsb_uuid(p->>'ref_asg')) returning task_id into id; end if;
    perform lmsc_task_sync(id);
    return jsonb_build_object('ok', true, 'id', id);
  elsif op = 'task-del' then
    perform lmsb_need(a, 'activity.manage'); delete from lms_c_task where tenant_id = tid and task_id = id; return jsonb_build_object('ok', true);
  elsif op = 'task-status' then
    id2 := lmsb_id(p, 'team', '팀'); v := lmsb_t(p, 'status', 10, true, '상태');
    if v not in ('todo','doing','done') then perform lmsb_err(400, 'input', '상태는 todo · doing · done입니다.'); end if;
    select k.team_id into r from lms_c_task k where k.tenant_id = tid and k.task_id = id;
    if r.team_id is not null and r.team_id <> id2 then perform lmsb_err(403, 'team', '이 팀의 과제가 아닙니다.'); end if;
    if not exists (select 1 from lms_c_team t where t.tenant_id = tid and t.section_id = sec and t.team_id = id2) then perform lmsb_err(404, 'team', '팀을 찾을 수 없습니다.'); end if;
    if not (lmsb_can(a, 'activity.manage') or (mt is not null and id2 = any(mt))) then perform lmsb_err(403, 'team', '우리 팀 과제만 진행 상태를 바꿀 수 있습니다.'); end if;
    insert into lms_c_task_status values (tid, id, id2, v, lmsb_t(p, 'note', 1000), a->>'label', now()) on conflict (tenant_id, task_id, team_id) do update set status = excluded.status, note = excluded.note, by_label = excluded.by_label, at = now();
    return jsonb_build_object('ok', true, 'status', v);
  elsif op = 'progress' then
    -- 팀 진행 현황: 과제 완료율 · 팀 토론 글 · 팀 위키 편집 수
    return jsonb_build_object('teams', coalesce((select jsonb_agg(lmsc_team_json(t) || jsonb_build_object(
        'tasks', (select count(*) from lms_c_task k where k.tenant_id = tid and k.section_id = sec and (k.team_id is null or k.team_id = t.team_id)),
        'done', (select count(*) from lms_c_task_status s join lms_c_task k on k.tenant_id = s.tenant_id and k.task_id = s.task_id where s.tenant_id = tid and s.team_id = t.team_id and s.status = 'done'),
        'doing', (select count(*) from lms_c_task_status s where s.tenant_id = tid and s.team_id = t.team_id and s.status = 'doing'),
        'posts', (select count(*) from lms_c_post q join lms_c_forum f on f.tenant_id = q.tenant_id and f.forum_id = q.forum_id where q.tenant_id = tid and f.team_id = t.team_id and q.deleted_at is null),
        'wiki_edits', (select count(*) from lms_c_wiki_ver v2 join lms_c_wiki w on w.tenant_id = v2.tenant_id and w.page_id = v2.page_id where v2.tenant_id = tid and w.team_id = t.team_id)) order by t.set_name, t.name)
      from lms_c_team t where t.tenant_id = tid and t.section_id = sec and (mt is null or t.team_id = any(mt))), '[]'));
  -- ── 자기 · 동료 평가 ──
  elsif op = 'reviews' then
    return jsonb_build_object('manage', lmsb_can(a, 'activity.manage'), 'reviews', coalesce((select jsonb_agg(jsonb_build_object('id', v2.review_id, 'title', v2.title, 'anonymous', v2.anonymous, 'per_reviewer', v2.per_reviewer, 'mode', v2.mode, 'self', v2.self, 'due_at', v2.due_at,
        'subs', (select count(*) from lms_c_review_sub s where s.tenant_id = tid and s.review_id = v2.review_id), 'allocs', (select count(*) from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = v2.review_id),
        'done', (select count(*) from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = v2.review_id and l.done_at is not null),
        'my_todo', (select count(*) from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = v2.review_id and l.reviewer = (a->>'pid')::uuid and l.done_at is null)) order by v2.created_at desc)
      from lms_c_review v2 where v2.tenant_id = tid and v2.section_id = sec), '[]'));
  elsif op = 'review-save' then
    perform lmsb_need(a, 'activity.manage');
    if coalesce(nullif(p->>'mode', ''), 'auto') not in ('auto','manual') then perform lmsb_err(400, 'input', '배정 방식은 자동 · 수동입니다.'); end if;
    d := case when jsonb_typeof(p->'criteria') = 'array' then p->'criteria' else '[{"name":"내용","max":10}]' end;
    if jsonb_array_length(d) = 0 or jsonb_array_length(d) > 20 or exists (select 1 from jsonb_array_elements(d) c where coalesce(c->>'name', '') = '' or jsonb_typeof(c->'max') <> 'number' or (c->>'max')::numeric <= 0) then perform lmsb_err(400, 'input', '평가 기준(이름 · 만점)을 확인하세요.'); end if;
    if lmsb_uuid(p->>'id') is not null then
      update lms_c_review set title = lmsb_t(p, 'title', 200, true, '제목'), body = lmsb_t(p, 'body', 8000), anonymous = lmsb_bool(p, 'anonymous', true), per_reviewer = lmsb_i(p, 'per_reviewer', 1, 10, 2), mode = coalesce(nullif(p->>'mode', ''), 'auto'), self = lmsb_bool(p, 'self', true), criteria = d, due_at = lmsb_tstz(p, 'due_at') where tenant_id = tid and review_id = id;
      return jsonb_build_object('ok', true, 'id', id);
    end if;
    insert into lms_c_review (tenant_id, section_id, title, body, anonymous, per_reviewer, mode, self, criteria, due_at) values (tid, sec, lmsb_t(p, 'title', 200, true, '제목'), lmsb_t(p, 'body', 8000), lmsb_bool(p, 'anonymous', true), lmsb_i(p, 'per_reviewer', 1, 10, 2), coalesce(nullif(p->>'mode', ''), 'auto'), lmsb_bool(p, 'self', true), d, lmsb_tstz(p, 'due_at')) returning review_id into id;
    return jsonb_build_object('ok', true, 'id', id);
  elsif op = 'review-del' then
    perform lmsb_need(a, 'activity.manage'); delete from lms_c_review where tenant_id = tid and review_id = id; return jsonb_build_object('ok', true);
  elsif op = 'review-submit' then
    perform lmsb_need(a, 'activity.join'); if a->>'pid' is null then perform lmsb_err(400, 'person', '학생 신분으로 제출하세요(학번 전환).'); end if;
    insert into lms_c_review_sub values (tid, id, (a->>'pid')::uuid, lmsb_t(p, 'content', 20000, true, '제출 내용'), now()) on conflict (tenant_id, review_id, person_id) do update set content = excluded.content, at = now();
    return jsonb_build_object('ok', true);
  elsif op = 'review-alloc' then
    perform lmsb_need(a, 'activity.manage'); select v2.* into r from lms_c_review v2 where v2.tenant_id = tid and v2.review_id = id;
    if coalesce(nullif(p->>'mode', ''), r.mode) = 'manual' then
      if jsonb_typeof(p->'pairs') <> 'array' or jsonb_array_length(p->'pairs') = 0 then perform lmsb_err(400, 'input', '수동 배정할 평가자 · 피평가자를 넣으세요.'); end if;
      for d in select * from jsonb_array_elements(p->'pairs') loop
        insert into lms_c_review_alloc (tenant_id, review_id, reviewer, reviewee) values (tid, id, lmsc_pid_of(sec, d->>'reviewer'), lmsc_pid_of(sec, d->>'reviewee')) on conflict do nothing;
      end loop;
    else
      -- 자동: 제출자를 학번 해시 순서로 돌려 각자 다음 per_reviewer명을 평가(자기 제외), 자기 평가 옵션이면 자기 자신도
      select array_agg(s.person_id order by md5(p2.member_no || r.title)) into arr from lms_c_review_sub s join lms_person p2 on p2.tenant_id = s.tenant_id and p2.person_id = s.person_id where s.tenant_id = tid and s.review_id = id;
      if arr is null or cardinality(arr) < 2 then perform lmsb_err(409, 'few', '제출자가 2명 이상이어야 자동 배정할 수 있습니다.'); end if;
      delete from lms_c_review_alloc where tenant_id = tid and review_id = id and done_at is null;
      for n in 1..cardinality(arr) loop
        for k in 1..least(r.per_reviewer, cardinality(arr) - 1) loop
          insert into lms_c_review_alloc (tenant_id, review_id, reviewer, reviewee) values (tid, id, arr[n], arr[((n - 1 + k) % cardinality(arr)) + 1]) on conflict do nothing;
        end loop;
        if r.self then insert into lms_c_review_alloc (tenant_id, review_id, reviewer, reviewee) values (tid, id, arr[n], arr[n]) on conflict do nothing; end if;
      end loop;
    end if;
    return jsonb_build_object('ok', true, 'allocs', (select count(*) from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = id));
  elsif op = 'review' then
    select v2.* into r from lms_c_review v2 where v2.tenant_id = tid and v2.review_id = id; anon := r.anonymous and not (a->>'role' in ('admin','professor'));
    return jsonb_build_object('review', jsonb_build_object('id', r.review_id, 'title', r.title, 'body', r.body, 'anonymous', r.anonymous, 'per_reviewer', r.per_reviewer, 'mode', r.mode, 'self', r.self, 'criteria', r.criteria, 'due_at', r.due_at),
      'my_sub', (select jsonb_build_object('content', s.content, 'at', s.at) from lms_c_review_sub s where s.tenant_id = tid and s.review_id = id and s.person_id = (a->>'pid')::uuid),
      'todo', coalesce((select jsonb_agg(jsonb_build_object('alloc', z.alloc_id, 'self', z.slf, 'reviewee', case when r.anonymous and not z.slf then '익명 ' || z.rn else z.no end,
          'content', (select s.content from lms_c_review_sub s where s.tenant_id = tid and s.review_id = id and s.person_id = z.reviewee), 'scores', z.scores, 'comment', z.comment, 'done', z.done_at is not null) order by z.slf, z.rn)
        from (select l.*, l.reviewer = l.reviewee slf, pr.member_no no, row_number() over (order by l.reviewer = l.reviewee, md5(pr.member_no)) rn from lms_c_review_alloc l join lms_person pr on pr.tenant_id = l.tenant_id and pr.person_id = l.reviewee
          where l.tenant_id = tid and l.review_id = id and l.reviewer = (a->>'pid')::uuid) z), '[]'),
      'received', case when a->>'pid' is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('from', case when l.reviewer = l.reviewee then '자기 평가' when anon then '동료' else (select member_no from lms_person where tenant_id = tid and person_id = l.reviewer) end, 'total', l.total, 'scores', l.scores, 'comment', l.comment) order by l.reviewer = l.reviewee desc, l.total)
        from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = id and l.reviewee = (a->>'pid')::uuid and l.done_at is not null), '[]') end,
      'summary', case when lmsb_can(a, 'grade') then coalesce((select jsonb_agg(q.j order by q.no) from (select p2.member_no no, jsonb_build_object('no', p2.member_no, 'submitted', true,
          'peer_avg', (select round(avg(l.total), 2) from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = id and l.reviewee = s.person_id and l.reviewer <> l.reviewee and l.done_at is not null),
          'peer_n', (select count(*) from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = id and l.reviewee = s.person_id and l.reviewer <> l.reviewee and l.done_at is not null),
          'self', (select l.total from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = id and l.reviewee = s.person_id and l.reviewer = l.reviewee and l.done_at is not null),
          'given', (select count(*) from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = id and l.reviewer = s.person_id and l.done_at is not null),
          'assigned', (select count(*) from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = id and l.reviewer = s.person_id)) j
        from lms_c_review_sub s join lms_person p2 on p2.tenant_id = s.tenant_id and p2.person_id = s.person_id where s.tenant_id = tid and s.review_id = id) q), '[]') else null end,
      'allocs', case when lmsb_can(a, 'activity.manage') then coalesce((select jsonb_agg(jsonb_build_object('reviewer', (select member_no from lms_person where tenant_id = tid and person_id = l.reviewer), 'reviewee', (select member_no from lms_person where tenant_id = tid and person_id = l.reviewee), 'done', l.done_at is not null, 'total', l.total) order by (select member_no from lms_person where tenant_id = tid and person_id = l.reviewer), (select member_no from lms_person where tenant_id = tid and person_id = l.reviewee)) from lms_c_review_alloc l where l.tenant_id = tid and l.review_id = id), '[]') else null end);
  elsif op = 'review-score' then
    select l.*, v2.criteria into r from lms_c_review_alloc l join lms_c_review v2 on v2.tenant_id = l.tenant_id and v2.review_id = l.review_id where l.tenant_id = tid and l.alloc_id = id;
    if r.reviewer is distinct from (a->>'pid')::uuid then perform lmsb_err(403, 'owner', '나에게 배정된 평가만 할 수 있습니다.'); end if;
    if jsonb_typeof(p->'scores') <> 'object' then perform lmsb_err(400, 'input', '기준별 점수를 넣으세요.'); end if;
    if exists (select 1 from jsonb_array_elements(r.criteria) c where jsonb_typeof(p->'scores'->(c->>'name')) <> 'number' or (p->'scores'->>(c->>'name'))::numeric < 0 or (p->'scores'->>(c->>'name'))::numeric > (c->>'max')::numeric) then perform lmsb_err(400, 'input', '기준마다 0점~만점 사이 점수를 넣으세요.'); end if;
    update lms_c_review_alloc set scores = (select jsonb_object_agg(c->>'name', p->'scores'->(c->>'name')) from jsonb_array_elements(r.criteria) c),
      total = (select sum((p->'scores'->>(c->>'name'))::numeric) from jsonb_array_elements(r.criteria) c), comment = lmsb_t(p, 'comment', 4000), done_at = now() where tenant_id = tid and alloc_id = id;
    return jsonb_build_object('ok', true, 'total', (select total from lms_c_review_alloc where tenant_id = tid and alloc_id = id));
  -- ── 대화방 ──
  elsif op = 'chat' then
    n := lmsb_i(p, 'after', 0, 9e15, 0);
    return jsonb_build_object('messages', coalesce((select jsonb_agg(q.j order by q.msg_id) from (select c.msg_id, jsonb_build_object('id', c.msg_id, 'who', coalesce((select member_no from lms_person where tenant_id = tid and person_id = c.author_pid), c.author_label), 'mine', c.author_pid is not distinct from (a->>'pid')::uuid, 'body', c.body, 'at', c.at) j
      from lms_c_chat c where c.tenant_id = tid and c.section_id = sec and c.msg_id > n order by c.msg_id desc limit 200) q), '[]'));
  elsif op = 'chat-send' then
    if not (lmsb_can(a, 'activity.join') or lmsb_can(a, 'activity.manage')) then perform lmsb_err(403, 'role', '대화방에 쓸 권한이 없습니다.'); end if;
    insert into lms_c_chat (tenant_id, section_id, author_pid, author_label, body) values (tid, sec, (a->>'pid')::uuid, a->>'label', lmsb_t(p, 'body', 2000, true, '메시지')) returning msg_id into n;
    return jsonb_build_object('ok', true, 'id', n);
  -- ── 간편 설문 ──
  elsif op = 'polls' then
    return jsonb_build_object('manage', lmsb_can(a, 'activity.manage'), 'polls', coalesce((select jsonb_agg(jsonb_build_object('id', q.poll_id, 'question', q.question, 'options', q.options, 'multi', q.multi, 'anonymous', q.anonymous, 'closes_at', q.closes_at,
        'closed', q.closed or (q.closes_at is not null and now() > q.closes_at), 'votes', (select count(*) from lms_c_poll_vote v2 where v2.tenant_id = tid and v2.poll_id = q.poll_id),
        'mine', (select to_jsonb(v2.choices) from lms_c_poll_vote v2 where v2.tenant_id = tid and v2.poll_id = q.poll_id and v2.who = lmsb_who(a)),
        'counts', (select jsonb_agg((select count(*) from lms_c_poll_vote v2 where v2.tenant_id = tid and v2.poll_id = q.poll_id and (i - 1) = any(v2.choices)) order by i) from generate_series(1, jsonb_array_length(q.options)) i),
        'voters', case when not q.anonymous and lmsb_mgr(a) then coalesce((select jsonb_agg(jsonb_build_object('no', p2.member_no, 'choices', to_jsonb(v2.choices)) order by p2.member_no) from lms_c_poll_vote v2 join lms_person p2 on p2.tenant_id = v2.tenant_id and p2.person_id = v2.person_id where v2.tenant_id = tid and v2.poll_id = q.poll_id), '[]') else null end) order by q.created_at desc)
      from lms_c_poll q where q.tenant_id = tid and q.section_id = sec), '[]'));
  elsif op = 'poll-save' then
    perform lmsb_need(a, 'activity.manage');
    if jsonb_typeof(p->'options') <> 'array' or jsonb_array_length(p->'options') < 2 or jsonb_array_length(p->'options') > 20 or exists (select 1 from jsonb_array_elements(p->'options') o where jsonb_typeof(o) <> 'string' or btrim(o #>> '{}') = '' or length(o #>> '{}') > 200) then perform lmsb_err(400, 'input', '보기는 2~20개, 각 200자 이내로 넣으세요.'); end if;
    if lmsb_uuid(p->>'id') is not null then
      if exists (select 1 from lms_c_poll_vote where tenant_id = tid and poll_id = id) then perform lmsb_err(409, 'voted', '응답이 있는 설문은 문항을 바꿀 수 없습니다.'); end if;
      update lms_c_poll set question = lmsb_t(p, 'question', 300, true, '질문'), options = p->'options', multi = lmsb_bool(p, 'multi', false), anonymous = lmsb_bool(p, 'anonymous', true), closes_at = lmsb_tstz(p, 'closes_at') where tenant_id = tid and poll_id = id;
      return jsonb_build_object('ok', true, 'id', id);
    end if;
    insert into lms_c_poll (tenant_id, section_id, question, options, multi, anonymous, closes_at) values (tid, sec, lmsb_t(p, 'question', 300, true, '질문'), p->'options', lmsb_bool(p, 'multi', false), lmsb_bool(p, 'anonymous', true), lmsb_tstz(p, 'closes_at')) returning poll_id into id;
    return jsonb_build_object('ok', true, 'id', id);
  elsif op = 'poll-vote' then
    perform lmsb_need(a, 'activity.join');
    select q.* into r from lms_c_poll q where q.tenant_id = tid and q.poll_id = id;
    if r.closed or (r.closes_at is not null and now() > r.closes_at) then perform lmsb_err(403, 'closed', '마감된 설문입니다.'); end if;
    select coalesce(array_agg(distinct (c #>> '{}')::int), '{}') into ch from jsonb_array_elements(case when jsonb_typeof(p->'choices') = 'array' then p->'choices' else '[]' end) c where (c #>> '{}') ~ '^\d{1,2}$';
    if cardinality(ch) = 0 or (not r.multi and cardinality(ch) > 1) or exists (select 1 from unnest(ch) c where c >= jsonb_array_length(r.options)) then perform lmsb_err(400, 'input', case when r.multi then '보기를 하나 이상 고르세요.' else '보기를 하나 고르세요.' end); end if;
    insert into lms_c_poll_vote values (tid, id, lmsb_who(a), (a->>'pid')::uuid, ch, now()) on conflict (tenant_id, poll_id, who) do update set choices = excluded.choices, at = now();
    return jsonb_build_object('ok', true);
  elsif op = 'poll-close' then
    perform lmsb_need(a, 'activity.manage'); update lms_c_poll set closed = not lmsb_bool(p, 'reopen', false) where tenant_id = tid and poll_id = id; return jsonb_build_object('ok', true);
  elsif op = 'poll-del' then
    perform lmsb_need(a, 'activity.manage'); delete from lms_c_poll where tenant_id = tid and poll_id = id; return jsonb_build_object('ok', true);
  -- ── 플립러닝 사전 과제 · 사전 질문 · 수업 평가 자료 ──
  elsif op = 'pretasks' then
    v := nullif(lmsb_t(p, 'kind', 10), '');
    return jsonb_build_object('manage', lmsb_can(a, 'activity.manage'), 'grade', lmsb_can(a, 'grade'), 'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', k.task_id, 'kind', k.kind, 'title', k.title, 'body', k.body, 'due_at', k.due_at, 'session_id', k.session_id,
        'session', (select s.week_no || '주 ' || s.seq || '차시' from lms_session s where s.tenant_id = tid and s.session_id = k.session_id), 'published_at', k.published_at, 'notice_id', k.notice_id,
        'subs', (select count(*) from lms_c_pretask_sub s where s.tenant_id = tid and s.task_id = k.task_id), 'graded', (select count(*) from lms_c_pretask_sub s where s.tenant_id = tid and s.task_id = k.task_id and s.graded_at is not null),
        'enrolled', (select count(*) from lms_enrollment e where e.tenant_id = tid and e.section_id = sec and e.status = 'enrolled'),
        'mine', (select jsonb_build_object('body', s.body, 'score', case when k.kind <> 'eval' or k.published_at is not null then s.score end, 'feedback', case when k.kind <> 'eval' or k.published_at is not null then s.feedback end, 'at', s.at, 'graded', s.graded_at is not null) from lms_c_pretask_sub s where s.tenant_id = tid and s.task_id = k.task_id and s.person_id = (a->>'pid')::uuid),
        'subs_list', case when lmsb_can(a, 'grade') then coalesce((select jsonb_agg(jsonb_build_object('no', p2.member_no, 'body', s.body, 'score', s.score, 'feedback', s.feedback, 'at', s.at, 'graded_by', s.graded_by) order by p2.member_no) from lms_c_pretask_sub s join lms_person p2 on p2.tenant_id = s.tenant_id and p2.person_id = s.person_id where s.tenant_id = tid and s.task_id = k.task_id), '[]')
          when k.kind = 'question' then coalesce((select jsonb_agg(jsonb_build_object('no', '익명', 'body', s.body, 'feedback', s.feedback) order by s.at) from lms_c_pretask_sub s where s.tenant_id = tid and s.task_id = k.task_id and s.feedback is not null), '[]') else null end) order by k.created_at desc)
      from lms_c_pretask k where k.tenant_id = tid and k.section_id = sec and (v is null or k.kind = v)), '[]'));
  elsif op = 'pretask-save' then
    perform lmsb_need(a, 'activity.manage');
    v := lmsb_t(p, 'kind', 10, true, '종류'); if v not in ('pretask','question','eval') then perform lmsb_err(400, 'input', '종류는 사전 과제 · 사전 질문 · 수업 평가 자료입니다.'); end if;
    id2 := lmsb_uuid(p->>'session_id'); if id2 is not null and not exists (select 1 from lms_session s where s.tenant_id = tid and s.section_id = sec and s.session_id = id2) then perform lmsb_err(400, 'input', '차시가 이 강의실에 없습니다.'); end if;
    if lmsb_uuid(p->>'id') is not null then update lms_c_pretask set kind = v, title = lmsb_t(p, 'title', 200, true, '제목'), body = lmsb_t(p, 'body', 8000), due_at = lmsb_tstz(p, 'due_at'), session_id = id2 where tenant_id = tid and task_id = id; return jsonb_build_object('ok', true, 'id', id); end if;
    insert into lms_c_pretask (tenant_id, section_id, session_id, kind, title, body, due_at) values (tid, sec, id2, v, lmsb_t(p, 'title', 200, true, '제목'), lmsb_t(p, 'body', 8000), lmsb_tstz(p, 'due_at')) returning task_id into id;
    return jsonb_build_object('ok', true, 'id', id);
  elsif op = 'pretask-del' then
    perform lmsb_need(a, 'activity.manage'); delete from lms_c_pretask where tenant_id = tid and task_id = id; return jsonb_build_object('ok', true);
  elsif op = 'pretask-submit' then
    perform lmsb_need(a, 'activity.join'); if a->>'pid' is null then perform lmsb_err(400, 'person', '학생 신분으로 제출하세요(학번 전환).'); end if;
    select k.* into r from lms_c_pretask k where k.tenant_id = tid and k.task_id = id;
    if r.due_at is not null and now() > r.due_at then perform lmsb_err(403, 'closed', '제출 기한이 지났습니다.'); end if;
    if exists (select 1 from lms_c_pretask_sub s where s.tenant_id = tid and s.task_id = id and s.person_id = (a->>'pid')::uuid and s.graded_at is not null) then perform lmsb_err(409, 'graded', '평가가 끝난 제출물은 고칠 수 없습니다.'); end if;
    insert into lms_c_pretask_sub (tenant_id, task_id, person_id, body) values (tid, id, (a->>'pid')::uuid, lmsb_t(p, 'body', 20000, true, '내용')) on conflict (tenant_id, task_id, person_id) do update set body = excluded.body, at = now();
    return jsonb_build_object('ok', true);
  elsif op = 'pretask-grade' then
    perform lmsb_need(a, 'grade'); id2 := lmsc_pid_of(sec, lmsb_t(p, 'no', 20, true, '학번'));
    update lms_c_pretask_sub set score = lmsb_i(p, 'score', 0, 100000, null), feedback = nullif(lmsb_t(p, 'feedback', 4000), ''), graded_by = a->>'label', graded_at = now() where tenant_id = tid and task_id = id and person_id = id2;
    if not found then perform lmsb_err(404, 'sub', '제출물이 없습니다.'); end if;
    return jsonb_build_object('ok', true);
  elsif op = 'pretask-publish' then
    -- 평가 결과 공지: 묶음 D 공지 게시판에 요약 글을 올린다(개인 점수는 학생 본인 화면에서만)
    perform lmsb_need(a, 'activity.manage'); select k.* into r from lms_c_pretask k where k.tenant_id = tid and k.task_id = id;
    select jsonb_build_object('n', count(*), 'g', count(*) filter (where s.graded_at is not null), 'avg', round(avg(s.score), 1), 'max', max(s.score)) into d from lms_c_pretask_sub s where s.tenant_id = tid and s.task_id = id;
    id2 := lmsd_notice(sec, '[평가 결과] ' || r.title, format(E'「%s」 평가를 마쳤습니다.\n제출 %s명 · 평가 %s명 · 평균 %s점 · 최고 %s점\n개인 점수와 의견은 학습활동 › 수업 평가에서 확인하세요.', r.title, d->>'n', d->>'g', coalesce(d->>'avg', '-'), coalesce(d->>'max', '-')), '평가 결과', a);
    update lms_c_pretask set published_at = now(), notice_id = id2 where tenant_id = tid and task_id = id;
    return jsonb_build_object('ok', true, 'notice_id', id2);
  end if;
  perform lmsb_err(404, 'not_found', '없는 주소입니다.');
  return null;
end $$;
