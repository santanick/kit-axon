# v40 시설 · 장비 예약 — 02. 운영자 화면 · 재사용 지도 · 데이터 모델 · /api 명세

작성: 요원 2(기획 — 운영자 · 데이터 · API), 2026-11-13. 근거: `scratchpad/v40/BRIEF.md`, `00-findings.md`, 저장소 `core/v40-facility`(origin/main bb1cb90).
용어: 이 문서에서 「자원」은 예약 대상 하나(타석 · 코트 · 강의실 · 노트북 · 사물함 한 칸)를 뜻합니다. 「시설」은 자원을 묶는 장소입니다(예: 골프연습장 = 타석 12개).

## 0. 설계 원칙 요약
1. 설정(시설 · 요금 · 규칙)은 기존 방식대로 운영자 문서 `S.fac`에 두고 게시본(`lsSnapshot`)으로 학습자에게 내보냅니다. 예약 · 이용권 · 체크인 · 환불은 동시성 때문에 **운영 DB 전용 표**에 둡니다(문서 한 덩어리로는 중복 예약을 막을 수 없음).
2. 데모(GitHub Pages)는 같은 계산 함수를 쓰고 데이터는 브라우저(`S.fac.demo`)에 둡니다. 운영은 서버가 주인입니다.
3. 금액 · 환불액 · 중복 판정은 항상 서버가 다시 계산합니다(쿠폰과 같은 방식, `service/server/coupon.js:11`).
4. 새 모듈 파일만 만들고 기존 파일은 「감싸서 확장」합니다. 코어 파일(`index.html`, `learner.html`, `modules.js`, `db.js` 등) 변경은 6절 「코어 변경 요청」에 모았습니다.

---
## 1. 운영자 화면(스튜디오) — 새 메뉴 「시설 · 장비」

메뉴 id는 `fac`(공간 `ops`, 대학 · 학원 · 기업 · 공공 · 평생 · 체육형 모두 프리셋에 켬. 교강사는 `fac`의 일부 화면만, 8절 권한). 화면 안 탭은 아래 8개이며, 화면 위 한 줄에 「오늘 처리할 일」(승인 대기 n · 반납 예정 n · 연체 n · 노쇼 n)을 먼저 보여 줍니다(화면만 보고 다음 할 일을 알도록).

| 탭 | 하는 일 | 핵심 칸 · 동작 |
|---|---|---|
| 1 목록 · 등록 | 시설 · 장비 · 사물함 등록 | 종류(시간 예약 / 이용권 / 대여), 이름 · 사진 · 위치, 운영 시간(요일별), 휴관일(날짜 · 반복 요일 · 「이용권 기간에 포함할지」), 시간 칸(15 · 30 · 60분), 정원(자원 수 · 칸당 인원), 요금표(신청자 구분 × 칸당 · 일일 · 기간), 오픈 시각(예: 매일 09:00에 7일 뒤까지), 신청 기간(연장 · 신규 · 추가 모집 구간), 승인제 여부, 결제 방식(온라인 · 현장 · 무료 · 승인 후 결제), 이용권 상품(일일권 1/5/10매, 1/3/6개월 할인율, 강좌 자율이용권), 규칙(동일인 중복 차단, 1일 1회 입장, 양도 불가, 미입장 자동 취소 분, 이탈 자동 취소 분), 환불 규칙, 구성원 확인(학번 · 학과 입력), 선택 수집(차량번호 등 — 목적 · 보관 기간 표시) |
| 2 예약 현황 | 일 · 주 캘린더, 시설별 타임라인 | 가로축 시간 · 세로축 자원. 칸을 누르면 상세(신청자 학번 끝 4자리 · 구분 · 상태 · 결제)와 [승인] [취소] [대신 예약]. 휴관 처리는 날짜 범위 선택 → 기존 예약 n건 영향 안내 → 알림 발송 선택 |
| 3 승인 대기함 | 승인제 신청 처리 | 목록(신청 시각 순) · 일괄 승인 · 반려 사유 입력(반려 알림에 포함) |
| 4 체크인 | 당일 입장 · 반납 | (가) QR 스캔(휴대폰 카메라), (나) 프론트 수동(학번 끝 4자리 · 예약 번호 검색), (다) 키오스크 모드(전체 화면 · 큰 글씨 · 자동 초기화 · 운영자 PIN으로 종료). 대여는 [반납 확인] + 상태 점검 메모 |
| 5 현장 결제 기록 | 프론트 결제 입력 | 결제 수단(카드 · 현금 · 계좌), 금액(서버 계산값 미리 채움, 다르면 사유), 영수증 번호. 미결제 현장 예약 목록에서 선택 |
| 6 환불 처리 | 취소 · 환불 | 공식 자동 계산 표시(규칙 이름 · 계산 줄) → 운영자가 금액을 고치면 **수정 사유 필수** → 확정 시 토스 취소 요청 또는 현장 환불 기록 |
| 7 노쇼 · 연체 | 자동 처리 결과 점검 | 노쇼 자동 취소 내역(되살리기 가능), 이탈 취소, 반납 연체(연체일 · 연체료 · 알림 재발송), 반복 노쇼 이용자 제한(선택) |
| 8 정산 · 통계 | 기간별 보고 | 매출(온라인 · 현장 · 환불), 이용률(자원 · 시간대), 노쇼율, 이용권 잔여 · 만료 예정, 월 마감 CSV(구글 시트 내보내기는 기존 `google` 연결 재사용) |

### 1-1. AI SAM 대화로 할 수 있는 일
기존 방식: `didisam/samctx.js:27`의 `scxPlan(제목, 설명, 실행함수)`로 「계획 카드 → 대표님 확인 → 실행」을 만들고 `logAudit`에 남깁니다. 새 파일 `didisam/fac-sam.js`가 규칙 칩과 의도 판정을 더합니다(`AI` 규칙 엔진은 `didisam/ai.js:8`).

