# 디디쌤 스튜디오 — 운영 서비스(v9)

데모(GitHub Pages, 브라우저 저장)와 같은 화면 코드를 **실서버**로 제공합니다. 주소: `https://studio.aisam.com`

## 구성
| 층 | 내용 |
|---|---|
| 화면 | `didisam/` 정적 파일 + `live.js`(저장 · 로그인 · AI를 서버 API로) — `build-public.js`가 운영용 index.html 생성 |
| 서버 | `server/` Node.js 22, 의존성 `pg` 하나. 정적 화면 + `/api`를 한 컨테이너에서 제공(같은 출처) |
| DB | Cloud SQL PostgreSQL 16(서울). 기관 데이터 테이블은 RLS + `SET LOCAL ROLE didisam_tenant`로 격리 |
| 비밀값 | Secret Manager: `didisam-db-url` · `didisam-anthropic-key` · `didisam-signup-code` |
| 배포 | GitHub Actions(`deploy-studio`) → Artifact Registry → Cloud Run(부하분산기 경유만 허용) |
| 도메인 | 외부 HTTPS 부하분산기 + 관리형 인증서(Cloud Run 도메인 매핑은 서울 미지원) |

## API
`GET /api/health · /api/config · /api/me · /api/state · /api/ai/usage · /api/audit`
`POST /api/signup · /api/login · /api/logout · /api/ai/messages · /api/tenant/delete` · `PUT /api/state`
- 변경 요청은 `x-didisam: 1` 헤더 + SameSite=Strict 세션 쿠키(HttpOnly · `__Host-`) + 같은 출처 확인
- 상태 저장은 `rev` 낙관적 잠금(다른 창이 먼저 저장하면 409 → 화면이 최신본을 다시 불러옴), 기관당 최대 8MB
- AI는 서버 키로만 호출, 기관 데이터룸 정책(AI 경로 · 외부 연결)과 하루 한도(`AI_DAILY_CALLS`)를 서버에서 확인

## 처음 설정(한 번)
1. Google Cloud Shell에서 `bash service/setup-gcp.sh <프로젝트ID> studio.aisam.com`
2. aisam.com DNS에 `studio  A  <출력된 IP>`
3. GitHub › Settings › Secrets and variables › Actions › **Variables**에 출력된 7개 값 + Environments에 `production`
4. Actions › deploy-studio › Run workflow

## 로컬 실행 · 테스트
```bash
cd service/server && npm ci
DATABASE_URL=postgresql://… COOKIE_SECURE=0 PUBLIC_DIR=../public node index.js   # (먼저 node ../build-public.js ../../didisam ../public)
DATABASE_URL=postgresql://… node --test ../test/api.test.js
docker build -f service/Dockerfile .   # 저장소 루트에서
```

## 다음 단계
학교 SSO(SAML · OIDC) · 운영자 초대(부운영자 · 강사 계정) · 파일 저장소(GCS, 영상 · 문서 원본) · YouTube/번역/STT 서버 프록시 · 기관별 하위 도메인 · 백업 복구 리허설 · Cloud Armor(WAF)
