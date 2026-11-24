#!/usr/bin/env bash
# 디디쌤 가디언(보안봇) 운영 연결 — 대표님이 Cloud Shell(nick@didicast.com)에서 한 번 실행합니다.
#   cd ~/kit-axon && bash service/gcp/guardian-setup.sh didisam-studio
# 하는 일(모두 다시 실행해도 안전 · 비밀값은 화면 · 로그에 찍지 않음):
#   1) Cloud SQL 암호화 연결만 허용(IAC-04 일부) · 승인된 네트워크 비우기
#   2) GitHub 배포 계정 권한 축소(IAC-05) — github-deploy-setup.sh 재실행
#   3) 가디언 서비스 토큰 GUARD_TOKEN 생성(Secret Manager, 값은 무작위 · 아무도 보지 않음) → 운영 서비스에 숫자 버전으로 연결
#   4) 런타임 탐지 로그 지표 2종(429 급증 · 운영자 로그인 실패) + 이메일 알림 채널(nick@didisam.com) + 알림 정책
# 하지 않는 일: 긴급 차단 실가동(SECURITY_KILL_LIVE=1)은 dry-run 2주 뒤 대표님 승인으로 따로 켭니다(맨 아래 안내).
set -uo pipefail
P="${1:?프로젝트 ID를 넣어 주세요: bash service/gcp/guardian-setup.sh didisam-studio}"
REGION=asia-northeast3; SVC=didisam-studio; SQL=didisam-pg; RUN_SA="didisam-run@$P.iam.gserviceaccount.com"; MAIL="${GUARD_ALERT_EMAIL:-nick@didisam.com}"
ok(){ echo "✓ $*"; }; warn(){ echo "⚠ $*"; }
gcloud config set project "$P" >/dev/null

echo "── 1) Cloud SQL 암호화 연결만 허용"
gcloud sql instances patch "$SQL" --ssl-mode=ENCRYPTED_ONLY --quiet >/dev/null 2>&1 && ok "ssl-mode=ENCRYPTED_ONLY" || warn "SQL 패치 실패(인스턴스 이름 확인: gcloud sql instances list)"
gcloud sql instances patch "$SQL" --clear-authorized-networks --quiet >/dev/null 2>&1 && ok "승인된 네트워크 비움(커넥터 전용)" || true

echo "── 2) GitHub 배포 계정 권한 축소"
if [ -f service/gcp/github-deploy-setup.sh ]; then bash service/gcp/github-deploy-setup.sh "$P" >/dev/null 2>&1 && ok "배포 계정: 서비스 단위 run.developer · 버킷 단위 권한" || warn "github-deploy-setup.sh 실패 — 출력 확인: bash service/gcp/github-deploy-setup.sh $P"; fi

echo "── 3) 가디언 서비스 토큰"
if ! gcloud secrets describe GUARD_TOKEN >/dev/null 2>&1; then
  gcloud secrets create GUARD_TOKEN --replication-policy=automatic >/dev/null && head -c 48 /dev/urandom | base64 | tr -d '\n/+=' | gcloud secrets versions add GUARD_TOKEN --data-file=- >/dev/null && ok "GUARD_TOKEN 생성(값 비공개)"
else ok "GUARD_TOKEN 이미 있음"; fi
gcloud secrets add-iam-policy-binding GUARD_TOKEN --member "serviceAccount:$RUN_SA" --role roles/secretmanager.secretAccessor >/dev/null 2>&1 || true
V=$(gcloud secrets versions list GUARD_TOKEN --filter="state=ENABLED" --sort-by="~createTime" --limit=1 --format='value(name)')
gcloud run services update "$SVC" --region "$REGION" --update-secrets "GUARD_TOKEN=GUARD_TOKEN:${V##*/}" --quiet >/dev/null 2>&1 && ok "운영 서비스에 GUARD_TOKEN:${V##*/} 연결(긴급 차단은 dry-run 유지)" || warn "서비스 갱신 실패 — 다음 배포 때 deploy.sh가 연결합니다"

echo "── 4) 런타임 탐지 지표 · 알림"
F429='resource.type="cloud_run_revision" AND resource.labels.service_name="'$SVC'" AND httpRequest.status=429'
FLOGIN='resource.type="cloud_run_revision" AND resource.labels.service_name="'$SVC'" AND httpRequest.requestMethod="POST" AND httpRequest.requestUrl:"/api/login" AND httpRequest.status=401'
gcloud logging metrics describe didisam_http_429 >/dev/null 2>&1 || gcloud logging metrics create didisam_http_429 --description="한도 초과(429) — LLMjacking · 무차별 대입 신호" --log-filter="$F429" >/dev/null && ok "지표 didisam_http_429"
gcloud logging metrics describe didisam_admin_login_fail >/dev/null 2>&1 || gcloud logging metrics create didisam_admin_login_fail --description="운영자 로그인 실패(401)" --log-filter="$FLOGIN" >/dev/null && ok "지표 didisam_admin_login_fail"
CH=$(gcloud beta monitoring channels list --filter="labels.email_address=\"$MAIL\"" --format='value(name)' 2>/dev/null | head -1)
[ -z "$CH" ] && CH=$(gcloud beta monitoring channels create --display-name="디디쌤 가디언" --type=email --channel-labels=email_address="$MAIL" --format='value(name)' 2>/dev/null)
if [ -n "$CH" ]; then ok "알림 채널 $MAIL"
  for m in "didisam_http_429:200:300:429 급증(5분 200건)" "didisam_admin_login_fail:30:600:운영자 로그인 실패 급증(10분 30건)"; do IFS=: read -r MN TH SEC NAME <<<"$m"
    gcloud alpha monitoring policies list --filter="displayName=\"가디언 · $NAME\"" --format='value(name)' 2>/dev/null | grep -q . && continue
    cat > /tmp/gpol.json <<J
{"displayName":"가디언 · $NAME","combiner":"OR","conditions":[{"displayName":"$NAME","conditionThreshold":{"filter":"metric.type=\"logging.googleapis.com/user/$MN\" AND resource.type=\"cloud_run_revision\"","comparison":"COMPARISON_GT","thresholdValue":$TH,"duration":"0s","aggregations":[{"alignmentPeriod":"${SEC}s","perSeriesAligner":"ALIGN_SUM","crossSeriesReducer":"REDUCE_SUM"}]}}],"notificationChannels":["$CH"],"documentation":{"content":"디디쌤 가디언 런타임 탐지. 대응: docs/security/README.md 런타임 지표 · 스튜디오 운영 › 보안","mimeType":"text/markdown"}}
J
    gcloud alpha monitoring policies create --policy-from-file=/tmp/gpol.json >/dev/null 2>&1 && ok "알림 정책: $NAME" || warn "알림 정책 생성 실패: $NAME(콘솔 Monitoring › Alerting에서 확인)"; done; rm -f /tmp/gpol.json
else warn "알림 채널 생성 실패 — 콘솔 Monitoring › 알림 채널에서 이메일 추가"; fi

echo
echo "완료. 확인: curl -s https://<서비스 주소>/api/health"
echo "2주 dry-run 뒤 긴급 차단 실가동(대표님 승인 시): gcloud run services update $SVC --region $REGION --update-env-vars SECURITY_KILL_LIVE=1"
