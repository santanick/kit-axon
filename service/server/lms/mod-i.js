'use strict';
/* v30 학사 LMS 묶음 I — 동영상 · 진도(SFR-010 · 015 · 028 · 033 · 048 · 063 · 073)
   HTML5 플레이어 서버 쪽: 구간 기반 학습시간(겹침 병합 · 벽시계 × 배속 상한), 이어보기, 1.0~2.0배속, 화질 목록, 하트비트 동시 재생 차단, 재생 로그,
   VTT · SRT 자막 등록(서버 파싱) · 편집, 영상 중간 퀴즈 → 성적 항목 「영상 퀴즈」 자동 반영, 원격수업 학습분량 점검, 진도 · 학습 이력, 강좌 내 행동 기록.
   실행기 · 규약은 mod-g.js(engine)와 같다. Java 매퍼 lms_i.xml은 이 SQL과 글자 그대로 같아야 한다(test/lms-i.js). */
const { engine } = require('./mod-g');
const DEV = `case when #{_ua} is null then 'unknown' when #{_ua} ~* '(ipad|tablet)' then 'tablet' when #{_ua} ~* '(mobi|android|iphone)' then 'mobile' else 'desktop' end`;
const IPM = `regexp_replace(coalesce(#{_ip}, ''), '[0-9a-fA-F]+$', '*')`;
const CT = `(select ct.*, s.section_id, s.week_no, s.seq from lms_content ct join lms_session s on s.session_id = ct.session_id where ct.content_id = cast(#{content_id} as uuid))`;
const ENR = `(select pe.person_id, e.kind from lms_person pe join lms_enrollment e on e.person_id = pe.person_id and e.status = 'enrolled' where pe.member_no = #{member_no} and e.section_id = (select section_id from c))`;
const CJ = `json_build_object('content_id', c.content_id, 'session_id', c.session_id, 'week_no', s.week_no, 'seq', s.seq, 'title', c.title, 'duration_sec', c.duration_sec, 'src', c.src, 'qualities', c.qualities, 'check_at_sec', c.check_at_sec,
  'subtitles', coalesce((select json_agg(sb.lang order by sb.lang) from lms_subtitle sb where sb.content_id = c.content_id), '[]'), 'quizzes', (select count(*) from lms_video_quiz q where q.content_id = c.content_id))`;

