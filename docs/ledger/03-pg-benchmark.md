# v41 통합 매출 · 수납 — 온라인 PG · 해외 결제 벤치마크와 결제 연동 구조

대표님 지시(2026-11-14): 「해외결제도 되야돼. 토스 및 여러 페이먼트 · van사들의 결제 정책을 벤치마크하고 쉽게 연동할 수 있게 서비스를 설계하고 기획 · 디자인해줘.」
범위: 기획 문서만(코드 수정 없음). 기준 코드: v40.0 `service/server/fac/pay.js`(토스 승인 · 취소), `app.js:224~243`(강좌 pay 이벤트), `didisam/lshop.js:154,180`(`pg.use` · 데모 결제창), `lsam.js:26,85`(`pg.use='none'` · `pg.intl`).
조사일: 2026-11-14. 근거 URL은 §6 출처표(S1~S23). **출처에서 확인하지 못한 항목은 「확인 필요」로 표기하고 추측하지 않았다.** 수수료 · 기한은 계약 · 정책에 따라 바뀌므로 도입 전 PG사 재확인이 필요하다.

---

## 0. 요약

1. 현재 코드는 **환경변수 1개(`TOSS_SECRET_KEY`)로 서버 전체가 PG 하나**를 쓴다(`fac/pay.js:6`). 기관별 PG 선택 · 해외 결제 · 정산 대사가 구조상 불가능하다.
2. 국내 PG(토스 · KG이니시스 · KCP · 나이스)는 **승인 → 취소 → 노티 → 정산** 흐름은 같지만 인증 · 서명 · 취소 규격이 제각각이다(예: 토스 Basic + JSON, 이니시스 SHA256/SHA512 해시 + NVP/JSON, 엑심베이 fgkey + Basic). 직접 N개 연동은 N × (Node + Java) 구현이다.
3. 해외 결제는 세 갈래다: ① 국내 PG의 **해외카드**(승인 · 정산 모두 원화, 수수료 3.8~4.5% 수준), ② **PayPal**(토스 경유 시 USD 결제 · KRW 정산), ③ **엑심베이 등 해외 특화**(다통화 · Alipay · WeChat). Stripe는 **한국 사업자 계정 개설이 불가**로 확인(S9).
4. **추천: PG에 무관한 원장 + 「결제 어댑터」 인터페이스 + 하이브리드 연동.** 1차 어댑터 = `toss`(직접, 기존 코드 이전) + `portone`(V2 중개, KG이니시스 · KCP · 나이스 · PayPal · 엑심베이 등 흡수). 직접 어댑터는 수요가 확인된 PG만 후속 추가.
5. 기관은 **자기 명의로 PG에 가맹**하고, 스튜디오에는 **키만 입력**한다. 키는 서버에서 암호화 저장하고 화면에는 다시 보이지 않는다.
6. 대표님 결정 필요 3건(§7).

---

## 1. 벤치마크 비교표

> 표기: 공식 = 각 사 공식 문서 · 약관 · 요금 페이지, 2차 = 포트원 블로그 · SaaS 안내 등 제3자 글(작성 시점 불명 → 도입 전 재확인). 「확인 필요」 = 이번 조사에서 근거를 못 찾음.
> 접근 제한: NHN KCP · 나이스페이먼츠 개발자센터는 자동 열람이 막혀(robots) 두 PG의 세부 규격은 **대부분 확인 필요**다. 담당자 문의 또는 포트원 PG 연동 문서로 후속 확인한다.

### 1-1. 국내 PG · 중개

| 항목 | 토스페이먼츠 | KG이니시스 | NHN KCP | 나이스페이먼츠 | 포트원(통합 중개) |
|---|---|---|---|---|---|
| 결제 수단 | 카드 · 간편결제 · 퀵계좌이체 · 가상계좌 · 휴대폰 · 상품권, 브랜드페이, 자동결제(S1). 카카오 · 네이버 · 토스페이 등 간편결제 종류 목록과 **애플페이는 확인 필요** | 결제창 일반결제(카드 · 계좌 등) · 다수 간편결제 · 빌링 · 에스크로(S3, S4). 애플페이 확인 필요 | 결제창 일반결제 · 간편결제(S4). 세부 확인 필요 | 결제창 일반결제 · 카드 API 정기결제, **카카오페이 · 네이버페이 정기결제 지원, 간편결제 채널이 가장 많다고 안내**(S4). 세부 확인 필요 | 위 PG 선택 연동(토스 · KSNET · 스마트로 · 나이스 · KG이니시스 · KPN · KCP · 이지페이 등)과 **카카오페이 · 네이버페이 · 토스페이 직연동**(S4, S5) |
| 연동 방식 | 결제위젯 · 결제창 SDK(클라이언트 키) + REST API(시크릿 키, Basic 인증)(S1, S2) | 표준결제(인증결과 수신 → `authUrl` 서버 승인), 취소는 V1(NVP) · V2(JSON) API(S3, S6) | 확인 필요 | 확인 필요 | 브라우저 SDK + REST V2 + 서버 SDK(JS · Python · JVM). PG는 「채널」로 선택(S4, S5) |
| 서버 승인 | 결제창 성공 후 서버가 `payments/confirm` 호출(`paymentKey · orderId · amount`). 승인 제한시간은 이번 조사에서 미확인 → **확인 필요**. 현 코드와 일치(`fac/pay.js`) | 인증결과 수신 후 서버가 `authUrl`(*.inicis.com 도메인 검증 필수)로 승인 요청. 망취소는 인증 응답 후 10분 이내(S6) | 확인 필요 | 확인 필요 | 서버가 `GET /payments/{paymentId}`로 조회해 금액 대조(웹훅만으로 완료 판단 금지, S7) |
| 부분 취소 | 가능, **횟수 상한 미명시**. 가상계좌는 입금 전 부분취소 불가, 입금 후 환불계좌 필요. 카드는 매입 후 · 부분취소 영업일 3~4일(S2) | 일반취소 `price` + 남은 금액 `confirmPrice`. 휴대폰은 재결제 후 전체취소 방식이라 한도 부족 시 불가. 가상계좌는 환불계좌(AES) 필요(S8) | 확인 필요 | 확인 필요 | `POST /payments/{paymentId}/cancel`(금액 지정). **부분취소 가능 여부는 PG에 따름**(S7) |
| 환불(취소) 기한 | 카드 별도 기한 없으나 1년 초과 시 불가할 수 있음 · 가상계좌 통상 365일 · 계좌이체 · PayPal 180일 · 휴대폰 결제 당월(S2) | 휴대폰 당월(익월환불은 별도 부가서비스), **카드 등 기타 수단은 문서에 미명시 → 확인 필요**(S8) | 확인 필요 | 확인 필요 | PG별 상이(원 PG 규칙 그대로) |
| 정기결제(빌링) | 카드 · 계좌이체 자동결제, **별도 계약 필요**(리스크 검토 후), 정기 구독형이 아니면 제한. 주기 호출은 상점이 직접 스케줄링(S10) | 빌링(정기과금) · 카드 · 휴대폰 · 카카오페이 정기결제(S3, S4) | PG마다 범위 상이, 확인 필요(S4) | 카드 API · 카카오페이 · 네이버페이 정기결제(S4) | 빌링키 API + 결제 예약 API 제공, 지원 범위는 PG에 따름(S4, S7). 빌링결제 리커버리는 Growth 이상 부가서비스(S12) |
| 정산 주기 | 공식 수수료 페이지: 평균 5일 이내(업계 평균 15일로 비교 표기). 용어집: 일 · 주 · 월정산 유형이 있고 토스의 주기는 「최소 일주일」로 표기 → **계약별 확인 필요**(S11, S13) | 확인 필요(2차 자료: PG는 D+2~D+3 영업일이 일반적, S14) | 확인 필요 | 확인 필요 | 포트원은 정산 주체가 아님 → **연결한 PG의 정산 주기를 따름** |
| 웹훅 | `PAYMENT_STATUS_CHANGED` · `CANCEL_STATUS_CHANGED` · `DEPOSIT_CALLBACK`(가상계좌) · `BILLING_DELETED` 등. 상점아이디(MID)별 설정, 10초 내 200, **실패 시 최대 7회 재전송(1 · 4 · 16 · 64 · 256 · 1024 · 4096분)**. 결제 웹훅의 서명 헤더 적용 여부는 문서가 지급대행 쪽을 가리켜 **확인 필요**. 본문에 eventId 없음 · 전송 id는 매번 새로 발급되어 중복 판별에 못 씀(S15) | 가상계좌 입금통보(노티) 제공, 상세 규칙 **확인 필요**(S6) | 확인 필요 | 확인 필요 | Standard Webhooks 규격 서명(시크릿 콘솔 발급, 원본 body 필요), 결제 · 부분취소 · 전체취소 · 가상계좌 발급 등 이벤트, **최대 5회 재전송**(0 · 1 · 4 · 16 · 64 · 256분 + jitter), 순서 비보장(S16) |
| 테스트 환경 | `test_` 키(실제 금액 차감 없음) / `live_` 키. 가입 전 테스트 키로 사전 연동 가능(S17, S18) | 스테이징 `stginiapi.inicis.com` / 운영 `iniapi.inicis.com`(취소 API). 결제 테스트 MID는 계약담당자 문의(S6, S8) | 확인 필요 | 확인 필요 | 테스트 채널(관리자콘솔 가입 후), 실 채널 전환은 `channelKey` 교체(S19) |
| 가맹 심사 | 계약 후 카드사 심사 최대 10~14영업일, 500만 원 이상 고가는 +3~4영업일. 통신판매업 신고번호 없으면 국민카드 심사 제외(간이과세 · 비영리 · 공공 예외), 홈페이지 하단 사업자 정보 · 환불 정책 필수(S18). 가입비 22만 원 + 연관리비 11만 원(S11) | 확인 필요 | 확인 필요 | 확인 필요 | 신청서 1회로 여러 PG에 동시 계약 요청, 통상 3주 안팎(PG 연락 3영업일 · 계약 약 1주 · 카드사 심사 약 2주), 보증보험 통상 0.953%, 개인 · 법인 서류 3개월 이내(S19) |
| 공개 수수료 | 카드 3.4% · 간편결제 3.4%(일부 추가) · 계좌이체 2.0%(최저 200원) · 가상계좌 건당 400원 · 휴대폰 3.5~8.0%, **부가세 별도**. 신규는 「일반」 등급 시작 후 영 · 중소 우대 환급(S11) | 비공개 → **확인 필요**(협의) | 비공개 · 2차 자료에 3.2% 언급이 있으나 개별 수치 불명확 → **확인 필요**(S20) | 비공개 · 베이직 플랜 언급만 → **확인 필요**(S20) | PG 수수료와 별개로 포트원 이용료: **월 순거래액 5천만 원 미만 Free**, 이상은 Growth(구간 요금은 이미지로만 공개 → 확인 필요), 2025-01-01 개편 기준(S12) |
| 해외 결제 통화 · 환율 · 원화 정산 | 해외카드(VISA · Master · JCB) 4.5%, **KRW 정산만**(2차, S21). 공식 페이지는 **PayPal 해외 간편결제**만 명시(S10, S11) | 해외카드(VISA · Master · JCB · Diners) **KRW 정산**(2차, S21). 일본 결제(카드 · 편의점 · 간편결제) 별도(S4) | VISA · Master · JCB · Diners, KRW · USD 정산, 해외카드 4.5%, **비실물 콘텐츠 입점 불가**(2차, S21) | VISA · Master · UnionPay, KRW 정산(USD는 협의), 해외카드 3.8%, 콘텐츠 입점 가능(2차, S21) | PayPal · 엑심베이 · 페이레터 · 이지페이 해외결제 · 페이먼트월 · 헥토파이낸셜 지원(S4) |
| 학원(교육업) 가맹 제약 | 공식 심사 가이드는 **교육 · 학원 업종을 따로 언급하지 않음** → 입점 허용 업종 문의 필요(S18) | 확인 필요 | 확인 필요 | 확인 필요 | 교육 업종 허용 여부는 연결 PG의 심사 기준을 따름. 위험 업종은 PG마다 다르고 반려 시 계약 무산(S19) |

