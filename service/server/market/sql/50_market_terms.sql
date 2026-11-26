-- v48.1 법무 · 세무 반영(M/l/code-changes.md C2 · C3, policy v1.2 제19 · 40조)
-- terms: 크레딧 이용 조건 동의 기록 {ver, at, by} · buyer_kind: general | public(공공 · 국공립 — 이월 없음, 계약 종료 정산)
alter table mk_contract add column if not exists terms jsonb;
alter table mk_contract add column if not exists buyer_kind text not null default 'general';
alter table mk_contract drop constraint if exists mk_contract_buyer_kind_check;
alter table mk_contract add constraint mk_contract_buyer_kind_check check (buyer_kind in ('general','public'));
