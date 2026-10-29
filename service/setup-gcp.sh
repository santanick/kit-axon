#!/usr/bin/env bash
# 디디쌤 스튜디오 운영 서비스 — GCP 최초 설정(한 번만). Google Cloud Shell에서 실행:
#   bash setup-gcp.sh <프로젝트ID> [도메인=studio.aisam.com]
# 만드는 것(서울 asia-northeast3):
#   API 사용 설정 · Artifact Registry · Cloud SQL(PostgreSQL 16, 외부 IP 없이 Cloud Run 커넥터로만) · DB 사용자
#   Secret Manager(DB 주소 · Anthropic 키 · 가입 코드) · 실행/배포 서비스 계정 · GitHub OIDC(Workload Identity, 키 파일 없음)
#   HTTPS 부하분산기 + 관리형 인증서(도메인) — Cloud Run 도메인 매핑은 서울 리전을 지원하지 않아 부하분산기로 연결
# 비밀번호 · 키는 화면에 출력하지 않고 Secret Manager에만 저장한다. 다시 실행해도 이미 있는 리소스는 건너뛴다.
set -euo pipefail
PROJECT="${1:?프로젝트 ID를 넣으세요: bash setup-gcp.sh <프로젝트ID> [도메인]}"
DOMAIN="${2:-studio.aisam.com}"
REGION=asia-northeast3
REPO_GH=santanick/kit-axon
SQL=didisam-pg
SQL_TIER="${SQL_TIER:-db-custom-1-3840}"   # 1 vCPU · 3.75GB. 체험 단계는 SQL_TIER=db-f1-micro 로 낮출 수 있음
RUN_SA=didisam-run
DEPLOY_SA=didisam-deploy
POOL=github
PROVIDER=kit-axon
say() { printf '\n\033[1m▶ %s\033[0m\n' "$*"; }
exists() { "$@" >/dev/null 2>&1; }

gcloud config set project "$PROJECT" >/dev/null
PNUM=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')

say "1/8 API 사용 설정"
gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com \
  iamcredentials.googleapis.com iam.googleapis.com compute.googleapis.com cloudresourcemanager.googleapis.com sts.googleapis.com

say "2/8 Artifact Registry(이미지 저장소)"
exists gcloud artifacts repositories describe didisam --location "$REGION" || \
  gcloud artifacts repositories create didisam --repository-format docker --location "$REGION" --description "디디쌤 스튜디오"

say "3/8 Cloud SQL PostgreSQL 16 — 처음이면 10분 정도 걸립니다"
if ! exists gcloud sql instances describe "$SQL"; then
  gcloud sql instances create "$SQL" --database-version POSTGRES_16 --region "$REGION" --tier "$SQL_TIER" --edition enterprise \
    --storage-auto-increase --backup-start-time 18:00 --enable-point-in-time-recovery --retained-backups-count 30 \
    --deletion-protection
fi
exists gcloud sql databases describe didisam --instance "$SQL" || gcloud sql databases create didisam --instance "$SQL"
CONN=$(gcloud sql instances describe "$SQL" --format='value(connectionName)')
if ! exists gcloud secrets describe didisam-db-url; then
  DBPW=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | head -c 32)
  exists gcloud sql users describe didisam --instance "$SQL" && gcloud sql users set-password didisam --instance "$SQL" --password "$DBPW" \
    || gcloud sql users create didisam --instance "$SQL" --password "$DBPW"
  printf 'postgresql://didisam:%s@localhost/didisam?host=/cloudsql/%s' "$DBPW" "$CONN" | gcloud secrets create didisam-db-url --data-file=- --replication-policy user-managed --locations "$REGION"
  unset DBPW
fi

say "4/8 Anthropic API 키 · 가입 코드(Secret Manager)"
if ! exists gcloud secrets describe didisam-anthropic-key; then
  read -rsp "Anthropic API 키(sk-ant-…, 없으면 Enter — AI 없이 시작하고 나중에 추가): " AK; echo
  printf '%s' "${AK:-none}" | gcloud secrets create didisam-anthropic-key --data-file=- --replication-policy user-managed --locations "$REGION"; unset AK
fi
if ! exists gcloud secrets describe didisam-signup-code; then
  CODE="SANTA-$(openssl rand -hex 3 | tr a-f A-F)"
  printf '%s' "$CODE" | gcloud secrets create didisam-signup-code --data-file=- --replication-policy user-managed --locations "$REGION"
  echo "새 기관 가입 코드: $CODE  (고객 기관에 전달 · 바꾸려면 gcloud secrets versions add didisam-signup-code)"
fi

say "5/8 서비스 계정(실행용 · 배포용) — 최소 권한"
exists gcloud iam service-accounts describe "$RUN_SA@$PROJECT.iam.gserviceaccount.com" || gcloud iam service-accounts create "$RUN_SA" --display-name "디디쌤 스튜디오 실행"
exists gcloud iam service-accounts describe "$DEPLOY_SA@$PROJECT.iam.gserviceaccount.com" || gcloud iam service-accounts create "$DEPLOY_SA" --display-name "디디쌤 스튜디오 배포(GitHub)"
RUN="$RUN_SA@$PROJECT.iam.gserviceaccount.com"; DEP="$DEPLOY_SA@$PROJECT.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$RUN" --role roles/cloudsql.client --condition=None >/dev/null
for s in didisam-db-url didisam-anthropic-key didisam-signup-code; do
  gcloud secrets add-iam-policy-binding "$s" --member "serviceAccount:$RUN" --role roles/secretmanager.secretAccessor >/dev/null
