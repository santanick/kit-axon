'use strict';
/* v30 학사 LMS 묶음 J — 학습 분석(SFR-028 · 029 · 078)
   학습 부진 복합 지표(lms_j_comps: 성적 · 출결 · LMS 참여 · 비교과) · 현재 상태 + 추이 · 2주 뒤 예측(최근 8개 기록 최소제곱) · 중도이탈 가능성(로지스틱),
   조기 경고 규칙 · 대상 추출, 그룹(학과 · 학년)별 학습 패턴 인사이트, 교수자 · 학습자 맞춤 피드백(규칙 초안 → 화면에서 서버 AI 게이트웨이로 다듬기),
   학습 성찰일지 · 교수 코멘트, 학습활동 보고서(교수 화면 · 학생 화면 모드). 날짜는 한국 시각 기준.
   실행기 · 규약은 mod-g.js(engine). Java 매퍼 lms_j.xml은 이 SQL과 글자 그대로 같아야 한다(test/lms-j.js). */
const { engine } = require('./mod-g');
const KD = `(now() at time zone 'Asia/Seoul')::date`;
const SEC = `cast(#{section_id} as uuid)`;
const LV = r => `case when ${r} >= 50 then 'danger' when ${r} >= 30 then 'warn' else 'ok' end`;
/* 위험지수 + 추이 + 예측(공용 CTE 머리) */
const RISK = `c as (select * from lms_j_comps(${SEC})),
    h as (select sn.person_id, sn.day, sn.risk::int risk from lms_risk_snapshot sn where sn.section_id = ${SEC} and sn.day < ${KD} union all select person_id, ${KD}, risk from c),
    h8 as (select * from (select h.*, row_number() over (partition by person_id order by day desc) rn from h) z where rn <= 8),
    reg as (select person_id, regr_slope(risk, day - date '2026-01-01') sl, regr_intercept(risk, day - date '2026-01-01') ic, count(*) n from h8 group by person_id),
    pr as (select c.*, case when reg.n >= 2 and reg.sl is not null then greatest(0, least(100, round(reg.ic + reg.sl * ((${KD} + 14) - date '2026-01-01'))))::int else c.risk end pred from c left join reg on reg.person_id = c.person_id),
    rk as (select pr.*, ${LV('pr.risk')} level, round(100 / (1 + exp(-(pr.pred - 50) / 8.0)))::int dropout from pr)`;
const RULES = `rl as (select name, metric, op, threshold::int threshold, level from lms_risk_rule where active
      union all select * from (values ('위험지수 50 이상', 'risk', 'gte', 50, 'danger'), ('출석률 75% 이하', 'attendance', 'lte', 75, 'warn'), ('진도율 50% 이하', 'participation', 'lte', 50, 'warn')) d(name, metric, op, threshold, level)
      where not exists (select 1 from lms_risk_rule))`;
const MV = `case rl.metric when 'risk' then rk.risk when 'grade' then rk.grade when 'attendance' then rk.attendance when 'participation' then rk.participation when 'extra' then rk.extra when 'dropout' then rk.dropout end`;
const NF = `'{"err":"not_found"}'`;
const HAS = `exists (select 1 from lms_section where section_id = ${SEC})`;

