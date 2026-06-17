# Phase 2 — task-service-cards (DONE)

> Written 2026-06-16 so work can resume after a context-window clear.
> Single source of truth for requirements: `context/SPEC.md`.
> OpenSpec capability map: `openspec/specs/spec.md`.
> This change is archived at `openspec/changes/archive/2026-06-16-task-service-cards/`.
> Phase 1 handoff: `context/done/phase-1.md`.

## Status: ✅ complete and verified end-to-end (19/19 acceptance checks green)

Built, containerized, and tested against real PostgreSQL in Docker (WSL2) alongside
the Phase-1 auth-service. Covers acceptance criteria **AC-4** (validation side),
**AC-5…AC-12**, **AC-14** (task slice), and extends **AC-15**.

## Environment (host facts — unchanged from Phase 1)

- Windows 11. **Docker runs natively inside WSL2 Ubuntu** (systemd), NOT Docker
  Desktop. `docker` is NOT on the Windows PATH → invoke as
  `wsl -e bash -lc "cd /mnt/d/programowanie/projects/infosys-dashboard && docker compose ..."`.
- WSL user `baszak` IS in the `docker` group → daemon access OK.
- **Java is NOT installed on the host** — and it is not needed: task-service compiles
  inside a multi-stage Docker image (Maven+Temurin 21 build stage → JRE 21 runtime).
- Repo on Windows `D:\...` is reachable from WSL at `/mnt/d/programowanie/projects/infosys-dashboard`.
- Quoting tip: complex bash via `wsl -e bash -lc "..."` mangles nested quotes — put
  scripts in a `.sh` file and run `bash path/to/file.sh` (see `task-service/verify.sh`).

## What was built

```
task-service/
  pom.xml                 # Spring Boot 3.3.5, Java 21; web, data-jpa, validation, security, postgres, nimbus-jose-jwt
  Dockerfile              # multi-stage: maven:3.9.9-eclipse-temurin-21 build -> eclipse-temurin:21-jre runtime
  .dockerignore
  README.md               # service docs + API table + authz matrix
  verify.sh               # AC harness (curl-based, hits auth:8000 for tokens + task:8080)
  src/main/resources/application.yml   # all config from env; ddl-auto: update; server.port 8080
  src/main/java/com/taskdashboard/taskservice/
    TaskServiceApplication.java
    card/
      Status.java          # enum OPEN|TODO|IN_PROGRESS|REVIEW|DONE
      Card.java            # @Entity cards: UUID id (app-gen), title, description, status(STRING), creator_id, assignee_id, created_at/updated_at
      CardRepository.java  # findVisibleTo(me) = creator_id=:me OR assignee_id=:me ; findAllByOrderByCreatedAtDesc
      CardService.java     # SPEC §4.2 authorization matrix lives here
      CardController.java   # /api/cards CRUD + status/assignee PATCH
      dto/ CreateCardRequest, UpdateStatusRequest, UpdateAssigneeRequest, CardResponse
    security/
      UserPrincipal.java    # (UUID id, String role); isAdmin()
      JwtKeyProvider.java   # loads RS256 public key ONCE at startup (PEM primary, JWKS fallback)
      JwtAuthFilter.java    # OncePerRequest: nimbus RSASSAVerifier, verify sig + exp (60s skew), set principal
      SecurityConfig.java   # filter chain, 401 entrypoint + 403 handler (error envelope), CORS
    common/
      ApiException.java, ErrorResponse.java, GlobalExceptionHandler.java, HealthController.java

docker-compose.yml   # ROOT (extended): added task-db (postgres:16-alpine, healthcheck) + task-service
                     # (port 8080, depends_on task-db healthy + auth-service started, keys volume :ro)
.env.example         # ROOT (extended): TASK_DB_* incl TASK_DB_NAME, JWT_PUBLIC_KEY_PATH, AUTH_JWKS_URL
```

## Key design decisions (locked)

- **Local RS256 validation only (NFR-2).** `JwtKeyProvider` reads `public.pem` from the
  shared `keys` Docker volume mounted **read-only** at `/keys`, once at startup. Per request,
  `JwtAuthFilter` verifies signature + `exp` (60s clock-skew leeway) with nimbus — **no network
  call to auth-service**. JWKS (`AUTH_JWKS_URL`) is a documented startup-only fallback key source.
- **task-service never sees the private key** (volume mounted `:ro`).
- **Authorization matrix (SPEC §4.2) in `CardService`:** ADMIN sees/edits/deletes all; USER sees
  `creator_id==me OR assignee_id==me`, but edits/deletes only `creator_id==me`. USER `POST`
  forces `creator_id`+`assignee_id` to self (ignores supplied assignee); ADMIN honors supplied
  `assignee_id`. Being an assignee does NOT grant edit rights.
