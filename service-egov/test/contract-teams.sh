#!/bin/bash
# MS Teams /api/conn/teams/* 계약 대조 — (빌드 후) service-egov/test/contract-teams.sh (tests/contract-teams.js, 시연 모드 · MS_CLIENT_ID 없음)
#   Node 9623/tmn · Java 9624/tmj, Postgres 5620(postgres 슈퍼유저 · didisam 비슈퍼유저 계정 — RLS 시험 포함), 매번 새 DB.
#   같은 요청 묶음을 두 서버에 보내 상태 코드 · 응답 형태 · 고정 값을 비교한다(contract-teams.js).
#   N=<Node 코드가 있는 저장소 루트>(기본 ..), PGP=<포트>(기본 5620)
cd "$(dirname "$0")/.."
PB=/usr/lib/postgresql/16/bin; PGP=${PGP:-5620}
for d in tmn tmj; do su postgres -c "$PB/psql -h /tmp -p $PGP -U postgres -qc 'drop database if exists $d' -c 'create database $d owner didisam'"; done
. test/env.sh
export SIGNUP_CODE=C0DE SANTA_ADMIN_EMAILS=grp-santa@example.com PII_KEY=$(printf 'a%.0s' {1..64}) MFA_OFF=1
N=${N:-$(cd .. && pwd)}
mig() { DATABASE_URL=postgres://didisam:x@127.0.0.1:$PGP/$1 PORT=$2 node $N/service/server/index.js > /tmp/tm2-mig-$1.log 2>&1 & local P=$!
  for i in $(seq 1 40); do curl -s 127.0.0.1:$2/api/health >/dev/null && break; sleep 1; done; kill $P; wait $P 2>/dev/null; }
mig tmn 9626; mig tmj 9627
DATABASE_URL=postgres://didisam:x@127.0.0.1:$PGP/tmn PORT=9623 PUBLIC_DIR=$N/service/public node $N/service/server/index.js > /tmp/tm2-node.log 2>&1 & NP=$!
JDBC_URL=jdbc:postgresql://127.0.0.1:$PGP/tmj JDBC_USER=didisam JDBC_PASSWORD=x PORT=9624 PUBLIC_DIR=$N/service/public java -jar target/didisam-egov.war > /tmp/tm2-java.log 2>&1 & JP=$!
for i in $(seq 1 120); do curl -s 127.0.0.1:9624/api/health >/dev/null && curl -s 127.0.0.1:9623/api/health >/dev/null && break; sleep 1; done
SIGNUP_CODE=C0DE node $N/tests/contract-teams.js http://127.0.0.1:9623 http://127.0.0.1:9624; RC=$?
kill $NP $JP; wait 2>/dev/null; exit $RC
