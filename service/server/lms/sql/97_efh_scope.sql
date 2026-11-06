-- v30 묶음 E · F · H 보완(2026-11-06): ① 교수 담당 분반 범위 ② 시험 IP 보존 기간(학기 종료 후 가림, 기관 설정)
-- 30_e · 40_f · 55_h는 이미 적용된 DB가 있어 고치지 않고, 이 파일이 함수를 바꾸거나 감싼다(맨 뒤 번호 — 마이그레이션 순서 보존).
-- ① 범위 규칙(묶음 A mod-a.js ctxOf와 같은 기준)
--    owner: 기관 전체 · sub: lms_user_link.units가 있으면 그 단과대학 · 학과(교과목 학과 또는 상위 조직)만, 없으면 전체
--    teacher: lms_user_link.member_no(사번)로 연결된 구성원이 lms_section_staff(active)에서 professor · co_professor · ta · grader인 분반만
--    적용: 교수자 함수가 lms_x_staff로 ctx를 트랜잭션 변수(lms.ctx)에 남기고 → 분반 해석 함수(lms_x_section · lms_e_asg · lms_f_exam · 문제은행)와
--          E · F · H 표의 쓰기 트리거가 범위를 검사한다. 목록 함수는 감싸서 범위 밖 행을 뺀다. 학습자 함수는 lms.ctx를 쓰지 않는다.

-- ── 범위 도우미 ──
create or replace function lms_x_staff(ctx jsonb) returns void language plpgsql as $$
begin
  if coalesce(ctx->>'kind', '') <> 'staff' then perform lms_x_err(403, 'role', '교수자 · 운영자만 쓸 수 있습니다.'); end if;
  perform set_config('lms.ctx', ctx::text, true);
end $$;
create or replace function lms_x_ctx() returns jsonb language sql stable as $$ select case when coalesce(current_setting('lms.ctx', true), '') = '' then null else current_setting('lms.ctx', true)::jsonb end $$;
create or replace function lms_x_link(c jsonb, out units text[], out mno text) language plpgsql stable as $$
begin
  begin select l.units, l.member_no into units, mno from lms_user_link l where l.user_id = (c->>'uid')::uuid; exception when others then units := null; mno := null; end;
end $$;
-- 이 분반을 다룰 수 있는가(학습자 ctx · ctx 없음은 검사하지 않음 — 학습자 함수는 따로 수강을 확인)
create or replace function lms_x_can(sec uuid) returns boolean language plpgsql stable as $$
declare c jsonb := lms_x_ctx(); k record; un text; pc text;
begin
  if c is null or c->>'kind' <> 'staff' or c->>'role' = 'owner' then return true; end if;
  select * into k from lms_x_link(c);
  if c->>'role' = 'sub' then
    if k.units is null or cardinality(k.units) = 0 then return true; end if;
    select co.unit_code, u.parent_code into un, pc from lms_section s join lms_course co on co.course_code = s.course_code left join lms_org_unit u on u.unit_code = co.unit_code where s.section_id = sec;
    return un = any(k.units) or pc = any(k.units);
  end if;
  return k.mno is not null and exists (select 1 from lms_section_staff st join lms_person p on p.person_id = st.person_id
    where st.section_id = sec and p.member_no = k.mno and coalesce(st.status, 'active') = 'active' and st.role in ('professor', 'co_professor', 'ta', 'grader'));
end $$;
create or replace function lms_x_scope(sec uuid) returns void language plpgsql as $$
declare c jsonb := lms_x_ctx();
begin
  if sec is null or lms_x_can(sec) then return; end if;
  if c->>'role' = 'sub' then perform lms_x_err(403, 'lms_scope', '담당 단과대학 범위 밖의 항목입니다.'); end if;
  perform lms_x_err(403, 'lms_role', '담당 분반이 아닙니다. 교수 · 공동교수 · 조교 · 채점자로 배정된 분반만 다룰 수 있습니다.');
end $$;
create or replace function lms_x_section(sec uuid) returns void language plpgsql as $$
begin
  if not exists (select 1 from lms_section where section_id = sec) then perform lms_x_err(404, 'section', '없는 분반입니다.'); end if;
  perform lms_x_scope(sec);
end $$;
-- 문제은행: 분반 은행 = 그 분반 · 교과목 은행 = 그 교과목 분반 하나라도 담당(부운영자는 교과목 학과) · 기관 공용 = 읽기 모두, 쓰기 운영자
create or replace function lms_f_bank_can(b uuid, w boolean) returns boolean language plpgsql stable as $$
declare c jsonb := lms_x_ctx(); k lms_qbank;
begin
  if c is null or c->>'kind' <> 'staff' or c->>'role' = 'owner' then return true; end if;
  select * into k from lms_qbank where bank_id = b; if k.bank_id is null then return true; end if;
  if k.scope = 'section' then return lms_x_can(k.section_id); end if;
  if k.scope = 'tenant' then return not w or c->>'role' = 'sub'; end if;
  return exists (select 1 from lms_section s where s.course_code = k.course_code and lms_x_can(s.section_id));
