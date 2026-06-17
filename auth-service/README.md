# auth-service

Headless identity service for the Task Dashboard (Python + FastAPI + PostgreSQL).
Owns passwords, issues **RS256 JWTs**, and publishes the public key so other
services validate tokens locally. No UI.

> Run it as part of the whole stack from the repo root — see the root `README.md`
> (authored in a later iteration). This file documents the service in isolation.

## Run (via the root compose stack)

```bash
cp .env.example .env          # from repo root; set BOOTSTRAP_ADMIN_* 
docker compose up --build     # starts auth-db (healthy) then auth-service
```

Service listens on `http://localhost:8000`.

## Default admin

Seeded idempotently at startup from `BOOTSTRAP_ADMIN_EMAIL` /
`BOOTSTRAP_ADMIN_PASSWORD` (defaults `admin@example.com` / `change-me`).
A restart never duplicates or overwrites it.

## Endpoints (SPEC §5.1)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/register` | – | Self-service signup (role USER) |
| POST | `/login` | – | Returns `{ access_token, token_type, expires_in }` |
| GET | `/users/me` | Bearer | Current identity |
| GET | `/.well-known/jwks.json` | – | RS256 public key (JWKS) |
| POST | `/admin/users` | ADMIN | Create user |
| POST | `/admin/users/{id}/promote` | ADMIN | Promote to ADMIN |
| GET | `/admin/users` | ADMIN | List users |
| GET | `/health` | – | `{ "status": "ok" }` |

Errors use `{ "error": { "code", "message" } }`.

## Keys

The RS256 keypair is generated once into the `keys` volume (`/keys/*.pem`) if
absent, then reused across restarts. task-service mounts the same volume
read-only for local validation — no per-request call to auth-service (NFR-2).
