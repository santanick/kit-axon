#!/usr/bin/env bash
# 디디쌤 스튜디오 — GitHub 없이 Google Cloud Shell에서 바로 배포(테스트 → Cloud Build 이미지 → Cloud Run 서울)
#   bash service/gcp/deploy.sh <프로젝트ID>
#   DOCKERFILE=service/gcp/Dockerfile.lite bash service/gcp/deploy.sh <프로젝트ID>   # 자막 엔진 빌드가 실패하면 가벼운 판으로
#   INGRESS=lb bash service/gcp/deploy.sh <프로젝트ID>   # 도메인 인증서가 나온 뒤: 부하분산기(studio.aisam.com)로만 받기
# 먼저 service/gcp/setup.sh 를 한 번 실행해야 한다.
set -euo pipefail
PROJECT="${1:?프로젝트 ID를 넣으세요: bash service/gcp/deploy.sh <프로젝트ID>}"
REGION=asia-northeast3
cd "$(dirname "$0")/../.."
TAG="$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"
IMAGE="$REGION-docker.pkg.dev/$PROJECT/didisam/studio:$TAG"
RUN="didisam-run@$PROJECT.iam.gserviceaccount.com"
CONN=$(gcloud sql instances describe didisam-pg --project "$PROJECT" --format='value(connectionName)')
case "${INGRESS:-all}" in lb) ING=internal-and-cloud-load-balancing ;; *) ING=all ;; esac
# 운영자 가입 코드: 기본은 끔(누구나 기관 가입 · 2026-11-07 대표 결정). 다시 켜려면 SIGNUP_CODE_ON=1
SEC="DATABASE_URL=didisam-db-url:latest,ANTHROPIC_API_KEY=didisam-anthropic-key:latest,SESSION_PEPPER=didisam-session-pepper:latest,PII_KEY=didisam-pii-key:latest"
[ "${SIGNUP_CODE_ON:-0}" = 1 ] && SEC="$SEC,SIGNUP_CODE=didisam-signup-code:latest"
# 운영자 소셜 로그인(v32.4): 비밀값이 있는 제공자만 켠다(bash service/gcp/oauth.sh 로 등록)
for k in GOOGLE_ID GOOGLE_SECRET KAKAO_ID KAKAO_SECRET; do n="didisam-oauth-$(echo $k | tr 'A-Z_' 'a-z-')"
  gcloud secrets describe "$n" --project "$PROJECT" >/dev/null 2>&1 && SEC="$SEC,OAUTH_$k=$n:latest"; done
# 학습자 이메일 인증번호 발송(v33): bash service/gcp/mail.sh 로 등록한 값이 있으면 켠다(없으면 '설정되지 않음' 안내)
has() { gcloud secrets describe "didisam-mail-$1" --project "$PROJECT" >/dev/null 2>&1; }
MAILENV=""
if has smtp-url; then SEC="$SEC,SMTP_URL=didisam-mail-smtp-url:latest"; MAILENV=",MAIL_PROVIDER=smtp"
elif has webhook-url; then SEC="$SEC,MAIL_WEBHOOK_URL=didisam-mail-webhook-url:latest"; MAILENV=",MAIL_PROVIDER=webhook"; has webhook-token && SEC="$SEC,MAIL_WEBHOOK_TOKEN=didisam-mail-webhook-token:latest"; fi
[ -n "$MAILENV" ] && has from && SEC="$SEC,MAIL_FROM=didisam-mail-from:latest"
# 소셜 로그인 콜백 주소의 앞부분 — 제공자 콘솔에 등록한 주소와 같아야 한다(도메인을 붙이면 PUBLIC_URL=https://studio.aisam.com)
PNUM=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
PUBLIC_URL="${PUBLIC_URL:-https://didisam-studio-$PNUM.$REGION.run.app}"
say() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }

say "1/3 문법 점검"
for f in service/server/*.js service/server/lms/*.js didisam/*.js didisam/lms/*.js; do node --check "$f"; done

say "2/3 이미지 빌드(Cloud Build, 처음은 15~25분 — 자막 엔진 빌드 포함)"
gcloud builds submit --project "$PROJECT" --region "$REGION" --config service/gcp/cloudbuild.yaml --substitutions "_IMAGE=$IMAGE,_DOCKERFILE=${DOCKERFILE:-service/Dockerfile}" .

say "3/3 Cloud Run 배포"
gcloud run deploy didisam-studio --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --service-account "$RUN" --add-cloudsql-instances "$CONN" \
  --set-secrets "$SEC" \
  --set-env-vars "DB_POOL=5,AI_DAILY_CALLS=400,PUBLIC_URL=$PUBLIC_URL$MAILENV" \
  --ingress "$ING" --allow-unauthenticated \
  --cpu 1 --memory 1Gi --min-instances 0 --max-instances 4 --concurrency 60 --timeout 300 --quiet
URL=$(gcloud run services describe didisam-studio --project "$PROJECT" --region "$REGION" --format='value(status.url)')
echo; echo "✅ 배포 완료: $URL  (이미지 $TAG)"
curl -fsS --retry 6 --retry-delay 10 "$URL/api/health" && echo " ← 서버 정상" || echo "※ 상태 확인 실패 — 로그: gcloud run services logs read didisam-studio --region $REGION --project $PROJECT"