| 말 | 하는 일 | 확인 카드에 보이는 것 |
|---|---|---|
| 다음 주 화요일 체육관 휴관 처리 | 휴관일 등록 + 영향 예약 조회 | 영향 예약 n건, 알림 보낼지, 환불 대상 금액 |
| 오늘 노쇼 몇 건이야 | 조회 | 건수 · 이름 대신 예약 번호 |
| 테니스 코트 평일 18시 이후 요금 3,000원 올려줘 | 요금표 수정 | 변경 전 · 후 |
| 승인 대기 전부 승인해 | 일괄 승인 | 대상 n건 |
| 반납 안 된 노트북 알려줘 / 연체 안내 보내 | 조회 / 알림 | 대상 · 문구 초안(발송은 확인 후) |
| 이번 달 체육관 이용률 | 통계 조회 | 표 |
| 사물함 5월 신청 12일 09:00 오픈으로 | 오픈 시각 · 신청 기간 설정 | 변경 전 · 후 |
금액 · 환불 확정과 대량 취소는 카드 확인 필수, 조회는 바로 답합니다.

---
## 2. 기존 코드 재사용 지도 (그대로 · 감싸서 확장 · 새로)

| 영역 | 기존 근거(파일:줄) | 처리 | v40에서 하는 일 |
|---|---|---|---|
| 금액 계산 규칙 | `didisam/coupon.js:12`, `service/server/coupon.js:11`, Java `pub/service/impl/DdCoupon.java` | 감싸서 확장 | 10원 단위 내림 · 서버 재계산 패턴을 그대로 따라 `fac` 계산을 같은 형태(화면 · Node · Java 3벌 동일 규칙)로 만듦. 쿠폰은 v1에서 시설에 안 씀(결정 4) |
| 결제 기록 이벤트 | `didisam/lshop.js:41`(pay → `R.pays`), `service/server/app.js:251`(events 라우트, `type==='pay'` 검증), `coupon.js:54`(`LPX.pay` 감싸기) | 감싸서 확장 | 시설 결제는 별도 표 `fac_payment`에 두고, 운영자 매출 화면(`S.pays`)에는 `itemType:'fac'` 요약 한 줄만 이벤트로 넘김(`LPX['fac-pay']`) |
| 토스 | `didisam/conn.js:57`(연결 카드), `S.settings.pg==='toss'`, `S.settings.toss.status`(`crs-flow.js:301`) | 그대로 + 새 | 연결 상태 판정은 그대로. **서버 승인(confirm) · 취소 호출 코드는 저장소에 없음**(결제는 지금 이벤트 기록 방식) → `fac/pay.js`를 새로 만듦(키는 환경변수, 결정 1) |
| 결제 on/off | `didisam/mem2.js:14`(`mbPayOn`), `mem2.js:483`(게시본 `pay`) | 그대로 | 결제 꺼진 기관(대학 기본)은 요금 칸 · 토스 숨김, 무료 + 승인제 |
| 학습자 캘린더 | `didisam/lcal.js`(전체), 서버 정리 `service/server/lpcal.js:12`(`cleanCal`, 최대 300) | 감싸서 확장 | 예약 확정 시 내 일정에 `src:'fac'` 항목 추가(`cleanCal`은 모르는 키를 버리므로 `cls` 필드를 쓰지 않고 `id:'fac-<bk>'`로 구분). 예약은 서버 표가 원본이라 캘린더는 표시용 |
| 운영자 캘린더 | `didisam/calx.js:21`(`cxPub`), `calx.js:23`(`S.calx.ev`) | 감싸서 확장 | 휴관일 · 예약 요약을 읽기 전용 일정으로 합쳐 표시(`cxPub` 감싸기). 예약 현황 탭은 새 타임라인 화면 |
| 메일 · 알림 | `service/server/mail.js:11`(`createMailer`, webhook · SMTP), Java `cmm/DdMail.java`, 학습자 알림은 `learner_events`(`db.js` 15번) | 그대로 | 예약 확인 · 승인 · 취소 · 반납 안내 · 연체를 메일로, 앱 알림은 이벤트 `fac-note`. 메일 미설정이면 앱 알림만(기존 안내 문구 재사용) |
| 모듈 분리 | `service/server/modules.js:5`(`PUB` 정규식), `:9`(`apiAllowed`), `:17`(`roleAllowed`), Java `cmm/DdModule.java` | 감싸서 확장 | 학습자 모듈이 쓰는 새 act(`fac-*`)를 `PUB`에 추가 필요(6절 코어 요청). 운영자 `/api/fac/*`는 admin 모듈 기본 허용, tutor 모듈은 `TUTOR_API` 목록에 읽기 일부만 추가 |
| 운영자 메뉴 | `didisam/core.js:82`(`MENU`), `:114`(`PRESET`), `:164`(`VIEWS`), `:339`(`ACT`), `:173`(`TEACH_NO`), 예: `scn-k12.js:7,13` | 감싸서 확장 | `fac.js`에서 `Object.assign(MENU, {fac:{label:'시설 · 장비', ws:'ops'}})`, 각 `PRESET.*.on`에 삽입, `VIEWS.fac`, `ACT['fac-…']`. `upgradeState`(`build.js:504`)로 기존 저장 사용자에 `S.fac` 기본값 |
| 시나리오 등록 | `scripts/scenarios.json` | 해당 없음 | 이 모듈은 공통 코어(`core/v40-facility`)라 시나리오 범위 밖. 기관 유형별 기본값은 `fac-core.js`의 프리셋 표에서 처리 |
| 학습자 앱 확장점 | `didisam/lscn-init.js:2`(`LSCN_PICK`), `lapp.js:60`(`scnExt`), 튜브 하단 탭(`docs/parallel/v39-tube.md`) | 감싸서 확장 | 「시설 · 예약」 진입점을 홈 카드 + 「나」 목록 + 웹 머리 메뉴에 추가(하단 탭 4칸은 유지) |
| 데모 상태 | `didisam/core.js:29`(`S`), `save()` → localStorage, `render()` | 그대로 | `S.fac` 아래에 설정 + 데모 예약 |
| 운영 모드 | `didisam/live.js:5`(`api`), `live.js:7~`(`__preboot`: `/api/state`), `didisam/lpx.js:23~`(`lpxPullLive` 30초 폴링, `S.lpxSeq`) | 그대로 | 운영 모드에서는 예약 데이터를 `/api/fac/*`로 읽고, 요청함 폴링은 알림 용도로만 사용 |
| 서버 라우트 묶음 | `service/server/lms/index.js:17`(`loadRoutes`, `mod-*.js`), `app.js:539`(묶음 등록), `lms/index.js:12`(`sql/NN_*.sql` 파일명 기록) | 감싸서 확장 | `service/server/fac/`를 같은 구조로 새로 만듦(`mod-*.js`, `sql/NN_*.sql`, 이름 충돌 시 기동 중단). 번호 충돌 없이 병렬 개발 가능 |
| DB 격리 | `db.js:69` 부근(`tenant_iso` 정책 패턴), `db.js:265`(`inTenant`: `set local role didisam_tenant` + `app.tenant`) | 그대로 | 새 표 모두 같은 정책 · 권한 부여 |
| 기관 공통 한도 · 감사 | `app.js:68`(`limit`), `audit` 컨텍스트 | 그대로 | 예약 폭주 제한(IP · 학습자당), 취소 · 환불 · 수정은 감사 로그 |
| 정리 작업 | `service/server/index.js:15`(1시간 `tick`), Java `PiiServiceImpl.java:388`(`@Scheduled` 1시간), `app.js:251`(요청 때 2% 확률 삭제) | 감싸서 확장 | 15분 단위 자동 취소는 「요청 때 정리」 + 1시간 tick 보강(5-6절). Cloud Scheduler는 쓰지 않음(저장소에 없음) |
| 개인정보 | `service/server/pii.js`(`redactDeep`), 학습자 `sid`(학번)·`dept` 표 `learners`(`db.js` 4번) | 그대로 | 학번 · 학과 외 수집 금지. 차량번호 등은 `fac_booking.extra`에 암호화 없이 두지 않고 목적 · 삭제일과 함께 저장(5-7절) |
| 외부 연계 | 없음 | 새 | 학교 대관 · 주차 시스템은 1차 링크 칸(`시설.link`)만 |

