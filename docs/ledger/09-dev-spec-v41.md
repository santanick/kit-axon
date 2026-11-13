# 09. v41.0 개발 규격 — 통합 수납 원장 · 다중 가맹 · 청구서 링크 · PG 쉐어

> 근거: 01(원장 · /api 개략), 02(할인 · 환불 · 바우처), 04(VAN), 07(AI 수납 · 대시보드), **08(전략 v2, 최우선)**. 이 문서가 Node · Java · 스튜디오 · 학습자 개발의 **단일 계약**이다. 바꿀 일이 생기면 통합 담당에게 보고하고 이 문서를 먼저 고친다.

## 1. 모듈 구성 (v40 시설 모듈과 같은 방식)
- Node: `service/server/ledger/`(index.js · sql/10_ledger.sql · calc.js · mod-admin.js · mod-pub.js · import.js · share.js), 토스 호출은 `service/server/fac/pay.js`의 `createPay`를 재사용(필요 시 `ledger/pay.js`로 공용화, 시설 동작 불변).
- Java: `service-egov/.../didisam/ledger/` (fac 패키지와 같은 구조 · 같은 오류 코드 · 같은 응답 JSON).
- 계산 공용: `didisam/ledgercalc.js`(브라우저 · Node 공용 UMD) + 테스트 벡터 `tests/ledger-vectors.json` → Node · Java · 브라우저 3벌 동일 결과.
- 모듈 키 `ledger`(modules.js). 기관 플래그 `ledger_on`이 꺼져 있으면 /api/ledger/* 는 403 `ledger_off`.
- 학습자 공개 경로는 `modules.js`의 PUB 정규식에 `ledger-(?:my|order|confirm|bill|bill-order|bill-confirm)` 추가.

## 2. 표 (기관 RLS · tenant_id 필수 · 개인정보 컬럼 없음)
```
led_unit    (tenant_id, id 'lu_', parent_id null, kind 'hq|branch|dept|facility', name, toss_mid null,
             toss_secret_enc null, share_rate_bp int default 40, active bool, sort int)      -- 다중 가맹. 루트 1개 자동 생성
led_charge  (tenant_id, id 'lc_', unit_id, sid, item_type 'tuition|book|facility|pass|rental|program|event|etc',
             title, amount int, period_ym, due_date, src_type, src_id, status 'open|partial|paid|void', created_at)
             -- amount 음수 줄 = 할인. 잔액 = amount 합 - 배분 합
led_receipt (tenant_id, id 'lp_', unit_id, sid null, method 'online_card|online_transfer|desk_card|cash|transfer|vbank_ext|voucher',
             channel 'toss|desk|import|manual', amount int, paid_at, status 'ready|paid|failed|cancelled',
             toss_payment_key, toss_order_id unique, approval_no, card_issuer, installment, terminal_id,
             share_eligible bool,  -- 토스 경유 온라인 결제만 true
             recorded_by, diff_reason, idem_key unique, close_id, legacy_ref unique, created_at)
led_alloc   (tenant_id, receipt_id, charge_id, amount)
led_refund  (tenant_id, id 'lr_', receipt_id, amount, rule_type, calc jsonb, auto_amount, edit_reason,
             status 'pending|done|cancelled', toss_cancel_ok bool, by_staff, at)       -- 환불 합계 ≤ 원 수납
led_close   (tenant_id, id 'lk_', unit_id, day, cash_system, cash_counted, card_system, card_counted, diff_reason, closed_by, closed_at)
led_link    (tenant_id, token_hash, charge_ids text[], sid, expires_at, used_at)        -- 청구서 링크(원문 토큰 저장 금지)
led_import  (tenant_id, id 'li_', kind 'vbank|van|toss_settle', file_name, rows int, matched int, unmatched jsonb, by_staff, at)
led_device  (tenant_id, id 'ld_', unit_id, label, agent_key_hash, last_seen, mode 'mock|ksnet|nice')  -- Lv2 에이전트
```
- `sid`는 학습자 내부 ID(이름 · 연락처 · 카드번호 저장 금지). 대학은 학번 · 학과만(기존 원칙).
- 금액은 원 단위 정수. 서버가 항상 재계산(클라이언트 금액 불신, 불일치 400 `amount_mismatch`).
- 시설(v40) 결제 · 환불은 같은 트랜잭션에서 `legacy_ref='fac_payment:<id>'`로 원장에 한 줄 추가(이중 기록 방지 유일 색인). 시설 계산 · 벡터 불변.

## 3. /api (Node · Java 동일, 오류 `{error:'<code>', message}` — §7)
### 운영(직원, 역할: owner · sub · teacher는 조회만)
| 메서드 · 경로 | 요청 | 응답 · 규칙 |
|---|---|---|
| GET /api/ledger/units | – | `{units:[...]}` 트리. 비밀키는 `hasKey:true`만 |
| POST /api/ledger/units | `{id?,parentId,kind,name,tossMid?,tossSecret?,shareRateBp?,active?}` | owner만. 비밀키 암호화 저장(statecrypt) |
| GET /api/ledger/summary | `?from&to&unit&rollup=1` | `{net,paid,refund,unpaid,collectRate,byMethod,byItem,byUnit,daily,share:{eligible,estimate}}` — **모든 숫자는 calc.summary 하나에서** |
| GET /api/ledger/entries | `?from&to&unit&type&status&q&page` | 원장 행(청구 · 수납 · 환불 합친 시간순) |
| POST /api/ledger/charges | `{unitId,sid,items:[{itemType,title,amount}],periodYm,dueDate,idem}` | 청구 생성(할인 줄 허용) |
| POST /api/ledger/charges/generate | `{unitId,periodYm,dryRun}` | 반 · 수강 등록 기준 월 청구 일괄 생성 미리보기/확정(같은 원천 · 같은 달 중복 생성 금지) |
| POST /api/ledger/receipts | `{unitId,chargeIds?,sid?,method,amount,paidAt,approvalNo?,cardIssuer?,installment?,diffReason?,idem}` | 현장 수납(Lv0). 잔액 초과 400 `over_balance`. 배분은 오래된 청구부터 |
| POST /api/ledger/receipts/:id/correct | `{reason,idem}` | 반대 기록(삭제 금지) |
| POST /api/ledger/refunds | `{receiptId,amount?,ruleType,reason,idem}` | 계산(calc.refund) → pending |
| POST /api/ledger/refunds/:id/confirm | `{amount,editReason?}` | 직원 확정 → 토스 결제면 부분 취소 호출(성공 시 done), 단말 · 현금은 기록만 |
| POST /api/ledger/links | `{chargeIds,sid,ttlHours=72}` | 청구서 링크 `{url:'/learner.html?bill=<token>'}` 토큰은 1회 표시, 해시만 저장 |
| POST /api/ledger/import | multipart 또는 `{kind,csv}` | 가상계좌 · VAN 매입 · 토스 정산 CSV → 자동 대사(금액 + 날짜 + 학번/주문번호/승인번호), 미일치 목록 반환. 가상계좌 일치분은 `vbank_ext` 수납(share_eligible=false) |
| GET /api/ledger/share | `?ym&unit` | 단위별 쉐어 대상 결제액 · 쉐어율 · 예상 쉐어 · (토스 정산 가져온 경우) 실제와 차이 |
| GET/POST /api/ledger/close | `{unitId,day,cashCounted,cardCounted,diffReason}` | 일 마감 |
| GET /api/ledger/today | – | AI 오늘 할 일 카드 재료: 미납 단계별 대상 수, 미일치 대사, 미확정 환불, 미마감 — 숫자는 calc 함수 값 |
| GET /api/ledger/export | `?from&to&unit` | CSV(UTF-8 BOM) |
| POST /api/ledger/devices · GET /api/ledger/devices | `{unitId,label,mode}` | Lv2 에이전트 등록(키 1회 표시) |
| POST /api/ledger/device-push | 헤더 `X-Agent-Key` | 에이전트가 단말 승인 결과 전달 → desk_card 수납 확정(모의 단말 `mode:'mock'`로 테스트) |

### 학습자 · 보호자 · 링크(공개)
| 경로 | 요약 |
|---|---|
| GET /api/pub/<tid>/ledger-my | 본인(및 연결 보호자) 청구 · 수납 · 환불 |
| POST /api/pub/<tid>/ledger-order | `{chargeIds}` → 서버 금액 계산, `toss_order_id` 발급, `{orderId,amount,orderName,clientKey}`. 토스 키 없으면 `{payOnline:false}` |
| POST /api/pub/<tid>/ledger-confirm | `{paymentKey,orderId,amount}` 토스 승인(서버 재확인 · 멱등) |
| GET /api/pub/<tid>/ledger-bill?t=<token> | 링크 청구서 조회(로그인 없음, 만료 · 사용 확인, 이름 대신 「○○ 학습자님」 표시용 마스킹 이니셜만) |
| POST /api/pub/<tid>/ledger-bill-order · ledger-bill-confirm | 링크 결제(위와 동일, 토큰 검증) |

- 토스 키 선택: 청구의 `unit_id`에서 위로 올라가며 처음 만나는 `toss_mid/secret`, 없으면 기관 기본(환경변수 TOSS_SECRET_KEY). 없으면 payOnline:false.
- 웹훅은 2차. 결제창 이탈 `ready`는 sweep에서 30분 후 `failed`.

## 4. 계산 함수 (didisam/ledgercalc.js, 벡터로 3벌 검증)
- `balance(charges, allocs)`, `allocate(receiptAmount, openCharges)`(오래된 순), `summary(rows, {from,to,unit,rollup})`, `refund({rule, paid, used, total})`(02 §3 규정표 · 원문 미확인 표시 `lawCheck:true`), `share(rows, units)`(bp 단위 반올림 규칙: 원 단위 내림), `match(importRows, receipts)`(대사).

## 5. 화면
- 스튜디오 메뉴 「매출 · 수납」(`ledger`): 상단 단위 선택(본사 → 가맹점/부서, 롤업 토글) · AI 요약 한 줄 · 카드 4(순매출 · 수납률 · 미수 · 환불) · 탭(오늘 할 일 · 원장 · 청구 · 미납 · 현장 수납 · 환불 · 마감 · 가져오기 · 쉐어 · 설정[단위 · 토스 키 · 단말]). 기관 유형별 기본 탭 순서: 프랜차이즈(청구 · 미납 우선), 대학(부서 정산 · 가져오기), 체육(오늘 · 마감), 복지관(현장 수납 · 마감).
- 학습자 앱 「결제」: 내 청구서 · 결제 내역 · 영수증 링크 · 토스 결제. 링크 청구서 페이지(`learner.html?bill=`)는 로그인 없이 한 화면.
- 디자인: 디디쌤 Design System(Pretendard, primary #00C53B, 텍스트 그린 #007200, ink #212121), 이용자 앱은 튜브 시안 톤. 운영자 합니다체 · 이용자 해요체, 버튼 44px+, 글자 12px+, 이모지 금지, 색만으로 구분 금지.

## 6. 테스트
- Node: `service/server/test/ledger41.test.js`(단위), `tests/contract-ledger41.js`(Node · Java 같은 시나리오), `tests/ledger-vectors.json`.
- UI: `tests/ui/ledger41-admin.js`, `tests/ui/ledger41-learner.js`, 운영 모드 `tests/ui/ledger41-live.js`(로컬 Postgres 5544).
- 회귀: contract.js · contract-fac40 · fac40 계열 · smoke · compliance · scn-k12 · module-live. 시설 숫자 불변.
- 버전: v41.0, sw 캐시 didisam-app-v41.0 (통합 담당이 올림).

## 7. 계약 변경 반영 (Node 구현 기준 · 2026-11-14)
- 오류 응답은 기존 서버 형식 `{error, message}`(ok:false 없음). 성공 응답은 기존처럼 객체 그대로.
- 루트 단위 id `lu_root` 고정. 기관 플래그: `doc.ledger.on` 또는 `doc.org.ledger_on`.
- 링크 URL `/learner.html?t=<tid>&bill=<token>`. 단말 키 형식 `<tid>.<비밀>`.
- 열 추가: led_charge `bill_id · idem_key`, led_receipt `charge_ids · link_hash · corrects`, led_refund `reason · toss_cancel_key · idem_key · legacy_ref · done_at`, led_unit `toss_client_key`, led_import `meta`.
- 시설(v40) 이중 기록은 DB 트리거(fac_payment paid · fac_refund done → 원장 1줄, legacy_ref 유일) — Node · Java 공통.
- import는 1차에 JSON `{kind, csv}`만(멀티파트 2차). ledger-my 보호자 연결 2차. v41 이전 시설 결제 이관 스크립트 별도.
- 단위 테스트 위치 `service/test/`(기존 관례). 학원법 환불 비율은 원문 미확인 → 결과에 `lawCheck:true`.
- (추가) `GET /api/ledger/refunds?status` 환불 목록(Node · Java 구현). `device-push`는 CSRF 검사로 `x-didisam` 헤더 필요(에이전트도 전송).
- 미납 단계 기준: 1단계 기한 경과 1~7일, 2단계 8~30일, 3단계 31일 이상(`today`의 d1 · d8 · d31).
- `entries` 청구 줄 `balance`(할인 줄 먼저 차감, 할인 줄 자체 0), `summary.byUnitDetail` [{unitId, charged, paid, refund, net, unpaid, collectRate}] unitId 순 · collectRate는 % 소수 1자리 내림.
- `ledger-my` 청구 정렬은 created_at 시간 내림차순(Node · Java 동일).
