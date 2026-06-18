## ADDED Requirements

### Requirement: One-command stack startup
The system SHALL start the entire application — frontend, task-service, auth-service,
task-db, and auth-db — with the single command `docker compose up --build` from a freshly
cloned repository with a copied `.env`. All five services SHALL reach a healthy/started
state without manual intervention or out-of-band steps.

#### Scenario: All services come up healthy
- **WHEN** an operator runs `docker compose up --build` against a clean checkout with
  `.env` copied from `.env.example`
- **THEN** containers for `frontend`, `task-service`, `auth-service`, `task-db`, and
  `auth-db` are created and reach a running state
- **AND** `task-db` and `auth-db` report `healthy` via their Postgres healthchecks
- **AND** the `frontend` container reports `healthy` via its nginx healthcheck
- **AND** no service exits or crash-loops during startup

#### Scenario: Startup ordering respects dependencies
- **WHEN** the stack starts
- **THEN** `auth-service` starts only after `auth-db` is healthy
- **AND** `task-service` starts only after `task-db` is healthy and the shared RS256
  public key has been published to the `keys` volume by `auth-service`
- **AND** the `frontend` service `depends_on` `auth-service` and `task-service`

### Requirement: Containerized frontend serves the board
The system SHALL serve the production frontend bundle from the `frontend` container
(nginx) on host port 3000, built from `./frontend` via its multi-stage Dockerfile. The
host Vite dev server SHALL NOT be required for the stack to be usable.

#### Scenario: Frontend reachable on port 3000
- **WHEN** the stack is up
- **THEN** a browser navigating to `http://localhost:3000` is served the SPA from the
  nginx container
- **AND** client-side routes (e.g. `/login`, `/register`) resolve via the SPA fallback
  rather than returning 404

#### Scenario: API base URLs are baked at build time
- **WHEN** the `frontend` image is built
- **THEN** `VITE_AUTH_BASE_URL` (`http://localhost:8000`) and `VITE_API_BASE_URL`
  (`http://localhost:8080`) are supplied as Docker **build args** and compiled into the
  bundle at `vite build`
- **AND** these values are not provided as runtime `environment:` entries (changing them
  requires a rebuild)
- **AND** the served bundle issues auth requests to `localhost:8000` and task requests to
  `localhost:8080`

### Requirement: End-to-end operation against the containerized stack
The system SHALL support the full user journey against the containerized stack with the
frontend served from nginx, exercising acceptance criteria AC-1…AC-15. CORS SHALL permit
the `http://localhost:3000` origin for both backends.

#### Scenario: Admin end-to-end flow
- **WHEN** an operator logs in through the containerized frontend as the bootstrap admin
  (`admin@example.com` / `BOOTSTRAP_ADMIN_PASSWORD`)
- **THEN** the admin can create a card, change its status, assign it to a user, and delete
  it, with each operation succeeding against the containerized task-service

#### Scenario: Self-service register and login
- **WHEN** a new user registers via the containerized frontend
- **THEN** the user is auto-logged-in and lands on the board with the five status columns

#### Scenario: Role/ownership visibility and gating
- **WHEN** a non-admin USER is signed in
- **THEN** the board shows only cards the user created or is assigned to
- **AND** actions the server would reject (per SPEC §4.2) are hidden in the UI, while the
  server remains the authoritative enforcer

### Requirement: Run and architecture documentation (NFR-6)
The repository SHALL provide a root `README.md` documenting how to run the system, the
bootstrap admin credentials, and the architecture and key design decisions. The root
`.env.example` SHALL document every configuration key required to start the stack,
including the frontend `VITE_*` build args.

#### Scenario: README enables a one-command run
- **WHEN** a reviewer follows the root `README.md`
- **THEN** it states the single command to start the stack, the URL to open
  (`http://localhost:3000`), and the bootstrap admin credentials
  (`admin@example.com` / `BOOTSTRAP_ADMIN_PASSWORD`)
- **AND** it summarizes the architecture and key decisions: headless auth-service, RS256
  JWTs validated locally by task-service via the shared `keys` volume, database-per-service,
  and build-time `VITE_*` frontend configuration

#### Scenario: .env.example documents all keys
- **WHEN** a reviewer copies `.env.example` to `.env`
- **THEN** every key needed to start all five services is present and documented,
  including `VITE_AUTH_BASE_URL` and `VITE_API_BASE_URL`
- **AND** no secret values are committed (placeholders only)
