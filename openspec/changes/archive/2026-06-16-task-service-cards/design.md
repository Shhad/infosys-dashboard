## Context

Iteration 2 of the Task Dashboard. With `auth-service` (iteration 1) issuing RS256 JWTs and publishing the public key, `task-service` is the domain service that owns the kanban **cards**. It is a Java 21 + Spring Boot service with its own PostgreSQL database (`taskdb`, database-per-service) and validates JWTs **locally** with the auth public key — it MUST NOT call auth-service on the token-validation path (NFR-2). It enforces the role/ownership authorization matrix from SPEC §4.2 and speaks the same error envelope and CORS rules as auth-service.

Host environment (unchanged from iteration 1): Windows 11 with Docker running natively inside WSL2 (Ubuntu, systemd); the repo is reachable from WSL at `/mnt/d/programowanie/projects/infosys-dashboard`. **Java is not installed on the host** — the service compiles inside a multi-stage Docker image, so no host toolchain is needed. The auth public key already lives in the named Docker volume `keys` (`/keys/public.pem`), written by auth-service in iteration 1.

## Goals / Non-Goals

**Goals:**
- Implement SPEC §5.2 task-service contract exactly, with the standardized error envelope `{ "error": { "code", "message" } }`.
- Local RS256 JWT verification (signature + `exp`, small clock leeway) using the shared public key; no per-request call to auth-service (NFR-2).
- Persist `cards` in a dedicated `taskdb` Postgres with healthcheck; extend the existing root `docker-compose.yml` (`task-db` + `task-service`).
- Enforce SPEC §4.2: ADMIN sees/edits/deletes all; USER sees own-created OR assigned, edits/deletes only own-created; USER create auto-assigns self; ADMIN sets any assignee; status enum validation.
- Build entirely in Docker (no host Java).

**Non-Goals:**
- No frontend (iteration 3), no full five-service integration/README (iteration 4), no AWS (SPEC §12 deferred).
- No card comments, attachments, history, pagination, search, or enforced status transitions (out of MVP scope; transitions are any→any).
- task-service does not register/manage users or mint tokens — it only consumes them.
- No foreign keys to auth users (`creator_id`/`assignee_id` are cross-service refs); task-service does not verify that an `assignee_id` exists in auth.

## Decisions

**D1 — Framework: Java 21 + Spring Boot 3 (web, data-jpa, validation).** Mandated by SPEC (`task-service` MUST be Java 21 + Spring Boot). Spring Web for REST, Spring Data JPA + Hibernate for persistence, Bean Validation for request `400` handling. Build tool: **Gradle** (Kotlin DSL) or Maven — either is acceptable; pick one and pin via wrapper so the Docker build is reproducible.

**D2 — Local RS256 JWT validation, no network call (NFR-2).** A `OncePerRequestFilter` (or Spring Security resource-server config) reads `Authorization: Bearer <jwt>`, loads the RSA **public key** once at startup from `JWT_PUBLIC_KEY_PATH` (`/keys/public.pem`, volume mounted **read-only**), and verifies signature + `exp` (with small clock-skew leeway) locally. Library: `nimbus-jose-jwt` (or `jjwt`). On any failure (missing header, bad signature, expired, malformed) → `401` with the error envelope. The validated `sub` (UUID) and `role` (`ADMIN|USER`) populate a request-scoped principal. **Alternative considered:** fetching JWKS from `http://auth-service:8000/.well-known/jwks.json` — documented as the fallback, but rejected as the default because it would couple task-service to auth-service availability and risks violating NFR-2 if done per-request. We may fetch JWKS **once at startup** as an alternative key source, but the mounted PEM is primary.

**D3 — Spring Security vs. custom filter.** Use a thin custom JWT auth filter feeding a `SecurityFilterChain` that permits `GET /api/health` and the CORS preflight, and requires authentication everywhere else (so unauthenticated protected requests yield `401`, AC-14). Method/handler-level checks implement the §4.2 ownership rules. Keeping authorization logic in the service layer (not only annotations) makes the ownership matrix explicit and testable. **Alternative:** full Spring Security resource-server with `JwtDecoder` — viable; the custom filter is chosen for transparency and to avoid pulling auth-server discovery behavior.

