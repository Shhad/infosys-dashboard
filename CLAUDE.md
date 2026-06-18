# infosys-dashboard

A kanban-style task dashboard built as a small **microservices** system, started with a
single `docker compose up --build`. Three services, each with its own database
(database-per-service), plus a static SPA.

For end-user run/setup instructions see `README.md`. This file is the engineering
overview for working in the codebase. Each service has its own deeper `CLAUDE.md`
(`auth-service/`, `task-service/`, `frontend/`).

## Architecture

```
frontend (React/TS/Tailwind, nginx :3000) ──▶ task-service (Java 21 / Spring Boot :8080 + task-db)
        │                                              ▲
        └──── login / register ──▶ auth-service (Python / FastAPI :8000 + auth-db)
                                   RS256 JWT (asymmetric, validated locally)
```

| Service        | Stack                              | Port | Database          |
|----------------|------------------------------------|------|-------------------|
| `frontend`     | React 18 + TypeScript + Tailwind, served by nginx | 3000 | —                 |
| `auth-service` | Python 3 + FastAPI + SQLAlchemy    | 8000 | `auth-db` (Postgres 16) |
| `task-service` | Java 21 + Spring Boot 3.3          | 8080 | `task-db` (Postgres 16) |

## Key architectural decisions

- **Headless auth-service (API only).** Owns identity: register, login,
  `GET /users/me`, JWKS publication, admin user management. No UI — the SPA is the
  only front door.
- **RS256 JWTs validated locally (NFR-2).** `auth-service` signs JWTs with an RS256
  **private** key; `task-service` validates them with the **public** key read from a
  shared `keys` Docker volume (mounted read-only). No per-request callback to auth, so
  task authorization keeps working independently of auth-service availability.
- **Database-per-service.** `auth-db` and `task-db` are separate Postgres instances.
  `creator_id` / `assignee_id` on a card are cross-service references to auth users,
  **not** foreign keys — services stay decoupled and independently deployable.
- **Role/ownership rules enforced server-side.** ADMIN sees and edits everything; a
  USER sees cards they created or are assigned to and edits only those they created;
  creating a card auto-assigns it to the creator. The frontend mirrors these rules to
  hide disallowed actions, but the server is the authoritative enforcer (the UI gate is
  defense-in-depth only).
- **Build-time frontend config.** The SPA is a static bundle; its API base URLs are
  baked at build time via `VITE_*` build args. Changing them needs a rebuild.

## Conventions (cross-service)

- **Error envelope everywhere:** `{ "error": { "code", "message" } }`.
- **Health checks:** auth `GET /health`, task `GET /api/health` → `{ "status": "ok" }`.
- **All config is environment-driven (NFR-5);** secrets are never committed.
  `.env.example` at the repo root documents every key. Copy to `.env`.
- **CORS** is locked to the frontend origin (`http://localhost:3000` by default) on both
  backends — port 3000 must be kept free.

## Running

```bash
cp .env.example .env          # set BOOTSTRAP_ADMIN_PASSWORD etc.
docker compose up --build     # frontend, auth-service, task-service, auth-db, task-db
```

On Windows the project runs under **WSL2** (Docker lives in WSL2 Ubuntu; no Java/Node
required on the host). The full stack builds inside Docker.

## Repository layout

```
auth-service/      FastAPI identity service (see auth-service/CLAUDE.md)
task-service/      Spring Boot card service (see task-service/CLAUDE.md)
frontend/          React SPA (see frontend/CLAUDE.md)
openspec/          OpenSpec change/spec artifacts driving the iterations
context/           Working notes / todo
docker-compose.yml One-command local stack; the `keys` volume carries the RS256 keypair
.env.example       Documents every env key needed to boot the stack
```

## Spec & workflow

Work is organized as **OpenSpec** iterations (see `openspec/`). The MVP — auth-service,
task-service, the React board, and the one-command Compose integration — is complete.
AWS deployment (SPEC §12) is deferred. References like `SPEC §4.2`, `NFR-2`, `AC-7`
throughout the code/docs point back to the spec requirements and acceptance criteria.
