-- PG16: CREATEROLE 계정이 역할을 만들면 SET 옵션 없는 멤버십이 자동으로 생겨 20번의 grant가 건너뛰어질 수 있다(→ permission denied to set role).
-- db.js didisam_tenant · didisam_pii와 같은 방식으로 set_option을 확인하고 WITH SET TRUE로 갱신한다(이미 적용된 DB 보정).
do $$ begin
  if not exists (select 1 from pg_auth_members m join pg_roles r on r.oid = m.roleid join pg_roles u on u.oid = m.member where r.rolname = 'didisam_market' and u.rolname = current_user and m.set_option) then
    execute format('grant didisam_market to %I with set true, inherit false', current_user);
  end if; end $$;
