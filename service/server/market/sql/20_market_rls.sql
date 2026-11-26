-- 콘텐츠 마켓 C1: 교차 테넌트 차단을 DB 단에서도(통합 담당 보안 기준). 서버 market 모듈은 요청마다
--   SET LOCAL ROLE didisam_market(NOLOGIN · NOBYPASSRLS) + app.tenant(로그인 기관) + app.santa('1' = 산타 운영 경로만)로 내려간다.
-- ① 한 기관 표(지갑 · 차감 · 통제 · 사전 승인 · 멱등): tenant_iso — buyer_tid(또는 tid) = app.tenant, 산타 운영은 app.santa.
-- ② 양쪽 표(상품 · 단가 · opt-in · 견적 · 계약 · 정산서 · 분쟁 · 프로모션 · 요율): 당사자 열(buyer_tid · owner_tid · cp_tid · from_tid) 기준 + 산타.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'didisam_market') then create role didisam_market nologin nobypassrls; end if;
  if not exists (select 1 from pg_auth_members m join pg_roles r on r.oid = m.roleid join pg_roles u on u.oid = m.member where r.rolname = 'didisam_market' and u.rolname = current_user) then
    execute format('grant didisam_market to %I with set true, inherit false', current_user);
  end if; end $$;
grant usage on schema public to didisam_market;
grant select, insert, update, delete on mk_party, mk_product, mk_price, mk_optin, mk_collection, mk_collection_item, mk_quote, mk_contract, mk_credit_wallet, mk_credit_use,
  mk_control, mk_preapproval, mk_stmt, mk_close, mk_dispute, mk_entry, mk_cp_rate, mk_promo, mk_idem to didisam_market;
grant usage on sequence mk_price_id_seq, mk_optin_id_seq, mk_entry_id_seq, mk_cp_rate_id_seq to didisam_market;

-- 한 기관 표에 구매 기관 열(계약에서 채움 — 트리거라 호출부가 값을 고를 수 없음)
alter table mk_credit_wallet add column if not exists buyer_tid text;
alter table mk_control add column if not exists buyer_tid text;
alter table mk_preapproval add column if not exists buyer_tid text;
update mk_credit_wallet w set buyer_tid = k.buyer_tid from mk_contract k where k.id = w.contract_id and w.buyer_tid is null;
update mk_control w set buyer_tid = k.buyer_tid from mk_contract k where k.id = w.contract_id and w.buyer_tid is null;
update mk_preapproval w set buyer_tid = k.buyer_tid from mk_contract k where k.id = w.contract_id and w.buyer_tid is null;
create or replace function mk_fill_buyer() returns trigger language plpgsql as $f$
begin new.buyer_tid := (select buyer_tid from mk_contract where id = new.contract_id); if new.buyer_tid is null then raise exception 'mk_contract'; end if; return new; end $f$;
drop trigger if exists mk_wallet_buyer on mk_credit_wallet; create trigger mk_wallet_buyer before insert or update of contract_id on mk_credit_wallet for each row execute function mk_fill_buyer();
drop trigger if exists mk_control_buyer on mk_control; create trigger mk_control_buyer before insert or update of contract_id on mk_control for each row execute function mk_fill_buyer();
drop trigger if exists mk_pre_buyer on mk_preapproval; create trigger mk_pre_buyer before insert or update of contract_id on mk_preapproval for each row execute function mk_fill_buyer();
alter table mk_credit_wallet alter column buyer_tid set not null;
alter table mk_control alter column buyer_tid set not null;
alter table mk_preapproval alter column buyer_tid set not null;

-- 공통 식: 산타 운영 · 로그인 기관
create or replace function mk_santa() returns boolean language sql stable as $f$ select coalesce(current_setting('app.santa', true), '') = '1' $f$;
create or replace function mk_me() returns text language sql stable as $f$ select coalesce(current_setting('app.tenant', true), '') $f$;

