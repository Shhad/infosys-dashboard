# Multi-stage build — no Java toolchain required on the host (task 6.1).
# Reproducibility comes from the pinned build image + pom.xml (we build in
# Docker, so a committed Gradle/Maven wrapper jar is unnecessary; *.jar is also
# gitignored repo-wide).

# ---- build stage ----
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build

# Cache dependencies: resolve from pom.xml before copying sources.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package

# ---- runtime stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/task-service.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
