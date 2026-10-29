# 디디쌤 스튜디오 운영 이미지 — 빌드 컨텍스트는 저장소 루트: docker build -f service/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /w
COPY service/server/package.json service/server/package-lock.json ./server/
# (선택) 사내 프록시 CA: docker build --secret id=ca,src=ca.crt …
RUN --mount=type=secret,id=ca,required=false cd server && if [ -f /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi && npm ci --omit=dev --no-fund --no-audit
COPY didisam ./didisam
COPY service/build-public.js ./
RUN node build-public.js ./didisam ./public

FROM node:22-alpine
ENV NODE_ENV=production PORT=8080 PUBLIC_DIR=/app/public
WORKDIR /app
COPY --from=build /w/server/node_modules ./server/node_modules
COPY service/server/*.js service/server/package.json ./server/
COPY --from=build /w/public ./public
USER node
EXPOSE 8080
CMD ["node", "server/index.js"]
