# 운영 비밀값 목록 · 교체 주기 · 절차

이 문서에는 비밀값의 **이름과 용도만** 적습니다. 값, 값의 일부, 값을 추측할 수 있는 정보는 적지 않습니다.
운영 비밀값은 모두 Google Secret Manager(서울 리전 `asia-northeast3`, 사용자 관리 복제)에 두고, Cloud Run 실행 계정 `didisam-run`만 `secretAccessor` 권한으로 읽습니다.
배포 계정 `didisam-deploy`는 `secretmanager.viewer`(이름 · 버전 번호 확인)만 가지며 값을 읽지 못합니다.

## 1. 목록

| Secret Manager 이름 | 서버 환경변수 | 용도 | 교체 주기 | 교체 영향 |
|---|---|---|---|---|
| `didisam-db-url` | `DATABASE_URL` | Cloud SQL 접속(비밀번호 포함, 커넥터 소켓 경로) | 180일 · 담당자 변경 시 | DB 사용자 비밀번호를 먼저 바꾸고 새 버전 추가 → 재배포 |
| `didisam-anthropic-key` | `ANTHROPIC_API_KEY` | AI 호출(AI SAM · 튜터 · 채점 초안) | 90일 · 유출 의심 즉시 | Anthropic 콘솔에서 새 키 발급 → 새 버전 → 재배포 → 이전 키 폐기 |
| `didisam-session-pepper` | `SESSION_PEPPER` | 세션 토큰 해시 페퍼(32자 이상) | 365일 · 유출 의심 즉시 | **모든 운영자 · 학습자 세션이 끊깁니다**(다시 로그인). 업무 시간 외 교체 |
| `didisam-pii-key` | `PII_KEY` | 개인정보 AES-256-GCM 암호화 · 블라인드 인덱스 HMAC · 시설 QR 서명 기본 키 · MFA 비밀값 암호화 | 정기 교체 없음(유출 의심 시만) | **단독 교체 금지.** 기존 암호문 · 블라인드 인덱스를 새 키로 다시 만드는 이전 작업이 함께 필요합니다(통합 담당이 절차서 작성 후 진행) |
| `didisam-signup-code` | `SIGNUP_CODE` | 기관 가입 코드(`SIGNUP_CODE_ON=1`일 때만) | 고객 전달 후 수시 | 새 가입에만 영향 |
| `didisam-oauth-google-id` · `-google-secret` | `OAUTH_GOOGLE_ID` · `OAUTH_GOOGLE_SECRET` | 운영자 Google 로그인 | 365일 | 제공자 콘솔에서 비밀 재발급 → 새 버전 → 재배포 |
| `didisam-oauth-kakao-id` · `-kakao-secret` | `OAUTH_KAKAO_ID` · `OAUTH_KAKAO_SECRET` | 운영자 카카오 로그인 | 365일 | 위와 같음 |
| `didisam-mail-smtp-url` 또는 `-webhook-url` · `-webhook-token` · `-from` | `SMTP_URL` · `MAIL_WEBHOOK_URL` · `MAIL_WEBHOOK_TOKEN` · `MAIL_FROM` | 학습자 이메일 인증번호 발송 | 180일 | `service/gcp/mail.sh`로 교체 |
| (등록 시) `TOSS_SECRET_KEY` | `TOSS_SECRET_KEY` | 토스페이먼츠 서버 승인 · 취소 | 계약 갱신 시 · 유출 의심 즉시 | 토스 상점 관리자에서 재발급 |
| (등록 시) `FAC_QR_KEY` | `FAC_QR_KEY` | 시설 QR 서명(없으면 `PII_KEY`에서 파생) | 365일 | 교체 시 발급된 QR이 무효가 됩니다 |
| (등록 시) `GUARD_TOKEN` | `GUARD_TOKEN` | 가디언 수집(`/api/security/ingest`) 서비스 토큰(32자 이상) | 90일 | 가디언 실행 환경과 함께 교체 |

운영 시작 검사: `NODE_ENV=production`이면 `SESSION_PEPPER` · `PII_KEY`가 32자 미만일 때 서버가 시작하지 않습니다(`service/server/app.js`).

## 2. 버전 고정(IAC-06)

`service/gcp/deploy.sh`는 비밀값을 `:latest`로 참조하지 않고, 배포 시점의 **ENABLED 최신 숫자 버전**으로 고정해 `--set-secrets 이름:번호`로 넘깁니다.
배포 로그에 `비밀값 버전 고정: didisam-db-url:3,…`처럼 이름과 번호만 남습니다. 이전 Cloud Run 리비전으로 되돌리면 그 리비전이 쓰던 번호가 그대로 쓰입니다.

## 3. 교체 절차(모든 비밀값 공통, `PII_KEY` 제외)

1. 새 값 준비: 제공자 콘솔에서 재발급하거나 `openssl rand -hex 32`로 생성합니다. 값은 화면 · 채팅 · 문서에 붙여 넣지 않습니다.
2. 새 버전 추가: `gcloud secrets versions add <이름> --data-file=-`(표준 입력으로 전달).
3. 재배포: `bash service/gcp/deploy.sh <프로젝트ID>` — 새 번호가 고정됩니다.
4. 확인: `/api/health`, 운영자 로그인, 해당 기능(AI 호출 · 메일 발송 · 소셜 로그인) 한 번씩.
5. 이전 버전 사용 중지: `gcloud secrets versions disable <이름> --version <이전 번호>`. 바로 삭제하지 않고 30일 뒤 `destroy`합니다(되돌리기 여유).
6. 외부 제공자 키는 제공자 쪽 이전 키도 폐기합니다.
7. 기록: 교체 일시 · 담당자 · 이름 · 새 버전 번호를 운영 기록에 남깁니다(값 금지).

유출이 의심되면 5단계를 기다리지 않고 이전 버전을 즉시 사용 중지하고, 가디언 사고 대응(`/api/security/kill` 키 차단)을 함께 검토합니다.

## 4. 관련 인프라 설정(가디언 2차)

- **IAC-04** Cloud SQL: `setup.sh` · `setup-gcp.sh`가 `--ssl-mode=ENCRYPTED_ONLY`로 만들고, 이미 있는 인스턴스도 같은 값으로 맞춥니다. 승인된 네트워크는 비워 둡니다(Cloud Run은 커넥터 경유).
  공인 IP 자체를 없애는 `--no-assign-ip`은 사설 IP(VPC 피어링) · Serverless VPC 커넥터 구성이 먼저 필요해 다음 단계로 둡니다.
- **IAC-05** 배포 계정: 프로젝트 전체 `run.admin` · `storage.admin`을 회수하고, Cloud Run 서비스 `didisam-studio`에 `run.developer`, Cloud Build 업로드 버킷에 `storage.objectAdmin`, 이미지 저장소 `didisam`에 `artifactregistry.writer`만 줍니다(`github-deploy-setup.sh`).
  공개 접근(`allUsers`)은 서비스를 처음 만들 때만 걸고, 이후 배포는 IAM을 바꾸지 않습니다.
- 운영 반영은 대표님이 Cloud Shell에서 `bash service/gcp/github-deploy-setup.sh <프로젝트ID>`, `bash service/gcp/setup.sh <프로젝트ID>`를 다시 실행하면 됩니다(여러 번 실행해도 안전).
