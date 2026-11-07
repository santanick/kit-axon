#!/usr/bin/env bash
# 데모 사이트(서버 없이 브라우저에서 체험) — GitHub Pages 대신 Firebase Hosting(무료 요금제 범위)
#   bash service/gcp/demo.sh <프로젝트ID>
# 처음 한 번: npx firebase-tools login --no-localhost  (화면에 나오는 주소를 열어 Google 계정으로 승인)
set -euo pipefail
PROJECT="${1:?프로젝트 ID를 넣으세요}"
cd "$(dirname "$0")/../.."
rm -rf /tmp/didisam-demo && mkdir -p /tmp/didisam-demo
node service/build-public.js ./didisam /tmp/didisam-demo/public
cat > /tmp/didisam-demo/firebase.json <<'J'
{ "hosting": { "public": "public", "cleanUrls": false,
  "headers": [ { "source": "**/*.@(js|css|html)", "headers": [ { "key": "Cache-Control", "value": "no-cache" } ] } ] } }
J
cd /tmp/didisam-demo
npx --yes firebase-tools projects:addfirebase "$PROJECT" >/dev/null 2>&1 || true
npx --yes firebase-tools deploy --only hosting --project "$PROJECT" --non-interactive
echo "✅ 데모 사이트: https://$PROJECT.web.app/  (학습자 앱: https://$PROJECT.web.app/learner.html)"
