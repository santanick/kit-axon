-- v40.1 이탈 자동 취소: 퇴장 스캔 시각(left_at)과 그때의 시설 설정 이탈 허용 분(leave_min, 없으면 끔). 재입장하면 left_at을 지운다.
alter table fac_booking add column if not exists left_at timestamptz;
alter table fac_booking add column if not exists leave_min smallint;
create index if not exists fac_bk_left on fac_booking (tenant_id, left_at) where left_at is not null;
create index if not exists fac_pass_pending on fac_pass (tenant_id, created_at) where status = 'pending';
