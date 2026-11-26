#!/bin/bash
# 통합 센터 /api/group/* 계약 대조 — (빌드 후) service-egov/test/contract-group.sh
#   Node 9621/grpn · Java 9622/grpj, Postgres 5620(postgres 슈퍼유저 · didisam 비슈퍼유저 계정 — RLS 시험 포함), 매번 새 DB.
#   같은 시나리오(tests/contract-group.js)를 두 서버에 돌려 결과(R) JSON을 키 단위로 비교한다. 다른 값 = 대조 실패.
#   N=<Node 코드가 있는 저장소 루트>(기본 ..), PGP=<포트>(기본 5620)
cd "$(dirname "$0")/.."
PB=/usr/lib/postgresql/16/bin; PGP=${PGP:-5620}
for d in grpn grpj; do su postgres -c "$PB/psql -h /tmp -p $PGP -U postgres -qc 'drop database if exists $d' -c 'create database $d owner didisam'"; done
. test/env.sh
export SIGNUP_CODE=C0DE SANTA_ADMIN_EMAILS=grp-santa@example.com PII_KEY=$(printf 'a%.0s' {1..64}) MFA_OFF=1
N=${N:-$(cd .. && pwd)}
mig() { DATABASE_URL=postgres://didisam:x@127.0.0.1:$PGP/$1 PORT=$2 node $N/service/server/index.js > /tmp/grp2-mig-$1.log 2>&1 & local P=$!
  for i in $(seq 1 40); do curl -s 127.0.0.1:$2/api/health >/dev/null && break; sleep 1; done; kill $P; wait $P 2>/dev/null; }
mig grpn 9628; mig grpj 9629
DATABASE_URL=postgres://didisam:x@127.0.0.1:$PGP/grpn PORT=9621 PUBLIC_DIR=$N/service/public node $N/service/server/index.js > /tmp/grp2-node.log 2>&1 & NP=$!
JDBC_URL=jdbc:postgresql://127.0.0.1:$PGP/grpj JDBC_USER=didisam JDBC_PASSWORD=x PORT=9622 PUBLIC_DIR=$N/service/public java -jar target/didisam-egov.war > /tmp/grp2-java.log 2>&1 & JP=$!
for i in $(seq 1 120); do curl -s 127.0.0.1:9622/api/health >/dev/null && curl -s 127.0.0.1:9621/api/health >/dev/null && break; sleep 1; done
OUT=${OUT:-/tmp/grp2-contract}; mkdir -p $OUT
node -e '
const C = require(process.argv[1]); const run = C.run; const fs = require("fs");
(async () => { const [n, j] = [await run(process.argv[2], "n"), await run(process.argv[3], "j")]; fs.writeFileSync(process.argv[4] + "/node.json", JSON.stringify(n, null, 1)); fs.writeFileSync(process.argv[4] + "/java.json", JSON.stringify(j, null, 1));
  const skip = new Set(["tids", "_t"]); /* 묶음 id · 접미사(실행마다 다름) */ let bad = 0, ok = 0;
  for (const k of [...new Set([...Object.keys(n), ...Object.keys(j)])]) { if (skip.has(k)) continue; const a = JSON.stringify(n[k]), b = JSON.stringify(j[k]); if (a === b) ok++; else { bad++; console.log("✗ " + k + "\n   Node " + a + "\n   Java " + b); } }
  for (const [w, R] of [["Node", n], ["Java", j]]) { const f = C.check ? C.check(R) : []; console.log((f.length ? "✗ " : "✓ ") + w + " 계약 기대값 " + (f.length ? f.length + "건 어긋남\n   " + f.join("\n   ") : "통과")); if (f.length) bad++; }
  console.log((bad ? "✗" : "✓") + " 통합 센터 대조 " + ok + "건 같음 · " + bad + "건 다름"); process.exit(bad ? 1 : 0); })().catch(e => { console.error(e); process.exit(2); });
' $N/tests/contract-group.js http://127.0.0.1:9621 http://127.0.0.1:9622 $OUT; RC=$?
kill $NP $JP; wait 2>/dev/null; exit $RC
