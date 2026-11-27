# 디디쌤 운영 서버 — 전자정부 표준프레임워크 에디션
# 빌드: docker build -f service-egov/Dockerfile .  (저장소 루트에서; 화면은 service/build-public.js 결과를 함께 담는다)
# 보안(가디언 5차 h2): 기반 이미지 3개 다이제스트 고정(멀티 아키텍처 인덱스, 2026-11-25 mirror.gcr.io · Docker Hub 두 경로 일치 확인) — 갱신은 Dependabot docker PR
FROM maven:3.9-eclipse-temurin-26@sha256:b2c1ad85954592f9928e84327c65201f308ad9b5d8ed7d5b823717c97bf23fbb AS build
WORKDIR /src
COPY service-egov/pom.xml .
COPY service-egov/src ./src
ARG PROFILE=
RUN mvn -q -B package -DskipTests ${PROFILE:+-P$PROFILE}

FROM node:26.13.0-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072 AS pub
WORKDIR /w
COPY didisam ./didisam
COPY service/build-public.js ./service/
RUN cd service && node build-public.js ../didisam public
# 가디언 보안 홈 종합 점수 스냅숏(② · ③) — Node 이미지와 같은 파일
COPY security/score.js security/checklist.json ./sec/security/
COPY security/findings/seed.json ./sec/security/findings/
RUN node sec/security/score.js --snapshot /w/security-score.json

FROM eclipse-temurin:24-jre@sha256:8cb2387a28af84cf0db0948d9c67d4480192f4e567027a3963f145d218e8b4f2
WORKDIR /app
COPY --from=build /src/target/didisam-egov.war app.war
COPY --from=pub /w/service/public ./public
COPY --from=pub /w/security-score.json ./security-score.json
ENV PUBLIC_DIR=/app/public PORT=8080 SECURITY_SCORE_FILE=/app/security-score.json
USER 1000
EXPOSE 8080
CMD ["java", "-jar", "app.war"]