const SQL = {
  seed: `with sec as (select section_id from lms_section where section_id = cast(#{section_id} as uuid)),
    ins as (insert into lms_content (tenant_id, session_id, title, duration_sec, src, check_at_sec)
      select current_setting('app.tenant'), s.session_id, s.week_no || '주차 강의 영상', 1500, 'demo:lecture-' || s.week_no, 1200 from lms_session s join sec on s.section_id = sec.section_id
      where s.seq = 1 and s.kind <> 'holiday' and not exists (select 1 from lms_content x where x.session_id = s.session_id) returning 1)
    select case when not exists (select 1 from sec) then '{"err":"not_found"}' else json_build_object('created', (select count(*) from ins))::text end`,
  contents: `select case when not exists (select 1 from lms_section where section_id = cast(#{section_id} as uuid)) then '{"err":"not_found"}' else coalesce((select json_agg(${CJ} order by s.week_no, s.seq, c.title, c.created_at)
    from lms_content c join lms_session s on s.session_id = c.session_id where s.section_id = cast(#{section_id} as uuid)), '[]')::text end`,
  contentAdd: `with s as (select * from lms_session where session_id = cast(#{session_id} as uuid)),
    c as (insert into lms_content (tenant_id, session_id, title, duration_sec, src, check_at_sec) select current_setting('app.tenant'), s.session_id, #{title}, cast(#{duration_sec} as int), #{src}, least(cast(#{check_at_sec} as int), cast(#{duration_sec} as int)) from s returning *)
    select coalesce((select ${CJ}::text from c, s), '{"err":"not_found"}')`,

  /* 재생 시작: 수강 확인 → 동시 재생(30초 안 하트비트) 차단 → 오래된 재생 종료 → 새 재생 · 이어보기 위치 */
  playStart: `with c as ${CT}, p as ${ENR},
    r as (select coalesce((select block_concurrent from lms_attendance_rule where section_id = (select section_id from c)), true) blk),
    act as (select pl.* from lms_play pl, p where pl.person_id = p.person_id and pl.ended_at is null and pl.last_beat_at > now() - interval '30 seconds'),
    v as (select case when not exists (select 1 from c) then 'not_found' when not exists (select 1 from p) then 'not_enrolled' when (select blk from r) and exists (select 1 from act) then 'concurrent' else 'ok' end r),
    old as (select * from lms_progress where content_id = (select content_id from c) and person_id = (select person_id from p)),
    rp as (select case when coalesce((select last_pos from old), 0) >= (select duration_sec from c) - 5 then 0 else coalesce((select last_pos from old), 0) end pos),
    blk as (insert into lms_play_event (tenant_id, content_id, person_id, kind, pos) select current_setting('app.tenant'), c.content_id, p.person_id, 'blocked', 0 from c, p, v where v.r = 'concurrent' returning 1),
    stale as (update lms_play set ended_at = last_beat_at where person_id = (select person_id from p) and ended_at is null and (select r from v) = 'ok' returning 1),
    np as (insert into lms_play (tenant_id, content_id, person_id, device, ip_masked, last_pos) select current_setting('app.tenant'), c.content_id, p.person_id, ${DEV}, ${IPM}, (select pos from rp) from c, p, v where v.r = 'ok' returning *),
    ev as (insert into lms_play_event (tenant_id, play_id, content_id, person_id, kind, pos) select current_setting('app.tenant'), np.play_id, np.content_id, np.person_id, 'start', np.last_pos from np returning 1),
    pg as (insert into lms_progress (tenant_id, content_id, person_id) select current_setting('app.tenant'), c.content_id, p.person_id from c, p, v where v.r = 'ok' on conflict do nothing returning 1)
    select case when (select r from v) = 'concurrent' then json_build_object('blocked', true, 'reason', 'concurrent', 'logged', (select count(*) from blk))::text
      when (select r from v) <> 'ok' then json_build_object('err', (select r from v))::text else (
      select json_build_object('play_id', np.play_id, 'content_id', c.content_id, 'title', c.title, 'duration_sec', c.duration_sec, 'src', c.src, 'qualities', c.qualities, 'check_at_sec', c.check_at_sec,
        'resume_pos', np.last_pos, 'segments', coalesce((select segments from old), '[]'::jsonb), 'watched_sec', coalesce((select watched_sec from old), 0), 'pct', coalesce((select pct from old), 0),
        'rates', '[1,1.25,1.5,1.75,2]'::json, 'block_concurrent', (select blk from r), 'beat_sec', 10, 'device', np.device, 'ended_stale', (select count(*) from stale))::text from np, c) end`,
  beatCheck: `with pl as (select pl.*, exists (select 1 from lms_play x where x.person_id = pl.person_id and x.play_id <> pl.play_id and x.ended_at is null and x.started_at > pl.started_at) newer from lms_play pl where play_id = cast(#{play_id} as uuid))
    select case when not exists (select 1 from pl) or (#{_me} is not null and (select person_id from pl) is distinct from (select person_id from lms_person where member_no = #{_me})) then '{"err":"not_found"}' when (select ended_at from pl) is not null or (select newer from pl) then '{"err":"play_over"}'
      when cast(#{rate} as numeric) < 1 or cast(#{rate} as numeric) > 2 then '{"err":"bad_rate"}' else '{}' end`,
  /* 재생 로그: 배속 변경 · 10초 넘는 이동(건너뛰기 · 되감기) */
  beatEvents: `with pl as (select * from lms_play where play_id = cast(#{play_id} as uuid)),
    x as (select round(cast(#{rate} as numeric) * 100)::int r100, cast(#{from} as int) f),
    ins as (insert into lms_play_event (tenant_id, play_id, content_id, person_id, kind, pos, from_pos, rate_x100)
      select current_setting('app.tenant'), pl.play_id, pl.content_id, pl.person_id, k.kind, k.pos, k.from_pos, x.r100 from pl, x,
        lateral (values ('rate', x.f, null::int, x.r100 <> pl.rate_x100), ('seek', x.f, pl.last_pos, abs(x.f - pl.last_pos) > 10)) k(kind, pos, from_pos, cond) where k.cond returning kind)
    select json_build_object('events', coalesce((select json_agg(kind order by kind) from ins), '[]'))::text`,
  /* 학습시간: [from, pos] 구간을 벽시계 경과 × 배속 + 3초까지만 인정 → 기존 구간과 병합 → 진도율 · 완료 시각(분반 온라인 인정 진도율) */
  beatSave: `with pl as (select * from lms_play where play_id = cast(#{play_id} as uuid)),
    c as (select ct.*, s.section_id from lms_content ct join lms_session s on s.session_id = ct.session_id where ct.content_id = (select content_id from pl)),
    mp as (select coalesce((select online_min_pct from lms_attendance_rule where section_id = (select section_id from c)), 90) v),
    x as (select greatest(0, least(cast(#{from} as int), c.duration_sec)) f, greatest(0, least(cast(#{pos} as int), c.duration_sec)) ps, cast(#{rate} as numeric) rt, extract(epoch from now() - pl.last_beat_at) el from pl, c),
    cr as (select f, least(ps, f + ceil(el * rt + 3)::int) e from x),
    pg as (select * from lms_progress where content_id = (select content_id from pl) and person_id = (select person_id from pl)),
    segs as (select (sg->>0)::int s, (sg->>1)::int e from pg, jsonb_array_elements(pg.segments) sg union all select f, e from cr where e > f),
    o as (select s, e, max(e) over (order by s, e rows between unbounded preceding and 1 preceding) pm from segs),
    g as (select s, e, sum(case when pm is null or s > pm then 1 else 0 end) over (order by s, e) grp from o),
    m as (select min(s) s, max(e) e from g group by grp),
    agg as (select coalesce(jsonb_agg(jsonb_build_array(s, e) order by s), '[]'::jsonb) segs, coalesce(sum(e - s), 0)::int w from m),
    up as (update lms_progress set segments = agg.segs, watched_sec = agg.w, last_pos = (select ps from x), pct = least(100, floor(100.0 * agg.w / (select duration_sec from c)))::int,
        completed_at = coalesce(completed_at, case when floor(100.0 * agg.w / (select duration_sec from c)) >= (select v from mp) then now() end), updated_at = now()
      from agg where content_id = (select content_id from pl) and person_id = (select person_id from pl) returning lms_progress.*),
    upl as (update lms_play set last_beat_at = now(), last_pos = (select ps from x), rate_x100 = round((select rt from x) * 100)::int, watched_sec = watched_sec + greatest(0, (select e - f from cr)) where play_id = (select play_id from pl) returning 1)
    select json_build_object('play_id', (select play_id from pl), 'credited', greatest(0, (select e - f from cr)), 'watched_sec', up.watched_sec, 'pct', up.pct, 'segments', up.segments, 'completed', up.completed_at is not null, 'beat', (select count(*) from upl))::text from up`,
  playEnd: `with pl as (update lms_play set ended_at = now(), last_pos = coalesce(cast(#{pos} as int), last_pos) where play_id = cast(#{play_id} as uuid) and ended_at is null and (#{_me} is null or person_id = (select person_id from lms_person where member_no = #{_me})) returning *),
    ev as (insert into lms_play_event (tenant_id, play_id, content_id, person_id, kind, pos) select current_setting('app.tenant'), pl.play_id, pl.content_id, pl.person_id, 'end', pl.last_pos from pl returning 1)
    select coalesce((select json_build_object('play_id', play_id, 'watched_sec', watched_sec, 'last_pos', last_pos, 'ended', true)::text from pl), '{"err":"play_over"}')`,

  progress: `with sec as (select section_id from lms_section where section_id = cast(#{section_id} as uuid)),
    ct as (select c.content_id, c.title, c.duration_sec, s.week_no, s.seq from lms_content c join lms_session s on s.session_id = c.session_id join sec on s.section_id = sec.section_id),
    st as (select pe.person_id, pe.member_no, pe.unit_code from lms_enrollment e join sec on e.section_id = sec.section_id join lms_person pe on pe.person_id = e.person_id where e.status = 'enrolled' and e.kind = 'regular')
    select case when not exists (select 1 from sec) then '{"err":"not_found"}' else json_build_object(
      'contents', coalesce((select json_agg(json_build_object('content_id', content_id, 'title', title, 'week_no', week_no, 'seq', seq, 'duration_sec', duration_sec) order by week_no, seq, title) from ct), '[]'),
      'students', coalesce((select json_agg(x order by x.member_no) from (select st.member_no, st.unit_code,
          (select json_agg(coalesce(pg.pct, 0) order by ct.week_no, ct.seq, ct.title) from ct left join lms_progress pg on pg.content_id = ct.content_id and pg.person_id = st.person_id) pcts,
          (select json_agg(coalesce(pg.watched_sec, 0) order by ct.week_no, ct.seq, ct.title) from ct left join lms_progress pg on pg.content_id = ct.content_id and pg.person_id = st.person_id) watched,
          (select coalesce(round(avg(coalesce(pg.pct, 0)))::int, 0) from ct left join lms_progress pg on pg.content_id = ct.content_id and pg.person_id = st.person_id) avg_pct from st) x), '[]'))::text end`,

  /* 자막 파싱(VTT · SRT): 빈 줄로 나눈 블록마다 「시작 --> 끝」 줄 다음 줄들이 대사. 태그 제거, 최대 3000큐 */
  subParse: `with c as (select content_id from lms_content where content_id = cast(#{content_id} as uuid)),
    t as (select replace(replace(coalesce(#{text}, ''), E'\\r\\n', E'\\n'), E'\\r', E'\\n') x),
    b as (select blk, ord from t, regexp_split_to_table(t.x, E'\\n[ \\t]*\\n') with ordinality u(blk, ord)),
    m as (select ord, blk, regexp_match(blk, '((?:\\d{1,2}:)?\\d{1,2}:\\d{2}[.,]\\d{1,3})[ \\t]*-->[ \\t]*((?:\\d{1,2}:)?\\d{1,2}:\\d{2}[.,]\\d{1,3})') tm from b),
    q as (select ord, tm[1] a, tm[2] z, btrim(regexp_replace(regexp_replace(substring(blk from position(tm[2] in blk) + length(tm[2])), '^[^\\n]*(\\n|$)', ''), '<[^>]+>', '', 'g'), E' \\t\\n') tx from m where tm is not null),
    sec as (select q.*, (select sum(p::numeric * power(60::numeric, k.n - i)) from unnest(string_to_array(replace(q.a, ',', '.'), ':')) with ordinality u(p, i), (select cardinality(string_to_array(q.a, ':')) n) k) s,
      (select sum(p::numeric * power(60::numeric, k.n - i)) from unnest(string_to_array(replace(q.z, ',', '.'), ':')) with ordinality u(p, i), (select cardinality(string_to_array(q.z, ':')) n) k) e from q),
    cues as (select coalesce(jsonb_agg(jsonb_build_object('s', round(s, 3)::float8, 'e', round(e, 3)::float8, 't', left(tx, 500)) order by s, ord), '[]'::jsonb) v from (select * from sec where tx <> '' and e > s order by s, ord limit 3000) z),
    up as (insert into lms_subtitle (tenant_id, content_id, lang, format, cues, updated_at) select current_setting('app.tenant'), c.content_id, #{lang}, #{format}, cues.v, now() from c, cues where jsonb_array_length(cues.v) > 0
      on conflict (tenant_id, content_id, lang) do update set format = excluded.format, cues = excluded.cues, updated_at = now() returning *)
    select case when not exists (select 1 from c) then '{"err":"not_found"}' when not exists (select 1 from up) then '{"err":"bad_sub"}' else (select json_build_object('content_id', content_id, 'lang', lang, 'format', format, 'cues', jsonb_array_length(cues), 'first', cues->0)::text from up) end`,
  subCues: `with c as (select content_id from lms_content where content_id = cast(#{content_id} as uuid)),
    j as (select case when jsonb_typeof(cast(#{cues} as jsonb)) = 'array' then cast(#{cues} as jsonb) else '[]'::jsonb end v),
    el as (select e, ord from j, jsonb_array_elements(j.v) with ordinality u(e, ord)),
    ok as (select (select jsonb_array_length(v) from j) between 1 and 3000 and not exists (select 1 from el where jsonb_typeof(e->'s') is distinct from 'number' or jsonb_typeof(e->'e') is distinct from 'number' or jsonb_typeof(e->'t') is distinct from 'string'
      or (e->>'e')::float8 <= (e->>'s')::float8 or (e->>'s')::float8 < 0 or length(e->>'t') > 500) good),
    nv as (select jsonb_agg(jsonb_build_object('s', round((e->>'s')::numeric, 3)::float8, 'e', round((e->>'e')::numeric, 3)::float8, 't', e->>'t') order by (e->>'s')::float8, ord) v from el where (select good from ok)),
    up as (insert into lms_subtitle (tenant_id, content_id, lang, format, cues, updated_at) select current_setting('app.tenant'), c.content_id, #{lang}, 'vtt', nv.v, now() from c, nv where (select good from ok)
      on conflict (tenant_id, content_id, lang) do update set cues = excluded.cues, updated_at = now() returning *)
    select case when not exists (select 1 from c) then '{"err":"not_found"}' when not (select good from ok) then '{"err":"bad_sub"}' else (select json_build_object('content_id', content_id, 'lang', lang, 'format', format, 'cues', jsonb_array_length(cues))::text from up) end`,
  subs: `select case when not exists (select 1 from lms_content where content_id = cast(#{content_id} as uuid)) then '{"err":"not_found"}' else coalesce((select json_agg(json_build_object('lang', lang, 'format', format, 'cues', cues, 'updated_at', lms_ts(updated_at)) order by lang)
    from lms_subtitle where content_id = cast(#{content_id} as uuid)), '[]')::text end`,

  /* 영상 중간 퀴즈 — 만들 때 분반 성적 항목 「영상 퀴즈」(source_ref lms_i:video_quiz)를 준비 */
  quizAdd: `with c as ${CT},
    o as (select case when jsonb_typeof(cast(#{options} as jsonb)) = 'array' then cast(#{options} as jsonb) else '[]'::jsonb end v),
    v as (select case when not exists (select 1 from c) then 'not_found' when jsonb_array_length((select v from o)) not between 2 and 6
      or exists (select 1 from o, jsonb_array_elements(o.v) x where jsonb_typeof(x) <> 'string' or length(x #>> '{}') not between 1 and 200) then 'bad_input'
      when cast(#{answer} as int) >= jsonb_array_length((select v from o)) then 'bad_choice' when cast(#{at_sec} as int) > (select duration_sec from c) then 'bad_input' else 'ok' end r),
    q as (insert into lms_video_quiz (tenant_id, content_id, at_sec, question, options, answer, points) select current_setting('app.tenant'), c.content_id, cast(#{at_sec} as int), #{question}, o.v, cast(#{answer} as int), cast(#{points} as int) from c, o, v where v.r = 'ok' returning *),
    gi as (insert into lms_grade_item (tenant_id, section_id, category, name, weight_pct, max_score, source_ref) select current_setting('app.tenant'), c.section_id, 'quiz', '영상 퀴즈', 0, 100, 'lms_i:video_quiz' from c, v
      where v.r = 'ok' and not exists (select 1 from lms_grade_item g where g.section_id = c.section_id and g.source_ref = 'lms_i:video_quiz') returning 1)
    select case when (select r from v) <> 'ok' then json_build_object('err', (select r from v))::text else (select json_build_object('quiz_id', quiz_id, 'content_id', content_id, 'at_sec', at_sec, 'question', question, 'options', options, 'answer', answer, 'points', points, 'grade_item_created', (select count(*) from gi))::text from q) end`,
  quizzes: `select case when not exists (select 1 from lms_content where content_id = cast(#{content_id} as uuid)) then '{"err":"not_found"}' else coalesce((select json_agg(json_build_object('quiz_id', q.quiz_id, 'at_sec', q.at_sec, 'question', q.question, 'options', q.options, 'answer', case when #{_me} is null or exists (select 1 from lms_video_quiz_answer a join lms_person pe on pe.person_id = a.person_id where a.quiz_id = q.quiz_id and pe.member_no = #{_me}) then q.answer end, 'points', q.points,
      'mine', (select json_build_object('choice', a.choice, 'correct', a.correct) from lms_video_quiz_answer a join lms_person pe on pe.person_id = a.person_id where a.quiz_id = q.quiz_id and pe.member_no = #{member_no}),
      'answered', (select count(*) from lms_video_quiz_answer a where a.quiz_id = q.quiz_id), 'correct_rate', (select coalesce(round(100.0 * count(*) filter (where correct) / nullif(count(*), 0))::int, 0) from lms_video_quiz_answer a where a.quiz_id = q.quiz_id)) order by q.at_sec, q.question)
    from lms_video_quiz q where q.content_id = cast(#{content_id} as uuid)), '[]')::text end`,
  quizAnswer: `with q as (select vq.*, s.section_id from lms_video_quiz vq join lms_content c on c.content_id = vq.content_id join lms_session s on s.session_id = c.session_id where vq.quiz_id = cast(#{quiz_id} as uuid)),
    c as (select section_id from q), p as ${ENR},
    v as (select case when not exists (select 1 from q) then 'not_found' when not exists (select 1 from p) then 'not_enrolled'
      when exists (select 1 from lms_video_quiz_answer a where a.quiz_id = (select quiz_id from q) and a.person_id = (select person_id from p)) then 'answered'
      when cast(#{choice} as int) >= jsonb_array_length((select options from q)) then 'bad_choice' else 'ok' end r),
    ins as (insert into lms_video_quiz_answer (tenant_id, quiz_id, person_id, choice, correct) select current_setting('app.tenant'), q.quiz_id, p.person_id, cast(#{choice} as int), cast(#{choice} as int) = q.answer from q, p, v where v.r = 'ok' returning *),
    ev as (insert into lms_play_event (tenant_id, content_id, person_id, kind, pos) select current_setting('app.tenant'), q.content_id, ins.person_id, 'quiz', q.at_sec from q, ins returning 1),
    allq as (select vq.quiz_id, vq.points from lms_video_quiz vq join lms_content c on c.content_id = vq.content_id join lms_session s on s.session_id = c.session_id where s.section_id = (select section_id from q)),
    sc as (select round(100.0 * (coalesce((select sum(allq.points) from allq join lms_video_quiz_answer a on a.quiz_id = allq.quiz_id and a.person_id = (select person_id from p) and a.correct), 0)
        + coalesce((select q.points from q, ins where ins.correct), 0)) / greatest((select sum(points) from allq), 1), 2) v),
    gs as (insert into lms_grade_score (tenant_id, item_id, person_id, score, feedback, graded_at) select current_setting('app.tenant'), g.item_id, ins.person_id, (select v from sc), '영상 퀴즈 자동 반영', now()
      from ins, lms_grade_item g where g.section_id = (select section_id from q) and g.source_ref = 'lms_i:video_quiz'
      on conflict (tenant_id, item_id, person_id) do update set score = excluded.score, feedback = excluded.feedback, graded_at = now() returning score)
    select case when (select r from v) <> 'ok' then json_build_object('err', (select r from v))::text else (select json_build_object('quiz_id', ins.quiz_id, 'choice', ins.choice, 'correct', ins.correct, 'answer', (select answer from q), 'score', (select v from sc)::float8, 'graded', (select count(*) from gs))::text from ins) end`,

  /* 원격수업 학습분량: 차시 콘텐츠 재생시간 + 지정 학습시간 ≥ 차시 기준(지정 없으면 25분) */
  workload: `with sec as (select * from lms_section where section_id = cast(#{section_id} as uuid)),
    k as (select c.session_id, count(*) n, sum(c.duration_sec)::int cs from lms_content c group by c.session_id),
    w as (select s.session_id, s.week_no, s.seq, s.kind, coalesce(k.n, 0)::int n, coalesce(k.cs, 0) cs, s.extra_study_sec ex, case when s.required_sec > 0 then s.required_sec else 1500 end req
      from lms_session s join sec on s.section_id = sec.section_id left join k on k.session_id = s.session_id where s.kind <> 'holiday' and (sec.mode <> 'offline' or s.kind = 'online'))
    select case when not exists (select 1 from sec) then '{"err":"not_found"}' else json_build_object('sessions', coalesce((select json_agg(json_build_object('session_id', session_id, 'week_no', week_no, 'seq', seq, 'kind', kind, 'contents', n, 'content_sec', cs, 'extra_study_sec', ex,
      'total_sec', cs + ex, 'required_sec', req, 'short_sec', greatest(0, req - cs - ex), 'short', cs + ex < req) order by week_no, seq) from w), '[]'), 'short_count', (select count(*) from w where cs + ex < req), 'standard', '차시당 콘텐츠 재생시간 + 지정 학습시간 ≥ 기준(지정 없으면 25분)')::text end`,

  history: `with sec as (select section_id from lms_section where section_id = cast(#{section_id} as uuid)),
    who as (select person_id from lms_person where member_no = #{member_no}),
    pl as (select pl.*, c.title, s.week_no from lms_play pl join lms_content c on c.content_id = pl.content_id join lms_session s on s.session_id = c.session_id join sec on s.section_id = sec.section_id
      where #{member_no} is null or pl.person_id = (select person_id from who) order by pl.started_at desc limit 1000),
    ac as (select a.* from lms_activity a join sec on a.section_id = sec.section_id where #{member_no} is null or a.person_id = (select person_id from who) order by a.at desc limit 1000)
    select case when not exists (select 1 from sec) then '{"err":"not_found"}' else json_build_object(
      'plays', coalesce((select json_agg(json_build_object('member_no', pe.member_no, 'content_title', pl.title, 'week_no', pl.week_no, 'device', pl.device, 'ip_masked', pl.ip_masked, 'started_at', lms_ts(pl.started_at), 'ended_at', lms_ts(pl.ended_at),
        'last_beat_at', lms_ts(pl.last_beat_at), 'watched_sec', pl.watched_sec, 'rate', pl.rate_x100 / 100.0) order by pl.started_at desc, pe.member_no) from pl join lms_person pe on pe.person_id = pl.person_id), '[]'),
      'activities', coalesce((select json_agg(json_build_object('member_no', pe.member_no, 'kind', ac.kind, 'ref', ac.ref, 'device', ac.device, 'ip_masked', ac.ip_masked, 'at', lms_ts(ac.at)) order by ac.at desc, pe.member_no, ac.kind) from ac join lms_person pe on pe.person_id = ac.person_id), '[]'),
      'events', coalesce((select json_object_agg(kind, n) from (select e.kind, count(*) n from lms_play_event e join lms_content c on c.content_id = e.content_id join lms_session s on s.session_id = c.session_id join sec on s.section_id = sec.section_id
        where #{member_no} is null or e.person_id = (select person_id from who) group by e.kind order by e.kind) z), '{}'))::text end`,
  /* 학습자 「내 강의 영상 · 진도」 */
  my: `with me as (select person_id from lms_person where member_no = #{member_no}),
    en as (select e.section_id from lms_enrollment e, me where e.person_id = me.person_id and e.status = 'enrolled')
    select json_build_object('member_no', #{member_no}, 'found', exists (select 1 from me), 'sections', coalesce((select json_agg(json_build_object('section_id', s.section_id, 'title', s.title, 'term_id', s.term_id,
      'contents', (select coalesce(json_agg(json_build_object('content_id', c.content_id, 'week_no', ss.week_no, 'seq', ss.seq, 'title', c.title, 'duration_sec', c.duration_sec, 'open_at', lms_ts(ss.open_at), 'close_at', lms_ts(ss.close_at),
          'pct', coalesce(pg.pct, 0), 'watched_sec', coalesce(pg.watched_sec, 0), 'last_pos', coalesce(pg.last_pos, 0), 'completed', pg.completed_at is not null,
          'subtitles', (select coalesce(json_agg(sb.lang order by sb.lang), '[]') from lms_subtitle sb where sb.content_id = c.content_id), 'quizzes', (select count(*) from lms_video_quiz q where q.content_id = c.content_id)) order by ss.week_no, ss.seq, c.title), '[]')
        from lms_content c join lms_session ss on ss.session_id = c.session_id left join lms_progress pg on pg.content_id = c.content_id and pg.person_id = (select person_id from me) where ss.section_id = s.section_id),
      'avg_pct', (select coalesce(round(avg(coalesce(pg.pct, 0)))::int, 0) from lms_content c join lms_session ss on ss.session_id = c.session_id left join lms_progress pg on pg.content_id = c.content_id and pg.person_id = (select person_id from me) where ss.section_id = s.section_id))
      order by s.term_id desc, s.course_code, s.section_no) from en join lms_section s on s.section_id = en.section_id), '[]'))::text`,
  activity: `with c as (select section_id from lms_section where section_id = cast(#{section_id} as uuid)), p as ${ENR},
    ins as (insert into lms_activity (tenant_id, section_id, person_id, kind, ref, device, ip_masked) select current_setting('app.tenant'), c.section_id, p.person_id, #{kind}, #{ref}, ${DEV}, ${IPM} from c, p returning *)
    select case when not exists (select 1 from c) then '{"err":"not_found"}' when not exists (select 1 from ins) then '{"err":"not_enrolled"}' else (select json_build_object('kind', kind, 'ref', ref, 'device', device, 'ip_masked', ip_masked, 'at', lms_ts(at))::text from ins) end`
};

