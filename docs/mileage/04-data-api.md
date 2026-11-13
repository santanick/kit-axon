# 04. v42 학습 마일리지 — 데이터 · 이벤트 수집 · /api 초안 (R3)

> 상태: **초안 v0.4 (2026-11-14, R3)**, R1 · 대표님 결정 3건(D1 국비 차단 · D2 기관 자율 · 제도 기본 끔 · D3 미성년 순위 · 감점 선택권, 03 §0.1) · R2(`02-rules-reward-risk.md` §6) 반영.
> 제품 고정(03 §2.4): 이 계약에는 **충전 · 환급 · 양도 · 기관 밖 사용 경로가 없습니다**. 그런 /api · 표 칸을 추가하지 않습니다(선불전자지급수단 리스크, R2 §2-1). 짝 문서: `03-plan.md`. 확정되면 v41 `docs/ledger/09-dev-spec-v41.md`처럼 「단일 계약」으로 승격합니다.
> 원칙: 금액 · 포인트는 정수, 서버가 항상 다시 계산(클라이언트 값 불신), 원장 줄은 삭제 · 수정하지 않고 반대 줄로 정정, 개인정보 컬럼 없음(`sid`만, 대학은 학번 · 학과만).

---

## 1. 모듈 구성 — 「업무 규칙은 SQL 함수」 방식

| 층 | 위치(신규) | 근거 · 이유 |
|---|---|---|
| 업무 규칙(엔진) | `service/server/mileage/sql/10_mileage.sql`(표) · `15_mileage_fn.sql`(`mil_*` 함수) · `20_mileage_hooks.sql`(학사 LMS · 비교과 트리거) | 학사 LMS(`lms/sql/*`, `mod-k.js bind`)와 같은 방식. **규칙이 SQL에 있으면 Node · Java가 자동으로 같습니다.** v41 원장처럼 calc.js + Java 재구현을 두 벌 유지하지 않습니다. |
| Node 경로 | `service/server/mileage/index.js` · `mod-admin.js` · `mod-pub.js` · `sweep.js` | 경로 · 권한 · 감사 · 속도 제한만. `db.js`가 `lms_schema`에 `mileage/<파일>`로 기록하며 이어 붙임(ledger와 같은 `sqlMigrations()`) |
| Java 경로 | `service-egov/src/main/java/egovframework/didisam/mileage/`(`web/MileController` · `service/MileService` · `impl/MileMapper`) | `cpl` · `ledger` 패키지와 같은 구조 · 같은 오류 코드 · 같은 응답 JSON. SQL 함수를 부르기만 함 |
| 데모 엔진 | `didisam/milecalc.js`(UMD, 브라우저 · Node 공용) | 데모 모드(`S.mile`)에서 같은 규칙을 돌림. `lms/q.js`의 「데모 엔진(서버와 같은 규칙)」 패턴 |
| 스튜디오 화면 | `didisam/mile.js` · `mile.css` | 탭 `mileage` 등록(`MENU` · `PRESET` · `VIEWS` · `ACT`, `upgradeState`) |
| 학습자 화면 | `didisam/lmile.js` · `lmile.css` | 앱 「나」 카드 · `#mile` 경로 · 웹 마이페이지 블록 |
| 모듈 · 플래그 | `modules.js` 키 `mileage`, 기관 플래그 `mileage_on` | 꺼져 있으면 `/api/mileage/*` 403 `mile_off`, 학습자 경로 404 |
| 공개 경로 | `modules.js` PUB 정규식에 `mile-(?:my|list|rewards|redeem|redeem-cancel|proof|league)` 추가 | ledger와 같은 방식 |
| 테스트 | `tests/mileage-vectors.json` · `tests/mileage.js`(브라우저 엔진) · `tests/server/mileage-sql.js`(SQL) · `service-egov/test/contract-mileage42.js` | 3벌 동일 결과 확인(§7) |

디디쌤 시사점: 엔진을 SQL 함수로 두면 「Node · Java 동일 /api」 규칙을 지키는 비용이 가장 낮고, 학사 LMS 트리거에서 바로 부를 수 있습니다.

---

## 2. 원장형 포인트 표

