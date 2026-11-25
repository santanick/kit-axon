# 행안부 구현단계 보안약점 49개 ↔ 디디쌤 탐지 규칙 · 코드 근거 매핑

- 작성: 2026-11-25 · 보안전문가(디디쌤 가디언 4차) · 인증 크로스체크 #17(원장 SEC-0034)
- 기준: 행정안전부 · KISA 「소프트웨어 보안약점 진단가이드」(2021) 구현단계 7분류 49개. 공공 · 대학 납품 감리와 GS 시험에서 이 번호로 질의합니다.
- 대상: Node `service/server`, Java `service-egov/src`, 화면 `didisam/`. 줄 번호는 `core/sec` 92bad35 + `core/sec4-exp` 기준.
- 탐지 수단: **S** = 사내 Semgrep 규칙(`security/semgrep/didisam.yml`, CI `.github/workflows/security-scan.yml` semgrep 잡), **T** = 저장소 시험(`service/test` · `security/test` · `service-egov/test`), **G** = gitleaks(CI), **Z** = ZAP baseline(`security/zap/`), **R** = 코드 검토(수동, 이 표의 근거).
- 판정: 제거(근거 있음) · 부분 · 해당 없음 · 규칙 필요(현재 코드는 문제없으나 회귀를 막는 자동 규칙이 없음).
- 남은 것: 「규칙 필요」 항목의 Semgrep 규칙 추가(#1 · #2 · #5 · #7 · #21 · #25 · #43), 공공 납품 건마다 상용 · 공인 진단 도구 결과서 첨부(감리 요구 시). 이 표는 그 결과서의 사전 자가진단본입니다.

## 요약
| 판정 | 건수 |
|---|---|
| 제거(근거 있음) | 37(그중 회귀 방지 자동 규칙이 없는 「규칙 필요」 7: #1 · #2 · #5 · #7 · #21 · #25 · #43) |
| 부분 | 4(#20 · #28 · #33 · #36 — 인증 크로스체크 #7 · #13 · #9 · #20으로 d2 · d3 · d4 보완 중) |
| 해당 없음(관리형 런타임 · 미사용 기능) | 8(#8 · #9 · #10 · #16 · #17 · #41 · #42 · #46) |

## 1. 입력데이터 검증 및 표현(17)
| # | 보안약점 | CWE | 탐지 | 근거(파일:줄) | 판정 |
|---|---|---|---|---|---|
| 1 | SQL 삽입 | 89 | S(`didisam-rls-missing-tenant-*`는 테넌트 누락) · R | 전 쿼리 `$n` 바인딩, Java MyBatis `#{}` · `${f}`는 허용목록 통과 후(`PiiServiceImpl`) | 제거 · 규칙 필요(문자열 연결 쿼리 규칙) |
| 2 | 코드 삽입 | 94 | R | `eval` · `new Function` · `vm` 0건(grep) | 제거 · 규칙 필요 |
| 3 | 경로 조작 및 자원 삽입 | 22 · 99 | R · T | `service/server/app.js:718-720`(`path.resolve` 후 공개 폴더 밖 403), 업로드 ID 정규식(`mediafile.js`) | 제거 |
| 4 | 크로스사이트 스크립트 | 79 | S(`didisam-innerhtml-unescaped` · `-raw-ai-output`) · Z | CSP `script-src 'self'`(`app.js:725`), 이스케이프 `esc` · `E`. 후보 기준선 SEC-0012 | 제거(기준선 감시) |
| 5 | 운영체제 명령어 삽입 | 78 | R | `lms/media/worker.js:19` `spawn(cmd, args)` 셸 없음, Java `LmsVWorker` `ProcessBuilder(List)` | 제거 · 규칙 필요(`exec` · `shell: true` 금지 규칙) |
| 6 | 위험한 형식 파일 업로드 | 434 | T(`media.test.js` · `mediafile.test.js`) | 확장자 · MIME · 시그니처 · SVG 정화 · CSP sandbox(`media.js`, `mediafile.js`) | 제거 |
| 7 | 신뢰되지 않는 URL 자동 접속(열린 리다이렉트) | 601 | T(`ssrf.test.js` 6번) | **이번 회차 수정**: 폴더 리다이렉트 `//호스트` 차단(`app.js:722`, SEC-0039). OAuth 복귀는 고정 `/#oauth=`(`oauth.js:42`) | 제거 · 규칙 필요 |
| 8 | 부적절한 XML 외부개체 참조 | 611 | R | XML 파서 사용 0건(Node · Java grep `DocumentBuilderFactory` · `SAXParser` · `XMLInputFactory`) | 해당 없음 |
| 9 | XML 삽입(XPath · XQuery) | 643 | R | XPath 사용 0건 | 해당 없음 |
| 10 | LDAP 삽입 | 90 | R | LDAP 연동 없음 | 해당 없음 |
| 11 | 크로스사이트 요청 위조 | 352 | T(`api.test.js`) · R | `SameSite=Strict` + `x-didisam: 1` + Origin 확인(`app.js:769-770`) | 제거 |
| 12 | 서버사이드 요청 위조 | 918 | T(`ssrf.test.js` 1~5번 — 외부 요청 지점 전수 고정) | 벤치마크 `bench.js`(사설 · 메타데이터 차단 · IP 고정), 학내 LLM `ssrf.js` · Java `DdSsrf.java`(이번 회차) | 제거 |
| 13 | HTTP 응답 분할 | 113 | R | Node `http`가 헤더 CR/LF를 거부, Location은 인코딩된 경로 · 고정 값 | 제거 |
| 14 | 정수형 오버플로우 | 190 | R | 금액 · 수량은 서버에서 `Math.round` · 범위 제한(`I(v, lo, hi)`), DB `bigint` · `numeric` | 제거 |
| 15 | 보안기능 결정에 사용되는 부적절한 입력값 | 807 | S(`didisam-owner-check-missing-*`) | 역할 · 기관은 서버 세션에서만(`need` · `needOwner`), 화면 값 미신뢰 | 제거 |
| 16 | 메모리 버퍼 오버플로우 | 120 | — | 관리형 런타임, 네이티브 확장 직접 작성 없음, 본문 상한 413 | 해당 없음 |
| 17 | 포맷 스트링 삽입 | 134 | R | 사용자 값을 서식 문자열로 쓰지 않음(Java `String.format`은 고정 서식) | 해당 없음 |

## 2. 보안기능(16)
| # | 보안약점 | CWE | 탐지 | 근거(파일:줄) | 판정 |
|---|---|---|---|---|---|
| 18 | 적절한 인증 없는 중요 기능 허용 | 306 | S(`didisam-owner-check-missing-*`) · T | 관리 API 전부 `need` · 역할 확인, 비밀번호 변경 시 현재 비밀번호 확인 | 제거(관리자 2단계 인증은 인증 #1 · d1) |
| 19 | 부적절한 인가 | 285 | S(`didisam-rls-missing-tenant-*`) · T(`security.test.js`) | FORCE RLS + `app.tenant`, Java `TenantTx` | 제거 |
| 20 | 중요한 자원에 대한 잘못된 권한 설정 | 732 | R | 감사 기록 앱 역할 update · delete 회수(`db.js`), 컨테이너 비루트 · 읽기 전용 | 부분(접근권한 분기 검토 인증 #7 · d3) |
| 21 | 취약한 암호화 알고리즘 사용 | 327 | R | MD5 · SHA-1 · DES 사용 0건(grep). AES-256-GCM(`statecrypt.js`), scrypt, SHA-256 · HMAC | 제거 · 규칙 필요 |
| 22 | 암호화되지 않은 중요정보 | 311 · 319 | R · Z | PII `pii` 스키마 암호화(PII_KEY), HTTPS + HSTS | 제거(DB 연결 인증서 검증은 인증 #13 · d3) |
| 23 | 하드코드된 중요정보 | 798 | S(`didisam-hardcoded-secret-literal`) · G | 비밀값은 Secret Manager · 환경변수(`docs/security/secrets.md`) | 제거 |
| 24 | 충분하지 않은 키 길이 | 326 | R | 세션 토큰 256비트(`app.js:154`), AES-256, HMAC-SHA256 | 제거 |
| 25 | 적절하지 않은 난수 값 | 330 | R | 보안 값은 `crypto.randomBytes` · Java `SecureRandom`. `Math.random`은 정리 작업 확률(2%) 2곳만(`app.js:286`, `aigw.js:116`) | 제거 · 규칙 필요(토큰 · 코드 생성에 `Math.random` 금지) |
| 26 | 취약한 비밀번호 허용 | 521 | T | `pwrule.js:2-3`(2종 10자 · 3종 8자) | 제거 |
| 27 | 부적절한 전자서명 확인 | 347 | T | OAuth state HMAC 상수 시간 비교(`oauth.js` `safeEq`), 결제 금액 서버 대조 | 제거 |
| 28 | 부적절한 인증서 유효성 검증 | 295 | R | 외부 HTTPS는 기본 검증. **DB 연결 `rejectUnauthorized:false`(`db.js:9`)** | 부분 → 인증 #13(d3 `DB_SSL_CA`) |
| 29 | 쿠키를 통한 정보 노출 | 539 | R | 쿠키는 임의 토큰만. **운영자 쿠키 Max-Age 14일 지속 저장(`app.js:148`)** | 제거(정보 없음) · 지속 쿠키는 인증 #3(d2) |
| 30 | 주석문 안의 시스템 주요정보 | 615 | G | gitleaks CI, 화면 주석에 키 · 내부 주소 없음 | 제거 |
| 31 | 솔트 없는 일방향 해시 | 759 | R | 비밀번호 scrypt + 사용자별 솔트, 세션 토큰은 256비트 난수라 SHA-256 단독 저장이 적정 | 제거 |
| 32 | 무결성 검사 없는 코드 다운로드 | 494 | T · R | 이미지 다이제스트 고정(SEC-0002), whisper 해시 확인(SEC-0015), npm ci 스크립트 차단(SEC-0005), Actions SHA 고정 | 제거 |
| 33 | 반복된 인증 시도 제한 부재 | 307 | T(`api.test.js` · `devices.test.js`) | 운영자 DB 기준 15분 5회 잠금(`app.js:483-484`) | 부분 → 학습자 전 경로 DB 기준(인증 #9 · d2) |

## 3. 시간 및 상태(2)
| # | 보안약점 | CWE | 탐지 | 근거 | 판정 |
|---|---|---|---|---|---|
| 34 | 경쟁 조건(TOCTOU) | 367 | T | 기관 상태 낙관적 잠금(rev), 결제 · 쿠폰 상태 전이 1회(조건부 update), 마일리지 트랜잭션 | 제거 |
| 35 | 종료되지 않는 반복문 · 재귀 | 835 | R | 외부 입력 반복은 상한(본문 2MB · 리다이렉트 3번 · 목록 limit), 정규식 입력 길이 제한 | 제거 |

## 4. 에러 처리(3)
| # | 보안약점 | CWE | 탐지 | 근거 | 판정 |
|---|---|---|---|---|---|
| 36 | 오류 메시지 정보 노출 | 209 | T · Z | 서버 500 고정 문구 · 스택 미노출(`app.js:781`) | 부분 → 화면의 서버 원문 표시(인증 #20 · d4 `errmsg.js`) |
| 37 | 오류 상황 대응 부재 | 390 | R | 비어 있는 `catch`는 정리 · 부가 기록 경로만(본 처리 실패는 HttpErr로 전달) | 제거 |
| 38 | 부적절한 예외 처리 | 754 | R | 최상위 처리기에서 HttpErr · 그 외 구분(`app.js:778-781`), Java `DdException` 처리기 | 제거 |

## 5. 코드 오류(5)
| # | 보안약점 | CWE | 탐지 | 근거 | 판정 |
|---|---|---|---|---|---|
| 39 | Null Pointer 역참조 | 476 | R · 계약 시험 | Java는 `JsonNode` null 확인 헬퍼(`get` · `or` · `nf`), 계약 시험이 빈 · 잘못된 입력 400 확인 | 제거 |
| 40 | 부적절한 자원 해제 | 404 | R | DB 클라이언트 `finally release`(`inTenant`), Java try-with-resources · 스트림 종료 | 제거 |
| 41 | 해제된 자원 사용 | 416 | — | 관리형 런타임 | 해당 없음 |
| 42 | 초기화되지 않은 변수 | 457 | — | `'use strict'` · Java 컴파일러 확인 | 해당 없음 |
| 43 | 신뢰할 수 없는 데이터의 역직렬화 | 502 | R | Java `ObjectInputStream` · Jackson 기본 타입 지정 0건, Node는 `JSON.parse`만 | 제거 · 규칙 필요 |

## 6. 캡슐화(4)
| # | 보안약점 | CWE | 탐지 | 근거 | 판정 |
|---|---|---|---|---|---|
| 44 | 잘못된 세션에 의한 데이터 정보 노출 | 488 | T(`security.test.js` 테넌트 교차) | 요청마다 세션 → 기관 바인딩, 공유 가변 전역에 사용자 데이터 없음(Java 서비스 무상태) | 제거 |
| 45 | 제거되지 않은 디버그 코드 | 489 | R | 시험용 우회는 환경변수(`OAUTH_MOCK` · d1 `MFA_OFF`)로만, 운영 기본 꺼짐 — 운영 배포 변수 점검 대상 | 제거(운영 변수 점검 유지) |
| 46 | Public 메서드가 반환하는 Private 배열 | 495 | — | Java 서비스가 내부 배열을 외부에 반환하는 구조 없음(불변 `List.of` · 복사) | 해당 없음 |
| 47 | Private 배열에 Public 데이터 할당 | 496 | R | 같음 | 제거 |

## 7. API 오용(2)
| # | 보안약점 | CWE | 탐지 | 근거 | 판정 |
|---|---|---|---|---|---|
| 48 | DNS lookup에 의존한 보안 결정 | 350 | T(`ssrf.test.js` · `bench.test.js`) | 벤치마크는 DNS로 확인한 IP에 고정 연결(재바인딩 방지), 학내 LLM은 해석된 모든 주소를 검사. 허용 · 차단을 역방향 DNS 이름으로 정하지 않음 | 제거 |
| 49 | 취약한 API 사용 | 676 | S · R | `child_process.exec` · `eval` · `Buffer()` 생성자 · `crypto.createCipher` 0건 | 제거 |

집계는 요약 표와 같으며, 다르면 항목 표가 원본입니다. 병합 후 #20 · #28 · #33 · #36을 다시 판정합니다.
