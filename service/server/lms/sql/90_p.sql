-- v30 학사 LMS 묶음 P — 공통 · 비기능: 언어 · 접근성 설정, 강의실 언어, 업로드 최근 파일, 에디터 임시저장, 포털 위젯, 앱 출석(코드 · 오프라인 동기화),
--   KOCW 메타데이터 XML, 관리자 2차 로그인(5회 실패 10분 잠금 · 동시 접속 차단 · 최종 접속), 개인정보 열람 사유 · 통계, 데이터 분류(ARIA 연결 지점), 부하 시험 결과, 무들 이관
-- 업무 로직은 lms_p(op, me, q). 응답에 _status가 있으면 커밋 후 그 상태 코드로 오류를 돌려준다(실패 횟수처럼 롤백되면 안 되는 기록용).

create table if not exists lms_p_pref (
  tenant_id text not null references tenants(id) on delete cascade, principal text not null,
  lang text not null default 'ko' check (lang in ('ko','en','ja','zh')), a11y jsonb not null default '{}', updated_at timestamptz not null default now(),
  primary key (tenant_id, principal)
);
create table if not exists lms_section_lang (
  tenant_id text not null, section_id uuid not null, lang text not null check (lang in ('ko','en','ja','zh')),
  primary key (tenant_id, section_id),
  foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade
);
create table if not exists lms_upload (
  tenant_id text not null references tenants(id) on delete cascade, upload_id uuid not null default gen_random_uuid(), owner text not null,
  name text not null, size bigint not null, mime text not null default '', sha256 text, entries jsonb not null default '[]',
  storage_key text, created_at timestamptz not null default now(), primary key (tenant_id, upload_id)
);
create index if not exists lms_upload_owner on lms_upload (tenant_id, owner, created_at desc);
create table if not exists lms_editor_draft (
  tenant_id text not null references tenants(id) on delete cascade, owner text not null, doc_key text not null,
  body text not null, updated_at timestamptz not null default now(), primary key (tenant_id, owner, doc_key)
);
create table if not exists lms_portal_widget (
  tenant_id text not null references tenants(id) on delete cascade, principal text not null, layout jsonb not null,
  updated_at timestamptz not null default now(), primary key (tenant_id, principal)
);
create table if not exists lms_admin_guard (
  tenant_id text not null references tenants(id) on delete cascade, uid text not null,
  fails int not null default 0, locked_until timestamptz, last_ok_at timestamptz, last_ok_ip text, prev_ok_at timestamptz, prev_ok_ip text,
  primary key (tenant_id, uid)
);
create table if not exists lms_admin_session (
  tenant_id text not null references tenants(id) on delete cascade, token_hash text not null, uid text not null,
  created_at timestamptz not null default now(), last_seen timestamptz not null default now(), expires_at timestamptz not null, ended_at timestamptz, ended_reason text,
  ip_masked text not null default '', primary key (tenant_id, token_hash)
);
create table if not exists lms_pii_view (
  tenant_id text not null references tenants(id) on delete cascade, id bigserial, at timestamptz not null default now(),
  actor text not null, target text not null, fields text[] not null, reason_code text not null check (reason_code in ('grade','counsel','attendance','scholarship','legal','support','other')),
  reason_text text not null default '', primary key (tenant_id, id)
);
create table if not exists lms_data_class (
  tenant_id text not null references tenants(id) on delete cascade, item text not null,
  location text not null, grade text not null check (grade in ('pii_unique','pii','sensitive','auth','internal','public')),
  method text not null check (method in ('aria_two_way','sha256_one_way','scrypt_one_way','hmac_index','mask','none')),
  module text not null default '', note text not null default '', primary key (tenant_id, item)
);
create table if not exists lms_perf_run (
  tenant_id text not null references tenants(id) on delete cascade, id bigserial, at timestamptz not null default now(),
  name text not null, params jsonb not null, result jsonb not null, primary key (tenant_id, id)
);
create table if not exists lms_mig_run (
  tenant_id text not null references tenants(id) on delete cascade, run_id bigserial, at timestamptz not null default now(),
  source text not null, file text not null default '', section_id uuid, report jsonb not null, primary key (tenant_id, run_id)
);
create table if not exists lms_mig_object (
  tenant_id text not null references tenants(id) on delete cascade, run_id bigint not null,
  kind text not null check (kind in ('post','assignment','resource','video')), src_id text not null, title text not null default '', payload jsonb not null default '{}',
  primary key (tenant_id, run_id, kind, src_id)
);

