# 디디쌤 운영 서버 — 전자정부 표준프레임워크 에디션 (시범 이식 v29.3)

대학 학사 LMS · 공공기관 사업처럼 **전자정부 표준프레임워크 · Java** 적용을 요구하는 RFP(예: 전남대 기술적용계획표 「적용」)에 대응하기 위한 서버 에디션이다.
Node 서버(`service/server`)와 **같은 `/api` 규격 · 같은 PostgreSQL 스키마 · 같은 화면(public/)** 을 쓴다. 화면은 한 줄도 바꾸지 않는다.

| 항목 | 내용 |
|---|---|
| 기준 | 전자정부 표준프레임워크 5.0 (Spring Boot 3.5.6 · Spring 6.2 · JDK 17+) |
| 구조 | `egovframework.didisam.{auth,state}.{web,service,service.impl}` — Controller → Service(interface) → ServiceImpl(`EgovAbstractServiceImpl` 상속) → MyBatis Mapper(XML) |
| DB | PostgreSQL + RLS. 기관 범위 트랜잭션 `TenantTx.inTenant` = `set local role didisam_tenant` + `set_config('app.tenant')` |
| 보안 | scrypt(N=16384,r=8,p=1) · 세션 토큰 sha256 · SameSite=Strict HttpOnly 쿠키 · 유휴 연장 · CSRF(x-didisam + 같은 출처) · 보안 헤더 · CSP · 로그인/가입 제한 · 감사 기록 — Node와 바이트 단위 호환 |
| 표준프레임워크 공통 기능 | `EgovAbstractServiceImpl.processException()` → `EgovBizException`(메시지 키 `dd.{상태}.{코드}`, `egovframework/message/message-common.properties`), `messageSource` · `leaveaTrace`(추적 처리), `EgovPropertyService`(`propertiesService`: 세션 · 저장 한도 · 시도 제한), `EgovIdGnrService`(오류 추적 번호), `@EgovMapper` 매퍼 스캔 — 설정은 `cmm/EgovConfigCommon` |
| 화면 | 업무 화면 = 기존 HTML5 · JS(REST `/api`). 서버 렌더링 = JSP(`/egov/main.do` 진입 · 기관 정보, JSTL `c:out` 이스케이프) |
| 패키징 | war — `java -jar` 실행과 외장 WAS(Tomcat 10.1 · JEUS 등 Jakarta EE 10) 배포 모두 지원(`ServletInitializer`) |
| 이식 범위(1단계) | `GET /api/health` `GET /api/config` `POST /api/signup` `POST /api/login` `POST /api/logout` `GET /api/me` `GET|PUT /api/state`(학습자 접근코드 동기화 포함) |
| 2단계(미이식) | AI 게이트웨이(`/api/ai/*`), 학습자 포털(`/api/pub/*`), PII 볼트, MCP·API 키, 학습 진도(`/api/learners/*`), 기관 파기 |

## 빌드 · 실행

```bash
mvn -q package                     # 기본: Maven Central만으로 빌드(표준프레임워크 RTE 호환 shim 사용 — 공개 API 시그니처는 v5.0.2-Final 소스와 동일하게 맞춤)
mvn -q -Pegov package              # 기관 반입: 실제 표준프레임워크 5.0 RTE(maven.egovframe.go.kr)로 빌드, shim 제외
JDBC_URL=jdbc:postgresql://127.0.0.1:5432/didisam JDBC_USER=didisam PUBLIC_DIR=../service/public java -jar target/didisam-egov.war
```

환경변수는 Node 서버와 같다: `COOKIE_SECURE` `TRUST_PROXY_HOPS` `SESSION_IDLE_H` `SIGNUP` `SIGNUP_CODE` `SESSION_PEPPER` `AI_DAILY_CALLS` `NODE_ENV`.
스키마는 Node 서버의 마이그레이션(`service/server/db.js`)이 소유한다 — 같은 DB를 쓰므로 먼저 Node 마이그레이션을 1회 실행한다.

## 검증

```bash
node test/contract.js http://127.0.0.1:<node> http://127.0.0.1:<java>   # 같은 DB에 두 서버를 띄우고 규격 · 호환 대조
node test/ui.js http://127.0.0.1:<java>                                  # 기존 스튜디오 화면이 Java 서버에 그대로 붙는지
```

**실제 실행환경 확인(완료, 2026-11-05)**: 대표님 Mac(국내망)에서 `-Pegov` 빌드 → war에 `egovframe-rte-*-5.0.2.jar` 8종 포함 · shim 0건 확인. 첫 기동에서 RTE가 끌어오는 `log4j-slf4j2-impl`이 Spring Boot 로깅(`log4j-to-slf4j`)과 충돌해 실패 → pom에서 제외. 제외를 반영한 실제 RTE war로 대조 372항목 · UI 확인 모두 통과.
- shim은 `src/shim/java`(기본 빌드만 build-helper로 추가). 컴파일러 excludes 방식은 javac가 sourcepath에서 shim을 암묵 컴파일해 실제 빌드에 섞이므로 쓰지 않는다.
- 클라우드 작업 환경 · 연결 VM에서는 maven.egovframe.go.kr가 「Request Blocked」(400) — 국내망 PC에서 `scripts/verify-egov.sh` 실행.

2026-11-05 v29.2 결과(기본 빌드): 대조 372항목 통과 · 0 실패(JSP 진입 화면 · 이스케이프 · CSP 포함), UI 확인 통과.

2026-11-05 v29.1 결과: 대조 369항목 통과 · 0 실패(상태코드 · 응답 형태 · 오류 문구 · 보안 헤더 · 쿠키 속성 · CSP 일치, Node↔Java 상호 로그인 · 세션 · 상태 · 낙관적 잠금), UI 확인 통과(가입 → 대학 학사 LMS 구성 → 저장 → 새로고침 복원, 화면 오류 0).
