# user-administration Specification

## Purpose
TBD - created by archiving change auth-service. Update Purpose after archive.
## Requirements
### Requirement: Admin creates users

An authenticated `ADMIN` SHALL be able to create user accounts via `POST /admin/users`, optionally specifying the role. Non-admin callers MUST be rejected.

#### Scenario: Admin creates a user
- **WHEN** an `ADMIN` sends `POST /admin/users` with `{ email, password, role? }`
- **THEN** the system creates the account and responds `201` with `{ id, email, role }`

#### Scenario: Duplicate email on admin create
- **WHEN** an `ADMIN` sends `POST /admin/users` with an email that already exists
- **THEN** the system responds `409`

#### Scenario: Non-admin attempts create
- **WHEN** a `USER` (or unauthenticated caller) sends `POST /admin/users`
- **THEN** the system responds `403` for an authenticated `USER` and `401` when no valid token is present

### Requirement: Admin promotes a user to ADMIN

An authenticated `ADMIN` SHALL be able to promote an existing user to the `ADMIN` role via `POST /admin/users/{id}/promote`.

#### Scenario: Successful promotion
- **WHEN** an `ADMIN` sends `POST /admin/users/{id}/promote` for an existing user
- **THEN** the system responds `200` with `{ id, email, role: "ADMIN" }`

#### Scenario: Promote unknown user
- **WHEN** an `ADMIN` promotes a non-existent user id
- **THEN** the system responds `404`

#### Scenario: Non-admin attempts promotion
- **WHEN** a `USER` sends `POST /admin/users/{id}/promote`
- **THEN** the system responds `403`

### Requirement: Admin lists users

An authenticated `ADMIN` SHALL be able to list all users via `GET /admin/users` so an admin can later select a card assignee.

#### Scenario: Admin lists users
- **WHEN** an `ADMIN` sends `GET /admin/users`
- **THEN** the system responds `200` with an array of `{ id, email, role }`

#### Scenario: Non-admin attempts list
- **WHEN** a `USER` sends `GET /admin/users`
- **THEN** the system responds `403`