---
## 3. 데이터 모델

### 3-1. 데모 상태 `S.fac` (운영자 문서에 저장 · 게시본으로 학습자에게 전달)
```js
S.fac = {
  on: true,
  facilities: [{            // 시설(장소)
    id: 'f_gym', name: '체육관', kind: 'time',      // time(시간 예약) | pass(이용권) | rent(대여)
    place: '체육관 2층', photo: '', note: '', link: '',
    hours: { 1:['09:00','22:00'], 2:[...], 0:null },       // 요일 → [열림, 닫힘] | null(휴무)
    closed: [{ id:'c1', from:'2026-11-17', to:'2026-11-17', repeat:'', reason:'시설 점검', pass:'extend' }], // pass: extend(이용권 기간 연장) | keep
    slotMin: 60, unitMin: 60,                          // 시간 칸 · 최소 이용 칸 수는 minSlots
    minSlots: 1, maxSlots: 4,
    capacity: { res: 1, perSlot: 30 },                 // 자원 수(타석 12) · 칸당 인원
    open: { daysAhead: 7, at: '09:00' },               // 오픈 시각: 매일 09:00에 7일 뒤까지
    windows: [{ id:'w1', name:'신규 신청', from:'2026-12-01', to:'2026-12-10' }], // 신청 기간(없으면 상시)
    approval: false, pay: 'online',                    // online | onsite | free | after-approve
    audience: ['student','staff','public'],            // 신청자 구분
    verify: 'sid',                                     // none | sid(학번 · 학과) | sso(예정)
    prices: { student:{slot:0}, staff:{slot:5000}, public:{slot:20000} },  // 원/칸 (원 단위 정수)
    rules: { dupSame:true, exclGroup:'golf', noShowMin:15, leaveMin:15, oneEntryPerDay:true, transferable:false, maxActive:3 },
    refund: { type:'time', steps:[{ beforeH:48, rate:100 },{ beforeH:24, rate:50 },{ rate:0 }] },
    extra: [{ key:'car', label:'차량번호', purpose:'방문 차량 출입 등록', keepDays:30, required:false }],
    resources: [{ id:'r1', name:'타석 1', on:true }],   // 자원(대여는 수량 단위 또는 개별 번호)
  }],
  products: [{              // 이용권 · 대여 상품
    id:'p_m1', fac:'f_golf', type:'pass-period', name:'월이용권 1개월', days:30, prices:{ public:150000, student:120000 },
    discountRate:0, perDayEntry:1, transferable:false,
    refund:{ type:'pass-period', unitPrice:{ public:12000 }, feeRate:10 } },
    // type: pass-count(일일권 n매: count, expireDays) | pass-period | pass-course(강좌 수강생 자율이용: cls, count|days) | rent(days, deposit, lateFeePerDay)
  ],
  demo: { bookings:[], passes:[], rentals:[], checkins:[], pays:[], refunds:[] },   // 데모 전용 · 운영은 서버 표
  settings: { kioskPin:'', notify:{ mail:true, app:true }, retentionDays:90 }
}
```
기관 유형별 기본값(`fac-core.js`의 `FAC_PRESET`): 대학 = 시간 예약 + 대여, `verify:'sid'`, 무료 + 승인제 · `pay:'free'`; 공공 · 체육형 = 시간 예약 + 이용권, `pay:'online'`, 신청자 구분 3종; 학원 · 평생 = 강의실 · 장비; 기업 = 회의실 · 교육장, `verify:'none'`. 「스포츠센터」 템플릿 = 위 체육형에 타석 · 코트 · 월이용권 · 사물함 샘플.

### 3-2. 운영 DB 표 (파일 `service/server/fac/sql/10_fac.sql`, 기존 `lms/sql` 방식)
모든 표: `tenant_id text not null references tenants(id) on delete cascade`, `enable/force row level security`, 정책 `tenant_iso`(`db.js:69` 부근과 동일), `grant … to didisam_tenant`. 금액은 `integer`(원), 시각은 `timestamptz`, 날짜 · 칸 번호는 KST 기준 `date` + `smallint`.

