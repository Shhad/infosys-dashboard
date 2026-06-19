# infosys-dashboard

A kanban-style task dashboard built as a small microservices system and started with a
single `docker compose up --build`. Three services, each with its own database
(database-per-service):

```
frontend (React/TS/Tailwind, nginx :3000) ──▶ task-service (Java 21 / Spring Boot :8080 + task-db)
        │                                              ▲
        └──── login / register ──▶ auth-service (Python / FastAPI :8000 + auth-db)
                                   RS256 JWT (asymmetric, validated locally)
```

## Run it (one command)

Prerequisites: Docker (with Compose v2).

```bash
# 1. Provide configuration (copy the template, then adjust if you like)
cp .env.example .env

# 2. Start the whole stack (builds all images on first run)
docker compose up --build
```

On Windows wher\n you use WSL, run it via WSL:

```bash
wsl -e bash -lc "cd /mnt/PATH_TO_PROJECT && docker compose up --build"
```

Then open **http://localhost:3000**.

This brings up five containers: `frontend`, `task-service`, `auth-service`, `task-db`,
`auth-db`. The databases and the frontend report a Docker healthcheck; give the backends
a few seconds to finish their first-boot migrations.

> **Keep port 3000 free.** Both backends are configured with
> `CORS_ORIGINS=http://localhost:3000` only. The frontend must be served from exactly
> that origin — if 3000 is taken, free it (e.g. kill any stray host `vite`/node dev
> server) before starting the stack.

### Ports

| Service      | URL                     |
|--------------|-------------------------|
| frontend     | http://localhost:3000   |
| auth-service | http://localhost:8000   |
| task-service | http://localhost:8080   |

## Logging in (bootstrap admin)

On first startup `auth-service` idempotently seeds a bootstrap admin from the environment:

- **Email:** `admin@example.com` (`BOOTSTRAP_ADMIN_EMAIL`)
- **Password:** value of `BOOTSTRAP_ADMIN_PASSWORD` in your `.env` (the template ships
  `change-me` — set your own).

Any other user can self-register from the frontend (they get the `USER` role and are
auto-logged-in). Admins can create users and promote them via the auth-service admin API.

## Configuration

All configuration is environment-driven (secrets never committed — NFR-5).
`.env.example` documents every key needed to start the stack; copy it to `.env`.

Note the **frontend `VITE_*` values are build-time args**, not runtime env: Vite inlines
them into the static bundle during `docker build`, so the browser talks to
`http://localhost:8000` (auth) and `http://localhost:8080` (task). Changing them takes
effect only after a rebuild (`docker compose up --build`).

## Architecture & key decisions

- **Headless auth-service (API only).** `auth-service` (FastAPI + `auth-db`) owns
  identity: register, login, `GET /users/me`, JWKS publication, and admin user
  management. It has no UI of its own — the SPA is the only front door.
- **RS256 JWTs validated locally (NFR-2).** `auth-service` signs JWTs with an RS256
  **private** key; `task-service` validates them with the **public** key it reads from a
  shared `keys` Docker volume (mounted read-only). There is no per-request callback to
  auth, so task authorization keeps working independently of auth-service availability.
- **Database-per-service.** `auth-db` and `task-db` are separate Postgres instances.
  `creator_id` / `assignee_id` on a card are cross-service references to auth users,
  **not** foreign keys — services stay decoupled and independently deployable.
- **Role/ownership rules enforced server-side.** ADMIN sees and edits everything; a USER
  sees cards they created or are assigned to and edits only those they created; creating
  a card auto-assigns it to the creator. The frontend mirrors these rules to hide
  disallowed actions, but the server is the authoritative enforcer (the UI gate is
  defense-in-depth only).
- **Build-time frontend config.** The frontend is a static bundle served by nginx with
  SPA fallback; its API base URLs are baked at build time via `VITE_*` build args (see
  above), so the running container needs no Node and no runtime config.

## Development

The frontend can also be run against the containerized backends with the host Vite dev
server (hot reload) instead of the nginx container:

```bash
cd frontend
cp .env.example .env   # local dev values
npm install
npm run dev            # http://localhost:3000
```

Keep the dev server on port 3000 for the same CORS reason as above.

## Project status

MVP is complete: auth-service, task-service, the
React board, and the one-command Docker Compose integration. AWS deployment (SPEC §12)
is deferred.
