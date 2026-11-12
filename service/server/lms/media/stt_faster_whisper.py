#!/usr/bin/env python3
# v32 STT 어댑터(faster-whisper) — 사용: stt_faster_whisper.py <음성 파일> <언어 코드> → 표준출력 WebVTT
# 모델: WHISPER_MODEL(기본 small · 없으면 내려받음, WHISPER_MODEL_DIR에 보관) · 장치 CPU int8. Node · Java 작업기가 같은 규약(MEDIA_STT_CMD)으로 부른다.
import os, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

def ts(x):
    h = int(x // 3600); m = int(x % 3600 // 60); s = x % 60
    return "%02d:%02d:%06.3f" % (h, m, s)

def main():
    if len(sys.argv) < 3:
        print("usage: stt_faster_whisper.py <audio> <lang>", file=sys.stderr); sys.exit(2)
    audio, lang = sys.argv[1], sys.argv[2]
    model = WhisperModel(os.environ.get("WHISPER_MODEL", "small"), device="cpu", compute_type="int8",
                         download_root=os.environ.get("WHISPER_MODEL_DIR") or None, cpu_threads=int(os.environ.get("WHISPER_THREADS", "2")))
    # 음성은 ffmpeg로 16kHz 모노 float로 풀어 넘긴다(PyAV 판 차이에 영향받지 않게)
    pcm = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-i", audio, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], check=True, capture_output=True).stdout
    wav = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
    segs, _ = model.transcribe(wav, language=lang, vad_filter=True, beam_size=1)
    out = ["WEBVTT", ""]
    for s in segs:
        t = (s.text or "").strip()
        if not t or s.end <= s.start:
            continue
        out += ["%s --> %s" % (ts(s.start), ts(s.end)), t, ""]
    sys.stdout.write("\n".join(out) + "\n")

if __name__ == "__main__":
    main()
