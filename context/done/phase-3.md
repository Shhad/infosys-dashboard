# Phase 3 — frontend-board (DONE)

> Written 2026-06-17 so work can resume after a context-window clear.
> Single source of truth for requirements: `context/SPEC.md` (§6).
> OpenSpec capability map: `openspec/specs/spec.md`.
> Synced capability spec: `openspec/specs/frontend-board/spec.md` (12 requirements).
> This change is archived at `openspec/changes/archive/2026-06-17-frontend-board/`.
> Phase 1 handoff: `context/done/phase-1.md`. Phase 2: `context/done/phase-2.md`.

## Status: ✅ complete and verified

React/TS/Vite/Tailwind SPA built, type-checked, production-built, and verified live
against the running auth-service + task-service stack. Covers SPEC **§6**. All 26
tasks in the change's `tasks.md` are checked, including the live click-through (8.1).

## Environment (host facts)

- Same as Phases 1–2: Windows 11; **Docker runs natively inside WSL2 Ubuntu**, not
  Docker Desktop. `docker` is NOT on the Windows PATH (invoke via `wsl -e bash -lc`).
- **Node IS on the host for frontend dev** — `node v24.16.0`, `npm 11.17.0` on the
  Windows PATH (used to `npm install` + `npm run build` + `npm run dev`). The
  *container* build needs no host Node (multi-stage `node:20` → nginx).
- Repo on Windows `D:\...` ↔ WSL `/mnt/d/programowanie/projects/infosys-dashboard`.
- ⚠ The Bash tool's cwd persists between calls — a `cd frontend` earlier leaked into
  later commands. Prefer absolute paths or re-`cd` to repo root.

## What was built

```
frontend/
  package.json            # React 18, react-router-dom 6, Vite 5, Tailwind 3, TS 5
  tsconfig.json / tsconfig.node.json   # NB: node config must NOT set noEmit (composite ref)
  vite.config.ts          # @vitejs/plugin-react; dev server port 3000, host:true
  index.html
  tailwind.config.js / postcss.config.js
  .env.example            # documents VITE_AUTH_BASE_URL / VITE_API_BASE_URL
  .env                    # LOCAL dev values (gitignored) — created during verify
  .gitignore / .dockerignore
  Dockerfile              # stage1 node:20 `vite build` w/ VITE_* build args -> stage2 nginx:1.27 serving dist on :3000
  nginx.conf              # SPA fallback: try_files ... /index.html
  src/
    main.tsx              # BrowserRouter > AuthProvider > App
    App.tsx               # routes: /login, /register, / (ProtectedRoute -> BoardPage), * -> /
    index.css            # @tailwind base/components/utilities
    vite-env.d.ts         # types VITE_* on ImportMetaEnv
    types.ts              # STATUSES tuple, Status, Role, User, Card, TokenResponse
    permissions.ts        # canModifyCard(card,user) = ADMIN || creator_id==me ; isAdmin()
    api/
      token.ts            # localStorage get/set/clear (key td_access_token)
      client.ts           # fetch wrapper: reads import.meta.env.VITE_*, Bearer header,
                          #   parses { error: { code, message } }, global 401 -> clearToken + onUnauthorized()
      auth.ts             # register, login, getMe, listUsers (/admin/users)
      cards.ts            # listCards, createCard, updateStatus, updateAssignee, deleteCard
    auth/
      AuthContext.tsx     # token + identity (GET /users/me); login/register/logout/isAuthenticated; restores session on boot; auto-login after register
      ProtectedRoute.tsx  # shows board only when authed, else <Navigate to=/login>
    pages/
      LoginPage.tsx       # POST /login -> store token -> board; error keeps form
      RegisterPage.tsx    # POST /register -> auto-login; error keeps email
      BoardPage.tsx       # owns cards+users state; header(email·role + logout); create/move/assign/delete handlers; loading + error banner
    components/
      Board.tsx           # 5 columns from STATUSES
      Column.tsx          # one status column + count
      CardItem.tsx        # card + gated move(select)/delete/assignee controls
      CreateCardForm.tsx  # title(required)+description; admin-only assignee
      AssigneePicker.tsx  # <select> from GET /admin/users (admin only)
```

(`frontend/node_modules` and `frontend/dist` exist locally — both gitignored.)

## Key design decisions (locked)

- **Build-time config only (SPEC §6).** API base URLs come from `import.meta.env.`
  `VITE_AUTH_BASE_URL` (auth, :8000) and `VITE_API_BASE_URL` (task, :8080), read in
  `api/client.ts`. No hostname is hardcoded anywhere in `src/` (verified by grep).
