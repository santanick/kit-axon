# 디디쌤 운영 서버 — 전자정부 표준프레임워크 에디션
# 빌드: docker build -f service-egov/Dockerfile .  (저장소 루트에서; 화면은 service/build-public.js 결과를 함께 담는다)
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY service-egov/pom.xml .
COPY service-egov/src ./src
ARG PROFILE=
RUN mvn -q -B package -DskipTests ${PROFILE:+-P$PROFILE}

FROM node:22-slim AS pub
WORKDIR /w
COPY didisam ./didisam
COPY service/build-public.js ./service/
RUN cd service && node build-public.js ../didisam public
# 가디언 보안 홈 종합 점수 스냅숏(② · ③) — Node 이미지와 같은 파일
COPY security/score.js security/checklist.json ./sec/security/
COPY security/findings/seed.json ./sec/security/findings/
RUN node sec/security/score.js --snapshot /w/security-score.json

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /src/target/didisam-egov.war app.war
COPY --from=pub /w/service/public ./public
COPY --from=pub /w/security-score.json ./security-score.json
ENV PUBLIC_DIR=/app/public PORT=8080 SECURITY_SCORE_FILE=/app/security-score.json
USER 1000
EXPOSE 8080
CMD ["java", "-jar", "app.war"]
