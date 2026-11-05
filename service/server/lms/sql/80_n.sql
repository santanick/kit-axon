-- 묶음 N — MOOC · 비학위(SFR-059 · 060 · 061 · 064 · 004): 과정 검색(태그 · 옵션 · 자동완성) · 찜 · 북마크 · 마이페이지,
-- 기수 · 수료 규칙(학습활동 + 진도율 · 과락) · 수료증 양식 · 자동/수동 승인 · 정규→MOOC 전환 · 교수자/운영자 권한 분리,
-- 진단평가 기반 수준별 학습경로 추천 · 기초학력 진단. PG 결제 · 환불은 연동 지점(결제 대기 상태 · 수동 확인)까지만.
-- 업무 규칙은 lms_n_* 함수(공통 도우미는 68_k.sql). Node mod-n.js · Java lms.n이 같은 함수를 부른다.

create table if not exists lms_n_course (
  tenant_id   text not null references tenants(id) on delete cascade,
  course_id   uuid not null default gen_random_uuid(),
  title       text not null check (length(title) between 1 and 120),
  summary     text not null default '',
  tags        text[] not null default '{}',
  category    text not null default '',
  level       text not null default 'basic' check (level in ('basic','inter','adv')),
  lang        text not null default 'ko',
  options     jsonb not null default '{}',                  -- {self_paced, cert, subtitles, credit_bank}
  price       int not null default 0 check (price >= 0),    -- 0 = 무료. 유료는 PG 연동 후 결제
  areas       text[] not null default '{}',                 -- 진단 영역(학습경로 추천)
  status      text not null default 'draft' check (status in ('draft','pending','approved','rejected','closed')),
  reject_reason text not null default '',
  owner_email text,                                         -- 교수자(콘텐츠 · 진도) — 운영자는 승인 · 수료 · 수료증
  source      text not null default 'mooc' check (source in ('mooc','converted')),
  from_course_code text,                                    -- 정규 교과 → MOOC 전환 원본
  approval_mode text not null default 'auto' check (approval_mode in ('auto','manual')),
  rule        jsonb not null default '{"min_progress":80,"min_activity":0,"pass_score":60,"fail_line":40}', -- 수료 기준(진도율 · 학습활동 · 점수 · 과락)
  cert_tpl    jsonb not null default '{"title":"수료증","body":"위 사람은 {과정} 과정({기수}기)을 성실히 이수하였으므로 이 증서를 수여합니다.","issuer":""}',
  created_at  timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (tenant_id, course_id)
);
create index if not exists lms_n_course_st on lms_n_course (tenant_id, status);
create table if not exists lms_n_cohort (
  tenant_id   text not null,
  cohort_id   uuid not null default gen_random_uuid(),
  course_id   uuid not null,
  no          int not null,
  starts_on   date, ends_on date,
  capacity    int,
  status      text not null default 'open' check (status in ('open','closed')),
  primary key (tenant_id, cohort_id),
  unique (tenant_id, course_id, no),
  foreign key (tenant_id, course_id) references lms_n_course (tenant_id, course_id) on delete cascade
);
create table if not exists lms_n_enroll (
  tenant_id   text not null,
  cohort_id   uuid not null,
  member_no   text not null,
  status      text not null default 'pending' check (status in ('pending','approved','rejected','completed','failed','cancelled')),
  pay_status  text not null default 'free' check (pay_status in ('free','pending','paid','refund_req')),
  progress    int not null default 0 check (progress between 0 and 100),
  activity    int not null default 0,
  score       numeric(6,2),
  items       jsonb not null default '{}',                  -- 평가 항목별 점수(과락 판정)
  reason      text not null default '',
  cert_no     text,
  applied_at  timestamptz not null default now(), decided_at timestamptz, completed_at timestamptz,
  primary key (tenant_id, cohort_id, member_no),
  foreign key (tenant_id, cohort_id) references lms_n_cohort (tenant_id, cohort_id) on delete cascade
);
create index if not exists lms_n_enroll_me on lms_n_enroll (tenant_id, member_no);
create table if not exists lms_n_wish (
  tenant_id   text not null,
  member_no   text not null,
  course_id   uuid not null,
  kind        text not null check (kind in ('wish','bookmark')),
  at          timestamptz not null default now(),
  primary key (tenant_id, member_no, course_id, kind),
  foreign key (tenant_id, course_id) references lms_n_course (tenant_id, course_id) on delete cascade
);
create table if not exists lms_n_diag (
  tenant_id   text not null references tenants(id) on delete cascade,
  test_id     uuid not null default gen_random_uuid(),
  title       text not null,
  kind        text not null default 'level' check (kind in ('level','basic')),   -- 수준 진단 · 기초학력 진단
  items       jsonb not null default '[]',                  -- [{q, options[], answer, area}]
  created_at  timestamptz not null default now(),
  primary key (tenant_id, test_id)
);
create table if not exists lms_n_diag_result (
  tenant_id   text not null,
  test_id     uuid not null,
  member_no   text not null,
  score       int not null,
  by_area     jsonb not null,                               -- {영역: 정답률}
  level       text not null,
  at          timestamptz not null default now(),
  primary key (tenant_id, test_id, member_no),
  foreign key (tenant_id, test_id) references lms_n_diag (tenant_id, test_id) on delete cascade
);
do $$ declare t text; begin
  foreach t in array array['lms_n_course','lms_n_cohort','lms_n_enroll','lms_n_wish','lms_n_diag','lms_n_diag_result'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
end $$;

create or replace function lms_n_get(cid uuid) returns lms_n_course language plpgsql stable as $$
declare c lms_n_course; begin select * into c from lms_n_course where course_id = cid;
  if not found then perform lms_k_err(404, 'no_course', '과정을 찾을 수 없습니다.'); end if; return c; end $$;
-- 교수자는 자기 과정만(운영자는 전체)
create or replace function lms_n_own(actor jsonb, c lms_n_course) returns void language plpgsql stable as $$
begin if actor->>'role' = 'teacher' and c.owner_email is distinct from actor->>'email' then perform lms_k_err(403, 'not_owner', '담당 교수자만 다룰 수 있는 과정입니다.'); end if; end $$;
create or replace function lms_n_cout(c lms_n_course) returns jsonb language sql stable as $$
  select jsonb_build_object('course_id', c.course_id, 'title', c.title, 'summary', c.summary, 'tags', to_jsonb(c.tags), 'category', c.category, 'level', c.level, 'lang', c.lang,
    'options', c.options, 'price', c.price, 'areas', to_jsonb(c.areas), 'status', c.status, 'reject_reason', c.reject_reason, 'owner_email', c.owner_email, 'source', c.source,
    'from_course_code', c.from_course_code, 'approval_mode', c.approval_mode, 'rule', c.rule, 'cert_tpl', c.cert_tpl, 'created_at', c.created_at,
    'n_cohort', (select count(*) from lms_n_cohort h where h.course_id = c.course_id),
    'n_enroll', (select count(*) from lms_n_enroll e join lms_n_cohort h on h.cohort_id = e.cohort_id where h.course_id = c.course_id and e.status in ('approved','completed','failed')),
    'n_wish', (select count(*) from lms_n_wish w where w.course_id = c.course_id and w.kind = 'wish')) $$;
create or replace function lms_n_arr(a jsonb, k text, mx int default 20) returns text[] language sql immutable as $$
  select coalesce((select array_agg(distinct left(btrim(x), 30)) from (select x from jsonb_array_elements_text(case jsonb_typeof(a->k) when 'array' then a->k else '[]' end) x limit mx) z where btrim(x) <> ''), '{}') $$;

-- 검색(태그 · 수준 · 분류 · 무료 · 정렬) — 학생 검색은 승인된 과정만
create or replace function lms_n_search(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare q text := lms_k_t(a, 'q', 60); srt text := coalesce(nullif(lms_k_t(a, 'sort', 10), ''), 'new'); r jsonb; begin
  select coalesce(jsonb_agg(x.j order by case when srt = 'popular' then -(x.j->>'n_enroll')::int else 0 end, case when srt = 'title' then x.j->>'title' end, x.created_at desc, x.course_id), '[]') into r
  from (select lms_n_cout(c) j, c.created_at, c.course_id from lms_n_course c
   where (case when lms_k_b(a, 'all') then (actor->>'role' <> 'teacher' or c.owner_email = actor->>'email') else c.status = 'approved' end)
     and (q = '' or c.title ilike '%' || q || '%' or c.summary ilike '%' || q || '%' or exists (select 1 from unnest(c.tags) t where t ilike '%' || q || '%'))
     and (lms_k_t(a, 'tag') = '' or lms_k_t(a, 'tag') = any(c.tags))
     and (lms_k_t(a, 'level') = '' or c.level = lms_k_t(a, 'level'))
     and (lms_k_t(a, 'category') = '' or c.category = lms_k_t(a, 'category'))
     and (not lms_k_b(a, 'free') or c.price = 0)
     and (not lms_k_b(a, 'cert') or coalesce((c.options->>'cert')::boolean, false))
     and (lms_k_t(a, 'status') = '' or c.status = lms_k_t(a, 'status'))) x;
  return jsonb_build_object('items', r, 'tags', coalesce((select jsonb_agg(t order by t) from (select distinct unnest(tags) t from lms_n_course where status = 'approved') z), '[]')); end $$;
-- 자동완성: 제목 · 태그 앞부분 일치 우선
create or replace function lms_n_suggest(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare q text := lms_k_t(a, 'q', 40); begin
  if length(q) < 1 then return jsonb_build_object('items', '[]'::jsonb); end if;
  return jsonb_build_object('items', coalesce((select jsonb_agg(v order by p, v) from (select distinct on (v) v, p from (
      select title v, case when title ilike q || '%' then 0 else 1 end p from lms_n_course where status = 'approved' and title ilike '%' || q || '%'
      union all select '#' || t, case when t ilike q || '%' then 0 else 2 end from lms_n_course, unnest(tags) t where status = 'approved' and t ilike '%' || q || '%') z order by v, p) y limit 8), '[]')); end $$;

create or replace function lms_n_course_get(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare c lms_n_course := lms_n_get(lms_k_uuid(a, 'course_id')); begin
  return lms_n_cout(c) || jsonb_build_object('cohorts', coalesce((select jsonb_agg(jsonb_build_object('cohort_id', h.cohort_id, 'no', h.no, 'starts_on', h.starts_on, 'ends_on', h.ends_on, 'capacity', h.capacity, 'status', h.status,
      'n', (select count(*) from lms_n_enroll e where e.cohort_id = h.cohort_id and e.status in ('approved','completed','failed','pending'))) order by h.no) from lms_n_cohort h where h.course_id = c.course_id), '[]')); end $$;

create or replace function lms_n_course_save(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare cid uuid := lms_k_uuid(a, 'course_id'); c lms_n_course; t text := lms_k_t(a, 'title', 120); lv text := coalesce(nullif(lms_k_t(a, 'level', 10), ''), 'basic'); ru jsonb; begin
  if t = '' then perform lms_k_err(400, 'bad_title', '과정명을 입력하세요.'); end if;
  if lv not in ('basic','inter','adv') then perform lms_k_err(400, 'bad_level', '수준은 basic · inter · adv 중 하나입니다.'); end if;
  if coalesce(lms_k_i(a, 'price', 0), -1) < 0 then perform lms_k_err(400, 'bad_price', '수강료는 0 이상 정수입니다.'); end if;
  ru := case jsonb_typeof(a->'rule') when 'object' then a->'rule' else null end;
  if ru is not null and (coalesce(lms_k_i(ru, 'min_progress', 0), -1) not between 0 and 100 or coalesce(lms_k_i(ru, 'pass_score', 0), -1) not between 0 and 100 or coalesce(lms_k_i(ru, 'fail_line', 0), -1) not between 0 and 100 or coalesce(lms_k_i(ru, 'min_activity', 0), -1) < 0) then
    perform lms_k_err(400, 'bad_rule', '수료 기준(진도율 · 점수 · 과락 0~100, 학습활동 0 이상)을 확인하세요.'); end if;
  if ru is not null then ru := jsonb_build_object('min_progress', lms_k_i(ru, 'min_progress', 80), 'min_activity', lms_k_i(ru, 'min_activity', 0), 'pass_score', lms_k_i(ru, 'pass_score', 60), 'fail_line', lms_k_i(ru, 'fail_line', 40)); end if;
  if cid is null then
    insert into lms_n_course (tenant_id, title, summary, tags, category, level, lang, options, price, areas, owner_email, approval_mode, rule, cert_tpl)
    values (lms_k_tid(), t, lms_k_t(a, 'summary', 4000), lms_n_arr(a, 'tags'), lms_k_t(a, 'category', 40), lv, coalesce(nullif(lms_k_t(a, 'lang', 5), ''), 'ko'),
      case jsonb_typeof(a->'options') when 'object' then a->'options' else '{}' end, lms_k_i(a, 'price', 0), lms_n_arr(a, 'areas'),
      case when actor->>'role' = 'teacher' then actor->>'email' else nullif(lms_k_t(a, 'owner_email', 120), '') end,
      case when lms_k_t(a, 'approval_mode') = 'manual' then 'manual' else 'auto' end, coalesce(ru, '{"min_progress":80,"min_activity":0,"pass_score":60,"fail_line":40}'),
      coalesce(case jsonb_typeof(a->'cert_tpl') when 'object' then a->'cert_tpl' end, '{"title":"수료증","body":"위 사람은 {과정} 과정({기수}기)을 성실히 이수하였으므로 이 증서를 수여합니다.","issuer":""}'))
    returning course_id into cid;
  else
    c := lms_n_get(cid); perform lms_n_own(actor, c);
    if actor->>'role' = 'teacher' and c.status not in ('draft','rejected') then perform lms_k_err(409, 'locked', '승인 요청 · 승인된 과정은 운영자만 고칠 수 있습니다.'); end if;
    if actor->>'role' = 'teacher' and (a ? 'cert_tpl' or a ? 'approval_mode') then perform lms_k_err(403, 'operator_only', '수료증 양식 · 수강 승인 방식은 운영자가 정합니다.'); end if;
    update lms_n_course set title = t, summary = lms_k_t(a, 'summary', 4000), tags = lms_n_arr(a, 'tags'), category = lms_k_t(a, 'category', 40), level = lv,
      lang = coalesce(nullif(lms_k_t(a, 'lang', 5), ''), 'ko'), options = case jsonb_typeof(a->'options') when 'object' then a->'options' else options end, price = lms_k_i(a, 'price', 0), areas = lms_n_arr(a, 'areas'),
      approval_mode = case when a ? 'approval_mode' then case when lms_k_t(a, 'approval_mode') = 'manual' then 'manual' else 'auto' end else approval_mode end,
      rule = coalesce(ru, rule), cert_tpl = coalesce(case jsonb_typeof(a->'cert_tpl') when 'object' then a->'cert_tpl' end, cert_tpl),
      owner_email = case when actor->>'role' <> 'teacher' and a ? 'owner_email' then nullif(lms_k_t(a, 'owner_email', 120), '') else owner_email end, updated_at = now() where course_id = cid;
  end if;
  return lms_n_course_get(actor, jsonb_build_object('course_id', cid)); end $$;

create or replace function lms_n_course_submit(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_n_course := lms_n_get(lms_k_uuid(a, 'course_id')); begin perform lms_n_own(actor, c);
  if c.status not in ('draft','rejected') then perform lms_k_err(409, 'bad_status', '작성 중 · 반려된 과정만 승인 요청할 수 있습니다.'); end if;
  update lms_n_course set status = 'pending', reject_reason = '', updated_at = now() where course_id = c.course_id;
  return lms_n_cout(lms_n_get(c.course_id)); end $$;
-- 운영자 승인(교수자는 불가 — 경로 권한 os)
create or replace function lms_n_course_decide(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_n_course := lms_n_get(lms_k_uuid(a, 'course_id')); ok boolean := lms_k_b(a, 'approve'); begin
  if c.status <> 'pending' then perform lms_k_err(409, 'bad_status', '승인 요청된 과정만 승인 · 반려할 수 있습니다.'); end if;
  if not ok and lms_k_t(a, 'reason') = '' then perform lms_k_err(400, 'need_reason', '반려 사유를 입력하세요.'); end if;
  update lms_n_course set status = case when ok then 'approved' else 'rejected' end, reject_reason = case when ok then '' else lms_k_t(a, 'reason', 500) end, updated_at = now() where course_id = c.course_id;
  return lms_n_cout(lms_n_get(c.course_id)); end $$;
create or replace function lms_n_course_close(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_n_course := lms_n_get(lms_k_uuid(a, 'course_id')); begin
  update lms_n_course set status = 'closed', updated_at = now() where course_id = c.course_id; return lms_n_cout(lms_n_get(c.course_id)); end $$;
-- 정규 교과(lms_course) → MOOC 과정(작성 중)
create or replace function lms_n_convert(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare cc text := lms_k_t(a, 'course_code', 20); src record; cid uuid; begin
  select * into src from lms_course where course_code = cc;
  if not found then perform lms_k_err(404, 'no_course', '정규 교과목을 찾을 수 없습니다.'); end if;
  if exists (select 1 from lms_n_course where from_course_code = cc and status <> 'closed') then perform lms_k_err(409, 'exists', '이미 MOOC로 전환된 교과목입니다.'); end if;
  insert into lms_n_course (tenant_id, title, summary, tags, category, owner_email, source, from_course_code)
  values (lms_k_tid(), src.name, '정규 교과 ' || cc || '에서 전환한 공개 강좌입니다.', array[coalesce(src.unit_code, '정규')], coalesce(src.category, ''), case when actor->>'role' = 'teacher' then actor->>'email' end, 'converted', cc)
  returning course_id into cid;
  return lms_n_course_get(actor, jsonb_build_object('course_id', cid)); end $$;

create or replace function lms_n_cohort_save(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare c lms_n_course := lms_n_get(lms_k_uuid(a, 'course_id')); hid uuid := lms_k_uuid(a, 'cohort_id'); s date; e date; begin perform lms_n_own(actor, c);
  s := lms_k_ts(a, 'starts_on')::date; e := lms_k_ts(a, 'ends_on')::date;
  if s is not null and e is not null and e < s then perform lms_k_err(400, 'bad_date', '기수 종료일이 시작일보다 빠릅니다.'); end if;
  if coalesce(lms_k_i(a, 'capacity', 0), -1) < 0 then perform lms_k_err(400, 'bad_capacity', '정원은 0 이상 정수입니다(0 = 제한 없음).'); end if;
  if hid is null then
    insert into lms_n_cohort (tenant_id, course_id, no, starts_on, ends_on, capacity) values (lms_k_tid(), c.course_id, coalesce((select max(no) from lms_n_cohort where course_id = c.course_id), 0) + 1, s, e, nullif(lms_k_i(a, 'capacity', 0), 0));
  else
    update lms_n_cohort set starts_on = s, ends_on = e, capacity = nullif(lms_k_i(a, 'capacity', 0), 0), status = case when lms_k_t(a, 'status') = 'closed' then 'closed' else 'open' end where cohort_id = hid and course_id = c.course_id;
  end if;
  return lms_n_course_get(actor, jsonb_build_object('course_id', c.course_id)); end $$;

create or replace function lms_n_eout(e lms_n_enroll) returns jsonb language sql stable as $$
  select jsonb_build_object('cohort_id', e.cohort_id, 'member_no', e.member_no, 'status', e.status, 'pay_status', e.pay_status, 'progress', e.progress, 'activity', e.activity, 'score', e.score,
    'items', e.items, 'reason', e.reason, 'cert_no', e.cert_no, 'applied_at', e.applied_at, 'completed_at', e.completed_at, 'unit_code', lms_k_person(e.member_no)->>'unit_code') $$;
-- 수강 신청: 유료면 결제 대기(PG 연동 후 결제), 무료면 승인 방식(자동 · 수동)
create or replace function lms_n_enroll(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_k_no(a); h lms_n_cohort; c lms_n_course; n int; e lms_n_enroll; begin
  select * into h from lms_n_cohort where cohort_id = lms_k_uuid(a, 'cohort_id') for update;
  if not found then perform lms_k_err(404, 'no_cohort', '기수를 찾을 수 없습니다.'); end if;
  c := lms_n_get(h.course_id);
  if c.status <> 'approved' then perform lms_k_err(409, 'not_open', '승인된 과정만 신청할 수 있습니다.'); end if;
  if h.status <> 'open' then perform lms_k_err(409, 'closed', '모집이 끝난 기수입니다.'); end if;
  if exists (select 1 from lms_n_enroll x where x.cohort_id = h.cohort_id and x.member_no = mno and x.status <> 'cancelled') then perform lms_k_err(409, 'dup', '이미 신청한 기수입니다.'); end if;
  select count(*) into n from lms_n_enroll x where x.cohort_id = h.cohort_id and x.status in ('pending','approved','completed','failed');
  if h.capacity is not null and n >= h.capacity then perform lms_k_err(409, 'full', '정원이 찼습니다.'); end if;
  insert into lms_n_enroll (tenant_id, cohort_id, member_no, status, pay_status, decided_at)
  values (lms_k_tid(), h.cohort_id, mno, case when c.price = 0 and c.approval_mode = 'auto' then 'approved' else 'pending' end, case when c.price > 0 then 'pending' else 'free' end, case when c.price = 0 and c.approval_mode = 'auto' then now() end)
  on conflict (tenant_id, cohort_id, member_no) do update set status = excluded.status, pay_status = excluded.pay_status, decided_at = excluded.decided_at, applied_at = now(), reason = ''
  returning * into e;
  return lms_n_eout(e) || jsonb_build_object('note', case when c.price > 0 then 'PG 결제 연동 후 결제가 완료되면 수강이 확정됩니다(데모: 운영자 결제 확인).' when e.status = 'pending' then '운영자 승인 후 수강할 수 있습니다.' else '수강이 확정되었습니다.' end); end $$;
create or replace function lms_n_enroll_cancel(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare e lms_n_enroll; begin
  update lms_n_enroll set status = 'cancelled', pay_status = case when pay_status = 'paid' then 'refund_req' else pay_status end
   where cohort_id = lms_k_uuid(a, 'cohort_id') and member_no = lms_k_no(a) and status in ('pending','approved') returning * into e;
  if e is null then perform lms_k_err(409, 'bad_status', '취소할 수 있는 신청이 없습니다.'); end if;
  return lms_n_eout(e) || jsonb_build_object('note', case when e.pay_status = 'refund_req' then '환불 요청이 PG 연동 대기열에 들어갔습니다.' else '' end); end $$;
-- 결제 확인(PG 콜백 자리 — 데모는 운영자 수동 확인)
create or replace function lms_n_pay_confirm(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare e lms_n_enroll; c lms_n_course; begin
  select * into e from lms_n_enroll where cohort_id = lms_k_uuid(a, 'cohort_id') and member_no = lms_k_no(a) for update;
  if not found or e.pay_status <> 'pending' then perform lms_k_err(409, 'bad_status', '결제 대기 중인 신청이 아닙니다.'); end if;
  select c2.* into c from lms_n_course c2 join lms_n_cohort h on h.course_id = c2.course_id where h.cohort_id = e.cohort_id;
  update lms_n_enroll set pay_status = 'paid', status = case when c.approval_mode = 'auto' and status = 'pending' then 'approved' else status end, decided_at = case when c.approval_mode = 'auto' then now() else decided_at end
   where cohort_id = e.cohort_id and member_no = e.member_no returning * into e;
  return lms_n_eout(e); end $$;
create or replace function lms_n_enroll_decide(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare ok boolean := lms_k_b(a, 'approve'); n int := 0; m text; hid uuid := lms_k_uuid(a, 'cohort_id'); begin
  if jsonb_typeof(a->'members') <> 'array' then perform lms_k_err(400, 'bad_members', '학번 목록을 보내세요.'); end if;
  for m in select jsonb_array_elements_text(a->'members') loop
    update lms_n_enroll set status = case when ok then 'approved' else 'rejected' end, decided_at = now(), reason = case when ok then '' else lms_k_t(a, 'reason', 300) end
     where cohort_id = hid and member_no = m and status = 'pending' and (not ok or pay_status in ('free','paid'));
    if found then n := n + 1; end if;
  end loop;
  return jsonb_build_object('ok', true, 'changed', n); end $$;
create or replace function lms_n_enrolls(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare h lms_n_cohort; begin
  select * into h from lms_n_cohort where cohort_id = lms_k_uuid(a, 'cohort_id'); if not found then perform lms_k_err(404, 'no_cohort', '기수를 찾을 수 없습니다.'); end if;
  perform lms_n_own(actor, lms_n_get(h.course_id));
  return jsonb_build_object('items', coalesce((select jsonb_agg(lms_n_eout(e) order by e.member_no) from lms_n_enroll e where e.cohort_id = h.cohort_id and (lms_k_t(a, 'status') = '' or e.status = lms_k_t(a, 'status'))), '[]')); end $$;
-- 교수자: 진도 · 학습활동 · 평가 점수 입력(자기 과정)
create or replace function lms_n_progress(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare h lms_n_cohort; e lms_n_enroll; begin
  select * into h from lms_n_cohort where cohort_id = lms_k_uuid(a, 'cohort_id'); if not found then perform lms_k_err(404, 'no_cohort', '기수를 찾을 수 없습니다.'); end if;
  perform lms_n_own(actor, lms_n_get(h.course_id));
  if coalesce(lms_k_i(a, 'progress', 0), -1) not between 0 and 100 then perform lms_k_err(400, 'bad_progress', '진도율은 0~100입니다.'); end if;
  update lms_n_enroll set progress = lms_k_i(a, 'progress', progress), activity = coalesce(lms_k_i(a, 'activity'), activity), score = coalesce(lms_k_n(a, 'score'), score),
    items = case jsonb_typeof(a->'items') when 'object' then a->'items' else items end
   where cohort_id = h.cohort_id and member_no = lms_k_no(a) and status in ('approved','failed') returning * into e;
  if e is null then perform lms_k_err(409, 'bad_status', '수강 중인 학습자가 아닙니다.'); end if;
  return lms_n_eout(e); end $$;
-- 수료 판정: 진도율 · 학습활동 · 점수 · 과락(평가 항목 하나라도 과락선 미만) + 설문 게이트(completion)
create or replace function lms_n_complete(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare h lms_n_cohort; c lms_n_course; e lms_n_enroll; why text; g jsonb; nc int := 0; nf int := 0; seq int; begin
  select * into h from lms_n_cohort where cohort_id = lms_k_uuid(a, 'cohort_id') for update; if not found then perform lms_k_err(404, 'no_cohort', '기수를 찾을 수 없습니다.'); end if;
  c := lms_n_get(h.course_id);
  for e in select * from lms_n_enroll where cohort_id = h.cohort_id and status in ('approved','failed') order by member_no loop
    why := '';
    if e.progress < (c.rule->>'min_progress')::int then why := '진도율 미달'; end if;
    if why = '' and e.activity < (c.rule->>'min_activity')::int then why := '학습활동 미달'; end if;
    if why = '' and coalesce(e.score, 0) < (c.rule->>'pass_score')::int then why := '점수 미달'; end if;
    if why = '' and exists (select 1 from jsonb_each_text(e.items) x where x.value ~ '^\d+(\.\d+)?$' and x.value::numeric < (c.rule->>'fail_line')::int) then why := '과락'; end if;
    if why = '' then g := lms_k_gate_check(e.member_no, 'completion', 'mooc', c.course_id::text); if (g->>'blocked')::boolean then why := '설문 미참여'; end if; end if;
    if why = '' then
      select count(*) + 1 into seq from lms_n_enroll x join lms_n_cohort y on y.cohort_id = x.cohort_id where x.cert_no is not null;
      update lms_n_enroll set status = 'completed', completed_at = now(), reason = '', cert_no = 'N-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 5, '0') where cohort_id = e.cohort_id and member_no = e.member_no; nc := nc + 1;
    else update lms_n_enroll set status = 'failed', reason = why where cohort_id = e.cohort_id and member_no = e.member_no; nf := nf + 1; end if;
  end loop;
  return jsonb_build_object('ok', true, 'completed', nc, 'failed', nf, 'items', (lms_n_enrolls(actor, jsonb_build_object('cohort_id', h.cohort_id)))->'items'); end $$;
-- 수료증(인쇄용 HTML). 수료증 단계 설문 게이트를 지나야 발급
create or replace function lms_n_certificate(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare e lms_n_enroll; h lms_n_cohort; c lms_n_course; g jsonb; body text; begin
  select * into e from lms_n_enroll where cohort_id = lms_k_uuid(a, 'cohort_id') and member_no = lms_k_no(a);
  if not found or e.status <> 'completed' then perform lms_k_err(409, 'not_completed', '수료한 학습자만 수료증을 받을 수 있습니다.'); end if;
  select * into h from lms_n_cohort where cohort_id = e.cohort_id; c := lms_n_get(h.course_id);
  g := lms_k_gate_check(e.member_no, 'certificate', 'mooc', c.course_id::text);
  if (g->>'blocked')::boolean then perform lms_k_err(409, 'survey_required', '설문에 먼저 참여해야 수료증을 받을 수 있습니다.'); end if;
  body := replace(replace(replace(c.cert_tpl->>'body', '{과정}', c.title), '{기수}', h.no::text), '{학번}', e.member_no);
  return jsonb_build_object('filename', '수료증_' || e.cert_no || '.html', 'mime', 'text/html; charset=utf-8', 'cert_no', e.cert_no,
    'content', '<!doctype html><html lang="ko"><meta charset="utf-8"><title>' || coalesce(c.cert_tpl->>'title', '수료증') || '</title><body style="font-family:sans-serif;max-width:720px;margin:40px auto;text-align:center;border:6px double #333;padding:48px">'
      || '<p style="text-align:left">제 ' || e.cert_no || ' 호</p><h1 style="letter-spacing:12px">' || coalesce(c.cert_tpl->>'title', '수료증') || '</h1>'
      || '<p>학번: ' || e.member_no || '</p><p>과정: ' || c.title || ' (' || h.no || '기' || coalesce(', ' || h.starts_on || ' ~ ' || h.ends_on, '') || ')</p>'
      || '<p style="margin:32px 0;line-height:1.8">' || body || '</p><p>' || to_char(e.completed_at, 'YYYY년 MM월 DD일') || '</p><p><b>' || coalesce(nullif(c.cert_tpl->>'issuer', ''), '총장') || '</b></p></body></html>'); end $$;

create or replace function lms_n_wish(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare mno text := lms_k_no(a); c lms_n_course := lms_n_get(lms_k_uuid(a, 'course_id')); k text := coalesce(nullif(lms_k_t(a, 'kind', 10), ''), 'wish'); on_ boolean; begin
  if k not in ('wish','bookmark') then perform lms_k_err(400, 'bad_kind', '찜(wish) · 북마크(bookmark)만 됩니다.'); end if;
  delete from lms_n_wish where member_no = mno and course_id = c.course_id and kind = k;
  on_ := not found;
  if on_ then insert into lms_n_wish (tenant_id, member_no, course_id, kind) values (lms_k_tid(), mno, c.course_id, k); end if;
  return jsonb_build_object('ok', true, 'course_id', c.course_id, 'kind', k, 'on', on_); end $$;
create or replace function lms_n_mypage(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare mno text := lms_k_no(a); begin
  return jsonb_build_object('member_no', mno,
    'wish', coalesce((select jsonb_agg(lms_n_cout(c) order by w.at desc) from lms_n_wish w join lms_n_course c on c.course_id = w.course_id where w.member_no = mno and w.kind = 'wish'), '[]'),
    'bookmark', coalesce((select jsonb_agg(lms_n_cout(c) order by w.at desc) from lms_n_wish w join lms_n_course c on c.course_id = w.course_id where w.member_no = mno and w.kind = 'bookmark'), '[]'),
    'enrolls', coalesce((select jsonb_agg(lms_n_eout(e) || jsonb_build_object('title', c.title, 'course_id', c.course_id, 'no', h.no) order by e.applied_at desc) from lms_n_enroll e join lms_n_cohort h on h.cohort_id = e.cohort_id join lms_n_course c on c.course_id = h.course_id where e.member_no = mno), '[]'),
    'diag', coalesce((select jsonb_agg(jsonb_build_object('test_id', r.test_id, 'title', d.title, 'score', r.score, 'level', r.level, 'by_area', r.by_area, 'at', r.at) order by r.at desc) from lms_n_diag_result r join lms_n_diag d on d.test_id = r.test_id where r.member_no = mno), '[]')); end $$;

-- 진단평가
create or replace function lms_n_diag_save(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare tid_ uuid := lms_k_uuid(a, 'test_id'); it jsonb; i int := 0; clean jsonb := '[]'; begin
  if lms_k_t(a, 'title') = '' then perform lms_k_err(400, 'bad_title', '진단평가 이름을 입력하세요.'); end if;
  if jsonb_typeof(a->'items') <> 'array' or jsonb_array_length(a->'items') = 0 or jsonb_array_length(a->'items') > 100 then perform lms_k_err(400, 'bad_items', '문항을 1~100개 입력하세요.'); end if;
  for it in select * from jsonb_array_elements(a->'items') loop i := i + 1;
    if lms_k_t(it, 'q', 500) = '' or jsonb_typeof(it->'options') <> 'array' or jsonb_array_length(it->'options') < 2 or coalesce(lms_k_i(it, 'answer', -1), -1) not between 0 and jsonb_array_length(it->'options') - 1 or lms_k_t(it, 'area', 30) = '' then
      perform lms_k_err(400, 'bad_item', i || '번 문항(문제 · 보기 2개 이상 · 정답 · 영역)을 확인하세요.'); end if;
    clean := clean || jsonb_build_array(jsonb_build_object('q', lms_k_t(it, 'q', 500), 'options', it->'options', 'answer', lms_k_i(it, 'answer'), 'area', lms_k_t(it, 'area', 30)));
  end loop;
  if tid_ is null then insert into lms_n_diag (tenant_id, title, kind, items) values (lms_k_tid(), lms_k_t(a, 'title'), case when lms_k_t(a, 'kind') = 'basic' then 'basic' else 'level' end, clean) returning test_id into tid_;
  else update lms_n_diag set title = lms_k_t(a, 'title'), items = clean where test_id = tid_; end if;
  return jsonb_build_object('test_id', tid_, 'title', lms_k_t(a, 'title'), 'n', jsonb_array_length(clean)); end $$;
create or replace function lms_n_diags(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
begin return jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('test_id', d.test_id, 'title', d.title, 'kind', d.kind, 'n', jsonb_array_length(d.items),
  'questions', (select jsonb_agg(jsonb_build_object('q', x->>'q', 'options', x->'options', 'area', x->>'area')) from jsonb_array_elements(d.items) x),
  'taken', (select count(*) from lms_n_diag_result r where r.test_id = d.test_id)) order by d.created_at, d.test_id) from lms_n_diag d), '[]')); end $$;
create or replace function lms_n_diag_take(actor jsonb, a jsonb) returns jsonb language plpgsql as $$
declare d lms_n_diag; mno text := lms_k_no(a); ans jsonb := a->'answers'; sc int; ba jsonb; lv text; begin
  select * into d from lms_n_diag where test_id = lms_k_uuid(a, 'test_id'); if not found then perform lms_k_err(404, 'no_test', '진단평가를 찾을 수 없습니다.'); end if;
  if jsonb_typeof(ans) <> 'array' or jsonb_array_length(ans) <> jsonb_array_length(d.items) then perform lms_k_err(400, 'bad_answers', '모든 문항에 답하세요.'); end if;
  select round(100.0 * count(*) filter (where (ans->>(n - 1)::int) = (x->>'answer')) / count(*))::int,
         (select jsonb_object_agg(area, pct) from (select x2->>'area' area, round(100.0 * count(*) filter (where (ans->>(n2 - 1)::int) = (x2->>'answer')) / count(*))::int pct from jsonb_array_elements(d.items) with ordinality y(x2, n2) group by 1) z)
    into sc, ba from jsonb_array_elements(d.items) with ordinality t(x, n);
  lv := case when sc >= 80 then 'adv' when sc >= 50 then 'inter' else 'basic' end;
  insert into lms_n_diag_result (tenant_id, test_id, member_no, score, by_area, level) values (lms_k_tid(), d.test_id, mno, sc, ba, lv)
  on conflict (tenant_id, test_id, member_no) do update set score = excluded.score, by_area = excluded.by_area, level = excluded.level, at = now();
  return jsonb_build_object('test_id', d.test_id, 'member_no', mno, 'score', sc, 'by_area', ba, 'level', lv, 'basic_support', d.kind = 'basic' and sc < 50) || jsonb_build_object('path', (lms_n_recommend(actor, jsonb_build_object('member_no', mno)))->'path'); end $$;
-- 학습경로 추천: 최근 진단의 약한 영역(정답률 60% 미만)부터, 수준(기초 → 중급 → 심화) 순서
create or replace function lms_n_recommend(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare mno text := lms_k_no(a); r lms_n_diag_result; weak text[]; start text; begin
  select * into r from lms_n_diag_result where member_no = mno order by at desc limit 1;
  if not found then return jsonb_build_object('member_no', mno, 'level', null, 'weak', '[]'::jsonb, 'path', '[]'::jsonb, 'message', '진단평가를 먼저 응시하세요.'); end if;
  select coalesce(array_agg(key order by value::int, key), '{}') into weak from jsonb_each_text(r.by_area) where value::int < 60;
  start := r.level;
  return jsonb_build_object('member_no', mno, 'level', r.level, 'score', r.score, 'weak', to_jsonb(weak), 'message', '',
    'path', coalesce((select jsonb_agg(jsonb_build_object('step', rn, 'course_id', course_id, 'title', title, 'level', level, 'why', why) order by rn) from (
      select row_number() over (order by w, lvn, title) rn, * from (
        select c.course_id, c.title, c.level, case c.level when 'basic' then 1 when 'inter' then 2 else 3 end lvn,
          case when c.areas && weak then 0 else 1 end w,
          case when c.areas && weak then '약한 영역 보완: ' || array_to_string(array(select unnest(c.areas) intersect select unnest(weak)), ', ') else '수준 맞춤 다음 단계' end why
        from lms_n_course c where c.status = 'approved'
          and (c.areas && weak or case start when 'basic' then c.level in ('basic','inter') when 'inter' then c.level in ('inter','adv') else c.level = 'adv' end)
          and not exists (select 1 from lms_n_enroll e join lms_n_cohort h on h.cohort_id = e.cohort_id where h.course_id = c.course_id and e.member_no = mno and e.status = 'completed')) z) y where rn <= 6), '[]')); end $$;
