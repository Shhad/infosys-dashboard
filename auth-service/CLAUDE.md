# auth-service — CLAUDE.md

Headless identity service for the Task Dashboard. Owns passwords, issues **RS256 JWTs**,
and publishes the public key (JWKS + shared PEM volume) so other services validate tokens
locally. **No UI** — it is an API only, consumed by the SPA and trusted by task-service.

See `README.md` here for the endpoint table; this file is the engineering map.

## Stack

- **Python 3** + **FastAPI** (`0.115.x`), served by **uvicorn**.
- **SQLAlchemy 2.x** ORM over **PostgreSQL** via **psycopg v3** (`psycopg[binary]`).
- **passlib[argon2]** for password hashing (Argon2).
- **pyjwt** + **cryptography** for RS256 signing / JWKS.
- **pydantic-settings** for environment-driven config.

Runs in a Docker image (see `Dockerfile`); not run standalone in normal dev — it comes up
via the root `docker-compose.yml` after `auth-db` is healthy.

## Layout (`app/`)

| File | Responsibility |
|------|----------------|
| `main.py` | App factory: lifespan (load/gen keys → wait for DB → create tables → seed admin), CORS, exception handlers, router wiring, `/health`, `/.well-known/jwks.json`. |
| `config.py` | `Settings` (pydantic-settings). Normalizes the DB URL to the `postgresql+psycopg://` driver; parses `CORS_ORIGINS` into a list. |
| `db.py` | SQLAlchemy `engine`, `SessionLocal`, declarative `Base`. |
| `models.py` | `User` table (`id` UUID PK, `email` unique, `password_hash`, `role`, `created_at`). |
| `schemas.py` | Pydantic request/response models. |
| `repository.py` | DB access helpers (`get_by_email`, `create`, …). |
| `security.py` | Password hashing/verify, RS256 keypair load-or-generate, token issue/decode, JWKS, `kid` derivation. |
| `deps.py` | FastAPI dependencies (current-user / role guards). |
| `errors.py` | `AppError` + exception handlers producing the `{ "error": { code, message } }` envelope. |
| `routers/auth.py` | `/register`, `/login`, `/users/me`. |
| `routers/admin.py` | `/admin/users` (create/list), `/admin/users/{id}/promote` — ADMIN only. |

## Authentication & keys (important)

- The **RS256 keypair** lives in the shared `keys` volume (`/keys/private.pem`,
  `/keys/public.pem`). `load_or_generate_keys()` (called in the lifespan startup) loads
  the keys if both files exist, otherwise generates a 2048-bit RSA key **once** and writes
  both PEMs. Generating only-when-missing means keys persist across restarts (live tokens
  stay valid) and task-service can read the public key for **local** validation (NFR-2).
- **Never** add a code path that regenerates keys on every boot — it would invalidate all
  issued tokens and break task-service validation.
- JWT payload: `sub` (user id), `email`, `role`, `iat`, `exp`. Header carries a `kid`
  derived from the SHA-256 of the DER public key (first 16 b64url chars). Default TTL is
  `JWT_EXPIRES_IN` seconds (900).
- `task-service` only ever needs the **public** key; the private key never leaves this
  service.

## Bootstrap admin

On startup `_seed_admin()` idempotently inserts an ADMIN from `BOOTSTRAP_ADMIN_EMAIL` /
`BOOTSTRAP_ADMIN_PASSWORD` **only if that email is missing**. A restart never duplicates
or overwrites it. Keep seeding idempotent.

## Configuration (env)

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUTH_DB_URL` | Postgres URL (auto-normalized to `+psycopg`) | `postgresql://auth:auth@auth-db:5432/authdb` |
| `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH` | RS256 PEM paths in the `keys` volume | `/keys/private.pem`, `/keys/public.pem` |
| `JWT_EXPIRES_IN` | Access-token TTL (seconds) | `900` |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | Seed admin | `admin@example.com` / `change-me` |
| `CORS_ORIGINS` | Allowed frontend origin(s), comma-separated | `http://localhost:3000` |

## Conventions

- Every error response uses `{ "error": { "code", "message" } }` — raise `AppError`
  (or rely on the registered handlers) rather than returning ad-hoc shapes.
- All configuration comes from the environment (NFR-5); don't hardcode secrets or URLs.
- Endpoints and rules trace to `SPEC §5.1` / `§4.1`; keep those references when relevant.

## Verify

`verify.sh` and `verify_restart.sh` exercise the API (the latter confirms keys/admin
survive a restart). Run with the stack up and `.env` in place.