| 표 | 주요 열 | 제약 · 인덱스 |
|---|---|---|
| `fac_booking` 예약 | `id text pk`(`bk_` + 12자리), `fac_id`, `res_id`, `sid`(학습자), `aud`(student/staff/public), `day date`, `start_slot smallint`, `slots smallint`, `status`(requested · approved · confirmed · checked_in · done · cancelled · no_show · rejected · expired), `pay_mode`, `amount int`(서버 계산 총액), `pay_status`(none · pending · paid · refunded · partial), `pass_id`(이용권으로 예약 시), `group_no`(한 번에 여러 칸), `note`, `extra jsonb`(선택 수집, `purge_at` 포함), `created_at`, `hold_until`(결제 대기 보류 만료), `cancel_reason` | pk(`tenant_id,id`) · 인덱스(`tenant_id,day,res_id`), (`tenant_id,sid,day`) |
| `fac_slot` 칸 점유(중복 방지의 본체) | `fac_id`, `res_id`, `day`, `slot`, `seat smallint`(1..칸당 정원), `booking_id`, `sid`, `excl_group text null` | **pk(`tenant_id,res_id,day,slot,seat`)** = 같은 칸 같은 좌석 이중 점유 불가. **unique(`tenant_id,sid,day,slot,excl_group`) where `excl_group is not null`** = 동일인 같은 시간 다른 타석 차단. 예약 취소 · 만료 때 이 행을 삭제 |
| `fac_pass` 보유 이용권 | `id`(`ps_`…), `sid`, `product_id`, `fac_id`, `kind`(count · period · course), `total int`, `used int`, `starts_on`, `ends_on`, `status`(active · expired · refunded · paused), `pay_id`, `cls_id`, `created_at` | 인덱스(`tenant_id,sid,status`). 사용 횟수 차감은 `update … set used = used + 1 where used < total` 한 문장(경쟁 안전) |
| `fac_checkin` 입장 기록 | `id bigserial`, `booking_id`, `pass_id`, `sid`, `fac_id`, `day`, `at timestamptz`, `via`(qr · front · kiosk), `by`(운영자 이메일 또는 `kiosk`), `token_jti` | **unique(`tenant_id,sid,fac_id,day`) where `pass_id is not null`** = 이용권 1일 1회 입장. `unique(tenant_id, token_jti)` = QR 1회용 |
| `fac_rental` 대여 | `id`, `sid`, `res_id`, `product_id`, `from_day`, `due_day`, `returned_at`, `deposit int`, `deposit_status`(held · returned · forfeited), `late_fee int`, `condition_note`, `status`(requested · approved · lent · returned · overdue · cancelled) | **unique(`tenant_id,res_id`) where `status in ('approved','lent','overdue')`** = 같은 물품(사물함 칸 · 장비 1대) 이중 대여 불가 |
| `fac_payment` 결제 연결 | `id`(`fp_`…), `booking_id`/`pass_id`/`rental_id`(셋 중 하나), `method`(toss · card_onsite · cash · bank · free), `amount int`, `list_amount int`, `toss_key`, `toss_order_id unique`, `receipt_no`, `recorded_by`, `at`, `status`(ready · paid · cancelled) | unique(`tenant_id,toss_order_id`) = 결제 이중 확정 방지 |
| `fac_refund` 환불 | `id`, `payment_id`, `target`, `rule_type`, `calc jsonb`(공식 자동 계산 줄), `auto_amount int`, `amount int`(확정액), `edit_reason text`(자동값과 다르면 not null), `by`, `at`, `toss_cancel_key`, `status` | check(`amount = auto_amount or edit_reason is not null`) |

표는 7개(`fac_booking`, `fac_slot`, `fac_pass`, `fac_checkin`, `fac_rental`, `fac_payment`, `fac_refund`). 상품(이용권) · 휴관 · 요금 · 오픈 시각 · 신청 기간은 표를 만들지 않고 문서(`S.fac`)가 원본이며 서버는 게시본을 읽습니다(`service/server/coupon.js:20`과 같은 방식).
이용자 식별은 기존 `learners.sid`(학번 또는 가명 id)를 그대로 씁니다. 이름 · 연락처는 받지 않고, 알림 메일은 가입 시 이미 저장된 암호화 이메일을 `pii`에서 꺼내 보내는 기존 경로(`pii.js`)만 사용합니다.
Java: 스키마는 Node 마이그레이션이 소유합니다(`service-egov/README.md:41`) → 표 정의는 Node 한 곳, Java는 매퍼(XML)만.

---
## 4. 계산 규칙 (화면 · Node · Java 3벌이 같은 값을 내야 함)

`didisam/fac-core.js`(학습자 · 운영자 공용, `window.facCalc`) = `service/server/fac/calc.js` = Java `DdFac`. 입력과 출력이 JSON이라 3곳에서 같은 테스트 벡터(`tests/fac-vectors.json`)로 대조합니다.

- **견적** `quote({fac, aud, day, startSlot, slots, productId})` → `{ list, off, final, lines:[…], needVerify, pay }`. 칸 요금 = `prices[aud].slot × slots`(요일 · 시간대 할증은 `prices[aud].rules[]` 확장 칸, v1은 칸당 단가만). 이용권 상품은 `prices[aud]` 또는 `days × 일일 단가 × (1 − discountRate)`를 10원 단위 내림(`coupon.js:19`와 같은 내림).
- **오픈 판정** `isOpen(fac, day, nowKST)`: `windows`가 있으면 구간 안, `open.daysAhead` · `open.at`으로 「지금 열린 가장 먼 날짜」 계산, 휴관 · 요일 운영 시간 확인. 서버 시각(KST)만 신뢰.
- **환불** `refund({rule, paid, usedDays|usedCount, unitPrice, startAt, now})` → `{ auto, lines:[…] }`
  - `time`: 시작 n시간 전 구간표(예: 48h 100% · 24h 50% · 이후 0%).
  - `pass-period`: 골프 월이용권 규칙 그대로 — `환불 = 결제액 − (일일권 단가 × 이용 일수) − 결제액 × feeRate%`, 0 미만이면 0. 결제일 포함 사용 일수.
  - `pass-count`: `결제액 − (단가 × 사용 횟수) − 수수료`.
  - `rent`: 보증금 전액 − 연체료 − 파손 차감(운영자 입력).
  - 운영자가 `amount`를 고치면 `edit_reason` 필수, 감사 로그 기록.
