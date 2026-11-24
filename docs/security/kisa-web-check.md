# KISA 주요정보통신기반시설 웹 취약점 항목 — 디디쌤 Ver2 자가 점검표

- 점검일: 2026-11-24 · 점검자: 수석 보안 컨설턴트(디디쌤 가디언 2차) · 대상: Node `service/server` 기준(줄 번호는 브랜치 `core/sec2-con`), Java `service-egov`는 같은 `/api` 계약이라 필요한 곳만 대조
- 기준: 「주요정보통신기반시설 기술적 취약점 분석 · 평가 방법 상세가이드」 웹 서비스 항목(코드 BO~CC 28항목 체계). 보고서가 인용한 2025-12 개정판의 항목 번호 · 신설 항목은 **원문을 대조하지 못했으므로** 개정 원문을 받는 대로 이 표의 번호를 맞춥니다.
- 방법: 코드 · 설정을 읽어 확인한 **정적 점검**입니다. 동적 점검(ZAP baseline 등)은 이번 회차에 실행하지 않았으며, 보안전문가 `security/zap/` 설정이 병합되면 같은 항목으로 다시 기록합니다.
- 결과 표기: 양호 · 부분 · 취약 · 해당 없음. 근거 없는 양호를 쓰지 않습니다. 부분 · 취약은 발견 원장(`security/findings/seed.json`)에 올립니다.

## 요약
| 결과 | 건수 | 항목 |
|---|---|---|
| 양호 | 18 | OC · SI · DI · CS · XS · BF · PR · CF · SE · SC · SF · PV · FU · FD · AE · PT · PL · CC |
| 부분 | 5 | IL(SEC-0016) · IA(SEC-0008) · IN(SEC-0011) · AU(SEC-0016 · SEC-0017) · SN(IAC-04) |
| 취약 | 0 | — |
| 해당 없음 | 5 | BO · FS · LI · SS · XI |

이번 회차 직접 수정: XSS 방어 보강 2건(`didisam/ltube.js` 지역 `nl` 이스케이프, `didisam/build.js` 루브릭 배점 숫자 강제 — SEC-0012 노트). 원장 추가: SEC-0016 · SEC-0017(P3).