const SPEC = [
  { m: 'POST', p: '/api/lms/i/seed', params: [['section_id', 'uuid', 1]], stmts: ['seed'], audit: 'lms.i.seed' },
  { m: 'GET', p: '/api/lms/i/contents', params: [['section_id', 'uuid', 1]], stmts: ['contents'] },
  { m: 'POST', p: '/api/lms/i/content', params: [['session_id', 'uuid', 1], ['title', 'text', 1, 120], ['duration_sec', 'int', 1, 1, 36000], ['src', 'text', 0, 500], ['check_at_sec', 'int', 0, 0, 36000]], stmts: ['contentAdd'], audit: 'lms.i.content' },
  { m: 'POST', p: '/api/lms/i/play/start', who: 'any', limit: ['lmsi-ps', 120, 60000], params: [['content_id', 'uuid', 1], ['member_no', 'mno', 1]], stmts: ['playStart'] },
  { m: 'POST', p: '/api/lms/i/play/beat', who: 'any', limit: ['lmsi-pb', 600, 60000], params: [['play_id', 'uuid', 1], ['from', 'int', 1, 0, 36000], ['pos', 'int', 1, 0, 36000], ['rate', 'num', 1, 0.0625, 16]], stmts: ['beatCheck', 'beatEvents', 'beatSave'] },
  { m: 'POST', p: '/api/lms/i/play/end', who: 'any', params: [['play_id', 'uuid', 1], ['pos', 'int', 0, 0, 36000]], stmts: ['playEnd'] },
  { m: 'GET', p: '/api/lms/i/progress', params: [['section_id', 'uuid', 1]], stmts: ['progress'] },
  { m: 'POST', p: '/api/lms/i/subtitle', max: 400000, params: [['content_id', 'uuid', 1], ['lang', 'enum', 1, ['ko', 'en', 'ja', 'zh', 'vi', 'uz', 'mn', 'ru', 'es', 'fr', 'de', 'id', 'th', 'ne']], ['format', 'enum', 1, ['vtt', 'srt']], ['text', 'text', 1, 300000]], stmts: ['subParse'], audit: 'lms.i.subtitle' },
  { m: 'POST', p: '/api/lms/i/subtitle/cues', max: 400000, params: [['content_id', 'uuid', 1], ['lang', 'enum', 1, ['ko', 'en', 'ja', 'zh', 'vi', 'uz', 'mn', 'ru', 'es', 'fr', 'de', 'id', 'th', 'ne']], ['cues', 'json', 1, 350000]], stmts: ['subCues'], audit: 'lms.i.subtitle' },
  { m: 'GET', p: '/api/lms/i/subtitles', who: 'any', params: [['content_id', 'uuid', 1]], stmts: ['subs'] },
  { m: 'POST', p: '/api/lms/i/quiz', params: [['content_id', 'uuid', 1], ['at_sec', 'int', 1, 0, 36000], ['question', 'text', 1, 300], ['options', 'json', 1, 2000], ['answer', 'int', 1, 0, 5], ['points', 'int', 0, 1, 10, 1]], stmts: ['quizAdd'], audit: 'lms.i.quiz' },
  { m: 'GET', p: '/api/lms/i/quizzes', who: 'any', params: [['content_id', 'uuid', 1], ['member_no', 'mno']], stmts: ['quizzes'] },
  { m: 'POST', p: '/api/lms/i/quiz/answer', who: 'any', params: [['quiz_id', 'uuid', 1], ['member_no', 'mno', 1], ['choice', 'int', 1, 0, 5]], stmts: ['quizAnswer'] },
  { m: 'GET', p: '/api/lms/i/workload', params: [['section_id', 'uuid', 1]], stmts: ['workload'] },
  { m: 'GET', p: '/api/lms/i/history', params: [['section_id', 'uuid', 1], ['member_no', 'mno']], stmts: ['history'] },
  { m: 'GET', p: '/api/lms/i/my', who: 'any', params: [['member_no', 'mno', 1]], stmts: ['my'] },
  { m: 'POST', p: '/api/lms/i/activity', who: 'any', limit: ['lmsi-ac', 300, 60000], params: [['section_id', 'uuid', 1], ['member_no', 'mno', 1], ['kind', 'enum', 1, ['view_notice', 'view_material', 'download', 'submit_assignment', 'post', 'comment', 'quiz', 'exam', 'live_join', 'page']], ['ref', 'text', 0, 200]], stmts: ['activity'] }
];

module.exports = ctx => engine(ctx, SPEC, SQL);
module.exports.SPEC = SPEC;
module.exports.SQL = SQL;
