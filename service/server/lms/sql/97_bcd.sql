-- v30 묶음 B · C 후속 — E(과제) · F(시험) 결과를 강의실 구성(B) 이수 조건 · 조건부/수준별 규칙과 팀 프로젝트(C) 진행 현황에 자동 반영
-- 30_e · 40_f 뒤에 돌아야 하므로 새 번호(97)로 둔다. 과제 · 시험 자원(kind assign · exam, body.ref = asg_id · exam_id)을 B에 추가하고,
-- lms_submission · lms_exam_attempt 변경 때 트리거가 lms_b_progress(점수 · 상태)와 lms_c_task_status(팀 과제)를 고친다. 학생이 점수를 직접 올리는 경로는 없다.

alter table lms_b_resource drop constraint if exists lms_b_resource_kind_check;
alter table lms_b_resource add constraint lms_b_resource_kind_check check (kind in ('file','url','page','folder','label','video','scorm','html5','assign','exam'));
alter table lms_c_task add column if not exists ref_asg uuid;

-- 학습자 한 명의 연동 결과를 자원 진도에 반영(이수 조건 type: score면 기준 점수로 합격/미달, 그 밖은 제출하면 완료)
create or replace function lmsb_ext_apply(t text, res uuid, pid uuid, sc numeric, submitted boolean) returns void language plpgsql as $$
declare c jsonb; st text;
begin
  select z.completion into c from lms_b_resource z where z.tenant_id = t and z.res_id = res and z.deleted_at is null;
  if not found or pid is null then return; end if;
  if not submitted and sc is null then delete from lms_b_progress where tenant_id = t and res_id = res and person_id = pid; return; end if;
  st := case when c->>'type' = 'score' then case when sc is null then 'in_progress' when sc >= coalesce((c->>'score')::numeric, 0) then 'passed' else 'failed' end
             when submitted then 'completed' else 'in_progress' end;
  insert into lms_b_progress (tenant_id, res_id, person_id, status, score, time_sec, views) values (t, res, pid, st, sc, 0, 1)
    on conflict (tenant_id, res_id, person_id) do update set status = excluded.status, score = excluded.score, updated_at = now();
end $$;

-- 과제: 개인(p:<person>) · 팀(t:<team>, lms_asg_team.members) 제출 → 사람별 (점수, 제출 여부)
create or replace function lmsb_asg_result(t text, asg uuid, pid uuid, out sc numeric, out submitted boolean) language sql stable as $$
  select (array_agg(case when s.status in ('graded','returned') then s.score end order by s.graded_at desc nulls last))[1], coalesce(bool_or(s.status <> 'draft'), false)
  from lms_submission s where s.tenant_id = t and s.asg_id = asg
    and (s.person_id = pid or s.team_id in (select g.team_id from lms_asg_team g where g.tenant_id = t and g.asg_id = asg and pid = any(g.members))) $$;
-- 시험: 정책(best · last)대로 점수, 제출한 응시가 있으면 제출
create or replace function lmsb_exam_result(t text, ex uuid, pid uuid, out sc numeric, out submitted boolean) language sql stable as $$
  select case when e.score_policy = 'last' then (array_agg(a.score order by a.no desc) filter (where a.status in ('submitted','graded')))[1] else max(a.score) filter (where a.status in ('submitted','graded')) end,
    coalesce(bool_or(a.status in ('submitted','graded')), false)
  from lms_exam e left join lms_exam_attempt a on a.tenant_id = e.tenant_id and a.exam_id = e.exam_id and a.person_id = pid where e.tenant_id = t and e.exam_id = ex group by e.score_policy $$;