### 1-2. 해외 결제 서비스

| 항목 | Stripe | PayPal | 엑심베이(Eximbay) | PortOne 경유 해외 채널 |
|---|---|---|---|---|
| 한국 사업자 가입 | **불가**: 공식 지원 국가 목록에 한국 없음(S9). 한국 소비자 결제 수취용 페이지는 외국 사업자 대상 | 가능(한국 판매자 요금 안내 존재, S22) | 가능, 신규 시작 한도 월 USD 1,000(2차, S21) | 포트원 가입 + 해당 PG 계약 |
| 결제 수단 | (한국 소비자 대상) 국내 카드 전체 · 카카오페이 · 네이버페이 · 삼성페이 · PAYCO(S9). 외국 카드 · 지갑은 계정 국가에 따름 | PayPal 잔액 · 연결 카드 · 계좌(세부 확인 필요) | VISA · Master · JCB · Amex · Diners · Discover · Alipay · WeChat · UnionPay · 일본 편의점 · PayPay(2차, S21) | PayPal · 엑심베이 · 페이레터 · 이지페이 · 페이먼트월 · 헥토(S4) |
| 연동 방식 | Checkout · Elements · Payment Intents API(S9) | 확인 필요(토스 · 포트원 경유 연동은 가능, S10, S4) | 결제창 SDK + `ready` API(fgkey 사전 검증) + 통합 · 인증 · 승인 결제창, 결제조회 · 취소 API(S23) | 포트원 V2 단일 API |
| 서버 승인 | PaymentIntent 승인 후 웹훅 · 조회로 확정 | 확인 필요 | 확인 필요(`return_url`/`status_url`, fgkey 검증 절차 미확인, S23) | 서버 조회 필수(S7) |
| 부분 취소 · 환불 기한 | 부분 환불 가능, 한국 결제수단은 **원거래 365일 이내**(S9). 수수료 환급 규칙은 확인 필요(열람 차단) | 전액 · 부분 환불 시 환불 수수료 없음, **원 수수료는 반환 안 됨**(S22). 토스 경유 PayPal은 180일(S2) | 부분취소 가능(`refund_type=P`, 금액 지정). **취소 가능 기간 확인 필요**(S24) | PG에 따름 |
| 정기결제 | 한국 카드 · 카카오 · 네이버 정기 가능, 삼성 · PAYCO 불가. 한국 규정상 가격 인상 30일 전 고지 · 결제 7일 전 안내(S9) | 확인 필요 | 확인 필요 | PG에 따름 |
| 정산 주기 · 통화 | 한국 결제수단 payout T+4(미국) · T+7(그 외). 정산 통화는 계정 국가 | 한국 은행 인출 150,000원 미만 수수료 1,500원(S22). 토스 경유 PayPal은 주정산 + 4영업일, 정산 통화 KRW(S11) | **KRW · USD 정산**(2차, S21). 다국통화승인(MCP) 제공(S23) | PG에 따름 |
| 웹훅 | `Stripe-Signature`(HMAC-SHA256, `t=` + `v1=`), 5분 허용오차, 라이브 최대 3일 재시도, 순서 비보장 · 이벤트 id로 중복 제거, 시크릿 교체 시 최대 7일 병행(S25) | 확인 필요 | `status_url` 서버 통보, 형식 확인 필요(S23) | 위 포트원 규칙 |
| 테스트 환경 | 샌드박스 · CLI(S25) | 확인 필요 | `api-test.eximbay.com` + `test_` 키(실결제 없음), 라이브 `live_` 키(S23) | 포트원 테스트 채널 |
| 공개 수수료 | 한국 결제수단 수수료는 Stripe 가격 페이지(링크만 확인, 수치 확인 필요) | **해외 송금인 4.40% + 고정(USD 0.30 등, KRW 고정수수료 표에 없음)**, 환전 수수료 1.00% 또는 3.00% 추가(S22). 토스 경유: 4.0% + 0.3 USD + 환전 · 인출 2.5%(S11) | 해외카드 4.50% · Alipay 2.90% · WeChat 2.80% · UnionPay 3.60%(2차, S21) | 포트원 이용료 + PG 수수료 |
| 통화 · 환율 | 135개 이상 통화, 최소 결제 50 KRW, 통화 다르면 정산통화로 환산(수수료는 가격표 참조, S26). KRW · JPY는 소수점 없는 통화 | 원화 고정수수료 미기재, 환전 시 거래환율에 1~3% 가산(S22) | 승인 통화와 정산 통화 선택(MCP · DCC), 환율 적용 방식 확인 필요 | PG에 따름 |
| 학원(교육업) 제약 | 한국 사업자 가입 불가이므로 해당 없음(해외 법인 필요) | 확인 필요 | 확인 필요 | PG별 심사 |