### 2.1 표 (기관 RLS · `tenant_id` 필수 · 개인정보 컬럼 없음)
```
mil_policy  (tenant_id pk, on bool default false,   -- D2: 제도 기본 끔, 마법사로 켬
             ver int, unit_name text, expiry jsonb {mode:'months|term_end|item|none', months:12},
             notice jsonb {monthsBefore:6, daysBefore:[30,3]}   -- 권장값(6개월 전부터 매월 + 30 · 3일 전), 기관 변경 가능, budget jsonb {monthP, termP, units:{unitId:P}},
             daily_cap_total int, league jsonb {on, size:10, reset:'week'}, streak jsonb {minMin, freezePerWeek:1, repair:{withinH:48, factor:2, perMonth:1}, breakNotice:false},   -- 복구 수단 · 끊김 알림 기본 끔(R2 §5)
             scope jsonb {mode:'unit', sameBizUnits:[[...]], hqPool:false},   -- 지갑 단위(03 §3.8). hqPool=true는 배포 플래그 없으면 거절
             tiers jsonb [{name, min, color, perks}], tier_window 'm12|term|year',
             cash_lock jsonb {needTrust:'B', achievementOnly:true},     -- 현금성 전환 잠금(03 §2.1-7)
             sunset jsonb null {noticeAt, stopEarnAt, endAt, mode:'expire|convert|migrate'},  -- 제도 종료(03 §3.6)
             rank jsonb {on:false, scope:'near10|group|all', name:'nick|initial|real', ack:{by, at, reason}},   -- D3
             penalty jsonb {on:false, reasons:[], maxOnce, dayCap, ack:{by, at, reason}},                        -- D3
             recommended jsonb,     -- 템플릿 권장값 사본(화면의 「권장값」 표시 · 이탈 경고용, 강제 아님)
             template text, updated_by, updated_at)
mil_policy_log (tenant_id, id bigserial, ver, area 'policy|rule|reward|rank_penalty|funded|onoff', before jsonb, after jsonb,
             reason text, by_staff, at)                                   -- 변경 이력(D2 · D3)
mil_funded  (tenant_id, cls_id, funded bool, source 'naeil|moel|etc', set_by, at, primary key (tenant_id, cls_id))
             -- D1 「국비 지원 과정」 표시. 과정 문서(tenant_state.doc.classes[].funded)와 같은 값을 서버가 이 표로 보관 · 검사
mil_rule    (tenant_id, id 'mru_', ver int, trigger text, nature 'achievement|participation', label,
             cond jsonb, score jsonb {mode:'fixed|band|per_unit|source', v, bands:[[min,P]], unit},
             caps jsonb {day, week, month, term, year, total}, once 'none|ever|per_src|per_day',
             group_key text null,                       -- 항목군 한도(예: 'cert_lang')
             trust_min 'A|B|C', approval 'auto|manual|over|evidence|two_step', approve_over int,
             expiry jsonb null (정책 기본을 덮음), record jsonb null {badgeId, certTpl},   -- 인정 기록
             starts_on, ends_on, active bool, created_by, at,
             primary key (tenant_id, id, ver))
mil_group   (tenant_id, key, label, caps jsonb {term, year})                 -- 항목군 한도
mil_event   (tenant_id, id bigserial, sid, trigger, src_type, src_id, value numeric, trust 'A|B|C',
             occurred_at, received_at, status 'new|done|skipped|held', result jsonb,
             unique (tenant_id, trigger, src_type, src_id, sid))             -- 사건 수신함(멱등 1차)
mil_entry   (tenant_id, id 'me_', sid, scope_unit text not null,   -- 지갑 단위(가맹점 · 같은 사업자 묶음). 단위 간 이전 · 합산 사용 불가
             kind 'earn|use|hold|release|expire|cancel|adjust|restore|penalty',
             points int,              -- 부호 포함: earn·restore·release·adjust(+) / use·hold·expire·cancel·adjust(-)
             status 'pending|posted|void',
             nature 'achievement|participation', trust 'A|B|C', convertible bool,
             funded bool default false, cls_id text null,   -- D1: 국비 과정 적립이면 true → convertible=false 강제(DB check)  -- 현금성 전환 가능 여부(적립 시 고정)
             rule_id, rule_ver, event_id, redeem_id, ref_entry,   -- cancel·expire·restore가 가리키는 적립 줄
             expires_at timestamptz null,                          -- earn만. 건별 만료일
             reason text, by_staff text null, idem_key text,
             at timestamptz default now(), posted_at,
             primary key (tenant_id, id), unique (tenant_id, idem_key))
mil_lotuse  (tenant_id, entry_id, lot_id, points)    -- 음수 줄(use·hold·expire·cancel)이 어느 적립 줄(lot)을 얼마나 썼는지. 선입선출
mil_wallet  (tenant_id, sid, balance, pending, convertible, earned_window, tier, streak jsonb,
             next_expire jsonb [{at, points}], updated_at, primary key (tenant_id, sid))   -- 캐시(진실은 mil_entry 합계)
mil_reward  (tenant_id, id 'mrw_', kind 'tuition|coupon|goods|badge|cert|scholar|shop', title,
             cost jsonb {perUnitP, wonPerP, fixedP}, min_use, max_use jsonb {once, month, billPct:30}, step,
             threshold int,                       -- 기준점(문턱): 누적 전환 가능 P가 이 값 이상일 때만
             stock int null, per_sid jsonb {month:1}, approval 'auto|manual|two_step', cash bool,
             audience jsonb, active bool, link jsonb {couponType, badgeId, certTpl, unitId})
mil_redeem  (tenant_id, id 'mrd_', sid, reward_id, points, won int, status 'requested|approved|fulfilled|rejected|cancelled|reclaimed',
             hold_entry, use_entry, fulfil jsonb {chargeId, billId, couponCode, certNo, badgeId, settleId, handedAt},
             decided_by, decided_at, reason, idem_key, at, unique (tenant_id, idem_key))
mil_proof   (tenant_id, id 'mpf_', sid, rule_id, item, activity_on date, file_ref, ai jsonb {match, score, note},
             status 'submitted|approved|rejected', reason, decided_by, at, purge_at)   -- 증빙(파일은 media, 보관 후 삭제)
mil_settle  (tenant_id, id 'mst_', term, mode 'per_point|band|one_won', pay_form 'outside_tuition|tuition_cut' default 'outside_tuition',
             -- 지급하지 않음: 명단 · 금액 산정 · 내보내기만. tuition_cut 선택 시 이중지원 경고 확인(ack) 필수
             params jsonb {wonPerPoint, capWon, minPoint,
             bands:[{name,min,won,seats}], budgetWon, triggers:[...], deduct:true}, status 'draft|review|approved|exported|void',
             reviewed_by, approved_by, at)
mil_settle_row (tenant_id, settle_id, sid, dept, points, won, band, rank_note, use_entry)
mil_flag    (tenant_id, id 'mfl_', sid, kind 'velocity|cap_streak|device|referral|retake|progress_jump|staff_grant|self_grant',
             evidence jsonb (해시 · 사건 ID만), held_entries text[], status 'open|cleared|confirmed', resolved_by, at)
mil_notice  (tenant_id, sid, kind 'expire_month|expire_d30|expire_d3|sunset|redeem|hold', ym text,   -- 스트릭 끊김 알림 종류 없음(기본 끔, 켜면 'streak_break' 추가)
             sent_at,
             unique (tenant_id, sid, kind, ym))        -- 매월 고지 중복 방지
```

