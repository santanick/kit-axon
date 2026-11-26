-- 통합 센터 RLS(spec 2-5). 서버 group 모듈은 요청마다 SET LOCAL ROLE didisam_group(NOLOGIN · NOBYPASSRLS)
--   + app.tenant(로그인 기관 또는 집계 중인 소속 기관) + app.grp(서버가 확인한 묶음) + app.santa('1' = 산타 경로만).
-- didisam_group에는 기관 표 권한이 하나도 없다(T-ISO-1). 정책 재귀를 막기 위해 grp_link에 owner_tid를 두고
--   grp_link 정책은 grp_group을 읽지 않는다(grp_group 정책만 grp_link를 읽는다).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'didisam_group') then create role didisam_group nologin nobypassrls; end if;
  if not exists (select 1 from pg_auth_members m join pg_roles r on r.oid = m.roleid join pg_roles u on u.oid = m.member where r.rolname = 'didisam_group' and u.rolname = current_user and m.set_option) then
    execute format('grant didisam_group to %I with set true, inherit false', current_user);
  end if; end $$;
grant usage on schema public to didisam_group;
grant select, insert, update, delete on grp_group, grp_link, grp_staff, grp_kpi_day, grp_kpi_month, grp_lx, grp_share, grp_share_ver, grp_share_tgt, grp_policy, grp_policy_apply, grp_rule, grp_idem to didisam_group;
grant select, insert on grp_audit to didisam_group;
revoke update, delete on grp_audit from didisam_group;
grant select, insert, update on grp_audit_head to didisam_group;
grant usage on sequence grp_audit_id_seq to didisam_group;
-- 기관 범위 표(grp_lkey): 기관 역할만, 상위 기관 역할은 권한 없음
revoke all on grp_lkey from didisam_group;
grant select, insert, update, delete on grp_lkey to didisam_tenant;

create or replace function grp_me() returns text language sql stable as $f$ select coalesce(current_setting('app.tenant', true), '') $f$;
create or replace function grp_santa() returns boolean language sql stable as $f$ select coalesce(current_setting('app.santa', true), '') = '1' $f$;

do $$ declare t text; begin
  foreach t in array array['grp_group','grp_link','grp_staff','grp_kpi_day','grp_kpi_month','grp_lx','grp_lkey','grp_share','grp_share_ver','grp_share_tgt','grp_policy','grp_policy_apply','grp_rule','grp_audit','grp_audit_head','grp_idem'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t);
    execute format('drop policy if exists g_all on %I', t); execute format('drop policy if exists g_read on %I', t);
    execute format('drop policy if exists g_ins on %I', t); execute format('drop policy if exists g_upd on %I', t); execute format('drop policy if exists g_del on %I', t);
  end loop; end $$;

-- 연결(상위 · 소속 · 산타). 소속 기관은 child_tid가 자기인 행만 — 코드 초대는 산타 범위에서 child_tid를 먼저 채운다(claim)
create policy g_all on grp_link using (owner_tid = grp_me() or child_tid = grp_me() or grp_santa()) with check (owner_tid = grp_me() or child_tid = grp_me() or grp_santa());
-- 묶음: 상위 기관 · 산타 전부, 소속 기관은 초대 · 연결 중인 묶음 읽기만
create policy g_read on grp_group for select using (owner_tid = grp_me() or grp_santa() or exists (select 1 from grp_link l where l.group_id = grp_group.id and l.child_tid = grp_me() and l.status in ('invited','active')));
create policy g_ins on grp_group for insert with check (grp_santa());
create policy g_upd on grp_group for update using (owner_tid = grp_me() or grp_santa()) with check (owner_tid = grp_me() or grp_santa());
create policy g_del on grp_group for delete using (grp_santa());
-- 상위 기관 전용 표
create policy g_all on grp_staff using (grp_santa() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me())) with check (grp_santa() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me()));
create policy g_all on grp_rule using (grp_santa() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me())) with check (grp_santa() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me()));
-- 집계: 상위 기관은 active 연결 행 읽기만, 소속 기관은 자기 행(쓰기는 active 연결일 때), 산타 전부
create or replace function grp_live(g text, c text) returns boolean language sql stable as $f$ select exists (select 1 from grp_link l where l.group_id = g and l.child_tid = c and l.status = 'active') $f$;
do $$ declare t text; begin
  foreach t in array array['grp_kpi_day','grp_kpi_month','grp_lx'] loop
    execute format($p$create policy g_read on %I for select using (grp_santa() or child_tid = grp_me() or (grp_live(group_id, child_tid) and exists (select 1 from grp_link l where l.group_id = %I.group_id and l.child_tid = %I.child_tid and l.owner_tid = grp_me())))$p$, t, t, t);
    execute format($p$create policy g_ins on %I for insert with check (grp_santa() or (child_tid = grp_me() and grp_live(group_id, child_tid)))$p$, t);
    execute format($p$create policy g_upd on %I for update using (grp_santa() or (child_tid = grp_me() and grp_live(group_id, child_tid))) with check (grp_santa() or (child_tid = grp_me() and grp_live(group_id, child_tid)))$p$, t);
    execute format($p$create policy g_del on %I for delete using (grp_santa() or child_tid = grp_me())$p$, t);
  end loop; end $$;
