#!/usr/bin/env bash
# GitHub Actions 자동 배포 준비(한 번만) — Cloud Shell에서 대표님 계정으로 실행합니다.
#   bash service/gcp/github-deploy-setup.sh didisam-studio
# 하는 일: 키 파일 없이(Workload Identity) GitHub 저장소 santanick/kit-axon 의 main 브랜치만
#          배포 계정 didisam-deploy 로 로그인하도록 연결합니다. 끝에 GitHub에 넣을 변수 3개를 출력합니다.
set -euo pipefail
P="${1:?프로젝트 ID를 넣어 주세요}"; REPO="${REPO:-santanick/kit-axon}"
PNUM=$(gcloud projects describe "$P" --format='value(projectNumber)')
SA="didisam-deploy@$P.iam.gserviceaccount.com"; POOL=github; PROV=kit-axon
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project "$P"
gcloud iam service-accounts describe "$SA" --project "$P" >/dev/null 2>&1 || \
  gcloud iam service-accounts create didisam-deploy --project "$P" --display-name "GitHub 자동 배포"
for R in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.writer \
         roles/secretmanager.viewer roles/cloudsql.viewer roles/storage.admin \
         roles/serviceusage.serviceUsageConsumer roles/logging.viewer; do
  gcloud projects add-iam-policy-binding "$P" --member "serviceAccount:$SA" --role "$R" --condition=None -q >/dev/null
done
# 서비스 실행 계정(didisam-run)과 Cloud Build 기본 계정으로 '대신 실행'할 수 있어야 배포됩니다.
for T in "didisam-run@$P.iam.gserviceaccount.com" "$PNUM-compute@developer.gserviceaccount.com"; do
  gcloud iam service-accounts add-iam-policy-binding "$T" --project "$P" \
    --member "serviceAccount:$SA" --role roles/iam.serviceAccountUser -q >/dev/null || true
done
gcloud iam workload-identity-pools describe $POOL --project "$P" --location global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create $POOL --project "$P" --location global --display-name GitHub
gcloud iam workload-identity-pools providers describe $PROV --project "$P" --location global --workload-identity-pool $POOL >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc $PROV --project "$P" --location global \
    --workload-identity-pool $POOL --issuer-uri https://token.actions.githubusercontent.com \
    --attribute-mapping 'google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref' \
    --attribute-condition "assertion.repository=='$REPO' && assertion.ref=='refs/heads/main'"
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$P" --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$PNUM/locations/global/workloadIdentityPools/$POOL/attribute.repository/$REPO" -q >/dev/null
echo
echo "✅ 준비 완료. GitHub › $REPO › Settings › Secrets and variables › Actions › Variables 에 3개를 넣어 주세요:"
echo "  GCP_PROJECT  = $P"
echo "  WIF_PROVIDER = projects/$PNUM/locations/global/workloadIdentityPools/$POOL/providers/$PROV"
echo "  DEPLOY_SA    = $SA"
