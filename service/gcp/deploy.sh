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
say() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }

say "1/3 문법 점검"
for f in service/server/*.js service/server/lms/*.js didisam/*.js didisam/lms/*.js; do node --check "$f"; done

say "2/3 이미지 빌드(Cloud Build, 처음은 15~25분 — 자막 엔진 빌드 포함)"
gcloud builds submit --project "$PROJECT" --region "$REGION" --config service/gcp/cloudbuild.yaml --substitutions "_IMAGE=$IMAGE,_DOCKERFILE=${DOCKERFILE:-service/Dockerfile}" .

say "3/3 Cloud Run 배포"
gcloud run deploy didisam-studio --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
  --service-account "$RUN" --add-cloudsql-instances "$CONN" \
  --set-secrets "DATABASE_URL=didisam-db-url:latest,ANTHROPIC_API_KEY=didisam-anthropic-key:latest,SIGNUP_CODE=didisam-signup-code:latest,SESSION_PEPPER=didisam-session-pepper:latest,PII_KEY=didisam-pii-key:latest" \
  --set-env-vars "DB_POOL=5,AI_DAILY_CALLS=400" \
  --ingress "$ING" --allow-unauthenticated \
  --cpu 1 --memory 1Gi --min-instances 0 --max-instances 4 --concurrency 60 --timeout 300 --quiet
URL=$(gcloud run services describe didisam-studio --project "$PROJECT" --region "$REGION" --format='value(status.url)')
echo; echo "✅ 배포 완료: $URL  (이미지 $TAG)"
curl -fsS --retry 6 --retry-delay 10 "$URL/api/health" && echo " ← 서버 정상" || echo "※ 상태 확인 실패 — 로그: gcloud run services logs read didisam-studio --region $REGION --project $PROJECT"
