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

create or replace function lms_p(op text, me jsonb, q jsonb) returns jsonb language plpgsql as $$
declare
  tid text := current_setting('app.tenant', true);
  my text := case when coalesce(me->>'learner', '') <> '' then 'p:' || (me->>'learner') else 'u:' || coalesce(me->>'uid', '') end;
  adm boolean := coalesce(me->>'role', '') in ('owner', 'sub');
  tea boolean := coalesce(me->>'role', '') in ('owner', 'sub', 'teacher');
  v_id uuid; v_txt text; k text; r record; s2 record; arr jsonb; out jsonb; n int; n2 int; g lms_admin_guard; f timestamptz; t timestamptz; mem text[]; run bigint;
  sec uuid; term text; pid uuid; umap jsonb := '{}'; rep jsonb; iss jsonb := '[]';
begin
  -- ── 학습자(앱) 출석: 학습자 세션만 ──
  if op = 'att.checkin' then
    if coalesce(me->>'learner', '') = '' then perform lmsx_err(403, 'role', '학습자 앱에서만 출석할 수 있습니다.'); end if;
    select person_id into pid from lms_person where tenant_id = tid and member_no = me->>'learner';
    if not found then perform lmsx_err(404, 'not_found', '학사에 등록되지 않은 학번입니다.'); end if;
    arr := case when jsonb_typeof(q->'items') = 'array' then q->'items' else jsonb_build_array(q) end;
    if jsonb_array_length(arr) > 50 then perform lmsx_err(400, 'bad_input', '오프라인 출석은 한 번에 50건까지 보냅니다.'); end if;
    out := '[]';
    for r in select x from jsonb_array_elements(arr) x loop
      v_id := lmsx_uuid(r.x, 'session_id'); v_txt := upper(lmsx_txt(r.x, 'code', 12, true));
      f := lmsx_tsq(r.x, 'offline_at');
      select s.*, ac.code_hash, ac.expires_at ac_exp, coalesce(ar.late_after_min, 10) late_min,
             exists (select 1 from lms_enrollment e where e.tenant_id = s.tenant_id and e.section_id = s.section_id and e.person_id = pid and e.status = 'enrolled') enrolled
        into s2 from lms_session s left join lms_attendance_code ac on ac.tenant_id = s.tenant_id and ac.session_id = s.session_id
        left join lms_attendance_rule ar on ar.tenant_id = s.tenant_id and ar.section_id = s.section_id
       where s.tenant_id = tid and s.session_id = v_id;
      if not found then k := 'no_session';
      elsif not s2.enrolled then k := 'not_enrolled';
      elsif s2.code_hash is null or s2.code_hash <> encode(sha256(convert_to(tid || '|' || v_id || '|' || v_txt, 'UTF8')), 'hex') then k := 'bad_code';
      elsif coalesce(f, now()) > s2.ac_exp or (f is not null and f < s2.ac_exp - interval '3 hours') or (f is not null and f > now()) then k := 'expired';
      else
        k := case when s2.starts_at is not null and coalesce(f, now()) > s2.starts_at + make_interval(mins => s2.late_min) then 'late' else 'present' end;
        insert into lms_attendance (tenant_id, session_id, person_id, status, method, evidence, decided_at)
        values (tid, v_id, pid, k, 'code', jsonb_build_object('ip', lmsx_ip(me->>'ip'), 'offline', f is not null, 'client_at', lmsx_ts(f), 'via', 'app'), coalesce(f, now()))
        on conflict (tenant_id, session_id, person_id) do update set status = case when lms_attendance.status = 'present' then 'present' else excluded.status end, method = 'code', evidence = excluded.evidence, decided_at = excluded.decided_at
        where lms_attendance.method <> 'manual';
      end if;
      out := out || jsonb_build_array(jsonb_build_object('session_id', v_id, 'result', k));
    end loop;
    if jsonb_typeof(q->'items') is distinct from 'array' then
      k := out->0->>'result';
      if k = 'no_session' then return jsonb_build_object('_status', 404, 'error', 'not_found', 'message', '없는 수업 차시입니다.'); end if;
      if k = 'not_enrolled' then return jsonb_build_object('_status', 403, 'error', 'not_enrolled', 'message', '이 분반의 수강생이 아닙니다.'); end if;
      if k = 'bad_code' then return jsonb_build_object('_status', 400, 'error', 'bad_code', 'message', '출석 코드가 올바르지 않습니다.'); end if;
      if k = 'expired' then return jsonb_build_object('_status', 410, 'error', 'expired', 'message', '출석 코드 유효 시간이 지났습니다.'); end if;
      return jsonb_build_object('ok', true, 'status', k);
    end if;
    return jsonb_build_object('ok', true, 'items', out);
  end if;
  if coalesce(me->>'learner', '') <> '' then perform lmsx_err(403, 'role', '권한이 없습니다.'); end if;

  if op = 'att.open' then
    if not tea then perform lmsx_err(403, 'role', '교수자 · 운영자만 출석 코드를 열 수 있습니다.'); end if;
    v_id := lmsx_uuid(q, 'session_id');
    if not exists (select 1 from lms_session where tenant_id = tid and session_id = v_id) then perform lmsx_err(404, 'not_found', '없는 수업 차시입니다.'); end if;
    n := lmsx_int(q, 'minutes', 10, 1, 180);
    v_txt := lpad((floor(random() * 1000000))::int::text, 6, '0');
    insert into lms_attendance_code (tenant_id, session_id, code_hash, expires_at) values (tid, v_id, encode(sha256(convert_to(tid || '|' || v_id || '|' || v_txt, 'UTF8')), 'hex'), now() + make_interval(mins => n))
    on conflict (tenant_id, session_id) do update set code_hash = excluded.code_hash, expires_at = excluded.expires_at;
    perform lmsx_audit(me, 'lms.att.open', jsonb_build_object('session_id', v_id, 'minutes', n));
    return jsonb_build_object('ok', true, 'code', v_txt, 'expires_at', lmsx_ts(now() + make_interval(mins => n)), 'qr', 'didisam-att:' || v_id || ':' || v_txt);

  elsif op = 'att.board' then
    if not tea then perform lmsx_err(403, 'role', '교수자 · 운영자만 볼 수 있습니다.'); end if;
    v_id := lmsx_uuid(q, 'session_id');
    select jsonb_build_object('present', count(*) filter (where a.status = 'present'), 'late', count(*) filter (where a.status = 'late'), 'absent', count(*) filter (where a.status = 'absent'), 'offline', count(*) filter (where (a.evidence->>'offline')::boolean)) into out
      from lms_attendance a where a.tenant_id = tid and a.session_id = v_id;
    return out || jsonb_build_object('enrolled', (select count(*) from lms_enrollment e join lms_session s on s.tenant_id = e.tenant_id and s.section_id = e.section_id where e.tenant_id = tid and s.session_id = v_id and e.status = 'enrolled')::int);

  -- ── 언어 · 접근성 ──
  elsif op = 'pref.get' then
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
    v_txt := lmsx_txt(q, 'name', 200, true);
    if coalesce(q->>'size', '') !~ '^\d{1,13}$' then perform lmsx_err(400, 'bad_input', '파일 크기가 올바르지 않습니다.'); end if;
    if (q->>'size')::bigint > 5368709120 then perform lmsx_err(413, 'too_large', '파일은 5GB까지 올릴 수 있습니다.'); end if;
    if coalesce(q->>'sha256', '') <> '' and q->>'sha256' !~ '^[0-9a-f]{64}$' then perform lmsx_err(400, 'bad_input', 'sha256 값이 올바르지 않습니다.'); end if;
    arr := coalesce(q->'entries', '[]'); if jsonb_typeof(arr) <> 'array' then perform lmsx_err(400, 'bad_input', 'entries 형식이 올바르지 않습니다.'); end if;
    select coalesce(jsonb_agg(jsonb_build_object('name', left(coalesce(e->>'name', ''), 300), 'size', coalesce(nullif(e->>'size', '')::bigint, 0))), '[]') into arr from (select e from jsonb_array_elements(arr) e limit 2000) z;
    insert into lms_upload (tenant_id, owner, name, size, mime, sha256, entries, storage_key) values (tid, my, v_txt, (q->>'size')::bigint, lmsx_txt(q, 'mime', 100), nullif(q->>'sha256', ''), arr, null) returning upload_id into v_id;
    return jsonb_build_object('ok', true, 'id', v_id, 'entries', jsonb_array_length(arr), 'storage', '연동 후 저장(학내 CDN · 스토리지)');
  elsif op = 'upload.recent' then
    select coalesce(jsonb_agg(jsonb_build_object('id', upload_id, 'name', name, 'size', size, 'mime', mime, 'sha256', sha256, 'entries', jsonb_array_length(entries), 'at', lmsx_ts(created_at)) order by created_at desc, name), '[]') into arr
      from (select * from lms_upload where tenant_id = tid and owner = my order by created_at desc limit 20) u;
    return jsonb_build_object('items', arr);
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
    n := 0; n2 := 0;
    for r in select f2, p from jsonb_array_elements(coalesce(q->'forums', '[]')) f2, jsonb_array_elements(coalesce(f2->'posts', '[]')) p loop
      insert into lms_mig_object (tenant_id, run_id, kind, src_id, title, payload) values (tid, run, 'post', coalesce(r.p->>'id', md5(r.p::text)), left(coalesce(r.p->>'subject', ''), 200),
        jsonb_build_object('forum', r.f2->>'name', 'author', umap->>(r.p->>'userid'), 'message', left(coalesce(r.p->>'message', ''), 20000), 'created', r.p->>'created', 'parent', r.p->>'parent')) on conflict do nothing;
      if umap->>(r.p->>'userid') is null then n2 := n2 + 1; end if; n := n + 1;
    end loop;
    if n2 > 0 then iss := iss || jsonb_build_array(jsonb_build_object('kind', 'post', 'issue', '작성자 학번 없음 ' || n2 || '건 — 작성자 비움으로 이관')); end if;
    rep := rep || jsonb_build_object('posts', jsonb_build_object('source', n, 'imported', (select count(*) from lms_mig_object where tenant_id = tid and run_id = run and kind = 'post')::int, 'no_author', n2),
                                     'forums', jsonb_array_length(coalesce(q->'forums', '[]')));
    n := 0;
    for r in select x from jsonb_array_elements(coalesce(q->'assignments', '[]')) x loop
      insert into lms_mig_object (tenant_id, run_id, kind, src_id, title, payload) values (tid, run, 'assignment', coalesce(r.x->>'id', md5(r.x::text)), left(coalesce(r.x->>'name', ''), 200),
        jsonb_build_object('intro', left(coalesce(r.x->>'intro', ''), 20000), 'duedate', r.x->>'duedate', 'grade', r.x->>'grade')) on conflict do nothing; n := n + 1;
    end loop;
    rep := rep || jsonb_build_object('assignments', jsonb_build_object('source', n, 'imported', (select count(*) from lms_mig_object where tenant_id = tid and run_id = run and kind = 'assignment')::int));
    n := 0; n2 := 0;
    for r in select x from jsonb_array_elements(coalesce(q->'resources', '[]')) x loop
      k := case when coalesce(r.x->>'mimetype', '') like 'video/%' then 'video' else 'resource' end; if k = 'video' then n2 := n2 + 1; end if;
      insert into lms_mig_object (tenant_id, run_id, kind, src_id, title, payload) values (tid, run, k, coalesce(r.x->>'id', md5(r.x::text)), left(coalesce(r.x->>'name', ''), 200),
        jsonb_build_object('filename', r.x->>'filename', 'mimetype', r.x->>'mimetype', 'filesize', r.x->>'filesize', 'contenthash', r.x->>'contenthash')) on conflict do nothing; n := n + 1;
    end loop;
    rep := rep || jsonb_build_object('resources', jsonb_build_object('source', n, 'imported', (select count(*) from lms_mig_object where tenant_id = tid and run_id = run and kind in ('resource', 'video'))::int, 'videos', n2));
    rep := jsonb_build_object('course', jsonb_build_object('course_code', v_txt, 'term_id', term, 'section_id', sec, 'title', left(coalesce(nullif(out->>'fullname', ''), v_txt), 120)), 'counts', rep, 'issues', iss,
      'verify', jsonb_build_object('enrolled_in_db', (select count(*) from lms_enrollment where tenant_id = tid and section_id = sec)::int, 'staff_in_db', (select count(*) from lms_section_staff where tenant_id = tid and section_id = sec)::int,
                                   'objects_in_db', (select count(*) from lms_mig_object where tenant_id = tid and run_id = run)::int),
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