## 항목별 결과
| 코드 | 항목 | 결과 | 근거(파일:줄) | 비고 · 조치 |
|---|---|---|---|---|
| BO | 버퍼 오버플로우 | 해당 없음 | — | Node · Java 관리형 런타임, 네이티브 확장 직접 작성 없음. 요청 본문 상한 413(`service/server/app.js:87`) |
| FS | 포맷 스트링 | 해당 없음 | — | 사용자 값을 서식 문자열로 쓰는 C 계열 함수 없음 |
| LI | LDAP 인젝션 | 해당 없음 | — | LDAP 연동 없음 |
| OC | 운영체제 명령 실행 | 양호 | Node 서버에 `child_process` 사용 없음(grep 0건), Java `lms/v/service/impl/LmsVWorker.java:66` `ProcessBuilder(List)` | Java 미디어 작업은 셸을 거치지 않는 인자 목록 실행 |
| SI | SQL 인젝션 | 양호 | 전 쿼리 `$n` 바인딩. 동적 조각은 고정값만: `fac/mod-admin.js:89-91`(`$${P.length}` 자리표시), `:171-172`(`key` 3개 고정), `app.js:237`(고정 interval). Java `PiiMapper.xml:93,101`의 `${f}`는 `PiiServiceImpl.java:313,385` 허용목록(name · phone · email) 통과 후만, `lms_e.xml:5` · `lms_f.xml:5` `${fn}`은 고정 라우트 표 | 사내 Semgrep `didisam-rls-missing-tenant-*`가 RLS 우회 조회를 막음 |
| SS | SSI 인젝션 | 해당 없음 | — | SSI 미사용(정적 파일은 Node가 직접 전송) |
| XI | XPath 인젝션 | 해당 없음 | — | XPath · XML 파서 사용 없음(Node · Java grep 0건, XXE 경로도 없음) |
| DI | 디렉터리 인덱싱 | 양호 | `app.js:686-690` | 폴더 요청은 `index.html`로만 응답, 없으면 404 — 목록 출력 코드 없음 |
| IL | 정보 누출 | 부분 | 오류: `app.js:748-751`(500은 고정 문구, 스택 미노출). 계정 열거: `app.js:471-476` | 서버 버전 헤더 없음. **잠금 응답(429 locked)이 있는 계정에만 나와 계정 존재가 드러남 → SEC-0016(P3)** |
| CS | 악성 콘텐츠 | 양호 | `media.js:3-8,92-94`(SVG 정화 + CSP sandbox), `mediafile.js:16-22,92,198`(확장자 허용목록 · attachment · 파일 CSP) | 업로드 파일은 스크립트로 실행되지 않게 전송 |
| XS | 크로스사이트 스크립팅 | 양호 | CSP `script-src 'self'`(+ 고정 CDN, `unsafe-inline` 없음) `app.js:104,107`, 출력 이스케이프(`esc` · `E` · `nl`) | Semgrep 후보 413건 기준선(SEC-0012, 확정 0건). 사용자 입력이 닿는 상위 경로 점검 결과는 seed.json SEC-0012 note |
| BF | 약한 문자열 강도 | 양호 | `app.js:70`(10~200자 · 영문 · 숫자), 임시 비밀번호 `app.js:500`(CSPRNG 12바이트) | 학습자 접근코드는 스튜디오 생성 6자 · 32문자 CSPRNG(`didisam/kit.js:227`), 동기화 API 최소 4자는 SEC-0017 |
| IA | 불충분한 인증 | 부분 | scrypt `app.js:58-62`, 계정 존재 숨김용 더미 해시 `app.js:67,474` | **운영자 MFA 없음 → SEC-0008(P1)**, 개발자 1 진행 중 |
| PR | 취약한 비밀번호 복구 | 양호 | 자가 재설정 경로 없음. 정운영자가 임시 비밀번호 발급(`app.js:500`) → 첫 로그인 강제 변경(`app.js:161-166`), 변경 시 다른 세션 폐기(`app.js:492`) | 메일 기반 재설정 기능을 추가하면 이 항목을 다시 점검 |
| CF | 크로스사이트 요청 변조 | 양호 | 세션 쿠키 `SameSite=Strict`(`app.js:146,238,311`) + 변경 요청 `x-didisam: 1` 헤더 확인(`app.js:737`) | |
| SE | 세션 예측 | 양호 | `crypto.randomBytes(32)`(`app.js:152,235,307`), 서버에는 SHA-256만 저장 | |
| IN | 불충분한 인가 | 부분 | FORCE RLS + `app.tenant`(`db.js`, `cmm/TenantTx.java`), owner 전용 경로(`app.js:485-499`), 교강사 서버 필터 | **부운영자가 MCP 쓰기 키 발급 가능 → SEC-0011(P2)**, 개발자 1 진행 중 |
| SC | 불충분한 세션 만료 | 양호 | 운영자 유휴 만료 기본 12시간 · 최대 14일(`app.js:41,116,153-159`), 학습자 유휴 만료(`app.js:204`) · 공용 PC 12시간(`app.js:236`) | |
| SF | 세션 고정 | 양호 | 로그인 때마다 새 토큰 발급(`app.js:152,307`), 로그인 전 세션 식별자를 받지 않음, 로그아웃 시 서버 행 삭제(`app.js:337,484`) | |
| AU | 자동화 공격 | 부분 | 운영자: IP 30회 · 이메일 8회/10분 + audit 기준 5회 15분 잠금(`app.js:468-474`) | **학습자 로그인은 인스턴스 메모리 제한만(`app.js:303`) → SEC-0017(P3)**, 잠금 응답 계정 열거 SEC-0016 |
| PV | 프로세스 검증 누락 | 양호 | 결제 금액 서버 대조(`ledger/mod-pub.js:19` amount_mismatch), 환불 금액이 계산값과 다르면 사유 필수 · 상태 전이 1회(`ledger/mod-admin.js:44,50`), 임시 비밀번호 상태에서 다른 API 차단(`app.js:161-166`) | |
| FU | 파일 업로드 | 양호 | 확장자 · MIME 허용목록(`mediafile.js:16-22,50-53`), 용량 · 기관 할당(`mediafile.js:40-44`), 파일 이름 정리(`mediafile.js:55-60`), 이미지 시그니처 확인 · SVG 정화(`media.js:29-30,92-94`) | |
| FD | 파일 다운로드 | 양호 | ID 정규식 + 자기 기관 확인(`mediafile.js:114,189`), `content-disposition`(`mediafile.js:92,198`) | 경로를 사용자 값으로 만들지 않음 |
| AE | 관리자 페이지 노출 | 양호 | 관리 API는 로그인 · 역할 확인(`needOwner` 등), 보안 API는 owner 전용, 관리자 모듈 IP 허용목록(`app.js:118,727`, `ADMIN_IPS`) | SaaS 특성상 스튜디오 화면은 공개 주소. 공공 · 대학 납품 시 `ADMIN_IPS` 설정 권고 |
| PT | 경로 추적 | 양호 | `app.js:687-688`(`path.resolve` 후 공개 폴더 밖이면 403) | |
| PL | 위치 공개 | 양호 | 공개 폴더는 `didisam/`만 이미지에 복사(`service/Dockerfile:8,29`), 백업 · 임시 파일 없음(확인), 모듈별 정적 허용(`modules.js:19-22`) | |
| SN | 데이터 평문 전송 | 부분 | HTTPS(Cloud Run) + HSTS(`app.js:141,695`), 쿠키 `Secure`(`app.js:146`) | **Cloud SQL SSL 강제 · 사설 IP 미지정 → IAC-04(P2)**, 개발자 2 진행 중(운영 적용은 대표님) |
| CC | 쿠키 변조 | 양호 | 쿠키에는 임의 토큰만(권한 · 기관 정보 없음), `__Host-` · `HttpOnly` · `SameSite=Strict`(`app.js:54,106,146`) | |

## 다음 점검
- 동적 점검: ZAP baseline(보안전문가 `security/zap/`)을 데모 · 스테이징에 돌려 XS · CF · IL · SN을 실제 응답으로 재확인합니다.
- 분기 점검(스킬 6절)마다 이 표를 다시 쓰고, 결과 변화는 `node security/score.js`로 점수에 반영합니다.
- 2025-12 개정판 원문을 받으면 항목 번호 · 신설 항목(예: API · 클라우드 관련)을 대조해 추가합니다.