### 2.2 잔액 = 합계
| 값 | 계산(진실) |
|---|---|
| 잔액 `balance` | `sum(points) where status='posted'` (hold 포함 → 사용 대기 P는 이미 빠짐) |
| 적립 예정 `pending` | `sum(points) where kind='earn' and status='pending'` |
| 전환 가능 `convertible` | 선입선출 남은 lot 중 `convertible=true`인 것의 합 − 마이너스 상계분(음수 잔액이면 0) |
| 기간 적립 `earned_window` | 등급 창(12개월 · 학기 · 연) 안 `kind='earn' and status='posted'` 합(사용 · 소멸 무관) |

`mil_wallet`은 같은 트랜잭션에서 갱신하는 캐시입니다. `sweep.js`가 매일 `mil_entry` 합계와 대조해 다르면 감사 로그 + 운영 알림을 남기고 캐시를 다시 씁니다.

### 2.3 원장 규칙
| 규칙 | 내용 |
|---|---|
| 국비 차단(D1) | DB 제약 `check (not funded or convertible = false)`. 금전성 보상(`mil_reward.cash=true`)의 use · hold는 `funded=false` lot만 소진. `addMileageLine` · 쿠폰 확인은 대상 청구 · 강좌가 `mil_funded.funded`이면 거절(`funded_blocked`). 화면 · AI 초안 · 수동 지급 · 가져오기 모든 경로가 같은 SQL 함수 `mil_cash_ok()`를 거침 |
| 불변 | `mil_entry`는 insert와 `status` 변경(pending→posted · pending→void)만. DB 권한도 `select, insert, update(status, posted_at)`. delete 권한 없음 |
| 선입선출 | 음수 줄(use · hold · expire · cancel 중 lot 지정 없는 것)은 남은 lot을 `expires_at asc nulls last, at asc` 순으로 소진하고 `mil_lotuse`에 기록. 현금성 보상의 use는 `convertible=true` lot만 소진 |
| 건별 만료 | 적립 확정(`posted_at`) 시 `expires_at` 계산. 대기 · 보류 중에는 만료 시계 없음. 정책을 바꿔도 이미 정한 `expires_at`은 바꾸지 않음 |
| 소멸 | `sweep`: `expires_at < now()`이고 남은 양 > 0인 lot마다 `expire` 줄(−남은 양, `ref_entry=lot`) |
| 마이너스 상계 | 취소(`cancel`)는 그 lot의 원래 적립 전부를 상쇄(−원래 P). 이미 쓴 lot이면 잔액이 음수가 될 수 있고, 다음 `earn`이 확정될 때 자동으로 음수부터 메움(별도 줄 없이 합계로 상계됨). 음수 동안 보상 신청 409 `negative_balance` |
| 사용 대기 | 보상 신청 = `hold`(−P, posted). 승인 → `hold`를 `release`(+P)로 풀고 같은 트랜잭션에 `use`(−P). 반려 · 취소 → `release`(+P)만 |
| 지갑 단위 | 잔액 · 선입선출 · 상한 · 보상은 `scope_unit`마다 따로 계산. 사용 · 이전 줄이 다른 단위의 lot을 가리키면 DB 제약 실패. 본사 통합(`hqPool`)은 배포 플래그 `MIL_HQ_POOL_REVIEWED` 없으면 400 `hq_pool_locked`(대표님 결정 대기) |
| 동시성 | 모든 쓰기는 `mil_wallet` 행 `select … for update`(학습자 단위 잠금) 후 계산. 이중 사용 방지 |
| 멱등 | 1차 `mil_event` 유일키(트리거 · 원천 · 학습자), 2차 `mil_entry.idem_key`(아래 §4) |
| 시간대 | 하루 · 주 · 월 경계는 KST(`Asia/Seoul`). 주는 월요일 시작 |