### 1-3. VAN(현장 카드 단말기) 참고

- VAN은 **오프라인 카드 단말기(POS) 승인을 중개**하고, PG는 온라인 · 모바일 결제를 중개한다. 둘 다 카드사에서 받은 대금에서 수수료를 빼고 가맹점에 정산한다(S14, 2차).
- 일반적 정산: VAN D+1~D+2 영업일, PG D+2~D+3 영업일(2차, S14). 환불은 정산 회차에서 상쇄되고, 상쇄할 결제가 없으면 **역정산**(차액 납부)이 생긴다(S14).
- 학원 SaaS 사례(클래스업): VAN 심사 약 3~4영업일, 모바일 PG(KSNET) 심사 약 3~5영업일, 구매안전서비스증 · 통신판매업 신고번호 입력 단계가 있다(S27).
- 본 서비스 반영: 현장 카드는 **원장의 `card_onsite` 수기 입력**으로 유지(01 문서 ⑤ 마감). VAN 단말기 자동 연동(승인번호 수신)은 **확인 필요**이며 2차 이후 검토한다. 정산 대사에서 VAN은 「일계 입력 vs 정산 입금」 비교만 지원한다.

### 1-4. 벤치마크에서 설계로 가져오는 결론

1. **정산 · 환불 지연이 PG마다 다르다**(토스 평균 5일 · 일반 D+2~3 · 카드 환불 영업일 3~4일). 원장은 「환불 요청일」과 「PG 완료일」을 분리 기록한다.
2. **취소 규칙이 수단별로 갈린다**(가상계좌 입금 전 부분취소 불가, 휴대폰 당월만, 이니시스 휴대폰 재승인 방식). 어댑터는 `cancelPolicy(method)`를 선언해 화면이 미리 막고 이유를 안내한다.
3. **웹훅 서명 방식이 제각각이고 일부는 불명**(토스 결제 웹훅 서명 확인 필요, 엑심베이 형식 확인 필요). → 웹훅은 **알림일 뿐, 항상 PG 조회로 확정**한다(포트원도 같은 원칙, S16).
4. **멱등 키 유효기간이 다르다**(토스 15일 · 최대 300자, Stripe 24시간 · 255자). 키는 우리 주문 · 환불 id로 만들어 재시도 시 같은 키를 쓰고, 유효기간이 지난 재시도는 먼저 조회한다.
5. **해외카드는 국내 PG에서 원화 승인 · 정산**이 기본이다. 다통화 표시 · 외화 정산이 필요하면 PayPal · 엑심베이 계열을 쓴다. 해외카드는 해외 카드사 이상거래 탐지로 승인 거절 가능성이 높다는 2차 자료가 있다(S28).
6. **교육업 가맹은 PG마다 다를 수 있다**. 제품 안에서 확정 문구를 쓰지 않고 「가맹 안내」 화면에서 PG별 확인 항목으로 안내한다(§5).

---

## 2. 현재 구조와 한계

| 구분 | 현재(v40.0) | 한계 |
|---|---|---|
| 키 | `env.TOSS_SECRET_KEY` 1개, 없으면 `payOnline:false`(`fac/pay.js:6`, `fac/index.js:189`) | 기관(tenant)별 키 불가, 서버 재배포로만 변경 |
| 승인 · 취소 | 토스만(`confirm` · `cancel`), 멱등 `cf-<orderId>` · `rf-<id>`(`fac/pay.js:19~22`) | 다른 PG 불가, 취소 결과가 `ok`/`code` 수준 |
| 적용 범위 | **시설 예약만 서버 승인**(`mod-pub.js:56~58` 금액 불일치 시 자동 취소). 강좌 · 교재 · 청구서는 데모 결제창 결과를 이벤트로 수신(`lshop.js:180`, `app.js:224~243`) | 01 문서 §1-3 7번과 동일 |
| 기관 설정 | 학습자 앱 `sh.pg.use`(`toss`/`none`), `pg.intl`(해외카드 안내 문구, `lshop.js:184`) | 설정값이 표시용 — 실제 PG 선택과 연결 없음 |
| 웹훅 | 없음(만료 청소 `fac/sweep.js`만) | 결제창을 닫으면 `ready`가 남음(01 문서 §5-3 8번) |
| 정산 | 화면 · 데이터 없음 | PG 입금과 원장 대사 불가 |

---

## 3. 설계 — PG에 무관한 원장 + 결제 어댑터

### 3-1. 계층

```
[학습자/보호자 화면] [데스크 화면]
        │ prepare / confirm / refund
[수납 원장 서비스]  ← 금액 재계산 · 멱등 · 상태 전이 · 원장 기록(01 문서 led_*)
        │ PgAdapter 인터페이스(아래)  ※ 원장은 PG 이름을 모른다
[어댑터 레지스트리] ── toss │ portone │ (kginicis │ kcp │ nice │ eximbay │ paypal : 후속) │ manual(현장 · 현금 · 계좌)
        │
[기관별 PG 계정 pg_account · 라우팅 pg_route · 암호화 키 저장]
        │
[웹훅 수신 /api/pg/hook/:tid/:accountId → pg_event → 조회로 확정]   [정산 가져오기 → led_settlement 대사]
```

원칙: **원장은 돈의 사실만, PG 응답 원문은 `pg_event.raw`(비밀값 제거 후)에만.** 원장 행에는 `pg_provider · pg_account_id · pg_tx_id`와 정규화 값만 둔다.

### 3-2. 어댑터 인터페이스(Node · Java 동일 규격)

모든 메서드는 **정규화된 입력 · 출력**만 쓴다(PG 고유 필드는 `ext`로 전달). 금액은 **최소 화폐 단위 정수**(KRW 원, USD 센트)와 통화 코드 쌍이다.