**D4 — Data model & persistence.** Single `cards` table via JPA entity `Card`: `id` UUID PK (app-generated `UUID.randomUUID()`), `title` NOT NULL, `description` TEXT nullable, `status` stored as `VARCHAR` (`@Enumerated(EnumType.STRING)`) constrained to the enum, default `OPEN`, `creator_id` UUID NOT NULL, `assignee_id` UUID nullable, `created_at`/`updated_at` `TIMESTAMPTZ` (`@CreationTimestamp`/`@UpdateTimestamp`). No FK on creator/assignee (cross-service). Schema created via Hibernate `ddl-auto: update` for MVP (parity with auth-service's `create_all`); Flyway/Liquibase deferred and addable without spec change.

**D5 — Authorization matrix (SPEC §4.2) in the service layer.**
- `GET /api/cards`: ADMIN → all; USER → `WHERE creator_id = :me OR assignee_id = :me` (filtered in the repository query, not in memory).
- `POST /api/cards`: USER → force `creator_id = me` AND `assignee_id = me`, ignoring any supplied `assignee_id` (AC-7); ADMIN → `creator_id = me`, `assignee_id` = supplied value or null (AC-8).
- `PATCH /status`, `PATCH /assignee`, `DELETE`: ADMIN → any card; USER → only `creator_id == me`, else `403` (AC-10, AC-12); missing card → `404`. Visibility (being an assignee) does **not** grant edit rights.
- Status validation: body status outside the enum → `400` (AC-11), enforced before the ownership mutation.

**D6 — Error envelope via `@RestControllerAdvice`.** A global exception handler maps a custom `ApiException(code, message, httpStatus)` and framework exceptions (validation → `400`, auth → `401`, access denied → `403`, not found → `404`) into `{ "error": { "code", "message" } }`, matching auth-service exactly so the frontend has one error shape.

**D7 — Config via Spring `application.yml` + env.** All values from env: `TASK_DB_URL` (JDBC), `TASK_DB_USER`, `TASK_DB_PASSWORD`, `JWT_PUBLIC_KEY_PATH` (and optional `AUTH_JWKS_URL`), `CORS_ALLOWED_ORIGIN` (frontend origin). `.env.example` already documents these (authored in iteration 1); real `.env` is gitignored. No secret in committed source (NFR-5).

**D8 — Port, compose layout, key sharing.** task-service listens on **8080**; `task-db` is `postgres:16-alpine` with a `pg_isready` healthcheck; task-service uses `depends_on: { task-db: condition: service_healthy }`. task-service mounts the existing named `keys` volume **read-only** at `/keys` to read `public.pem`. These services are **added to the existing root `docker-compose.yml`** alongside auth-service/auth-db (not a new compose file), so iteration 4 can bring up the whole stack with one command.

**D9 — Multi-stage Docker build (no host Java).** Stage 1: a JDK 21 image (e.g. `eclipse-temurin:21-jdk` with the Gradle/Maven wrapper) compiles and packages the fat JAR. Stage 2: a slim JRE runtime (`eclipse-temurin:21-jre`) runs the JAR. This keeps the host free of Java and yields a small runtime image. Dependency layers are cached to speed rebuilds.

## Risks / Trade-offs

- **NFR-2 accidentally violated by JWKS-on-request** → Default to the mounted PEM read at startup; if JWKS is used, fetch once at boot and cache, never per request. Covered by an AC-4 check (no network call to auth on the validation path).
- **Clock skew between containers affects `exp`/`iat`** → Allow small leeway (e.g. 30–60s) in the verifier; document it. (This is the iteration-2 resolution of the skew note from iteration 1.)
- **`keys` volume empty / `public.pem` absent at startup** (e.g. task-service started before auth-service ever ran) → Fail fast with a clear startup error; `depends_on` ordering plus operator running the full stack mitigates. JWKS-at-startup is the documented fallback key source.
- **Hibernate `ddl-auto: update` drift** → Acceptable for MVP single-table schema; switch to Flyway before any production/AWS phase. No spec impact.
- **USER could pass another user's `assignee_id` on create to leak/assign** → Server ignores supplied `assignee_id` for USER and forces self (AC-7); only ADMIN may set arbitrary assignee.
- **CORS too permissive** → Restrict to the configured frontend origin (not `*`) since `Authorization` headers are sent (NFR-4), matching auth-service.
- **Cross-service ref integrity** → task-service trusts `sub`/`role` from the validated JWT and does not verify `assignee_id` exists in auth (no FK by design); a stale assignee id is tolerated. Acceptable for MVP.

## Migration Plan

1. Author `task-service/` (Spring Boot app, `Card` entity/repo, controllers, JWT filter + security config, exception advice, `application.yml`, build wrapper, multi-stage `Dockerfile`).
2. Extend root `docker-compose.yml`: add `task-db` (Postgres 16 + healthcheck) and `task-service` (build, port 8080, `depends_on` task-db healthy, mount `keys` read-only, env from `.env`). Confirm `.env.example` task-service keys.
3. `docker compose up --build` → `auth-db`/`auth-service` (existing) + `task-db` healthy → `task-service` starts, connects to `taskdb`, loads `public.pem`.
4. Verify AC-4 (bad signature → 401, no auth call), AC-5…AC-12 via curl using tokens minted by auth-service (admin + a registered USER).
Rollback: `docker compose down` (add `-v` to wipe `taskdb`/keys). No production data at this stage.

## Open Questions

- **Build tool (Gradle vs. Maven)** and **JWT lib (nimbus vs. jjwt)** — both acceptable; choose at implementation time and pin via wrapper/BOM. No spec impact.
- **JWKS-at-startup as alternate key source** — implement only if convenient; the read-only PEM volume is sufficient and primary. No blocker.
- **Flyway vs. `ddl-auto`** — start with `ddl-auto: update`; revisit if the schema evolves. No spec impact.
