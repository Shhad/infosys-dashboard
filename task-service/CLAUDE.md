# task-service — CLAUDE.md

Java 21 + Spring Boot service owning the kanban **cards**. Has its own PostgreSQL DB
(`taskdb`, database-per-service) and validates JWTs **locally** with the auth-service
RS256 **public** key — it never calls auth-service on the request path (NFR-2).

See `README.md` here for the full endpoint/auth table; this file is the engineering map.

## Stack

- **Java 21**, **Spring Boot 3.3.5** (`spring-boot-starter-parent`).
- **spring-boot-starter-web** (REST), **-data-jpa** (Hibernate), **-validation**,
  **-security**.
- **nimbus-jose-jwt** for RS256 verification.
- **PostgreSQL** JDBC driver (runtime).
- Build: **Maven** (`pom.xml`); runs Java only inside the multi-stage `Dockerfile` —
  **Java is not required on the host**.

## Layout (`src/main/java/com/taskdashboard/taskservice/`)

| Package / file | Responsibility |
|----------------|----------------|
| `TaskServiceApplication.java` | Spring Boot entry point. |
| `card/Card.java` | JPA entity: `id`, `title`, `description`, `status`, `creatorId`, `assigneeId`, `createdAt`, `updatedAt`. |
| `card/Status.java` | Enum `OPEN | TODO | IN_PROGRESS | REVIEW | DONE` (any→any transitions). |
| `card/CardController.java` | REST endpoints under `/api/cards`. |
| `card/CardService.java` | **The authorization matrix (SPEC §4.2)** + card CRUD. |
| `card/CardRepository.java` | Spring Data JPA repo (`findAllByOrderByCreatedAtDesc`, `findVisibleTo`). |
| `card/dto/` | `CreateCardRequest`, `UpdateStatusRequest`, `UpdateAssigneeRequest`, `CardResponse`. |
| `security/JwtAuthFilter.java` | `OncePerRequestFilter` — local RS256 verify + expiry/clock-skew, populates `UserPrincipal`. |
| `security/JwtKeyProvider.java` | Loads the RS256 public key (PEM path, JWKS fallback). |
| `security/SecurityConfig.java` | Spring Security chain: stateless, `GET /api/health` public, everything else authenticated. |
| `security/UserPrincipal.java` | `{ id (UUID), role }`; `isAdmin()` helper. |
| `common/` | `ApiException` (factory: `badRequest`/`forbidden`/`notFound`), `ErrorResponse`, `GlobalExceptionHandler`, `HealthController`. |

Config: `src/main/resources/application.yml`. Tests: `src/test/.../card/CardServiceTest.java`.

## Authorization matrix (SPEC §4.2) — the heart of the service

Enforced in `CardService`; the frontend only mirrors it. Server is authoritative.

- **ADMIN:** sees, edits, reassigns, deletes any card; may set any `assignee_id` on create.
- **USER:** sees cards where `creatorId == me` **OR** `assigneeId == me`; may change
  status / reassign / delete only cards they **created** (`creatorId == me`). Being merely
  the assignee does **not** grant edit rights (AC-10, AC-12).
- **On create:** USER has `creatorId` and `assigneeId` both forced to self (any supplied
  `assigneeId` ignored — AC-7); ADMIN is creator and the supplied `assigneeId` is honored
  (AC-8). New cards start `OPEN`.
- `requireEditable(caller, id)` centralizes the load + edit-rights check (404 if missing,
  403 if not allowed). Route edit operations through it.

## JWT validation (NFR-2)

`JwtAuthFilter` parses the `Bearer` token, verifies the RS256 signature against the loaded
public key, and checks expiry with `jwt.clock-skew-seconds` (60) leeway. **No network call
to auth-service on the request path.** A missing/invalid token leaves the request
unauthenticated → security chain returns `401` for protected endpoints (AC-4, AC-14);
`GET /api/health` stays public. The public key comes from `JWT_PUBLIC_KEY_PATH`
(`/keys/public.pem`, shared read-only volume); `AUTH_JWKS_URL` is a documented fallback,
loaded once at startup. `creator_id` / `assignee_id` are cross-service references to auth
users, **not** DB foreign keys.

## Configuration (env)

| Variable | Purpose | Default |
|----------|---------|---------|
| `TASK_DB_URL` | JDBC URL for `taskdb` | `jdbc:postgresql://task-db:5432/taskdb` |
| `TASK_DB_USER` / `TASK_DB_PASSWORD` | DB credentials | `task` / `task` |
| `JWT_PUBLIC_KEY_PATH` | RS256 public key PEM (primary key source) | `/keys/public.pem` |
| `AUTH_JWKS_URL` | JWKS endpoint (fallback, loaded once at startup) | — |
| `CORS_ORIGINS` | Allowed frontend origin (NFR-4) | `http://localhost:3000` |

`spring.jpa.hibernate.ddl-auto=update` manages the schema; default Spring actuator health
is disabled (we expose our own `/api/health`).

## Conventions

- All endpoints except `GET /api/health` require `Authorization: Bearer <jwt>`.
- Error body everywhere: `{ "error": { "code", "message" } }` — throw `ApiException`
  (`badRequest` / `forbidden` / `notFound`), handled by `GlobalExceptionHandler`.
- `Card` JSON uses snake_case (`creator_id`, `assignee_id`, `created_at`, `updated_at`).
- Keep `SPEC §` / `AC-` references when touching auth rules.

## Build / test / verify

```bash
# Java not needed on host; full build happens in Docker.
docker compose up --build -d
curl http://localhost:8080/api/health      # -> {"status":"ok"}
bash task-service/verify.sh                 # AC-4, AC-5…AC-12, AC-14
```

`CardServiceTest` covers the authorization matrix at the service layer.