do $$ declare t text; begin
  foreach t in array array['lms_p_pref','lms_section_lang','lms_upload','lms_editor_draft','lms_portal_widget','lms_admin_guard','lms_admin_session','lms_pii_view','lms_data_class','lms_perf_run','lms_mig_run','lms_mig_object'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
  grant usage on sequence lms_pii_view_id_seq, lms_perf_run_id_seq, lms_mig_run_run_id_seq to didisam_tenant;
end $$;

create or replace function lms_p_class_seed() returns void language sql as $$
  insert into lms_data_class (tenant_id, item, location, grade, method, module, note)
  select current_setting('app.tenant', true), i, l, g, m, md, n from (values
    ('운영자 비밀번호', 'users.pw', 'auth', 'scrypt_one_way', '서버 scrypt(N=16384)', '복호화 불가 · 비교만'),
    ('세션 토큰', 'sessions.id', 'auth', 'sha256_one_way', 'SHA-256', '원문 미저장'),
    ('학습자 접근코드', 'learners.code_hash', 'auth', 'scrypt_one_way', '서버 scrypt', ''),
    ('학습자 이메일 · 휴대전화', 'pii.identity', 'pii', 'aria_two_way', '검증필 암호모듈(ARIA-256) 연결 지점 — 현재 AES-256-GCM', '수료증 · 환불 등 목적 열람 시 복호화'),
    ('보호자 연락처', 'pii.guardian', 'pii', 'aria_two_way', '검증필 암호모듈(ARIA-256) 연결 지점 — 현재 AES-256-GCM', '만 14세 미만 동의'),
    ('이메일 검색 색인', 'pii.identity.email_idx', 'pii', 'hmac_index', 'HMAC-SHA256', '원문 없이 중복 확인'),
    ('학번 · 사번', 'lms_person.member_no', 'internal', 'none', '', '가명 식별자 — 학사 원천'),
    ('학과 · 학적', 'lms_person.unit_code · status', 'internal', 'none', '', ''),
    ('접속 IP', 'lms_access_log.ip_masked', 'internal', 'mask', '끝자리 가림', '원 IP 미저장'),
    ('성적', 'lms_grade_score · lms_grade_final', 'sensitive', 'aria_two_way', '검증필 암호모듈(ARIA-256) 연결 지점', '컬럼 암호화 적용 대상(구축 시)'),
    ('출석 증빙 사진', 'lms_attendance.evidence', 'sensitive', 'aria_two_way', '저장소 키만 · 원본은 암호화 저장소', ''),
    ('공지 · 강의자료', 'tenant_state.doc', 'public', 'none', '', '')
  ) v(i, l, g, m, md, n) on conflict do nothing $$;

drop function if exists lms_p_kocw(text, text);
create or replace function lms_p_kocw(tid text, term text, org text) returns text language sql as $$
  select '<?xml version="1.0" encoding="UTF-8"?>' || chr(10) || xmlserialize(content xmlelement(name "kocw", xmlattributes('1.0' as "version", 'DiDiSam LMS' as "generator"),
    xmlelement(name "provider", xmlforest(org as "institution", tid as "institutionId")),
    (select xmlagg(xmlelement(name "course", xmlattributes(s.course_code || '-' || s.section_no as "id"),
        xmlforest(s.title as "title", s.course_code as "courseCode", s.section_no as "section", s.term_id as "term", c.credits as "credits", coalesce(c.category, 'major') as "category",
                  coalesce(c.unit_code, '') as "department", coalesce(sl.lang, 'ko') as "language", s.mode as "deliveryMode", 'CC BY-NC-ND 2.0 KR' as "license",
                  '연동 후 입력(교수명은 학사 조회)' as "professor", coalesce(s.syllabus->>'summary', '') as "description"),
        xmlelement(name "lectures", (select xmlagg(xmlelement(name "lecture", xmlattributes(ss.week_no as "week", ss.seq as "seq", ss.kind as "type", ss.required_sec as "durationSec"), s.title || ' ' || ss.week_no || '주 ' || ss.seq || '차시') order by ss.week_no, ss.seq)
                                     from lms_session ss where ss.tenant_id = tid and ss.section_id = s.section_id)))
        order by s.course_code, s.section_no)
       from lms_section s join lms_course c on c.tenant_id = s.tenant_id and c.course_code = s.course_code
       left join lms_section_lang sl on sl.tenant_id = s.tenant_id and sl.section_id = s.section_id
      where s.tenant_id = tid and (term = '' or s.term_id = term) and not s.hidden)
  ) as text) $$;

-- ── 파일 저장소 단일화(묶음 E lms_file을 원본으로) ──
-- 묶음 B의 lms_b_file(file-put · D 첨부)은 lms_file 위의 뷰 + INSTEAD OF INSERT로 바꾼다 → B · D API · 대조 테스트는 그대로, 바이트는 한 곳에만 저장
alter table lms_file add column if not exists section_id uuid;
alter table lms_file add column if not exists source text not null default 'e';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'lms_file_section_fk') then
    alter table lms_file add constraint lms_file_section_fk foreign key (tenant_id, section_id) references lms_section (tenant_id, section_id) on delete cascade;
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = current_schema() and c.relname = 'lms_b_file' and c.relkind = 'r') then
    alter table lms_b_file no force row level security; alter table lms_file no force row level security;   -- 소유자 이관(기관 전체) 동안만
    insert into lms_file (tenant_id, file_id, owner_kind, owner_ref, name, mime, size, sha256, data, created_at, section_id, source)
      select tenant_id, file_id, 'staff', 'section:' || section_id, name, mime, size, encode(sha256(data), 'hex'), data, created_at, section_id, 'b' from lms_b_file on conflict do nothing;
    alter table lms_file force row level security;
    drop table lms_b_file;
  end if;
end $$;
create or replace view lms_b_file with (security_invoker = true) as
  select tenant_id, file_id, section_id, name, mime, size, data, created_at from lms_file where section_id is not null;
create or replace function lms_b_file_ins() returns trigger language plpgsql as $$
begin
  insert into lms_file (tenant_id, file_id, owner_kind, owner_ref, name, mime, size, sha256, data, created_at, section_id, source)
  values (new.tenant_id, coalesce(new.file_id, gen_random_uuid()), 'staff', 'section:' || new.section_id, new.name, new.mime, new.size, encode(sha256(new.data), 'hex'), new.data, coalesce(new.created_at, now()), new.section_id, 'b')
  returning file_id, created_at into new.file_id, new.created_at;
  return new;
end $$;
drop trigger if exists lms_b_file_ins on lms_b_file;
create trigger lms_b_file_ins instead of insert on lms_b_file for each row execute function lms_b_file_ins();
grant select, insert on lms_b_file to didisam_tenant;

-- 업로드 유형 정책(P 업로더 · L DM 첨부 공통): 실행 파일 차단, 허용 형식만
create or replace function lmsx_file_ok(nm text, mm text) returns text language sql immutable as $$
  select case when nm ~* '\.(exe|bat|cmd|com|scr|js|vbs|ps1|sh|msi|jar|dll|apk|app)$' then '실행 파일은 올릴 수 없습니다.'
              when coalesce(mm, '') !~* '^(image/|audio/|video/|text/|application/(pdf|zip|x-zip-compressed|gzip|x-gzip|x-tar|json|xml|octet-stream|msword|vnd\.|haansoft|x-hwp|hwp))' then '허용하지 않는 파일 형식입니다(' || coalesce(mm, '') || ').'
              else null end $$;
-- 내 파일(lms_file)인지: 운영자 uid 또는 학습자 person_id
create or replace function lmsx_my_file(me jsonb, fid uuid) returns lms_file language sql stable as $$
  select f.* from lms_file f where f.tenant_id = current_setting('app.tenant', true) and f.file_id = fid and f.section_id is null and (
    (coalesce(me->>'learner', '') = '' and f.owner_kind = 'staff' and f.owner_ref = me->>'uid') or
    (coalesce(me->>'learner', '') <> '' and f.owner_kind = 'learner' and f.owner_ref = (select person_id::text from lms_person p where p.tenant_id = f.tenant_id and p.member_no = me->>'learner'))) $$;
alter table lms_upload add column if not exists chunks jsonb not null default '[]';

-- ── 무들 이관 매핑: 과제 → 묶음 E lms_assignment, 게시물 → 묶음 D 게시판(lms_d_post · answer · comment) ──
create or replace function lms_p_mig_asg(sec uuid, x jsonb, prev text) returns uuid language plpgsql as $$
declare id uuid;
begin
  if prev is not null and exists (select 1 from lms_assignment where tenant_id = current_setting('app.tenant', true) and asg_id = prev::uuid) then return prev::uuid; end if;
  insert into lms_assignment (tenant_id, section_id, title, body, due_at, max_score, status)
  values (current_setting('app.tenant', true), sec, left(coalesce(nullif(x->>'name', ''), '이관 과제'), 200), left(coalesce(x->>'intro', ''), 20000),
          case when coalesce(x->>'duedate', '') ~ '^[1-9]\d{8,10}$' then to_timestamp((x->>'duedate')::bigint) end,
          case when coalesce(x->>'grade', '') ~ '^\d{1,5}(\.\d+)?$' and (x->>'grade')::numeric > 0 then least((x->>'grade')::numeric, 99999) else 100 end, 'published')
  returning asg_id into id;
  return id;
