# Task Dashboard — System Spec (OpenSpec source of truth)

> This is the project-level capability map for the OpenSpec workflow. The full
> normative requirements live in `context/SPEC.md` (RFC-2119 + Given/When/Then).
> Per-capability delta specs are synced here under `openspec/specs/<capability>/`
> as each change is archived. This file tracks **what exists vs. what is planned**.

## System overview

A kanban-style task dashboard in a microservices architecture, started with one
command via Docker Compose. Three services, each with its own database
(database-per-service):

```
frontend (React/TS/Tailwind) ──▶ task-service (Java/Spring + taskdb)
        │                                  ▲
        └──── login/register ──▶ auth-service (Python/FastAPI + authdb)
                                  RS256 JWT (asymmetric, validated locally)
```

Auth is **headless** (API only). `auth-service` signs JWTs with an RS256 private
key; `task-service` validates them **locally** with the public key (shared via a
`keys` Docker volume and/or JWKS) — no per-request call back to auth (NFR-2).

## Iteration / phase plan

These are **local build iterations** of SPEC Phase 1 (AC-1…AC-15). SPEC §12
"Phase 2 — AWS (ECS Fargate)" remains **deferred / out of scope** for now.

| Phase | Capability area | Status |
|-------|-----------------|--------|
| **1 — auth-service** | `user-authentication`, `user-administration`, `auth-service-runtime` | ✅ **DONE** (archived `2026-06-16-auth-service`) |
| **2 — task-service-cards** | `task-cards`, `task-service-runtime` | ✅ **DONE** (archived `2026-06-16-task-service-cards`) |
| **3 — frontend-board** | `frontend-board` | ⬜ Planned |
| **4 — stack-integration** | `stack-integration` (full one-command system, README, end-to-end AC-15) | ⬜ Planned |
| (later) AWS deploy | SPEC §12 | ⏸ Deferred |

## Capabilities

### Implemented (Phase 1) — specs synced under `openspec/specs/`

- **`user-authentication`** — self-service register, login → RS256 JWT, `GET /users/me`,
  JWKS publication, idempotent bootstrap admin. Covers AC-1, AC-2, AC-3, AC-14 +
  signing side of AC-4. → `openspec/specs/user-authentication/spec.md`
- **`user-administration`** — admin create user, promote to ADMIN, list users.
  Covers AC-13. → `openspec/specs/user-administration/spec.md`
- **`auth-service-runtime`** — health endpoint, standardized error envelope, CORS,
  env-driven config/secrets, containerized service + `authdb` with healthcheck,
  one-command startup. Covers AC-15 (auth slice). → `openspec/specs/auth-service-runtime/spec.md`

### Implemented (Phase 2) — specs synced under `openspec/specs/`

- **`task-cards`** — `cards` model (UUID, title, description, status enum
  `OPEN|TODO|IN_PROGRESS|REVIEW|DONE`, creator_id, assignee_id, timestamps);
  endpoints `GET/POST /api/cards`, `PATCH /api/cards/{id}/status`,
  `PATCH /api/cards/{id}/assignee`, `DELETE /api/cards/{id}`. Role/ownership rules
  (SPEC §4.2): ADMIN sees/edits all; USER sees own-created OR assigned, edits only
  own-created; USER create auto-assigns self. Covers AC-5…AC-12. → `openspec/specs/task-cards/spec.md`
- **`task-service-runtime`** — Java 21 + Spring Boot service, `taskdb`
  Postgres (db-per-service), **local RS256 JWT validation** via the shared public
  key (no network call to auth — NFR-2), CORS, `/api/health`, same error envelope.
  Covers AC-4 (validation side), extends AC-15. → `openspec/specs/task-service-runtime/spec.md`

### Planned (Phases 3–4) — specs authored just-in-time per change

- **`frontend-board`** (Phase 3) — React/TS/Vite + TailwindCSS. Register/login/logout,
  5-status kanban board, create/move/delete cards, role-aware UI hiding disallowed
  actions, admin assignee picker (`GET /admin/users`), `VITE_*` build-time API URLs.
  Covers SPEC §6.
- **`stack-integration`** (Phase 4) — full `docker compose up --build` brings up all
  five services healthy (frontend, task-service, auth-service, task-db, auth-db);
  root `README.md` (run steps, admin creds, architecture decisions per NFR-6).
  Closes AC-15 end-to-end.

## Cross-cutting rules (apply to all capabilities)

- Error body everywhere: `{ "error": { "code": string, "message": string } }`.
- Secrets/keys from env only, never committed (NFR-5); `.env.example` documents all keys.
- JWT claims: `sub`, `email`, `role` (`ADMIN|USER`), `exp`, `iat`; RS256.
- Database-per-service; `creator_id`/`assignee_id` are cross-service refs, **not** FKs.
- CORS must allow the frontend origin (NFR-4).
