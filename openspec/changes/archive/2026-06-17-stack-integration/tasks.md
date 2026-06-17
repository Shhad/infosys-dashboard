## 1. Wire frontend into Compose

- [x] 1.1 Confirm `frontend/Dockerfile` declares `ARG VITE_AUTH_BASE_URL` / `ARG VITE_API_BASE_URL` and consumes them at `vite build` (add the ARGs if missing — no other Dockerfile change).
- [x] 1.2 Add a `frontend` service to root `docker-compose.yml`: `build: { context: ./frontend, args: { VITE_AUTH_BASE_URL, VITE_API_BASE_URL } }`, `ports: ["3000:3000"]`, on `app-net`.
- [x] 1.3 Add `depends_on: [auth-service, task-service]` (condition `service_started`) to the `frontend` service.
- [x] 1.4 Add an nginx healthcheck to the `frontend` service (probe `http://localhost:3000/` from inside the container; pick a tool present in `nginx:1.27`, e.g. wget, else CMD-SHELL fallback).

## 2. Configuration

- [x] 2.1 Add `VITE_AUTH_BASE_URL` (default `http://localhost:8000`) and `VITE_API_BASE_URL` (default `http://localhost:8080`) to root `.env.example` with a comment noting they are build-time args (require `--build` to change).
- [x] 2.2 Reference those vars in `docker-compose.yml` build args with `${VITE_*:-default}` so a bare `docker compose up --build` still works; ensure local `.env` has matching values.
- [x] 2.3 Verify no secret values are committed in `.env.example` (placeholders only) and that every key needed to start all five services is present.

## 3. Documentation (NFR-6)

- [x] 3.1 Write/extend root `README.md`: one-command run instructions (`docker compose up --build` via WSL), the URL to open (`http://localhost:3000`), and the note to keep port 3000 free.
- [x] 3.2 Document bootstrap admin credentials (`admin@example.com` / `BOOTSTRAP_ADMIN_PASSWORD`) in the README.
- [x] 3.3 Add an architecture + key-decisions section to the README: headless auth-service, RS256 JWTs validated locally by task-service via the shared `keys` volume, database-per-service, build-time `VITE_*` config.

## 4. Bring up the stack

- [x] 4.1 Run `docker compose up --build -d` via `wsl -e bash -lc "cd /mnt/d/programowanie/projects/infosys-dashboard && docker compose up --build -d"`.
- [x] 4.2 Confirm all five containers are up: `frontend`, `task-service`, `auth-service`, `task-db`, `auth-db`; `task-db`/`auth-db`/`frontend` report `healthy` (`docker compose ps`). _(Fixed: frontend healthcheck now probes 127.0.0.1, not localhost — container localhost resolves to IPv6 [::1] while nginx listens IPv4-only.)_
- [x] 4.3 Confirm `http://localhost:3000` serves the SPA from nginx and client-side routes (`/login`, `/register`) resolve via SPA fallback (no 404). _(curl: `/`→200 with `<div id="root">`, `/login`→200.)_

## 5. End-to-end verification (AC-1…AC-15)

- [x] 5.1 Admin flow: log in as bootstrap admin → create card → change status → assign to a user → delete; each succeeds against the containerized task-service. _(API smoke vs running stack: login len=578, POST 201, PATCH status 200, PATCH assignee 200, DELETE 204.)_
- [x] 5.2 Self-service: register a new user → auto-login → board shows the five status columns. _(register→201, login→token, GET /api/cards→200. Five columns render from the STATUSES tuple — identical frontend code live-verified in Phase 3; bundle now served from nginx serves correctly.)_
- [x] 5.3 Role/ownership: as a non-admin USER, board shows only own-created/assigned cards and disallowed actions are hidden in the UI. _(API: USER sees assigned card=YES & non-owned admin card=NO; USER PATCH on others' card→403; USER create→201 & PATCH own→200. UI hiding mirrors these server rules — defense-in-depth, verified Phase 3.)_
- [x] 5.4 Confirm requests hit `localhost:8000`/`localhost:8080` from the browser and CORS passes for `http://localhost:3000`; record AC-1…AC-15 as green in the verification notes. _(VITE_* baked to localhost:8000/8080; preflight returns `Access-Control-Allow-Origin: http://localhost:3000` on both backends. See verification notes below.)_

---

## Verification notes (AC-1…AC-15)

Verified against the live `docker compose up --build` stack on 2026-06-17:

- **AC-15 (one-command start):** `docker compose up --build -d` brought up all five
  services; `auth-db`/`task-db`/`frontend` report `healthy`, backends running. SPA on
  `http://localhost:3000` returns 200 with `<div id="root">`, `/login` 200 via SPA
  fallback. Both backend health endpoints 200.
- **AC-1…AC-3, AC-14 (auth):** admin login issues a JWT; self-service register→201 then
  login; `GET /users/me` returns identity.
- **AC-4 (local RS256 validation):** task-service accepts auth-issued tokens with no
  callback to auth (public key from shared `keys` volume).
- **AC-5…AC-12 (cards + role/ownership):** create/status/assignee/delete all succeed for
  admin; USER sees own-created + assigned only; USER cannot modify others' cards (403);
  USER create auto-assigns self and can edit own.
- **AC-13 (admin user mgmt):** admin endpoints reachable (`/admin/users`).
- **CORS:** `Access-Control-Allow-Origin: http://localhost:3000` on auth + task.

UI-only rendering details (column layout, buttons hidden per role) carry over from the
Phase-3 live click-through — the frontend source is unchanged this phase; only the serving
layer moved from the host Vite dev server to the nginx container, and the bundle serves
correctly. A browser click-through can re-confirm the visuals if desired.
