-- v42 마일리지 수집 훅(Node · Java 공용 SQL). 03 6장: 비교과(lms_q)가 마감(closed)되면 이수자마다 noncredit_done 적립 1줄(값 = mileage + extra_mileage).
-- 멱등: mil_event 유일키(noncredit_done, lmsq, program_id, member_no) — 이관(mil_import_q)과 실시간 트리거가 같은 키라 중복이 생기지 않는다.
create or replace function mil_q_closed() returns trigger language plpgsql as $f$
declare a record; begin
  if new.status = 'closed' and old.status is distinct from 'closed' and exists (select 1 from mil_policy where tenant_id = new.tenant_id and is_on) then
    for a in select member_no, mileage + extra_mileage v from lms_q_application where tenant_id = new.tenant_id and program_id = new.program_id and completion = 'completed' and status = 'approved' loop
      perform mil_emit(new.tenant_id, a.member_no, 'noncredit_done', 'lmsq', new.program_id::text, a.v, 'A', now(), null, 'lu_root');
    end loop;
  end if; return new; end $f$;
drop trigger if exists mil_q_closed on lms_q_program;
create trigger mil_q_closed after update of status on lms_q_program for each row execute function mil_q_closed();

-- 이관(이미 마감된 비교과): 미리보기(dry) · 실행 · 학생별 대조. 적립일 = 프로그램 종료일(없으면 수정일), 지난 만료는 p_expired = 'expire'면 바로 소멸
create or replace function mil_import_q(p_tid text, p_dry boolean, p_expired text default 'expire', p_at timestamptz default now()) returns jsonb language plpgsql as $$
declare a record; v_prog int; v_sids int; v_total int; v_diff int; v_done int := 0; begin
  select count(distinct p.program_id), count(distinct ap.member_no), coalesce(sum(ap.mileage + ap.extra_mileage), 0) into v_prog, v_sids, v_total
    from lms_q_application ap join lms_q_program p on p.tenant_id = ap.tenant_id and p.program_id = ap.program_id
    where ap.tenant_id = p_tid and p.status = 'closed' and ap.completion = 'completed' and ap.status = 'approved' and ap.mileage + ap.extra_mileage > 0;
  if not p_dry then
    if not exists (select 1 from mil_policy where tenant_id = p_tid and is_on) then return jsonb_build_object('error', 'mile_off'); end if;
    for a in select ap.member_no, p.program_id, ap.mileage + ap.extra_mileage v, least(coalesce(p.ends_at, p.updated_at), p_at) at from lms_q_application ap join lms_q_program p on p.tenant_id = ap.tenant_id and p.program_id = ap.program_id
        where ap.tenant_id = p_tid and p.status = 'closed' and ap.completion = 'completed' and ap.status = 'approved' and ap.mileage + ap.extra_mileage > 0 order by at loop
      if (mil_emit(p_tid, a.member_no, 'noncredit_done', 'lmsq', a.program_id::text, a.v, 'A', a.at, null, 'lu_root'))->>'status' = 'done' then v_done := v_done + 1; end if;
    end loop;
    if p_expired = 'expire' then perform mil_expire(p_tid, p_at); end if;
  end if;
  -- 대조: 학생별 lms_q 합계와 원장 noncredit_done 적립 합계 차이가 있는 학생 수(규칙 상한으로 깎였으면 차이로 나온다)
  select count(*) into v_diff from (
    select ap.member_no sid, sum(ap.mileage + ap.extra_mileage) q from lms_q_application ap join lms_q_program p on p.tenant_id = ap.tenant_id and p.program_id = ap.program_id
      where ap.tenant_id = p_tid and p.status = 'closed' and ap.completion = 'completed' and ap.status = 'approved' and ap.mileage + ap.extra_mileage > 0 group by ap.member_no) q
    full join (select sid, sum(points) m from mil_entry where tenant_id = p_tid and trigger = 'noncredit_done' and kind = 'earn' and status <> 'void' group by sid) m on m.sid = q.sid
    where coalesce(q.q, 0) <> coalesce(m.m, 0);
  return jsonb_build_object('ok', true, 'dryRun', p_dry, 'programs', v_prog, 'sids', v_sids, 'totalP', v_total, 'imported', v_done, 'diff', case when p_dry then null else v_diff end); end $$;
