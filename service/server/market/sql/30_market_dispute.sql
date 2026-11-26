-- 구매 기관 이의 신청(POST /api/market/contracts/:id/disputes): 차감 복원(restore) · 정산서(stmt) · 계약(contract) 이의
alter table mk_dispute drop constraint if exists mk_dispute_kind_check;
alter table mk_dispute add constraint mk_dispute_kind_check check (kind in ('restore','stmt','contract'));