디디쌤 시사점: v41 수납 원장의 「배분(led_alloc) · 음수 줄 · 서버 재계산」 사고방식을 그대로 옮겨, 운영자가 원장 두 개를 같은 감각으로 읽게 합니다.

---

## 3. 이벤트 수집 지점 (기존 코드 위치)

### 3.1 수집 경로 3가지
| 경로 | 신뢰 | 방식 | 해당 사건 |
|---|---|---|---|
| ① 서버 직접 | A | 기존 서버 코드 · SQL 함수 끝에서 `mil_emit(tid, sid, trigger, src_type, src_id, value, 'A')` 호출(같은 트랜잭션), 학사 LMS는 DB 트리거 | 가입 · 로그인 · cpl 출석 · 서버 채점 시험 · 학사 LMS 과제 · 시험 · 출결 · 진도 · 설문 · 비교과 마감 · 원장 결제 · 환불 |
| ② 운영자 확정 | B | 스튜디오가 LPX 사건을 반영(수료증 발급 · 채점 · 후기 게시 등)한 뒤 `POST /api/mileage/events`(직원 인증, 묶음 · 멱등) | 수료 · 과제 검수 · 설문 · 후기 · 수동 지급 · 증빙 확인 |
| ③ 기기 보고 | C | `PUT /api/pub/<tid>/progress` 저장 직후 서버가 이전 lp와 비교해 새로 생긴 완료 · 목표 달성만 뽑아 `mil_emit(…, 'C')` | 일반 과정 차시 완료 · 연속 학습 · 튜브 오늘 목표 |

### 3.2 트리거별 위치
| 트리거 | 원천(현재 코드) | 경로 · 신뢰 | `src_type:src_id` | 비고 |
|---|---|---|---|---|
| `signup` | `service/server/pii.js` 159 · 178행 `evIns(…, 'acct-join')` | ① A | `acct:<sid>` | 단체가입 명단 계정은 첫 로그인 때 |
| `first_login` | `service/server/app.js` 271행 `update learners set last_login` (이전 값 null일 때) · `newLearnerSession` | ① A | `acct:<sid>` | |
| `attend_day` | 규정 기관 `cpl_log kind 'attend' · 'beat'`(compliance.js 49 · 86행) / 학사 출결(mod-g) / 일반 `lp.days` · `lp.tube.sec` | ① A / ③ C | `day:<YYYY-MM-DD>` | 최소 학습 분 조건 |
| `streak` | 위 출석 결과로 서버가 계산(`mil_wallet.streak`) | 파생 | `streak:<마일스톤>` | 프리즈 반영 |
| `lesson_done` | 규정 기관 `cpl_log beat` 합계(차시) / 학사 진도(mod-i, 60_i.sql) / 일반 `lp.cls[cid].items[iid].done`(app.js 280행 PUT progress) | ① A / ③ C | `item:<cid>/<iid>` | 하루 상한 = 규정 1일 차시 상한 이하 |
| `course_done` | 스튜디오 `a2AutoCert`(assess2.js 82행, `S.certs` 추가) · 수동 수료 / 규정 수료(`cpl.completion`) / 학사 성적 확정 | ② B / ① A | `cls:<cid>` | 수료 취소 시 `cancel` |
| `exam_score` | `cpl_exam` 채점(compliance.js 122행 update) / `lms_f_submit`(40_f.sql 506행 · a3_integrity.sql 348행) / 스튜디오 `LPX['a2-try']`(assess2.js 504행) | ① A / ② B | `exam:<cls>/<item>` | 시험마다 1회, 최고 구간만(구간 상승 시 차액 적립) |
| `assign_submit` | `lms_e_submit`(30_e.sql 615행) / `LPX['a2-sub']`(assess2.js 507행) 검수 | ① A / ② B | `asg:<id>` | 기한 내 · 통과 조건 |
| `survey_done` | 학사 설문(mod-k, 68_k.sql) / `LPX['a2-sv']`(assess2.js 510행) | ① A / ② B | `sv:<id>` | 참여형 |
| `noncredit_done` | `lms_q` 마감(95_q.sql 379 · 605 · 617행 계산, 상태 `closed` 전환) | ① A(DB 트리거) | `lmsq:<program_id>` | 값 = `lms_q_application.mileage` |
| `review_ok` | `LPX['review-new']`(comm2.js 689행) + 게시 유지 n일 | ② B | `rv:<cls>` | 수료 후만 |
| `referral_ok` | 초대 토큰 가입(acctlink.js 143행 `S.invites`, pii.js `acct-join` token) + 피추천 첫 차시 · 첫 결제(원장 `led_receipt`) | ① A | `ref:<피추천 sid>` | n일 지연 · 월 상한 |
| `tube_goal` | `lp.tube.sec[day] ≥ goal × 60`(ltube.js 52~62행, app.js 6행 `cleanTube`) | ③ C | `day:<YYYY-MM-DD>` | 참여형, 기관 최소 목표 분 |
| `evidence` | 신규 `mil_proof` 확인 | ② B | `pf:<proof id>` | 항목군 한도 |
| `manual` | 신규 `POST /api/mileage/grant` | ② B | `man:<idem>` | 순위 제외 |
| (취소 원천) 환불 | `service/server/ledger` `refundCreate` 완료 | ① A | `refund:<lr id>` | 과정 묶인 적립 `cancel` |

