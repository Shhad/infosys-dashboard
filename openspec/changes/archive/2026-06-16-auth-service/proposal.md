## Why

The Task Dashboard is a microservices system where identity is owned by a single headless `auth-service`. Nothing else in the system can be built or tested until users can register, log in, and obtain an RS256-signed JWT that other services validate locally. This change delivers that foundation as **iteration 1** of the project: a self-contained, Dockerized auth-service with its own PostgreSQL database that can be started and exercised end-to-end on its own.

## What Changes

- New `auth-service` (Python 3 + FastAPI) exposing a **headless** API (no UI): `POST /register`, `POST /login`, `GET /users/me`, `GET /.well-known/jwks.json`, `POST /admin/users`, `POST /admin/users/{id}/promote`, `GET /admin/users`, and `GET /health`.
- PostgreSQL-backed `users` table (UUID id, unique email, bcrypt/argon2 `password_hash`, `role` ENUM `ADMIN|USER`, `created_at`).
- **RS256 JWT issuance** signed with a private key; public key published via JWKS so `task-service` can validate locally (no network call per request — NFR-2). JWT claims: `sub`, `email`, `role`, `exp`, `iat`.
- **Idempotent bootstrap admin** seeded at startup from `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` (env, not migration — never overwrites an existing user).
- Role-based authorization: admin-only endpoints return `403` for `USER`; protected endpoints return `401` without a valid token.
- Containerization: `auth-service/Dockerfile` plus a root `docker-compose.yml` running `auth-service` + `auth-db` (Postgres) with healthchecks and `depends_on: service_healthy`. `.env.example` documents all keys. This compose file is extended by later iterations (task-service, frontend).
- CORS configured to allow the frontend origin (NFR-4).

## Capabilities

### New Capabilities
- `user-authentication`: self-service registration, login, password hashing, RS256 JWT issuance, JWKS publication, `GET /users/me`, and idempotent bootstrap-admin seeding.
- `user-administration`: admin-only user creation, promotion to ADMIN, and listing users (so an admin can later choose card assignees).
- `auth-service-runtime`: containerized service + database, health endpoint, env-driven configuration/secrets, and one-command local startup via Docker Compose.

### Modified Capabilities
<!-- None — this is the first change; no existing specs. -->

## Impact

- **New code/dirs**: `auth-service/` (FastAPI app, models, JWT/crypto, migrations or table init, Dockerfile), root `docker-compose.yml`, `.env.example`, RS256 key handling.
- **APIs**: introduces the entire auth-service contract (SPEC §5.1).
- **Dependencies**: FastAPI, Uvicorn, SQLAlchemy (or equivalent), psycopg, passlib/argon2 or bcrypt, python-jose/pyjwt + cryptography, Postgres 16 image.
- **Downstream**: `task-service` (iteration 2) will consume the published public key / JWKS; the frontend (iteration 3) will call `/register` and `/login`.
- **Acceptance**: targets AC-1, AC-2, AC-3, AC-13, AC-14 from SPEC §9 (and partially AC-4's signing side).
