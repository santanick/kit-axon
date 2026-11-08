#!/bin/bash
# run.js를 끝날 때까지 이어서 실행(실행기 qa-run.sh 1회 280초 제한 대응) → similar.js → sheet.js → 마지막 줄 = 판정 요약(통과면 exit 0, 미달이면 exit 4)
# 사용: tests/ui/hp-visual/run-all.sh <출력 폴더> [run.js 인자...]   (예: --type k12 · --ids a,b · --force)
# 실행기 경로는 QA_RUN(기본: 실행기 없이 node로 직접)으로 준다. 예: QA_RUN=$SP/qa20/qa-run.sh
set -u; OUT="${1:?출력 폴더}"; shift; D="$(cd "$(dirname "$0")" && pwd)"; RUN="${QA_RUN:-}"
for i in $(seq 1 12); do
  if [ -n "$RUN" ]; then QA_APP=1 "$RUN" "$D/run.js" --out "$OUT" "$@"; else node "$D/run.js" --out "$OUT" "$@"; fi; rc=$?
  [ $rc -eq 3 ] && { set -- $(printf '%s\n' "$@" | grep -v '^--force$'); continue; }
  [ $rc -ne 0 ] && { echo "run.js 실패 rc=$rc"; exit $rc; }; break
done
T=""; prev=""; for a in "$@"; do [ "$prev" = "--type" ] && T="--type $a"; prev="$a"; done
node "$D/similar.js" --in "$OUT" $T && node "$D/sheet.js" --in "$OUT" $T || exit $?
# 판정 요약 한 줄(유형 디자이너 통과 기준): 유형별 ①엄격 · ②첫 화면 닮음 짝 수 · 대비 미달 · 숫자 의심 · 15종 미만 → 모두 0이면 OK
echo; cat "$OUT/similar/verdict.txt"; grep -q " NG " "$OUT/similar/verdict.txt" && exit 4; exit 0
