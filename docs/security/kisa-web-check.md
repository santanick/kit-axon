# KISA 웹 취약점 21항목(2026판 코드 체계) — 디디쌤 Ver2 자가 점검표

- 점검일: 2026-11-25 · 점검자: 보안전문가(디디쌤 가디언 4차) · 대상: Node `service/server`(줄 번호는 `core/sec` 92bad35 + 이 브랜치 `core/sec4-exp`), Java `service-egov`는 같은 `/api` 계약이라 필요한 곳만 대조
- 기준: KISA 「주요정보통신기반시설 기술적 취약점 분석 · 평가 방법 상세가이드」 웹 서비스 2026판 21항목 코드(CI · SI · DI · EP · IL · XS · CF · SF · BF · IA · IN · PR · PV · FU · FD · IS · SN · CC · AE · AU · WM). 직전 판(2024 · 28항목 BO~CC)은 이 문서 이전 판(2026-11-24)에 있었고, 구판의 OC · SS · XI · LI → **CI(코드 인젝션)**, SC · SE · SF(세션 고정) → **IS(불충분한 세션 관리)**, PT · PL → **DI · FD**, CS → **FU**로 합쳤습니다. 2026판에서 새로 보는 **SF(SSRF) · EP(에러 페이지) · WM(불필요한 Method)**을 추가로 점검했습니다. 항목 이름 · 세부 판단 기준은 인증 크로스체크(2026-11-25) 보고서 3절이 인용한 2026판 요지 기준이며, 원문 쪽 번호는 원문 입수 후 재대조합니다.
- 방법: 코드 · 설정 정적 점검 + `service/test/ssrf.test.js`(외부 요청 지점 전수 고정). 동적 점검(ZAP baseline)은 `security/zap/report-2026-11-24.md`.
- 결과 표기: 양호 · 부분 · 취약 · 해당 없음. 근거 없는 양호를 쓰지 않습니다. 부분 · 취약은 원장(`security/findings/seed.json`)에 올립니다.
- 인증 기준 통제 번호(#1~27)는 `security/checklist.json`의 `cert` 표와 같습니다.

## 요약
| 결과 | 건수 | 항목 |
|---|---|---|
| 양호 | 15 | CI · SI · DI · XS · CF · SF · BF · PR · PV · FU · FD · CC · AE · WM · IL |
| 부분 | 5 | EP(#20, SEC-0037) · IN(#7, SEC-0024) · IS(#2 · #3 · #4 · #8, SEC-0019~0021 · 0025) · SN(#13, SEC-0030) · AU(#9, SEC-0026) |
| 취약 | 1 | IA(#1 관리자 추가 인증 없음, SEC-0018) |

- **IA · IS는 개발자 1(d1, `core/sec4-d1` 2단계 인증) · 개발자 2(d2, `core/sec4-d2` 세션)가 이번 회차에 보완 중 → 통합 병합 후 「보완 반영」으로 다시 판정합니다.** 병합 전까지는 위 판정(취약 · 부분)이 현재 상태입니다.
- 이번 회차 직접 수정(SF): 학내 LLM 주소에 메타데이터 · 링크 로컬 · 계정 정보 차단 추가(Node `service/server/ssrf.js` · Java `cmm/DdSsrf.java`), 서버 외부 요청 전부 리다이렉트 미추종(Node `redirect: 'manual'|'error'`, Java HttpClient 기본 NEVER).

## 항목별 결과
| 코드 | 항목 | 결과 | 근거(파일:줄) | 비고 · 조치 |
|---|---|---|---|---|
| CI | 코드 인젝션(OS 명령 · SSI · XPath · LDAP 포함) | 양호 | `eval` · `new Function` 0건(grep). 명령 실행은 미디어 작업 1곳 `service/server/lms/media/worker.js:19` `spawn(cmd, args)`(셸 없음, 인자 배열), Java `lms/v/service/impl/LmsVWorker.java` `ProcessBuilder(List)` | SSI · XPath · LDAP 미사용(Node · Java grep 0건) |
| SI | SQL 인젝션 | 양호 | 전 쿼리 `$n` 바인딩. 동적 조각은 고정값만(`fac/mod-admin.js` 자리표시 · `key` 3개 고정). Java `PiiMapper.xml`의 `${f}`는 `PiiServiceImpl` 허용목록(name · phone · email) 통과 후만 | Semgrep 규칙 `security/semgrep/` |
| DI | 디렉터리 인덱싱(경로 추적 포함) | 양호 | `service/server/app.js:718-719`(폴더 요청 → `index.html`, `path.resolve` 후 공개 폴더 밖이면 403) | 목록 출력 코드 없음 |
| EP | 에러 페이지 적용 미흡 | 부분 | 서버: 500은 고정 문구만, 스택 미노출(`app.js:778-781`), 없는 API 404 `not_found`(`app.js:761`) | **화면 일부가 서버 오류 원문(`e.message`)을 그대로 표시 → #20 SEC-0037**, 개발자 4(d4) `didisam/errmsg.js`로 보완 중 |
| IL | 정보 누출 | 양호 | 서버 버전 헤더 없음, 오류 응답 고정 문구(`app.js:781`), 계정 존재 숨김 더미 해시 | 잠금 응답 계정 열거(SEC-0016, P3)는 원장에서 별도 관리 |
| XS | 크로스사이트 스크립팅 | 양호 | CSP `script-src 'self'`(`app.js:725`, `unsafe-inline` 없음), 출력 이스케이프(`esc` · `E` · `nl`) | innerHTML 후보 기준선(SEC-0012, 확정 0건) |
| CF | 크로스사이트 요청 변조 | 양호 | `SameSite=Strict` 쿠키(`app.js:148,242`) + 변경 요청 `x-didisam: 1`(`app.js:769`) + Origin 확인(`app.js:770`) | |
| SF | 서버 측 요청 변조(SSRF) | 양호(이번 회차 보완) | 아래 「SF 전수 목록」. 기관 입력 주소를 부르는 곳은 2곳(벤치마크 · 학내 LLM)이고 둘 다 내부 · 메타데이터 차단. `service/test/ssrf.test.js` 5건 통과 | 새 외부 요청 지점이 생기면 시험이 실패하도록 고정 |
| BF | 약한 비밀번호 정책 | 양호 | `service/server/pwrule.js:2-3`(2종 10자 · 3종 8자), scrypt 저장 | 고시에 구성 기준 없음(안내서 141쪽). 유출 비밀번호 목록 차단은 선택(#23) |
| IA | 불충분한 인증 | **취약 → 보완 반영 예정** | 운영자 로그인이 ID · 비밀번호 1단계(`app.js` `POST /api/login`), 새 기기 알림 메일만(`devices.js`) | 고시 제6조② 추가 인증수단 의무(#1, SEC-0018 P0). **d1이 이메일 인증번호 6자리 기본 + 인증 앱(TOTP) 2단계 구현 중** — 병합 후 「양호」 재판정 |
| IN | 불충분한 인가 | 부분 | FORCE RLS + `app.tenant`(`db.js`, `cmm/TenantTx.java`), owner 전용 경로, MCP 쓰기 키 owner 전용(SEC-0011 fixed) | **분기 접근권한 검토 기록 없음 → #7 SEC-0024**, d3 `GET/POST /api/access-review` 진행 중 |
| PR | 취약한 비밀번호 복구 | 양호 | 자가 재설정 없음, 정운영자 임시 비밀번호(CSPRNG) → 첫 로그인 강제 변경, 변경 시 다른 세션 폐기 | 메일 재설정 기능 추가 시 재점검 |
| PV | 프로세스 검증 누락 | 양호 | 결제 금액 서버 대조(`ledger/mod-pub.js` amount_mismatch), 환불 상태 전이 1회, 임시 비밀번호 상태에서 다른 API 차단 | |
| FU | 파일 업로드(악성 콘텐츠 포함) | 양호 | 확장자 · MIME 허용목록 · 용량 · 이름 정리(`mediafile.js`), 시그니처 확인 · SVG 정화 + CSP sandbox(`media.js`) | |
| FD | 파일 다운로드(위치 공개 포함) | 양호 | ID 정규식 + 자기 기관 확인, `content-disposition`(`mediafile.js`), 이미지에는 `didisam/`만 복사(`service/Dockerfile`) | 개인정보 CSV 통제는 #14(d3) |
| IS | 불충분한 세션 관리 | **부분 → 보완 반영 예정** | 토큰 `randomBytes(32)` · SHA-256 저장(`app.js:154`), 로그인마다 새 토큰. 그러나 유휴 기본 12시간 · 하한 1시간(`app.js:118`), 연장 결함(`app.js:162-163`), 운영자 쿠키 `Max-Age` 14일(`app.js:148`), 동시 세션 경고 없음, 학번 로그인 유지 끔 무시 30일(`app.js:317-321`) | #2 · #3 · #4 · #8(SEC-0019 · 0020 · 0021 · 0025). **d2가 분 단위 60분(기관 10~60분) · 세션 쿠키 · 동시 접속 알림 · 학습자 12시간 구현 중** — 병합 후 재판정 |
| SN | 데이터 평문 전송 | 부분 | HTTPS + HSTS(`app.js:143,727`), 쿠키 `Secure` | **DB 연결 서버 인증서 미검증(`db.js:9` `rejectUnauthorized:false`) → #13 SEC-0030**, d3 `DB_SSL_CA` 진행 중 · 사설 IP는 대표님 콘솔 조치 |
| CC | 쿠키 변조 | 양호 | 쿠키에는 임의 토큰만(권한 · 기관 정보 없음), `HttpOnly` · `SameSite=Strict` · `Secure` | |
| AE | 관리자 페이지 노출 | 양호 | 관리 API 로그인 · 역할 확인, 보안 API owner 전용, `ADMIN_IPS` 허용목록 선택(`app.js:120`) | 해외 IP 운영자 로그인 차단 선택은 #15(d3 `org.sec.krOnly`) |
| AU | 자동화 공격 | 부분 | 운영자: IP 30회 · 이메일 8회/10분 + DB(audit) 기준 15분 5회 잠금(`app.js:483-484`) | **학습자 일부 경로가 인스턴스 메모리 기준(`app.js:312`) → #9 SEC-0026**, d2가 DB 기준 통일 중 |
| WM | 불필요한 Method 허용 | 양호 | 정적 경로 GET · HEAD 외 405(`app.js:776`), `/api`는 메서드+경로 키로만 라우팅(`app.js:766`, 없으면 404), 변경 메서드는 CSRF 헤더 필수. Java는 내장 Tomcat 기본(TRACE 차단) | |

## SF 전수 목록(서버가 외부로 나가는 요청)
| 지점 | Node | Java | 주소 출처 | 차단 · 판정 |
|---|---|---|---|---|
| 홈페이지 벤치마크 `POST /api/site/benchmark` | `service/server/bench.js:14-60`(`isPrivate` · `checkUrl` · DNS 확인 IP 고정 연결 · 리다이렉트 3번 매번 재검사) | `bench/service/impl/DdBench.java:42,201,210,369` | 운영자 입력 | https · 443만, 사설 · 루프백 · 링크로컬 · 169.254.169.254 · NAT64 · 6to4 · 정수 표기(`https://2130706433/`) 차단 — 양호 |
| 학내 LLM(openai_compat) | `service/server/lms/mod-o.js` `P.ready` 뒤 `checkSelfUrl` + `redirect: 'manual'` | `LmsOServiceImpl.java` `llm()` 허용 목록 뒤 `DdSsrf.selfUrlOk` | 기관 입력(서버 `LLM_SELFHOST_HOSTS` 허용 호스트만) | **보완**: 허용 목록에 있어도 메타데이터(169.254.169.254 · 169.254.170.2 · 100.100.100.200 · fd00:ec2::254) · 링크 로컬 · 미지정 · 계정 정보 주소는 503 `provider_blocked`. 학내 서버는 사설 대역이 정상이라 사설 대역은 허용 |
| Anthropic API | `aigw.js:98`, `lms/mod-o.js`(anthropic) | `cmm/DdAiClient.java:32` | 환경변수 `ANTHROPIC_URL` | 고정 주소 — 양호(리다이렉트 미추종) |
| OAuth(구글 · 카카오) | `oauth.js:12-13,51,55` | `auth/service/impl/OAuthServiceImpl.java:100,103` | 고정 주소(시험만 `OAUTH_MOCK`) | 양호 |
| 메일 웹훅 | `mail.js:17` | `cmm/DdMail.java:46` | 환경변수 `MAIL_WEBHOOK_URL` | 양호(`redirect: 'error'`) |
| 토스 결제 | `fac/pay.js:10` | `FacServiceImpl.java:400,751`, `LedgerServiceImpl.java:112`, `AiServiceImpl.java:188` | 고정 주소 · `TOSS_URL` | 양호 |
| MCP | `mcp.js` — **수신 전용**(외부 AI가 디디쌤을 부름), 서버가 외부 MCP를 부르지 않음 | 같음 | — | 해당 없음 |
| OG 미리보기 | `ogmeta.js` — 디디쌤 페이지에 메타 태그를 **넣기만** 함, 외부 주소를 읽지 않음 | 같음 | — | 해당 없음 |
| AI 웹 검색 | Anthropic 서버 측 도구(디디쌤 서버가 직접 요청하지 않음) | 같음 | — | 해당 없음 |
| 기관 웹훅 · 임베딩 엔드포인트 | 없음(임베딩 `endpoint` 설정은 「연동 후 동작」으로 호출 코드 없음 — `lms/mod-o.js:4`) | 같음 | — | 호출 코드 추가 시 `ssrf.js` 사용 + 시험 목록 갱신 |

운영 권고: Cloud Run 이그레스를 서버리스 VPC 커넥터 + 방화벽으로 제한하면 코드 검사와 이중 방어가 됩니다(대표님 콘솔 조치, 선택).

## 다음 점검
- 통합 병합 후: IA · IS · AU · IN · SN · EP를 다시 판정하고 원장 상태를 갱신합니다(`node security/score.js`).
- 분기마다 이 표를 다시 쓰고 ZAP baseline을 같은 항목으로 기록합니다.
- 2026판 원문(또는 KISA 2026. 11. 개정 안내서)을 입수하면 항목 이름 · 쪽 번호를 재대조합니다.