### 3.3 코어 변경 요청(통합 담당)
| 대상 | 변경 | 없을 때 임시 처리 |
|---|---|---|
| `pii.js` 가입 · `app.js` 로그인 · `compliance.js` 시험 · 출석 | 성공 경로 끝에 `mil.emit()` 1줄(모듈 꺼져 있으면 즉시 반환) | 없음(v42.0 필수) |
| `app.js` PUT progress | 저장 전 이전 lp를 읽어 차이(새 완료 · 목표 달성)만 `mil.emitDiff()` | v42.0은 규정 기관만(A), 일반 기관 C 사건은 v42.1 |
| `ledger/mod-admin.js` | `addMileageLine(c, tid, billId, points, redeemId)`: 열린 bill(수납 배분 0)에 음수 줄 1개, bill 순합 ≥ 0, `billPct` 상한 확인 / `charges/generate`에 승인된 차감 자동 부착 / `refundCreate` 완료 후 `mil.onRefund()` | 차감은 「다음 청구 생성 시 운영자가 수동 할인 줄 입력」 |
| `coupon.js`(Node · Java · 브라우저) | `check()`가 기관 쿠폰에 없으면 `mil_redeem.fulfil.couponCode`(개인 1회용, 본인 sid만)도 확인 | 기관 쿠폰을 1회용으로 만들어 코드 전달 |
| `lmy.js` `MYB_DEF` · `ltube.js` 「나」 | 블록 `mile` · 카드 끼울 자리(훅) | `lmile.js`가 AFTER 훅으로 끼워 넣음 |
| `scripts/scenarios.json` | 해당 없음(코어 기능) | – |

---

## 4. 멱등 · 부정 방지 상한

### 4.1 멱등 키
| 줄 | `idem_key` 형식 | 효과 |
|---|---|---|
| 적립(1회성 `ever`) | `e:<rule_id>:<sid>` | 평생 1회 |
| 적립(`per_src`) | `e:<rule_id>:<sid>:<src_type>:<src_id>` | 대상마다 1회 |
| 적립(`per_day`) | `e:<rule_id>:<sid>:d:<KST 날짜>` | 하루 1회 |
| 구간 상승(시험) | `e:<rule_id>:<sid>:<src>:b<구간>` | 구간마다 1회, 차액만 |
| 취소 | `c:<lot id>` | lot당 1회 |
| 소멸 | `x:<lot id>` | lot당 1회 |
| 보상 신청 | 클라이언트 `idem`(UUID) → `r:<sid>:<idem>` | 두 번 눌러도 1건 |
| 수동 지급 | 직원 `idem` → `m:<staff>:<idem>` | 재전송 안전 |
| 비교과 이관 | `e:noncredit:<sid>:lmsq:<program_id>` | 이관 · 실시간 트리거가 같은 키 → 중복 불가 |

규칙 버전이 바뀌어도 키에는 `rule_id`만 넣어(버전 제외) 규칙 수정으로 재적립되지 않게 합니다.

### 4.2 부정 방지 상한(권장값 — 기관이 조정 가능, 국비 차단 · 본인 지급 금지는 고정)
| 상한 | 기본 | 넘을 때 |
|---|---|---|
| 1인 하루 총 적립 | 템플릿 값(예: 성인 500P) | 넘는 적립은 `skipped`(사유 `day_cap`) |
| 규칙별 기간 상한 | 규칙 `caps` | `skipped` |
| 항목군 학기 · 학년 한도 | `mil_group.caps` | `skipped` |
| 기관 · 지점 예산(현금성) | `mil_policy.budget`(입력 시) | 현금성 전환 적립을 `convertible=false`로 적립(배지 · 등급은 계속) + 운영자 알림. 예산 미입력은 허용하되 경고(D2) |
| 국비 과정(제품 고정) | `mil_funded` | 적립은 `funded=true` · 금전성 사용 불가, 청구 차감 · 쿠폰 거절 |
| 감점(D3, 켠 기관만) | `penalty.maxOnce` · `dayCap` | 사유 필수, 넘으면 400 |
| 강사별 월 지급 | 정책 값 | 403 `staff_cap` |
| 직원 1회 수동 지급 | 기관 대표 승인 기준(예: 1,000P) | `pending` + 대표 승인 대기 |
| 속도 | 1시간 30건 · C 사건 차시 완료 간격 < 영상 길이 50% | `held` + `mil_flag velocity|progress_jump` |
| 추천 | 월 3명, 피추천 첫 차시 · 결제 후 14일, 같은 기기 해시 계정 간 추천 무효 | `held` + `referral` |
| 보상 신청 | 1인 하루 5건 · 기관 분당 60건(속도 제한) | 429 |
| 본인 지급 | 직원 계정과 같은 연락처 해시 학습자에게 지급 | 403 `self_grant` |
| 음수 잔액 | 보상 신청 차단 | 409 `negative_balance` |

---

## 5. /api 초안 (Node · Java 동일, 오류 `{error:'<code>', message}`)