end $$;
create or replace function lms_f_bank_scope(b uuid, w boolean) returns void language plpgsql as $$
begin
  if not lms_f_bank_can(b, w) then perform lms_x_err(403, 'lms_role', '이 문제은행을 다룰 권한이 없습니다(담당 분반 · 교과목의 문제은행만).'); end if;
end $$;
create or replace function lms_e_asg(id uuid) returns lms_assignment language plpgsql as $$
declare r lms_assignment;
begin
  select * into r from lms_assignment where asg_id = id;
  if r.asg_id is null then perform lms_x_err(404, 'assignment', '없는 과제입니다.'); end if;
  perform lms_x_scope(r.section_id);
  return r;
end $$;

-- ── 쓰기 트리거: 교수자 함수(lms.ctx)가 범위 밖 분반의 행을 바꾸지 못하게 ──
create or replace function lms_x_trg_scope() returns trigger language plpgsql as $$
declare c jsonb := lms_x_ctx(); r jsonb := to_jsonb(coalesce(NEW, OLD)); sec uuid; how text := TG_ARGV[0];
begin
  if c is null or c->>'kind' <> 'staff' or c->>'role' = 'owner' then return coalesce(NEW, OLD); end if;
  if how = 'bank' then perform lms_f_bank_scope((r->>'bank_id')::uuid, true); return coalesce(NEW, OLD); end if;
  if how = 'qbank' then
    if TG_OP = 'INSERT' then
      if r->>'scope' = 'tenant' and c->>'role' <> 'sub' then perform lms_x_err(403, 'role', '운영자만 쓸 수 있습니다.'); end if;
      if r->>'scope' = 'section' then perform lms_x_scope((r->>'section_id')::uuid); end if;
      if r->>'scope' = 'course' and not exists (select 1 from lms_section s where s.course_code = r->>'course_code' and lms_x_can(s.section_id)) then perform lms_x_err(403, 'lms_role', '담당 교과목이 아닙니다.'); end if;
    else perform lms_f_bank_scope((r->>'bank_id')::uuid, true); end if;
    return coalesce(NEW, OLD);
  end if;
  sec := case how
    when 'section' then (r->>'section_id')::uuid
    when 'asg' then (select section_id from lms_assignment where asg_id = (r->>'asg_id')::uuid)
    when 'sub' then (select g.section_id from lms_submission s join lms_assignment g on g.asg_id = s.asg_id where s.sub_id = (r->>'sub_id')::uuid)
    when 'exam' then (select section_id from lms_exam where exam_id = (r->>'exam_id')::uuid)
    when 'item' then (select section_id from lms_grade_item where item_id = (r->>'item_id')::uuid) end;
  perform lms_x_scope(sec);
  return coalesce(NEW, OLD);
end $$;
do $$ declare t record; begin
  for t in select * from (values ('lms_assignment', 'section'), ('lms_rubric', 'section'), ('lms_asg_team', 'asg'), ('lms_submission', 'asg'), ('lms_submission_ver', 'sub'), ('lms_plag_result', 'sub'),
      ('lms_qbank', 'qbank'), ('lms_question', 'bank'), ('lms_exam', 'section'), ('lms_exam_attempt', 'exam'), ('lms_exam_precheck', 'exam'),
      ('lms_grade_item', 'section'), ('lms_grade_score', 'item'), ('lms_grade_policy', 'section'), ('lms_grade_final', 'section'), ('lms_grade_history', 'section'),
      ('lms_sis_grade_queue', 'section'), ('lms_grade_msg_queue', 'section')) v(tbl, how) loop
    execute format('drop trigger if exists lms_efh_scope on %I', t.tbl);
    execute format('create trigger lms_efh_scope before insert or update or delete on %I for each row execute function lms_x_trg_scope(%L)', t.tbl, t.how);
  end loop;
end $$;

-- ── 읽기 함수 감싸기(원본은 *_base로 이름을 바꿔 그대로 쓴다) ──
do $$ declare f text; begin
  foreach f in array array['lms_e_sections', 'lms_e_sub', 'lms_e_file_get', 'lms_e_rubrics', 'lms_f_banks', 'lms_f_questions', 'lms_f_attempt', 'lms_h_queue'] loop
    if to_regprocedure(f || '_base(jsonb,jsonb)') is null then execute format('alter function %I(jsonb, jsonb) rename to %I', f, f || '_base'); end if;
  end loop;
