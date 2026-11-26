#!/bin/bash
# MS Teams 실제 경로(MS_CLIENT_ID 설정) 대조 — (빌드 후) service-egov/test/contract-teams-live.sh. Microsoft 끝점은 가짜 서버(9603)가 가로챈다(실제 키 금지)
#   Node 9625/tln · Java 9620/tlj, Postgres 5620(postgres 슈퍼유저 · didisam 비슈퍼유저 계정 — RLS 시험 포함), 매번 새 DB.
#   같은 요청 묶음을 두 서버에 보내 상태 코드 · 응답 형태 · 고정 값을 비교한다(contract-teams.js).
#   N=<Node 코드가 있는 저장소 루트>(기본 ..), PGP=<포트>(기본 5620)
cd "$(dirname "$0")/.."
PB=/usr/lib/postgresql/16/bin; PGP=${PGP:-5620}
for d in tln tlj; do su postgres -c "$PB/psql -h /tmp -p $PGP -U postgres -qc 'drop database if exists $d' -c 'create database $d owner didisam'"; done
. test/env.sh
node test/contract-teams-live.js serve 9603 & MP=$!
export OAUTH_MOCK_URL=http://127.0.0.1:9603 MS_CLIENT_ID=ms-app-contract MS_CLIENT_SECRET=ms-sec-contract TEAMS_WEBHOOK_TEST=1 TEAMS_GAP_MS=20 NEW_DEVICE_MAIL=off
export SIGNUP_CODE=C0DE SANTA_ADMIN_EMAILS=grp-santa@example.com PII_KEY=$(printf 'a%.0s' {1..64}) MFA_OFF=1
N=${N:-$(cd .. && pwd)}
mig() { DATABASE_URL=postgres://didisam:x@127.0.0.1:$PGP/$1 PORT=$2 node $N/service/server/index.js > /tmp/tl2-mig-$1.log 2>&1 & local P=$!
  for i in $(seq 1 40); do curl -s 127.0.0.1:$2/api/health >/dev/null && break; sleep 1; done; kill $P; wait $P 2>/dev/null; }
mig tln 9601; mig tlj 9602
DATABASE_URL=postgres://didisam:x@127.0.0.1:$PGP/tln PORT=9625 PUBLIC_DIR=$N/service/public node $N/service/server/index.js > /tmp/tl2-node.log 2>&1 & NP=$!
JDBC_URL=jdbc:postgresql://127.0.0.1:$PGP/tlj JDBC_USER=didisam JDBC_PASSWORD=x PORT=9620 PUBLIC_DIR=$N/service/public java -jar target/didisam-egov.war > /tmp/tl2-java.log 2>&1 & JP=$!
for i in $(seq 1 120); do curl -s 127.0.0.1:9620/api/health >/dev/null && curl -s 127.0.0.1:9625/api/health >/dev/null && break; sleep 1; done
node test/contract-teams-live.js http://127.0.0.1:9625 http://127.0.0.1:9620 http://127.0.0.1:9603; RC=$?
kill $NP $JP $MP; wait 2>/dev/null; exit $RC