### 5.1 운영(직원; owner · sub, teacher는 조회 · 강사 지급만)
| 메서드 · 경로 | 요청 | 응답 · 규칙 |
|---|---|---|
| GET /api/mileage/config | – | `{policy, rules:[최신 버전], groups, rewards, template, recommended, fixed:['funded_cash','ledger_immutable','self_grant']}` — 권장값과 제품 고정 항목을 함께 돌려줌 |
| POST /api/mileage/config | `{policy}` | owner만. 모든 값 수정 가능(D2), 권장 범위 이탈은 `warnings[]`로만 응답(거절 안 함). `ver+1` · `mil_policy_log`. 이미 적립된 줄 만료일 불변 |
| POST /api/mileage/onoff | `{on:true|false, reason}` | owner만. 켜기는 마법사 완료(`draftHash`) 필요. 끄기: 적립 이력 없으면 즉시, 있으면 `sunset` 절차로 안내(409 `need_sunset`) |
| POST /api/mileage/rank-penalty | `{rank?, penalty?, ack:{read:true, reason}}` | D3. `ack.read=true` · 사유 없으면 400 `ack_required`. 응답에 영향 안내 문안 버전 기록. `mil_policy_log area 'rank_penalty'` |
| POST /api/mileage/funded | `{clsId, funded, source}` | D1 국비 표시. owner만, 이력 기록. 끄기는 가능하나(오표시 정정) 이미 생긴 `funded` 적립 줄은 그대로 |
| POST /api/mileage/rules | `{id?, trigger, nature, cond, score, caps, once, groupKey, trustMin, approval, approveOver, expiry, record, startsOn, endsOn, active}` | 스키마 검증 · 국비 과정 대상 금전성 연결 시 400 `funded_blocked`. 권장값 이탈은 `warnings[]`. 새 버전 저장 |
| POST /api/mileage/draft | `{budget?:{monthWon|termWon|none}}` | AI 초안(저장 안 함) `{policy, rules, rewards, simulate, warnings}`. AI 불가 시 템플릿 |
| POST /api/mileage/simulate | `{rules, rewards, days:30}` | 지난 n일 `mil_event` · 원천 사건에 적용 `{totalP, wonEstimate, perSidAvg, p90, byRule}` |
| POST /api/mileage/enable | `{draftHash}` | 확인 1번으로 켜기(감사 · 학습자 안내문 생성) |
| GET /api/mileage/summary | `?from&to` | 적립 · 사용 · 소멸 · 미사용 잔액 · 추정액 · 참여율 · 규칙별 · 예산 소진 · 대기 · 의심 수 |
| GET /api/mileage/entries | `?sid&kind&from&to&after&limit` | 원장 줄(페이지) |
| GET /api/mileage/wallet | `?sid` | 학습자 잔액 · 타임라인 · 다음 소멸 |
| POST /api/mileage/events | `{events:[{trigger, sid, srcType, srcId, value, at}]}` (≤200) | 운영자 확정 사건(신뢰 B). 사건별 `{status, entryId?, reason?}` |
| POST /api/mileage/grant | `{sids[], points, reason, idem}` | 수동 지급 · 조정(±). 사유 필수, 상한 §4.2 |
| POST /api/mileage/cancel | `{entryId, reason}` | lot 취소(마이너스 상계) |
| GET /api/mileage/approvals | `?type=earn|redeem|proof` | 대기 목록 + AI 「확인할 점」 |
| POST /api/mileage/approvals/decide | `{ids[], decision:'approve|reject', reason?, billId?}` | 일괄. 학원비 차감은 `billId` 없으면 자동 제안 bill |
| POST /api/mileage/rewards | `{id?, kind, title, cost, minUse, maxUse, step, threshold, stock, perSid, approval, audience, link, active}` | 국비 과정을 대상에 넣은 금전성 보상 → 400 `funded_blocked`. 예산 미입력 · 권장값 이탈은 `warnings[]`(거절 안 함, D2) |
| GET /api/mileage/redeems | `?status` | 신청 목록 |
| POST /api/mileage/redeems/cancel | `{id, reason, mode:'release|reclaim'}` | 이행 전 취소 = 복원, 이행 후 회수 = 쿠폰 무효 · 청구 줄 void · 배지 회수 |
| GET /api/mileage/flags · POST /api/mileage/flags/resolve | `{id, decision:'clear|confirm'}` | confirm → 보류 줄 void · 관련 보상 회수 |
| GET /api/mileage/proofs · POST /api/mileage/proofs/decide | `{id, decision, points?, reason}` | 부결 사유 필수, 학습자에게 표시 |
| POST /api/mileage/settle | `{term, mode, payForm, params, ack?}` | 대학 정산안 생성(`draft`). **지급 기능 없음**(명단 · 금액 산정 · CSV까지). `payForm:'tuition_cut'`이면 이중지원 경고 확인(`ack`) 없을 때 400 `ack_required` + 경고 문구 반환 |
| POST /api/mileage/settle/:id/review · /approve | – | 2단계(담당 → owner). 승인 시 `deduct`면 `use` 줄 일괄 |
| GET /api/mileage/settle/:id/export | – | CSV(학번 · 학과 · 점수 · 금액 · 등급) |
| POST /api/mileage/sunset | `{noticeAt, stopEarnAt, endAt, mode}` | 제도 종료 예약(owner). 고지 일정 자동 생성 |
| POST /api/mileage/import-q | `{dryRun:true|false, expiredMode:'expire|keep'}` | 비교과 이관 미리보기 · 실행 · 대조 결과 `{programs, sids, totalP, diff:0}` |