- **연체료** `lateFee = min(보증금 상한, 연체일 × lateFeePerDay)`.

---
## 5. /api 명세 (Node `service/server`와 Java `service-egov` 같은 규격)

공통: 요청 헤더 `x-didisam: 1`(`live.js:9`), JSON, 오류 형식 `{error:'코드', message:'한글 안내'}`(기존과 동일), 금액 단위 원(정수), 날짜 `YYYY-MM-DD`(KST), 칸 번호는 0부터(`slot*slotMin`분 = 열림 시각 기준). 학습자 호출은 기관 범위 트랜잭션(`inTenant`) 안에서 처리하고 `limit()`으로 속도 제한(예약 학습자당 30회/10분, 조회 IP당 120회/10분).

### 5-1. 공개 · 학습자 쪽 `/api/pub/<tid>/fac-*`
학습자 라우트는 기존 규칙(`app.js` `pubRoute`가 `메서드 + 한 단어 act`로 분기, Java `PubController`도 같음)을 따르므로 **act를 하이픈으로 이은 한 단어**로 둡니다. 로그인 필요 표시 없는 것은 방문자 열람 가능.

| 메서드 act | 로그인 | 요청 | 응답 | 오류 |
|---|---|---|---|---|
| `GET fac-list` | 불필요 | - | `{facilities:[{id,name,kind,place,photo,hours,audience,pay,approval,verify,open,windows,rules(공개분),prices,products}]}` (게시본에서, 개인 · 내부 칸 제외) | 404 tenant |
| `GET fac-avail?fac=f_gym&day=2026-11-18` | 불필요 | - | `{day, open:true, slots:[{slot:0,from:'09:00',to:'10:00',free:[1,2,5],left:3,closed:false,past:false}], note:'휴관 안내'}` (`free`는 자원별 남은 좌석, 개인 정보 없음) | 400 date · 404 fac · 409 not_open(아직 오픈 전: `{opensAt:'2026-11-17T09:00+09:00'}`) |
| `POST fac-quote` | 필요 | `{fac, day, slot, slots, aud, productId?}` | `{list, final, lines:[…], pay:'online', needVerify:true, approval:false}` | 400 · 403 aud(구성원 아님) |
| `POST fac-book` | 필요 | `{fac, res?, day, slot, slots, aud, productId?, passId?, extra:{car}, idem:'uuid', consent:{extra:true}}` | `{ok:true, booking:{id,status,amount,payStatus,holdUntil}, next:'pay'｜'wait'｜'done', orderId?:'…'}` | 409 taken(`{alt:[…]}` 같은 시간 다른 자원) · 409 dup_same(동일인 같은 시간) · 409 not_open · 409 closed · 429 limit · 400 amount(클라이언트 금액이 있으면 불일치) · 403 verify |
| `POST fac-pay` | 필요 | `{booking, paymentKey, orderId, amount}` (토스 승인 후) | `{ok:true, status:'confirmed'}` | 400 amount_mismatch(서버 금액과 다름 → 승인 취소) · 409 hold_expired · 502 pg |
| `GET fac-my` | 필요 | `?scope=upcoming｜past` | `{bookings:[…], passes:[{id,name,left,endsOn,status}], rentals:[…]}` | - |
| `POST fac-cancel` | 필요 | `{booking, reason}` | `{ok:true, refund:{auto, lines}, status}` (취소 가능 시점이면 환불 자동 계산을 응답에 포함, 실제 환불 확정은 5-2 `refunds`에서; 규칙이 100% 자동이면 서버가 바로 토스 취소) | 409 not_cancelable |
| `POST fac-qr` | 필요 | `{booking｜passId｜rental}` | `{token:'v1.…', exp:'2026-11-18T08:50+09:00', day}` (당일만 발급, 5-5절) | 409 not_today · 409 not_ready(승인 대기 · 미결제) |
| `POST fac-rent` | 필요 | `{fac, res?, productId, days, aud, extra, idem}` | `{ok, rental:{id,status,dueDay,deposit}, next}` | 409 taken · 403 verify |
| `POST fac-buy` | 필요 | `{productId, aud, idem}` | `{ok, pass:{id,…}, orderId?, next}` (이용권 구매, 결제는 `fac-pay`와 같음) | 400 · 409 not_open |

