# 디디쌤 Ver2 위협 모델 — 공격면 8 × 통제 × 현 코드 근거

- 작성: 수석 보안 컨설턴트(디디쌤 가디언 Phase 0) · 2026-11-24 · 기준 커밋 `d2c2e6d` + `core/sec-con`
- 근거: 「AI 보안 · 가디언 통합 보고서」 Part 3(위협 모델 · 공백 10) · Part 8(8-2 Java · 8-4 Node · 8-6 체크리스트)
- 발견 항목 원장 초기값: [`security/findings/seed.json`](findings/seed.json) · 사내 Semgrep 규칙: [`security/semgrep/didisam.yml`](semgrep/didisam.yml)
- 표기: **통제 상태** 충분 / 부분 / 없음. 근거는 `파일:줄`(Node · Java 함께). 줄 번호는 이 브랜치 기준이며 가디언이 스캔 때 다시 맞춥니다.
- 이 문서의 사건 · CVE 번호는 보고서 인용입니다. 가디언 영향 판정 전에 NVD · KISA 원문과 대조합니다.

## 0. 요약

| # | 공격면 | 우선 | 통제 상태 | 이번 회차 조치 | 남은 핵심 공백 |
|---|---|---|---|---|---|
| 1 | AI SAM 스튜디오 에이전트 | P0 | 부분 | SEC-0004 도구 허용 목록(수정) | 도구 4등급표 · 쓰기 도구 서버측 승인 기록 |
| 2 | 학습자 AI 튜터 | P1 | 충분에 가까움 | — | 정기 레드팀(sec-exp 회귀 10건) |
| 3 | MCP · 외부 연결 | P0 | 부분 | — | 외부 MCP 허용 목록 · write 키 발급 권한(SEC-0011) · 데모 키(SEC-0009) |
| 4 | 테넌트 데이터룸(RLS) | P1 | 충분(누락 1건 수정) | SEC-0003 pii 조회 역할 · app.tenant(수정) | Semgrep 규칙으로 재발 차단 |
| 5 | 인증 · 관리자 | P1 | 부분 | Java 컨트롤러 owner 근거 주석 | MFA(SEC-0008) · 감사 해시 체인(SEC-0006) · Spring Boot(SEC-0001) |
| 6 | 공급망(npm · Maven · 이미지) | P0 | 부분 | — | 이미지 다이제스트(SEC-0002) · --ignore-scripts(SEC-0005) · SBOM(sec-d1) |
| 7 | 개발 에이전트 · CI | P0 | 부분 | — | Actions SHA 고정(SEC-0010) · 운영 키 · DB 쓰기 배제 명문화 |
| 8 | AI 면접 음성 · 영상 | P1 | 부분(저장소 밖) | — | 고영향 AI 사람 최종 판단 기록 · 증류 탐지 |

## 1. 공격면별 위협 × 통제 × 근거

### ① AI SAM 스튜디오 에이전트 — P0 (LLM01 · LLM06 · ASI01-03)
위협: 문서 · 학습자 글 · 메일 · 도구 결과 속 숨은 지시로 목표 탈취(EchoLeak형), 무승인 설정 변경 · 외부 발송, 서버 도구를 이용한 반출.