do $$ declare t text; begin
  foreach t in array array['mk_party','mk_product','mk_price','mk_optin','mk_collection','mk_collection_item','mk_quote','mk_contract','mk_credit_wallet','mk_credit_use','mk_control','mk_preapproval','mk_stmt','mk_close','mk_dispute','mk_entry','mk_cp_rate','mk_promo','mk_idem'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format('drop policy if exists tenant_iso on %I', t); execute format('drop policy if exists mk_read on %I', t); execute format('drop policy if exists mk_write on %I', t); execute format('drop policy if exists mk_ins on %I', t);
  end loop; end $$;

-- ① 한 기관 표
create policy tenant_iso on mk_credit_wallet using (buyer_tid = mk_me() or mk_santa()) with check (buyer_tid = mk_me() or mk_santa());
create policy tenant_iso on mk_credit_use using (buyer_tid = mk_me() or mk_santa()) with check (buyer_tid = mk_me() or mk_santa());
create policy tenant_iso on mk_control using (buyer_tid = mk_me() or mk_santa()) with check (buyer_tid = mk_me() or mk_santa());
create policy tenant_iso on mk_preapproval using (buyer_tid = mk_me() or mk_santa()) with check (buyer_tid = mk_me() or mk_santa());
create policy tenant_iso on mk_idem using (tid = mk_me()) with check (tid = mk_me());

-- ② 양쪽 표
create policy mk_read on mk_party for select using (tid = mk_me() or mk_santa() or kind = 'cp');                 -- CP 이름은 카탈로그에 표시
create policy mk_write on mk_party for all using (mk_santa()) with check (mk_santa());
create policy mk_read on mk_product for select using (status = 'listed' or owner_tid = mk_me() or mk_santa());
create policy mk_write on mk_product for all using (owner_tid = mk_me() or mk_santa()) with check (owner_tid = mk_me() or mk_santa());
create policy mk_read on mk_price for select using (exists (select 1 from mk_product p where p.id = product_id));   -- 상품이 보이면 단가도(산타 · 소유자 · 판매 중)
create policy mk_write on mk_price for all using (mk_santa() or exists (select 1 from mk_product p where p.id = product_id and p.owner_tid = mk_me())) with check (mk_santa() or exists (select 1 from mk_product p where p.id = product_id and p.owner_tid = mk_me()));
create policy mk_read on mk_optin for select using (exists (select 1 from mk_product p where p.id = product_id));
create policy mk_write on mk_optin for all using (mk_santa() or exists (select 1 from mk_product p where p.id = product_id and p.owner_tid = mk_me())) with check (mk_santa() or exists (select 1 from mk_product p where p.id = product_id and p.owner_tid = mk_me()));
create policy mk_read on mk_collection for select using (true);
create policy mk_write on mk_collection for all using (mk_santa()) with check (mk_santa());
create policy mk_read on mk_collection_item for select using (true);
create policy mk_write on mk_collection_item for all using (mk_santa()) with check (mk_santa());
-- 견적: 구매 기관 · 산타, 개별 임대 견적은 그 상품의 CP도(승인 요청)
create policy mk_write on mk_quote for all using (buyer_tid = mk_me() or mk_santa() or (kind = 'single' and exists (select 1 from jsonb_array_elements(coalesce(input->'lines', '[]')) l join mk_product p on p.id = l->>'productId' where p.owner_tid = mk_me())))
  with check (buyer_tid = mk_me() or mk_santa() or (kind = 'single' and exists (select 1 from jsonb_array_elements(coalesce(input->'lines', '[]')) l join mk_product p on p.id = l->>'productId' where p.owner_tid = mk_me())));
create policy mk_write on mk_contract for all using (buyer_tid = mk_me() or mk_santa()) with check (buyer_tid = mk_me() or mk_santa());
create policy mk_write on mk_stmt for all using (cp_tid = mk_me() or mk_santa()) with check (cp_tid = mk_me() or mk_santa());
create policy mk_write on mk_close for all using (mk_santa()) with check (mk_santa());
create policy mk_write on mk_dispute for all using (from_tid = mk_me() or mk_santa()) with check (from_tid = mk_me() or mk_santa());
create policy mk_read on mk_entry for select using (mk_santa());
create policy mk_ins on mk_entry for insert with check (mk_santa() or party_tid = mk_me());                         -- 차감 · 복원 줄은 구매 기관 요청에서 기록
create policy mk_write on mk_entry for update using (mk_santa()) with check (mk_santa());
create policy mk_read on mk_cp_rate for select using (cp_tid = mk_me() or mk_santa());
create policy mk_write on mk_cp_rate for all using (mk_santa()) with check (mk_santa());
create policy mk_read on mk_promo for select using (cp_tid = mk_me() or mk_santa() or status = 'ok');               -- 승인 슬롯은 진열 · 정원 계산에 공개
create policy mk_write on mk_promo for all using (cp_tid = mk_me() or mk_santa()) with check (cp_tid = mk_me() or mk_santa());
