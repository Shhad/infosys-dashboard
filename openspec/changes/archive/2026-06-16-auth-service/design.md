## Context

Iteration 1 of the Task Dashboard. `auth-service` is the system's identity provider and the only component that knows passwords. It is **headless** (API only). It issues RS256 JWTs that downstream services validate locally using a published public key, so auth-service is not on the request path of other services (NFR-2). This design covers a Python/FastAPI service with a dedicated PostgreSQL database, runnable on its own via Docker Compose before task-service and frontend exist.

Host environment: Windows 11 with Docker running natively inside WSL2 (Ubuntu). Python 3.14 is on the Windows host but the service runs in a Linux container, so the container base image pins the Python version. Java is absent on the host but not needed.

## Goals / Non-Goals

**Goals:**
- Implement SPEC §5.1 auth contract exactly, with the standardized error envelope.
- RS256 sign/verify with keys supplied via env/mounted files; publish JWKS.
- Idempotent bootstrap admin from env.
- Dedicated `authdb` Postgres with healthcheck; one-command `docker compose up --build`.
- Establish the root `docker-compose.yml` and `.env.example` that later iterations extend.

**Non-Goals:**
- No task/card logic (iteration 2), no frontend (iteration 3), no AWS (phase 2).
- No password reset, email verification, refresh tokens, or external OAuth (out of MVP scope).
- No rate limiting or account lockout.

## Decisions

**D1 — Framework: FastAPI + Uvicorn.** Mandated by SPEC (`auth-service` MUST be Python+FastAPI). Async-capable, Pydantic validation gives clean `400` handling. Alternative (Flask/Django) rejected per spec and ergonomics.

**D2 — Password hashing: argon2 (argon2-cffi via passlib).** Argon2id is the current recommendation; bcrypt is the allowed fallback. passlib's `CryptContext` makes the algorithm swappable. Never log or return hashes.

**D3 — JWT: RS256 with `pyjwt` + `cryptography`.** Keys are a PEM pair. Strategy: generate the keypair at container startup into `JWT_PRIVATE_KEY_PATH`/`JWT_PUBLIC_KEY_PATH` **only if absent**, so a key mounted via env/volume is respected and reused across restarts; otherwise generate to a shared volume so task-service can read the public key. JWKS is derived from the public key (kid = stable fingerprint). Chosen over an opaque-token + introspection model because local validation is an explicit NFR. Alternative HS256 rejected: symmetric secret would have to be shared with task-service, defeating key separation.

**D4 — Key sharing with task-service.** A named Docker volume (`keys`) mounted read-write in auth-service and read-only in task-service holds `public.pem`. JWKS endpoint is the runtime alternative. The volume keeps task-service fully offline from auth-service at request time. Private key stays only in auth-service's mount.

**D5 — Persistence: SQLAlchemy 2.x + psycopg (v3).** Table creation via a lightweight startup migration (SQLAlchemy `create_all` or Alembic). For MVP a single `users` table is created idempotently at startup; Alembic is optional and can be added without spec change. UUID primary keys generated app-side (`uuid4`).

**D6 — Bootstrap seeding at startup (not a migration).** Per SPEC §4.1: read env, look up by email, insert only if missing, hashing the password through the same path as normal users. Keeps the plaintext/hardcoded hash out of git history and migrations.

**D7 — Config via Pydantic Settings.** All values (`AUTH_DB_URL`, key paths, `JWT_EXPIRES_IN`, bootstrap creds, CORS origin) read from env. `.env.example` documents every key; real `.env` is gitignored.

**D8 — Error envelope via exception handlers.** A custom `AppError(code, message, status)` plus FastAPI exception handlers convert all failures (including validation) into `{ "error": { "code", "message" } }`.

**D9 — Port & compose layout.** auth-service listens on `8000`; `auth-db` is Postgres 16 with `pg_isready` healthcheck; `auth-service` uses `depends_on: condition: service_healthy`. The root compose file is authored now and grown in later iterations (task-db/task-service/frontend), so its service/network/volume naming anticipates them.

## Risks / Trade-offs

- **Python 3.14 dependency availability** → Pin the container base image to a stable tag (e.g. `python:3.12-slim`) rather than tracking the host's 3.14, avoiding wheels-not-yet-published issues. The host Python version is irrelevant to the container.
- **Keypair regenerated on each restart would invalidate live tokens** → Mitigated by generate-only-if-absent into a persistent named volume; tokens survive restarts.
- **Clock skew between services affecting `exp`/`iat`** → Allow small leeway in task-service verification (iteration 2 concern); document it.
- **Docker socket permission on the host (user not in `docker` group)** → Operator action required before `docker compose` works; called out in README/run instructions, not a code issue.
- **CORS too permissive** → Restrict allowed origin to the configured frontend URL rather than `*`, especially since credentials/Authorization headers are used.

## Migration Plan

1. Author `auth-service/` app, `Dockerfile`, root `docker-compose.yml`, `.env.example`.
2. `cp .env.example .env`, fill bootstrap admin + DB creds.
3. `docker compose up --build` → `auth-db` healthy → `auth-service` starts, seeds admin, generates keys.
4. Verify AC-1, AC-2, AC-3, AC-13, AC-14 via curl/HTTP.
Rollback: `docker compose down -v` removes containers and volumes (fresh DB + keys). No production data at this stage.

## Open Questions

- JWKS vs. shared PEM volume for task-service: implement **both** (volume primary, JWKS available); task-service iteration picks one. No blocker now.
- Alembic vs. `create_all`: start with `create_all`; revisit if schema evolves. No spec impact.
