# task-service

Java 21 + Spring Boot service owning the kanban **cards** (iteration 2 of the
Task Dashboard). It has its own PostgreSQL database (`taskdb`, database-per-service)
and validates JWTs **locally** with the auth-service RS256 public key — it never
calls auth-service on the request path (NFR-2).

## Running

The service is part of the root `docker-compose.yml`; it is not run standalone.
Java is **not** required on the host — it builds inside a multi-stage Docker image.

```bash
# from the repo root (WSL), with .env in place
docker compose up --build -d            # brings up auth + task + their DBs
curl http://localhost:8080/api/health   # -> {"status":"ok"}
```

It listens on **8080**, reads the public key from the read-only `keys` volume
(`/keys/public.pem`, shared by auth-service), and connects to `task-db`.

## Configuration (env)

| Variable | Purpose | Default |
|----------|---------|---------|
| `TASK_DB_URL` | JDBC URL for `taskdb` | `jdbc:postgresql://task-db:5432/taskdb` |
| `TASK_DB_USER` / `TASK_DB_PASSWORD` | DB credentials | `task` / `task` |
| `JWT_PUBLIC_KEY_PATH` | RS256 public key PEM (primary key source) | `/keys/public.pem` |
| `AUTH_JWKS_URL` | JWKS endpoint (fallback key source, loaded once at startup) | — |
| `CORS_ORIGINS` | Allowed frontend origin (NFR-4) | `http://localhost:3000` |

## API (SPEC §5.2)

All endpoints except `GET /api/health` require `Authorization: Bearer <jwt>`.
Error body everywhere: `{ "error": { "code", "message" } }`.

| Method | Path | Auth | Result |
|--------|------|------|--------|
| GET | `/api/cards` | Bearer | 200 `[Card]` — ADMIN: all; USER: created-by-me OR assigned-to-me |
| POST | `/api/cards` | Bearer | 201 `Card`; 400 (missing title). USER auto-assigns self; ADMIN honors `assignee_id` |
| PATCH | `/api/cards/{id}/status` | Bearer | 200 `Card`; 400 (bad status), 403, 404 |
| PATCH | `/api/cards/{id}/assignee` | Bearer | 200 `Card`; 403, 404 |
| DELETE | `/api/cards/{id}` | Bearer | 204; 403, 404 |
| GET | `/api/health` | – | 200 `{ "status": "ok" }` |

`Card` = `{ id, title, description, status, creator_id, assignee_id, created_at, updated_at }`.
`status` ∈ `OPEN | TODO | IN_PROGRESS | REVIEW | DONE` (any → any transitions).

### Authorization (SPEC §4.2)

- **ADMIN**: sees, edits, reassigns, and deletes any card; may set any `assignee_id` on create.
- **USER**: sees cards where `creator_id == me` OR `assignee_id == me`; may change
  status / reassign / delete only cards they created (`creator_id == me`); on create,
  `creator_id` and `assignee_id` are both forced to self (any supplied `assignee_id` ignored).

## Verify

With the stack up and admin credentials from `.env`:

```bash
bash task-service/verify.sh
```

Exercises AC-4 (bad signature → 401), AC-5…AC-12, and AC-14.
