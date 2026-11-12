#!/usr/bin/env bash
# 학습자 이메일 인증번호 발송(v33) — 메일 설정을 Secret Manager에 넣고 운영 서버에 바로 반영한다.
#   bash service/gcp/mail.sh <프로젝트ID> smtp      # Google Workspace(Gmail) 등 SMTP 계정 · 앱 비밀번호
#   bash service/gcp/mail.sh <프로젝트ID> webhook   # 메일 발송 서비스의 웹훅 주소(+선택 토큰)
#   bash service/gcp/mail.sh <프로젝트ID> off       # 메일 발송 끄기(인증번호 요청은 '설정되지 않음' 안내)
# 값은 화면에 보이지 않게 입력받고, 코드 · 로그 · 저장소에는 남기지 않는다. deploy.sh 가 다음 배포부터 자동으로 읽는다.
set -euo pipefail
PROJECT="${1:?프로젝트 ID}"; M="${2:?smtp · webhook · off 중 하나}"; REGION=asia-northeast3
RUN="didisam-run@$PROJECT.iam.gserviceaccount.com"
put() { local n="didisam-mail-$1" v="$2"; [ -z "$v" ] && return 0
  gcloud secrets describe "$n" --project "$PROJECT" >/dev/null 2>&1 || gcloud secrets create "$n" --project "$PROJECT" --replication-policy=automatic >/dev/null
  printf '%s' "$v" | gcloud secrets versions add "$n" --project "$PROJECT" --data-file=- >/dev/null
  gcloud secrets add-iam-policy-binding "$n" --project "$PROJECT" --member "serviceAccount:$RUN" --role roles/secretmanager.secretAccessor >/dev/null
  echo "  ✓ $n"; }
drop() { local n="didisam-mail-$1"; gcloud secrets describe "$n" --project "$PROJECT" >/dev/null 2>&1 && gcloud secrets delete "$n" --project "$PROJECT" --quiet >/dev/null && echo "  - $n 삭제"; return 0; }
enc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$1"; }
case "$M" in
  smtp)
    read -rp "SMTP 서버 [smtp.gmail.com]: " H; H="${H:-smtp.gmail.com}"
    read -rp "포트 465(SSL) 또는 587(STARTTLS) [465]: " PT; PT="${PT:-465}"
    read -rp "로그인 계정(예: no-reply@didisam.com): " U
    read -rsp "비밀번호(Google은 '앱 비밀번호' 16자리, 화면에 보이지 않음): " PW; echo
    [ -n "$U" ] && [ -n "$PW" ] || { echo "계정과 비밀번호가 필요합니다"; exit 1; }
    SCH=smtps; [ "$PT" = 587 ] && SCH=smtp
    read -rp "보내는 주소 [$U]: " F; F="${F:-$U}"
    put smtp-url "$SCH://$(enc "$U"):$(enc "$PW")@$H:$PT"; put from "$F"; OLD="webhook-url webhook-token"; REM="MAIL_WEBHOOK_URL,MAIL_WEBHOOK_TOKEN"
    UPD_SEC="SMTP_URL=didisam-mail-smtp-url:latest,MAIL_FROM=didisam-mail-from:latest"; PROV=smtp ;;
  webhook)
    read -rp "웹훅 주소(https://…): " W; [[ "$W" == https://* ]] || { echo "https 주소만 됩니다"; exit 1; }
    read -rsp "웹훅 토큰(Bearer, 없으면 Enter): " T; echo
    read -rp "보내는 주소 [no-reply@didisam.com]: " F; F="${F:-no-reply@didisam.com}"
    put webhook-url "$W"; put webhook-token "$T"; put from "$F"; OLD="smtp-url"; REM="SMTP_URL"
    UPD_SEC="MAIL_WEBHOOK_URL=didisam-mail-webhook-url:latest,MAIL_FROM=didisam-mail-from:latest"
    if [ -n "$T" ]; then UPD_SEC="$UPD_SEC,MAIL_WEBHOOK_TOKEN=didisam-mail-webhook-token:latest"; else REM="$REM,MAIL_WEBHOOK_TOKEN"; OLD="$OLD webhook-token"; fi; PROV=webhook ;;
  off)
    gcloud run services update didisam-studio --project "$PROJECT" --region "$REGION" --remove-env-vars MAIL_PROVIDER \
      --remove-secrets SMTP_URL,MAIL_WEBHOOK_URL,MAIL_WEBHOOK_TOKEN,MAIL_FROM --quiet >/dev/null
    drop smtp-url; drop webhook-url; drop webhook-token; drop from; echo "✓ 메일 발송을 껐습니다"; exit 0 ;;
  *) echo "smtp · webhook · off 중 하나"; exit 1 ;;
esac
echo "운영 서버에 반영 중…"
gcloud run services update didisam-studio --project "$PROJECT" --region "$REGION" \
  --update-env-vars "MAIL_PROVIDER=$PROV" --update-secrets "$UPD_SEC" --remove-secrets "$REM" --quiet >/dev/null
for o in $OLD; do drop "$o"; done
echo "✓ 메일 발송 켜짐($PROV). 학습자 앱 이메일 가입에서 인증번호가 오는지 확인하세요."
