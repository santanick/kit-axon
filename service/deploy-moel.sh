#!/usr/bin/env bash
# 디디쌤 환급 에디션 배포: 훈련생 · 교강사 · 관리자를 Cloud Run 서비스 3개로 배포한다.
# 먼저 기관 전용 프로젝트에서 setup-gcp.sh를 실행해 DB와 비밀값을 만든다.
#   ADMIN_IPS="203.0.113.10,198.51.100.0/24" LEARNER_TID=<기관 ID> IMAGE=<이미지> bash deploy-moel.sh <프로젝트ID>
# 최초 정운영자를 만들 때만 SIGNUP=on으로 관리자 서비스를 배포하고, 생성 후 SIGNUP 없이 다시 실행한다.
# 비밀값은 Secret Manager에서만 읽는다. DRY_RUN=1이면 실행할 명령만 출력한다.
set -euo pipefail
PROJECT="${1:?프로젝트 ID를 넣으세요: bash deploy-moel.sh <프로젝트ID>}"
: "${ADMIN_IPS:?관리자 접속 허용 IP를 ADMIN_IPS에 넣으세요}"
: "${IMAGE:?배포할 이미지를 IMAGE에 넣으세요}"
REGION="${REGION:-asia-northeast3}"
SQL="${SQL_INSTANCE:-$PROJECT:$REGION:didisam-pg}"
RUN_SA="${RUN_SA:-didisam-run@$PROJECT.iam.gserviceaccount.com}"
SIGNUP="${SIGNUP:-off}"
PREFIX="${SERVICE_PREFIX:-didisam-moel}"
MIN="${MIN_INSTANCES:-2}"
SECRETS="DATABASE_URL=didisam-db-url:latest,SESSION_PEPPER=didisam-session-pepper:latest,PII_KEY=didisam-pii-key:latest,SIGNUP_CODE=didisam-signup-code:latest"
run() { if [ "${DRY_RUN:-}" = 1 ]; then printf '%q ' "$@"; printf '\n'; else "$@"; fi; }
deploy() { # 모듈 환경변수(구분자 ^@^: IP 목록의 쉼표 때문)
  run gcloud run deploy "$PREFIX-$1" --project "$PROJECT" --region "$REGION" --image "$IMAGE" \
    --service-account "$RUN_SA" --add-cloudsql-instances "$SQL" --set-secrets "$SECRETS" \
    --set-env-vars "^@^$2" --ingress internal-and-cloud-load-balancing --allow-unauthenticated \
    --cpu 1 --memory 512Mi --min-instances "$MIN" --max-instances 4 --concurrency 60 --timeout 120 --quiet
}
deploy learner "MODULE=learner@SIGNUP=off@DB_POOL=5${LEARNER_TID:+@LEARNER_TID=$LEARNER_TID}"
deploy tutor "MODULE=tutor@SIGNUP=off@DB_POOL=5"
deploy admin "MODULE=admin@SIGNUP=$SIGNUP@ADMIN_IPS=$ADMIN_IPS@DB_POOL=5"
echo "배포 대상: $PREFIX-learner, $PREFIX-tutor, $PREFIX-admin. 부하분산기에 기관 도메인을 연결해 주십시오."