| 통제 | 상태 | 근거(Node / Java) |
|---|---|---|
| AI 키는 서버에만, 브라우저는 `/api/ai/messages`만 호출(운영) | 충분 | `didisam/live.js:81` · `service/server/app.js:538` / `AiServiceImpl.java:86` |
| 사용자 글 개인정보 서버 가림 | 충분 | `service/server/aiguard.js:32`, `app.js:556` / Java `AiServiceImpl` redact 대응 |
| 인젝션 신호 점수화 · 감사 기록(`ai.injection_suspect`) | 부분(탐지만, 차단 없음) | `aiguard.js:44,58`, `app.js:561` / `AiServiceImpl.java:90` |
| 시스템 지시에 '자료 속 지시는 데이터' 보안 원칙 덧붙임 | 부분 | `app.js:562` |
| 응답 속 API 키 가림 | 충분 | `app.js:570` |
| 실행은 계획 카드 → 운영자 승인(모델이 직접 실행 안 함) | 부분(화면 승인, 서버 승인 기록 없음) | `didisam/claude.js:2-3`, `didisam/agent.js:3` |
| **도구 허용 목록(사용자 정의 + web_search ≤5회)** | 충분(이번 수정) | `app.js:35-37` / `AiServiceImpl.java:41-47` — SEC-0004 |
| 데이터룸 정책(AI 경로 · egress.ai) 서버 확인 | 충분 | `app.js:551` / Java 동일 정책 조회 |
| 사용자당 분당 40회 · 기관 일 한도 · 월 포함량 | 충분 | `app.js:542,554-557` / `AiServiceImpl.java:72` |

남은 위험: 쓰기 · 발송 · 결제 도구의 서버측 승인 기록(보고서 P0-4)은 아직 화면 승인입니다. 가디언 승인 기록 API(sec-d2)를 AI SAM 계획 카드 실행에도 재사용할 것을 권고합니다.

### ② 학습자 AI 튜터 — P1 (LLM01 · 02 · 07 · 10)
위협: 직접 · 간접 인젝션, 지시문 유출, 게스트 비용 폭주.

| 통제 | 상태 | 근거 |
|---|---|---|
| 신뢰 경계 태그(spotlighting) — 글 안 같은 태그 무력화 | 충분 | `aiguard.js:61`, `app.js:390` |
| 지시문 · 학습 기록 유출 응답 차단(`ai.leak_blocked`) | 충분 | `aiguard.js:65`, `app.js:396` |
| 게스트 일 한도 · 로그인 전용 옵션 | 충분 | `app.js:349` |
| 인젝션 감사 기록 | 충분 | `app.js:341` |
| 회귀 시험 | 부분 | `service/test/security.test.js`, `tutor.test.js` → sec-exp `security/redteam/` 10건 이상으로 확장 |

### ③ MCP · 외부 연결 — P0 (MCP01 · ASI04)
위협: 악성 · 변조 MCP 서버, 토큰 대량 유출, 과도한 scope.

| 통제 | 상태 | 근거 |
|---|---|---|
| API 키 HMAC 지문 저장 · 평문 1회 노출 · scope(read/write) | 충분 | `service/server/mcp.js:15,24` / `mcp/web/McpController.java:18-22` |
| 키 발급 권한 | **부분** — 부운영자도 write 키 발급 | `app.js:430` / `McpController.java:19` — SEC-0011 |
| OAuth state 대조(CSRF) | 충분 | `service/server/oauth.js:61,73` / `OAuthController.java` |
| 벤치마크 읽기 SSRF 차단(내부 주소 · DNS 고정) | 충분 | `service/server/bench.js:42-50,56-57` |
| 외부 연결 egress 정책(YouTube · 캘린더 등) | 부분(화면 측) | `didisam/dataroom.js:81-85` |
| 데모 연결 비밀값 | 부분 — 브라우저 저장 | `didisam/conn.js:20-22`, `claude.js:19` — SEC-0009 |
| 외부 MCP 서버 허용 목록 · 도구 핀닝 | 없음 | 보고서 P0-2. 가디언 대책 카드 대상 |

### ④ 테넌트 데이터룸(RLS) — P1 (LLM08 · ASI06)
위협: RLS 누락 · 교차 조회, BYPASSRLS 계정, 벡터 저장소 노출.

