-- 묶음 K · N 후속(학습자 본인 세션 대응): 학습자(actor.role = learner)는 공개 전 과정을 볼 수 없다.
-- 68_k · 80_n은 이미 통합에 들어갔으므로 고치지 않고 이 파일에서 함수만 다시 만든다.
create or replace function lms_n_course_get(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare c lms_n_course := lms_n_get(lms_k_uuid(a, 'course_id')); begin
  if actor->>'role' = 'learner' and c.status <> 'approved' then perform lms_k_err(404, 'no_course', '과정을 찾을 수 없습니다.'); end if;
  return lms_n_cout(c) || jsonb_build_object('cohorts', coalesce((select jsonb_agg(jsonb_build_object('cohort_id', h.cohort_id, 'no', h.no, 'starts_on', h.starts_on, 'ends_on', h.ends_on, 'capacity', h.capacity, 'status', h.status,
      'n', (select count(*) from lms_n_enroll e where e.cohort_id = h.cohort_id and e.status in ('approved','completed','failed','pending'))) order by h.no) from lms_n_cohort h where h.course_id = c.course_id), '[]')); end $$;
-- 학습자는 진행 중이 아닌 설문 내용을 볼 수 없다
create or replace function lms_k_survey_get(actor jsonb, a jsonb) returns jsonb language plpgsql stable as $$
declare s lms_k_survey := lms_k_get_survey(lms_k_uuid(a, 'survey_id')); lang text := coalesce(nullif(lms_k_t(a, 'lang', 5), ''), 'ko'); begin
  if actor->>'role' = 'learner' and (s.status <> 'open' or s.is_template) then perform lms_k_err(404, 'no_survey', '설문을 찾을 수 없습니다.'); end if;
  return lms_k_out(s) || jsonb_build_object('lang', lang, 'title_l', coalesce(nullif(s.i18n->>lang, ''), s.title),
    'questions', coalesce((select jsonb_agg(lms_k_qout(q, lang) order by q.seq) from lms_k_question q where q.survey_id = s.survey_id), '[]')); end $$;
