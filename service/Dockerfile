# 디디쌤 스튜디오 운영 이미지 — 빌드 컨텍스트는 저장소 루트: docker build -f service/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /w
COPY service/server/package.json service/server/package-lock.json ./server/
# (선택) 사내 프록시 CA: docker build --secret id=ca,src=ca.crt …
RUN --mount=type=secret,id=ca,required=false cd server && if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi && npm ci --omit=dev --no-fund --no-audit
COPY didisam ./didisam
COPY service/build-public.js ./
RUN node build-public.js ./didisam ./public

# v32 미디어: 자막용 음성 인식(whisper.cpp) — 정적 빌드 + base 모델(다국어). 빌드 인자 WHISPER_MODEL_NAME으로 small 등 교체
FROM alpine:3.20 AS whisper
ARG WHISPER_REF=v1.7.4
ARG WHISPER_MODEL_NAME=ggml-base.bin
RUN apk add --no-cache build-base cmake git curl \
 && git clone --depth 1 --branch ${WHISPER_REF} https://github.com/ggerganov/whisper.cpp /src \
 && cmake -S /src -B /b -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_EXAMPLES=ON \
 && cmake --build /b -j --config Release --target whisper-cli \
 && mkdir -p /opt/whisper && cp /b/bin/whisper-cli /opt/whisper/ \
 && curl -fL -o /opt/whisper/ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${WHISPER_MODEL_NAME}

FROM node:22-alpine
ENV NODE_ENV=production PORT=8080 PUBLIC_DIR=/app/public
# v32 미디어 파이프라인: ffmpeg(HLS 변환 · 음성 추출) + whisper.cpp(STT). 저장소는 MEDIA_STORE(db 기본 · disk · gcs)
RUN apk add --no-cache ffmpeg libstdc++ libgomp
COPY --from=whisper /opt/whisper /opt/whisper
ENV PATH=/opt/whisper:$PATH MEDIA_STT_CMD=/app/server/lms/media/stt-whispercpp.sh MEDIA_STT_ENGINE=whisper.cpp-base WHISPER_MODEL=/opt/whisper/ggml-base.bin MEDIA_TMP=/tmp
WORKDIR /app
COPY --from=build /w/server/node_modules ./server/node_modules
COPY service/server/*.js service/server/package.json ./server/
COPY service/server/lms ./server/lms
COPY service/server/fac ./server/fac
COPY service/server/ledger ./server/ledger
COPY --from=build /w/public ./public
USER node
EXPOSE 8080
CMD ["node", "server/index.js"]
