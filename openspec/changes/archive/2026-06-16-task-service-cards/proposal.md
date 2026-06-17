## Why

With `auth-service` complete (iteration 1), the system can issue identities and RS256 JWTs but has nothing to act on. This change delivers **iteration 2**: the `task-service` that owns the kanban cards — the core domain of the dashboard. It validates JWTs **locally** with the public key (no per-request call back to auth — NFR-2) and enforces the role/ownership authorization matrix (SPEC §4.2), unblocking the frontend (iteration 3).

## What Changes

- New `task-service` (Java 21 + Spring Boot) on port **8080** with its own PostgreSQL database `taskdb` (database-per-service), added to the **same** root `docker-compose.yml` (`task-db` Postgres with healthcheck + `depends_on: service_healthy`).
- **Local RS256 JWT validation only** (NFR-2): load `public.pem` from the shared `keys` Docker volume mounted **read-only**, verify signature + `exp` with small clock leeway; no network call to auth-service. JWKS URL (`http://auth-service:8000/.well-known/jwks.json`) documented as the alternative. Bad signature / missing token → `401`.
- PostgreSQL-backed `cards` table: UUID id, `title` NOT NULL, nullable `description`, `status` enum `OPEN|TODO|IN_PROGRESS|REVIEW|DONE` default `OPEN`, `creator_id` UUID NOT NULL, nullable `assignee_id` UUID, `created_at`/`updated_at` tz. `creator_id`/`assignee_id` are cross-service refs (no FK).
- Card endpoints (SPEC §5.2): `GET /api/cards`, `POST /api/cards`, `PATCH /api/cards/{id}/status`, `PATCH /api/cards/{id}/assignee`, `DELETE /api/cards/{id}`, `GET /api/health`.
- Role/ownership authorization (SPEC §4.2): ADMIN sees/edits/deletes all cards; USER sees cards where `creator_id == me` OR `assignee_id == me`, but edits/deletes only `creator_id == me`; USER `POST` auto-sets `creator_id` AND `assignee_id` to self (ignoring any supplied `assignee_id`); ADMIN may set any `assignee_id`. Status outside the enum → `400`; acting on another USER's card → `403`; missing card → `404`.
- Same standardized error envelope `{ "error": { "code", "message" } }`; CORS allows the frontend origin (NFR-4). Java is **not** required on the host — the service builds in a multi-stage Docker image.

## Capabilities

### New Capabilities
- `task-cards`: the `cards` domain model, CRUD endpoints, status/assignee mutations, and the role/ownership authorization rules (visibility, auto-assign on USER create, ADMIN-any-assignee, status enum validation). Covers AC-5…AC-12.
- `task-service-runtime`: containerized Java/Spring Boot service + dedicated `taskdb` Postgres (db-per-service), local RS256 JWT validation via the shared public key (NFR-2), CORS, `/api/health`, env-driven config, and the standardized error envelope. Covers AC-4 (validation side), extends AC-15.

### Modified Capabilities
<!-- None — auth-service capabilities (user-authentication, user-administration, auth-service-runtime) are unchanged; task-service consumes the already-published public key. -->

## Impact

- **New code/dirs**: `task-service/` (Spring Boot app, entities, repository, controllers, JWT filter, config, multi-stage `Dockerfile`); additions to the root `docker-compose.yml` (`task-db` + `task-service`); `task-service` keys for `.env.example` (already present as placeholders).
- **APIs**: introduces the entire task-service contract (SPEC §5.2).
- **Dependencies**: Spring Boot (web, data-jpa, validation), PostgreSQL JDBC driver, a JWT/JOSE library (e.g. `jjwt` or `nimbus-jose-jwt`) for RS256 verification, Postgres 16 image.
- **Upstream consumed**: the RS256 public key published by `auth-service` via the `keys` volume (read-only) and/or JWKS; JWT claims `sub`, `email`, `role`.
- **Downstream**: the frontend (iteration 3) calls these endpoints for the kanban board and uses `GET /admin/users` (auth-service) for the admin assignee picker.
- **Acceptance**: targets AC-4 (validation side), AC-5…AC-12 from SPEC §9; extends the one-command startup AC-15.
