## ADDED Requirements

### Requirement: Health endpoint

The auth-service SHALL expose an unauthenticated health endpoint reporting service liveness.

#### Scenario: Health check
- **WHEN** a client sends `GET /health`
- **THEN** the system responds `200` with `{ "status": "ok" }`

### Requirement: Standardized error format

All error responses SHALL use the body shape `{ "error": { "code": string, "message": string } }` with the HTTP status codes defined by the API contract (`400`, `401`, `403`, `404`, `409`).

#### Scenario: Error body shape
- **WHEN** any auth-service request fails validation or authorization
- **THEN** the response body is `{ "error": { "code", "message" } }` with the matching status code

### Requirement: CORS allows the frontend origin

The auth-service SHALL be configured to allow cross-origin requests from the frontend origin so the browser client can call `/register` and `/login`.

#### Scenario: Preflight from frontend
- **WHEN** the frontend origin issues a CORS preflight to an auth-service endpoint
- **THEN** the response permits the configured frontend origin, methods, and the `Authorization` header

### Requirement: Env-driven configuration and secrets

All secrets and environment-specific configuration (database URL, RS256 keys, JWT lifetime, bootstrap admin credentials) SHALL be supplied via environment variables, never hardcoded in the repository. A `.env.example` MUST document every required key.

#### Scenario: Configuration sourced from environment
- **WHEN** auth-service starts
- **THEN** it reads `AUTH_DB_URL`, `JWT_PRIVATE_KEY_PATH`/`JWT_PUBLIC_KEY_PATH`, `JWT_EXPIRES_IN`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` from the environment
- **AND** no secret value is present in committed source files

### Requirement: Containerized service with its own database

The auth-service SHALL run as a Docker container backed by a dedicated PostgreSQL database (`authdb`), startable via the root `docker-compose.yml`. The database MUST expose a healthcheck and the service MUST wait for the database to be healthy before starting.

#### Scenario: One-command startup
- **WHEN** an operator runs `docker compose up --build` with `.env` configured
- **THEN** `auth-db` (Postgres) and `auth-service` start, the database becomes healthy before the service starts, and `GET /health` returns `200`

#### Scenario: Database isolation
- **WHEN** auth-service persists users
- **THEN** they are stored in the `authdb` database owned solely by auth-service (database-per-service; not shared with other services)