end $$;
-- 게시판 종류: 이름으로 추정(공지 · Q&A · 그 밖은 자료실)
create or replace function lms_p_mig_board_kind(nm text) returns text language sql immutable as $$
  select case when nm ~* '(공지|news|announce)' then 'notice' when nm ~* '(질의|질문|q\s*&\s*a|qna|문의)' then 'qna' else 'archive' end $$;
-- 게시물 하나: 최상위 글 → lms_d_post, 답글 → Q&A면 lms_d_answer, 아니면 lms_d_comment(뿌리 글에 붙임). 반환 {ref, root}
create or replace function lms_p_mig_post(sec uuid, kind text, p jsonb, author text, root uuid) returns jsonb language plpgsql as $$
declare tid text := current_setting('app.tenant', true); pid uuid; id uuid; lbl text := coalesce(author, '이관 사용자'); at timestamptz;
begin
  if author is not null then select person_id into pid from lms_person where tenant_id = tid and member_no = author; end if;
  at := case when coalesce(p->>'created', '') ~ '^[1-9]\d{8,10}$' then to_timestamp((p->>'created')::bigint) else now() end;
  if root is null then
    insert into lms_d_post (tenant_id, board_id, section_id, kind, category, title, body, author_pid, author_label, created_at, updated_at)
    values (tid, lmsd_board(sec, kind), sec, kind, '', left(coalesce(nullif(p->>'subject', ''), '(제목 없음)'), 200), left(coalesce(p->>'message', ''), 20000), pid, lbl, at, at) returning post_id into id;
    return jsonb_build_object('table', 'lms_d_post', 'ref', id, 'root', id);
  elsif kind = 'qna' then
    insert into lms_d_answer (tenant_id, post_id, author_pid, author_label, body, created_at) values (tid, root, pid, lbl, left(coalesce(p->>'message', ''), 20000), at) returning answer_id into id;
    update lms_d_post set status = 'answered' where tenant_id = tid and post_id = root and status = 'open';
    return jsonb_build_object('table', 'lms_d_answer', 'ref', id, 'root', root);
  else
    insert into lms_d_comment (tenant_id, post_id, author_pid, author_label, body, created_at) values (tid, root, pid, lbl, left(coalesce(p->>'message', ''), 20000), at) returning comment_id into id;
    return jsonb_build_object('table', 'lms_d_comment', 'ref', id, 'root', root);
  end if;
end $$;

create or replace function lms_p(op text, me jsonb, q jsonb) returns jsonb language plpgsql as $$
declare
  tid text := current_setting('app.tenant', true);
  my text := case when coalesce(me->>'learner', '') <> '' then 'p:' || (me->>'learner') else 'u:' || coalesce(me->>'uid', '') end;
  adm boolean := coalesce(me->>'role', '') in ('owner', 'sub');
  tea boolean := coalesce(me->>'role', '') in ('owner', 'sub', 'teacher');
  v_id uuid; v_txt text; k text; r record; s2 record; arr jsonb; out jsonb; n int; n2 int; g lms_admin_guard; f timestamptz; t timestamptz; mem text[]; run bigint;
  sec uuid; term text; pid uuid; umap jsonb := '{}'; rep jsonb; mp jsonb; iss jsonb := '[]';