| 통제 | 상태 | 근거 |
|---|---|---|
| 기관 표 ENABLE + FORCE RLS, 정책 `tenant_id = current_setting('app.tenant')` | 충분 | `service/server/db.js:64-71,105-113,395-402` |
| 기관 트랜잭션 = `set local role didisam_tenant` + `app.tenant` | 충분 | `db.js:475-486` / `cmm/TenantTx.java:20-22`, `TenantTxMapper.xml:4` |
| pii 스키마 역할 분리(didisam_pii) · AES-256-GCM | 충분 | `db.js:133,210-224`, `pii.js:50,60` / `cmm/PiiTx.java` |
| **마일리지 pii 조회가 맨 연결 · `tx.plain`** | 누락 → 수정 | `mileage/index.js:55-57`, `mileage/mod-pub.js:26` / `MileServiceImpl.java:309,614` — SEC-0003 |
| 저장 시 다른 기관 tid 거부 · tid 강제 | 충분 | `app.js:512-513` |
| 교강사 역할 서버 필터(`teacherView` · `teacherMerge`) | 충분 | `app.js:504,511` |
| 의도된 RLS 제외(작업 대기열 `lms_media_q`) | 문서화됨 | `service/server/lms/sql/a1_media.sql:5` |
| 재발 방지 | 이번 추가 | Semgrep `didisam-rls-missing-tenant-node/java` |

### ⑤ 인증 · 관리자 — P1 (LLM06 · ASI03)
위협: MFA 부재, 관리자 임의 생성, 접속기록 위 · 변조, 프레임워크 인가 우회.

| 통제 | 상태 | 근거 |
|---|---|---|
| scrypt(N=16384) · 더미 해시로 계정 존재 숨김 | 충분 | `app.js:56-57,463` |
| 로그인 속도 제한(IP · 이메일) | 충분 | `app.js:462` |
| 세션: `__Host-` · HttpOnly · SameSite=Strict · Secure · 유휴 만료 | 충분 | `app.js:116,141,150-158` |
| CSRF 헤더(`x-didisam: 1`) | 충분 | `app.js:725` |
| XFF 신뢰 홉 계산 | 충분 | `app.js:144` |
| 운영 필수 비밀값 · Secure 쿠키 강제 | 충분 | `app.js:111` |
| 임시 비밀번호 강제 변경 | 충분 | `app.js:161` |
| owner 전용 경로(staff · audit · tenant/delete) | 충분 | `app.js:485-499,647-650` / `StaffController.java:16-18`, `TenantServiceImpl.java:20,39`(컨트롤러 `TenantController.java:21` owner-checked 주석) |
| 관리자 모듈 IP 허용 목록 | 충분(선택) | `app.js:117,715` |
| 보안 헤더 · CSP | 충분 | `app.js:91-103,681` |
| MFA | **없음** | SEC-0008 |
| 감사 기록 해시 체인 · 보존 잠금 | **없음** | `db.js:55,80` — SEC-0006(sec-d2 security 스키마와 연계) |
| Spring Boot · 내장 Tomcat 버전 | **확인 필요** | `service-egov/pom.xml:13` — SEC-0001 |

### ⑥ 공급망(npm · Maven · 컨테이너 · 공개 스킬) — P0 (LLM03 · ASI04)
| 통제 | 상태 | 근거 |
|---|---|---|
| 의존성 최소화(Node 런타임 의존성 `pg` 1개) · lockfile | 충분 | `service/server/package.json:9`, `package-lock.json` |
| `npm ci` 사용 | 부분 — 설치 스크립트 허용 | `service/Dockerfile:6` — SEC-0005 |
| 기준 이미지 고정 | 없음 — 이동 태그 | `service/Dockerfile:2,22`, `service-egov/Dockerfile:3,16` — SEC-0002 |
| log4j 브리지 제외 | 충분 | `service-egov/pom.xml:60-64` |
| SBOM(CycloneDX) · OSV querybatch | 이번 회차 sec-d1 | `service/security/` |
| Dependabot | 이번 회차 sec-exp | `.github/dependabot.yml` |