end $$;
create or replace function lms_e_sections(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r jsonb := lms_e_sections_base(ctx, a);
begin
  return jsonb_build_object('sections', coalesce((select jsonb_agg(x order by o) from jsonb_array_elements(r->'sections') with ordinality t(x, o) where lms_x_can((x->>'section_id')::uuid)), '[]'));
end $$;
create or replace function lms_e_sub(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r jsonb := lms_e_sub_base(ctx, a);
begin perform lms_e_asg((r->'submission'->>'asg_id')::uuid); return r; end $$;
create or replace function lms_e_rubrics(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
begin
  perform lms_x_staff(ctx);
  if nullif(a->>'section', '') is not null then perform lms_x_section(lms_x_uuid(a->>'section', '분반')); end if;
  return lms_e_rubrics_base(ctx, a);
end $$;
-- 파일: 교수자는 자기가 올린 파일, 담당 분반 제출물 · 첨삭 파일, 볼 수 있는 문제은행 문항 첨부만
create or replace function lms_e_file_get(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare id uuid; f lms_file; c jsonb;
begin
  if ctx->>'kind' = 'staff' then
    perform lms_x_staff(ctx); id := lms_x_uuid(a->>'id', '파일'); c := lms_x_ctx();
    select * into f from lms_file where file_id = id;
    if f.file_id is not null and c->>'role' <> 'owner' and not (f.owner_kind = 'staff' and f.owner_ref = c->>'uid')
      and not exists (select 1 from lms_submission s join lms_assignment g on g.asg_id = s.asg_id where (s.files ? id::text or s.feedback_files ? id::text) and lms_x_can(g.section_id))
      and not exists (select 1 from lms_question q where q.media @> jsonb_build_array(jsonb_build_object('type', 'image', 'file_id', id::text)) and lms_f_bank_can(q.bank_id, false)) then
      perform lms_x_err(403, 'forbidden', '이 파일을 볼 권한이 없습니다.'); end if;
  end if;
  return lms_e_file_get_base(ctx, a);
end $$;
create or replace function lms_f_banks(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  perform lms_x_staff(ctx);
  if nullif(a->>'section', '') is not null then perform lms_x_section(lms_x_uuid(a->>'section', '분반')); end if;
  r := lms_f_banks_base(ctx, a);
  return jsonb_build_object('banks', coalesce((select jsonb_agg(x order by o) from jsonb_array_elements(r->'banks') with ordinality t(x, o) where lms_f_bank_can((x->>'bank_id')::uuid, false)), '[]'));
end $$;
create or replace function lms_f_questions(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
begin
  perform lms_x_staff(ctx);
  if exists (select 1 from lms_qbank where bank_id::text = a->>'bank') then perform lms_f_bank_scope((a->>'bank')::uuid, false); end if;
  return lms_f_questions_base(ctx, a);
end $$;
create or replace function lms_f_attempt(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r jsonb := lms_f_attempt_base(ctx, a);
begin perform lms_f_exam((r->'attempt'->>'exam_id')::uuid); return r; end $$;
create or replace function lms_h_queue(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare r jsonb := lms_h_queue_base(ctx, a); q jsonb;
begin
  if nullif(a->>'section', '') is not null then perform lms_x_section(lms_x_uuid(a->>'section', '분반')); end if;
  if lms_x_ctx()->>'role' = 'owner' then return r; end if;
  select coalesce(jsonb_agg(x order by o), '[]') into q from jsonb_array_elements(r->'queue') with ordinality t(x, o) where lms_x_can((x->>'section_id')::uuid);
  return r || jsonb_build_object('queue', q, 'counts', jsonb_build_object('pending', (select count(*) from jsonb_array_elements(q) x where x->>'status' = 'pending'),
    'sent', (select count(*) from jsonb_array_elements(q) x where x->>'status' = 'sent'), 'error', (select count(*) from jsonb_array_elements(q) x where x->>'status' = 'error')));
end $$;

-- ── ② 시험 IP 보존: 학기 종료일 + 보존 일수(기관 설정, 기본 0일)가 지나면 앞 세 자리만 남기고 가린다(이상 징후 분석용) ──
create table if not exists lms_efh_setting (
  tenant_id text not null references tenants(id) on delete cascade primary key,
  exam_ip_keep_days int not null default 0 check (exam_ip_keep_days between 0 and 3650),
  updated_at timestamptz not null default now()
);
alter table lms_efh_setting enable row level security;
alter table lms_efh_setting force row level security;
drop policy if exists tenant_iso on lms_efh_setting;
create policy tenant_iso on lms_efh_setting using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));
grant select, insert, update, delete on lms_efh_setting to didisam_tenant;
alter table lms_exam_attempt add column if not exists ip_masked_at timestamptz;
alter table lms_exam_precheck add column if not exists ip_masked_at timestamptz;
create or replace function lms_x_ipmask(ip text) returns text language plpgsql immutable as $$
declare p text[];
begin
  if ip is null or ip = '' then return ip; end if;
  if ip ~ '^\d+\.\d+\.\d+\.\d+$' then p := string_to_array(ip, '.'); return p[1] || '.' || p[2] || '.' || p[3] || '.*'; end if;
  if ip like '%:%' then p := string_to_array(ip, ':'); return array_to_string(p[1:3], ':') || ':*'; end if;
  return '*';
end $$;
create or replace function lms_f_ip_keep() returns int language sql stable as $$ select coalesce((select exam_ip_keep_days from lms_efh_setting), 0) $$;
-- ex = null 이면 기관 전체. 가린 응시 수를 돌려준다.
create or replace function lms_f_ip_mask_due(ex uuid) returns int language plpgsql as $$
declare n int; k int := lms_f_ip_keep();
begin
  update lms_exam_attempt t set ip_start = lms_x_ipmask(t.ip_start), ip_last = lms_x_ipmask(t.ip_last),
    ip_log = coalesce((select jsonb_agg(e || jsonb_build_object('ip', lms_x_ipmask(e->>'ip')) order by o) from jsonb_array_elements(t.ip_log) with ordinality z(e, o)), '[]'), ip_masked_at = now()
  from lms_exam x join lms_section s on s.section_id = x.section_id join lms_term tm on tm.term_id = s.term_id
  where t.exam_id = x.exam_id and (ex is null or t.exam_id = ex) and t.ip_masked_at is null and now() >= tm.ends_on + 1 + k;
  get diagnostics n = row_count;
  update lms_exam_precheck c set ip = lms_x_ipmask(c.ip), ip_masked_at = now()
  from lms_exam x join lms_section s on s.section_id = x.section_id join lms_term tm on tm.term_id = s.term_id
  where c.exam_id = x.exam_id and (ex is null or c.exam_id = ex) and c.ip_masked_at is null and now() >= tm.ends_on + 1 + k;
  return n;
end $$;
create or replace function lms_f_exam(id uuid) returns lms_exam language plpgsql as $$
declare r lms_exam;
begin
  select * into r from lms_exam where exam_id = id;
  if r.exam_id is null then perform lms_x_err(404, 'exam', '없는 시험입니다.'); end if;
  perform lms_x_scope(r.section_id);
  perform lms_f_ip_mask_due(id);
  return r;
end $$;
create or replace function lms_f_settings(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
begin
  perform lms_x_staff(ctx);
  return jsonb_build_object('exam_ip_keep_days', lms_f_ip_keep(),
    'note', '시험 응시 IP는 학기 종료일 다음 날부터 보존 일수가 지나면 앞 세 자리만 남기고 가립니다(예: 10.20.30.*). 가린 값은 되돌릴 수 없습니다.');
end $$;
create or replace function lms_f_settings_save(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare k int;
begin
  perform lms_x_admin(ctx);
  if (lms_x_link(ctx)).units is not null and cardinality((lms_x_link(ctx)).units) > 0 and ctx->>'role' = 'sub' then perform lms_x_err(403, 'lms_scope', '담당 단과대학 범위 밖의 항목입니다.'); end if;
  k := lms_x_num(a, 'exam_ip_keep_days', 0, 3650, null, '시험 IP 보존 일수')::int;
  if k is null then perform lms_x_err(400, 'required', '시험 IP 보존 일수을(를) 입력하세요.'); end if;
  insert into lms_efh_setting (tenant_id, exam_ip_keep_days) values (lms_x_tid(), k) on conflict (tenant_id) do update set exam_ip_keep_days = excluded.exam_ip_keep_days, updated_at = now();
  return lms_f_settings(ctx, a) || jsonb_build_object('_audit', lms_x_audit('lms.f.settings', jsonb_build_object('exam_ip_keep_days', k)));
end $$;
-- 기관 전체 가림 실행(운영자 · 정기 작업 연결 지점: 매일 1회 호출 권장)
create or replace function lms_f_ip_mask(ctx jsonb, a jsonb) returns jsonb language plpgsql as $$
declare n int;
begin
  perform lms_x_admin(ctx); n := lms_f_ip_mask_due(null);
  return jsonb_build_object('masked', n, '_audit', lms_x_audit('lms.f.ip_mask', jsonb_build_object('n', n)));
end $$;
