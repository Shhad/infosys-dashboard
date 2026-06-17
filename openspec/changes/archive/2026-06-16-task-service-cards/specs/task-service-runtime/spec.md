## ADDED Requirements

### Requirement: Local RS256 JWT validation without calling auth-service

The task-service SHALL validate the `Authorization: Bearer <jwt>` token **locally** using the auth-service RS256 **public key**, verifying the signature and expiry (`exp`) with a small clock-skew leeway. It MUST NOT make a network call to auth-service on the token-validation path (NFR-2). The public key SHALL be loaded from the configured key path (`JWT_PUBLIC_KEY_PATH`, e.g. the read-only mounted `keys` volume); the JWKS endpoint (`AUTH_JWKS_URL`) MAY be used as an alternative key source but not as a per-request lookup. The validated `sub` (user id) and `role` (`ADMIN`|`USER`) SHALL be used for authorization.

#### Scenario: Valid token authorized locally
- **GIVEN** a valid JWT issued by auth-service
- **WHEN** task-service receives a request with that token
- **THEN** the request is authorized using the locally loaded public key, with no network call to auth-service on the validation path

#### Scenario: Bad signature rejected
- **WHEN** a request presents a JWT whose signature does not verify against the public key
- **THEN** the response is `401`

#### Scenario: Missing or expired token rejected
- **WHEN** a request to a protected endpoint omits the `Authorization` header or presents an expired token
- **THEN** the response is `401`

### Requirement: Authentication required on protected endpoints

All task-service endpoints except `GET /api/health` (and CORS preflight) SHALL require a valid JWT. Requests without a valid token SHALL receive `401`.

#### Scenario: No token on a protected endpoint
- **GIVEN** no `Authorization` header
- **WHEN** a request is made to any `/api/cards` endpoint
- **THEN** the response is `401`

### Requirement: Health endpoint

The task-service SHALL expose an unauthenticated health endpoint reporting service liveness.

#### Scenario: Health check
- **WHEN** a client sends `GET /api/health`
- **THEN** the system responds `200` with `{ "status": "ok" }`

### Requirement: Standardized error format

All task-service error responses SHALL use the body shape `{ "error": { "code": string, "message": string } }` with the HTTP status codes defined by the API contract (`400`, `401`, `403`, `404`).

#### Scenario: Error body shape
- **WHEN** any task-service request fails validation or authorization
- **THEN** the response body is `{ "error": { "code", "message" } }` with the matching status code

### Requirement: CORS allows the frontend origin

The task-service SHALL be configured to allow cross-origin requests from the configured frontend origin, including the `Authorization` header, so the browser client can call the card endpoints (NFR-4).

#### Scenario: Preflight from frontend
- **WHEN** the frontend origin issues a CORS preflight to a task-service endpoint
- **THEN** the response permits the configured frontend origin, methods, and the `Authorization` header

### Requirement: Env-driven configuration and secrets

All environment-specific configuration (database URL/credentials, JWT public key path or JWKS URL, frontend CORS origin) SHALL be supplied via environment variables, never hardcoded in the repository. The root `.env.example` MUST document every required task-service key.

#### Scenario: Configuration sourced from environment
- **WHEN** task-service starts
- **THEN** it reads `TASK_DB_URL`, `TASK_DB_USER`, `TASK_DB_PASSWORD`, and `JWT_PUBLIC_KEY_PATH` (or `AUTH_JWKS_URL`) from the environment
- **AND** no secret value is present in committed source files

### Requirement: Containerized service with its own database

The task-service SHALL run as a Docker container backed by a dedicated PostgreSQL database (`taskdb`), defined in the same root `docker-compose.yml` as auth-service. The database MUST expose a healthcheck and the service MUST wait for the database to be healthy before starting. The service image MUST build via a multi-stage Docker build so no Java toolchain is required on the host.

#### Scenario: One-command startup alongside auth-service
- **WHEN** an operator runs `docker compose up --build` with `.env` configured
- **THEN** `task-db` (Postgres) and `task-service` start, the database becomes healthy before the service starts, and `GET /api/health` returns `200`

#### Scenario: Database isolation
- **WHEN** task-service persists cards
- **THEN** they are stored in the `taskdb` database owned solely by task-service (database-per-service; not shared with auth-service)

#### Scenario: Public key shared read-only
- **WHEN** task-service starts
- **THEN** it reads the RS256 public key from the `keys` volume mounted read-only, and does not have access to the private key
