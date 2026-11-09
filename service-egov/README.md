# 디디쌤 운영 서버 — 전자정부 표준프레임워크 에디션 (시범 이식 v29.3)

대학 학사 LMS · 공공기관 사업처럼 **전자정부 표준프레임워크 · Java** 적용을 요구하는 RFP(예: 전남대 기술적용계획표 「적용」)에 대응하기 위한 서버 에디션이다.
Node 서버(`service/server`)와 **같은 `/api` 규격 · 같은 PostgreSQL 스키마 · 같은 화면(public/)** 을 쓴다. 화면은 한 줄도 바꾸지 않는다.

| 항목 | 내용 |
|---|---|
| 기준 | 전자정부 표준프레임워크 5.0 (Spring Boot 3.5.6 · Spring 6.2 · JDK 17+) |
| 구조 | `egovframework.didisam.{auth,state,mcp,ai,bench,pii,pub,tenant}.{web,service,service.impl}` — Controller → Service(interface) → ServiceImpl(`EgovAbstractServiceImpl` 상속) → MyBatis Mapper(XML) |
| DB | PostgreSQL + RLS. 기관 범위 트랜잭션 `TenantTx.inTenant` = `set local role didisam_tenant` + `set_config('app.tenant')`. 개인정보 볼트는 `PiiTx.run` — 한 트랜잭션 안에서 `didisam_tenant`(학습 데이터) ↔ `didisam_pii`(pii 스키마만) 역할을 바꿔 쓴다(Node pii.js tx와 같음) |
| 보안 | scrypt(N=16384,r=8,p=1) · 세션 토큰 sha256 · SameSite=Strict HttpOnly 쿠키 · 유휴 연장 · CSRF(x-didisam + 같은 출처) · 보안 헤더 · CSP · 로그인/가입 제한 · 감사 기록 — Node와 바이트 단위 호환 |
| 표준프레임워크 공통 기능 | `EgovAbstractServiceImpl.processException()` → `EgovBizException`(메시지 키 `dd.{상태}.{코드}`, `egovframework/message/message-common.properties`), `messageSource` · `leaveaTrace`(추적 처리), `EgovPropertyService`(`propertiesService`: 세션 · 저장 한도 · 시도 제한), `EgovIdGnrService`(오류 추적 번호), `@EgovMapper` 매퍼 스캔 — 설정은 `cmm/EgovConfigCommon` |
| 화면 | 업무 화면 = 기존 HTML5 · JS(REST `/api`). 서버 렌더링 = JSP(`/egov/main.do` 진입 · 기관 정보, JSTL `c:out` 이스케이프) |
| 패키징 | war — `java -jar` 실행과 외장 WAS(Tomcat 10.1 · JEUS 등 Jakarta EE 10) 배포 모두 지원(`ServletInitializer`) |
| 이식 범위(1단계) | `GET /api/health` `GET /api/config` `POST /api/signup` `POST /api/login` `POST /api/logout` `GET /api/me` `GET|PUT /api/state`(학습자 접근코드 동기화 포함) |
| 이식 범위(2단계, 2026-11-05) | API 키 `GET|POST /api/keys` `POST /api/keys/revoke` · MCP `/mcp`(JSON-RPC: initialize · ping · tools/list · tools/call 읽기 6 · 쓰기 3, 키 HMAC 지문 인증) · AI 게이트웨이 `POST /api/ai/messages`(데이터룸 정책 · 기관 일일 한도 · 개인정보 가림 · 인젝션 감사 · 프롬프트 캐시 · 응답 키 가림) `GET /api/ai/usage` · 벤치마크 `POST /api/site/benchmark`(https만 · 443만 · 계정 정보 금지 · DNS 확인 IP 내부 대역 차단 · 확인한 IP에 고정 연결 · 리다이렉트 3회 재검사 · 10초 · 2MB · HTML만) · 학습자 관리 `GET /api/learners/progress|accounts|pii-log` `POST /api/learners/pii` · 감사 `GET /api/audit` · 기관 파기 `POST /api/tenant/delete` · 학습자 포털 `/api/pub/{tid}/{site|login|me|progress|logout|tutor|otp|signup|guardian|pii|withdraw|verify}`(접근코드 · 간편가입 · 보호자 동의 · 본인확인 · 탈퇴 · AI 튜터 — 지시문 문구 Node와 같음) · 매시간 정리(만료 세션 · 학습자 세션 · 개인정보 보존 기간) |
| 홈페이지 이미지(v34.5) | `POST /api/media`(본문 = 이미지 바이트 · 운영자 · 2MB · 기관 한도 `MEDIA_TENANT_MB`(기본 100) · `MEDIA_MAX_FILES`(기본 2000)) `GET /api/media?limit=` `GET /api/media/{기관}.{해시}`(공개 · immutable · CSP sandbox) `DELETE /api/media/{id}` — `media` 패키지, 형식 판정 · 메타데이터 제거 · SVG 정화는 `DdMedia`(Node `media.js`와 같은 결과 바이트 · 같은 id). 대조: `node test/media.js <node> <java>` |
| 강의 파일(v35) | `POST /api/media/f`({name, size} · 운영자 · 교강사) → `PUT /api/media/f/{id}?part=N`(조각, 기본 8MB `MEDIA_CHUNK_KB`) → `POST /api/media/f/{id}/done`, `GET /api/media/f/{id}`(공개 · Range 206 · Content-Disposition, `?dl=1` 받기) `DELETE /api/media/f/{id}` `GET /api/media?kind=file` — 문서 pdf · pptx · docx · hwp · hwpx(`MEDIA_DOC_MB` 100) · 영상 mp4 · webm(`MEDIA_VIDEO_MB` 1024) · 음성 mp3 · m4a(`MEDIA_AUDIO_MB` 200), 기관 총 `MEDIA_FILE_TENANT_MB`(5120) · `MEDIA_FILE_MAX_FILES`(2000). 확장자 + 시그니처 · ZIP 끝 목록 확인, 매크로 문서 거부는 `DdMediaFile`(Node `mediafile.js`). 바이트는 `media_part`(마이그레이션 17). 대조: `node test/mediafile.js <node> <java>` |
| 공통 도우미(2단계) | `cmm/Js`(JS 값 규칙: 참/거짓 · String() · Number() · === · Object.entries 순서 · JSON.stringify), `cmm/DdAiGuard`(aiguard.js), `cmm/DdPiiCrypto`(AES-256-GCM · HKDF · HMAC 블라인드 인덱스 — Node와 바이트 호환), `cmm/DdAiClient`(Anthropic Messages API), `cmm/PiiTx`, `bench/service/impl/DdBench`(bench.js) |