### 5.2 학습자(공개 경로 `/api/pub/<tid>/…`, 학습자 세션)
| 메서드 · 경로 | 요청 | 응답 · 규칙 |
|---|---|---|
| GET mile-my | – | `{on, unitName, balance, pending, convertible, tier, nextGoal:{label, need, pct}, streak:{n, freeze}, expiring:[{at, points}], ways:[켜진 규칙 문장], sunset?}` |
| GET mile-list | `?after&limit` | 적립 내역(월별, 근거 문장 · 취소 표시) |
| GET mile-rewards | – | 카탈로그(쓸 수 있는 P · 문턱 · 재고 · 잠금 이유) |
| POST mile-redeem | `{rewardId, points, idem}` | 서버 재계산(문턱 · 최소 · 최대 · 단위 · 재고 · 전환 가능 P). 409 `insufficient` · `below_threshold` · `negative_balance` · `out_of_stock` |
| POST mile-redeem-cancel | `{id}` | `requested`일 때만 |
| POST mile-proof | `{ruleId, item, activityOn, fileRef}` | 증빙 제출(파일은 기존 `/api/media` 경로) |
| GET mile-league | – | 켠 기관만. `{week, me:{rank, points}, near:[{nick, points}]}`(근접 10명) |

### 5.3 오류 코드
`mile_off`(403) · `funded_blocked` · `ack_required` · `bad_rule` · `hq_pool_locked` · `over_tuition`(400) · `need_sunset`(409) · `insufficient` · `below_threshold` · `negative_balance` · `out_of_stock` · `already`(409) · `staff_cap` · `self_grant`(403) · `rate`(429) · `amount_mismatch`(400, 클라이언트 계산값 불일치).

---

## 6. 원장(v41) · 쿠폰 · 인증서 연결 계약
| 보상 | 이행 | 취소 · 환불 |
|---|---|---|
| 학원비 차감 | 청구서는 **「등록 교습비(정가) 양수 줄 + '마일리지 차감' 음수 줄」** 두 줄로 표시: `led_charge(item_type 'etc', title '마일리지 차감', amount = −won, src_type 'mileage', src_id = mrd id)`. 정가 줄은 등록 교습비 이하(초과 시 `over_tuition`), bill 순합 ≥ 0, `billPct` 이하, 수납 배분이 생긴 bill · 국비 과정 bill(`funded_blocked`) · 평생교육이용권 결제분에는 붙이지 않음 | bill void · 줄 void → `release`/`restore`. **환불**: v41 `ledgercalc.refund({rule, paid, …})`(`didisam/ledgercalc.js` 105행 · Node `ledger/calc.js` · Java `DdLedger` 같은 계산)에 `paid` = 실납부액(차감 줄 제외)을 넣어 환불액 산정 → 환불 비율 `ratio = refund / paid`. `ledger/mod-admin.js` `refundCreate`(18행)가 `done`이 될 때 같은 트랜잭션에서 `mil_on_refund(tid, receiptId, ratio)` 호출 → 차감에 쓴 P × ratio를 `restore` 줄로 복원(10P 단위 내림, 권장값 · 학원 변경 가능). 원 lot 만료 시 새 만료일 없이 기록만(즉시 `expire`) |
| 개인 쿠폰 | `couponCode` 8자(coupon.js `gen` 문자 집합), 정액 · 정률 · 기한 · 본인 sid · 1회 | 미사용 취소 = 복원, 사용 후 결제 취소 = 정책(복원 기본) |
| 배지 · 인증서 | 배지 수여 기록 · `certkit` 번호 | 부정 확정 시 회수 · 무효 표시 |
| 장학 | `mil_settle_row.use_entry`(정산 승인 시 `deduct`면 차감). 디디쌤은 지급하지 않음 — CSV(학번 · 학과 · 점수 · 적립 근거 · 금액 · 지급 형태) 내보내기까지 | 정산 void 시 `restore`. 지급 후 부정 확정은 다음 학기 마이너스 상계 |
| 기업 리워드 숍(복지포인트형) | 상품권 · 포인트 지급 기록 + **1인별 지급액 내보내기(급여 담당용, 근로소득 과세 안내 G)** | 회수 시 내보내기에 음수 행 |

---

## 7. 테스트 벡터 계획 (`tests/mileage-vectors.json`)
형식: `{id, given:{policy, rules, entries, events, now}, when:{op, args}, then:{entries+, wallet, error?}}`. 같은 파일을 ① `didisam/milecalc.js`(Node) ② SQL 함수(테스트 DB) ③ Java 계약 테스트가 돌려 **3벌 동일**을 확인합니다.