| 메서드 | 입력 | 출력(정규화) | 비고 |
|---|---|---|---|
| `describe()` | — | `{id, name, kind:'direct'\|'broker', capabilities, credentialSpec[], guide}` | 화면이 이 값으로 카탈로그 · 키 입력 양식 · 가맹 안내를 자동 생성(§5) |
| `prepare(order, ctx)` | `order{orderId, amount, currency, orderName, method?, buyerRef}`, `ctx{account, successUrl, failUrl, mode}` | `{checkout:{type:'sdk'\|'redirect', publicParams}}` | **비밀 키는 절대 포함하지 않음**(공개 클라이언트 키만). 서버가 금액을 계산해 `order.amount_expected`로 저장한 뒤 호출 |
| `confirm(req)` | `{orderId, pgRef, amount, currency}` (`pgRef`=토스 `paymentKey` / 포트원 `paymentId` / 이니시스 `authToken` 등) | `{status:'paid'\|'waiting_deposit'\|'failed'\|'expired', pgTxId, amount, currency, method, approvedAt, receiptUrl?, vbank?, krwAmount?, fxRate?, fee?, raw}` | 승인 호출 + 응답 금액 반환. **금액 대조는 어댑터 밖(서비스)에서** |
| `query(ref)` | `{pgTxId \| orderId}` | `confirm`과 같은 모양 + `cancels[]` | 웹훅 · 스위퍼 · 재시도의 단일 진실원 |
| `cancel(req)` | `{pgTxId, amount?, currency, reason, idem, refundAccount?}` | `{status:'done'\|'pending'\|'failed', cancelTxId, canceled, remain, code?}` | `amount` 없으면 전액. 가상계좌 입금 후 환불은 `refundAccount`(서버 암호화 취급, 로그 금지) |
| `verifyWebhook(rawBody, headers, ctx)` | 원본 body(변조 금지) · 헤더 | `{ok, signed:boolean, eventKey, kind, orderId?, pgTxId?}` | 서명 규격이 있으면 검증(`signed:true`), 없거나 불명이면 `signed:false`. **어느 쪽이든 서비스는 `query`로 재확인** |
| `importSettlement(range, ctx)` | `{from, to}` | `[{pgTxId, kind:'pay'\|'cancel', gross, fee, vat, net, currency, krwNet?, payoutDate, ext}]` | API가 없는 PG는 파일(CSV) 업로드 매퍼로 구현(§3-8) |
| `billing`(선택) | `issueKey` · `charge` · `deleteKey` | `capabilities.billing=true`인 어댑터만 | 학원 월 수강료 자동결제 2차 범위 |
| `cancelPolicy(payment, amount)` | 결제 건 · 취소 금액 | `{allowed, reason?, needsRefundAccount?, etaText}` | 화면 선검증 · 안내 문구(예: 「카드 부분취소는 영업일 3~4일 소요」) |

`capabilities` 예시(선언형): `methods[]`(card · simple_pay · bank · vbank · phone · paypal · intl_card …), `currencies[]`, `settleCurrencies[]`, `partialCancel{카드:true, 가상계좌:'입금후만'…}`, `refundWindowDays{…}`, `billing`, `webhook{signed:true\|false\|unknown, retry}`, `testMode:'key'\|'channel'\|'none'`.

**오류 정규화**(어댑터가 PG 코드를 다음으로 변환, 원 코드는 `ext.code`): `amount_mismatch · declined · expired · already_processed · duplicate_request · cancel_not_allowed · refund_account_required · pg_unavailable(timeout/network) · invalid_credentials · unsupported`. 학습자 화면 문구는 이 코드로만 만든다(PG 원문 노출 금지).

### 3-3. 기관별 PG 선택 · 라우팅

```
pg_account  (tenant_id, id 'pa_', provider, mode 'test'|'live', label, enabled,
             public_key,                       -- 클라이언트 키 · MID 등 공개 가능 값(평문)
             secret_enc, webhook_secret_enc,   -- AES-256-GCM 봉투 암호문(아래)
             extra_enc jsonb,                  -- 어댑터별 추가 비밀(예: 이니시스 SignKey · INIAPI Key)
             fp,                               -- 키 지문 sha256 앞 8자(식별용, 복원 불가)
             verified_at, live_checked_at, created_by, updated_at)
pg_route    (tenant_id, currency, method_group 'domestic'|'intl_card'|'paypal'|'any', account_id, priority)
pg_event    (tenant_id, id, account_id, event_key, kind, order_id, pg_tx_id, signed bool,
             raw_redacted jsonb, state 'new'|'done'|'ignored'|'error', received_at, processed_at)
             -- 유일 색인 (account_id, event_key)
led_settlement (tenant_id, id, account_id, pg_tx_id, kind, gross, fee, vat, net, currency, krw_net,
                payout_date, matched_receipt_id, diff, imported_at)
```
- **라우팅은 단순하게**: 기관은 「기본 결제(원화)」 PG 1개 + 「해외 결제」 PG 0~1개만 고른다. 내부적으로 `pg_route`가 통화 · 수단군으로 계정을 고른다(복수 PG 병행 · 장애 시 우회는 2차).
- 현 `sh.pg.use`는 `pg_route`의 읽기 전용 파생값으로 호환(`none` = 계정 없음 또는 비활성, `toss` = provider 이름). `pg.intl`은 해외 라우트 유무에서 파생.
- **환경변수 폴백**: 기관 계정이 없고 `TOSS_SECRET_KEY`가 있으면 기존처럼 서버 기본 토스(시설 기존 동작 유지, 플래그 `pg_env_fallback`). 신규 기관은 계정 방식만 사용.

### 3-4. 키 보관 · 화면 노출 금지

| 항목 | 규칙 |
|---|---|
| 암호화 | AES-256-GCM 봉투 암호화. 마스터 키는 GCP Secret Manager(`PG_KEK_V1`, 버전 `kid` 보관), 기관별 데이터 키는 `HKDF(KEK, tenant_id)`. 저장 형식 `v1.<kid>.<iv b64>.<ciphertext+tag b64>`, **AAD = `tenant_id|account_id|필드명`**(다른 기관 · 필드로 복사해도 복호화 실패) |
| Node · Java 동일 | 같은 형식 · 같은 AAD. `tests/pg-vectors.json`에 암호 · 복호 벡터를 두고 Node(`crypto`) · Java(`javax.crypto`) · 시연판이 같은 결과를 내는지 검증 |
| 입력 | **쓰기 전용 필드**. 저장 후 `GET`은 `{set:true, fp:'a1b2c3d4', updatedAt}`만 반환(값 · 마지막 자리 미반환). 교체 = 새 값 덮어쓰기 |
| 전송 | 입력 API는 HTTPS 전용, 요청 · 응답 · 서버 로그 · 감사 로그에 값 금지(키 이름 기반 마스킹 필터 + 단위 테스트) |
| 사용 | 서버 메모리에서 호출 직전에만 복호화, 캐시는 요청 단위(장기 캐시 시 TTL 5분). 브라우저로 비밀 키 전송 없음(`prepare`는 공개 키만) |
| 권한 | 키 입력 · 교체 · 실전환은 **정운영자(owner)만**. 직원 · 회계 역할은 상태만 조회 |
| 감사 | 누가 · 언제 · 어떤 계정 · 무슨 동작(등록 · 교체 · 검증 · 실전환 · 비활성)만 기록, 값 없음 |
| 사고 대응 | 「키 폐기」 버튼 = 즉시 비활성 + 암호문 삭제 + 진행 중 주문 보류 알림. 시크릿 교체 시 웹훅 시크릿은 신 · 구 2개 병행 허용(포트원 · Stripe가 병행 교체 지원, S16, S25) |
| 노출 점검 | 토스는 시크릿 키를 SDK에 넣으면 `INSECURE_KEY_USAGE`로 결제가 막힌다(S17) → 입력 검증에서 `test_gsk`/`live_gsk` 등 접두 구분으로 클라이언트 키와 시크릿 키 혼동 입력을 차단 |

### 3-5. 승인 · 멱등 · 금액 재계산 (모든 어댑터 공통 규칙)

