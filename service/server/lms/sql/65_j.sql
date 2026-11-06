-- v30 학사 LMS 묶음 J — 학습 분석(SFR-028 · 029 · 078)
-- 학습 부진 복합 지표 = 성적 35 · 출결 30 · LMS 참여(진도) 25 · 비교과 참여 10 (값이 없는 성적 · 출결 · 참여는 가중치에서 뺀다, 비교과는 없으면 0)
-- 비교과(묶음 Q) 연동 지점: 뷰 또는 표 lms_extra_participation(tenant_id, person_id, …)가 있으면 참여 1건 = 25점(최대 100). 없으면 0.

create or replace function lms_j_extra(p uuid) returns int language plpgsql stable as $$
declare n int;
begin
  if to_regclass('lms_extra_participation') is null then return 0; end if;
  execute 'select count(*) from lms_extra_participation where person_id = $1' into n using p;
  return least(100, coalesce(n, 0) * 25);
end $$;

create or replace function lms_j_comps(p_section uuid) returns table (person_id uuid, member_no text, unit_code text, grade_year smallint, grade int, attendance int, participation int, extra int, risk int)
language sql stable as $$
  with st as (select pe.person_id, pe.member_no, pe.unit_code, pe.grade_year from lms_enrollment e join lms_person pe on pe.person_id = e.person_id
      where e.section_id = p_section and e.status = 'enrolled' and e.kind = 'regular'),
    ss as (select session_id from lms_session where section_id = p_section and kind <> 'holiday' and starts_at <= now()),
    v as (select st.*,
      (select round(avg(100.0 * gs.score / nullif(gi.max_score, 0)))::int from lms_grade_score gs join lms_grade_item gi on gi.item_id = gs.item_id where gi.section_id = p_section and gs.person_id = st.person_id and gs.score is not null) g,
      case when (select count(*) from ss) = 0 then null else (select round(100.0 * count(*) / (select count(*) from ss))::int from lms_attendance a where a.person_id = st.person_id and a.session_id in (select session_id from ss) and a.status in ('present','late','excused')) end a,
      (select round(avg(coalesce(pg.pct, 0)))::int from lms_content c join lms_session s on s.session_id = c.session_id left join lms_progress pg on pg.content_id = c.content_id and pg.person_id = st.person_id
        where s.section_id = p_section and s.starts_at <= now() and s.kind <> 'holiday') p,
      lms_j_extra(st.person_id) x from st)
  select person_id, member_no, unit_code, grade_year, g, a, p, x,
    (100 - round((coalesce(35 * g, 0) + coalesce(30 * a, 0) + coalesce(25 * p, 0) + 10 * x)::numeric
      / ((case when g is null then 0 else 35 end) + (case when a is null then 0 else 30 end) + (case when p is null then 0 else 25 end) + 10)))::int
  from v
$$;

-- 조기 경고 규칙(기관 단위). 없으면 기본 규칙(위험지수 ≥ 50 · 출석률 ≤ 75 · 진도율 ≤ 50)을 쓴다
create table if not exists lms_risk_rule (
  tenant_id  text not null references tenants(id) on delete cascade,
  rule_id    uuid not null default gen_random_uuid(),
  name       text not null,
  metric     text not null check (metric in ('risk','grade','attendance','participation','extra','dropout')),
  op         text not null check (op in ('gte','lte')),
  threshold  smallint not null check (threshold between 0 and 100),
  level      text not null check (level in ('warn','danger')),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (tenant_id, rule_id)
);
-- 위험지수 일별 기록(추이 · 예측)
create table if not exists lms_risk_snapshot (
  tenant_id  text not null,
  section_id uuid not null,
  person_id  uuid not null,
  day        date not null,
  risk       smallint not null,
  comps      jsonb not null default '{}',
  primary key (tenant_id, section_id, person_id, day)
);
-- 학습 성찰일지
create table if not exists lms_reflection (
  tenant_id  text not null,
  id         uuid not null default gen_random_uuid(),
  section_id uuid not null,
  person_id  uuid not null,
  week_no    smallint not null,
  body       text not null,
  mood       smallint check (mood between 1 and 5),
  comment    text, commented_by text, commented_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists lms_refl_sp on lms_reflection (tenant_id, section_id, person_id);
-- 맞춤 피드백(규칙 초안 · AI 다듬기 · 교수 수정) — 실발송은 문자 · 메일 연동 후 동작
create table if not exists lms_feedback (
  tenant_id  text not null,
  id         uuid not null default gen_random_uuid(),
  section_id uuid not null,
  person_id  uuid,
  audience   text not null check (audience in ('professor','student')),
  body       text not null,
  source     text not null check (source in ('rule','ai','edited')),
  actor      text,
  created_at timestamptz not null default now(),
  primary key (tenant_id, id)
);
create index if not exists lms_fb_s on lms_feedback (tenant_id, section_id, person_id);

do $$ declare t text; begin
  foreach t in array array['lms_risk_rule','lms_risk_snapshot','lms_reflection','lms_feedback'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format($p$create policy tenant_iso on %I using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true))$p$, t);
    execute format('grant select, insert, update, delete on %I to didisam_tenant', t);
  end loop;
end $$;
