-- 가디언 4차 d5(2026-11-25) 개인정보 내려받기 통제 — 설문 내보내기(K) · 신청자 · 설문 일괄(Q)
-- 규칙은 records.js exportGate · mask(Node) / Records.gate · mask(Java)와 같다: 학번은 기본으로 끝 4자리만 남기고 가린다.
-- 원본(raw)은 실행기(mod-k.js bind · LmsCall.run)가 사유 · 정운영자 확인 뒤 actor.raw = true로만 넘긴다(요청 인자로는 바꿀 수 없다).
-- 응답에 n(내려받은 행 수)을 더한다 — 실행기가 audit 'export' {kind, n, raw, reason}에 쓴다.
create or replace function lms_k_mask(v text) returns text language sql immutable as $$
  select case when v is null or v = '' then v when length(v) <= 4 then repeat('*', length(v)) else repeat('*', length(v) - 4) || right(v, 4) end $$;

create or replace function lms_k_export_csv(sid uuid, lang text, raw boolean) returns text language plpgsql stable as $$
declare s lms_k_survey := lms_k_get_survey(sid); hdr text; body text; begin
  select '응답번호,학번,학과,학년,구분,응답시각,' || coalesce(string_agg(lms_k_csv(q.seq || '. ' || lms_k_tx(q.text, lang)), ',' order by q.seq), '') into hdr
    from lms_k_question q where q.survey_id = sid and q.type not in ('video','html');
  select coalesce(string_agg(
      rn || ',' || lms_k_csv(coalesce(case when raw then r.member_no else lms_k_mask(r.member_no) end, '(익명)')) || ',' || lms_k_csv(r.dims->>'unit_code') || ',' || coalesce(r.dims->>'grade_year', '') || ',' || lms_k_csv(r.dims->>'kind') || ',' ||
      to_char(r.submitted_at at time zone 'Asia/Seoul', 'YYYY-MM-DD HH24:MI') || ',' ||
      coalesce((select string_agg(lms_k_csv(case
          when q.type = 'multi' then (select string_agg(lms_k_tx(q.options->((e #>> '{}')::int), lang), ';') from jsonb_array_elements(case when jsonb_typeof(r.answers->(q.qid::text)) = 'array' then r.answers->(q.qid::text) else '[]' end) e)
          when q.type = 'single' and jsonb_typeof(r.answers->(q.qid::text)) = 'number' then lms_k_tx(q.options->((r.answers->>(q.qid::text))::int), lang)
          else r.answers->>(q.qid::text) end), ',' order by q.seq) from lms_k_question q where q.survey_id = sid and q.type not in ('video','html')), ''),
      E'\r\n' order by rn), '') into body
    from (select row_number() over (order by submitted_at, rid) rn, * from lms_k_response where survey_id = sid) r;
  return hdr || E'\r\n' || body; end $$;
-- 예전 2인자 호출은 가린 결과(안전한 쪽)
create or replace function lms_k_export_csv(sid uuid, lang text) returns text language sql stable as $$ select lms_k_export_csv(sid, lang, false) $$;

create or replace function lms_k_export(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); raw boolean := coalesce((actor->>'raw')::boolean, false); begin
  if actor->>'role' = 'teacher' and s.kind = 'course_eval' and not s.prof_public then perform lms_k_err(403, 'not_public', '강의평가 결과가 교수자에게 공개되지 않았습니다.'); end if;
  return jsonb_build_object('filename', '설문결과_' || regexp_replace(s.title, '[\\/:*?"<>|\s]+', '_', 'g') || '.csv', 'mime', 'text/csv; charset=utf-8',
    'content', chr(65279) || lms_k_export_csv(s.survey_id, coalesce(nullif(lms_k_t(a, 'lang', 5), ''), 'ko'), raw),
    'n', (select count(*) from lms_k_response where survey_id = s.survey_id)); end $$;

create or replace function lms_q_applicants_export(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare p lms_q_program := lms_q_get(lms_q_pid(a)); hdr text; body text; cnt int; raw boolean := coalesce((actor->>'raw')::boolean, false); begin
  perform lms_q_can(actor, p);
  hdr := '학번,학과,학년,상태,대기번호,팀,팀역할,신청일시,이수,마일리지,' || coalesce((select string_agg(lms_k_csv(f->>'label'), ',' order by n) from jsonb_array_elements(p.form) with ordinality x(f, n)), '');
  select count(*), coalesce(string_agg(lms_k_csv(case when raw then ap.member_no else lms_k_mask(ap.member_no) end) || ',' || lms_k_csv(lms_k_person(ap.member_no)->>'unit_code') || ',' || (lms_k_person(ap.member_no)->>'grade_year') || ',' || lms_k_csv(ap.status) || ',' || coalesce(ap.wait_no::text, '') || ',' ||
      lms_k_csv((select name from lms_q_team t where t.team_id = ap.team_id)) || ',' || ap.team_role || ',' || to_char(ap.applied_at, 'YYYY-MM-DD HH24:MI') || ',' || ap.completion || ',' || (ap.mileage + 0) || ',' ||
      coalesce((select string_agg(lms_k_csv(case jsonb_typeof(ap.answers->(f->>'id')) when 'array' then (select string_agg(v, ';') from jsonb_array_elements_text(ap.answers->(f->>'id')) v) else ap.answers->>(f->>'id') end), ',' order by n) from jsonb_array_elements(p.form) with ordinality x(f, n)), ''),
      E'\r\n' order by ap.applied_at, ap.member_no), '') into cnt, body from lms_q_application ap where ap.program_id = p.program_id;
  return jsonb_build_object('filename', '신청자_' || regexp_replace(p.title, '[\\/:*?"<>|\s]+', '_', 'g') || '.csv', 'mime', 'text/csv; charset=utf-8', 'content', chr(65279) || hdr || E'\r\n' || body, 'n', cnt); end $$;

create or replace function lms_q_survey_results(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare ids uuid[]; res text := ''; x record; cnt int := 0; raw boolean := coalesce((actor->>'raw')::boolean, false); begin
  if jsonb_typeof(a->'program_ids') = 'array' then ids := (select array_agg(v::uuid) from jsonb_array_elements_text(a->'program_ids') v where v ~* '^[0-9a-f-]{36}$'); else ids := array[lms_q_pid(a)]; end if;
  for x in select p.title, k.kind_, k.sid from lms_q_program p, lateral (values ('사전', p.pre_survey_id), ('만족도', p.sat_survey_id)) k(kind_, sid) where p.program_id = any(ids) and k.sid is not null order by p.title, k.kind_ loop
    res := res || lms_k_csv('[' || x.title || '] ' || x.kind_ || ' 설문') || E'\r\n' || lms_k_export_csv(x.sid, 'ko', raw) || E'\r\n\r\n';
    cnt := cnt + (select count(*) from lms_k_response where survey_id = x.sid);
  end loop;
  if res = '' then perform lms_k_err(404, 'no_survey', '연결된 설문이 없습니다.'); end if;
  return jsonb_build_object('filename', '비교과_설문결과_일괄.csv', 'mime', 'text/csv; charset=utf-8', 'content', chr(65279) || res, 'n', cnt); end $$;