## 빌드 · 실행

```bash
mvn -q package                     # 기본: Maven Central만으로 빌드(표준프레임워크 RTE 호환 shim 사용 — 공개 API 시그니처는 v5.0.2-Final 소스와 동일하게 맞춤)
mvn -q -Pegov package              # 기관 반입: 실제 표준프레임워크 5.0 RTE(maven.egovframe.go.kr)로 빌드, shim 제외
JDBC_URL=jdbc:postgresql://127.0.0.1:5432/didisam JDBC_USER=didisam PUBLIC_DIR=../service/public java -jar target/didisam-egov.war
```

환경변수는 Node 서버와 같다: `COOKIE_SECURE` `TRUST_PROXY_HOPS` `SESSION_IDLE_H` `SIGNUP` `SIGNUP_CODE` `SESSION_PEPPER` `AI_DAILY_CALLS` `NODE_ENV`.

2단계에서 쓰는 환경변수(이름 · 뜻 모두 Node와 같음 — 두 서버가 같은 DB를 쓰면 값도 같아야 서로의 행을 읽는다):

| 변수 | 뜻 |
|---|---|
| `ANTHROPIC_API_KEY` | 외부 AI 키. `sk-ant-`로 시작할 때만 AI가 켜진다(`/api/config`의 `ai`). 값은 로그 · 응답에 남기지 않는다 |
| `ANTHROPIC_URL` | AI 호출 주소(기본 `https://api.anthropic.com/v1/messages`). 시험에서는 모의 서버로 바꾼다. Node 내장 fetch처럼 시스템 프록시를 쓰지 않는다 |
| `PII_KEY` | 개인정보 볼트 키(32바이트 — hex 64자 또는 base64). 없으면 학습자 간편가입 · 로그인 · 개인정보가 503. `NODE_ENV=production`이면 `SESSION_PEPPER`와 함께 32자 이상 필수(없으면 기동 거부) |
| `PII_DEV_OTP` · `OAUTH_DEV` · `IDV_DEV` | 개발 · 시험 전용(`1`일 때만): 인증번호 · 보호자 토큰을 응답에 포함 / SNS `dev_sub` 허용 / 본인확인 모의 성공. 운영에서는 설정하지 않는다 |

MCP 도구 정의(이름 · 설명 · inputSchema)는 `src/main/resources/egovframework/mcp/tools.json` — Node `mcp.js` TOOLS에서 그대로 뽑은 것이다(바꾸면 양쪽을 같이 바꾼다).
스키마는 Node 서버의 마이그레이션(`service/server/db.js`)이 소유한다 — 같은 DB를 쓰므로 먼저 Node 마이그레이션을 1회 실행한다.

## 검증

```bash
# 두 서버를 같은 환경변수로 띄운다(2단계 대조용: 가짜 AI 키 · 모의 AI 주소 · 시험 플래그)
export COOKIE_SECURE=0 TRUST_PROXY_HOPS=0 PII_KEY=<hex 64자> SESSION_PEPPER=<임의> ANTHROPIC_API_KEY=sk-ant-test-contract-dummy \
       ANTHROPIC_URL=http://127.0.0.1:8099/v1/messages PII_DEV_OTP=1 OAUTH_DEV=1 IDV_DEV=1
node test/contract.js http://127.0.0.1:<node> http://127.0.0.1:<java>   # 같은 DB에 두 서버를 띄우고 규격 · 호환 대조(모의 AI 서버 8099는 테스트가 띄운다)
node test/ui.js http://127.0.0.1:<java>                                  # 기존 스튜디오 화면이 Java 서버에 그대로 붙는지
```

