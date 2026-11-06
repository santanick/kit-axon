-- 묶음 Q 후속 — 실제 파일 저장(묶음 E의 업로드 API · lms_file 표를 그대로 쓴다)
--   올리기: POST /api/lms/e/file {name, mime, b64} → {file_id} (운영자 · 학습자 세션 모두)
--   표지: cover_url = 'file:<file_id>' · 첨부 · 증빙: [{file_id, name}] · 신청 양식 파일 항목: 응답 값 = file_id
--   내려받기: GET /api/lms/q/file?program_id=&file_id= — 프로그램 표지 · 첨부는 프로그램을 볼 수 있는 사람, 증빙은 운영자, 신청서 파일은 운영자와 신청 본인
-- 95_q는 이미 통합되어 고치지 않고 이 파일에서 검사(트리거)와 내려받기 함수만 더한다.

create or replace function lms_q_file_ok(fid text, staff_only boolean, mno text) returns boolean language sql stable as $$
  select fid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and exists (
    select 1 from lms_file f where f.file_id = fid::uuid
      and (f.owner_kind = 'staff' or (not staff_only and f.owner_ref = (select person_id::text from lms_person where member_no = mno limit 1)))) $$;

-- 프로그램 저장 시: 표지 · 첨부 · 증빙 파일이 실제로 올라간 운영자 파일인지 확인
create or replace function lms_q_program_files_chk() returns trigger language plpgsql as $$
declare x jsonb; begin
  if new.cover_url like 'file:%' and not lms_q_file_ok(substr(new.cover_url, 6), true, null) then perform lms_k_err(400, 'bad_file', '표지 이미지 파일을 찾을 수 없습니다. 다시 올려 주세요.'); end if;
  if new.cover_url like 'file:%' and not exists (select 1 from lms_file where file_id = substr(new.cover_url, 6)::uuid and mime like 'image/%') then perform lms_k_err(400, 'bad_file', '표지는 이미지 파일만 올릴 수 있습니다.'); end if;
  for x in select * from jsonb_array_elements(case jsonb_typeof(new.attachments) when 'array' then new.attachments else '[]' end || case jsonb_typeof(new.evidence) when 'array' then new.evidence else '[]' end) loop
    if jsonb_typeof(x) <> 'object' or not lms_q_file_ok(x->>'file_id', true, null) then perform lms_k_err(400, 'bad_file', '첨부 · 증빙 파일을 찾을 수 없습니다. 다시 올려 주세요.'); end if;
  end loop;
  if jsonb_array_length(case jsonb_typeof(new.attachments) when 'array' then new.attachments else '[]' end) > 20 or jsonb_array_length(case jsonb_typeof(new.evidence) when 'array' then new.evidence else '[]' end) > 20 then
    perform lms_k_err(400, 'too_many', '첨부 · 증빙 파일은 각각 20개까지입니다.'); end if;
  return new; end $$;
drop trigger if exists lms_q_program_files on lms_q_program;
create trigger lms_q_program_files before insert or update of cover_url, attachments, evidence on lms_q_program for each row execute function lms_q_program_files_chk();

-- 신청서 파일 항목: 신청 본인이 올린 파일(운영자가 대신 등록하면 운영자 파일)만
create or replace function lms_q_app_files_chk() returns trigger language plpgsql as $$
declare f jsonb; begin
  for f in select x from lms_q_program p, jsonb_array_elements(p.form) x where p.program_id = new.program_id and x->>'type' = 'file' loop
    if new.answers ? (f->>'id') and not lms_q_file_ok(new.answers->>(f->>'id'), false, new.member_no) then
      perform lms_k_err(400, 'bad_file', '「' || (f->>'label') || '」 파일을 찾을 수 없습니다. 다시 올려 주세요.'); end if;
  end loop;
  return new; end $$;
drop trigger if exists lms_q_app_files on lms_q_application;
create trigger lms_q_app_files before insert or update of answers on lms_q_application for each row execute function lms_q_app_files_chk();

create or replace function lms_q_file(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); fid text := lms_k_t(a, 'file_id', 40); lrn boolean := actor->>'role' = 'learner'; ok boolean := false; f lms_file; begin
  if fid !~* '^[0-9a-f-]{36}$' then perform lms_k_err(400, 'bad_file', '파일을 지정하세요.'); end if;
  if lrn and p.status in ('draft','approving') then perform lms_k_err(404, 'no_program', '프로그램을 찾을 수 없습니다.'); end if;
  ok := p.cover_url = 'file:' || fid or exists (select 1 from jsonb_array_elements(p.attachments) x where x->>'file_id' = fid);
  if not ok and not lrn then
    ok := exists (select 1 from jsonb_array_elements(p.evidence) x where x->>'file_id' = fid)
       or exists (select 1 from lms_q_application ap, jsonb_each_text(ap.answers) v where ap.program_id = p.program_id and v.value = fid);
  end if;
  if not ok and lrn then
    ok := exists (select 1 from lms_q_application ap, jsonb_each_text(ap.answers) v where ap.program_id = p.program_id and ap.member_no = actor->>'member_no' and v.value = fid);
  end if;
  if not ok then perform lms_k_err(404, 'no_file', '파일을 찾을 수 없습니다.'); end if;
  select * into f from lms_file where file_id = fid::uuid;
  if f.file_id is null then perform lms_k_err(404, 'no_file', '파일을 찾을 수 없습니다.'); end if;
  return jsonb_build_object('file_id', f.file_id, 'name', f.name, 'mime', f.mime, 'size', f.size, 'b64', translate(encode(f.data, 'base64'), E'\n', '')); end $$;
