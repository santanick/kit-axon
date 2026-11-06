-- v30 묶음 J × Q — 비교과 참여(묶음 Q 신청 · 출석 · 이수)를 학습 부진 복합 지표의 「비교과」로 연결한다.
-- 참여 1건 = 승인된 비교과 신청 중 ① 이수(completed) 25점 ② 이수 전이지만 1회 이상 출석(present · late) 10점. 합계 최대 100점.
-- 뷰는 호출자 권한(security_invoker)으로 돌아 RLS(app.tenant)가 그대로 적용된다.
create or replace view lms_extra_participation with (security_invoker = true) as
  select ap.tenant_id, pe.person_id, ap.program_id,
    case when ap.completion = 'completed' then 'completed' else 'attended' end as kind,
    case when ap.completion = 'completed' then 25 else 10 end as points,
    coalesce(ap.decided_at, ap.applied_at) as at
  from lms_q_application ap
  join lms_person pe on pe.tenant_id = ap.tenant_id and pe.member_no = ap.member_no
  where ap.status = 'approved'
    and (ap.completion = 'completed' or exists (select 1 from lms_q_attend t where t.tenant_id = ap.tenant_id and t.program_id = ap.program_id and t.member_no = ap.member_no and t.status in ('present','late')));
grant select on lms_extra_participation to didisam_tenant;

-- 비교과 점수: 뷰의 points 합(최대 100). 65_j의 기본 함수(건수 × 25)를 대체한다.
create or replace function lms_j_extra(p uuid) returns int language plpgsql stable as $$
declare n int;
begin
  if to_regclass('lms_extra_participation') is null then return 0; end if;
  execute 'select coalesce(sum(points), 0)::int from lms_extra_participation where person_id = $1' into n using p;
  return least(100, coalesce(n, 0));
end $$;
