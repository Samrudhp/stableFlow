FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn -pl blockchain-service -am package -DskipTests

FROM amazoncorretto:21-alpine
WORKDIR /app
COPY --from=build /workspace/blockchain-service/target/blockchain-service-0.1.0-SNAPSHOT.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
