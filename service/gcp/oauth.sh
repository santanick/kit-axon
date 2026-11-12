#!/usr/bin/env bash
# 운영자 소셜 로그인(구글 · 카카오) 키를 Secret Manager에 넣고 서버에 바로 반영한다.
#   bash service/gcp/oauth.sh <프로젝트ID> google   # 클라이언트 ID → 클라이언트 보안 비밀번호 순서로 붙여 넣기
#   bash service/gcp/oauth.sh <프로젝트ID> kakao    # REST API 키 → Client Secret(쓰지 않으면 Enter)
# 콜백 주소(제공자 콘솔의 '승인된 리디렉션 URI' · 'Redirect URI'): https://didisam-studio-<프로젝트번호>.asia-northeast3.run.app/api/oauth/<google|kakao>/callback
set -euo pipefail
PROJECT="${1:?프로젝트 ID}"; P="${2:?google 또는 kakao}"; REGION=asia-northeast3
case "$P" in google|kakao) ;; *) echo "google 또는 kakao만 됩니다"; exit 1 ;; esac
put() { local n="didisam-oauth-$P-$1" v="$2"; [ -z "$v" ] && return 0
  gcloud secrets describe "$n" --project "$PROJECT" >/dev/null 2>&1 || gcloud secrets create "$n" --project "$PROJECT" --replication-policy=automatic >/dev/null
  printf '%s' "$v" | gcloud secrets versions add "$n" --project "$PROJECT" --data-file=- >/dev/null
  gcloud secrets add-iam-policy-binding "$n" --project "$PROJECT" --member "serviceAccount:didisam-run@$PROJECT.iam.gserviceaccount.com" --role roles/secretmanager.secretAccessor >/dev/null
  echo "  ✓ $n"; }
read -rp "$P 클라이언트 ID(REST API 키): " ID; read -rsp "$P 클라이언트 보안 비밀(없으면 Enter): " SECRET; echo
put id "$ID"; put secret "$SECRET"
PNUM=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
echo "콜백 주소: https://didisam-studio-$PNUM.$REGION.run.app/api/oauth/$P/callback"
echo "다음: bash service/gcp/deploy.sh $PROJECT  (새 키를 읽도록 다시 배포)"