- **Status validation:** request DTO carries status as a raw String; `Status.valueOf` in the
  service → out-of-enum yields a clean `400` (AC-11).
- **Request bodies are snake_case** (`assignee_id`) → DTOs use `@JsonProperty("assignee_id")`.
  Response is snake_case via `CardResponse` `@JsonProperty`. (This was a bug caught in verify.)
- **Error envelope** `{ "error": { code, message } }` via `@RestControllerAdvice` + Security
  entrypoint/deniedHandler — identical shape to auth-service.
- **Persistence:** Spring Data JPA + Hibernate, schema via `ddl-auto: update` (parity with
  auth's `create_all`; Flyway deferred). UUID PKs generated app-side. `creator_id`/`assignee_id`
  are cross-service refs — **no FK**.
- **Build:** no committed Gradle/Maven wrapper jar (blocked by repo-wide `*.jar` gitignore + no
  host Java to generate one). Reproducibility comes from the **pinned build image + pom.xml**.
- **Port & compose:** 8080; `task-db` postgres:16-alpine w/ `pg_isready` healthcheck; task-service
  `depends_on` task-db `service_healthy` AND auth-service `service_started` (so the keys volume
  has `public.pem` before startup).

## How to run / verify (full stack)

```bash
# from repo root (in WSL); .env already present
wsl -e bash -lc "cd /mnt/d/programowanie/projects/infosys-dashboard && docker compose up --build -d"
curl http://localhost:8080/api/health     # {"status":"ok"}
wsl -e bash -lc "bash /mnt/d/programowanie/projects/infosys-dashboard/task-service/verify.sh"  # 19/19 ALL GREEN
# stop: docker compose down   (add -v to wipe taskdb/authdb + keys)
```
verify.sh logs in as admin (`admin@example.com` / `change-me`) + two USERs, then exercises
AC-4, AC-5…AC-12, AC-14. (As of writing, the stack is left running.)

## task-service API recap (SPEC §5.2)

| Method | Path | Auth | Result |
|--------|------|------|--------|
| GET | `/api/cards` | Bearer | 200 [Card] — ADMIN all; USER created-by-me OR assigned-to-me |
| POST | `/api/cards` | Bearer | 201 Card; 400 (no title). USER auto-assigns self; ADMIN honors `assignee_id` |
| PATCH | `/api/cards/{id}/status` | Bearer | 200 Card; 400 bad status, 403, 404 |
| PATCH | `/api/cards/{id}/assignee` | Bearer | 200 Card; 403, 404 |
| DELETE | `/api/cards/{id}` | Bearer | 204; 403, 404 |
| GET | `/api/health` | – | 200 {status:"ok"} |

`Card` = `{ id, title, description, status, creator_id, assignee_id, created_at, updated_at }`.

## Known minor cleanups (non-blocking)

- Spring Security prints a "Using generated security password" line at startup (its default
  `UserDetailsServiceAutoConfiguration`). The custom filter chain never uses it — harmless noise.
  Could be silenced by excluding that autoconfig if desired.
- No unit/integration tests yet (verification is the curl harness). Adding `@SpringBootTest` /
  slice tests is optional polish.

---

# What to do next

> Workflow each phase: `/opsx:propose <name>` → `/opsx:apply` → verify against AC → `/opsx:archive`.

## Phase 3 — frontend-board (React/TS/Vite + TailwindCSS)  ← NEXT

**Capability:** `frontend-board`. **AC:** SPEC §6.

- Vite React+TS app on **port 3000**, TailwindCSS (`tailwind.config.js`).
- Register / login / logout (clear token). Token in localStorage (MVP).
- API base URLs from **build-time** env `VITE_API_BASE_URL` (task 8080),
  `VITE_AUTH_BASE_URL` (auth 8000) — injected at `vite build`, not runtime.
  (Already present in `.env.example`.)
- Kanban board with the 5 status columns; create card, move card across columns
  (status change via `PATCH /api/cards/{id}/status`), delete card.
- Role/ownership-aware UI: hide/disable actions not allowed by SPEC §4.2 (mirror the
  task-service matrix — USER can only edit/delete own-created cards).
- ADMIN assignee picker via `GET /admin/users` (auth-service).
- Handle loading/error states; `401` → redirect to login.
- Add `frontend` service + Dockerfile to the root `docker-compose.yml`.
- Remember CORS: task-service + auth-service already allow `CORS_ORIGINS=http://localhost:3000`.

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
MUST NOT require app code changes (config/infra only). Start only after Phases 1–4 are green.