**실제 실행환경 확인(완료, 2026-11-05)**: 대표님 Mac(국내망)에서 `-Pegov` 빌드 → war에 `egovframe-rte-*-5.0.2.jar` 8종 포함 · shim 0건 확인. 첫 기동에서 RTE가 끌어오는 `log4j-slf4j2-impl`이 Spring Boot 로깅(`log4j-to-slf4j`)과 충돌해 실패 → pom에서 제외. 제외를 반영한 실제 RTE war로 대조 372항목 · UI 확인 모두 통과.
- shim은 `src/shim/java`(기본 빌드만 build-helper로 추가). 컴파일러 excludes 방식은 javac가 sourcepath에서 shim을 암묵 컴파일해 실제 빌드에 섞이므로 쓰지 않는다.
- 클라우드 작업 환경 · 연결 VM에서는 maven.egovframe.go.kr가 「Request Blocked」(400) — 국내망 PC에서 `scripts/verify-egov.sh` 실행.

2026-11-05 v29.3 2단계 결과(기본 빌드 · shim 사용): 대조 2,788항목 통과 · 0 실패(1단계 항목 포함). 서버 실행 직후 대조 → UI 확인 순서로 실행.
- 2단계 대조 내용: 상태코드 · 응답 형태 · 오류 코드/문구 · 보안 헤더 · 쿠키 속성을 모든 단계에서 비교, MCP 도구 결과(structuredContent와 `JSON.stringify(…, null, 1)` 텍스트) · 학습자 응답(mine · lp · 계정) · AI 응답(가림 · 키 가림) · 감사 기록 순서 · 개인정보 열람 기록을 값까지 비교, 모의 AI 서버가 받은 요청 본문(대화 · 모델 · max_tokens · cache_control)을 값까지, 튜터 지시문(system)은 문자열 그대로 Node와 비교.
- 서버 간 호환: Node가 암호화한 이메일 · 휴대폰을 Java가 복호화 · 반대 방향도 확인, Java가 발급한 인증번호로 Node에서 가입 → Java에서 그 계정으로 로그인(블라인드 인덱스 · 인증번호 해시 · scrypt), 학습자 세션 쿠키 교차 사용, Node 발급 API 키로 Java MCP 호출(같은 결과 · 호출 수 반영).
- 벤치마크 SSRF 판정 · HTML 추출은 별도로 Node `bench.js`와 직접 대조(HTML 4종 · 주소 48종 — IPv4 숫자 표기(0x · 8진 · 정수) · IPv4 대응 IPv6 · 문서용 · 6to4 · NAT64 · 링크로컬 · 계정 정보 · 포트 · IDN · 점 세그먼트 · 퍼센트 인코딩) — 모두 같은 결과. 실제 외부 사이트 읽기(TLS 고정 연결)는 이 작업 환경에서 외부 직접 연결이 막혀 확인하지 못했다(대조는 오류 경로까지).
- 개인정보 보존 기간 정리(만료 보호자 동의 · 인증번호): 만료 행을 넣고 Java만 띄워 정리 결과(탈퇴 처리 · 신원 삭제 · 열람 기록 system/guardian_expired) 확인.
- **2단계 실제 RTE 확인(완료, 2026-11-06)**: 대표님 Mac에서 `-Pegov` 빌드(RTE 5.0.2 8종 · shim 0건 · pom의 log4j-slf4j2-impl 제외만으로 기동 성공) → 그 war로 대조 2,788항목 · UI 확인 모두 통과.

2단계 이식에서 Node와 일부러 다르게 둔 점(보안상 더 엄격하거나 JS 오류 경로):
- 벤치마크: `::a.b.c.d`(IPv4 호환 IPv6, 폐기 형식)도 내부 IPv4로 판정한다(Node는 통과). DNS 결과가 여러 개일 때 첫 주소 선택은 OS/JVM 순서를 따른다.
- 기관 상태 문서가 비정상 형태(배열 자리에 문자열 · null 요소 등)라 Node가 TypeError로 500을 내는 경우, Java는 빈 값으로 보고 계속 처리할 수 있다.
- TextDecoder 문자셋 별칭은 자주 쓰는 것(euc-kr · ks_c_5601-1987 · iso-8859-1 · shift_jis 등)만 WHATWG 규칙에 맞췄다.

2026-11-05 v29.2 결과(기본 빌드): 대조 372항목 통과 · 0 실패(JSP 진입 화면 · 이스케이프 · CSP 포함), UI 확인 통과.

2026-11-05 v29.1 결과: 대조 369항목 통과 · 0 실패(상태코드 · 응답 형태 · 오류 문구 · 보안 헤더 · 쿠키 속성 · CSP 일치, Node↔Java 상호 로그인 · 세션 · 상태 · 낙관적 잠금), UI 확인 통과(가입 → 대학 학사 LMS 구성 → 저장 → 새로고침 복원, 화면 오류 0).