1. **`prepare`**: 서버가 청구 잔액 · 정가 · 쿠폰으로 `amount_expected`와 `currency`를 계산해 주문(`ready`)에 저장한다. 클라이언트가 보낸 금액은 무시한다(01 문서 §5-3 6번과 동일).
2. **`confirm`**: 브라우저 복귀(성공 URL)와 웹훅이 모두 같은 `settle(orderId)` 함수를 부른다. 함수는 주문 행을 `for update`로 잠그고 `ready → paid` 1회만 전이한다(이미 `paid`면 첫 결과를 그대로 반환).
3. **금액 3중 대조**: 요청 금액 = `amount_expected` = PG 응답 금액 · 통화. 하나라도 다르면 `amount_mismatch` → 즉시 전액 취소(현 `mod-pub.js:58` 동작을 공통화) + 원장 미기록 + 이벤트 기록.
4. **멱등 키**: 승인 `cf-<orderId>`, 취소 `rf-<refundId>`, 요청 id는 우리 주문 · 환불 id에서 생성(PG 유효기간 안에서 재시도 시 같은 키 재사용: 토스 15일 · 300자, Stripe 24시간 · 255자). 유효기간을 넘긴 재시도 · 응답 유실(`pg_unavailable`)은 **재호출 전에 `query`로 상태 확인**(이중 취소 방지).
5. **DB 방어선**: `led_receipt` 유일 색인 `(pg_account_id, pg_tx_id)`, 주문당 `paid` 수납 1건, 환불은 원 수납당 미결 1건(01 문서 §5-1).
6. **상태**: 주문 `ready → paid | waiting_deposit(가상계좌) | failed | expired`. 수강 권한 · 이용권 활성화는 **`paid` 이후에만**(현재는 이벤트 수신 시 부여 → 개선, 01 문서 시나리오 ③).
7. **취소 실패 처리**: PG 취소 실패 시 환불 `pending` 유지 + 재시도 버튼(01 문서 ③ 확정). 응답 유실은 `query`로 확인 후 이미 취소됐으면 `done`으로 맞춘다.

### 3-6. 웹훅 수신 · 재시도 대응

```
POST /api/pg/hook/:tid/:accountId   (인증 없음 — 서명 또는 재조회로 신뢰 확보)
1) 원본 body 그대로 보관(파싱 전)   2) adapter.verifyWebhook()
3) event_key 계산 → pg_event insert on conflict do nothing(중복이면 곧바로 200)
4) 즉시 200 응답(토스 10초 제한)     5) 비동기 작업: adapter.query() → settle()/refund 반영
```
- **서명이 있는 PG**(포트원 Standard Webhooks, Stripe)는 검증 실패 시 400. **서명이 없거나 불명인 PG**(토스 결제 웹훅 현황 확인 필요, 엑심베이 형식 확인 필요)는 `signed:false`로 받되 **조회 결과로만 상태를 바꾼다**(위조 웹훅이 와도 조회 결과가 같으면 부작용 없음).
- `event_key`: 서명 규격이 이벤트 id를 주면 그 id(Stripe `evt_…`), 없으면 `sha256(pgTxId + status + 취소거래키/승인시각)`. 토스는 전송 id가 매번 새로 발급되므로 사용하지 않는다(S15).
- **재전송 정책 차이**(토스 최대 7회 · 약 3일 19시간, 포트원 최대 5회, Stripe 최대 3일)는 우리가 맞출 수 없으므로 **스위퍼가 보강**한다: ① `ready` 주문이 30분 넘으면 `query`, ② 가상계좌 `waiting_deposit` 만료 확인, ③ 매일 전일 결제 · 취소를 `query`로 대조, ④ 웹훅 수신 실패 알림(원장 알림 탭).
- 순서 비보장(포트원 · Stripe): 이벤트로 상태를 직접 쓰지 않고 항상 조회 결과(최신)를 반영하므로 순서 문제가 없다.
- 웹훅 URL은 기관 · 계정별로 발급(`/hook/<tid>/<accountId>`), PG 콘솔 등록은 화면의 「복사」 버튼으로 안내(토스는 MID별 설정, S15). IP 허용 목록 안내는 포트원 `52.78.5.241`을 기준으로 가이드에 표기하되 변경될 수 있어 **정기 확인 필요**(S16).

### 3-7. 해외 통화 · 환율 · 원화 정산

| 문제 | 설계 |
|---|---|
| 가격 | 기본은 **KRW 기준 가격**(상품 단일 가격표). 기관이 켜면 상품별 선택 입력 `price_usd`(미입력 시 환산 표시 안 함). 자동 환산 표시를 쓰는 경우 환율 출처 · 갱신 시각을 화면에 표기하고 **결제 시점의 승인 통화 · 금액을 주문에 고정** |
| 저장 | `led_receipt`에 추가: `currency`(ISO), `amount_minor`(승인 통화 최소단위), `krw_amount`(원화 환산 확정액, 정산 전에는 null), `fx_rate`, `fx_source('pg'\|'settlement'\|'manual')`, `fee_minor`. **원장 집계(매출)는 KRW 기준**, 정산 전 외화 건은 `provisional`(잠정) 표시 |
| 소수점 | 통화별 `minorUnit` 표(KRW · JPY = 0, USD · EUR = 2)를 Node · Java · 브라우저가 공유(`tests/pg-vectors.json`). Stripe는 KRW를 소수점 없는 통화로 취급(S26) |
| 국내 PG 해외카드 | **원화 승인 · 원화 정산**이 기본(토스 KRW만, 나이스 KRW, KCP · 엑심베이 KRW/USD, S21) → 외화 개념 없이 `currency='KRW'`, `method='intl_card'`로 기록. 고객 카드사가 환율을 적용하므로 영수증은 원화 |
| PayPal(토스 경유) | 상점 결제통화 USD, **정산통화 KRW**(S11) → `currency='USD'`로 승인, 정산 가져오기에서 `krw_amount` 확정, 차이는 환차 항목 |
| 엑심베이 · 다통화 | 승인 통화 · 정산 통화(KRW/USD) 선택은 계약 설정. 어댑터는 승인 통화를 그대로 반환하고, 정산 통화가 KRW면 정산 가져오기에서 확정 |
| 부분 환불 | 환불 금액은 **승인 통화 기준**으로 입력 · 전송(`cancel.amount`, `currency`). 원화 환산 차이는 `fx_diff` 줄로 별도 기록(매출 왜곡 방지). PayPal은 환불 수수료는 없고 원 수수료는 반환되지 않으므로(S22) 환불 시 수수료 손실 안내 |
| 환불 기한 | 어댑터 `refundWindowDays`로 선검증(토스 계좌이체 · PayPal 180일, Stripe 한국 결제수단 365일 등, §1). 기한 초과 시 「현금 환불(계좌이체)」 경로 안내로 전환 |
| 최소 금액 · 통화 지원 | 어댑터 `currencies[]`와 PG별 최소 금액(예: Stripe KRW 50원, S26)을 `prepare` 전에 검증 |
| 세무 · 외환 | 외화 수취 · 부가세 · 증빙 처리는 **세무사 확인 필요**(조사 범위 밖). 내보내기에 통화 · 환율 · 원화환산액 열을 포함(01 문서 ⑦) |
| 해외 카드 승인율 | 국내 PG 경유 해외카드는 이상거래 탐지로 거절 가능성이 높다는 2차 자료(S28). 결제 실패 안내 화면에 「해외 카드는 발급사 한도 · 해외결제 허용 여부 확인」 문구(`lshop.js:184` 기존 안내 확장) |

### 3-8. 정산 가져오기 · 대사

- 목적: **「원장의 수납 − 환불」과 「PG 입금액(수수료 · 부가세 차감)」을 건별로 맞춘다.** 차이(누락 · 수수료 오반영 · 역정산)를 화면에 띄운다.
- 방법(어댑터별 `importSettlement`): ① API가 있는 PG(토스 정산 조회 — 정산 대사 용도의 조회 기능이 있다고 안내됨, 엔드포인트 세부는 **확인 필요**, S13 · 포트원 거래대사 기능 — Growth 이상 포함, S12), ② 없거나 미확인인 PG(KG이니시스 가맹점관리자 정산 · PayPal 거래내역 · 엑심베이)는 **정산 파일(CSV/Excel) 업로드 + 열 매핑 저장**(PG별 매핑 프리셋을 어댑터가 제공). 1차는 ②를 공통 경로로 만들고 ①은 확인되는 대로 추가.
- 규칙: 키 `(account_id, pg_tx_id, kind)`, `insert … on conflict do nothing`(재가져오기 안전). `kind='cancel'`은 환불과 연결. 입금일 · 수수료 · 부가세 · 순액 저장. 역정산(환불액이 해당 회차 결제 합계를 초과해 차액 납부, S14)은 `diff` 사유 「역정산」으로 표시.
- 화면: 「정산 · 대사」 탭(원장 화면 신설 탭) — 기간 선택, 건수 · 총액 · 수수료 합, 불일치 목록(미매칭 원장 · 미매칭 PG 건), 입금 예정일, 내보내기. 정산 지급일 정보가 없는 PG는 「PG 기준 별도 안내」(01 문서 ⑤와 일치).

