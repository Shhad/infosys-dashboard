# Phase 4 — stack-integration (DONE)

> Written 2026-06-17 so work can resume after a context-window clear.
> Single source of truth for requirements: `context/SPEC.md` (AC-15 §9, NFR-6 §8, §10).
> OpenSpec capability map: `openspec/specs/spec.md`.
> Synced capability spec: `openspec/specs/stack-integration/spec.md` (4 requirements).
> This change is archived at `openspec/changes/archive/2026-06-17-stack-integration/`.
> Prior handoffs: `context/done/phase-1.md`, `phase-2.md`, `phase-3.md`.

## Status: ✅ complete and verified

The frontend is wired into the root Compose stack. `docker compose up --build` brings up
all **five** services (frontend, task-service, auth-service, task-db, auth-db); the
containerized nginx frontend serves the SPA on :3000 and works end-to-end against the
containerized backends. Closes SPEC **AC-15**. All 17 tasks in the change's `tasks.md`
are checked. This was the final Phase-1/local iteration.

## Environment (host facts — unchanged from Phases 1–3)

- Windows 11. **Docker runs natively inside WSL2 Ubuntu**, not Docker Desktop. `docker`
  is NOT on the Windows PATH — invoke via
  `wsl -e bash -lc "cd /mnt/d/programowanie/projects/infosys-dashboard && docker compose …"`.
- Node is on the host for frontend *dev* only; the container build needs no host Node.
- Repo on Windows `D:\…` ↔ WSL `/mnt/d/programowanie/projects/infosys-dashboard`.
- ⚠ The Bash tool's cwd persists between calls — prefer absolute paths.

## What changed this session (config/infra/docs only — no app code)

```
docker-compose.yml   # NEW `frontend` service (see below)
.env.example         # clarified VITE_* as BUILD-TIME args (require --build to change)
README.md            # full NFR-6 rewrite (was a one-line stub)
```

### The `frontend` Compose service (added to docker-compose.yml)

```yaml
frontend:
  build:
    context: ./frontend
    args:                      # BUILD args — Vite inlines them at `vite build`
      VITE_AUTH_BASE_URL: ${VITE_AUTH_BASE_URL:-http://localhost:8000}
      VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:8080}
  depends_on: [auth-service, task-service]   # start ordering only
  ports: ["3000:3000"]
  healthcheck:
    test: ["CMD-SHELL", "wget -q -O - http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 5
  networks: [app-net]
```

- Reuses the existing `frontend/Dockerfile` (multi-stage `node:20` → `nginx:1.27`) and
  `frontend/nginx.conf` **unchanged**. The Dockerfile already declared both `VITE_*` ARGs.
- The browser (not the Compose network) calls the backends, so the build-arg URLs are the
  host-published `localhost:8000`/`localhost:8080`, **not** the in-network service names.

## Gotchas discovered during verification (read before re-running)

- **Frontend healthcheck must probe `127.0.0.1`, not `localhost`.** Inside the container
  `localhost` resolves to IPv6 `[::1]`, but `nginx.conf` has `listen 3000;` (IPv4 only),
  so a `localhost` probe is refused and the container is marked `unhealthy` even though
  nginx serves fine. Using `127.0.0.1` fixes it. (This is the one non-obvious bug found.)
- **`VITE_*` are build-time.** Editing `.env` requires `docker compose up --build` (a
  plain `up` reuses the old image and the URLs stay stale). Documented in README +
  `.env.example`.
- **Keep port 3000 free / CORS is locked to it.** Both backends set
  `CORS_ORIGINS=http://localhost:3000` only. Compose binds `3000:3000` (fails fast if
  taken, unlike the dev server which silently auto-bumps to 3001 and breaks CORS).
- `auth-service` / `task-service` have **no** Compose healthcheck (they show `running`,
  not `healthy`) — only the two DBs and the frontend report health. That's expected and
  matches the spec scenario.

## How to run / verify

```bash
# whole stack (WSL): builds frontend image on first run
wsl -e bash -lc "cd /mnt/d/programowanie/projects/infosys-dashboard && docker compose up --build -d"
wsl -e bash -lc "cd /mnt/d/programowanie/projects/infosys-dashboard && docker compose ps"
# open http://localhost:3000  (bootstrap admin: admin@example.com / BOOTSTRAP_ADMIN_PASSWORD, default change-me)
```

### Verification performed (against the live stack, 2026-06-17)

- All 5 containers up; `auth-db`/`task-db`/`frontend` healthy; SPA `/`→200 with
  `<div id="root">`, `/login`→200 via SPA fallback; both backend health endpoints 200.
- API end-to-end smoke (curl vs running stack): admin login → create card 201 → PATCH
  status 200 → PATCH assignee 200 → DELETE 204; self-service register 201 + login; USER
  sees own-created + assigned only, blocked from others' cards (403), can edit own (200);
  CORS `Access-Control-Allow-Origin: http://localhost:3000` on both backends.
- UI click-through (admin/user interactions) confirmed manually by the user.
- AC-1…AC-15 green. (Full notes in the archived change's `tasks.md` → "Verification notes".)

---

# What to do next

> Phase-1 (local docker-compose system, AC-1…AC-15) is **complete and green**. The
> remaining work is the deferred AWS phase. Per SPEC §12, AWS MUST NOT require app code
> changes — config/infra/CI-CD only — and only starts after Phases 1–4 are green (they are).

## Deferred — Phase 2 / AWS (SPEC §12)

- New `infra/` dir (AWS Copilot manifests OR Terraform) + `infra/README.md` with
  step-by-step prerequisites (AWS CLI, account, region), command order, and teardown
  (`copilot app delete` / `terraform destroy`) — §12 lines 414, 424.
- ECS Fargate (one service per container), RDS (Postgres per service), S3/CloudFront for
  the frontend, secrets in Secrets Manager.
- **Build-time `VITE_*` differ from local** — they become the CloudFront/ALB URLs, known
  at build time (§12.4). Same build-arg mechanism, different values; no app code change.
- Acceptance: AC-1…AC-15 all pass against the AWS environment (§12 lines 443, 451).
- Cost note: Fargate bills for runtime — document how to tear the environment down after
  a demo.

> Workflow for the AWS phase (when started):
> `/opsx:propose aws-deploy` → `/opsx:apply` → verify AC-1…AC-15 vs AWS → `/opsx:archive`.
