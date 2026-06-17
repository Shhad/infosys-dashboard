## 1. Project scaffold & build

- [x] 1.1 Create `task-service/` Spring Boot 3 project targeting Java 21 with a build wrapper (Gradle Kotlin DSL or Maven) committed so the Docker build is reproducible (no host Java needed)
- [x] 1.2 Add dependencies: spring-boot-starter-web, spring-boot-starter-data-jpa, spring-boot-starter-validation, spring-boot-starter-security, PostgreSQL JDBC driver, a JWT/JOSE library (`nimbus-jose-jwt` or `jjwt`)
- [x] 1.3 Add `application.yml` reading all config from env: `TASK_DB_URL`, `TASK_DB_USER`, `TASK_DB_PASSWORD`, `JWT_PUBLIC_KEY_PATH` (+ optional `AUTH_JWKS_URL`), `CORS_ALLOWED_ORIGIN`; set Hibernate `ddl-auto: update`
- [x] 1.4 Add a `task-service/README.md` stub documenting endpoints (SPEC §5.2) and how the service is run via root compose

## 2. Data model & persistence

- [x] 2.1 Define `Status` enum: `OPEN`, `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`
- [x] 2.2 Implement `Card` JPA entity: UUID `id` (app-generated), `title` NOT NULL, `description` nullable text, `status` `@Enumerated(STRING)` default `OPEN`, `creator_id` UUID NOT NULL, `assignee_id` UUID nullable, `created_at`/`updated_at` `TIMESTAMPTZ` via `@CreationTimestamp`/`@UpdateTimestamp` (no FK on creator/assignee)
- [x] 2.3 Implement `CardRepository` (Spring Data JPA) with a query for USER visibility: `creator_id = :me OR assignee_id = :me`

## 3. JWT validation & security

- [x] 3.1 Load the RS256 public key once at startup from `JWT_PUBLIC_KEY_PATH`; fail fast with a clear error if absent (document JWKS-at-startup as the fallback key source)
- [x] 3.2 Implement a JWT auth filter that verifies signature + `exp` locally (small clock-skew leeway), with NO network call to auth-service on the validation path (NFR-2); extract `sub` and `role` into a request principal
- [x] 3.3 Configure `SecurityFilterChain`: permit `GET /api/health` and CORS preflight, require authentication everywhere else (unauthenticated protected request → `401`)
- [x] 3.4 Map invalid/missing/expired/bad-signature tokens to `401` with the standard error envelope

## 4. API endpoints & authorization (SPEC §4.2 / §5.2)

- [x] 4.1 `GET /api/cards`: ADMIN → all; USER → own-created OR assigned (via repository query)
- [x] 4.2 `POST /api/cards`: validate `title` (missing → `400`); USER → force `creator_id`+`assignee_id` to self, ignoring supplied assignee; ADMIN → `creator_id` self, honor supplied `assignee_id`; return `201` Card
- [x] 4.3 `PATCH /api/cards/{id}/status`: validate status in enum (else `400`); ADMIN any card, USER only own-created (else `403`); missing → `404`; return `200` Card
- [x] 4.4 `PATCH /api/cards/{id}/assignee`: ADMIN any card, USER only own-created (else `403`); missing → `404`; return `200` Card
- [x] 4.5 `DELETE /api/cards/{id}`: ADMIN any card, USER only own-created (else `403`); missing → `404`; return `204`
- [x] 4.6 `GET /api/health`: unauthenticated, return `200 { "status": "ok" }`

## 5. Cross-cutting concerns

- [x] 5.1 Implement `@RestControllerAdvice` mapping `ApiException` and framework exceptions (validation `400`, auth `401`, access-denied `403`, not-found `404`) to `{ "error": { "code", "message" } }`
- [x] 5.2 Configure CORS to allow the frontend origin (`CORS_ALLOWED_ORIGIN`), methods, and the `Authorization` header (NFR-4)
- [x] 5.3 Implement the `Card` response DTO/serialization to the exact shape `{ id, title, description, status, creator_id, assignee_id, created_at, updated_at }`

## 6. Containerization & compose

- [x] 6.1 Write a multi-stage `task-service/Dockerfile`: JDK 21 build stage compiles the fat JAR; slim JRE 21 runtime stage runs it (no host Java)
- [x] 6.2 Extend root `docker-compose.yml`: add `task-db` (`postgres:16-alpine`, `pg_isready` healthcheck, `taskdb`/`task` creds)
- [x] 6.3 Extend root `docker-compose.yml`: add `task-service` (build, port `8080`, `depends_on: { task-db: service_healthy }`, env from `.env`, mount `keys` volume read-only at `/keys`)
- [x] 6.4 Confirm `.env.example` documents all task-service keys (TASK_DB_*, JWT_PUBLIC_KEY_PATH, AUTH_JWKS_URL, CORS origin)

## 7. Verification against acceptance criteria

- [x] 7.1 Bring up the stack (`docker compose up --build`); confirm `task-db` healthy then `task-service` starts and `GET /api/health` → `200`
- [x] 7.2 AC-4: request with a tampered/bad-signature token → `401`; confirm no network call to auth-service on the validation path
- [x] 7.3 AC-5: USER sees exactly own-created + assigned cards, not others'
- [x] 7.4 AC-6: ADMIN sees all cards
- [x] 7.5 AC-7: USER create with foreign `assignee_id` → `creator_id`==`assignee_id`==self
- [x] 7.6 AC-8: ADMIN create with `assignee_id = B` → card assigned to B
- [x] 7.7 AC-9: USER changes status of own card `OPEN` → `DONE` → `200`
- [x] 7.8 AC-10: USER changes status of a card assigned-but-not-created-by them → `403`
- [x] 7.9 AC-11: `PATCH /status` with value outside the enum → `400`
- [x] 7.10 AC-12: USER deletes another's card → `403`; ADMIN deletes any card → `204`
- [x] 7.11 AC-14: any protected endpoint without `Authorization` → `401`
- [x] 7.12 Write a `verify.sh` curl harness (mirroring auth-service) exercising AC-4…AC-12 end-to-end against the running stack