### 5-2. 운영자 쪽 `/api/fac/*` (admin 모듈, 로그인 직원 · `needStaff`, 교강사는 8절 범위만)
| 경로 | 요청 → 응답 | 권한 · 비고 |
|---|---|---|
| `GET /api/fac/overview` | → `{pendingApprovals, dueReturns, overdue, noShow, today:{bookings,checkins}}` | 교강사 가능 |
| `GET /api/fac/bookings?from&to&fac&status&q` | → `{bookings:[{id,facName,resName,day,from,to,status,aud,sidTail,amount,payStatus}]}` (학번 끝 4자리로 마스킹, 상세는 별도) | 교강사: 본인 시설만 |
| `GET /api/fac/bookings/:id` | → 상세 + 결제 · 환불 · 체크인 이력 | 정 · 부 운영자 |
| `POST /api/fac/bookings` | 운영자 대신 예약 `{fac,res,day,slot,slots,sid|walkin:'현장 1',aud,payMode:'onsite'}` → 5-1 `fac-book`과 같은 검사 | 정 · 부 |
| `POST /api/fac/bookings/:id/approve` | `{}` → `{status:'approved'｜'confirmed'}` (결제 필요 시 결제 대기로 전환 + 알림) | 정 · 부 |
| `POST /api/fac/bookings/:id/reject` | `{reason}` → `{status:'rejected'}` + 알림 | 정 · 부 |
| `POST /api/fac/bookings/:id/cancel` | `{reason, notify:true}` → `{refund:{auto,lines}}` | 정 · 부 |
| `POST /api/fac/closures` | 휴관 등록 `{fac, from, to, reason, pass:'extend', notify, cancelBookings:true}` → `{affected:12, cancelled:12, refundsPending:12}` (게시본 문서 수정은 화면이 `PUT /api/state`로, 서버는 영향 예약 일괄 취소 · 이용권 기간 연장만 처리) | 정 · 부, 감사 로그 |
| `POST /api/fac/checkin` | `{token}`(QR) 또는 `{booking｜sidTail+day}`(수동) 또는 `{kiosk:'pin-token', token}` → `{ok, who:{sidTail,aud}, product, left}` | 정 · 부 · 키오스크 토큰. 오류: 409 used(이미 사용된 QR) · 409 early/late · 409 wrong_fac · 409 once_per_day · 410 expired |
| `POST /api/fac/kiosk/start` | `{pin}` → `{kioskToken(exp 12h, fac 한정)}` — 키오스크 화면은 운영자 로그인 대신 이 토큰으로 `checkin`만 호출 | 정 · 부 |
| `POST /api/fac/payments` | 현장 결제 기록 `{booking｜pass｜rental, method:'card_onsite'｜'cash'｜'bank', amount, receiptNo, note}` → 서버 금액과 다르면 400 `amount`(사유 `note`가 있어도 서버가 가격표 재계산값과 다르면 `diffReason` 필수) | 정 · 부 |
| `GET /api/fac/refunds?status` / `POST /api/fac/refunds` | `{payment, amount, editReason?}` → 공식 자동 계산 `calc` 반환 + 자동값과 다르면 `editReason` 필수(400 `reason`) → 확정 시 토스면 취소 호출, 현장이면 기록만 | 정 · 부(교강사 불가) |
| `POST /api/fac/rentals/:id/lend` · `/return` | `{condition?, deductions?}` → `{lateFee, depositReturn}` | 정 · 부 |
| `POST /api/fac/passes` · `POST /api/fac/passes/:id/adjust` | 운영자가 이용권 직접 부여(무료 · 수강생 자율이용권) · 횟수 조정 `{delta, reason}` | 정 · 부, 감사 |
| `GET /api/fac/noshow` · `POST /api/fac/noshow/:id/restore` | 노쇼 · 이탈 취소 목록 · 되살리기(칸이 비어 있을 때만) | 정 · 부 |
| `GET /api/fac/stats?from&to&group=fac｜day｜aud` | → 매출 · 이용률 · 노쇼율 · 환불 | 정 · 부(매출은 정운영자) |
| `GET /api/fac/export?from&to&type=csv` | CSV 내려받기 | 정운영자 |
권한 열의 정 · 부 · 교강사는 `users.role`(`owner`/`sub`/`teacher`, `db.js` 1번)과 `needOwner` · `needStaff`(`app.js:144-145`)로 판정합니다.

### 5-3. 동시 예약 중복 방지
`fac-book`은 한 트랜잭션에서: ① `pg_advisory_xact_lock(hashtext(tid || res || day))`로 같은 자원 · 날 예약만 직렬화(대량 동시 요청에도 락 범위 최소) ② 오픈 · 휴관 · 운영 시간 · 신청 기간 · 구성원 확인 검사 ③ 칸마다 `fac_slot`에 `insert … on conflict do nothing`로 좌석 1..정원을 차례로 시도, 칸 하나라도 실패하면 전체 롤백 → 409 `taken` ④ 동일인 규칙은 `unique(sid,day,slot,excl_group)` 위반(SQLSTATE 23505)을 409 `dup_same`으로 변환. 즉 **최종 방어선은 DB 제약**이고 락은 오류 재시도를 줄이는 장치입니다. `idem`(클라이언트가 만든 uuid)은 `fac_booking.id`에 매핑해 새로고침 · 재전송에도 한 건만 만듭니다. 대여는 `fac_rental`의 부분 유일 인덱스가 같은 역할을 합니다. Java는 같은 SQL을 MyBatis로 호출하고 `DuplicateKeyException`(`PiiServiceImpl.java:14`가 이미 쓰는 예외)을 같은 오류 코드로 바꿉니다.

### 5-4. 금액 서버 재계산
- 클라이언트가 보낸 `amount`는 **검증용**일 뿐입니다. 서버가 게시본 `doc->'lsite'->'pub'->'fac'`(없으면 `doc->'fac'`)에서 요금표 · 규칙을 읽어 `quote()`를 다시 돌려 `fac_booking.amount`를 정하고, 토스 승인 요청 금액도 이 값으로 합니다. 다르면 400 `amount`(`app.js:251`의 `coupon_amount`와 같은 방식).
- `fac-pay`는 토스 승인 API의 응답 금액과 `fac_booking.amount`를 비교하고, 다르면 승인 취소 후 400.
- 결제 보류: 결제 대기 예약은 `hold_until`(기본 10분)까지만 칸을 잡고, 지나면 5-6절 정리가 칸을 풀어 줍니다.
- 학습자가 보낸 요금 관련 값(단가 · 할인 · 구분)은 저장하지 않습니다(`aud`만 받고 구성원 확인은 학번 · 학과로 서버 판정).

### 5-5. QR 체크인 토큰
- 형식: `v1.<base64url(payload)>.<base64url(HMAC-SHA256)>`. payload = `{t:tid, b:bookingId｜p:passId｜r:rentalId, f:facId, d:'2026-11-18', jti:random16, exp}`.
- 서명 키: 기관별 파생 키 = `HMAC(FAC_QR_KEY, tid)`(환경변수 `FAC_QR_KEY`, 없으면 `PII_KEY`에서 파생해 새 비밀 추가 없이 시작 — `pii.js`의 `piiKeys` 패턴, 결정 1과 함께 확인). 응답 · 로그에 키 값을 남기지 않습니다.
- 만료: 예약 시작 30분 전 ~ 종료 15분 뒤(이용권은 당일 23:59). 발급은 당일만(`fac-qr`가 409 `not_today`). 유효 시간이 짧아 화면 캡처 재사용 위험이 작습니다.
- 1회용: 체크인 성공 시 `fac_checkin.token_jti` 유일 제약으로 소진. 같은 QR 재사용은 409 `used`. 이용권은 별도로 `unique(sid, fac, day)`(1일 1회 입장)가 막습니다.
- 위조 · 타 기관 · 타 시설 QR은 서명 검증 · `t`/`f` 대조에서 거절(403). 양도 불가 시설은 입장 시 학습자 본인 확인(학번 끝 4자리 입력)을 요구하는 옵션(`rules.transferable:false` + `verifyOnEntry`).