- **Token in localStorage** (MVP per §6). Identity comes from `GET /users/me`
  (authoritative) rather than decoding the JWT client-side — the UI gate uses the
  same source the server trusts.
- **Single fetch wrapper** centralizes the Bearer header, the `{ error: { code,
  message } }` envelope parsing, and **global 401 handling** → `clearToken()` + an
  `onUnauthorized` callback that `AuthContext` registers to null the user, so
  `ProtectedRoute` redirects to `/login`.
- **Role/ownership UI gate = defense-in-depth only** (`permissions.ts`, mirrors SPEC
  §4.2). Server still enforces every rule; UI just hides what would 403. We never
  hide a card the API returned (visibility is the server's job via `GET /api/cards`).
- **Move = non-optimistic status PATCH.** `onMove` calls `PATCH /api/cards/{id}/status`
  and only updates state on success, so a `403` leaves the card in its column with the
  error surfaced (no manual revert needed). Move/delete UI is a `<select>`/button, not
  drag-and-drop (DnD was an explicit non-goal for MVP).
- **Container:** multi-stage Dockerfile passes `VITE_*` as **build args** (they bake
  into the bundle at `vite build`); nginx serves `dist/` on :3000 with SPA fallback.

## Gotchas discovered during verification (read before re-running)

- **`.env` is required for local dev, not `.env.example`.** Vite loads `VITE_*` only
  from `.env`/`.env.local`/shell. Without `.env`, `import.meta.env.VITE_AUTH_BASE_URL`
  is `undefined`, so `` `${base}/register` `` becomes the literal `"undefined/register"`
  and the browser hits `localhost:<port>/undefined/register` → 404. Fix: copy
  `.env.example` → `.env` (done; gitignored). **Restart the dev server** after creating
  it — Vite reads env only at startup.
- **Must run on port 3000.** Both backends set `CORS_ORIGINS=http://localhost:3000`
  only. If 3000 is occupied, Vite auto-bumps to 3001 and every request fails CORS even
  with correct URLs. Keep 3000 free (kill stray `vite` node processes).
- **`tsconfig.node.json` must not set `noEmit`** when it's a composite project
  reference, or `tsc -b` fails with TS6310. (Fixed.)

## How to run / verify

```bash
# 1) backend stack up (WSL): auth :8000, task :8080
wsl -e bash -lc "cd /mnt/d/programowanie/projects/infosys-dashboard && docker compose up --build -d"

# 2) frontend dev (host PowerShell/bash), ensure frontend/.env exists, port 3000 free
cd frontend && npm install && npm run dev    # http://localhost:3000

# production build / type-check:
npm run build                                # tsc -b && vite build -> dist/
```

Flows verified: register → auto-login → board (5 columns), create card, move via
status select, delete (confirm), admin assignee picker from `/admin/users`, logout,
and `401` → login redirect.

---

# What to do next

> Workflow each phase: `/opsx:propose <name>` → `/opsx:apply` → verify against AC → `/opsx:archive`.

## Phase 4 — stack-integration  ← NEXT (final Phase-1/local phase)

**Capability:** `stack-integration`. **AC:** closes **AC-15** end-to-end.

- **Wire the frontend into the root `docker-compose.yml`** — this is NOT done yet.
  Add a `frontend` service building `./frontend`, mapping host **3000:3000**, passing
  `VITE_AUTH_BASE_URL` / `VITE_API_BASE_URL` as **build args** (note: build-time, so
  they must be set at image build, not as runtime `environment:`). For a single-host
  local stack the browser talks to `localhost:8000`/`localhost:8080`, so those remain
  the build-arg values. Depends on auth-service + task-service.
- `docker compose up --build` MUST bring up all five services healthy: frontend,
  task-service, auth-service, task-db, auth-db.
- Root **`README.md`** (NFR-6): how to run (one command), bootstrap admin credentials
  (`admin@example.com` / `BOOTSTRAP_ADMIN_PASSWORD`), architecture + decisions
  (headless auth, RS256 validated locally, db-per-service, build-time VITE_*).
- Full end-to-end smoke across the whole stack: admin → create card → change status →
  assign → delete, plus USER own/assigned visibility + gating. Confirm AC-1…AC-15 green.

## Deferred — AWS (SPEC §12)

ECS Fargate + RDS + S3/CloudFront, secrets in Secrets Manager, AWS Copilot. Build-time
`VITE_*` differ from local (CloudFront/ALB URLs known at build — SPEC §12.4). MUST NOT
require app code changes (config/infra only). Start only after Phases 1–4 are green.