begin
  -- 앱 출석은 묶음 G(/api/lms/g/checkin · code · qr)가 원본이다. P의 /att/checkin은 학습자 세션으로 G 검증을 그대로 부르는 얇은 경로(mod-p.js · Java LmsGLearnerCheckin)
  if coalesce(me->>'learner', '') <> '' then perform lmsx_err(403, 'role', '권한이 없습니다.'); end if;

  if op = 'pref.get' then
    select jsonb_build_object('lang', lang, 'a11y', a11y) into out from lms_p_pref where tenant_id = tid and principal = my;
    return coalesce(out, jsonb_build_object('lang', 'ko', 'a11y', '{}'::jsonb));
  elsif op = 'pref.save' then
    k := coalesce(nullif(lmsx_txt(q, 'lang', 5), ''), 'ko');
    if k not in ('ko','en','ja','zh') then perform lmsx_err(400, 'bad_input', '언어는 한국어 · 영어 · 일본어 · 중국어 중에서 고릅니다.'); end if;
    out := coalesce(q->'a11y', '{}'); if jsonb_typeof(out) <> 'object' then perform lmsx_err(400, 'bad_input', '접근성 설정 형식이 올바르지 않습니다.'); end if;
    out := jsonb_build_object('hc', coalesce((out->>'hc')::boolean, false), 'lg', coalesce((out->>'lg')::boolean, false), 'rm', coalesce((out->>'rm')::boolean, false));
    insert into lms_p_pref (tenant_id, principal, lang, a11y) values (tid, my, k, out) on conflict (tenant_id, principal) do update set lang = excluded.lang, a11y = excluded.a11y, updated_at = now();
    return jsonb_build_object('ok', true, 'lang', k, 'a11y', out);
  elsif op = 'cls.langs' then
    select coalesce(jsonb_agg(jsonb_build_object('section_id', s.section_id, 'title', s.title, 'lang', coalesce(l.lang, 'ko')) order by s.term_id desc, s.title), '[]') into arr
      from lms_section s left join lms_section_lang l on l.tenant_id = s.tenant_id and l.section_id = s.section_id where s.tenant_id = tid;
    return jsonb_build_object('items', arr);
  elsif op = 'cls.lang' then
    if not tea then perform lmsx_err(403, 'role', '교수자 · 운영자만 강의실 언어를 정합니다.'); end if;
    v_id := lmsx_uuid(q, 'section_id'); k := lmsx_txt(q, 'lang', 5, true);
    if k not in ('ko','en','ja','zh') then perform lmsx_err(400, 'bad_input', '언어는 한국어 · 영어 · 일본어 · 중국어 중에서 고릅니다.'); end if;
    if not exists (select 1 from lms_section where tenant_id = tid and section_id = v_id) then perform lmsx_err(404, 'not_found', '없는 분반입니다.'); end if;
    insert into lms_section_lang (tenant_id, section_id, lang) values (tid, v_id, k) on conflict (tenant_id, section_id) do update set lang = excluded.lang;
    return jsonb_build_object('ok', true, 'section_id', v_id, 'lang', k);

  -- ── 업로드 · 에디터 ──
  elsif op = 'upload.add' then
    -- 바이트는 묶음 E 파일 저장소(lms_file, POST /api/lms/e/file · 조각당 2MB)에 먼저 올리고, 여기서는 조각 목록을 한 파일로 묶는다(최대 50조각 = 100MB)
    v_txt := lmsx_txt(q, 'name', 200, true); k := coalesce(nullif(lmsx_txt(q, 'mime', 100), ''), 'application/octet-stream');
    if lmsx_file_ok(v_txt, k) is not null then perform lmsx_err(400, 'file_type', lmsx_file_ok(v_txt, k)); end if;
    if jsonb_typeof(q->'file_ids') is distinct from 'array' or jsonb_array_length(q->'file_ids') = 0 then perform lmsx_err(400, 'bad_input', '파일 조각(file_ids)을 먼저 올리세요.'); end if;
    if jsonb_array_length(q->'file_ids') > 50 then perform lmsx_err(413, 'too_large', '파일은 100MB(조각 50개)까지 올릴 수 있습니다.'); end if;
    if coalesce(q->>'sha256', '') <> '' and q->>'sha256' !~ '^[0-9a-f]{64}$' then perform lmsx_err(400, 'bad_input', 'sha256 값이 올바르지 않습니다.'); end if;
    out := '[]'; n := 0; n2 := 0;
    for r in select v, o from jsonb_array_elements_text(q->'file_ids') with ordinality z(v, o) loop
      if r.v !~* '^[0-9a-f-]{36}$' then perform lmsx_err(400, 'bad_input', '파일 조각 id가 올바르지 않습니다.'); end if;
      if (lmsx_my_file(me, r.v::uuid)).file_id is null then perform lmsx_err(400, 'file', '올린 파일 조각을 찾을 수 없습니다(본인이 올린 조각만 묶을 수 있습니다).'); end if;
      out := out || to_jsonb(r.v); n := n + (select size from lms_file where tenant_id = tid and file_id = r.v::uuid);
    end loop;
    if coalesce(q->>'size', '') <> '' and (q->>'size') ~ '^\d{1,13}$' and (q->>'size')::bigint <> n then perform lmsx_err(400, 'size_mismatch', '올린 조각 크기 합계(' || n || ')가 파일 크기와 다릅니다.'); end if;
    if jsonb_array_length(out) = 1 and coalesce(q->>'sha256', '') <> '' and (select sha256 from lms_file where tenant_id = tid and file_id = (out->>0)::uuid) <> q->>'sha256' then perform lmsx_err(400, 'sha_mismatch', '파일 무결성(SHA-256)이 맞지 않습니다.'); end if;
    arr := coalesce(q->'entries', '[]'); if jsonb_typeof(arr) <> 'array' then perform lmsx_err(400, 'bad_input', 'entries 형식이 올바르지 않습니다.'); end if;
    select coalesce(jsonb_agg(jsonb_build_object('name', left(coalesce(e->>'name', ''), 300), 'size', coalesce(nullif(e->>'size', '')::bigint, 0))), '[]') into arr from (select e from jsonb_array_elements(arr) e limit 2000) z;
    insert into lms_upload (tenant_id, owner, name, size, mime, sha256, entries, storage_key, chunks) values (tid, my, v_txt, n, k, nullif(q->>'sha256', ''), arr, 'lms_file:' || (out->>0), out) returning upload_id into v_id;
    return jsonb_build_object('ok', true, 'id', v_id, 'size', n, 'chunks', jsonb_array_length(out), 'entries', jsonb_array_length(arr), 'storage', 'lms_file');
  elsif op = 'upload.recent' then
    select coalesce(jsonb_agg(jsonb_build_object('id', upload_id, 'name', name, 'size', size, 'mime', mime, 'sha256', sha256, 'entries', jsonb_array_length(entries), 'chunks', jsonb_array_length(chunks), 'at', lmsx_ts(created_at)) order by created_at desc, name), '[]') into arr
      from (select * from lms_upload where tenant_id = tid and owner = my order by created_at desc limit 20) u;
    return jsonb_build_object('items', arr);
  elsif op = 'upload.get' then
    -- 내려받기: 조각 id 목록(조각 내용은 GET /api/lms/e/file?id= 로 받아 이어 붙인다)
    select * into r from lms_upload where tenant_id = tid and upload_id = lmsx_uuid(q, 'id') and (owner = my or adm);
    if not found then perform lmsx_err(404, 'not_found', '없는 파일입니다.'); end if;
    return jsonb_build_object('id', r.upload_id, 'name', r.name, 'size', r.size, 'mime', r.mime, 'sha256', r.sha256, 'chunks', r.chunks);
  elsif op = 'draft.save' then
    k := lmsx_txt(q, 'doc_key', 80, true); v_txt := coalesce(q->>'body', '');
    if length(v_txt) > 200000 then perform lmsx_err(413, 'too_large', '임시저장은 20만 자까지입니다.'); end if;
    insert into lms_editor_draft (tenant_id, owner, doc_key, body) values (tid, my, k, v_txt) on conflict (tenant_id, owner, doc_key) do update set body = excluded.body, updated_at = now();
    return jsonb_build_object('ok', true, 'doc_key', k, 'chars', length(v_txt));
  elsif op = 'draft.get' then
    select jsonb_build_object('doc_key', doc_key, 'body', body, 'at', lmsx_ts(updated_at)) into out from lms_editor_draft where tenant_id = tid and owner = my and doc_key = lmsx_txt(q, 'doc_key', 80, true);
    return jsonb_build_object('draft', out);

  -- ── 포털 대시보드 ──
  elsif op = 'widget.save' then
    arr := q->'layout';
    if jsonb_typeof(arr) is distinct from 'array' or jsonb_array_length(arr) > 12 then perform lmsx_err(400, 'bad_input', '위젯은 12개까지입니다.'); end if;
    if exists (select 1 from jsonb_array_elements_text(arr) w where w not in ('courses','due','dm','inbox','attendance','advisees','links','today')) then perform lmsx_err(400, 'bad_input', '없는 위젯입니다.'); end if;
    insert into lms_portal_widget (tenant_id, principal, layout) values (tid, my, arr) on conflict (tenant_id, principal) do update set layout = excluded.layout, updated_at = now();
    return jsonb_build_object('ok', true, 'layout', arr);
  elsif op = 'portal' then
    select layout into arr from lms_portal_widget where tenant_id = tid and principal = my;
    return jsonb_build_object('layout', coalesce(arr, '["today","courses","due","dm","attendance","advisees","links"]'),
      'courses', (select coalesce(jsonb_agg(jsonb_build_object('section_id', s.section_id, 'title', s.title, 'term_id', s.term_id, 'students', (select count(*) from lms_enrollment e where e.tenant_id = tid and e.section_id = s.section_id and e.status = 'enrolled')) order by s.title), '[]')
                  from (select * from lms_section where tenant_id = tid and status = 'open' order by title limit 8) s),
      'today', (select coalesce(jsonb_agg(jsonb_build_object('session_id', ss.session_id, 'title', sc.title || ' ' || ss.week_no || '주 ' || ss.seq || '차시', 'at', lmsx_ts(ss.starts_at)) order by ss.starts_at), '[]')
                  from lms_session ss join lms_section sc on sc.tenant_id = ss.tenant_id and sc.section_id = ss.section_id
                 where ss.tenant_id = tid and (ss.starts_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date),
      'due', (select coalesce(jsonb_agg(jsonb_build_object('title', e.title, 'at', lmsx_ts(e.starts_at), 'kind', e.kind) order by e.starts_at, e.title), '[]')
                  from lms_cal_event e where e.tenant_id = tid and e.kind in ('deadline','exam','todo') and not e.done and e.starts_at >= now() and e.starts_at < now() + interval '14 days' and (e.scope <> 'personal' or e.owner = my)),
      'dm_unread', (select count(*) from lms_dm_message gm join lms_dm_member m on m.tenant_id = gm.tenant_id and m.room_id = gm.room_id and m.principal = my where gm.tenant_id = tid and gm.id > m.last_read_id and gm.sender <> my)::int,
      'inbox', (select coalesce(jsonb_agg(jsonb_build_object('title', title, 'at', lmsx_ts(created_at)) order by id desc), '[]') from (select * from lms_noti_outbox where tenant_id = tid and principal = my and channel = 'inapp' order by id desc limit 5) o),
      'attendance', (select jsonb_build_object('total', count(*), 'ok', count(*) filter (where status in ('present','late','excused')), 'absent', count(*) filter (where status = 'absent')) from lms_attendance where tenant_id = tid),
      'advisees', (select coalesce(jsonb_agg(jsonb_build_object('member_no', x.member_no, 'unit_code', x.unit_code, 'absent', x.ab) order by x.ab desc, x.member_no), '[]') from (
                    select p.member_no, p.unit_code, (select count(*) from lms_attendance a where a.tenant_id = tid and a.person_id = p.person_id and a.status = 'absent')::int ab
                      from lms_person p where p.tenant_id = tid and p.kind = 'student' and p.status = 'active' order by 3 desc, p.member_no limit 6) x));

  -- ── KOCW 메타데이터 ──
  elsif op = 'kocw' then
    if not adm then perform lmsx_err(403, 'role', '관리자만 내보낼 수 있습니다.'); end if;
    v_txt := lms_p_kocw(tid, lmsx_txt(q, 'term_id', 20), coalesce(q->>'org_name', ''));
    perform lmsx_audit(me, 'lms.kocw.export', jsonb_build_object('term_id', lmsx_txt(q, 'term_id', 20)));
    return jsonb_build_object('xml', v_txt, 'courses', (select count(*) from lms_section s where s.tenant_id = tid and (lmsx_txt(q, 'term_id', 20) = '' or s.term_id = lmsx_txt(q, 'term_id', 20)) and not s.hidden)::int);

  -- ── 관리자 2차 로그인 ──
  elsif op = 'admin.login' then
    if not adm then perform lmsx_err(403, 'role', '관리자 계정만 관리자 모드로 들어갈 수 있습니다.'); end if;
    insert into lms_admin_guard (tenant_id, uid) values (tid, me->>'uid') on conflict do nothing;
    select * into g from lms_admin_guard where tenant_id = tid and uid = me->>'uid' for update;
    if g.locked_until is not null and g.locked_until > now() then
      return jsonb_build_object('_status', 423, 'error', 'locked', 'message', '비밀번호를 5회 틀려 ' || to_char(g.locked_until at time zone 'Asia/Seoul', 'HH24:MI') || '까지 잠겼습니다.');
    end if;
    if not coalesce((q->>'pw_ok')::boolean, false) then
      update lms_admin_guard set fails = case when locked_until is not null and locked_until <= now() then 1 else fails + 1 end, locked_until = case when (case when locked_until is not null and locked_until <= now() then 1 else fails + 1 end) >= 5 then now() + interval '10 minutes' else null end
       where tenant_id = tid and uid = me->>'uid' returning * into g;
      perform lmsx_audit(me, 'lms.admin.login_fail', jsonb_build_object('fails', g.fails));
      if g.locked_until is not null then return jsonb_build_object('_status', 423, 'error', 'locked', 'message', '비밀번호를 5회 틀려 10분 동안 잠겼습니다.'); end if;
      return jsonb_build_object('_status', 401, 'error', 'login', 'message', '비밀번호가 올바르지 않습니다(' || g.fails || '/5).');
    end if;
    if exists (select 1 from lms_admin_session where tenant_id = tid and uid = me->>'uid' and ended_at is null and expires_at > now() and last_seen > now() - interval '30 minutes') and not coalesce((q->>'force')::boolean, false) then
      return jsonb_build_object('_status', 409, 'error', 'concurrent', 'message', '다른 곳에서 관리자 모드를 쓰고 있습니다. 이어서 들어가면 그쪽 접속이 끊깁니다.');
    end if;
    if coalesce(q->>'token_hash', '') !~ '^[0-9a-f]{64}$' then perform lmsx_err(400, 'bad_input', '토큰이 올바르지 않습니다.'); end if;
    update lms_admin_session set ended_at = now(), ended_reason = 'replaced' where tenant_id = tid and uid = me->>'uid' and ended_at is null;
    get diagnostics n = row_count;
    insert into lms_admin_session (tenant_id, token_hash, uid, expires_at, ip_masked) values (tid, q->>'token_hash', me->>'uid', now() + interval '2 hours', lmsx_ip(me->>'ip'));
    update lms_admin_guard set fails = 0, locked_until = null, prev_ok_at = last_ok_at, prev_ok_ip = last_ok_ip, last_ok_at = now(), last_ok_ip = lmsx_ip(me->>'ip') where tenant_id = tid and uid = me->>'uid' returning * into g;
    perform lmsx_audit(me, 'lms.admin.login', jsonb_build_object('replaced', n));
    return jsonb_build_object('ok', true, 'replaced', n, 'expires_at', lmsx_ts(now() + interval '2 hours'), 'last_login', case when g.prev_ok_at is null then null else jsonb_build_object('at', lmsx_ts(g.prev_ok_at), 'ip', g.prev_ok_ip) end);
  elsif op = 'admin.status' then
    select * into g from lms_admin_guard where tenant_id = tid and uid = me->>'uid';
    update lms_admin_session set last_seen = now() where tenant_id = tid and token_hash = coalesce(q->>'token_hash', '') and uid = me->>'uid' and ended_at is null and expires_at > now() returning * into r;
    get diagnostics n = row_count;
    return jsonb_build_object('active', n > 0, 'expires_at', case when n > 0 then lmsx_ts(r.expires_at) end,
      'ended_reason', (select ended_reason from lms_admin_session where tenant_id = tid and token_hash = coalesce(q->>'token_hash', '')),
      'fails', coalesce(g.fails, 0), 'locked', coalesce(g.locked_until > now(), false),
      'last_login', case when g.last_ok_at is null then null else jsonb_build_object('at', lmsx_ts(g.last_ok_at), 'ip', g.last_ok_ip) end,
      'prev_login', case when g.prev_ok_at is null then null else jsonb_build_object('at', lmsx_ts(g.prev_ok_at), 'ip', g.prev_ok_ip) end);
  elsif op = 'admin.logout' then
    update lms_admin_session set ended_at = now(), ended_reason = 'logout' where tenant_id = tid and token_hash = coalesce(q->>'token_hash', '') and uid = me->>'uid' and ended_at is null;
    get diagnostics n = row_count;
    return jsonb_build_object('ok', n > 0);

  -- ── 개인정보 열람 사유 · 통계 ──
  elsif op = 'pii.view' then
    if not tea then perform lmsx_err(403, 'role', '권한이 없습니다.'); end if;
    k := lmsx_txt(q, 'reason_code', 20, true);
    if k not in ('grade','counsel','attendance','scholarship','legal','support','other') then perform lmsx_err(400, 'bad_input', '열람 사유를 고르세요.'); end if;
    v_txt := lmsx_txt(q, 'reason_text', 300);
    if k = 'other' and length(v_txt) < 5 then perform lmsx_err(400, 'bad_input', '기타 사유는 5자 이상 적어 주세요.'); end if;
    if jsonb_typeof(q->'fields') is distinct from 'array' then perform lmsx_err(400, 'bad_input', '열람 항목(fields)을 고르세요.'); end if;
    select coalesce(array_agg(distinct x order by x), '{}') into mem from jsonb_array_elements_text(q->'fields') x;
    if cardinality(mem) = 0 or not mem <@ array['name','phone','email','address','birth','grade','counsel'] then perform lmsx_err(400, 'bad_input', '열람 항목이 올바르지 않습니다.'); end if;
    v_txt := lmsx_txt(q, 'target', 20, true);
    if not exists (select 1 from lms_person where tenant_id = tid and member_no = v_txt) then perform lmsx_err(404, 'not_found', '없는 구성원입니다.'); end if;
    insert into lms_pii_view (tenant_id, actor, target, fields, reason_code, reason_text) values (tid, coalesce(me->>'email', my), v_txt, mem, k, lmsx_txt(q, 'reason_text', 300));
    return jsonb_build_object('ok', true, 'fields', to_jsonb(mem), 'source', '학사 · SSO 조회(연동 후 표시) — 디디쌤은 이름 · 연락처를 저장하지 않습니다');
  elsif op = 'pii.stats' then
    if not adm then perform lmsx_err(403, 'role', '관리자만 볼 수 있습니다.'); end if;
    f := coalesce(lmsx_tsq(q, 'from'), now() - interval '30 days'); t := coalesce(lmsx_tsq(q, 'to'), now() + interval '1 second');
    return jsonb_build_object('total', (select count(*) from lms_pii_view where tenant_id = tid and at >= f and at < t)::int,
      'by_reason', (select coalesce(jsonb_object_agg(reason_code, c), '{}') from (select reason_code, count(*)::int c from lms_pii_view where tenant_id = tid and at >= f and at < t group by 1) s),
      'by_actor', (select coalesce(jsonb_agg(jsonb_build_object('actor', actor, 'n', c) order by c desc, actor), '[]') from (select actor, count(*)::int c from lms_pii_view where tenant_id = tid and at >= f and at < t group by 1) s),
      'by_field', (select coalesce(jsonb_object_agg(fl, c), '{}') from (select unnest(fields) fl, count(*)::int c from lms_pii_view where tenant_id = tid and at >= f and at < t group by 1) s),
      'by_day', (select coalesce(jsonb_object_agg(d, c), '{}') from (select to_char(at at time zone 'Asia/Seoul', 'YYYY-MM-DD') d, count(*)::int c from lms_pii_view where tenant_id = tid and at >= f and at < t group by 1) s),
      'recent', (select coalesce(jsonb_agg(jsonb_build_object('at', lmsx_ts(at), 'actor', actor, 'target', target, 'fields', to_jsonb(fields), 'reason', reason_code, 'text', reason_text) order by id desc), '[]') from (select * from lms_pii_view where tenant_id = tid and at >= f and at < t order by id desc limit 50) z));

  -- ── 데이터 분류 · 암호화 연결 지점 ──
  elsif op = 'crypto.status' then
    if not adm then perform lmsx_err(403, 'role', '관리자만 볼 수 있습니다.'); end if;
    perform lms_p_class_seed();
    select coalesce(jsonb_agg(jsonb_build_object('item', item, 'location', location, 'grade', grade, 'method', method, 'module', module, 'note', note) order by case grade when 'auth' then 1 when 'pii_unique' then 2 when 'pii' then 3 when 'sensitive' then 4 when 'internal' then 5 else 6 end, item), '[]') into arr from lms_data_class where tenant_id = tid;
    return jsonb_build_object('adapter', coalesce(q->'adapter', 'null'), 'classes', arr,
      'summary', (select jsonb_object_agg(method, c) from (select method, count(*)::int c from lms_data_class where tenant_id = tid group by 1) s));
  elsif op = 'crypto.class_save' then
    if not adm then perform lmsx_err(403, 'role', '관리자만 바꿀 수 있습니다.'); end if;
    perform lms_p_class_seed();
    k := lmsx_txt(q, 'method', 20, true);
    if k not in ('aria_two_way','sha256_one_way','scrypt_one_way','hmac_index','mask','none') then perform lmsx_err(400, 'bad_input', '암호화 방식이 올바르지 않습니다.'); end if;
    if coalesce(q->>'grade', '') not in ('pii_unique','pii','sensitive','auth','internal','public') then perform lmsx_err(400, 'bad_input', '데이터 등급이 올바르지 않습니다.'); end if;
    insert into lms_data_class (tenant_id, item, location, grade, method, module, note) values (tid, lmsx_txt(q, 'item', 60, true), lmsx_txt(q, 'location', 120, true), q->>'grade', k, lmsx_txt(q, 'module', 120), lmsx_txt(q, 'note', 200))
    on conflict (tenant_id, item) do update set location = excluded.location, grade = excluded.grade, method = excluded.method, module = excluded.module, note = excluded.note;
    perform lmsx_audit(me, 'lms.crypto.class', jsonb_build_object('item', q->>'item', 'method', k));
    return jsonb_build_object('ok', true);

  -- ── 부하 시험 결과 ──
  elsif op = 'perf.save' then
    if not adm then perform lmsx_err(403, 'role', '관리자만 저장할 수 있습니다.'); end if;
    if jsonb_typeof(q->'result') is distinct from 'object' or jsonb_typeof(coalesce(q->'params', '{}')) <> 'object' then perform lmsx_err(400, 'bad_input', 'result · params 형식이 올바르지 않습니다.'); end if;
    insert into lms_perf_run (tenant_id, name, params, result) values (tid, lmsx_txt(q, 'name', 80, true), coalesce(q->'params', '{}'), q->'result') returning id into run;
    return jsonb_build_object('ok', true, 'id', run);
  elsif op = 'perf.list' then
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'at', lmsx_ts(at), 'name', name, 'params', params, 'result', result) order by id desc), '[]') into arr from (select * from lms_perf_run where tenant_id = tid order by id desc limit 20) z;
    return jsonb_build_object('items', arr);

  -- ── 무들 이관 ──
  elsif op = 'mig.import' then
    if not adm then perform lmsx_err(403, 'role', '관리자만 이관할 수 있습니다.'); end if;
    out := q->'course';
    if jsonb_typeof(out) is distinct from 'object' then perform lmsx_err(400, 'bad_input', '강좌(course) 정보가 없습니다.'); end if;
    v_txt := upper(regexp_replace(coalesce(nullif(out->>'idnumber', ''), out->>'shortname', ''), '[^A-Za-z0-9]', '', 'g'));
    if v_txt = '' then perform lmsx_err(400, 'bad_input', '강좌 식별자(idnumber · shortname)가 없습니다.'); end if;
    v_txt := left(v_txt, 20);
    term := coalesce(nullif(lmsx_txt(q, 'term_id', 20), ''), 'MIG-' || to_char(coalesce(to_timestamp(nullif(out->>'startdate', '')::bigint), now()) at time zone 'Asia/Seoul', 'YYYY'));
    insert into lms_term (tenant_id, term_id, name, starts_on, ends_on) values (tid, term, term || ' (이관)', make_date(left(right(term, 4), 4)::int, 1, 1), make_date(left(right(term, 4), 4)::int, 12, 31)) on conflict do nothing;
    insert into lms_course (tenant_id, course_code, name, category) values (tid, v_txt, left(coalesce(nullif(out->>'fullname', ''), v_txt), 120), 'major') on conflict (tenant_id, course_code) do update set name = excluded.name;
    insert into lms_section (tenant_id, term_id, course_code, section_no, title, mode, source, syllabus) values (tid, term, v_txt, '01', left(coalesce(nullif(out->>'fullname', ''), v_txt), 120), 'online', 'manual', jsonb_build_object('summary', left(coalesce(out->>'summary', ''), 2000), 'moodle_id', out->>'id'))
    on conflict (tenant_id, term_id, course_code, section_no) do update set title = excluded.title returning section_id into sec;
    insert into lms_mig_run (tenant_id, source, file, section_id, report) values (tid, 'moodle', lmsx_txt(q, 'file', 200), sec, '{}') returning run_id into run;
    -- 사용자: 학번(idnumber)만. 이름 · 이메일은 받지 않고 버린다
    n := 0; n2 := 0;
    for r in select x from jsonb_array_elements(coalesce(q->'users', '[]')) x loop
      k := coalesce(nullif(r.x->>'idnumber', ''), case when r.x->>'username' ~ '^\d{6,10}$' then r.x->>'username' end);
      if k is null or k !~ '^[A-Za-z0-9_-]{4,20}$' then n2 := n2 + 1; iss := iss || jsonb_build_array(jsonb_build_object('kind', 'user', 'src', r.x->>'id', 'issue', '학번(idnumber) 없음 — 이관 제외')); continue; end if;
      insert into lms_person (tenant_id, member_no, kind, source) values (tid, k, case when r.x->>'role' in ('editingteacher', 'teacher', 'manager') then 'professor' else 'student' end, 'manual') on conflict (tenant_id, member_no) do nothing;
      umap := umap || jsonb_build_object(r.x->>'id', k); n := n + 1;
    end loop;
    rep := jsonb_build_object('users', jsonb_build_object('source', jsonb_array_length(coalesce(q->'users', '[]')), 'imported', n, 'skipped', n2));
    n := 0; n2 := 0;
    for r in select x from jsonb_array_elements(coalesce(q->'enrolments', '[]')) x loop
      k := umap->>(r.x->>'userid');
      if k is null then n2 := n2 + 1; continue; end if;
      select person_id into pid from lms_person where tenant_id = tid and member_no = k;
      if r.x->>'role' in ('editingteacher', 'teacher') then
        insert into lms_section_staff (tenant_id, section_id, person_id, role, source) values (tid, sec, pid, case when r.x->>'role' = 'teacher' then 'ta' else 'professor' end, 'manual') on conflict do nothing;
      else
        insert into lms_enrollment (tenant_id, section_id, person_id, source) values (tid, sec, pid, 'manual') on conflict do nothing;
      end if;
      n := n + 1;
    end loop;
    rep := rep || jsonb_build_object('enrolments', jsonb_build_object('source', jsonb_array_length(coalesce(q->'enrolments', '[]')), 'imported', n, 'skipped', n2));
    -- 게시물 → 묶음 D 게시판. 최상위 글을 먼저, 답글은 뿌리 글에 붙인다. 다시 이관하면 이전 매핑을 재사용(중복 생성 없음)
    perform lmsd_ensure(sec);
    n := 0; n2 := 0; out := '{}';
    for r in select f2, p, lms_p_mig_board_kind(coalesce(f2->>'name', '')) bk from jsonb_array_elements(coalesce(q->'forums', '[]')) f2, jsonb_array_elements(coalesce(f2->'posts', '[]')) p
             order by (coalesce(p->>'parent', '0') in ('', '0')) desc, coalesce(nullif(p->>'created', ''), '0')::bigint, p->>'id' loop
      k := coalesce(r.p->>'id', md5(r.p::text));
      select o.payload->'map' into mp from lms_mig_object o join lms_mig_run mr on mr.tenant_id = o.tenant_id and mr.run_id = o.run_id
       where o.tenant_id = tid and mr.section_id = sec and o.kind = 'post' and o.src_id = k and o.payload ? 'map' order by o.run_id desc limit 1;
      if mp is null then
        mp := lms_p_mig_post(sec, r.bk, r.p, umap->>(r.p->>'userid'), case when coalesce(r.p->>'parent', '0') in ('', '0') then null else (out->>(r.p->>'parent'))::uuid end);
      end if;
      out := out || jsonb_build_object(k, mp->>'root');
      insert into lms_mig_object (tenant_id, run_id, kind, src_id, title, payload) values (tid, run, 'post', k, left(coalesce(r.p->>'subject', ''), 200),
        jsonb_build_object('forum', r.f2->>'name', 'board_kind', r.bk, 'author', umap->>(r.p->>'userid'), 'parent', r.p->>'parent', 'map', mp)) on conflict do nothing;
      mp := null;
      if umap->>(r.p->>'userid') is null then n2 := n2 + 1; end if; n := n + 1;
    end loop;
    if n2 > 0 then iss := iss || jsonb_build_array(jsonb_build_object('kind', 'post', 'issue', '작성자 학번 없음 ' || n2 || '건 — 작성자 「이관 사용자」로 이관')); end if;
    rep := rep || jsonb_build_object('posts', jsonb_build_object('source', n, 'imported', (select count(*) from lms_mig_object where tenant_id = tid and run_id = run and kind = 'post' and payload->'map'->>'ref' is not null)::int, 'no_author', n2, 'to', 'lms_d_post · lms_d_answer · lms_d_comment'),
                                     'forums', jsonb_array_length(coalesce(q->'forums', '[]')));
    -- 과제 → 묶음 E lms_assignment
    n := 0;
    for r in select x from jsonb_array_elements(coalesce(q->'assignments', '[]')) x order by x->>'id' loop
      k := coalesce(r.x->>'id', md5(r.x::text));
      v_txt := (select o.payload->>'asg_id' from lms_mig_object o join lms_mig_run mr on mr.tenant_id = o.tenant_id and mr.run_id = o.run_id
                 where o.tenant_id = tid and mr.section_id = sec and o.kind = 'assignment' and o.src_id = k and o.payload ? 'asg_id' order by o.run_id desc limit 1);
      v_id := lms_p_mig_asg(sec, r.x, v_txt);
      insert into lms_mig_object (tenant_id, run_id, kind, src_id, title, payload) values (tid, run, 'assignment', k, left(coalesce(r.x->>'name', ''), 200),
        jsonb_build_object('asg_id', v_id, 'duedate', r.x->>'duedate', 'grade', r.x->>'grade')) on conflict do nothing; n := n + 1;
    end loop;
    rep := rep || jsonb_build_object('assignments', jsonb_build_object('source', n, 'imported', (select count(*) from lms_mig_object o join lms_assignment ga on ga.tenant_id = o.tenant_id and ga.asg_id = (o.payload->>'asg_id')::uuid where o.tenant_id = tid and o.run_id = run and o.kind = 'assignment')::int, 'to', 'lms_assignment'));
    n := 0; n2 := 0;
    for r in select x from jsonb_array_elements(coalesce(q->'resources', '[]')) x loop
      k := case when coalesce(r.x->>'mimetype', '') like 'video/%' then 'video' else 'resource' end; if k = 'video' then n2 := n2 + 1; end if;
      insert into lms_mig_object (tenant_id, run_id, kind, src_id, title, payload) values (tid, run, k, coalesce(r.x->>'id', md5(r.x::text)), left(coalesce(r.x->>'name', ''), 200),
        jsonb_build_object('filename', r.x->>'filename', 'mimetype', r.x->>'mimetype', 'filesize', r.x->>'filesize', 'contenthash', r.x->>'contenthash')) on conflict do nothing; n := n + 1;
    end loop;
    rep := rep || jsonb_build_object('resources', jsonb_build_object('source', n, 'imported', (select count(*) from lms_mig_object where tenant_id = tid and run_id = run and kind in ('resource', 'video'))::int, 'videos', n2));
    rep := jsonb_build_object('course', jsonb_build_object('course_code', v_txt, 'term_id', term, 'section_id', sec, 'title', left(coalesce(nullif(out->>'fullname', ''), v_txt), 120)), 'counts', rep, 'issues', iss,
      'verify', jsonb_build_object('enrolled_in_db', (select count(*) from lms_enrollment where tenant_id = tid and section_id = sec)::int, 'staff_in_db', (select count(*) from lms_section_staff where tenant_id = tid and section_id = sec)::int,
                                   'objects_in_db', (select count(*) from lms_mig_object where tenant_id = tid and run_id = run)::int,
                                   'board_posts_in_db', (select count(*) from lms_d_post where tenant_id = tid and section_id = sec and deleted_at is null)::int, 'assignments_in_db', (select count(*) from lms_assignment where tenant_id = tid and section_id = sec)::int),
      'ok', jsonb_array_length(iss) = 0);
    update lms_mig_run set report = rep where tenant_id = tid and run_id = run;
    perform lmsx_audit(me, 'lms.mig.import', jsonb_build_object('run_id', run, 'course', v_txt));
    return jsonb_build_object('run_id', run, 'report', rep);
  elsif op = 'mig.runs' then
    if not adm then perform lmsx_err(403, 'role', '관리자만 볼 수 있습니다.'); end if;
    select coalesce(jsonb_agg(jsonb_build_object('run_id', run_id, 'at', lmsx_ts(at), 'source', source, 'file', file, 'report', report) order by run_id desc), '[]') into arr from (select * from lms_mig_run where tenant_id = tid order by run_id desc limit 20) z;
    return jsonb_build_object('items', arr);
  elsif op = 'mig.videos' then
    if not adm then perform lmsx_err(403, 'role', '관리자만 볼 수 있습니다.'); end if;
    select coalesce(jsonb_agg(jsonb_build_object('run_id', run_id, 'src_id', src_id, 'title', title, 'filename', payload->>'filename', 'mimetype', payload->>'mimetype', 'filesize', payload->>'filesize') order by run_id desc, src_id), '[]') into arr
      from lms_mig_object where tenant_id = tid and kind = 'video';
    return jsonb_build_object('items', arr, 'note', '동영상 원본 이관은 기존 업체 저장소 접근 권한 확보 후 진행(연동 지점)');

  elsif op = 'demo.seed' then
    if not adm then perform lmsx_err(403, 'role', '관리자만 실행할 수 있습니다.'); end if;
    if exists (select 1 from lms_section where tenant_id = tid) then return jsonb_build_object('ok', true, 'seeded', false); end if;
    insert into lms_term (tenant_id, term_id, name, starts_on, ends_on, is_operating) values (tid, '2026-2', '2026학년도 2학기', '2026-09-01', '2026-12-20', true) on conflict do nothing;
    insert into lms_course (tenant_id, course_code, name, credits, unit_code, category) values (tid, 'CSE1001', '프로그래밍 기초', 3, 'CSE', 'major'), (tid, 'BUS2001', '경영 데이터 분석', 3, 'BUS', 'major') on conflict do nothing;
    insert into lms_section (tenant_id, term_id, course_code, section_no, title, mode) values (tid, '2026-2', 'CSE1001', '01', '프로그래밍 기초 01', 'blended') returning section_id into sec;
    insert into lms_section (tenant_id, term_id, course_code, section_no, title, mode) values (tid, '2026-2', 'BUS2001', '01', '경영 데이터 분석 01', 'blended');
    for n in 1..8 loop
      insert into lms_person (tenant_id, member_no, kind, unit_code, grade_year, source) values (tid, '2026100' || n, 'student', case when n <= 4 then 'CSE' else 'BUS' end, 2, 'manual') on conflict (tenant_id, member_no) do update set kind = excluded.kind returning person_id into pid;
      insert into lms_enrollment (tenant_id, section_id, person_id, source) values (tid, sec, pid, 'manual') on conflict do nothing;
    end loop;
    for n in 1..4 loop
      insert into lms_session (tenant_id, section_id, week_no, seq, kind, starts_at, ends_at, open_at, close_at) values (tid, sec, n, 1, 'class', now() + make_interval(days => n - 2), now() + make_interval(days => n - 2, hours => 2), now() - interval '7 days', now() + make_interval(days => n));
    end loop;
    perform lmsx_audit(me, 'lms.demo.seed', '{}');
    return jsonb_build_object('ok', true, 'seeded', true);
  end if;
  perform lmsx_err(404, 'not_found', '없는 주소입니다.');
  return null;
end $$;