### 3-9. Node · Java 같은 규격 지키는 방법

- `/api` 변경이므로 `service/server`(Node)와 `service-egov`(Java)를 함께 수정한다(`CLAUDE.md`). 어댑터 인터페이스 · 정규화 객체 · 오류 코드 · `capabilities` 키 이름은 **JSON 스키마 1벌(`docs/ledger/pg-adapter.schema.json`, 구현 시 신설)** 을 기준으로 양쪽이 생성 · 검증한다.
- 파일 배치(안): Node `service/server/pg/{index.js, registry.js, crypto.js, adapters/toss.js, adapters/portone.js}`, Java `…/pg/{PgAdapter.java, PgRegistry.java, PgCrypto.java, adapter/TossAdapter.java, adapter/PortoneAdapter.java}`. 현 `fac/pay.js` 로직은 `adapters/toss.js`로 이전하고 `fac/*`는 레지스트리를 호출하도록 바꾼다(동작 동일, 환경변수 폴백 유지).
- **공용 테스트 벡터 `tests/pg-vectors.json`** 항목: ① 암호 · 복호(AAD 포함), ② 포트원 · Stripe 웹훅 서명 검증(정상 · 변조 · 만료), ③ 이니시스 해시 생성(signature · verification · hashData) 예시, ④ 금액 3중 대조 · `minorUnit`, ⑤ `event_key` 계산, ⑥ 멱등 키 생성, ⑦ 오류 정규화 표. Node · Java · 브라우저(표시용 `minorUnit`)가 모두 통과해야 병합(01 문서 §5의 `tests/ledger-vectors.json`과 같은 방식).
- **어댑터 모의 서버**: 각 어댑터는 `fetchFn` 주입(현 `createPay(env, fetchFn)` 방식 유지)으로 PG 응답 녹화본을 재생해 승인 · 취소 · 웹훅 · 오류를 단위 테스트한다. 실 PG 호출 테스트는 기관 테스트 키로 수동 점검표(§5)에서만.

### 3-10. 포트원 중개 안 vs 직접 다중 연동 안

| 구분 | A. 포트원 중개 | B. 직접 다중 연동(PG별 어댑터) |
|---|---|---|
| 개발량 | 어댑터 1개(`portone`)로 지원 PG 다수 · 해외 채널(PayPal · 엑심베이 등) 흡수. **Node + Java 각 1벌** | PG N개 × (Node + Java). 이니시스(해시 서명 + 취소 V1/V2) · 엑심베이(fgkey) · 토스(Basic) 등 규격이 달라 각각 학습 · QA |
| 온보딩 난이도 | 기관이 **포트원 상점 + PG 계약 두 단계**(신청서 1회로 여러 PG 동시 계약 요청 가능, S19). 키 입력 항목이 늘어남(포트원 API 시크릿 · 상점 id · 채널 키 · 웹훅 시크릿) | 기관이 PG와 직접 계약, 키 입력은 PG별 필드(토스: 클라이언트 · 시크릿 2개 등) |
| 웹훅 · 조회 | 서명(Standard Webhooks) · 이벤트 · 조회 API 통일(S16). 순서 비보장 | PG마다 서명 · 이벤트 · 재전송 정책이 다름(§1) |
| 취소 · 빌링 | 통합 취소 API, 빌링키 · 예약결제 API 통합. **부분취소 · 빌링 지원 범위는 결국 PG에 따름**(S7) | PG 기능을 100% 활용(예: 토스 브랜드페이 · 위젯) |
| 비용 | 포트원 이용료 추가(월 순거래액 5천만 원 미만 Free, 이상 Growth 요금 확인 필요, S12). PG 수수료는 별개 | PG 수수료만(중개료 없음) |
| 장애 · 의존 | 포트원이 결제 경로에 끼어듦(장애 · 정책 변경 영향), 개인정보 · 결제정보 3자 경유 → 처리 위탁 고지 확인 필요 | 장애점 감소, PG별 변경(규격 개정)에 각각 대응 |
| 전환 유연성 | PG 변경 시 채널 키만 교체(S19) | PG 변경 = 어댑터 교체(이미 구현된 PG 간에는 키 교체) |
| 해외 결제 | PayPal · 엑심베이 · 페이레터 · 페이먼트월 · 헥토 지원(S4) | 해외 서비스마다 직접 어댑터 필요 |
| 정산 대사 | 거래대사 기능(Growth 이상)을 활용 가능(S12) | PG별 정산 가져오기 구현 |

**추천: 하이브리드(어댑터 인터페이스 고정 + 두 방식 모두 어댑터로 수용).**
1. 1차: `toss`(직접) — 이미 구현 · 시설 운영 중, 중개료 없음, 토스 이용 기관은 키 2개만 입력. + `portone`(중개) — KG이니시스 · KCP · 나이스를 이미 계약한 기관, **해외 결제(PayPal 등)** 를 개별 어댑터 없이 한 번에 흡수.
2. 2차: 계약 기관 수가 많은 PG만 직접 어댑터 추가(예: `kginicis`). 직접으로 바꿔도 원장 · 화면 변경 없음(어댑터 교체만).
3. 이유: 대표님 요구(「여러 페이먼트」 · 「쉽게 연동」 · 해외결제)를 **개발량 N배 없이** 충족하고, 포트원 의존은 어댑터 하나로 격리되어 필요하면 걷어낼 수 있다.
4. 주의: 포트원 이용료(Free 구간 · Growth 요금)와 처리 위탁 · 개인정보 고지는 도입 전 확인 필요(§7 결정 2). 포트원이 하위 상점(멀티 스토어) · 파트너 계정을 제공해 **기관이 포트원 가입을 생략**할 수 있는지는 **확인 필요**(가능하면 온보딩이 크게 단순해짐).

---

## 4. 법 · 정책 가정과 확인 필요 항목

| # | 항목 | 현재 가정 | 확인 |
|---|---|---|---|
| 1 | 가맹 주체 | **기관 명의로 PG 계약 · 정산 계좌도 기관**. 산타는 키로 연동만 하고 돈을 받지 않음(산타가 대금을 받아 나누면 결제대행 · 전자금융업 이슈 소지) | 법무 · PG 확인 필요 |
| 2 | 교육업 가맹 | 학원 · 평생교육 · 직업훈련 업종이 PG별로 허용되는지, 필요 서류(학원등록증 · 통신판매업 신고 등)는 **조사에서 확인하지 못함**(토스 심사 가이드는 교육업 미언급, S18) | PG별 입점 허용 업종 문의 |
| 3 | 환불 규정 | 학원법 · 평생교육법 환불 기준표는 01 문서 §7 결정 5에서 별도 확정. 본 문서는 PG 취소 규칙만 다룸 | 01 문서 결정 5 |
| 4 | 정기결제 | 토스 자동결제는 별도 계약 · 정기 구독형만 허용(S10). 월 수강료가 구독형으로 인정되는지 PG 확인. 한국 규정상 가격 인상 사전 동의 · 결제 7일 전 안내(Stripe 안내, S9)를 수강료 자동결제에도 준용 검토 | PG · 법무 확인 필요 |
| 5 | 해외 결제 세무 · 외환 | 외화 수취의 부가세 · 증빙 | 세무사 확인 필요 |
| 6 | 처리 위탁 · 개인정보 | 포트원 경유 시 결제정보 3자 경유 고지 | 개인정보처리방침 확인 필요 |
| 7 | 애플페이 · 간편결제 종류 | PG별 지원 목록 | 각 PG 확인 필요 |

