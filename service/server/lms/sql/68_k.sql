-- 묶음 K — 설문(SFR-014 · 022 · 043 · 067): 대학 · 학과 · 프로그램 · 교과(분반) · 차시 단위 설문, 다국어 문항, 템플릿, 통계(빈도 · 교차 · 리커트),
-- 파일 내보내기, 강의평가(교수 공개/미공개), 설문 미참여 시 다음 단계 제한(게이트).
-- 업무 규칙은 이 파일의 함수(lms_k_*)에 둔다 — Node(mod-k.js)와 Java(lms.k)가 같은 함수를 불러 같은 JSON을 낸다.
-- 공통 도우미(lms_k_err · lms_k_t · lms_k_i · lms_k_b · lms_k_hash · lms_k_call)는 N · Q 묶음도 쓴다.

-- ── 공통 도우미 ─────────────────────────────────────────
create or replace function lms_k_err(st int, code text, msg text) returns void language plpgsql as $$
begin raise exception '%', 'DD|' || st || '|' || code || '|' || msg; end $$;
-- 문자열 인자(공백 제거 · 길이 제한). null · 빈 값은 ''
create or replace function lms_k_t(a jsonb, k text, mx int default 200) returns text language sql immutable as $$
  select left(btrim(coalesce(case when jsonb_typeof(a->k) in ('string','number','boolean') then a->>k end, '')), mx) $$;
create or replace function lms_k_i(a jsonb, k text, dflt int default null) returns int language plpgsql immutable as $$
declare v text := lms_k_t(a, k, 20); begin
  if v ~ '^-?\d{1,9}$' then return v::int; end if;
  if v ~ '^-?\d{1,9}\.\d+$' then return round(v::numeric)::int; end if;
  return dflt; end $$;
create or replace function lms_k_n(a jsonb, k text, dflt numeric default null) returns numeric language plpgsql immutable as $$
declare v text := lms_k_t(a, k, 30); begin if v ~ '^-?\d{1,12}(\.\d+)?$' then return v::numeric; end if; return dflt; end $$;
create or replace function lms_k_b(a jsonb, k text) returns boolean language sql immutable as $$
  select coalesce(a->>k in ('true','1','on','yes'), false) $$;
create or replace function lms_k_uuid(a jsonb, k text) returns uuid language plpgsql immutable as $$
declare v text := lms_k_t(a, k, 40); begin
  if v ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return v::uuid; end if; return null; end $$;