### 5-6. 자동 취소(노쇼 · 이탈) — 크론 없이
저장소에는 Cloud Scheduler · 외부 크론이 없고, 정리는 「요청 때 일부 처리 + 1시간 `tick`」 방식(`app.js:251`, `index.js:15`, `PiiServiceImpl.java:388`)입니다. 같은 방식으로:
1. **요청 시 정리(주 방식)**: `fac-avail`, `fac-book`, `GET /api/fac/overview` · `bookings` 호출 때 해당 시설 · 날짜에 대해 `sweep(tid, fac, day)`를 실행 — ① `hold_until` 지난 결제 대기 예약 `expired` + 칸 해제 ② 시작 후 `noShowMin`분(기본 15)이 지나도 체크인 없는 확정 예약 → `no_show`(칸은 유지하지 않고 해제, 환불 없음이 기본, 규칙에 따라) ③ 체크인 후 `leaveMin`분 안에 이탈 표시(키오스크 퇴장 스캔 사용 시)가 없는 건은 이탈 취소(규칙 켠 시설만). 한 번에 처리량 상한 200건, 같은 (기관 · 시설 · 날) 1분 한 번만(메모리 시각 표시).
2. **1시간 tick(보조)**: 기관별로 오늘 · 어제 날짜의 위 ①②를 수행(`pool` 전체 순회가 아니라 `fac_booking`에서 `status in (requested, confirmed) and day >= today-1`인 기관만). 연체 대여 `overdue` 전환 · 연체 알림 재발송(하루 1회)도 여기서.
3. 정리 결과는 모두 `audit`에 `actor:'system'`으로 기록하고 노쇼 탭에서 되살릴 수 있습니다(5-2).
4. Cloud Run이 0대로 줄어도 위 1이 요청 시 동작하므로 정확도는 「그날 첫 조회 시점」에 의존합니다. 분 단위 정확한 알림이 필요하면 후속으로 Cloud Scheduler가 `POST /api/fac/sweep`(서비스 계정 토큰)를 호출하게 할 수 있습니다(v1 범위 밖, 결정 5와 별개).

### 5-7. 개인정보
- 필수: `sid`(학번 또는 가명 id), `aud`. 대학은 `dept`(학과)를 `learners`에서 읽음(`db.js` 4번). 이름 · 연락처 수집 없음.
- 선택 항목(차량번호 등): `extra`의 각 칸에 `purpose`와 `keepDays`가 있어야 화면에 노출되고, 학습자 동의 체크(`consent.extra`)가 있어야 저장합니다. `purge_at = day + keepDays`, 1시간 tick(5-6)이 `extra`를 지웁니다. 운영자 목록은 학번 끝 4자리로만 보이고, 전체 학번 조회는 상세에서 `pii.access_log` 방식으로 기록합니다.
- 알림에는 개인정보를 넣지 않고 예약 번호 · 시설명 · 시각만.

---
## 6. 코어 변경 요청 (통합 담당에게)
`CLAUDE.md`의 「통합 채팅방에 요청할 변경」에 해당하는 것들입니다. 이번 모듈은 통합 채팅방(`core/v40-facility`)이 직접 하므로 병합 담당이 한 번에 처리합니다.
1. `service/server/modules.js:5` `PUB` 정규식에 `fac-(list|avail|quote|book|pay|my|cancel|qr|rent|buy)` 추가(Java `DdModule`도). tutor 모듈 `TUTOR_API`에 `GET /api/fac/overview`, `GET /api/fac/bookings` 추가.
2. `service/server/app.js`: `pubRoute`에 `fac-*` 위임 한 줄 + 라우트 묶음 로더 한 줄(`app.js:539`와 같은 모양) / Java `PubController` · 매퍼 등록.
3. `service/server/db.js`: 기본 `MIGRATIONS`는 건드리지 않고 `fac/sql` 파일 방식 migrate 호출 한 줄(기존 `LMS_SQL` 루프를 일반화).
4. `index.html`: `<script src="didisam/fac-core.js">`, `fac.js`, `fac-sam.js` 순으로(`boot.js` 앞) / `learner.html`: `lfac.js`(`lapp.js` 앞). `?v=` · `sw.js` 올림은 통합 담당. 태그는 각 한 줄.
5. `PRESET.*.on`에 `fac` 삽입은 `fac.js`가 하므로 `core.js` 수정 불필요.

## 7. 결정 필요 (5개)
1. **토스 결제 승인 · 취소 서버 코드 신규 + 키 위치**: 현재 저장소에는 결제 승인(confirm) 호출이 없어 시설 결제를 처음으로 실결제로 만들게 됩니다. 기관별 상점 키(Secret Manager)로 `fac/pay.js`를 만들지, 1차는 「현장 결제 기록 + 무료 + 승인제」만 열고 온라인 결제는 2차로 미룰지 정해 주십시오(창원대는 현재 전부 현장 결제).
2. **예약 데이터의 주인**: 이 설계는 운영 DB 전용 표(7개)입니다. 데모(Pages)는 브라우저 저장이라 기관 간 · 기기 간 공유가 안 됩니다. 이 차이를 받아들이고 운영 서버 전용으로 개발해도 되는지 확인 바랍니다.
3. **구성원 확인 방식**: 대학은 v1에서 「학번 + 학과 입력(자기 신고) + 운영자 승인 시 확인」으로 하고 학교 SSO는 후속으로 둘지, 학번 명단 업로드로 서버가 대조할지 정해 주십시오(요금이 구성원 · 일반으로 다르므로 부정 이용이 걸림).
4. **쿠폰 · 학기 할인 적용 범위**: 기존 쿠폰은 강좌 전용(`app.js:251`)입니다. 시설 이용권에 쿠폰을 열면 `coupon.check` 대상을 `fac:<product>`로 넓혀야 합니다. v1은 「이용권 기간 할인율(1/3/6개월)만, 쿠폰 없음」으로 가도 되는지.
5. **노쇼 자동 취소의 정확도**: 요청 시 정리(기본) 방식은 「그날 첫 조회」까지 지연될 수 있습니다. 분 단위가 필요하면 Cloud Scheduler 도입(인프라 추가)이 필요한데, v1은 요청 시 정리 + 1시간 tick으로 충분한지 정해 주십시오.

