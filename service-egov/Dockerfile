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

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /src/target/didisam-egov.war app.war
COPY --from=pub /w/service/public ./public
ENV PUBLIC_DIR=/app/public PORT=8080
USER 1000
EXPOSE 8080
CMD ["java", "-jar", "app.war"]
