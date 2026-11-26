-- v48.1 법무 · 세무 반영(M/l/code-changes.md r3 C2 · C3 · C11, policy v1.3 제19 · 19조의2 · 40조)
-- terms: 이용 조건 동의 기록 {ver, at, by, lapseAck, carryBp, penaltyBp, negotiated[]}
-- buyer_mode: general(연간 이용권) | public_license(공공 B2a) | public_postpaid(공공 B2b 분기 후불) · cap_won: 후불 계약 한도
alter table mk_contract add column if not exists terms jsonb;
alter table mk_contract add column if not exists buyer_mode text not null default 'general';
alter table mk_contract drop constraint if exists mk_contract_buyer_mode_check;
alter table mk_contract add constraint mk_contract_buyer_mode_check check (buyer_mode in ('general','public_license','public_postpaid'));
alter table mk_contract add column if not exists cap_won integer;
-- 소멸 인식(lapse) · 후불 청구(usage_bill) 장부 줄
alter table mk_entry drop constraint if exists mk_entry_kind_check;
alter table mk_entry add constraint mk_entry_kind_check check (kind in ('credit_sale','credit_bonus','platform_bundle','credit_use','credit_restore','cp_use','santa_use','credit_carry','credit_refund','single_sale','cp_single','santa_orig','promo_fee','promo_carry','payout','adj','lapse','usage_bill'));
-- r3 C4 세금계산서 발행 대기 레코드 {status, date(작성일 = 구매 확정일), supply(보너스 제외), vat, total, bonusCredits, bonusInSupply:false, no, fixes[](수정세금계산서 · fixOf 연결)}
alter table mk_contract add column if not exists tax jsonb;
