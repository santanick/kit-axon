# 디디쌤 스튜디오 운영 이미지 — 빌드 컨텍스트는 저장소 루트: docker build -f service/Dockerfile .
# 보안(SEC-0002 · IAC-02): 기준 이미지 다이제스트 고정 — 갱신은 Dependabot docker PR
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS build
WORKDIR /w
COPY service/server/package.json service/server/package-lock.json ./server/
# (선택) 사내 프록시 CA: docker build --secret id=ca,src=ca.crt …
RUN --mount=type=secret,id=ca,required=false cd server && if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi && npm ci --omit=dev --ignore-scripts --no-fund --no-audit
COPY didisam ./didisam
COPY service/build-public.js ./
RUN node build-public.js ./didisam ./public
# 가디언 보안 홈 종합 점수(② 체크리스트 · ③ 인증 기준 통제) 스냅숏 — ①은 서버가 DB에서 계산
COPY security/score.js security/checklist.json ./sec/security/
COPY security/findings/seed.json ./sec/security/findings/
RUN node sec/security/score.js --snapshot /w/security-score.json

# v32 미디어: 자막용 음성 인식(whisper.cpp) — 정적 빌드 + base 모델(다국어). 빌드 인자 WHISPER_MODEL_NAME으로 small 등 교체
FROM alpine:3.20@sha256:d9e853e87e55526f6b2917df91a2115c36dd7c696a35be12163d44e6e2a4b6bc AS whisper
ARG WHISPER_REF=v1.7.4
ARG WHISPER_MODEL_NAME=ggml-base.bin
# 보안(IAC-03): 소스 커밋 · 모델 sha256 검증 — 모델을 바꾸면 WHISPER_MODEL_SHA256도 함께 넘긴다
ARG WHISPER_SHA=8a9ad7844d6e2a10cddf4b92de4089d7ac2b14a9
ARG WHISPER_MODEL_SHA256=60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe
RUN apk add --no-cache build-base cmake git curl \
 && git clone --depth 1 --branch ${WHISPER_REF} https://github.com/ggerganov/whisper.cpp /src \
 && test "$(git -C /src rev-parse HEAD)" = "${WHISPER_SHA}" \
 && cmake -S /src -B /b -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON \
 && cmake --build /b -j --config Release --target whisper-cli \
 && mkdir -p /opt/whisper && cp /b/bin/whisper-cli /opt/whisper/ \
 && curl -fL -o /opt/whisper/ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${WHISPER_MODEL_NAME} \
 && echo "${WHISPER_MODEL_SHA256}  /opt/whisper/ggml-base.bin" | sha256sum -c -

FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a
ENV NODE_ENV=production PORT=8080 PUBLIC_DIR=/app/public
# v32 미디어 파이프라인: ffmpeg(HLS 변환 · 음성 추출) + whisper.cpp(STT). 저장소는 MEDIA_STORE(db 기본 · disk · gcs)
RUN apk add --no-cache ffmpeg libstdc++ libgomp
# 가디언(보고서 8-4): Node 11-11 보안 릴리스 22.23.5 이상 확인용 — 빌드 기록에 버전을 남긴다(가디언 주간 점검이 대조)
RUN echo "node $(node -v)"
COPY --from=whisper /opt/whisper /opt/whisper
ENV PATH=/opt/whisper:$PATH MEDIA_STT_CMD=/app/server/lms/media/stt-whispercpp.sh MEDIA_STT_ENGINE=whisper.cpp-base WHISPER_MODEL=/opt/whisper/ggml-base.bin MEDIA_TMP=/tmp
WORKDIR /app
COPY --from=build /w/server/node_modules ./server/node_modules
COPY service/server/*.js service/server/package.json ./server/
COPY service/security/kpi.js ./security/kpi.js
COPY --from=build /w/security-score.json ./security-score.json
ENV SECURITY_SCORE_FILE=/app/security-score.json
COPY service/server/lms ./server/lms
COPY service/server/fac ./server/fac
COPY service/server/ledger ./server/ledger
COPY service/server/mileage ./server/mileage
COPY service/server/market ./server/market
COPY --from=build /w/public ./public
USER node
EXPOSE 8080
CMD ["node", "server/index.js"]
