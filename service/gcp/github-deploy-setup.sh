#!/usr/bin/env bash
# GitHub Actions 자동 배포 준비(한 번만) — Cloud Shell에서 대표님 계정으로 실행합니다.
#   bash service/gcp/github-deploy-setup.sh didisam-studio
# 하는 일: 키 파일 없이(Workload Identity) GitHub 저장소 santanick/kit-axon 의 main 브랜치만
#          배포 계정 didisam-deploy 로 로그인하도록 연결합니다. 끝에 GitHub에 넣을 변수 3개를 출력합니다.
set -euo pipefail
P="${1:?프로젝트 ID를 넣어 주세요}"; REPO="${REPO:-santanick/kit-axon}"
PNUM=$(gcloud projects describe "$P" --format='value(projectNumber)')
SA="didisam-deploy@$P.iam.gserviceaccount.com"; POOL=github; PROV=kit-axon; REGION=asia-northeast3
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project "$P"
gcloud iam service-accounts describe "$SA" --project "$P" >/dev/null 2>&1 || \
  gcloud iam service-accounts create didisam-deploy --project "$P" --display-name "GitHub 자동 배포"
# 보안 점검 IAC-05(가디언 2차): 프로젝트 전체 run.admin · storage.admin을 쓰지 않는다 — 필요한 자원에만 좁게 준다.
#   프로젝트 단위: 빌드 제출 · 비밀값 이름 확인(값 읽기 아님) · DB 연결명 조회 · 로그 보기만
for R in roles/cloudbuild.builds.editor roles/secretmanager.viewer roles/cloudsql.viewer \
         roles/serviceusage.serviceUsageConsumer roles/logging.viewer; do
  gcloud projects add-iam-policy-binding "$P" --member "serviceAccount:$SA" --role "$R" --condition=None -q >/dev/null
done
#   예전 넓은 권한 회수(다시 실행해도 안전)
for R in roles/run.admin roles/storage.admin roles/artifactregistry.writer; do
  gcloud projects remove-iam-policy-binding "$P" --member "serviceAccount:$SA" --role "$R" --all -q >/dev/null 2>&1 || true
done
#   이미지 저장소 didisam 에만 쓰기
gcloud artifacts repositories add-iam-policy-binding didisam --project "$P" --location "$REGION" \
  --member "serviceAccount:$SA" --role roles/artifactregistry.writer -q >/dev/null
#   Cloud Build 소스 업로드 버킷(gs://<프로젝트>_cloudbuild)에만 객체 쓰기 — 없으면 서울 리전으로 만든다
BK="gs://${P}_cloudbuild"
gcloud storage buckets describe "$BK" --project "$P" >/dev/null 2>&1 || \
  gcloud storage buckets create "$BK" --project "$P" --location "$REGION" --uniform-bucket-level-access
for R in roles/storage.objectAdmin roles/storage.legacyBucketReader; do
  gcloud storage buckets add-iam-policy-binding "$BK" --member "serviceAccount:$SA" --role "$R" -q >/dev/null
done
#   Cloud Run 서비스 didisam-studio 에만 배포(run.developer: 새 버전 배포 가능, IAM 정책 변경 불가).
#   서비스가 아직 없으면 Cloud Shell에서 bash service/gcp/deploy.sh 로 한 번 만든 뒤 이 스크립트를 다시 실행합니다.
if gcloud run services describe didisam-studio --project "$P" --region "$REGION" >/dev/null 2>&1; then
  gcloud run services add-iam-policy-binding didisam-studio --project "$P" --region "$REGION" \
    --member "serviceAccount:$SA" --role roles/run.developer -q >/dev/null
else
  echo "※ Cloud Run 서비스 didisam-studio 가 아직 없습니다. Cloud Shell에서 deploy.sh로 처음 배포한 뒤 이 스크립트를 다시 실행해 주세요."
fi
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
