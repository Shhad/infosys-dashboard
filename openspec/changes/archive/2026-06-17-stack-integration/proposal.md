## Why

Phases 1–3 delivered three independently-buildable services (auth-service, task-service,
frontend) plus their databases, but the frontend is still run by hand via the host Vite
dev server and is not part of the Compose stack. SPEC **AC-15** requires the *entire*
system to start healthy with a single `docker compose up --build` and be usable
end-to-end (admin login through to working board). This is the final local/Phase-1
iteration: it wires the frontend into the stack and ships the run/architecture docs
(NFR-6) so the project is one-command runnable and reviewable.

## What Changes

- Add a **`frontend`** service to the root `docker-compose.yml`: builds `./frontend`
  (existing multi-stage Dockerfile → nginx on :3000), maps host **3000:3000**, and
  `depends_on` auth-service + task-service.
- Pass `VITE_AUTH_BASE_URL` (`http://localhost:8000`) and `VITE_API_BASE_URL`
  (`http://localhost:8080`) as Docker **build args** (build-time — Vite bakes them into
  the bundle at `vite build`; they are NOT runtime `environment:` values). For a
  single-host local stack the browser resolves both backends at `localhost`, so those
  remain the build-arg values.
- Add a **healthcheck** for the frontend nginx container so `docker compose up` can
  report all five services healthy (frontend, task-service, auth-service, task-db,
  auth-db).
- Extend the root **`.env.example`** to document the new `VITE_*` build args.
- Write/extend the root **`README.md`** (NFR-6): one-command run instructions, bootstrap
  admin credentials (`admin@example.com` / `BOOTSTRAP_ADMIN_PASSWORD`), and a short
  architecture + key-decisions writeup (headless auth, RS256 validated locally via the
  shared `keys` volume, database-per-service, build-time `VITE_*` config).
- Verify **AC-1…AC-15** green end-to-end against the fully containerized stack (frontend
  served from nginx, not the host dev server).

No application code changes are expected — this iteration is config/infra/docs only.

## Capabilities

### New Capabilities
- `stack-integration`: the full system starts healthy with one `docker compose up
  --build` (all five services), the containerized frontend is reachable on :3000 and
  works end-to-end against the containerized backends, and the repo ships NFR-6 run +
  architecture documentation. Closes AC-15.

### Modified Capabilities
<!-- None. Per-service runtime capabilities (auth-service-runtime, task-service-runtime,
     frontend-board) keep their existing requirements; this change only composes them and
     adds the stack-level start/docs requirements under the new capability above. -->

## Impact

- **Files:** `docker-compose.yml` (new `frontend` service), root `.env.example` (new
  `VITE_*` keys), root `README.md` (NFR-6 docs). Reuses the existing
  `frontend/Dockerfile` and `frontend/nginx.conf` as-is.
- **Runtime/ops:** host port **3000** must be free (both backends lock
  `CORS_ORIGINS=http://localhost:3000`); the stack now starts five containers instead of
  four.
- **No app code, no API, no DB schema changes.** No new third-party dependencies.
- **Environment:** Docker runs natively inside WSL2 Ubuntu (not Docker Desktop) and is
  not on the Windows PATH — Compose is invoked via
  `wsl -e bash -lc "cd /mnt/d/programowanie/projects/infosys-dashboard && docker compose …"`.
- **Out of scope:** AWS / SPEC §12 (deferred).
