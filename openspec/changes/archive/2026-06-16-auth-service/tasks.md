## 1. Project scaffold & dependencies

- [x] 1.1 Create `auth-service/` with `app/` package layout (`main.py`, `config.py`, `db.py`, `models.py`, `schemas.py`, `security.py`, `routers/`)
- [x] 1.2 Add `requirements.txt` (or `pyproject.toml`): fastapi, uvicorn[standard], sqlalchemy>=2, psycopg[binary], passlib[argon2], pyjwt, cryptography, pydantic-settings
- [x] 1.3 Add `.gitignore` entries for `.env`, `*.pem`, `__pycache__`
- [x] 1.4 Implement `config.py` with Pydantic Settings reading `AUTH_DB_URL`, `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH`, `JWT_EXPIRES_IN`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `CORS_ORIGINS`

## 2. Persistence layer

- [x] 2.1 Implement `db.py` SQLAlchemy engine/session factory from `AUTH_DB_URL`
- [x] 2.2 Implement `models.py` `User` (UUID id, unique email, password_hash, role ENUM ADMIN|USER default USER, created_at TIMESTAMPTZ)
- [x] 2.3 Create tables at startup (`create_all`) idempotently; add a retry/wait loop for DB readiness
- [x] 2.4 Add a `users` repository/CRUD helper (get_by_email, get_by_id, create, list, set_role)

## 3. Security: hashing & RS256 JWT

- [x] 3.1 Implement `security.py` password hashing/verify with passlib argon2 CryptContext
- [x] 3.2 Implement RS256 keypair loader: load PEM from configured paths; if absent, generate a 2048-bit keypair and write both PEM files
- [x] 3.3 Implement JWT issue (claims `sub`, `email`, `role`, `exp`, `iat`; RS256) and decode/verify helpers
- [x] 3.4 Implement JWKS document builder from the public key (with a stable `kid`)
- [x] 3.5 Implement FastAPI `get_current_user` dependency (parse `Authorization: Bearer`, verify, load user) and `require_admin` dependency

## 4. Error handling & app wiring

- [x] 4.1 Implement `AppError` and exception handlers producing `{ "error": { "code", "message" } }` for 400/401/403/404/409 and validation errors
- [x] 4.2 Wire `main.py`: create FastAPI app, CORS middleware (allow configured frontend origin + Authorization header), include routers, run startup hooks (keys, tables, bootstrap seed)
- [x] 4.3 Implement idempotent bootstrap admin seeding on startup (insert only if email missing; never overwrite)

## 5. Public auth endpoints

- [x] 5.1 `POST /register` → 201 `{id,email,role}`; 409 on duplicate; 400 on invalid payload
- [x] 5.2 `POST /login` → 200 `{access_token, token_type:"Bearer", expires_in}`; 401 on bad credentials
- [x] 5.3 `GET /users/me` (auth required) → 200 `{id,email,role}`; 401 without valid token
- [x] 5.4 `GET /.well-known/jwks.json` → 200 `{keys:[...]}` (no auth)
- [x] 5.5 `GET /health` → 200 `{status:"ok"}`

## 6. Admin endpoints

- [x] 6.1 `POST /admin/users` (ADMIN) → 201; 409 duplicate; 403 for USER; 401 unauthenticated
- [x] 6.2 `POST /admin/users/{id}/promote` (ADMIN) → 200 role ADMIN; 404 unknown; 403 for USER
- [x] 6.3 `GET /admin/users` (ADMIN) → 200 list of `{id,email,role}`; 403 for USER

## 7. Containerization & compose

- [x] 7.1 Write `auth-service/Dockerfile` (python:3.12-slim base, install deps, run uvicorn on 8000)
- [x] 7.2 Write root `docker-compose.yml` with `auth-db` (postgres:16, `pg_isready` healthcheck, named volume) and `auth-service` (`depends_on: condition: service_healthy`, ports 8000, `keys` named volume)
- [x] 7.3 Write root `.env.example` with all auth-service + DB keys (per SPEC §7.1)
- [x] 7.4 Ensure keys volume is shared (rw for auth-service) ready to be mounted read-only by task-service in iteration 2

## 8. Verification against acceptance criteria

- [x] 8.1 `docker compose up --build` brings up `auth-db` healthy then `auth-service`; `GET /health` returns 200 (AC-15 partial)
- [x] 8.2 AC-1: bootstrap admin can log in; restart creates no duplicate / no overwrite
- [x] 8.3 AC-2 & AC-3: self-register new email succeeds with role USER; duplicate email → 409
- [x] 8.4 AC-13: admin creates a user then promotes to ADMIN; same requests as USER → 403
- [x] 8.5 AC-14: protected endpoint without `Authorization` → 401; tampered token → 401
- [x] 8.6 Verify issued JWT decodes with the published public key and carries `sub/email/role/exp/iat` (signing side of AC-4)
- [x] 8.7 Document run steps + admin credentials note in a service README section (full project README authored in a later iteration)
