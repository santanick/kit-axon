#!/usr/bin/env bash
# 디디쌤 ZAP baseline(수동 · 로컬) — 수동 수집(spider) + 수동 판정만 하는 비공격 스캔입니다. 운영 대상은 사전 공지 후 실행합니다.
# 사용: security/zap/run.sh <대상 URL> [api|pages]   예) security/zap/run.sh https://studio.example.kr api
# 결과: security/zap/out/zap-<종류>.{html,json,md} (커밋 금지 — .gitignore). 이미지는 다이제스트로 고정(ZAP 2.17.0).
set -euo pipefail
TARGET="${1:?대상 URL이 필요합니다}"; KIND="${2:-api}"
case "$KIND" in api|pages) ;; *) echo "종류는 api 또는 pages" >&2; exit 2;; esac
case "$TARGET" in https://*|http://127.0.0.1*|http://localhost*) ;; *) echo "https 또는 로컬 주소만 허용합니다" >&2; exit 2;; esac
IMAGE="ghcr.io/zaproxy/zaproxy@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af" # 2.17.0
DIR="$(cd "$(dirname "$0")" && pwd)"; mkdir -p "$DIR/out"
# -a: 알파 규칙 제외(기본) · -j: AJAX spider(SPA 화면) · -m 3: spider 3분 · -I: WARN은 실패로 보지 않음 · -z: 로그인 없이(공개 화면만)
docker run --rm -u zap -v "$DIR:/zap/wrk:rw" "$IMAGE" zap-baseline.py \
  -t "$TARGET" -c "baseline-$KIND.conf" -j -m 3 -I \
  -r "out/zap-$KIND.html" -J "out/zap-$KIND.json" -w "out/zap-$KIND.md" \
  -z "-config spider.maxDuration=3 -config connection.timeoutInSecs=30"
