# Phase 1 — auth-service (DONE)

> Written 2026-06-16 so work can resume after a context-window clear.
> Single source of truth for requirements: `context/SPEC.md`.
> OpenSpec capability map: `openspec/specs/spec.md`.
> This change is archived at `openspec/changes/archive/2026-06-16-auth-service/`.

## Status: ✅ complete and verified end-to-end (16/16 acceptance checks green)

Built, containerized, and tested against real PostgreSQL in Docker (WSL2).
Covers acceptance criteria **AC-1, AC-2, AC-3, AC-13, AC-14**, the auth slice of
**AC-15**, and the signing side of **AC-4**.

## Environment (host facts — important)

- Windows 11. **Docker runs natively inside WSL2 Ubuntu** (systemd), NOT Docker
  Desktop. `docker` is NOT on the Windows PATH → invoke as
  `wsl -e bash -lc "cd /mnt/d/programowanie/projects/infosys-dashboard && docker compose ..."`.
- WSL user `baszak` IS in the `docker` group (fixed this session) → daemon access OK.
- Host has Node 24.16, Python 3.14.6, git, openspec 1.4.1. **Java is NOT installed**
  on host — fine, task-service (Phase 2) builds in a multi-stage Docker image.
- The repo on Windows `D:\...` is reachable from WSL at
  `/mnt/d/programowanie/projects/infosys-dashboard`.
- Quoting tip: complex bash run via `wsl -e bash -lc "..."` from PowerShell mangles
  nested quotes — put scripts in a `.sh` file and run `bash path/to/file.sh`.

## What was built

```
auth-service/
  Dockerfile                 # python:3.12-slim (deliberately 3.12, not host 3.14)
  requirements.txt           # fastapi, uvicorn, sqlalchemy2, psycopg3, passlib[argon2], pyjwt, cryptography, pydantic-settings, email-validator
  README.md                  # service-level docs
  verify.sh / verify_restart.sh   # AC harness (curl-based)
  app/
    main.py        # FastAPI app, lifespan startup (keys → wait DB → create_all → seed admin), CORS, exception handlers, /health, /.well-known/jwks.json
    config.py      # pydantic-settings; normalizes postgresql:// -> postgresql+psycopg://
    db.py          # SQLAlchemy engine/session/Base
    models.py      # User (UUID id, unique email, password_hash, role default USER, created_at tz)
    schemas.py     # Pydantic request/response models
    repository.py  # get_by_email/id, create, list_all, set_role
    security.py    # argon2 hashing; RS256 load_or_generate_keys; issue/decode token; jwks()
    deps.py        # get_db, get_current_claims/user, require_admin
    routers/auth.py    # /register, /login, /users/me
    routers/admin.py   # /admin/users (create), /admin/users/{id}/promote, /admin/users (list)
docker-compose.yml   # ROOT: auth-db (postgres:16-alpine, pg_isready healthcheck) + auth-service (depends_on service_healthy, port 8000, keys volume)
.env.example         # ROOT: all keys for auth + placeholders for task-service & frontend
.env                 # ROOT: local copy (gitignored)
.gitignore           # adds .env, *.pem, __pycache__, node_modules, dist
```

## Key design decisions (locked)

- **RS256 asymmetric JWT.** Private key signs in auth-service; public key validated
  locally elsewhere (NFR-2). Chosen over HS256 to avoid sharing a symmetric secret.
- **Keys location:** generated at startup into the Docker **named volume `keys`**
  (`/keys/private.pem`, `/keys/public.pem`) only if absent, then reused across
  restarts. Physical path inside WSL: `/var/lib/docker/volumes/infosys-dashboard_keys/_data`.
  NOT in repo, NOT on Windows FS, `*.pem` gitignored. Phase 2 task-service mounts
  this volume **read-only**; JWKS endpoint is the alternative.
- **Passwords:** argon2 via passlib. Never logged/returned.
- **Bootstrap admin:** seeded idempotently from `BOOTSTRAP_ADMIN_EMAIL/PASSWORD`
  on startup (insert only if missing; never overwrites). Default `admin@example.com` / `change-me`.
- **JWT claims:** `sub`(uuid), `email`, `role`(ADMIN|USER), `iat`, `exp`. `kid` in header.
- **Error envelope:** `{ "error": { "code", "message" } }` via FastAPI exception handlers.
- **DB:** SQLAlchemy 2 + psycopg3, tables via `create_all` at startup (no Alembic yet).
- Container Python pinned to **3.12-slim** (passlib/`crypt` removed in 3.13+; host 3.14 irrelevant).

## How to run / verify (Phase 1)

```bash
# from repo root (in WSL): cp .env.example .env  (already done)
wsl -e bash -lc "cd /mnt/d/programowanie/projects/infosys-dashboard && docker compose up --build -d"
wsl -e bash -lc "bash /mnt/d/programowanie/projects/infosys-dashboard/auth-service/verify.sh"        # AC-2,3,13,14 + jwks + claims
wsl -e bash -lc "bash /mnt/d/programowanie/projects/infosys-dashboard/auth-service/verify_restart.sh" # AC-1 idempotency
# stop: docker compose down   (add -v to wipe authdb + keys)
```
Service: http://localhost:8000 — endpoints in `auth-service/README.md` / SPEC §5.1.
(As of writing, the stack is left running.)

