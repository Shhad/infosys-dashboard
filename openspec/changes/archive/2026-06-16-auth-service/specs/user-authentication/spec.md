## ADDED Requirements

### Requirement: Self-service registration

An unauthenticated user SHALL be able to create an account by providing an email and password. New accounts MUST be assigned the `USER` role. Email MUST be unique. Passwords MUST be stored only as a bcrypt or argon2 hash; plaintext MUST NOT appear in the database or logs.

#### Scenario: Successful registration
- **WHEN** an unauthenticated client sends `POST /register` with a new email and password
- **THEN** the system creates a user with role `USER`
- **AND** responds `201` with `{ id, email, role }`
- **AND** the user can subsequently log in

#### Scenario: Email already taken
- **WHEN** `POST /register` is called with an email that already exists
- **THEN** the system responds `409` with the standard error body `{ "error": { "code, "message" } }`

#### Scenario: Invalid registration payload
- **WHEN** `POST /register` is called with a missing/invalid email or empty password
- **THEN** the system responds `400`

### Requirement: Login issues an RS256 JWT

The system SHALL authenticate a user by email and password and return an RS256-signed JWT access token. The token MUST contain the claims `sub` (user id), `email`, `role` (`ADMIN` or `USER`), `exp`, and `iat`. Token lifetime MUST come from configuration (`JWT_EXPIRES_IN`).

#### Scenario: Successful login
- **WHEN** `POST /login` is called with correct credentials
- **THEN** the system responds `200` with `{ access_token, token_type: "Bearer", expires_in }`
- **AND** the `access_token` is a JWT signed with the RS256 private key carrying claims `sub`, `email`, `role`, `exp`, `iat`

#### Scenario: Invalid credentials
- **WHEN** `POST /login` is called with a wrong password or unknown email
- **THEN** the system responds `401`

### Requirement: Current-user endpoint

The system SHALL expose `GET /users/me` returning the authenticated caller's identity. The endpoint MUST require a valid bearer token.

#### Scenario: Authenticated request
- **WHEN** `GET /users/me` is called with a valid bearer token
- **THEN** the system responds `200` with `{ id, email, role }` matching the token subject

#### Scenario: Missing or invalid token
- **WHEN** `GET /users/me` is called without an `Authorization` header or with an invalid token
- **THEN** the system responds `401`

### Requirement: Public key publication via JWKS

The system SHALL publish the RS256 public key at `GET /.well-known/jwks.json` so other services can validate tokens locally without contacting auth-service per request.

#### Scenario: Fetch JWKS
- **WHEN** any client sends `GET /.well-known/jwks.json`
- **THEN** the system responds `200` with `{ keys: [ ... ] }` containing the active RS256 public key
- **AND** the endpoint requires no authentication

### Requirement: Idempotent bootstrap admin

On startup the system SHALL ensure a bootstrap admin account exists, derived from `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD`. The seed MUST be idempotent: if a user with that email already exists it MUST NOT be overwritten and the password MUST NOT be reset.

#### Scenario: First startup seeds admin
- **WHEN** auth-service starts against an empty database with bootstrap env vars set
- **THEN** an account with role `ADMIN` for `BOOTSTRAP_ADMIN_EMAIL` exists and can log in via `POST /login`

#### Scenario: Restart does not duplicate or overwrite
- **WHEN** auth-service restarts and the bootstrap admin already exists
- **THEN** no duplicate account is created
- **AND** the existing password hash and role are left unchanged
