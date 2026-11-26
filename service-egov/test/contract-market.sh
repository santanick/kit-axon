#!/bin/bash
# 콘텐츠 마켓 계약 대조 — (빌드 후) service-egov/test/contract-market.sh. Node 9621/mkn · Java 9622/mkj, Postgres 5520(postgres 슈퍼유저 · didisam 계정), 매번 새 DB
cd "$(dirname "$0")/.."
PB=/usr/lib/postgresql/16/bin
for d in mkn mkj; do su postgres -c "$PB/psql -h /tmp -p 5520 -U postgres -qc 'drop database if exists $d' -c 'create database $d owner didisam'"; done
. test/env.sh
export SIGNUP_CODE=C0DE SANTA_ADMIN_EMAILS=mk-santa1@example.com,mk-santa2@example.com PII_KEY=$(printf 'a%.0s' {1..64})
N=${N:-$(cd .. && pwd)}   # Node 코드 · tests/contract-market.js가 있는 저장소 루트
mig() { DATABASE_URL=postgres://didisam:x@127.0.0.1:5520/$1 PORT=$2 node $N/service/server/index.js > /tmp/mk2-mig-$1.log 2>&1 & local P=$!
  for i in $(seq 1 40); do curl -s 127.0.0.1:$2/api/health >/dev/null && break; sleep 1; done; kill $P; wait $P 2>/dev/null; }
mig mkn 9628; mig mkj 9629
DATABASE_URL=postgres://didisam:x@127.0.0.1:5520/mkn PORT=9621 PUBLIC_DIR=$N/service/public node $N/service/server/index.js > /tmp/mk2-node.log 2>&1 & NP=$!
JDBC_URL=jdbc:postgresql://127.0.0.1:5520/mkj JDBC_USER=didisam JDBC_PASSWORD=x PORT=9622 PUBLIC_DIR=$N/service/public java -jar target/didisam-egov.war > /tmp/mk2-java.log 2>&1 & JP=$!
for i in $(seq 1 90); do curl -s 127.0.0.1:9622/api/health >/dev/null && curl -s 127.0.0.1:9621/api/health >/dev/null && break; sleep 1; done
echo "== Node"; DBG=$DBG node $N/tests/contract-market.js http://127.0.0.1:9621 > /tmp/mk2-cn.txt 2>&1; grep -v '^ ' /tmp/mk2-cn.txt | tail -20
echo "== Java"; DBG=$DBG node $N/tests/contract-market.js http://127.0.0.1:9622 > /tmp/mk2-cj.txt 2>&1; grep -v '^ ' /tmp/mk2-cj.txt | tail -40
kill $NP $JP; wait 2>/dev/null