## auth-service API recap (SPEC §5.1)

| Method | Path | Auth | Result |
|--------|------|------|--------|
| POST | `/register` | – | 201 {id,email,role}; 409 dup; 400 invalid |
| POST | `/login` | – | 200 {access_token,token_type:Bearer,expires_in}; 401 |
| GET | `/users/me` | Bearer | 200 {id,email,role}; 401 |
| GET | `/.well-known/jwks.json` | – | 200 {keys:[...]} |
| POST | `/admin/users` | ADMIN | 201; 409; 403; 401 |
| POST | `/admin/users/{id}/promote` | ADMIN | 200 role ADMIN; 404; 403 |
| GET | `/admin/users` | ADMIN | 200 [{id,email,role}]; 403 |
| GET | `/health` | – | 200 {status:"ok"} |

---

# Plan for Phases 2–4 (remaining local work; AWS SPEC §12 deferred)

> Workflow each phase: `/opsx:propose <name>` → `/opsx:apply` → verify against AC →
> `/opsx:archive`. Author capability specs just-in-time (don't pre-guess interfaces).

## Phase 2 — task-service-cards (Java 21 + Spring Boot + taskdb)

**Capabilities:** `task-cards`, `task-service-runtime`. **AC:** AC-4 (validation),
AC-5…AC-12, extends AC-15.

- Spring Boot service on **port 8080**, own Postgres `task-db` → `taskdb` (db-per-service),
  added to the SAME root `docker-compose.yml` (task-db healthcheck + depends_on).
- **Local JWT validation only (NFR-2):** mount the existing `keys` volume **read-only**
  at `/keys`, load `public.pem`, verify RS256 signature + `exp` with small clock leeway.
  Do NOT call auth-service per request. (JWKS URL `http://auth-service:8000/.well-known/jwks.json`
  is the documented alternative.)
- `cards` table: id UUID PK, title NOT NULL, description nullable, status enum
  `OPEN|TODO|IN_PROGRESS|REVIEW|DONE` default OPEN, creator_id UUID NOT NULL,
  assignee_id UUID nullable, created_at/updated_at tz. creator/assignee are
  cross-service refs (no FK).
- Endpoints (SPEC §5.2): `GET /api/cards`, `POST /api/cards`,
  `PATCH /api/cards/{id}/status`, `PATCH /api/cards/{id}/assignee`,
  `DELETE /api/cards/{id}`, `GET /api/health`.
- Authorization (SPEC §4.2): ADMIN all; USER sees creator==me OR assignee==me,
  edits/deletes only creator==me; USER POST auto-sets creator_id AND assignee_id to
  self (ignores supplied assignee); ADMIN may set any assignee. Invalid status → 400.
- Same error envelope; CORS allows frontend origin. Java NOT needed on host (Docker build).
- Verify AC-5 (USER visibility), AC-6 (ADMIN visibility), AC-7 (auto-assign),
  AC-8 (admin assign), AC-9 (USER own status), AC-10 (403 other's card),
  AC-11 (400 bad status), AC-12 (delete 403/204), AC-4 (bad signature → 401).

## Phase 3 — frontend-board (React/TS/Vite + TailwindCSS)

**Capability:** `frontend-board`. **AC:** SPEC §6.

- Vite React+TS app on **port 3000**, TailwindCSS (`tailwind.config.js`).
- Register / login / logout (clear token). Token in localStorage (MVP).
- API base URLs from **build-time** env `VITE_API_BASE_URL` (task 8080),
  `VITE_AUTH_BASE_URL` (auth 8000) — injected at `vite build`, not runtime.
- Kanban board with the 5 status columns; create card, move card across columns
  (status change), delete card.
- Role/ownership-aware UI: hide/disable actions not allowed by SPEC §4.2.
- ADMIN assignee picker via `GET /admin/users`.
- Handle loading/error states; 401 → redirect to login.
- Add `frontend` service + Dockerfile to root compose.

## Phase 4 — stack-integration

**Capability:** `stack-integration`. **AC:** closes AC-15 end-to-end.

- `docker compose up --build` brings up all five services healthy: frontend,
  task-service, auth-service, task-db, auth-db.
- Root `README.md` (NFR-6): how to run, admin credentials, architecture + decisions
  (headless auth, RS256, db-per-service).
- Full end-to-end smoke: log in as admin → create card → change status → delete,
  plus USER flows. Confirm AC-1…AC-15 all green against the full stack.

## Deferred — AWS (SPEC §12)

ECS Fargate + RDS + S3/CloudFront, secrets in Secrets Manager, AWS Copilot.
MUST NOT require app code changes (config/infra only). Start only after Phases 1–4
are green. Out of scope for current sessions.