-- 자원 하나를 수강생 전체에 대해 다시 계산(연결할 때 · 이수 조건 바꿀 때)
create or replace function lmsb_ext_res(res uuid) returns void language plpgsql as $$
declare t text := lmsb_tid(); r record; e record; x record;
begin
  select z.* into r from lms_b_resource z where z.tenant_id = t and z.res_id = res and z.kind in ('assign','exam') and z.deleted_at is null;
  if not found or lmsb_uuid(r.body->>'ref') is null then return; end if;
  for e in select en.person_id from lms_enrollment en where en.tenant_id = t and en.section_id = r.section_id and en.status = 'enrolled' loop
    if r.kind = 'assign' then select * into x from lmsb_asg_result(t, (r.body->>'ref')::uuid, e.person_id); else select * into x from lmsb_exam_result(t, (r.body->>'ref')::uuid, e.person_id); end if;
    perform lmsb_ext_apply(t, res, e.person_id, x.sc, coalesce(x.submitted, false));
  end loop;
end $$;

-- 팀 과제(C)와 E 과제 연결: 팀원 제출 수로 할 일 · 진행 중 · 완료
create or replace function lmsc_task_sync(task uuid) returns void language plpgsql as $$
declare t text := lmsb_tid(); k record; tm record; n int; d int; av numeric; x record; m uuid;
begin
  select * into k from lms_c_task where tenant_id = t and task_id = task and ref_asg is not null; if not found then return; end if;
  for tm in select ct.team_id from lms_c_team ct where ct.tenant_id = t and ct.section_id = k.section_id and (k.team_id is null or ct.team_id = k.team_id) loop
    n := 0; d := 0; av := null;
    for m in select person_id from lms_c_team_member where tenant_id = t and team_id = tm.team_id loop
      n := n + 1; select * into x from lmsb_asg_result(t, k.ref_asg, m);
      if x.submitted then d := d + 1; end if; if x.sc is not null then av := coalesce(av, 0) + x.sc; end if;
    end loop;
    if n = 0 then continue; end if;
    insert into lms_c_task_status (tenant_id, task_id, team_id, status, note, by_label) values (t, task, tm.team_id, case when d = n then 'done' when d > 0 then 'doing' else 'todo' end,
      format('과제 연동: 제출 %s/%s명%s', d, n, case when av is not null then ' · 채점 점수 합 ' || round(av, 1) else '' end), '과제 연동')
      on conflict (tenant_id, task_id, team_id) do update set status = excluded.status, note = excluded.note, by_label = excluded.by_label, at = now();
  end loop;
end $$;

-- 트리거: 과제 제출 · 채점
create or replace function lmsb_trg_submission() returns trigger language plpgsql as $$
declare r record; pid uuid; x record; k uuid;
begin
  for r in select z.res_id from lms_b_resource z where z.tenant_id = new.tenant_id and z.kind = 'assign' and z.deleted_at is null and z.body->>'ref' = new.asg_id::text loop
    for pid in select new.person_id where new.person_id is not null union select unnest(g.members) from lms_asg_team g where g.tenant_id = new.tenant_id and g.team_id = new.team_id loop
      select * into x from lmsb_asg_result(new.tenant_id, new.asg_id, pid); perform lmsb_ext_apply(new.tenant_id, r.res_id, pid, x.sc, coalesce(x.submitted, false));
    end loop;
  end loop;
  for k in select c.task_id from lms_c_task c where c.tenant_id = new.tenant_id and c.ref_asg = new.asg_id loop perform lmsc_task_sync(k); end loop;
  return null;
end $$;
drop trigger if exists lmsb_sub_sync on lms_submission;
create trigger lmsb_sub_sync after insert or update of status, score on lms_submission for each row execute function lmsb_trg_submission();
-- 트리거: 시험 응시 제출 · 채점
create or replace function lmsb_trg_attempt() returns trigger language plpgsql as $$
declare r record; x record;
begin
  for r in select z.res_id from lms_b_resource z where z.tenant_id = new.tenant_id and z.kind = 'exam' and z.deleted_at is null and z.body->>'ref' = new.exam_id::text loop
    select * into x from lmsb_exam_result(new.tenant_id, new.exam_id, new.person_id); perform lmsb_ext_apply(new.tenant_id, r.res_id, new.person_id, x.sc, coalesce(x.submitted, false));
  end loop;
  return null;
end $$;
drop trigger if exists lmsb_att_sync on lms_exam_attempt;
create trigger lmsb_att_sync after insert or update of status, score on lms_exam_attempt for each row execute function lmsb_trg_attempt();