### ⑦ 개발 에이전트(Claude Code) · CI — P0 (LLM06 · ASI02 · 03 · 10)
| 통제 | 상태 | 근거 |
|---|---|---|
| GCP 배포 OIDC(Workload Identity, 키 파일 없음) | 충분 | `.github/workflows/deploy-studio.yml:11-13,49,54-56` |
| Actions SHA 고정 | 없음 | `deploy-studio.yml:29-58` — SEC-0010(사람 수정, 가디언 PR 금지 영역) |
| 범위 점검(PR) | 충분 | `.github/workflows/pr-check.yml`, `scripts/check-scope.js` |
| 비밀값 하드코딩 0건 | 충분(이번 스캔) | Semgrep `didisam-hardcoded-secret-literal` 0건 |
| 개발 에이전트의 운영 키 · 운영 DB 쓰기 배제 | 부분(규칙 분산) | 공백 09 — 가디언 스킬(`docs/security/`)로 일원화 |

### ⑧ AI 면접 음성 · 영상 — P1 (LLM02 · 09 · 10, 인공지능기본법 고영향)
이 저장소 밖(별도 면접 서비스)이 본체이므로 코드 근거는 없습니다. 통제 요구: 영상 · 음성 미저장 증적, 점수 서명, 사람 최종 판단 기록, 증류 · 대량 질의 탐지(공백 10). 스튜디오 측 연결은 ③ 통제를 따릅니다.

## 2. 보고서 공백 10 대응표(이번 회차)

| 공백 | 이번 회차 산출 · 담당 | 상태 |
|---|---|---|
| 01 위협 인텔 루프 | sec-d1 수집기 · 영향 판정, 이 문서 · seed.json | 착수 |
| 02 OWASP Agentic · MCP 매핑 | 이 문서 §1 | 완료(초판) |
| 03 공급망 | SEC-0002 · 0005, sec-d1 SBOM, sec-exp dependabot | 진행 |
| 04 인공지능기본법 | ⑧ 요구 정의 | 미착수(Phase 1) |
| 05 접속기록 위 · 변조 | SEC-0006, sec-d2 해시 체인 | 진행 |
| 06 사고 대응 | sec-d2 긴급 차단 3종 · sec-plan 플레이북 | 진행 |
| 07 AI 레드팀 | sec-exp `security/redteam/` | 진행 |
| 08 고객 보안 증빙 | 이 문서를 ISMS-P · KISA 대응표 원천으로 사용 | 미착수 |
| 09 개발 에이전트 규칙 | ⑦, 가디언 스킬 | 진행 |
| 10 증류 · LLMjacking | 사용량 한도 근거(①), sec-d2 ai_usage 연동 | 진행 |

## 3. 사내 Semgrep 규칙(`security/semgrep/didisam.yml`)과 현재 결과

| 규칙 | 대상 | 현재 결과 |
|---|---|---|
| `didisam-rls-missing-tenant-node` · `-java` | RLS 표를 맨 연결 · `tx.plain`으로 조회 | 0건(SEC-0003 수정 후, 수정 전 4건) |
| `didisam-owner-check-missing-node` · `-java` | owner 전용 경로의 owner 검사 누락 | 0건 |
| `didisam-hardcoded-secret-literal` | 키 형태 문자열 | 0건 |
| `didisam-secret-weak-fallback-node` · `-java` | 비밀값 환경변수의 고정 기본값 | 1건(SEC-0007, 운영 기동 차단으로 수용) |
| `didisam-innerhtml-unescaped` | innerHTML 보간 esc 누락 후보 | 413건 기준선(SEC-0012, 2차 재측정 · 1차 473건) |
| `didisam-innerhtml-raw-ai-output` | AI 응답 원문 innerHTML | 0건 |
| `didisam-ai-tools-passthrough` | AI 도구 무필터 전달 | 0건(SEC-0004 수정 후) |

실행: `semgrep --config security/semgrep/didisam.yml service/server service-egov/src didisam` · 규칙 시험: `semgrep --test security/semgrep`(예제 `didisam.js` · `didisam.java`, 10/10 통과).
