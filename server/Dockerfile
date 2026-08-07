# FREE_DEPLOY_TEMP: Render 무료 배포용. AWS EC2 이전 시 재검토(빌드 방식 자체는 재사용 가능)
# 1단계: Gradle로 bootJar 빌드
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
RUN chmod +x gradlew

COPY src src
RUN ./gradlew bootJar -x test --no-daemon

# 2단계: JRE만 담은 실행 이미지
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

# Render 무료 티어(512MB) 메모리 제한에 맞춰 힙 상한 지정
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