---

## 5. 기관 온보딩 시나리오 — 「온라인 결제 켜기」

화면 위치: 스튜디오 「설정 › 결제 연결」(원장 · owner만). 학습자 화면의 「결제 준비 중」(`lshop.js:125,133,154`)은 **연결이 `실결제` 상태가 될 때까지** 그대로 유지한다(기존 `pg.use==='none'` 동작 호환).

### 5-1. 흐름

| 단계 | 원장님이 보는 것 | 할 일 | 시스템 동작 · 예외 |
|---|---|---|---|
| 0 시작 | 「결제 연결」 카드: 상태 배지 `미연결`, 버튼 「온라인 결제 켜기」. 현장 결제(현금 · 카드 단말기)는 이미 사용 가능하다는 한 줄 안내 | 버튼 클릭 | 현장 수납은 PG와 무관하게 동작(01 문서). 이미 환경변수 토스가 켜진 기관은 `실결제(기본 설정)`로 표시 |
| 1 질문 3개 | 한 화면 3문항: ① 이미 계약한 PG가 있나요(토스 · KG이니시스 · KCP · 나이스 · 잘 모름) ② 해외 결제(해외카드 · PayPal)가 필요한가요 ③ 사업자 형태(법인 · 개인 · 비영리 · 공공) | 선택 | 「잘 모름」이면 2단계 추천 |
| 2 PG 선택 · 가맹 안내 | 추천 PG 2~3개 카드(예: 토스페이먼츠 · KG이니시스 등). 카드마다: **공개 수수료(확인된 것만, 부가세 별도 표기)**, 가입비 · 정산 주기, 지원 수단 아이콘, 해외 지원 여부, 「이 PG에서 확인된 심사 소요(토스 계약 후 10~14영업일 등)」. 「확인 필요」 항목은 숨기지 않고 「PG에 문의」로 표시 | 하나 선택 | 이미 계약 PG를 고른 경우 3단계로 직행. 해외 필요 시 「해외 결제 PG」를 추가로 고르게 안내(예: PayPal · 엑심베이, 중개 선택 시 같은 화면) |
| 2-1 가맹 신청(미계약) | 「가맹 신청 준비물」 체크리스트: 사업자등록증 · 대표자 서류(발급 3개월 이내) · 통장 · 통신판매업 신고번호 · 홈페이지 하단 사업자 정보와 **환불 정책 표시** · 판매 상품 1개 이상(품절 · 샘플 아님), 교육업 심사 유의(PG에 업종 확인). 「신청 링크 열기」(PG 가입 페이지) · 「산타 담당자에게 문의」 | 준비물 확인 후 PG 사이트에서 신청 | 신청 대행은 하지 않음(기관 명의 계약). 「가맹 심사 진행 중」 상태를 원장님이 수동 표시(알림 일정 안내: 평균 약 3주) |
| 3 키 입력 | PG별로 **어댑터가 선언한 입력칸만** 표시(예: 토스 = 「클라이언트 키」 「시크릿 키」, 포트원 = 상점 id · API 시크릿 · 채널 키 · 웹훅 시크릿). 각 칸에 「어디서 찾나요」 링크 · 스크린샷 가이드. 비밀칸은 붙여넣기 전용, 저장 후 값 비표시(「등록됨 · 지문 a1b2c3d4」) | 테스트 키부터 입력(`test_…`) | 입력 검증: 접두(test/live · 클라이언트/시크릿) 불일치 즉시 차단, 길이 · 형식 확인. 저장 → 서버 암호화(§3-4). 값은 화면 · 로그에 남지 않음 |
| 4 연결 확인 | 「연결 확인」 버튼 → 3개 체크(키 유효 · 결제 조회 응답 · 웹훅 URL) 결과 ✔/✖와 원인 안내 | 클릭 | 어댑터 `verify`(결제 조회 호출 등 부작용 없는 호출). 실패 시 `invalid_credentials` 안내(키 종류 혼동 · 환경 불일치) |
| 5 웹훅 등록 | PG 콘솔에 붙일 **웹훅 URL 복사 버튼**(`/api/pg/hook/<tid>/<accountId>`)과 선택해야 할 이벤트 목록, 포트원은 시크릿 입력칸 | PG 콘솔에서 등록 | PG가 웹훅을 못 보내도 결제는 조회로 보정되므로 **필수 아님**(권장 표시). 수신되면 「웹훅 수신 확인」 ✔ |
| 6 테스트 결제 | 「테스트 결제」 패널: 1,000원 상품 결제 → ① 승인 ② 부분 취소(300원) ③ 잔액 전액 취소 3단계 진행 표시, 각 단계 결과 · 원장 기록 · 웹훅 수신 여부 | 결제창에서 테스트 카드 진행(토스 테스트 키는 실제 차감 없음, S17) | 테스트 모드 원장 행은 `mode=test`로 **매출 집계에서 제외**(별도 필터). 3단계 모두 통과해야 다음 단계 활성 |
| 7 실결제 전환 | 「실결제 전환」 체크리스트 5개(① 가맹 심사 완료 확인 ② live 키 입력 ③ 환불 정책 문구 게시 ④ 정산 계좌 확인 ⑤ 테스트 결제 통과). 마지막에 「실결제 시작」 확인 모달(되돌리기: 비활성화 가능) | live 키 입력 → 연결 확인 → 전환 | `mode=live`로 승격, 학습자 화면 「결제 준비 중」 해제. **첫 실결제 소액 검증(권장)**: 최소 금액으로 결제 후 즉시 전액 취소(최소 결제금액은 PG별 확인 필요) |
| 8 운영 | 배지 `실결제 · 토스페이먼츠`, 최근 결제 · 오류 · 웹훅 · 정산 대사 링크, 키 교체 · 비활성화 · 키 폐기 버튼 | — | 비활성화해도 진행 중 주문은 조회로 마무리, 신규 결제만 차단. 키 교체 시 마지막 정상 결제 후 교체 안내 |

### 5-2. 해외 결제 켜기(같은 화면의 토글)

- 「해외 결제」 토글: ① 해외카드(현재 PG가 지원하면 별도 키 없이 켬: 지원 여부는 `capabilities.methods`에 `intl_card`가 있는 경우만) ② PayPal 등 별도 서비스(포트원 채널 선택 또는 PG 콘솔 설정 후 키 입력).
- 켜면 결제 화면에 「Global cards / PayPal」 수단이 노출되고, 통화(USD 등) 가격 입력칸이 상품 화면에 생긴다(§3-7). 켜기 전 가맹 심사 · 지원 통화 · 정산 통화를 PG 카드에서 안내.
- 학습자 결제 화면의 수단 목록 = `capabilities.methods ∩ 기관이 켠 수단`. 앱 안내 챗봇(`lsam.js:85`)은 이 목록에서 자동 생성한다(현재 문구 하드코딩).

### 5-3. 화면 구성(와이어프레임)

```
[결제 연결]                                          상태 ● 테스트 모드
 ┌ 기본 결제(원화) ──────────────────────────────┐
 │ 토스페이먼츠 · 테스트 키 등록됨(a1b2c3d4)         │
 │ ✔ 키 확인  ✔ 웹훅 수신  ✖ 테스트 결제 미완료      │
 │ [키 교체] [연결 확인] [테스트 결제] [실결제 전환]  │
 └──────────────────────────────────────────────┘
 ┌ 해외 결제 ──────────────  [토글 켜짐] ─────────────┐
 │ 해외카드 · KRW 정산 · 수수료 안내        ⓘ PG에 문의  │
 │ PayPal(USD) · 미연결  [연결하기]                   │
 └──────────────────────────────────────────────┘
 최근 이벤트: 승인 1,000원 · 취소 300원 · 취소 700원(웹훅 수신)
 가맹 안내 ▸ 준비물 체크리스트 · 수수료 · 심사 기간
```

