-- v41.0-c 학습자 결제 내역의 토스 영수증 링크(토스 승인 응답 receipt.url). 개인정보 아님.
alter table led_receipt add column if not exists receipt_url text;