create or replace function lms_k_ts(a jsonb, k text) returns timestamptz language plpgsql stable as $$
declare v text := lms_k_t(a, k, 40); begin
  if v = '' then return null; end if;
  begin return (case when v ~ '^\d{4}-\d{2}-\d{2}$' then v || 'T00:00:00+09:00' when v ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$' then v || '+09:00' else v end)::timestamptz;
  exception when others then perform lms_k_err(400, 'bad_date', '날짜 형식이 올바르지 않습니다: ' || k); end; return null; end $$;
-- 학번 · 사번(영숫자 4~20자)
create or replace function lms_k_no(a jsonb, k text default 'member_no') returns text language plpgsql immutable as $$
declare v text := lms_k_t(a, k, 40); begin
  if v !~ '^[A-Za-z0-9_-]{4,20}$' then perform lms_k_err(400, 'bad_member', '학번(사번) 형식이 올바르지 않습니다.'); end if; return v; end $$;
create or replace function lms_k_need(actor jsonb, roles text[]) returns void language plpgsql immutable as $$
begin if not (actor->>'role' = any(roles)) then perform lms_k_err(403, 'role', '이 작업을 할 권한이 없습니다.'); end if; end $$;
-- 솔트 + 반복 SHA-256(평문 저장 금지). 형식: s1$<반복>$<솔트>$<해시>
create or replace function lms_k_hash(pw text, salt text default null, it int default 2000) returns text language plpgsql volatile as $$
declare s text := coalesce(salt, replace(gen_random_uuid()::text, '-', '')); h bytea := convert_to(s || '|' || pw, 'UTF8'); i int; begin
  for i in 1..it loop h := sha256(h || convert_to(pw, 'UTF8')); end loop;
  return 's1$' || it || '$' || s || '$' || encode(h, 'hex'); end $$;
create or replace function lms_k_hash_ok(pw text, stored text) returns boolean language plpgsql volatile as $$
declare p text[] := string_to_array(stored, '$'); begin
  if coalesce(array_length(p, 1), 0) <> 4 then return false; end if;
  return lms_k_hash(pw, p[3], p[2]::int) = stored; end $$;
create or replace function lms_k_csv(v text) returns text language sql immutable as $$
  select case when v is null then '' else '"' || replace(case when v ~ '^[=+\-@]' then '''' || v else v end, '"', '""') || '"' end $$;
-- 학번 → 학사 속성(교차분석 · 대상 판정). 등록되지 않은 학번은 외부인으로 본다
create or replace function lms_k_person(no text) returns jsonb language sql stable as $$
  select coalesce((select jsonb_build_object('kind', kind, 'unit_code', coalesce(unit_code, ''), 'grade_year', coalesce(grade_year, 0), 'status', status)
                     from lms_person where member_no = no limit 1), jsonb_build_object('kind', 'external', 'unit_code', '', 'grade_year', 0, 'status', 'active')) $$;
-- 대상 조건 {kinds, grades, units, statuses} — 빈 배열은 제한 없음
create or replace function lms_k_target_ok(t jsonb, p jsonb) returns boolean language sql stable as $$
  select (coalesce(jsonb_array_length(t->'kinds'), 0) = 0 or t->'kinds' ? (p->>'kind'))
     and (coalesce(jsonb_array_length(t->'grades'), 0) = 0 or t->'grades' @> to_jsonb((p->>'grade_year')::int) or t->'grades' ? (p->>'grade_year'))
     and (coalesce(jsonb_array_length(t->'units'), 0) = 0 or t->'units' ? (p->>'unit_code')
          or exists (select 1 from lms_org_unit u where u.unit_code = p->>'unit_code' and t->'units' ? coalesce(u.parent_code, '')))
     and (coalesce(jsonb_array_length(t->'statuses'), 0) = 0 or t->'statuses' ? (p->>'status')) $$;

-- ── 표 ──────────────────────────────────────────────────
create table if not exists lms_k_survey (
  tenant_id   text not null references tenants(id) on delete cascade,
  survey_id   uuid not null default gen_random_uuid(),
  title       text not null check (length(title) between 1 and 200),
  i18n        jsonb not null default '{}',                 -- {en: '제목', ja: ...}
  langs       text[] not null default '{ko}',
  scope       text not null default 'univ' check (scope in ('univ','college','dept','program','course','section','unit','mooc')),
  scope_ref   text not null default '',                    -- 학과 코드 · 프로그램 id · 분반 id · 차시 id
  kind        text not null default 'general' check (kind in ('general','course_eval','satisfaction','pre','diagnostic')),
  is_template boolean not null default false,
  template_id uuid,
  status      text not null default 'draft' check (status in ('draft','open','closed')),
  target      jsonb not null default '{}',                 -- {kinds, grades, units, statuses}
  opens_at    timestamptz, closes_at timestamptz,
  anonymous   boolean not null default true,
  prof_public boolean not null default false,              -- 강의평가 결과 교수 공개
  gate_steps  text[] not null default '{}',                -- 미참여 시 제한: completion · certificate · next · grade · classroom
  intro_html  text not null default '',
  video_url   text not null default '',
  created_by  text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, survey_id)
);
create index if not exists lms_k_survey_scope on lms_k_survey (tenant_id, scope, scope_ref, status);
create table if not exists lms_k_question (
  tenant_id   text not null,
  survey_id   uuid not null,
  qid         uuid not null default gen_random_uuid(),
  seq         int not null,
  type        text not null check (type in ('single','multi','likert5','likert7','nps','text','longtext','video','html')),
  text        jsonb not null,                              -- {ko: '문항', en: 'Question'}
  options     jsonb not null default '[]',                 -- [{ko, en}]
  required    boolean not null default true,
  meta        jsonb not null default '{}',                 -- {url} · {html} · {competency}
  primary key (tenant_id, survey_id, qid),
  foreign key (tenant_id, survey_id) references lms_k_survey (tenant_id, survey_id) on delete cascade
);
create table if not exists lms_k_response (
  tenant_id   text not null,
  survey_id   uuid not null,
  rid         uuid not null default gen_random_uuid(),
  member_hash text not null,                               -- 중복 응답 · 게이트 판정용(기관 · 설문 · 학번 해시)
  member_no   text,                                        -- 기명 설문일 때만
  dims        jsonb not null default '{}',                 -- 교차분석 차원(학과 · 학년 · 구분 · 학적)
  answers     jsonb not null default '{}',                 -- {qid: 값}
  source      text not null default 'web' check (source in ('web','import')),
  submitted_at timestamptz not null default now(),
  primary key (tenant_id, survey_id, rid),
  unique (tenant_id, survey_id, member_hash),
  foreign key (tenant_id, survey_id) references lms_k_survey (tenant_id, survey_id) on delete cascade
);
create table if not exists lms_k_remind (
  tenant_id   text not null,
  id          bigserial,
  survey_id   uuid not null,
  targets     int not null,
  channel     text not null default 'push',
  status      text not null default 'queued' check (status in ('queued','sent','failed')), -- 실발송은 메시지 연동 후
  by_actor    text, at timestamptz not null default now(),
  primary key (tenant_id, id)
);

do $$ declare t text; begin
  foreach t in array array['lms_k_survey','lms_k_question','lms_k_response','lms_k_remind'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_k_remind_id_seq to didisam_tenant;
end $$;

-- ── 업무 함수 ───────────────────────────────────────────
create or replace function lms_k_tid() returns text language sql stable as $$ select current_setting('app.tenant', true) $$;
create or replace function lms_k_mhash(sid uuid, no text) returns text language sql stable as $$
  select encode(sha256(convert_to(lms_k_tid() || '|' || sid || '|' || no, 'UTF8')), 'hex') $$;
create or replace function lms_k_get_survey(sid uuid) returns lms_k_survey language plpgsql stable as $$
declare s lms_k_survey; begin
  select * into s from lms_k_survey where survey_id = sid;
  if not found then perform lms_k_err(404, 'no_survey', '설문을 찾을 수 없습니다.'); end if; return s; end $$;
-- 문항 문구를 언어별로(없으면 한국어)
create or replace function lms_k_tx(j jsonb, lang text) returns text language sql immutable as $$
  select coalesce(nullif(j->>lang, ''), j->>'ko', '') $$;
create or replace function lms_k_out(s lms_k_survey) returns jsonb language sql stable as $$
  select jsonb_build_object('survey_id', s.survey_id, 'title', s.title, 'i18n', s.i18n, 'langs', to_jsonb(s.langs), 'scope', s.scope, 'scope_ref', s.scope_ref,
    'kind', s.kind, 'is_template', s.is_template, 'template_id', s.template_id, 'status', s.status, 'target', s.target,
    'opens_at', s.opens_at, 'closes_at', s.closes_at, 'anonymous', s.anonymous, 'prof_public', s.prof_public, 'gate_steps', to_jsonb(s.gate_steps),
    'intro_html', s.intro_html, 'video_url', s.video_url, 'created_at', s.created_at, 'updated_at', s.updated_at,
    'n_q', (select count(*) from lms_k_question q where q.survey_id = s.survey_id and q.type not in ('video','html')),
    'n_resp', (select count(*) from lms_k_response r where r.survey_id = s.survey_id)) $$;

create or replace function lms_k_survey_list(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare r jsonb; begin
  select coalesce(jsonb_agg(lms_k_out(s) order by s.created_at desc, s.survey_id), '[]') into r from lms_k_survey s
   where (lms_k_t(a, 'scope') = '' or s.scope = lms_k_t(a, 'scope'))
     and (lms_k_t(a, 'ref') = '' or s.scope_ref = lms_k_t(a, 'ref'))
     and (lms_k_t(a, 'kind') = '' or s.kind = lms_k_t(a, 'kind'))
     and (lms_k_t(a, 'status') = '' or s.status = lms_k_t(a, 'status'))
     and s.is_template = lms_k_b(a, 'template')
     and (lms_k_t(a, 'q') = '' or s.title ilike '%' || lms_k_t(a, 'q') || '%');
  return jsonb_build_object('items', r); end $$;

create or replace function lms_k_qout(q lms_k_question, lang text) returns jsonb language sql immutable as $$
  select jsonb_build_object('qid', q.qid, 'seq', q.seq, 'type', q.type, 'text', q.text, 'label', lms_k_tx(q.text, lang), 'options', q.options,
    'labels', coalesce((select jsonb_agg(lms_k_tx(o, lang) order by n) from jsonb_array_elements(q.options) with ordinality x(o, n)), '[]'),
    'required', q.required, 'meta', q.meta) $$;

create or replace function lms_k_survey_get(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); lang text := coalesce(nullif(lms_k_t(a, 'lang', 5), ''), 'ko'); begin
  return lms_k_out(s) || jsonb_build_object('lang', lang, 'title_l', coalesce(nullif(s.i18n->>lang, ''), s.title),
    'questions', coalesce((select jsonb_agg(lms_k_qout(q, lang) order by q.seq) from lms_k_question q where q.survey_id = s.survey_id), '[]')); end $$;

-- 문항 저장(응답이 생긴 뒤에는 문항을 바꿀 수 없다)
create or replace function lms_k_put_questions(sid uuid, qs jsonb) returns void language plpgsql as $$
declare q jsonb; n int := 0; ty text; opts jsonb; txt jsonb; begin
  if jsonb_typeof(qs) <> 'array' then perform lms_k_err(400, 'bad_questions', '문항 목록 형식이 올바르지 않습니다.'); end if;
  if jsonb_array_length(qs) > 200 then perform lms_k_err(400, 'too_many', '문항은 200개까지입니다.'); end if;
  delete from lms_k_question where survey_id = sid;
  for q in select * from jsonb_array_elements(qs) loop
    n := n + 1; ty := coalesce(q->>'type', 'single');
    if ty not in ('single','multi','likert5','likert7','nps','text','longtext','video','html') then perform lms_k_err(400, 'bad_type', n || '번 문항 유형이 올바르지 않습니다.'); end if;
    txt := case jsonb_typeof(q->'text') when 'object' then q->'text' when 'string' then jsonb_build_object('ko', q->>'text') else '{}' end;
    if coalesce(btrim(txt->>'ko'), '') = '' and ty not in ('video','html') then perform lms_k_err(400, 'bad_text', n || '번 문항 내용을 입력하세요.'); end if;
    opts := coalesce((select jsonb_agg(case jsonb_typeof(o) when 'object' then o else jsonb_build_object('ko', o #>> '{}') end) from jsonb_array_elements(case jsonb_typeof(q->'options') when 'array' then q->'options' else '[]' end) o), '[]');
    if ty in ('single','multi') and jsonb_array_length(opts) < 2 then perform lms_k_err(400, 'bad_options', n || '번 문항 보기를 2개 이상 입력하세요.'); end if;
    if ty = 'likert5' and jsonb_array_length(opts) <> 5 then opts := '[{"ko":"전혀 그렇지 않다","en":"Strongly disagree"},{"ko":"그렇지 않다","en":"Disagree"},{"ko":"보통이다","en":"Neutral"},{"ko":"그렇다","en":"Agree"},{"ko":"매우 그렇다","en":"Strongly agree"}]'; end if;
    if ty = 'likert7' and jsonb_array_length(opts) <> 7 then opts := '[{"ko":"1"},{"ko":"2"},{"ko":"3"},{"ko":"4"},{"ko":"5"},{"ko":"6"},{"ko":"7"}]'; end if;
    insert into lms_k_question (tenant_id, survey_id, seq, type, text, options, required, meta)
    values (lms_k_tid(), sid, n, ty, txt, opts, ty not in ('video','html') and coalesce((q->>'required')::boolean, true), case jsonb_typeof(q->'meta') when 'object' then q->'meta' else '{}' end);
  end loop; end $$;

create or replace function lms_k_survey_save(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sid uuid := lms_k_uuid(a, 'survey_id'); s lms_k_survey; t text := lms_k_t(a, 'title'); sc text := coalesce(nullif(lms_k_t(a, 'scope'), ''), 'univ');
  kd text := coalesce(nullif(lms_k_t(a, 'kind'), ''), 'general'); gs text[]; begin
  if t = '' then perform lms_k_err(400, 'bad_title', '설문 제목을 입력하세요.'); end if;
  if sc not in ('univ','college','dept','program','course','section','unit','mooc') then perform lms_k_err(400, 'bad_scope', '설문 단위가 올바르지 않습니다.'); end if;
  if kd not in ('general','course_eval','satisfaction','pre','diagnostic') then perform lms_k_err(400, 'bad_kind', '설문 종류가 올바르지 않습니다.'); end if;
  gs := coalesce((select array_agg(x) from jsonb_array_elements_text(case jsonb_typeof(a->'gate_steps') when 'array' then a->'gate_steps' else '[]' end) x where x in ('completion','certificate','next','grade','classroom')), '{}');
  if sid is not null then
    s := lms_k_get_survey(sid);
    if actor->>'role' = 'teacher' and s.created_by is distinct from actor->>'email' then perform lms_k_err(403, 'role', '직접 만든 설문만 고칠 수 있습니다.'); end if;
    update lms_k_survey set title = t, i18n = case jsonb_typeof(a->'i18n') when 'object' then a->'i18n' else i18n end,
      langs = coalesce((select array_agg(x) from jsonb_array_elements_text(case jsonb_typeof(a->'langs') when 'array' then a->'langs' else '["ko"]' end) x where x ~ '^[a-z]{2}$'), '{ko}'),
      scope = sc, scope_ref = lms_k_t(a, 'scope_ref', 60), kind = kd, target = case jsonb_typeof(a->'target') when 'object' then a->'target' else '{}' end,
      opens_at = lms_k_ts(a, 'opens_at'), closes_at = lms_k_ts(a, 'closes_at'), anonymous = coalesce((a->>'anonymous')::boolean, anonymous),
      prof_public = lms_k_b(a, 'prof_public'), gate_steps = gs, intro_html = lms_k_t(a, 'intro_html', 20000), video_url = lms_k_t(a, 'video_url', 500),
      is_template = lms_k_b(a, 'is_template'), updated_at = now() where survey_id = sid;
  else
    insert into lms_k_survey (tenant_id, title, i18n, langs, scope, scope_ref, kind, target, opens_at, closes_at, anonymous, prof_public, gate_steps, intro_html, video_url, is_template, created_by)
    values (lms_k_tid(), t, case jsonb_typeof(a->'i18n') when 'object' then a->'i18n' else '{}' end,
      coalesce((select array_agg(x) from jsonb_array_elements_text(case jsonb_typeof(a->'langs') when 'array' then a->'langs' else '["ko"]' end) x where x ~ '^[a-z]{2}$'), '{ko}'),
      sc, lms_k_t(a, 'scope_ref', 60), kd, case jsonb_typeof(a->'target') when 'object' then a->'target' else '{}' end, lms_k_ts(a, 'opens_at'), lms_k_ts(a, 'closes_at'),
      coalesce((a->>'anonymous')::boolean, true), lms_k_b(a, 'prof_public'), gs, lms_k_t(a, 'intro_html', 20000), lms_k_t(a, 'video_url', 500), lms_k_b(a, 'is_template'), actor->>'email')
    returning survey_id into sid;
  end if;
  if a ? 'questions' then
    if exists (select 1 from lms_k_response where survey_id = sid) then perform lms_k_err(409, 'has_responses', '응답이 있는 설문은 문항을 바꿀 수 없습니다. 복사해서 새 설문으로 만드세요.'); end if;
    perform lms_k_put_questions(sid, a->'questions');
  end if;
  return lms_k_survey_get(actor, jsonb_build_object('survey_id', sid)); end $$;

create or replace function lms_k_survey_status(actor jsonb, a jsonb, st text) returns jsonb language plpgsql as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); begin
  if s.is_template then perform lms_k_err(409, 'template', '템플릿은 배포할 수 없습니다. 템플릿으로 새 설문을 만드세요.'); end if;
  if actor->>'role' = 'teacher' and s.created_by is distinct from actor->>'email' then perform lms_k_err(403, 'role', '직접 만든 설문만 바꿀 수 있습니다.'); end if;
  if st = 'open' and not exists (select 1 from lms_k_question q where q.survey_id = s.survey_id and q.type not in ('video','html')) then perform lms_k_err(409, 'no_questions', '문항이 없는 설문은 배포할 수 없습니다.'); end if;
  update lms_k_survey set status = st, updated_at = now() where survey_id = s.survey_id;
  return lms_k_out(lms_k_get_survey(s.survey_id)); end $$;
create or replace function lms_k_survey_open(actor jsonb, a jsonb) returns jsonb language sql as $$ select lms_k_survey_status(actor, a, 'open') $$;
create or replace function lms_k_survey_close(actor jsonb, a jsonb) returns jsonb language sql as $$ select lms_k_survey_status(actor, a, 'closed') $$;
create or replace function lms_k_survey_delete(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); begin
  if exists (select 1 from lms_k_response where survey_id = s.survey_id) then perform lms_k_err(409, 'has_responses', '응답이 있는 설문은 지울 수 없습니다. 마감하세요.'); end if;
  delete from lms_k_survey where survey_id = s.survey_id; return jsonb_build_object('ok', true, 'survey_id', s.survey_id); end $$;

-- 템플릿(또는 다른 설문)으로 새 설문 만들기
create or replace function lms_k_copy(src uuid, t text, sc text, ref text, kd text, by_email text) returns uuid language plpgsql as $$
declare s lms_k_survey := lms_k_get_survey(src); nid uuid; begin
  insert into lms_k_survey (tenant_id, title, i18n, langs, scope, scope_ref, kind, template_id, target, anonymous, prof_public, gate_steps, intro_html, video_url, created_by)
  values (lms_k_tid(), coalesce(nullif(t, ''), s.title), s.i18n, s.langs, coalesce(nullif(sc, ''), s.scope), coalesce(ref, ''), coalesce(nullif(kd, ''), s.kind), src, s.target, s.anonymous, s.prof_public, s.gate_steps, s.intro_html, s.video_url, by_email)
  returning survey_id into nid;
  insert into lms_k_question (tenant_id, survey_id, seq, type, text, options, required, meta)
  select lms_k_tid(), nid, seq, type, text, options, required, meta from lms_k_question where survey_id = src;
  return nid; end $$;
create or replace function lms_k_survey_copy(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare nid uuid := lms_k_copy(lms_k_uuid(a, 'survey_id'), lms_k_t(a, 'title'), lms_k_t(a, 'scope'), lms_k_t(a, 'scope_ref', 60), lms_k_t(a, 'kind'), actor->>'email'); begin
  return lms_k_survey_get(actor, jsonb_build_object('survey_id', nid)); end $$;

-- 대상 판정: 대상 조건 + 단위 소속(분반 수강 · 프로그램 승인)
create or replace function lms_k_eligible(s lms_k_survey, no text) returns boolean language plpgsql stable as $$
declare p jsonb := lms_k_person(no); begin
  if not lms_k_target_ok(s.target, p) then return false; end if;
  if s.scope = 'section' and s.scope_ref ~* '^[0-9a-f-]{36}$' then
    return exists (select 1 from lms_enrollment e join lms_person x on x.person_id = e.person_id where e.section_id = s.scope_ref::uuid and x.member_no = no and e.status = 'enrolled');
  end if;
  if s.scope = 'program' and s.scope_ref ~* '^[0-9a-f-]{36}$' and to_regclass('lms_q_application') is not null then
    return exists (select 1 from lms_q_application ap where ap.program_id = s.scope_ref::uuid and ap.member_no = no and ap.status = 'approved');
  end if;
  if s.scope = 'dept' and s.scope_ref <> '' then return p->>'unit_code' = s.scope_ref; end if;
  return true; end $$;

-- 응답 검증 · 저장(웹 · 업로드 공통)
create or replace function lms_k_store(s lms_k_survey, no text, ans jsonb, src text) returns uuid language plpgsql as $$
declare q lms_k_question; v jsonb; clean jsonb := '{}'; nopt int; rid uuid; p jsonb := lms_k_person(no); begin
  if jsonb_typeof(ans) <> 'object' then perform lms_k_err(400, 'bad_answers', '응답 형식이 올바르지 않습니다.'); end if;
  for q in select * from lms_k_question where survey_id = s.survey_id and type not in ('video','html') order by seq loop
    v := coalesce(ans->(q.qid::text), ans->(q.seq::text)); nopt := jsonb_array_length(q.options);
    if v is null or v = 'null' or v = '""' or v = '[]' then
      if q.required then perform lms_k_err(400, 'required', q.seq || '번 문항에 답하세요.'); end if; continue; end if;
    if q.type = 'single' or q.type like 'likert%' then
      if jsonb_typeof(v) = 'string' and (v #>> '{}') ~ '^\d+$' then v := to_jsonb((v #>> '{}')::int); end if;
      if jsonb_typeof(v) <> 'number' or (v::text)::numeric <> floor((v::text)::numeric) or (v::text)::int < (case when q.type = 'single' then 0 else 1 end) or (v::text)::int > (case when q.type = 'single' then nopt - 1 else nopt end) then
        perform lms_k_err(400, 'bad_value', q.seq || '번 문항의 응답 값이 올바르지 않습니다.'); end if;
    elsif q.type = 'nps' then
      if jsonb_typeof(v) = 'string' and (v #>> '{}') ~ '^\d+$' then v := to_jsonb((v #>> '{}')::int); end if;
      if jsonb_typeof(v) <> 'number' or (v::text)::int not between 0 and 10 then perform lms_k_err(400, 'bad_value', q.seq || '번 문항은 0~10점입니다.'); end if;
    elsif q.type = 'multi' then
      if jsonb_typeof(v) = 'string' then v := coalesce((select jsonb_agg(x::int) from regexp_split_to_table(v #>> '{}', '[;|]') x where x ~ '^\d+$'), '[]'); end if;
      if jsonb_typeof(v) <> 'array' or exists (select 1 from jsonb_array_elements(v) e where jsonb_typeof(e) <> 'number' or (e::text)::int not between 0 and nopt - 1) then
        perform lms_k_err(400, 'bad_value', q.seq || '번 문항의 응답 값이 올바르지 않습니다.'); end if;
    else
      v := to_jsonb(left(v #>> '{}', case when q.type = 'text' then 500 else 4000 end));
    end if;
    clean := clean || jsonb_build_object(q.qid::text, v);
  end loop;
  insert into lms_k_response (tenant_id, survey_id, member_hash, member_no, dims, answers, source)
  values (lms_k_tid(), s.survey_id, lms_k_mhash(s.survey_id, no), case when s.anonymous then null else no end, p, clean, src)
  on conflict (tenant_id, survey_id, member_hash) do nothing returning lms_k_response.rid into rid;
  if rid is null then perform lms_k_err(409, 'answered', '이미 응답한 설문입니다.'); end if;
  return rid; end $$;

create or replace function lms_k_respond(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); no text := lms_k_no(a); rid uuid; begin
  if s.status <> 'open' then perform lms_k_err(409, 'not_open', '응답 기간이 아닌 설문입니다.'); end if;
  if (s.opens_at is not null and now() < s.opens_at) or (s.closes_at is not null and now() > s.closes_at) then perform lms_k_err(409, 'not_open', '응답 기간이 아닌 설문입니다.'); end if;
  if not lms_k_eligible(s, no) then perform lms_k_err(403, 'not_target', '설문 대상이 아닙니다.'); end if;
  rid := lms_k_store(s, no, coalesce(a->'answers', '{}'), 'web');
  return jsonb_build_object('ok', true, 'rid', rid, 'survey_id', s.survey_id); end $$;

-- 엑셀(CSV) 업로드: 화면이 파일을 읽어 {rows: [{member_no, answers: {문항번호: 값}}]}로 보낸다
create or replace function lms_k_import(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); r jsonb; ok int := 0; errs jsonb := '[]'; i int := 0; no text; begin
  if s.is_template then perform lms_k_err(409, 'template', '템플릿에는 응답을 올릴 수 없습니다.'); end if;
  if jsonb_typeof(a->'rows') <> 'array' or jsonb_array_length(a->'rows') > 5000 then perform lms_k_err(400, 'bad_rows', '업로드 행 형식이 올바르지 않습니다(최대 5,000행).'); end if;
  for r in select * from jsonb_array_elements(a->'rows') loop
    i := i + 1;
    begin
      no := lms_k_no(r); perform lms_k_store(s, no, coalesce(r->'answers', '{}'), 'import'); ok := ok + 1;
    exception when others then errs := errs || jsonb_build_object('row', i, 'message', split_part(sqlerrm, '|', 4));
    end;
  end loop;
  return jsonb_build_object('ok', ok, 'failed', jsonb_array_length(errs), 'errors', errs); end $$;

create or replace function lms_k_pending(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare no text := lms_k_no(a); r jsonb; begin
  select coalesce(jsonb_agg(jsonb_build_object('survey_id', s.survey_id, 'title', s.title, 'kind', s.kind, 'scope', s.scope, 'scope_ref', s.scope_ref, 'closes_at', s.closes_at, 'gate_steps', to_jsonb(s.gate_steps)) order by s.closes_at nulls last, s.title), '[]') into r
  from lms_k_survey s where s.status = 'open' and not s.is_template and (s.opens_at is null or s.opens_at <= now()) and (s.closes_at is null or s.closes_at >= now())
   and not exists (select 1 from lms_k_response x where x.survey_id = s.survey_id and x.member_hash = lms_k_mhash(s.survey_id, no)) and lms_k_eligible(s, no);
  return jsonb_build_object('items', r); end $$;

-- 게이트: 다른 묶음이 수료 · 수료증 · 다음 단계 · 성적 확인 · 강의실 이용 전에 부른다
create or replace function lms_k_gate_check(no text, step text, sc text, ref text) returns jsonb language plpgsql stable as $$
declare r jsonb; begin
  select coalesce(jsonb_agg(jsonb_build_object('survey_id', s.survey_id, 'title', s.title) order by s.title), '[]') into r
  from lms_k_survey s where s.status in ('open','closed') and not s.is_template and step = any(s.gate_steps)
   and (sc = '' or s.scope = sc) and (ref = '' or s.scope_ref = ref)
   and not exists (select 1 from lms_k_response x where x.survey_id = s.survey_id and x.member_hash = lms_k_mhash(s.survey_id, no)) and lms_k_eligible(s, no);
  return jsonb_build_object('blocked', jsonb_array_length(r) > 0, 'step', step, 'pending', r,
    'message', case when jsonb_array_length(r) > 0 then '설문에 먼저 참여해야 다음 단계로 갈 수 있습니다.' else '' end); end $$;
create or replace function lms_k_gate(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare st text := lms_k_t(a, 'step', 20); begin
  if st not in ('completion','certificate','next','grade','classroom') then perform lms_k_err(400, 'bad_step', '단계는 completion · certificate · next · grade · classroom 중 하나입니다.'); end if;
  return lms_k_gate_check(lms_k_no(a), st, lms_k_t(a, 'scope', 20), lms_k_t(a, 'ref', 60)); end $$;

-- 통계: 문항별 빈도 · 비율, 리커트 평균 · 분포, 교차분석(학과 · 학년 · 구분 · 학적)
create or replace function lms_k_stats(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); dm text := coalesce(nullif(lms_k_t(a, 'by', 20), ''), 'unit_code'); lang text := coalesce(nullif(lms_k_t(a, 'lang', 5), ''), 'ko');
  n int; res jsonb := '[]'; q lms_k_question; item jsonb; dimlist jsonb; begin
  if dm not in ('unit_code','grade_year','kind','status') then perform lms_k_err(400, 'bad_by', '교차 기준은 unit_code · grade_year · kind · status 중 하나입니다.'); end if;
  if actor->>'role' = 'teacher' and s.kind = 'course_eval' and not s.prof_public then perform lms_k_err(403, 'not_public', '강의평가 결과가 교수자에게 공개되지 않았습니다.'); end if;
  select count(*) into n from lms_k_response where survey_id = s.survey_id;
  select coalesce(jsonb_agg(d order by d), '[]') into dimlist from (select distinct coalesce(dims->>dm, '') d from lms_k_response where survey_id = s.survey_id) z;
  for q in select * from lms_k_question where survey_id = s.survey_id and type not in ('video','html') order by seq loop
    item := jsonb_build_object('qid', q.qid, 'seq', q.seq, 'type', q.type, 'label', lms_k_tx(q.text, lang));
    if q.type in ('single','multi') or q.type like 'likert%' or q.type = 'nps' then
      with opts as (select (o.n - 1)::int i, lms_k_tx(o.v, lang) lb from jsonb_array_elements(case when q.type = 'nps' then (select jsonb_agg(jsonb_build_object('ko', g::text)) from generate_series(0, 10) g) else q.options end) with ordinality o(v, n)),
      vals as (select case when q.type like 'likert%' then (r.answers->>(q.qid::text))::int - 1 else (r.answers->>(q.qid::text))::int end i, coalesce(r.dims->>dm, '') d
                 from lms_k_response r where r.survey_id = s.survey_id and q.type <> 'multi' and jsonb_typeof(r.answers->(q.qid::text)) = 'number'
               union all
               select (e #>> '{}')::int, coalesce(r.dims->>dm, '') from lms_k_response r, jsonb_array_elements(case when jsonb_typeof(r.answers->(q.qid::text)) = 'array' then r.answers->(q.qid::text) else '[]' end) e
                where r.survey_id = s.survey_id and q.type = 'multi'),
      answered as (select count(*) c from lms_k_response r where r.survey_id = s.survey_id and r.answers ? (q.qid::text))
      select item || jsonb_build_object('answered', (select c from answered),
        'freq', (select jsonb_agg(jsonb_build_object('i', o.i, 'label', o.lb, 'n', (select count(*) from vals v where v.i = o.i),
                   'pct', case when (select c from answered) = 0 then 0 else round(100.0 * (select count(*) from vals v where v.i = o.i) / (select c from answered), 1) end) order by o.i) from opts o),
        'mean', case when q.type like 'likert%' or q.type = 'nps' then (select round(avg(v.i + case when q.type = 'nps' then 0 else 1 end), 2) from vals v) end,
        'cross', (select jsonb_agg(jsonb_build_object('dim', d.d, 'counts', (select jsonb_agg((select count(*) from vals v where v.d = d.d and v.i = o.i) order by o.i) from opts o),
                   'mean', case when q.type like 'likert%' or q.type = 'nps' then (select round(avg(v.i + case when q.type = 'nps' then 0 else 1 end), 2) from vals v where v.d = d.d) end) order by d.d)
                  from (select distinct coalesce(dims->>dm, '') d from lms_k_response where survey_id = s.survey_id) d))
      into item;
    else
      item := item || jsonb_build_object('answered', (select count(*) from lms_k_response r where r.survey_id = s.survey_id and r.answers ? (q.qid::text)),
        'texts', coalesce((select jsonb_agg(t order by t) from (select r.answers->>(q.qid::text) t from lms_k_response r where r.survey_id = s.survey_id and coalesce(r.answers->>(q.qid::text), '') <> '' order by r.submitted_at limit 100) z), '[]'));
    end if;
    res := res || jsonb_build_array(item);
  end loop;
  return jsonb_build_object('survey', lms_k_out(s), 'n', n, 'dm', dm, 'dims', dimlist, 'questions', res); end $$;

-- 내보내기(CSV, 엑셀에서 열림) — 기명 설문도 학번만, 이름은 없다
create or replace function lms_k_export_csv(sid uuid, lang text) returns text language plpgsql stable as $$
declare s lms_k_survey := lms_k_get_survey(sid); hdr text; body text; begin
  select '응답번호,학번,학과,학년,구분,응답시각,' || coalesce(string_agg(lms_k_csv(q.seq || '. ' || lms_k_tx(q.text, lang)), ',' order by q.seq), '') into hdr
    from lms_k_question q where q.survey_id = sid and q.type not in ('video','html');
  select coalesce(string_agg(
      rn || ',' || lms_k_csv(coalesce(r.member_no, '(익명)')) || ',' || lms_k_csv(r.dims->>'unit_code') || ',' || coalesce(r.dims->>'grade_year', '') || ',' || lms_k_csv(r.dims->>'kind') || ',' ||
      to_char(r.submitted_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') || ',' ||
      coalesce((select string_agg(lms_k_csv(case
          when q.type = 'multi' then (select string_agg(lms_k_tx(q.options->((e #>> '{}')::int), lang), ';') from jsonb_array_elements(case when jsonb_typeof(r.answers->(q.qid::text)) = 'array' then r.answers->(q.qid::text) else '[]' end) e)
          when q.type = 'single' and jsonb_typeof(r.answers->(q.qid::text)) = 'number' then lms_k_tx(q.options->((r.answers->>(q.qid::text))::int), lang)
          else r.answers->>(q.qid::text) end), ',' order by q.seq) from lms_k_question q where q.survey_id = sid and q.type not in ('video','html')), ''),
      E'\r\n' order by rn), '') into body
    from (select row_number() over (order by submitted_at, rid) rn, * from lms_k_response where survey_id = sid) r;
  return hdr || E'\r\n' || body; end $$;
create or replace function lms_k_export(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); begin
  if actor->>'role' = 'teacher' and s.kind = 'course_eval' and not s.prof_public then perform lms_k_err(403, 'not_public', '강의평가 결과가 교수자에게 공개되지 않았습니다.'); end if;
  return jsonb_build_object('filename', '설문결과_' || regexp_replace(s.title, '[\\/:*?"<>|\s]+', '_', 'g') || '.csv', 'mime', 'text/csv; charset=utf-8',
    'content', chr(65279) || lms_k_export_csv(s.survey_id, coalesce(nullif(lms_k_t(a, 'lang', 5), ''), 'ko'))); end $$;

-- 독려: 미응답 대상 수를 세어 발송 대기열에 넣는다(실발송은 메시지 연동 후)
create or replace function lms_k_remind_run(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); n int; id bigint; begin
  if s.status <> 'open' then perform lms_k_err(409, 'not_open', '진행 중인 설문만 독려할 수 있습니다.'); end if;
  select count(*) into n from lms_person p where p.status = 'active' and lms_k_eligible(s, p.member_no)
     and not exists (select 1 from lms_k_response x where x.survey_id = s.survey_id and x.member_hash = lms_k_mhash(s.survey_id, p.member_no));
  insert into lms_k_remind (tenant_id, survey_id, targets, channel, by_actor) values (lms_k_tid(), s.survey_id, n, coalesce(nullif(lms_k_t(a, 'channel', 10), ''), 'push'), actor->>'email');
  return jsonb_build_object('ok', true, 'queued', (select count(*) from lms_k_remind x where x.survey_id = s.survey_id), 'targets', n, 'status', 'queued', 'note', '메시지 연동 후 실제 발송됩니다.'); end $$;

-- 강의평가: 분반 하나에 기본(또는 지정) 템플릿으로 강의평가 설문을 만든다
create or replace function lms_k_course_eval(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_k_uuid(a, 'section_id'); tpl uuid := lms_k_uuid(a, 'template_id'); nid uuid; ttl text; gs text[]; begin
  if sec is null then perform lms_k_err(400, 'bad_section', '분반을 지정하세요.'); end if;
  select title into ttl from lms_section where section_id = sec;
  if ttl is null then perform lms_k_err(404, 'no_section', '분반을 찾을 수 없습니다.'); end if;
  if exists (select 1 from lms_k_survey where scope = 'section' and scope_ref = sec::text and kind = 'course_eval') then perform lms_k_err(409, 'exists', '이 분반에는 이미 강의평가가 있습니다.'); end if;
  gs := coalesce((select array_agg(x) from jsonb_array_elements_text(case jsonb_typeof(a->'gate_steps') when 'array' then a->'gate_steps' else '["grade"]' end) x where x in ('completion','certificate','next','grade','classroom')), '{}');
  if tpl is not null then nid := lms_k_copy(tpl, ttl || ' 강의평가', 'section', sec::text, 'course_eval', actor->>'email');
  else
    insert into lms_k_survey (tenant_id, title, i18n, langs, scope, scope_ref, kind, created_by) values (lms_k_tid(), ttl || ' 강의평가', jsonb_build_object('en', ttl || ' Course Evaluation'), '{ko,en}', 'section', sec::text, 'course_eval', actor->>'email') returning survey_id into nid;
    perform lms_k_put_questions(nid, '[{"type":"likert5","text":{"ko":"수업 목표가 명확하게 제시되었다.","en":"Course objectives were clearly presented."}},
      {"type":"likert5","text":{"ko":"수업 내용이 체계적으로 구성되었다.","en":"Content was well organized."}},
      {"type":"likert5","text":{"ko":"교수자는 학습자의 질문에 성실히 답하였다.","en":"The instructor answered questions sincerely."}},
      {"type":"likert5","text":{"ko":"평가 방법이 공정하였다.","en":"Assessment was fair."}},
      {"type":"likert5","text":{"ko":"전반적으로 이 수업에 만족한다.","en":"Overall I am satisfied with this course."}},
      {"type":"longtext","required":false,"text":{"ko":"수업의 좋았던 점과 개선할 점을 적어 주세요.","en":"Strengths and suggestions."}}]');
  end if;
  update lms_k_survey set prof_public = lms_k_b(a, 'prof_public'), gate_steps = gs, anonymous = true where survey_id = nid;
  return lms_k_survey_get(actor, jsonb_build_object('survey_id', nid)); end $$;
create or replace function lms_k_eval_public(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); begin
  if s.kind <> 'course_eval' then perform lms_k_err(409, 'not_eval', '강의평가 설문만 공개 여부를 바꿉니다.'); end if;
  update lms_k_survey set prof_public = lms_k_b(a, 'prof_public'), updated_at = now() where survey_id = s.survey_id;
  return lms_k_out(lms_k_get_survey(s.survey_id)); end $$;

-- 묶음 진입점: 서버(Node · Java)는 경로 → op만 정하고 이 함수를 부른다(시간대 고정 → 두 서버 JSON 동일)
create or replace function lms_k_call(pfx text, op text, actor jsonb, a jsonb) returns jsonb language plpgsql set timezone to 'Asia/Seoul' as $$
declare r jsonb; begin
  if pfx !~ '^[a-z]$' or op !~ '^[a-z_]{2,40}$' or to_regprocedure(format('lms_%s_%s(jsonb,jsonb)', pfx, op)) is null then perform lms_k_err(404, 'not_found', '없는 주소입니다.'); end if;
  execute format('select lms_%s_%s($1, $2)', pfx, op) into r using actor, coalesce(a, '{}');
  return r; end $$;