### 5-4. 기관 담당자 안전장치

- 실결제 전환 전에는 데모 결제창이 실제 결제로 오인되지 않도록 「테스트 모드」 배너를 학습자 결제창에도 표시(운영자 미리보기 한정).
- 결제 실패 · 환불 지연 문의에 쓰는 **안내 문구 템플릿**(카드 환불 영업일 3~4일, 계좌이체 · 가상계좌 환불계좌 필요, 해외카드 승인 실패 점검 목록)을 어댑터 `cancelPolicy.etaText`와 `lshop.js:184` 점검 목록에서 가져와 일관되게 표시.
- 키 노출 의심 신고 → 「키 폐기」(§3-4)와 PG 콘솔 재발급 안내.

---

## 6. 구현 단계(제안)

1. **v41.0**: 원장 · `ledger.record`(01 문서) + `pg_account` · 암호 모듈 · 어댑터 인터페이스 · `toss` 이전(동작 동일) · 승인 공통 규칙(금액 3중 대조 · 멱등) · 웹훅 수신 · 스위퍼 · 「결제 연결」 화면(토스 1종) · 테스트 결제.
2. **v41.x**: `portone` 어댑터(국내 PG 다수 + 해외) · 해외 통화 필드 · 외화 가격 입력 · 정산 파일 가져오기 · 대사 화면 · 키 교체 · 감사 로그.
3. **이후**: 직접 어댑터(수요 PG) · 정기결제(빌링) · 가상계좌 자동 입금 확인(01 문서 결정 2) · PG 이중화 라우팅 · VAN 단말기 연동 검토.

---

## 7. 대표님 결정 필요 (3개)

| # | 결정 사항 | 추천 | 영향 |
|---|---|---|---|
| 1 | **가맹 주체**: 기관 명의로 PG에 직접 가맹(산타는 키로 연동만) vs 산타가 단일 가맹 후 기관별 정산 | **기관 명의 가맹**. 단일 가맹은 대금 수령 · 분배로 결제대행 · 전자금융 규제 검토가 필요하고 정산 책임이 산타에 집중됨(법무 확인 필요) | 온보딩 준비물, 정산 책임, 법적 리스크 |
| 2 | **연동 방식 · 중개 비용**: 하이브리드(토스 직접 + 포트원 어댑터)로 시작할지, 포트원 이용료(월 순거래액 5천만 원 미만 Free, 이상 Growth)를 누가 부담할지 · 포트원 처리 위탁 고지 수용 여부 | **하이브리드로 시작**, 포트원 비용은 기관 부담(요금제에 반영은 요금 문서와 별도 협의), 포트원 멀티 스토어 가능 여부는 담당자 확인 후 확정 | 개발량 · 해외 결제 범위 · 요금제 |
| 3 | **해외 결제 1차 범위**: (가) 해외카드(국내 PG, 원화 승인 · 정산)만, (나) (가) + PayPal(USD 결제 · 원화 정산), (다) 엑심베이 등 다통화 · Alipay · WeChat까지. 외화 가격 표시 방식(원화 단일가 + 환산 표시 / 외화 가격 직접 입력) | **(나)로 시작**: 대표님 요구(해외결제)를 충족하면서 외화 정산 · 환차 복잡도를 PayPal 한 갈래로 제한. 가격은 원화 기준 + 상품별 선택 USD 가격. (다)는 수요 확인 후 포트원 채널로 추가 | 해외 카드 승인율, 환차 처리, 개발 범위 |

---

## 8. 출처 (조사일 2026-11-14)

- S1 토스페이먼츠 결제 가이드 시작: https://docs.tosspayments.com/guides/v2/get-started
- S2 토스 결제 취소(부분취소 · 기한): https://docs.tosspayments.com/guides/v2/cancel-payment
- S3 KG이니시스 개발 매뉴얼 첫 화면: https://manual.inicis.com/
- S4 포트원 PG사 선택 연동(지원 PG · 해외 서비스 · 정기결제 범위): https://developers.portone.io/opi/ko/integration/pg/v2/readme?v=v2
- S5 포트원 V2 개요(지원 PG 목록): https://developers.portone.io/opi/ko/integration/start/v2/readme?v=v2
- S6 KG이니시스 표준결제 PC(서버 승인 · 서명 · 망취소): https://manual.inicis.com/pay/stdpay_pc.html
- S7 포트원 V2 REST 결제 API: https://developers.portone.io/api/rest-v2/payment
- S8 KG이니시스 취소/환불: https://manual.inicis.com/pay/cancel.html
- S9 Stripe 한국 결제수단 · 환불 · 정기결제 안내: https://docs.stripe.com/payments/countries/korea , 지원 국가 목록: https://stripe.com/global
- S10 토스 자동결제(빌링): https://docs.tosspayments.com/guides/v2/billing
- S11 토스페이먼츠 수수료(공개): https://www.tosspayments.com/about/fee
- S12 포트원 요금제 개편(2025-01-01 적용): https://blog.portone.io/pricing-plan-updates/
- S13 토스 용어집 정산(주기 · 조회): https://docs.tosspayments.com/resources/glossary/settlement
- S14 클래스업 결제 · 정산 · 환불 안내(VAN/PG 정산 · 역정산, 2차): https://docs.channel.io/classup_guide/ko/articles/%EA%B2%B0%EC%A0%9C--%EC%A0%95%EC%82%B0--%ED%99%98%EB%B6%88-%EC%8B%9C%EC%8A%A4%ED%85%9C-%EC%95%88%EB%82%B4-b6a60312
- S15 토스 웹훅 · 이벤트: https://docs.tosspayments.com/guides/v2/webhook , https://docs.tosspayments.com/reference/using-api/webhook-events
- S16 포트원 V2 웹훅: https://developers.portone.io/opi/ko/integration/webhook/readme-v2?v=v2
- S17 토스 API 키(테스트 · 라이브): https://docs.tosspayments.com/reference/using-api/api-keys
- S18 토스 카드사 심사 체크리스트: https://www.tosspayments.com/blog/articles/53711
- S19 포트원 PG 가맹 심사 절차: https://blog.portone.io/pg_onboarding_process/
- S20 포트원 2026 PG 비교(2차, 수수료 표는 이미지): https://blog.portone.io/opi_pg-comparison2026/
- S21 포트원 해외결제 PG 비교(2차, 작성 시점 불명): https://blog.portone.io/opi_pg-comparison_global/
- S22 PayPal 한국 판매자 수수료(2026-05-28 갱신): https://www.paypal.com/kr/business/paypal-business-fees
- S23 엑심베이 결제창 연동(테스트 환경): https://developer.eximbay.com/eximbay/payment_linkage/preparing-payment.html
- S24 엑심베이 결제취소 API: https://developer.eximbay.com/eximbay/payment_linkage/api-cancel-payment.html
- S25 Stripe 웹훅 · 멱등성: https://docs.stripe.com/webhooks , https://docs.stripe.com/idempotency
- S26 Stripe 통화: https://docs.stripe.com/currencies
- S27 클래스업 PG · VAN 계약 안내(2차): https://docs.channel.io/classup_guide/ko/categories/4-PG--VAN-%EA%B3%84%EC%95%BD-9e09260b
- S28 포트원 국내 사업자 해외결제 도입(2차): https://blog.portone.io/opi_globalpayment-krpg
- 인증 · 멱등키(토스 `Idempotency-Key`, 15일, 300자): https://docs.tosspayments.com/reference/using-api/authorization

**열람하지 못한 문서(후속 확인 필요)**: NHN KCP 개발자센터(developer.kcp.co.kr) · 나이스페이먼츠 개발자센터(developer.nicepay.co.kr, docs.nicepay.co.kr)는 자동 열람 차단, 토스 PayPal · 테스트 결제 가이드 페이지는 열람 실패, 토스 입점 허용 업종 답변 · Stripe 환불 상세 페이지는 내용을 가져오지 못했다.