const SQL = {
  risk: `with ${RISK}
    select case when not ${HAS} then ${NF} else json_build_object('weights', json_build_object('grade', 35, 'attendance', 30, 'participation', 25, 'extra', 10),
      'extra_source', case when to_regclass('lms_extra_participation') is null then 'none' else 'lms_extra_participation' end,
      'summary', json_build_object('danger', (select count(*) from rk where level = 'danger'), 'warn', (select count(*) from rk where level = 'warn'), 'ok', (select count(*) from rk where level = 'ok'), 'avg_risk', coalesce((select round(avg(risk))::int from rk), 0)),
      'students', coalesce((select json_agg(json_build_object('member_no', rk.member_no, 'unit_code', rk.unit_code, 'grade_year', rk.grade_year, 'grade', rk.grade, 'attendance', rk.attendance, 'participation', rk.participation, 'extra', rk.extra,
        'risk', rk.risk, 'level', rk.level, 'predicted', rk.pred, 'dropout_pct', rk.dropout,
        'trend', (select json_agg(json_build_object('day', to_char(h8.day, 'YYYY-MM-DD'), 'risk', h8.risk) order by h8.day) from h8 where h8.person_id = rk.person_id)) order by rk.risk desc, rk.member_no) from rk), '[]'))::text end`,
  snapshot: `with c as (select * from lms_j_comps(${SEC})),
    up as (insert into lms_risk_snapshot (tenant_id, section_id, person_id, day, risk, comps) select current_setting('app.tenant'), ${SEC}, person_id, ${KD}, risk, jsonb_build_object('grade', grade, 'attendance', attendance, 'participation', participation, 'extra', extra) from c
      on conflict (tenant_id, section_id, person_id, day) do update set risk = excluded.risk, comps = excluded.comps returning 1)
    select case when not ${HAS} then ${NF} else json_build_object('day', to_char(${KD}, 'YYYY-MM-DD'), 'saved', (select count(*) from up))::text end`,
  rules: `select coalesce(json_agg(json_build_object('rule_id', rule_id, 'name', name, 'metric', metric, 'op', op, 'threshold', threshold, 'level', level, 'active', active) order by created_at, name), '[]')::text from lms_risk_rule`,
  ruleSet: `with up as (insert into lms_risk_rule (tenant_id, rule_id, name, metric, op, threshold, level, active) values (current_setting('app.tenant'), coalesce(cast(#{rule_id} as uuid), gen_random_uuid()), #{name}, #{metric}, #{op}, cast(#{threshold} as int), #{level}, cast(#{active} as boolean))
      on conflict (tenant_id, rule_id) do update set name = excluded.name, metric = excluded.metric, op = excluded.op, threshold = excluded.threshold, level = excluded.level, active = excluded.active returning *)
    select json_build_object('rule_id', rule_id, 'name', name, 'metric', metric, 'op', op, 'threshold', threshold, 'level', level, 'active', active)::text from up`,
  ruleDel: `with d as (delete from lms_risk_rule where rule_id = cast(#{rule_id} as uuid) returning 1) select case when exists (select 1 from d) then '{"deleted":1}' else ${NF} end`,
  targets: `with ${RISK}, ${RULES},
    hit as (select rk.person_id, rl.name, rl.level from rk, rl where (${MV}) is not null and ((rl.op = 'gte' and (${MV}) >= rl.threshold) or (rl.op = 'lte' and (${MV}) <= rl.threshold)))
    select case when not ${HAS} then ${NF} else json_build_object('rules', (select json_agg(json_build_object('name', name, 'metric', metric, 'op', op, 'threshold', threshold, 'level', level) order by name) from rl),
      'targets', coalesce((select json_agg(x order by x.lv desc, x.risk desc, x.member_no) from (select rk.member_no, rk.unit_code, rk.risk, rk.dropout dropout_pct, rk.attendance, rk.participation, rk.grade,
        case when bool_or(hit.level = 'danger') then 'danger' else 'warn' end level, max(case when hit.level = 'danger' then 2 else 1 end) lv, json_agg(hit.name order by hit.name) matched
        from rk join hit on hit.person_id = rk.person_id group by rk.person_id, rk.member_no, rk.unit_code, rk.risk, rk.dropout, rk.attendance, rk.participation, rk.grade) x), '[]'))::text end`,
  /* 그룹별 학습 패턴 인사이트(학과 · 학년) */
  insights: `with ${RISK},
    gu as (select coalesce(unit_code, '미지정') g, count(*)::int n, round(avg(risk))::int risk, round(avg(attendance))::int attendance, round(avg(participation))::int participation, round(avg(grade))::int grade, count(*) filter (where level = 'danger')::int danger from rk group by 1),
    gy as (select coalesce(grade_year::text || '학년', '미지정') g, count(*)::int n, round(avg(risk))::int risk, round(avg(attendance))::int attendance, round(avg(participation))::int participation, round(avg(grade))::int grade, count(*) filter (where level = 'danger')::int danger from rk group by 1),
    lo as (select round(avg(grade))::int g from rk where participation < 50), hi as (select round(avg(grade))::int g from rk where participation >= 50),
    pt as (select t, o from (
      select '학과별 위험지수가 가장 높은 그룹은 ' || g || '(평균 ' || risk || ', ' || n || '명)입니다.' t, 1 o from (select * from gu order by risk desc, g limit 1) a where (select count(*) from gu) > 1
      union all select '학년별 출석률은 ' || g || '이 평균 ' || attendance || '%로 가장 낮습니다.', 2 from (select * from gy where attendance is not null order by attendance, g limit 1) b where (select count(*) from gy) > 1
      union all select '진도율 50% 미만 학생의 평균 성적은 ' || lo.g || '점으로 나머지(' || hi.g || '점)보다 ' || (hi.g - lo.g) || '점 낮습니다.', 3 from lo, hi where lo.g is not null and hi.g is not null and hi.g > lo.g
      union all select '위험 등급 학생이 ' || count(*) || '명입니다. 개별 상담 · 튜터링 연계를 권합니다.', 4 from rk where level = 'danger' having count(*) > 0) z)
    select case when not ${HAS} then ${NF} else json_build_object('by_unit', coalesce((select json_agg(gu order by g) from gu), '[]'), 'by_year', coalesce((select json_agg(gy order by g) from gy), '[]'),
      'patterns', coalesce((select json_agg(t order by o) from pt), '[]'))::text end`,
  /* 맞춤 피드백 규칙 초안(학생 · 교수, 학생 지정 없으면 분반 요약) — AI 다듬기는 화면에서 서버 AI 게이트웨이(/api/ai/messages) */
  feedback: `with ${RISK},
    me as (select * from rk where member_no = #{member_no}),
    v as (select case when not ${HAS} then 'not_found' when #{member_no} is not null and not exists (select 1 from me) then 'not_enrolled' when #{member_no} is null and #{audience} = 'student' then 'required' else 'ok' end r),
    tx as (select case when #{member_no} is null then concat_ws(E'\\n',
        '분반 학습 현황 요약: 위험 ' || (select count(*) from rk where level = 'danger') || '명 · 주의 ' || (select count(*) from rk where level = 'warn') || '명 · 양호 ' || (select count(*) from rk where level = 'ok') || '명.',
        '평균 출석률 ' || coalesce((select round(avg(attendance))::text from rk), '-') || '% · 평균 진도율 ' || coalesce((select round(avg(participation))::text from rk), '-') || '% · 평균 성적 ' || coalesce((select round(avg(grade))::text from rk), '-') || '점.',
        (select '중도이탈 가능성이 높은 학생: ' || string_agg(member_no || '(' || dropout || '%)', ', ' order by dropout desc, member_no) from (select * from rk where dropout >= 50 order by dropout desc, member_no limit 5) d),
        '권장 조치: 위험 학생 개별 면담 · 학습 튜터링 연계, 진도 부족 학생에게 주차 마감 전 안내, 다음 주 수업 초반 핵심 개념 복습.')
      when #{audience} = 'professor' then concat_ws(E'\\n',
        '학생 ' || m.member_no || ': 위험지수 ' || m.risk || '(' || case m.level when 'danger' then '위험' when 'warn' then '주의' else '양호' end || ') · 2주 뒤 예측 ' || m.pred || ' · 중도이탈 가능성 ' || m.dropout || '%.',
        '지표: 출석 ' || coalesce(m.attendance::text, '-') || '% · 진도 ' || coalesce(m.participation::text, '-') || '% · 성적 ' || coalesce(m.grade::text, '-') || '점 · 비교과 ' || m.extra || '점.',
        case when m.level = 'danger' then '권장 조치: 이번 주 안에 면담을 요청하고 학습 계획을 함께 세우세요.' when m.level = 'warn' then '권장 조치: 격려 메시지와 미수강 차시 안내를 보내세요.' else '권장 조치: 현재 학습 흐름을 칭찬해 동기를 유지하세요.' end)
      else concat_ws(E'\\n', '학번 ' || m.member_no || ' 학생, 이번 주 학습 상태를 안내드립니다.',
        case when m.attendance is null then null when m.attendance < 80 then '출석률이 ' || m.attendance || '%입니다. 남은 수업에 빠짐없이 참여해 주세요(결석이 수업의 1/4을 넘으면 학점 취득이 어려울 수 있습니다).' else '출석률 ' || m.attendance || '%로 잘 유지하고 있습니다.' end,
        case when m.participation is null then null when m.participation < 60 then '온라인 강의 진도율이 ' || m.participation || '%입니다. 듣지 않은 차시를 주차 학습 기간 안에 들어 주세요.' else '온라인 강의 진도율 ' || m.participation || '%로 좋습니다.' end,
        case when m.grade is not null and m.grade < 60 then '평가 점수 평균이 ' || m.grade || '점입니다. 질의응답 게시판과 학습 튜터링을 활용해 보세요.' end,
        case when m.extra = 0 then '비교과 프로그램 참여 기록이 없습니다. 관심 분야 프로그램 참여를 권합니다.' end,
        case when m.level = 'danger' then '교수님과 상담을 권합니다. 함께 학습 계획을 세워 보세요.' when m.level = 'warn' then '조금만 더 힘내면 충분히 따라잡을 수 있습니다.' else '지금처럼 꾸준히 학습해 주세요.' end) end t
      from (select 1) k left join me m on true),
    ins as (insert into lms_feedback (tenant_id, section_id, person_id, audience, body, source, actor) select current_setting('app.tenant'), ${SEC}, (select person_id from me), #{audience}, tx.t, 'rule', #{_actor} from tx, v where v.r = 'ok' returning *)
    select case when (select r from v) <> 'ok' then json_build_object('err', (select r from v))::text else (select json_build_object('id', id, 'member_no', #{member_no}, 'audience', audience, 'source', source, 'body', body, 'created_at', lms_ts(created_at))::text from ins) end`,
  feedbackSave: `with me as (select pe.person_id from lms_person pe join lms_enrollment e on e.person_id = pe.person_id and e.section_id = ${SEC} where pe.member_no = #{member_no}),
    v as (select case when not ${HAS} then 'not_found' when #{member_no} is not null and not exists (select 1 from me) then 'not_enrolled' else 'ok' end r),
    ins as (insert into lms_feedback (tenant_id, section_id, person_id, audience, body, source, actor) select current_setting('app.tenant'), ${SEC}, (select person_id from me), #{audience}, #{body}, #{source}, #{_actor} from v where v.r = 'ok' returning *)
    select case when (select r from v) <> 'ok' then json_build_object('err', (select r from v))::text else (select json_build_object('id', id, 'member_no', #{member_no}, 'audience', audience, 'source', source, 'body', body, 'created_at', lms_ts(created_at))::text from ins) end`,
  feedbacks: `select case when not ${HAS} then ${NF} else coalesce((select json_agg(json_build_object('id', f.id, 'member_no', pe.member_no, 'audience', f.audience, 'source', f.source, 'body', f.body, 'actor', f.actor, 'created_at', lms_ts(f.created_at)) order by f.created_at desc, f.source)
    from lms_feedback f left join lms_person pe on pe.person_id = f.person_id where f.section_id = ${SEC} and (#{member_no} is null or pe.member_no = #{member_no})), '[]')::text end`,
  /* 학습 성찰일지 */
  reflAdd: `with me as (select pe.person_id from lms_person pe join lms_enrollment e on e.person_id = pe.person_id and e.section_id = ${SEC} and e.status = 'enrolled' where pe.member_no = #{member_no}),
    ins as (insert into lms_reflection (tenant_id, section_id, person_id, week_no, body, mood) select current_setting('app.tenant'), ${SEC}, me.person_id, cast(#{week_no} as int), #{body}, cast(#{mood} as int) from me returning *)
    select case when not ${HAS} then ${NF} when not exists (select 1 from ins) then '{"err":"not_enrolled"}' else (select json_build_object('id', id, 'member_no', #{member_no}, 'week_no', week_no, 'body', body, 'mood', mood, 'created_at', lms_ts(created_at))::text from ins) end`,
  reflList: `select case when not ${HAS} then ${NF} else coalesce((select json_agg(json_build_object('id', r.id, 'member_no', pe.member_no, 'week_no', r.week_no, 'body', r.body, 'mood', r.mood, 'comment', r.comment, 'commented_by', r.commented_by, 'commented_at', lms_ts(r.commented_at), 'created_at', lms_ts(r.created_at)) order by r.week_no desc, r.created_at desc, pe.member_no)
    from lms_reflection r join lms_person pe on pe.person_id = r.person_id where r.section_id = ${SEC} and (#{member_no} is null or pe.member_no = #{member_no})), '[]')::text end`,
  reflComment: `with u as (update lms_reflection set comment = #{comment}, commented_by = #{_actor}, commented_at = now() where id = cast(#{id} as uuid) returning *)
    select coalesce((select json_build_object('id', id, 'week_no', week_no, 'comment', comment, 'commented_at', lms_ts(commented_at))::text from u), ${NF})`,
  /* 학습활동 보고서(교수 화면 · 학생 화면) */
  report: `with ${RISK}, me as (select * from rk where member_no = #{member_no}),
    ss as (select s.* from lms_session s where s.section_id = ${SEC}),
    att as (select a.status, count(*)::int n from lms_attendance a join ss on ss.session_id = a.session_id where a.person_id = (select person_id from me) group by a.status),
    pg as (select c.title, ss.week_no, coalesce(p.pct, 0) pct, coalesce(p.watched_sec, 0) w from lms_content c join ss on ss.session_id = c.session_id left join lms_progress p on p.content_id = c.content_id and p.person_id = (select person_id from me))
    select case when not ${HAS} then ${NF} when not exists (select 1 from me) then '{"err":"not_enrolled"}' else json_build_object(
      'member_no', (select member_no from me), 'unit_code', (select unit_code from me), 'view', #{view},
      'section', (select json_build_object('title', title, 'term_id', term_id) from lms_section where section_id = ${SEC}),
      'status', (select json_build_object('risk', risk, 'level', level, 'grade', grade, 'attendance', attendance, 'participation', participation, 'extra', extra, 'predicted', pred,
          'dropout_pct', case when #{view} = 'student' then null else dropout end, 'trend', (select json_agg(json_build_object('day', to_char(h8.day, 'YYYY-MM-DD'), 'risk', h8.risk) order by h8.day) from h8 where h8.person_id = me.person_id)) from me),
      'attendance', json_build_object('present', coalesce((select n from att where status = 'present'), 0), 'late', coalesce((select n from att where status = 'late'), 0), 'absent', coalesce((select n from att where status = 'absent'), 0), 'excused', coalesce((select n from att where status = 'excused'), 0)),
      'progress', json_build_object('contents', (select count(*) from pg), 'done', (select count(*) from pg where pct >= 90), 'avg_pct', coalesce((select round(avg(pct))::int from pg), 0), 'watched_sec', coalesce((select sum(w)::int from pg), 0)),
      'quiz_score', (select gs.score::float8 from lms_grade_score gs join lms_grade_item gi on gi.item_id = gs.item_id where gi.section_id = ${SEC} and gi.source_ref = 'lms_i:video_quiz' and gs.person_id = (select person_id from me)),
      'activities', coalesce((select json_object_agg(kind, n) from (select kind, count(*)::int n from lms_activity where section_id = ${SEC} and person_id = (select person_id from me) group by kind order by kind) a), '{}'),
      'reflections', (select count(*) from lms_reflection where section_id = ${SEC} and person_id = (select person_id from me)),
      'feedback', (select json_build_object('body', body, 'source', source, 'created_at', lms_ts(created_at)) from lms_feedback where section_id = ${SEC} and person_id = (select person_id from me) and audience = 'student' order by created_at desc limit 1))::text end`
};