| ID | 내용 |
|---|---|
| MV-01 | `ever` 규칙 같은 사건 2번 → 적립 1줄 |
| MV-02 | `per_day` KST 23:59 / 00:00 경계 → 2줄 |
| MV-03 | 규칙 하루 상한 · 1인 하루 총 상한 동시 적용 순서 |
| MV-04 | 항목군 학기 한도(자격 · 어학) 초과분 `skipped` |
| MV-05 | 시험 구간 상승 80→90 → 차액만, 90→80 재응시 → 없음 |
| MV-06 | 승인 필요 적립 `pending`은 잔액 제외 · 만료 시계 없음 → 승인 시 `expires_at` 계산 |
| MV-07 | 건별 만료: 서로 다른 만료일 lot 3개, 사용 시 선입선출 소진 기록 |
| MV-08 | 만료 sweep 두 번 실행 → `expire` 1줄(멱등) |
| MV-09 | 이미 쓴 lot 취소 → 음수 잔액 → 보상 신청 409 → 다음 적립으로 상계 |
| MV-10 | 현금성 보상: 참여형 · C lot은 소진 대상 제외, 전환 가능 P 계산 |
| MV-11 | 신청 → hold → 반려 → release, 잔액 원복 |
| MV-12 | 동시 신청 2건(잔액 1건분) → 1건만 성공 |
| MV-13 | 학원비 차감: bill 30% 상한 · 순합 ≥ 0 · 배분 있는 bill 거절 · v41 `ledger-vectors.json` 불변 |
| MV-14 | 과정 환불 → 그 과정 적립 cancel, 차감 사용분 비율 복원 |
| MV-15 | 문턱(기준점) 미달 신청 409 |
| MV-16 | 장학 ① 점당 1,000원 · 1인 20만 원 상한 · 최소 15점 |
| MV-17 | 장학 ② 등급 정액 · 인원 한정 · 동점 규칙 |
| MV-18 | 장학 ③ 1P=1원 · 총예산 비례 축소 · 원 단위 내림 합계 ≤ 예산 |
| MV-19 | 비교과 이관 + 실시간 트리거 같은 키 → 중복 없음, 학생별 대조 0 |
| MV-20 | voc 템플릿에 현금성 보상 생성 → 비국비 과정 대상이면 저장(경고), 국비 과정 대상이면 400 `funded_blocked` |
| MV-21 | 예산 소진 후 적립 → `convertible=false` |
| MV-22 | 수동 지급: 기준 초과 → owner 승인 대기, 본인 계정 → 403 |
| MV-23 | 스트릭 프리즈: 주 1일 빠짐 유지, 2일 빠짐 끊김 → 48시간 안 복구 학습으로 이어짐(월 1회), 끊김 알림 0건(기본 끔) |
| MV-24 | 주간 리그 근접 10명 · 월요일 리셋 · 수동 지급 제외 |
| MV-25 | 제도 종료: stopEarnAt 이후 적립 `skipped`, 매월 고지 1회(`mil_notice` 유일), endAt 정리 모드별 결과 |
| MV-26 | 소멸 고지 대상 계산: 6개월 전부터 매월 + 30 · 3일 전(달 경계 · 만료 6개월 미만 정책 · 기관이 바꾼 값) |
| MV-27 | 규칙 수정(버전 2) 후 같은 사건 재수신 → 재적립 없음 |
| MV-28 | `mil_entry` 합계 = `mil_wallet` 캐시(모든 벡터 끝에 공통 확인) |
| MV-29 | D1: 국비 · 비국비 과정 동시 수강 → 금전성 보상 소진 시 국비 lot 건너뜀, 쓸 수 있는 P 계산 |
| MV-30 | D1: 국비 과정 청구서에 차감 줄 · 국비 강좌 결제에 마일리지 쿠폰 → `funded_blocked` |
| MV-31 | D1: 수동 지급 · AI 초안 · 이관 경로로 국비 lot `convertible=true` 시도 → DB 제약 실패 |
| MV-32 | D2: 제도 기본 끔 → 사건 수신해도 적립 없음 · `onoff` 켬 이후만 적립(소급 없음) |
| MV-33 | D2: 차감 상한 · 유효기간을 권장값 밖으로 저장 → 성공 + `warnings` |
| MV-34 | D3: 순위 · 감점 켜기 ack 없음 400, ack 있으면 이력 1줄 · 감점 `penalty` 줄 사유 필수 |
| MV-35 | 학원 환불: 정가 300,000 · 차감 −30,000(30,000P 사용) · 실납부 270,000, hakwon_law 1/2 경과 → 환불 135,000 · 복원 15,000P |
| MV-36 | 지갑 단위: 가맹점 A lot으로 가맹점 B 보상 신청 → 거절, `hqPool:true` 저장 → `hq_pool_locked` |
| MV-37 | 장학 `tuition_cut` 선택 ack 없음 → 400, ack 후 정산안 생성 · 이력 |
| MV-38 | 정가 줄이 등록 교습비 초과 → `over_tuition` |

추가: UI 스모크(`tests/ui/smoke.js`에 마일리지 탭 · 학습자 카드 렌더), 계약 테스트(`contract-mileage42.js`: 모든 /api 응답 형태 Node = Java).

디디쌤 시사점: 포인트는 작은 숫자 실수도 분쟁이 되므로, v41처럼 「벡터 하나 → 세 엔진」 검증을 출시 조건으로 둡니다.