---
## 8. 교강사 · 하위 운영자 권한
기존 3역할(`owner` 정운영자, `sub` 하위 운영자, `teacher` 교강사 — `db.js` 1번, `core.js:173` `TEACH_NO`)을 그대로 씁니다. 새 권한 칸은 만들지 않습니다.

| 기능 | 정운영자 | 하위 운영자 | 교강사 |
|---|---|---|---|
| 시설 · 요금 · 규칙 등록 · 수정 | O | O | X |
| 예약 현황 보기 | O | O | 본인 담당 시설만(운영자가 `admins[].fac[]`로 배정, `scope()`(`modules.js:33`) 패턴 확장) |
| 승인 · 반려 · 취소 | O | O | 담당 시설의 승인만(옵션) |
| 체크인 · 반납 | O | O | 담당 시설 O |
| 현장 결제 기록 · 환불 확정 · 금액 수정 | O | 환불은 정운영자 승인(옵션 설정) | X |
| 정산 · 통계 · CSV | O | 이용 통계만 | X |
| 키오스크 PIN · 휴관 일괄 취소 | O | O | X |
`/api/fac/*`는 `needStaff`(교강사 거절)가 기본이고, 교강사에 열 라우트(overview · bookings 목록 · checkin · rentals 반납)만 `teacherFac`로 별도 허용(`teacherView`/`teacherMerge`(`modules.js:46,56`)처럼 담당 시설 범위로 거름).

---
## 9. 개발 4명 작업 분담 · 파일 경계 · 테스트

공통: 먼저 `fac-core.js`의 JSON 형태(3-1)와 `tests/fac-vectors.json`(계산 벡터)을 요원 2 문서 기준으로 확정. 이후 각자 자기 파일만 수정합니다(겹치면 병합 시 충돌).

| 개발 | 맡는 일 | 새 파일(소유) | 기존 파일 수정 |
|---|---|---|---|
| A Node 서버 | 마이그레이션 SQL, 계산(`calc.js`), 라우트(`mod-*.js`: pub · admin), QR 토큰, 정리(sweep), 토스 승인 · 취소, 메일 알림 | `service/server/fac/{index.js,calc.js,qr.js,sweep.js,pay.js,mod-pub.js,mod-admin.js,sql/10_fac.sql}`, `service/test/fac40.test.js` | 코어 요청 2 · 3의 한 줄씩만(`app.js`, `db.js`, `modules.js`) |
| B Java 서버 | A와 같은 `/api`를 Spring + MyBatis로. 계산은 벡터 테스트로 일치 | `service-egov/…/fac/{web,service,service/impl}/`(`FacController`, `FacService`, `FacMapper`, `DdFac`), `src/main/resources/egovframework/mapper/FacMapper.xml`, `service-egov/test/contract-fac40.js` | `PubController` 위임, `DdModule`(코어 요청 1 · 2) |
| C 스튜디오 화면 | 메뉴 · 8개 탭 · 등록 폼 · 타임라인 · 키오스크 · AI SAM 칩 · 데모 상태 | `didisam/fac.js`, `fac.css`, `fac-admin-*.js`(탭별로 나눔), `fac-sam.js`, `fac-core.js`(계산 + 프리셋, **공용 · 먼저 완성**) | `index.html` 태그 한 줄씩 보고(통합 담당이 반영) |
| D 이용자 앱 · 웹 | 찾기 → 날짜 · 칸 → 구분 요금 → 결제 → 확인 + 캘린더 → QR · 마이 예약 · 이용권 · 대여. 튜브 디자인 기준(`docs/parallel/v39-tube.md`), 44px · 12px · 해요체 | `didisam/lfac.js`, `lfac.css`, `didisam/lfac-qr.js`(QR 그리기) | `learner.html` 태그 한 줄 |

경계 규칙: ① 계산 3벌(`fac-core.js` · `fac/calc.js` · `DdFac`)은 같은 벡터 파일 통과가 병합 조건 ② A · B는 같은 오류 코드 · 필드 이름 사용(5절이 계약) ③ C · D는 서로의 파일을 읽기만 하고 `window.facCalc`만 공유 ④ 새 표 · 라우트 이름 충돌은 기동 시 중단(`lms` 방식).

### 테스트 목록
| 파일 | 내용 |
|---|---|
| `tests/fac-vectors.json` | 견적 · 오픈 판정 · 환불 · 연체료 입력 → 기대값(3벌 공용) |
| `service/test/fac40.test.js` | 마이그레이션 · RLS(타 기관 행 안 보임) · 동시 예약(Promise.all 20건 → 정원만 성공 · 나머지 409) · 동일인 중복 차단 · 금액 재계산 · 오픈 전 예약 거절 · QR 서명 · 만료 · 1회용 · 타 시설 QR · 이용권 1일 1회 · 환불 수정 사유 필수 · 노쇼 · 보류 만료 정리 · 대여 이중 거절 · 연체 · 교강사 권한 · 선택 수집 삭제 |
| `service-egov/test/contract-fac40.js` | Node · Java 같은 시나리오 대조(`contract-coupon.js` 방식) |
| `tests/ui/fac40-admin.js` | 메뉴 노출(유형별 프리셋) · 등록 → 타임라인 → 승인 → 체크인(수동) → 환불 계산 줄 · 휴관 처리 영향 안내 · AI SAM 「다음 주 화요일 체육관 휴관 처리」 카드 · 교강사 메뉴 제한 |
| `tests/ui/fac40-learner.js` | 390px에서 찾기 → 칸 선택 → 구분 요금 → 예약 → 내 일정 반영 → QR · 44px · 12px · 유형별 용어(대학 무료 + 승인제, 체육형 유료) · 방문자 열람 |
| `tests/ui/fac40-live.js` | 운영 서버 연결: 두 브라우저 동시 같은 칸 예약, 노쇼 요청 시 정리 |
| 회귀 | `smoke`, `lcal`, `calendar-x`, `tube39`, `module-live`, `acct38`, `compliance`, `scn-k12`(메뉴 프리셋 · 캘린더 감싸기 영향) |