done
gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$DEP" --role roles/run.admin --condition=None >/dev/null
gcloud artifacts repositories add-iam-policy-binding didisam --location "$REGION" --member "serviceAccount:$DEP" --role roles/artifactregistry.writer >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$RUN" --member "serviceAccount:$DEP" --role roles/iam.serviceAccountUser >/dev/null

say "6/8 GitHub Actions 연결(Workload Identity — 키 파일 없음, $REPO_GH main 브랜치만)"
exists gcloud iam workload-identity-pools describe "$POOL" --location global || \
  gcloud iam workload-identity-pools create "$POOL" --location global --display-name "GitHub Actions"
exists gcloud iam workload-identity-pools providers describe "$PROVIDER" --workload-identity-pool "$POOL" --location global || \
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --workload-identity-pool "$POOL" --location global \
    --issuer-uri https://token.actions.githubusercontent.com \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository == '$REPO_GH' && assertion.ref == 'refs/heads/main'"
gcloud iam service-accounts add-iam-policy-binding "$DEP" --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$PNUM/locations/global/workloadIdentityPools/$POOL/attribute.repository/$REPO_GH" >/dev/null

say "7/8 첫 배포용 자리(이미지가 올라오기 전 부하분산기 연결을 위해 서비스를 먼저 만듦)"
if ! exists gcloud run services describe didisam-studio --region "$REGION"; then
  gcloud run deploy didisam-studio --region "$REGION" --image us-docker.pkg.dev/cloudrun/container/hello \
    --service-account "$RUN" --ingress internal-and-cloud-load-balancing --allow-unauthenticated --quiet
fi

say "8/8 HTTPS 부하분산기 + 관리형 인증서($DOMAIN)"
exists gcloud compute addresses describe didisam-ip --global || gcloud compute addresses create didisam-ip --global --ip-version IPV4
IP=$(gcloud compute addresses describe didisam-ip --global --format='value(address)')
exists gcloud compute network-endpoint-groups describe didisam-neg --region "$REGION" || \
  gcloud compute network-endpoint-groups create didisam-neg --region "$REGION" --network-endpoint-type serverless --cloud-run-service didisam-studio
if ! exists gcloud compute backend-services describe didisam-be --global; then
  gcloud compute backend-services create didisam-be --global --load-balancing-scheme EXTERNAL_MANAGED
  gcloud compute backend-services add-backend didisam-be --global --network-endpoint-group didisam-neg --network-endpoint-group-region "$REGION"
fi
exists gcloud compute url-maps describe didisam-map --global || gcloud compute url-maps create didisam-map --global --default-service didisam-be
exists gcloud compute ssl-certificates describe didisam-cert --global || gcloud compute ssl-certificates create didisam-cert --global --domains "$DOMAIN"
exists gcloud compute target-https-proxies describe didisam-https --global || gcloud compute target-https-proxies create didisam-https --global --url-map didisam-map --ssl-certificates didisam-cert
exists gcloud compute forwarding-rules describe didisam-fr --global || \
  gcloud compute forwarding-rules create didisam-fr --global --load-balancing-scheme EXTERNAL_MANAGED --address didisam-ip --target-https-proxy didisam-https --ports 443
# http → https
if ! exists gcloud compute url-maps describe didisam-redirect --global; then
  printf 'name: didisam-redirect\ndefaultUrlRedirect:\n  httpsRedirect: true\n  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT\n' > /tmp/didisam-redirect.yaml
  gcloud compute url-maps import didisam-redirect --global --source /tmp/didisam-redirect.yaml --quiet
  gcloud compute target-http-proxies create didisam-http --global --url-map didisam-redirect
  gcloud compute forwarding-rules create didisam-fr-http --global --load-balancing-scheme EXTERNAL_MANAGED --address didisam-ip --target-http-proxy didisam-http --ports 80
fi

cat <<EOF

────────────────────────────────────────────────────────
✅ GCP 설정 완료. 남은 일 2가지:

① DNS(aisam.com 관리 화면)에 A 레코드 추가
     ${DOMAIN%%.*}   A   $IP
   → 인증서 발급까지 15~60분(상태: gcloud compute ssl-certificates describe didisam-cert --global)

② GitHub 저장소 $REPO_GH › Settings › Secrets and variables › Actions › Variables 에 추가
     GCP_PROJECT    $PROJECT
     GCP_REGION     $REGION
     WIF_PROVIDER   projects/$PNUM/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER
     DEPLOY_SA      $DEP
     RUN_SA         $RUN
     SQL_INSTANCE   $CONN
     STUDIO_DOMAIN  $DOMAIN
   (+ Settings › Environments 에 'production' 환경을 만들고 필요하면 승인자 지정)
   → Actions › deploy-studio › Run workflow 로 첫 배포
────────────────────────────────────────────────────────
EOF
