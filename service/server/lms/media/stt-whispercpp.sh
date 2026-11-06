#!/bin/sh
# v32 STT 어댑터(whisper.cpp) — 사용: stt-whispercpp.sh <음성 파일> <언어 코드> → 표준출력 WebVTT
# 운영 이미지(service/Dockerfile)가 whisper-cli와 모델(WHISPER_MODEL, 기본 /opt/whisper/ggml-base.bin)을 넣는다.
set -eu
IN="$1"; LANG_CODE="${2:-ko}"; MODEL="${WHISPER_MODEL:-/opt/whisper/ggml-base.bin}"
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
ffmpeg -hide_banner -loglevel error -nostdin -y -i "$IN" -ac 1 -ar 16000 -c:a pcm_s16le "$T/a.wav"
whisper-cli -m "$MODEL" -f "$T/a.wav" -l "$LANG_CODE" -t "${WHISPER_THREADS:-2}" -ovtt -of "$T/out" -np >/dev/null 2>&1
cat "$T/out.vtt"
