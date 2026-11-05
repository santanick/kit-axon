#!/usr/bin/env bash
# 실제 전자정부 표준프레임워크 실행환경(RTE 5.0.x)으로 빌드 · 기동 확인 — maven.egovframe.go.kr 접속 가능한 PC에서 실행
# 필요: JDK 17+, Maven 3.9+.  사용: bash scripts/verify-egov.sh
set -euo pipefail
cd "$(dirname "$0")/.."
echo "① 표준프레임워크 저장소 접속"; curl -s -o /dev/null -w '   HTTP %{http_code}\n' https://maven.egovframe.go.kr/maven/
echo "② 실제 RTE로 빌드(-Pegov, shim 제외)"; mvn -q -B -Pegov clean package -DskipTests
W=target/didisam-egov.war
unzip -l "$W" > target/war-list.txt
echo "③ war에 들어간 실행환경 라이브러리"; grep -o 'egovframe-rte-[a-z-]*-[0-9.]*\.jar' target/war-list.txt | sort -u | sed 's/^/   /' || echo '   (없음)'
if grep -q 'WEB-INF/classes/org/egovframe/' target/war-list.txt; then echo "   ✗ shim 클래스가 남아 있음"; exit 1; else echo "   ✓ shim 없음(실제 RTE 사용)"; fi
echo "④ 기동(빈 구성 확인 — DB 없이도 진입 화면은 열림)"
PORT=18090 COOKIE_SECURE=0 JDBC_URL=jdbc:postgresql://127.0.0.1:1/none java -jar "$W" > target/verify.log 2>&1 & P=$!
for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:18090/egov/main.do && break; sleep 1; done
if curl -s http://127.0.0.1:18090/egov/main.do | grep -q '표준프레임워크 5.0 에디션'; then echo "   ✓ JSP 진입 화면 정상"; R=0; else echo "   ✗ 기동 실패 — target/verify.log 확인"; R=1; fi
kill $P 2>/dev/null || true
grep -m3 -E 'APPLICATION FAILED|Error creating bean' target/verify.log || true
echo "⑤ 결과: $([ $R = 0 ] && echo 통과 || echo 실패)  — 전체 대조 테스트는 이 war를 공유해 주시면 서버 환경에서 이어서 돌립니다($W)"
exit $R