-- 콘텐츠: 상위 기관 묶음 전체, 소속 기관은 대상에 든 배포(down · 게시 이후) · 자기가 올린 요청(up)
create policy g_all on grp_share using (grp_santa() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me())
    or (dir = 'up' and from_tid = grp_me())
    or (dir = 'down' and status in ('published','recalled','approved') and grp_live(group_id, grp_me()) and (targets = '"all"'::jsonb or targets ? grp_me())))
  with check (grp_santa() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me()) or (dir = 'up' and from_tid = grp_me() and grp_live(group_id, grp_me())));
create policy g_all on grp_share_ver using (grp_santa() or exists (select 1 from grp_share s where s.id = share_id)) with check (grp_santa() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me()) or exists (select 1 from grp_share s where s.id = share_id and s.from_tid = grp_me() and s.dir = 'up'));
create policy g_all on grp_share_tgt using (grp_santa() or child_tid = grp_me() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me())) with check (grp_santa() or child_tid = grp_me() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me()));
-- 공통 설정
create policy g_all on grp_policy using (grp_santa() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me()) or grp_live(group_id, grp_me())) with check (grp_santa() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me()));
create policy g_all on grp_policy_apply using (grp_santa() or child_tid = grp_me() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me())) with check (grp_santa() or (child_tid = grp_me() and grp_live(group_id, child_tid)) or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me()));
-- 감사: 상위 기관 묶음 전체 · 소속 기관은 자기 기관이 대상인 행 · 산타 읽기. 쓰기는 자기 기관 이름으로만(수정 · 삭제 권한 없음)
create policy g_read on grp_audit for select using (grp_santa() or child_tid = grp_me() or exists (select 1 from grp_group g where g.id = group_id and g.owner_tid = grp_me()));
create policy g_ins on grp_audit for insert with check (actor_tid = grp_me() or grp_santa());
create policy g_all on grp_audit_head using (true) with check (true); -- 해시 값만(내용 없음)
create policy g_all on grp_idem using (tid = grp_me() or grp_santa()) with check (tid = grp_me());
create policy tenant_iso on grp_lkey using (tenant_id = current_setting('app.tenant', true)) with check (tenant_id = current_setting('app.tenant', true));

-- 감사 해시 체인(묶음별): hash = sha256(prev || 행 내용)
create or replace function grp_audit_chain() returns trigger language plpgsql as $f$
declare p text; begin
  insert into grp_audit_head (group_id, hash) values (new.group_id, repeat('0', 64)) on conflict (group_id) do nothing;
  select hash into p from grp_audit_head where group_id = new.group_id for update;
  new.prev_hash := p;
  new.hash := encode(sha256(convert_to(p || '|' || to_char(new.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || new.actor || '|' || new.action || '|' || coalesce(new.child_tid, '') || '|' || coalesce(new.target, '') || '|' || coalesce(new.purpose, '') || '|' || new.ok::text, 'UTF8')), 'hex');
  update grp_audit_head set hash = new.hash where group_id = new.group_id; return new; end $f$;
drop trigger if exists grp_audit_chain on grp_audit; create trigger grp_audit_chain before insert on grp_audit for each row execute function grp_audit_chain();

-- 연결 상태 전환 가드(T-ISO-5): 묶음 · 소속 기관 · 상위 기관 열은 바꿀 수 없고(초대 claim 제외), 쪽마다 허용 전환만
create or replace function grp_link_guard() returns trigger language plpgsql as $f$
declare me text := grp_me(); s boolean := grp_santa(); begin
  if new.group_id is distinct from old.group_id or new.owner_tid is distinct from old.owner_tid then raise exception 'grp_link_guard: group'; end if;
  if new.child_tid is distinct from old.child_tid and not (s and old.child_tid is null and old.status = 'invited' and new.status = 'invited') then raise exception 'grp_link_guard: child'; end if;
  if s or new.status = old.status and (old.status <> 'active' or me = old.child_tid or me = old.owner_tid) and (new.share is not distinct from old.share or me = old.child_tid) then return new; end if;
  if me = old.owner_tid and ((old.status = 'invited' and new.status = 'expired') or (old.status = 'active' and new.status = 'removed')) then return new; end if;
  if me = old.child_tid and ((old.status = 'invited' and new.status in ('active','declined')) or (old.status = 'active' and new.status = 'left')) then return new; end if;
  raise exception 'grp_link_guard: % -> %', old.status, new.status; end $f$;
drop trigger if exists grp_link_guard on grp_link; create trigger grp_link_guard before update on grp_link for each row execute function grp_link_guard();

-- 통합 센터 역할은 상위 기관 소속 운영자에게만(users는 RLS 없음 — 정의자 권한으로 확인)
create or replace function grp_staff_check() returns trigger language plpgsql security definer set search_path = public, pg_temp as $f$
begin if not exists (select 1 from users u join grp_group g on g.owner_tid = u.tenant_id where u.id = new.user_id and g.id = new.group_id) then raise exception 'grp_staff_tenant'; end if; return new; end $f$;
drop trigger if exists grp_staff_check on grp_staff; create trigger grp_staff_check before insert or update on grp_staff for each row execute function grp_staff_check();
