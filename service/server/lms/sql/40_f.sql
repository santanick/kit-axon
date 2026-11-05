-- v30 묶음 F — 문제은행 · 시험 응시 제어 · 채점(서버 자동 채점 · 무작위 출제 · 시간/횟수 제한 · IP 기록/제한) · 통계
-- 규약은 30_e.sql 머리 주석과 같다(lms_x_* 도우미 사용).

create table if not exists lms_qbank (
  tenant_id text not null references tenants(id) on delete cascade,
  bank_id uuid not null default gen_random_uuid(),
  name text not null,
  scope text not null default 'section' check (scope in ('section', 'course', 'tenant')),  -- 분반 · 교과목(분반 간 재사용) · 기관 공용
  section_id uuid, course_code text,
  created_at timestamptz not null default now(),
  primary key (tenant_id, bank_id)
);
create table if not exists lms_question (
  tenant_id text not null, q_id uuid not null default gen_random_uuid(), bank_id uuid not null,
  kind text not null check (kind in ('single', 'multi', 'tf', 'short', 'numeric', 'essay')),
  stem text not null, choices jsonb not null default '[]', answer jsonb not null default 'null',
  points numeric(6,2) not null default 1,
  difficulty text not null default 'mid' check (difficulty in ('easy', 'mid', 'hard')), diff_auto boolean not null default false,
  tags text[] not null default '{}', media jsonb not null default '[]', explanation text not null default '',
  origin_q uuid, attempts_n int not null default 0, correct_n int not null default 0, deleted boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, q_id),
  foreign key (tenant_id, bank_id) references lms_qbank (tenant_id, bank_id) on delete cascade
);
create index if not exists lms_q_bank on lms_question (tenant_id, bank_id, difficulty) where not deleted;
create table if not exists lms_exam (
  tenant_id text not null, exam_id uuid not null default gen_random_uuid(), section_id uuid not null,
  title text not null, guide text not null default '',
  open_at timestamptz, close_at timestamptz, time_limit_min int not null default 60, max_attempts int not null default 1,
  shuffle_q boolean not null default true, shuffle_c boolean not null default true,
  rules jsonb not null default '[]',   -- [{bank_id, difficulty|null, n}] 문항 · 난이도별 무작위
  fixed jsonb not null default '[]',   -- [q_id] 고정 문항
  ip_allow text[] not null default '{}', need_precheck boolean not null default false,
  show_result text not null default 'immediate' check (show_result in ('immediate', 'after_close', 'never')),
  retry_wrong boolean not null default true, score_policy text not null default 'best' check (score_policy in ('best', 'last')),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, exam_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_exam_attempt (
  tenant_id text not null, attempt_id uuid not null default gen_random_uuid(), exam_id uuid not null, person_id uuid not null, no int not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted', 'graded')),
  started_at timestamptz not null default now(), deadline_at timestamptz not null, submitted_at timestamptz, auto_closed boolean not null default false,
  ip_start text, ip_last text, ip_log jsonb not null default '[]', ip_changed boolean not null default false,
  items jsonb not null default '[]',   -- [{q, p, c:[보기 순서]}] 응시마다 다른 순서(서버 저장)
  answers jsonb not null default '{}', marks jsonb not null default '{}', auto_score numeric(7,2), score numeric(7,2), max_score numeric(7,2),
  primary key (tenant_id, attempt_id), unique (tenant_id, exam_id, person_id, no),
  foreign key (tenant_id, exam_id) references lms_exam (tenant_id, exam_id) on delete cascade
);
create table if not exists lms_exam_precheck (
  tenant_id text not null, exam_id uuid not null, person_id uuid not null,
  result jsonb not null, ok boolean not null, ip text, at timestamptz not null default now(),
  primary key (tenant_id, exam_id, person_id),
  foreign key (tenant_id, exam_id) references lms_exam (tenant_id, exam_id) on delete cascade
);
do $$ declare t text; begin
  foreach t in array array['lms_qbank','lms_question','lms_exam','lms_exam_attempt','lms_exam_precheck'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
end $$;

-- ── 도우미 ──
create or replace function lms_f_bank_json(b lms_qbank) returns jsonb language sql stable as $$
  select jsonb_build_object('bank_id', b.bank_id, 'name', b.name, 'scope', b.scope, 'section_id', b.section_id, 'course_code', b.course_code,
    'count', (select count(*) from lms_question q where q.bank_id = b.bank_id and not q.deleted),
    'easy', (select count(*) from lms_question q where q.bank_id = b.bank_id and not q.deleted and q.difficulty = 'easy'),
    'mid', (select count(*) from lms_question q where q.bank_id = b.bank_id and not q.deleted and q.difficulty = 'mid'),
    'hard', (select count(*) from lms_question q where q.bank_id = b.bank_id and not q.deleted and q.difficulty = 'hard')) $$;
create or replace function lms_f_q_json(q lms_question) returns jsonb language sql stable as $$
  select jsonb_build_object('q_id', q.q_id, 'bank_id', q.bank_id, 'kind', q.kind, 'stem', q.stem, 'choices', q.choices, 'answer', q.answer,
    'points', lms_x_n(q.points), 'difficulty', q.difficulty, 'diff_auto', q.diff_auto, 'tags', to_jsonb(q.tags), 'media', q.media,
    'explanation', q.explanation, 'origin_q', q.origin_q, 'attempts_n', q.attempts_n, 'correct_n', q.correct_n,
    'correct_rate', case when q.attempts_n > 0 then lms_x_n(100.0 * q.correct_n / q.attempts_n) end) $$;
create or replace function lms_f_exam(id uuid) returns lms_exam language plpgsql as $$
declare r lms_exam;
begin
  select * into r from lms_exam where exam_id = id;
  if r.exam_id is null then perform lms_x_err(404, 'exam', '없는 시험입니다.'); end if;
  return r;
end $$;
create or replace function lms_f_exam_json(r lms_exam) returns jsonb language sql stable as $$
  select jsonb_build_object('exam_id', r.exam_id, 'section_id', r.section_id, 'title', r.title, 'guide', r.guide, 'open_at', lms_x_ts(r.open_at), 'close_at', lms_x_ts(r.close_at),
    'time_limit_min', r.time_limit_min, 'max_attempts', r.max_attempts, 'shuffle_q', r.shuffle_q, 'shuffle_c', r.shuffle_c, 'rules', r.rules, 'fixed', r.fixed,
    'ip_allow', to_jsonb(r.ip_allow), 'need_precheck', r.need_precheck, 'show_result', r.show_result, 'retry_wrong', r.retry_wrong, 'score_policy', r.score_policy, 'status', r.status) $$;
create or replace function lms_f_bank_ok(b uuid, sec uuid) returns boolean language sql stable as $$
  select exists (select 1 from lms_qbank k where k.bank_id = b and (k.scope = 'tenant' or (k.scope = 'section' and k.section_id = sec)
    or (k.scope = 'course' and k.course_code = (select course_code from lms_section where section_id = sec)))) $$;
-- 학습자가 볼 수 있는 문항 첨부 파일(응시한 시험 문항)
create or replace function lms_f_learner_files(pid uuid) returns setof uuid language sql stable as $$
  select distinct (m->>'file_id')::uuid from lms_exam_attempt t, jsonb_array_elements(t.items) i, lms_question q, jsonb_array_elements(q.media) m
  where t.person_id = pid and q.q_id = (i->>'q')::uuid and m->>'file_id' is not null $$;
-- 답 정규화 · 채점
create or replace function lms_f_norm(t text) returns text language sql immutable as $$ select lower(regexp_replace(btrim(coalesce(t, '')), '\s+', ' ', 'g')) $$;
create or replace function lms_f_ids(v jsonb) returns text[] language sql immutable as $$
  select case when v is null or jsonb_typeof(v) = 'null' then '{}'::text[] when jsonb_typeof(v) = 'array' then coalesce((select array_agg(distinct x order by x) from jsonb_array_elements_text(v) x), '{}') else array[v #>> '{}'] end $$;
create or replace function lms_f_correct(q lms_question, ans jsonb) returns boolean language plpgsql immutable as $$
declare v numeric;
begin
  if ans is null or jsonb_typeof(ans) = 'null' then return false; end if;
  if q.kind in ('single', 'multi', 'tf') then return lms_f_ids(ans) = lms_f_ids(q.answer); end if;
  if q.kind = 'short' then return exists (select 1 from jsonb_array_elements_text(q.answer) x where lms_f_norm(x) = lms_f_norm(ans #>> '{}')); end if;
  if q.kind = 'numeric' then
    begin v := (ans #>> '{}')::numeric; exception when others then return false; end;
    return abs(v - (q.answer->>'value')::numeric) <= coalesce((q.answer->>'tol')::numeric, 0);
  end if;
  return null; -- 서술형: 수동 채점
end $$;
-- 문항 입력 검증
create or replace function lms_f_q_check(a jsonb, out kd text, out ch jsonb, out ans jsonb) language plpgsql as $$
declare c jsonb; ids text[] := '{}'; i int := 0; x text;
begin
  kd := coalesce(a->>'kind', '');
  if kd not in ('single', 'multi', 'tf', 'short', 'numeric', 'essay') then perform lms_x_err(400, 'kind', '문항 유형을 고르세요(single · multi · tf · short · numeric · essay).'); end if;
  ch := '[]'; ans := coalesce(a->'answer', 'null');
  if kd = 'tf' then ch := '[{"id":"t","text":"참"},{"id":"f","text":"거짓"}]'; end if;
  if kd in ('single', 'multi') then
    if jsonb_typeof(a->'choices') <> 'array' or jsonb_array_length(a->'choices') < 2 or jsonb_array_length(a->'choices') > 10 then perform lms_x_err(400, 'choices', '보기를 2~10개 입력하세요.'); end if;
    for c in select * from jsonb_array_elements(a->'choices') loop
      i := i + 1; x := coalesce(nullif(left(case when jsonb_typeof(c) = 'object' then c->>'id' end, 10), ''), 'c' || i);
      if x = any(ids) then perform lms_x_err(400, 'choices', '보기 번호가 겹칩니다.'); end if; ids := ids || x;
      ch := ch || jsonb_build_object('id', x, 'text', left(case when jsonb_typeof(c) = 'object' then coalesce(c->>'text', '') else c #>> '{}' end, 1000));
    end loop;
  end if;
  if kd in ('single', 'multi', 'tf') then
    ans := to_jsonb(lms_f_ids(ans));
    if jsonb_array_length(ans) = 0 or (kd <> 'multi' and jsonb_array_length(ans) <> 1)
       or exists (select 1 from jsonb_array_elements_text(ans) v where not exists (select 1 from jsonb_array_elements(ch) o where o->>'id' = v)) then
      perform lms_x_err(400, 'answer', '정답 보기를 올바르게 고르세요.'); end if;
  elsif kd = 'short' then
    if jsonb_typeof(ans) = 'string' then ans := jsonb_build_array(ans); end if;
    if jsonb_typeof(ans) <> 'array' or jsonb_array_length(ans) = 0 then perform lms_x_err(400, 'answer', '단답형 정답을 1개 이상 입력하세요.'); end if;
  elsif kd = 'numeric' then
    begin ans := jsonb_build_object('value', lms_x_n((ans->>'value')::numeric), 'tol', lms_x_n(coalesce((ans->>'tol')::numeric, 0)));
    exception when others then perform lms_x_err(400, 'answer', '숫자형 정답은 {value, tol} 형식입니다.'); end;
    if ans->>'value' is null then perform lms_x_err(400, 'answer', '숫자형 정답은 {value, tol} 형식입니다.'); end if;
  else ans := 'null'; end if;
end $$;

-- ── 문제은행 ──
create or replace function lms_f_banks(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := case when nullif(a->>'section', '') is null then null else lms_x_uuid(a->>'section', '분반') end;
begin
  perform lms_x_staff(ctx);
  return jsonb_build_object('banks', coalesce((select jsonb_agg(lms_f_bank_json(b) order by b.scope desc, b.name) from lms_qbank b
    where sec is null or lms_f_bank_ok(b.bank_id, sec)), '[]'));
end $$;
create or replace function lms_f_bank_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare b lms_qbank; sc text := coalesce(nullif(a->>'scope', ''), 'section'); sec uuid; nm text := lms_x_str(a, 'name', 100, true, '문제은행 이름');
begin
  perform lms_x_staff(ctx);
  if sc not in ('section', 'course', 'tenant') then perform lms_x_err(400, 'scope', '공유 범위를 고르세요(section · course · tenant).'); end if;
  if sc = 'tenant' then perform lms_x_admin(ctx); else sec := lms_x_uuid(a->>'section_id', '분반'); perform lms_x_section(sec); end if;
  if nullif(a->>'bank_id', '') is not null then
    update lms_qbank set name = nm where bank_id = lms_x_uuid(a->>'bank_id', '문제은행') returning * into b;
    if b.bank_id is null then perform lms_x_err(404, 'bank', '없는 문제은행입니다.'); end if;
  else
    insert into lms_qbank (tenant_id, name, scope, section_id, course_code) values (lms_x_tid(), nm, sc, case when sc = 'section' then sec end,
      case when sc = 'course' then (select course_code from lms_section where section_id = sec) end) returning * into b;
  end if;
  return jsonb_build_object('bank', lms_f_bank_json(b), '_audit', lms_x_audit('lms.f.bank_save', jsonb_build_object('bank', b.bank_id)));
end $$;
create or replace function lms_f_questions(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare b uuid := lms_x_uuid(a->>'bank', '문제은행');
begin
  perform lms_x_staff(ctx);
  if not exists (select 1 from lms_qbank where bank_id = b) then perform lms_x_err(404, 'bank', '없는 문제은행입니다.'); end if;
  return jsonb_build_object('questions', coalesce((select jsonb_agg(lms_f_q_json(q) order by q.created_at, q.q_id) from lms_question q where q.bank_id = b and not q.deleted
    and (nullif(a->>'difficulty', '') is null or q.difficulty = a->>'difficulty')), '[]'));
end $$;
create or replace function lms_f_q_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare k record; q lms_question; b uuid; md jsonb := '[]'; m jsonb; df text := coalesce(nullif(a->>'difficulty', ''), 'mid'); tg text[];
begin
  perform lms_x_staff(ctx);
  select * into k from lms_f_q_check(a);
  if df not in ('easy', 'mid', 'hard') then perform lms_x_err(400, 'difficulty', '난이도는 easy · mid · hard 중에서 고르세요.'); end if;
  if jsonb_typeof(a->'media') = 'array' then
    if jsonb_array_length(a->'media') > 5 then perform lms_x_err(400, 'media', '첨부는 5개까지입니다.'); end if;
    for m in select * from jsonb_array_elements(a->'media') loop
      if m->>'type' = 'image' and m->>'file_id' is not null and exists (select 1 from lms_file where file_id::text = m->>'file_id') then
        md := md || jsonb_build_object('type', 'image', 'file_id', m->>'file_id');
      elsif m->>'type' in ('image', 'video') and coalesce(m->>'url', '') ~ '^https://[^\s"<>]+$' and length(m->>'url') <= 500 then
        md := md || jsonb_build_object('type', m->>'type', 'url', m->>'url');
      else perform lms_x_err(400, 'media', '첨부는 이미지 파일 또는 https 주소(이미지 · 영상)만 쓸 수 있습니다.'); end if;
    end loop;
  end if;
  select coalesce(array_agg(distinct left(t, 30)), '{}') into tg from jsonb_array_elements_text(case when jsonb_typeof(a->'tags') = 'array' then a->'tags' else '[]' end) t;
  if nullif(a->>'q_id', '') is not null then
    update lms_question set kind = k.kd, stem = lms_x_str(a, 'stem', 10000, true, '문항'), choices = k.ch, answer = k.ans,
      points = lms_x_num(a, 'points', 0, 1000, 1, '배점'), difficulty = df, diff_auto = false, tags = tg, media = md,
      explanation = coalesce(lms_x_str(a, 'explanation', 5000, false, '해설'), ''), updated_at = now()
    where q_id = lms_x_uuid(a->>'q_id', '문항') and not deleted returning * into q;
    if q.q_id is null then perform lms_x_err(404, 'question', '없는 문항입니다.'); end if;
  else
    b := lms_x_uuid(a->>'bank_id', '문제은행');
    if not exists (select 1 from lms_qbank where bank_id = b) then perform lms_x_err(404, 'bank', '없는 문제은행입니다.'); end if;
    insert into lms_question (tenant_id, bank_id, kind, stem, choices, answer, points, difficulty, tags, media, explanation)
    values (lms_x_tid(), b, k.kd, lms_x_str(a, 'stem', 10000, true, '문항'), k.ch, k.ans, lms_x_num(a, 'points', 0, 1000, 1, '배점'), df, tg, md,
      coalesce(lms_x_str(a, 'explanation', 5000, false, '해설'), '')) returning * into q;
  end if;
  return jsonb_build_object('question', lms_f_q_json(q), '_audit', lms_x_audit('lms.f.q_save', jsonb_build_object('q', q.q_id)));
end $$;
create or replace function lms_f_q_delete(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare id uuid := lms_x_uuid(a->>'q_id', '문항');
begin
  perform lms_x_staff(ctx);
  update lms_question set deleted = true, updated_at = now() where q_id = id and not deleted;
  if not found then perform lms_x_err(404, 'question', '없는 문항입니다.'); end if;
  return jsonb_build_object('ok', true, '_audit', lms_x_audit('lms.f.q_delete', jsonb_build_object('q', id)));
end $$;
-- 강좌 간 이관 · 재사용(복사본에 출처 기록)
create or replace function lms_f_q_copy(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare tb uuid := lms_x_uuid(a->>'to_bank', '받을 문제은행'); n int;
begin
  perform lms_x_staff(ctx);
  if not exists (select 1 from lms_qbank where bank_id = tb) then perform lms_x_err(404, 'bank', '없는 문제은행입니다.'); end if;
  if jsonb_typeof(a->'q_ids') <> 'array' or jsonb_array_length(a->'q_ids') = 0 or jsonb_array_length(a->'q_ids') > 500 then perform lms_x_err(400, 'q_ids', '옮길 문항을 1~500개 고르세요.'); end if;
  insert into lms_question (tenant_id, bank_id, kind, stem, choices, answer, points, difficulty, diff_auto, tags, media, explanation, origin_q)
  select lms_x_tid(), tb, kind, stem, choices, answer, points, difficulty, diff_auto, tags, media, explanation, q_id from lms_question
  where not deleted and q_id::text in (select jsonb_array_elements_text(a->'q_ids'));
  get diagnostics n = row_count;
  if lms_x_bool(a, 'move', false) then update lms_question set deleted = true where q_id::text in (select jsonb_array_elements_text(a->'q_ids')) and bank_id <> tb; end if;
  return jsonb_build_object('copied', n, '_audit', lms_x_audit('lms.f.q_copy', jsonb_build_object('to', tb, 'n', n)));
end $$;
-- 난이도 자동 분류(정답률: 80% 이상 쉬움 · 50% 이상 보통 · 그 아래 어려움, 응시 3회 이상)
create or replace function lms_f_classify(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare b uuid := lms_x_uuid(a->>'bank_id', '문제은행'); n int;
begin
  perform lms_x_staff(ctx);
  update lms_question set difficulty = case when correct_n::numeric / attempts_n >= 0.8 then 'easy' when correct_n::numeric / attempts_n >= 0.5 then 'mid' else 'hard' end,
    diff_auto = true, updated_at = now()
  where bank_id = b and not deleted and attempts_n >= coalesce(lms_x_num(a, 'min_n', 1, 1000, 3, '최소 응시 수')::int, 3) and kind <> 'essay';
  get diagnostics n = row_count;
  return jsonb_build_object('classified', n, 'bank', (select lms_f_bank_json(k) from lms_qbank k where k.bank_id = b), '_audit', lms_x_audit('lms.f.classify', jsonb_build_object('bank', b, 'n', n)));
end $$;

-- ── 시험(교수자) ──
create or replace function lms_f_exams(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare sec uuid := lms_x_uuid(a->>'section', '분반');
begin
  perform lms_x_staff(ctx); perform lms_x_section(sec);
  return jsonb_build_object('exams', coalesce((select jsonb_agg(lms_f_exam_json(x) || jsonb_build_object(
      'attempts', (select count(*) from lms_exam_attempt t where t.exam_id = x.exam_id),
      'pending', (select count(*) from lms_exam_attempt t where t.exam_id = x.exam_id and t.status = 'submitted')) order by x.open_at nulls last, x.created_at)
    from lms_exam x where x.section_id = sec), '[]'));
end $$;
create or replace function lms_f_exam_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r lms_exam; sec uuid; rl jsonb := '[]'; x jsonb; fx jsonb := '[]'; ipa text[] := '{}'; v text; st text; op timestamptz; cl timestamptz; sr text; sp text; total int := 0;
begin
  perform lms_x_staff(ctx);
  if nullif(a->>'exam_id', '') is not null then r := lms_f_exam(lms_x_uuid(a->>'exam_id', '시험')); sec := r.section_id;
  else sec := lms_x_uuid(a->>'section_id', '분반'); perform lms_x_section(sec); end if;
  if jsonb_typeof(a->'rules') = 'array' then
    for x in select * from jsonb_array_elements(a->'rules') loop
      if not lms_f_bank_ok(lms_x_uuid(x->>'bank_id', '문제은행'), sec) then perform lms_x_err(400, 'bank', '이 분반에서 쓸 수 없는 문제은행입니다.'); end if;
      if coalesce(x->>'difficulty', '') not in ('', 'easy', 'mid', 'hard') then perform lms_x_err(400, 'difficulty', '난이도는 easy · mid · hard 중에서 고르세요.'); end if;
      rl := rl || jsonb_build_object('bank_id', x->>'bank_id', 'difficulty', nullif(x->>'difficulty', ''), 'n', lms_x_num(x, 'n', 1, 200, 1, '출제 문항 수')::int);
      total := total + lms_x_num(x, 'n', 1, 200, 1, '출제 문항 수')::int;
    end loop;
  elsif r.exam_id is not null then rl := r.rules; end if;
  if jsonb_typeof(a->'fixed') = 'array' then
    for v in select jsonb_array_elements_text(a->'fixed') loop
      if not exists (select 1 from lms_question q where q.q_id::text = v and not q.deleted and lms_f_bank_ok(q.bank_id, sec)) then perform lms_x_err(400, 'question', '쓸 수 없는 문항이 있습니다.'); end if;
      fx := fx || to_jsonb(v); total := total + 1;
    end loop;
  elsif r.exam_id is not null then fx := r.fixed; end if;
  if jsonb_typeof(a->'ip_allow') = 'array' then
    for v in select btrim(jsonb_array_elements_text(a->'ip_allow')) loop
      begin perform v::cidr; exception when others then perform lms_x_err(400, 'ip_allow', '허용 IP 대역 형식이 올바르지 않습니다: ' || v); end;
      ipa := ipa || v;
    end loop;
  elsif r.exam_id is not null then ipa := r.ip_allow; end if;
  st := coalesce(nullif(a->>'status', ''), coalesce(r.status, 'draft'));
  if st not in ('draft', 'published', 'closed') then perform lms_x_err(400, 'status', '상태가 올바르지 않습니다.'); end if;
  if st = 'published' and jsonb_array_length(rl) = 0 and jsonb_array_length(fx) = 0 then perform lms_x_err(400, 'empty', '출제할 문항(무작위 규칙 또는 고정 문항)을 정하세요.'); end if;
  op := lms_x_time(a, 'open_at', '시작'); cl := lms_x_time(a, 'close_at', '종료');
  if op is not null and cl is not null and cl <= op then perform lms_x_err(400, 'close', '종료는 시작 이후여야 합니다.'); end if;
  sr := coalesce(nullif(a->>'show_result', ''), coalesce(r.show_result, 'immediate')); sp := coalesce(nullif(a->>'score_policy', ''), coalesce(r.score_policy, 'best'));
  if sr not in ('immediate', 'after_close', 'never') or sp not in ('best', 'last') then perform lms_x_err(400, 'option', '결과 공개 · 점수 반영 방식을 확인하세요.'); end if;
  if r.exam_id is null then
    insert into lms_exam (tenant_id, section_id, title, guide, open_at, close_at, time_limit_min, max_attempts, shuffle_q, shuffle_c, rules, fixed, ip_allow, need_precheck, show_result, retry_wrong, score_policy, status)
    values (lms_x_tid(), sec, lms_x_str(a, 'title', 200, true, '시험 제목'), coalesce(lms_x_str(a, 'guide', 5000, false, '안내'), ''), op, cl,
      lms_x_num(a, 'time_limit_min', 1, 600, 60, '제한 시간(분)')::int, lms_x_num(a, 'max_attempts', 1, 20, 1, '응시 횟수')::int,
      lms_x_bool(a, 'shuffle_q', true), lms_x_bool(a, 'shuffle_c', true), rl, fx, ipa, lms_x_bool(a, 'need_precheck', false), sr, lms_x_bool(a, 'retry_wrong', true), sp, st) returning * into r;
  else
    update lms_exam set title = lms_x_str(a, 'title', 200, true, '시험 제목'), guide = coalesce(lms_x_str(a, 'guide', 5000, false, '안내'), ''), open_at = op, close_at = cl,
      time_limit_min = lms_x_num(a, 'time_limit_min', 1, 600, r.time_limit_min, '제한 시간(분)')::int, max_attempts = lms_x_num(a, 'max_attempts', 1, 20, r.max_attempts, '응시 횟수')::int,
      shuffle_q = lms_x_bool(a, 'shuffle_q', r.shuffle_q), shuffle_c = lms_x_bool(a, 'shuffle_c', r.shuffle_c), rules = rl, fixed = fx, ip_allow = ipa,
      need_precheck = lms_x_bool(a, 'need_precheck', r.need_precheck), show_result = sr, retry_wrong = lms_x_bool(a, 'retry_wrong', r.retry_wrong), score_policy = sp, status = st
    where exam_id = r.exam_id returning * into r;
  end if;
  perform lms_x_grade_link(sec, 'exam:' || r.exam_id, 'quiz', r.title, 100);
  return jsonb_build_object('exam', lms_f_exam_json(r), '_audit', lms_x_audit('lms.f.exam_save', jsonb_build_object('exam', r.exam_id, 'status', r.status)));
end $$;

-- 응시 종료 처리(자동 채점 · 문항 통계 · 성적 반영)
create or replace function lms_f_push_grade(x lms_exam, pid uuid) returns void language plpgsql as $$
declare sc numeric; item uuid;
begin
  if x.score_policy = 'best' then select max(100.0 * score / nullif(max_score, 0)) into sc from lms_exam_attempt where exam_id = x.exam_id and person_id = pid and status = 'graded';
  else select 100.0 * score / nullif(max_score, 0) into sc from lms_exam_attempt where exam_id = x.exam_id and person_id = pid and status = 'graded' order by no desc limit 1; end if;
  if sc is null then return; end if;
  item := lms_x_grade_link(x.section_id, 'exam:' || x.exam_id, 'quiz', x.title, 100);
  perform lms_x_grade_put(x.section_id, item, pid, round(sc, 2), null, null);
end $$;
create or replace function lms_f_finalize(id uuid, auto boolean) returns lms_exam_attempt language plpgsql as $$
declare t lms_exam_attempt; it jsonb; q lms_question; ok boolean; mk jsonb := '{}'; auto_s numeric := 0; mx numeric := 0; pend boolean := false;
begin
  select * into t from lms_exam_attempt where attempt_id = id for update;
  if t.status <> 'in_progress' then return t; end if;
  for it in select * from jsonb_array_elements(t.items) loop
    select * into q from lms_question where q_id = (it->>'q')::uuid;
    mx := mx + (it->>'p')::numeric;
    ok := lms_f_correct(q, t.answers->(it->>'q'));
    if ok is null then pend := true; mk := mk || jsonb_build_object(it->>'q', jsonb_build_object('score', null, 'ok', null, 'auto', false));
    else
      mk := mk || jsonb_build_object(it->>'q', jsonb_build_object('score', case when ok then lms_x_n((it->>'p')::numeric) else 0 end, 'ok', ok, 'auto', true));
      if ok then auto_s := auto_s + (it->>'p')::numeric; end if;
      update lms_question set attempts_n = attempts_n + 1, correct_n = correct_n + case when ok then 1 else 0 end where q_id = q.q_id;
    end if;
  end loop;
  update lms_exam_attempt set status = case when pend then 'submitted' else 'graded' end, submitted_at = least(now(), deadline_at + interval '30 seconds'), auto_closed = auto,
    marks = mk, auto_score = auto_s, score = case when pend then null else auto_s end, max_score = mx where attempt_id = id returning * into t;
  if t.status = 'graded' then perform lms_f_push_grade(lms_f_exam(t.exam_id), t.person_id); end if;
  return t;
end $$;
create or replace function lms_f_expire(ex uuid, pid uuid) returns void language plpgsql as $$
declare i uuid;
begin
  for i in select attempt_id from lms_exam_attempt where exam_id = ex and (pid is null or person_id = pid) and status = 'in_progress' and now() > deadline_at + interval '30 seconds' loop
    perform lms_f_finalize(i, true);
  end loop;
end $$;
create or replace function lms_f_att_row(t lms_exam_attempt) returns jsonb language sql stable as $$
  select jsonb_build_object('attempt_id', t.attempt_id, 'exam_id', t.exam_id, 'no', t.no, 'status', t.status, 'started_at', lms_x_ts(t.started_at), 'deadline_at', lms_x_ts(t.deadline_at),
    'submitted_at', lms_x_ts(t.submitted_at), 'auto_closed', t.auto_closed, 'score', lms_x_n(t.score), 'auto_score', lms_x_n(t.auto_score), 'max_score', lms_x_n(t.max_score)) $$;

create or replace function lms_f_attempts(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare x lms_exam;
begin
  perform lms_x_staff(ctx); x := lms_f_exam(lms_x_uuid(a->>'exam', '시험')); perform lms_f_expire(x.exam_id, null);
  return jsonb_build_object('exam', lms_f_exam_json(x), 'attempts', coalesce((select jsonb_agg(lms_f_att_row(t) || jsonb_build_object('member_no', p.member_no, 'unit_code', p.unit_code,
      'enroll', lms_x_enr(x.section_id, t.person_id), 'ip_start', t.ip_start, 'ip_last', t.ip_last, 'ip_changed', t.ip_changed, 'ip_log', t.ip_log) order by p.member_no, t.no)
    from lms_exam_attempt t join lms_person p on p.person_id = t.person_id where t.exam_id = x.exam_id), '[]'));
end $$;
create or replace function lms_f_attempt(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare t lms_exam_attempt;
begin
  perform lms_x_staff(ctx);
  select * into t from lms_exam_attempt where attempt_id = lms_x_uuid(a->>'id', '응시');
  if t.attempt_id is null then perform lms_x_err(404, 'attempt', '없는 응시 기록입니다.'); end if;
  return jsonb_build_object('attempt', lms_f_att_row(t) || jsonb_build_object('member_no', (select member_no from lms_person where person_id = t.person_id), 'ip_log', t.ip_log, 'answers', t.answers, 'marks', t.marks),
    'items', coalesce((select jsonb_agg(lms_f_q_json(q) || jsonb_build_object('order', o.n, 'p', lms_x_n((i->>'p')::numeric), 'choice_order', i->'c') order by o.n)
      from jsonb_array_elements(t.items) with ordinality o(i, n) join lms_question q on q.q_id = (o.i->>'q')::uuid), '[]'));
end $$;
-- 수동 채점(서술형 · 부분 점수 조정)
create or replace function lms_f_mark(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare t lms_exam_attempt; it jsonb; sc numeric; mk jsonb; pend boolean;
begin
  perform lms_x_staff(ctx);
  select * into t from lms_exam_attempt where attempt_id = lms_x_uuid(a->>'attempt_id', '응시') for update;
  if t.attempt_id is null then perform lms_x_err(404, 'attempt', '없는 응시 기록입니다.'); end if;
  if t.status = 'in_progress' then perform lms_x_err(409, 'in_progress', '응시가 끝난 뒤 채점할 수 있습니다.'); end if;
  select i into it from jsonb_array_elements(t.items) i where i->>'q' = a->>'q_id';
  if it is null then perform lms_x_err(404, 'question', '이 응시에 없는 문항입니다.'); end if;
  sc := lms_x_num(a, 'score', 0, (it->>'p')::numeric, null, '점수');
  if sc is null then perform lms_x_err(400, 'required', '점수를 입력하세요.'); end if;
  mk := t.marks || jsonb_build_object(it->>'q', jsonb_build_object('score', lms_x_n(sc), 'ok', sc >= (it->>'p')::numeric, 'auto', false, 'fb', lms_x_str(a, 'feedback', 5000, false, '피드백')));
  pend := exists (select 1 from jsonb_each(mk) e where e.value->'score' is null or jsonb_typeof(e.value->'score') = 'null');
  update lms_exam_attempt set marks = mk, score = case when pend then null else (select sum((e.value->>'score')::numeric) from jsonb_each(mk) e) end,
    status = case when pend then 'submitted' else 'graded' end where attempt_id = t.attempt_id returning * into t;
  if t.status = 'graded' then perform lms_f_push_grade(lms_f_exam(t.exam_id), t.person_id); end if;
  return jsonb_build_object('attempt', lms_f_att_row(t) || jsonb_build_object('marks', t.marks), '_audit', lms_x_audit('lms.f.mark', jsonb_build_object('attempt', t.attempt_id, 'q', it->>'q', 'score', lms_x_n(sc))));
end $$;

-- 결과 통계 · 성적 분포 · 엑셀용 행(청강생은 통계에서 제외)
create or replace function lms_f_stats(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare x lms_exam; best jsonb;
begin
  perform lms_x_staff(ctx); x := lms_f_exam(lms_x_uuid(a->>'exam', '시험')); perform lms_f_expire(x.exam_id, null);
  with b as (select distinct on (t.person_id) t.person_id, 100.0 * t.score / nullif(t.max_score, 0) pct from lms_exam_attempt t
             where t.exam_id = x.exam_id and t.status = 'graded' and lms_x_enr(x.section_id, t.person_id) = 'regular'
             order by t.person_id, case when x.score_policy = 'best' then 100.0 * t.score / nullif(t.max_score, 0) end desc nulls last, t.no desc)
  select jsonb_build_object('n', count(*), 'mean', lms_x_n(avg(pct)), 'sd', lms_x_n(coalesce(stddev_pop(pct), 0)), 'min', lms_x_n(min(pct)), 'max', lms_x_n(max(pct)),
    'median', lms_x_n((percentile_cont(0.5) within group (order by pct))::numeric),
    'hist', (select jsonb_agg(jsonb_build_object('from', g * 10, 'to', g * 10 + 10, 'n', (select count(*) from b b2 where least(9, floor(b2.pct / 10)) = g)) order by g) from generate_series(0, 9) g))
  into best from b;
  return jsonb_build_object('exam', lms_f_exam_json(x), 'summary', best,
    'questions', coalesce((select jsonb_agg(jsonb_build_object('q_id', q.q_id, 'stem', left(q.stem, 80), 'kind', q.kind, 'difficulty', q.difficulty,
        'n', s.n, 'correct', s.c, 'rate', case when s.n > 0 then lms_x_n(100.0 * s.c / s.n) end) order by s.first_seen)
      from (select (i->>'q')::uuid qid, count(m.v) filter (where m.v->>'ok' is not null) n, count(*) filter (where m.v->>'ok' = 'true') c, min(t.started_at) first_seen
            from lms_exam_attempt t cross join jsonb_array_elements(t.items) i left join lateral (select t.marks->(i->>'q') v) m on true
            where t.exam_id = x.exam_id and t.status <> 'in_progress' group by 1) s join lms_question q on q.q_id = s.qid), '[]'),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('member_no', p.member_no, 'unit_code', p.unit_code, 'enroll', lms_x_enr(x.section_id, t.person_id), 'no', t.no, 'status', t.status,
        'score', lms_x_n(t.score), 'max_score', lms_x_n(t.max_score), 'pct', lms_x_n(100.0 * t.score / nullif(t.max_score, 0)), 'submitted_at', lms_x_ts(t.submitted_at),
        'ip_start', t.ip_start, 'ip_changed', t.ip_changed) order by p.member_no, t.no)
      from lms_exam_attempt t join lms_person p on p.person_id = t.person_id where t.exam_id = x.exam_id), '[]'));
end $$;

-- ── 학습자 ──
create or replace function lms_f_my(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare pid uuid := lms_x_learner(ctx); sec uuid := lms_x_uuid(a->>'section', '분반'); x lms_exam;
begin
  if lms_x_enr(sec, pid) is null then perform lms_x_err(403, 'not_enrolled', '수강 중인 분반이 아닙니다.'); end if;
  for x in select * from lms_exam where section_id = sec and status <> 'draft' loop perform lms_f_expire(x.exam_id, pid); end loop;
  return jsonb_build_object('now', lms_x_ts(now()), 'exams', coalesce((select jsonb_agg(jsonb_build_object('exam_id', x2.exam_id, 'title', x2.title, 'guide', x2.guide,
      'open_at', lms_x_ts(x2.open_at), 'close_at', lms_x_ts(x2.close_at), 'time_limit_min', x2.time_limit_min, 'max_attempts', x2.max_attempts,
      'need_precheck', x2.need_precheck, 'precheck_ok', coalesce((select ok from lms_exam_precheck c where c.exam_id = x2.exam_id and c.person_id = pid), false),
      'show_result', x2.show_result, 'retry_wrong', x2.retry_wrong, 'status', x2.status,
      'attempts', coalesce((select jsonb_agg(lms_f_att_row(t) order by t.no) from lms_exam_attempt t where t.exam_id = x2.exam_id and t.person_id = pid), '[]')) order by x2.open_at nulls last, x2.created_at)
    from lms_exam x2 where x2.section_id = sec and x2.status <> 'draft'), '[]'));
end $$;
create or replace function lms_f_precheck(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare pid uuid := lms_x_learner(ctx); x lms_exam := lms_f_exam(lms_x_uuid(a->>'exam_id', '시험')); r jsonb; ok boolean; fails jsonb;
begin
  if lms_x_enr(x.section_id, pid) is null then perform lms_x_err(403, 'not_enrolled', '수강 중인 분반이 아닙니다.'); end if;
  r := jsonb_build_object('browser', lms_x_bool(coalesce(a->'result', '{}'), 'browser', false), 'storage', lms_x_bool(coalesce(a->'result', '{}'), 'storage', false),
    'screen', lms_x_bool(coalesce(a->'result', '{}'), 'screen', false), 'clock', lms_x_bool(coalesce(a->'result', '{}'), 'clock', false),
    'network_ms', lms_x_n(coalesce(lms_x_num(coalesce(a->'result', '{}'), 'network_ms', 0, 600000, 99999, '네트워크 응답(ms)'), 99999)));
  select coalesce(jsonb_agg(k), '[]') into fails from jsonb_each(r) e(k, v) where (jsonb_typeof(v) = 'boolean' and not v::text::boolean) or (k = 'network_ms' and (v::text)::numeric > 3000);
  ok := jsonb_array_length(fails) = 0;
  insert into lms_exam_precheck (tenant_id, exam_id, person_id, result, ok, ip) values (lms_x_tid(), x.exam_id, pid, r, ok, lms_x_ip(ctx->>'ip'))
  on conflict (tenant_id, exam_id, person_id) do update set result = excluded.result, ok = excluded.ok, ip = excluded.ip, at = now();
  return jsonb_build_object('ok', ok, 'result', r, 'fails', fails);
end $$;
-- 학습자에게 보낼 문항(정답 · 해설 없음, 응시마다 저장된 순서)
create or replace function lms_f_paper(t lms_exam_attempt) returns jsonb language sql stable as $$
  select jsonb_build_object('attempt', lms_f_att_row(t), 'now', lms_x_ts(now()),
    'remaining_sec', greatest(0, floor(extract(epoch from t.deadline_at - now())))::int, 'answers', t.answers,
    'questions', coalesce((select jsonb_agg(jsonb_build_object('q_id', q.q_id, 'kind', q.kind, 'stem', q.stem, 'media', q.media, 'points', lms_x_n((o.i->>'p')::numeric),
        'choices', coalesce((select jsonb_agg(ch order by co.n) from jsonb_array_elements_text(o.i->'c') with ordinality co(cid, n) join jsonb_array_elements(q.choices) ch on ch->>'id' = co.cid), '[]')) order by o.n)
      from jsonb_array_elements(t.items) with ordinality o(i, n) join lms_question q on q.q_id = (o.i->>'q')::uuid), '[]')) $$;
create or replace function lms_f_ip_ok(x lms_exam, ip text) returns boolean language plpgsql immutable as $$
begin
  if cardinality(x.ip_allow) = 0 then return true; end if;
  begin return ip::inet <<= any(x.ip_allow::inet[]); exception when others then return false; end;
end $$;
create or replace function lms_f_start(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare pid uuid := lms_x_learner(ctx); x lms_exam := lms_f_exam(lms_x_uuid(a->>'exam_id', '시험')); t lms_exam_attempt; ip text := lms_x_ip(ctx->>'ip');
  n int; items jsonb := '[]'; r jsonb; q record; seen uuid[] := '{}';
begin
  if lms_x_enr(x.section_id, pid) is null then perform lms_x_err(403, 'not_enrolled', '수강 중인 분반이 아닙니다.'); end if;
  if x.status <> 'published' then perform lms_x_err(409, 'not_open', '응시할 수 없는 시험입니다.'); end if;
  if x.open_at is not null and now() < x.open_at then perform lms_x_err(409, 'not_open', '아직 시험 시간이 아닙니다.'); end if;
  if x.close_at is not null and now() >= x.close_at then perform lms_x_err(409, 'closed', '시험이 끝났습니다.'); end if;
  if not lms_f_ip_ok(x, ip) then perform lms_x_err(403, 'ip', '허용된 장소(네트워크)에서만 응시할 수 있습니다.'); end if;
  perform lms_f_expire(x.exam_id, pid);
  select * into t from lms_exam_attempt where exam_id = x.exam_id and person_id = pid and status = 'in_progress';
  if t.attempt_id is not null then  -- 이어서 응시(같은 문항 · 같은 순서)
    if t.ip_last is distinct from ip then
      update lms_exam_attempt set ip_last = ip, ip_changed = true, ip_log = ip_log || jsonb_build_object('ip', ip, 'at', lms_x_ts(now()), 'ev', 'resume') where attempt_id = t.attempt_id returning * into t; end if;
    return lms_f_paper(t) || jsonb_build_object('resumed', true);
  end if;
  if x.need_precheck and not exists (select 1 from lms_exam_precheck where exam_id = x.exam_id and person_id = pid and ok) then
    perform lms_x_err(409, 'precheck', '응시 전 기능 테스트를 먼저 통과하세요.'); end if;
  select count(*) into n from lms_exam_attempt where exam_id = x.exam_id and person_id = pid;
  if n >= x.max_attempts then perform lms_x_err(409, 'attempts', '응시 횟수(' || x.max_attempts || '회)를 모두 썼습니다.'); end if;
  for q in select qq.q_id, qq.points, qq.kind, qq.choices from jsonb_array_elements_text(x.fixed) with ordinality f(v, k) join lms_question qq on qq.q_id::text = f.v and not qq.deleted order by f.k loop
    seen := seen || q.q_id; items := items || jsonb_build_object('q', q.q_id, 'p', lms_x_n(q.points), 'c', coalesce((select jsonb_agg(ch->>'id' order by case when x.shuffle_c and q.kind in ('single', 'multi') then random() else o.n end) from jsonb_array_elements(q.choices) with ordinality o(ch, n)), '[]'));
  end loop;
  for r in select * from jsonb_array_elements(x.rules) loop
    for q in select qq.q_id, qq.points, qq.kind, qq.choices from lms_question qq where qq.bank_id = (r->>'bank_id')::uuid and not qq.deleted
             and (r->>'difficulty' is null or qq.difficulty = r->>'difficulty') and not (qq.q_id = any(seen)) order by random() limit (r->>'n')::int loop
      seen := seen || q.q_id; items := items || jsonb_build_object('q', q.q_id, 'p', lms_x_n(q.points), 'c', coalesce((select jsonb_agg(ch->>'id' order by case when x.shuffle_c and q.kind in ('single', 'multi') then random() else o.n end) from jsonb_array_elements(q.choices) with ordinality o(ch, n)), '[]'));
    end loop;
  end loop;
  if jsonb_array_length(items) = 0 then perform lms_x_err(409, 'empty', '출제할 문항이 없습니다. 교수자에게 문의하세요.'); end if;
  if x.shuffle_q then select jsonb_agg(i order by random()) into items from jsonb_array_elements(items) i; end if;
  insert into lms_exam_attempt (tenant_id, exam_id, person_id, no, deadline_at, ip_start, ip_last, ip_log, items)
  values (lms_x_tid(), x.exam_id, pid, n + 1, least(now() + make_interval(mins => x.time_limit_min), coalesce(x.close_at, 'infinity')), ip, ip,
    jsonb_build_array(jsonb_build_object('ip', ip, 'at', lms_x_ts(now()), 'ev', 'start')), items) returning * into t;
  return lms_f_paper(t) || jsonb_build_object('resumed', false, '_audit', lms_x_audit('lms.f.start', jsonb_build_object('attempt', t.attempt_id, 'ip', ip)));
end $$;
create or replace function lms_f_my_attempt(ctx jsonb, id uuid) returns lms_exam_attempt language plpgsql as $$
declare pid uuid := lms_x_learner(ctx); t lms_exam_attempt;
begin
  select * into t from lms_exam_attempt where attempt_id = id and person_id = pid;
  if t.attempt_id is null then perform lms_x_err(404, 'attempt', '없는 응시 기록입니다.'); end if;
  return t;
end $$;
create or replace function lms_f_answer(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare t lms_exam_attempt := lms_f_my_attempt(ctx, lms_x_uuid(a->>'attempt_id', '응시')); x lms_exam := lms_f_exam(t.exam_id); ip text := lms_x_ip(ctx->>'ip'); add jsonb := '{}'; k text; v jsonb;
begin
  if t.status <> 'in_progress' then perform lms_x_err(409, 'finished', '이미 제출한 시험입니다.'); end if;
  if now() > t.deadline_at + interval '30 seconds' then
    t := lms_f_finalize(t.attempt_id, true);
    return jsonb_build_object('expired', true, 'attempt', lms_f_att_row(t));
  end if;
  if not lms_f_ip_ok(x, ip) then perform lms_x_err(403, 'ip', '허용된 장소(네트워크)에서만 응시할 수 있습니다.'); end if;
  if jsonb_typeof(a->'answers') <> 'object' then perform lms_x_err(400, 'answers', '답안 형식이 올바르지 않습니다.'); end if;
  for k, v in select * from jsonb_each(a->'answers') loop
    if not exists (select 1 from jsonb_array_elements(t.items) i where i->>'q' = k) then perform lms_x_err(400, 'question', '이 시험에 없는 문항입니다.'); end if;
    if length(v::text) > 20000 then perform lms_x_err(413, 'too_large', '답안이 너무 깁니다.'); end if;
    add := add || jsonb_build_object(k, v);
  end loop;
  update lms_exam_attempt set answers = answers || add, ip_last = ip,
    ip_changed = ip_changed or ip_last is distinct from ip,
    ip_log = case when ip_last is distinct from ip then ip_log || jsonb_build_object('ip', ip, 'at', lms_x_ts(now()), 'ev', 'answer') else ip_log end
  where attempt_id = t.attempt_id returning * into t;
  return jsonb_build_object('expired', false, 'saved', (select count(*) from jsonb_object_keys(add)), 'remaining_sec', greatest(0, floor(extract(epoch from t.deadline_at - now())))::int);
end $$;
create or replace function lms_f_submit(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare t lms_exam_attempt := lms_f_my_attempt(ctx, lms_x_uuid(a->>'attempt_id', '응시'));
begin
  if t.status <> 'in_progress' then perform lms_x_err(409, 'finished', '이미 제출한 시험입니다.'); end if;
  if jsonb_typeof(a->'answers') = 'object' and now() <= t.deadline_at + interval '30 seconds' then perform lms_f_answer(ctx, a); end if;
  t := lms_f_finalize(t.attempt_id, now() > t.deadline_at + interval '30 seconds');
  return jsonb_build_object('attempt', lms_f_att_row(t), '_audit', lms_x_audit('lms.f.submit', jsonb_build_object('attempt', t.attempt_id, 'status', t.status)));
end $$;
-- 결과(공개 정책) · 오답 피드백 · 본인 위치
create or replace function lms_f_result(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare t lms_exam_attempt := lms_f_my_attempt(ctx, lms_x_uuid(a->>'attempt', '응시')); x lms_exam := lms_f_exam(t.exam_id); pct numeric; pos jsonb;
begin
  if t.status = 'in_progress' then perform lms_x_err(409, 'in_progress', '응시 중인 시험입니다.'); end if;
  if x.show_result = 'never' or (x.show_result = 'after_close' and (x.close_at is null or now() < x.close_at)) then
    return jsonb_build_object('attempt', lms_f_att_row(t) || jsonb_build_object('score', null, 'auto_score', null), 'visible', false,
      'message', case when x.show_result = 'never' then '이 시험은 결과를 공개하지 않습니다.' else '시험이 끝난 뒤 결과가 공개됩니다.' end);
  end if;
  pct := 100.0 * t.score / nullif(t.max_score, 0);
  with b as (select distinct on (person_id) person_id, 100.0 * score / nullif(max_score, 0) p from lms_exam_attempt
             where exam_id = x.exam_id and status = 'graded' and lms_x_enr(x.section_id, person_id) = 'regular' order by person_id, 100.0 * score / nullif(max_score, 0) desc)
  select jsonb_build_object('n', count(*), 'mean', lms_x_n(avg(p)), 'rank', case when pct is null then null else 1 + count(*) filter (where p > pct) end,
    'top_pct', case when pct is null or count(*) = 0 then null else lms_x_n(100.0 * (1 + count(*) filter (where p > pct)) / count(*)) end) into pos from b;
  return jsonb_build_object('attempt', lms_f_att_row(t), 'visible', true, 'pct', lms_x_n(pct), 'position', pos, 'retry_wrong', x.retry_wrong,
    'items', coalesce((select jsonb_agg(jsonb_build_object('q_id', q.q_id, 'kind', q.kind, 'stem', q.stem, 'points', lms_x_n((o.i->>'p')::numeric),
        'your_answer', t.answers->(o.i->>'q'), 'score', t.marks->(o.i->>'q')->'score', 'ok', t.marks->(o.i->>'q')->'ok', 'feedback', t.marks->(o.i->>'q')->'fb',
        'answer', case when (t.marks->(o.i->>'q')->>'ok') = 'false' or (t.marks->(o.i->>'q')->>'ok') = 'true' then q.answer end,
        'choices', q.choices, 'explanation', case when (t.marks->(o.i->>'q')->>'ok') = 'false' then q.explanation end) order by o.n)
      from jsonb_array_elements(t.items) with ordinality o(i, n) join lms_question q on q.q_id = (o.i->>'q')::uuid), '[]'));
end $$;
-- 오답 재시도(성적 미반영 연습): answers 없으면 틀린 문항, 있으면 정오 · 해설
create or replace function lms_f_retry(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare t lms_exam_attempt := lms_f_my_attempt(ctx, lms_x_uuid(a->>'attempt_id', '응시')); x lms_exam := lms_f_exam(t.exam_id);
begin
  if not x.retry_wrong then perform lms_x_err(409, 'retry_off', '이 시험은 오답 재시도를 쓰지 않습니다.'); end if;
  if t.status = 'in_progress' then perform lms_x_err(409, 'in_progress', '응시 중인 시험입니다.'); end if;
  if jsonb_typeof(a->'answers') = 'object' then
    return jsonb_build_object('checked', coalesce((select jsonb_agg(jsonb_build_object('q_id', q.q_id, 'ok', lms_f_correct(q, a->'answers'->(q.q_id::text)), 'answer', q.answer, 'explanation', q.explanation) order by q.q_id)
      from lms_question q where q.q_id::text in (select jsonb_object_keys(a->'answers')) and t.marks->(q.q_id::text)->>'ok' = 'false'), '[]'));
  end if;
  return jsonb_build_object('questions', coalesce((select jsonb_agg(jsonb_build_object('q_id', q.q_id, 'kind', q.kind, 'stem', q.stem, 'media', q.media,
      'choices', coalesce((select jsonb_agg(ch order by random()) from jsonb_array_elements(q.choices) ch), '[]')) order by o.n)
    from jsonb_array_elements(t.items) with ordinality o(i, n) join lms_question q on q.q_id = (o.i->>'q')::uuid where t.marks->(o.i->>'q')->>'ok' = 'false' and q.kind <> 'essay'), '[]'));
end $$;