const AUD = ['professor', 'student'];
const SPEC = [
  { m: 'GET', p: '/api/lms/j/risk', params: [['section_id', 'uuid', 1]], stmts: ['risk'] },
  { m: 'POST', p: '/api/lms/j/snapshot', params: [['section_id', 'uuid', 1]], stmts: ['snapshot'], audit: 'lms.j.snapshot' },
  { m: 'GET', p: '/api/lms/j/rules', stmts: ['rules'] },
  { m: 'POST', p: '/api/lms/j/rule', roles: 'staff', params: [['rule_id', 'uuid'], ['name', 'text', 1, 60], ['metric', 'enum', 1, ['risk', 'grade', 'attendance', 'participation', 'extra', 'dropout']], ['op', 'enum', 1, ['gte', 'lte']], ['threshold', 'int', 1, 0, 100], ['level', 'enum', 1, ['warn', 'danger']], ['active', 'bool', 0, 0, 0, 'true']], stmts: ['ruleSet'], audit: 'lms.j.rule' },
  { m: 'POST', p: '/api/lms/j/rule/delete', roles: 'staff', params: [['rule_id', 'uuid', 1]], stmts: ['ruleDel'], audit: 'lms.j.rule.delete' },
  { m: 'GET', p: '/api/lms/j/targets', params: [['section_id', 'uuid', 1]], stmts: ['targets'] },
  { m: 'GET', p: '/api/lms/j/insights', params: [['section_id', 'uuid', 1]], stmts: ['insights'] },
  { m: 'POST', p: '/api/lms/j/feedback', params: [['section_id', 'uuid', 1], ['member_no', 'mno'], ['audience', 'enum', 1, AUD]], stmts: ['feedback'], audit: 'lms.j.feedback' },
  { m: 'POST', p: '/api/lms/j/feedback/save', params: [['section_id', 'uuid', 1], ['member_no', 'mno'], ['audience', 'enum', 1, AUD], ['body', 'text', 1, 4000], ['source', 'enum', 1, ['ai', 'edited']]], stmts: ['feedbackSave'], audit: 'lms.j.feedback' },
  { m: 'GET', p: '/api/lms/j/feedbacks', params: [['section_id', 'uuid', 1], ['member_no', 'mno']], stmts: ['feedbacks'] },
  { m: 'POST', p: '/api/lms/j/reflection', who: 'any', params: [['section_id', 'uuid', 1], ['member_no', 'mno', 1], ['week_no', 'int', 1, 1, 20], ['body', 'text', 1, 4000], ['mood', 'int', 0, 1, 5]], stmts: ['reflAdd'], audit: 'lms.j.reflection' },
  { m: 'GET', p: '/api/lms/j/reflections', who: 'any', params: [['section_id', 'uuid', 1], ['member_no', 'mno']], stmts: ['reflList'] },
  { m: 'POST', p: '/api/lms/j/reflection/comment', params: [['id', 'uuid', 1], ['comment', 'text', 1, 1000]], stmts: ['reflComment'], audit: 'lms.j.reflection.comment' },
  { m: 'GET', p: '/api/lms/j/report', who: 'any', params: [['section_id', 'uuid', 1], ['member_no', 'mno', 1], ['view', 'enum', 0, AUD, 0, 'professor']], stmts: ['report'] }
];

module.exports = ctx => engine(ctx, SPEC, SQL);
module.exports.SPEC = SPEC;
module.exports.SQL = SQL;
