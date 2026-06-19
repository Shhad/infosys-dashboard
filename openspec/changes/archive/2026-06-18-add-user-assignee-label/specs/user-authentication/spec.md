## ADDED Requirements

### Requirement: Authenticated user directory

The system SHALL expose `GET /users` returning a directory of all users as an array
of `{ id, email }`. The endpoint MUST require a valid bearer token but MUST NOT
require the `ADMIN` role, so any authenticated caller can resolve a user id to an
email (e.g. to display a card's assignee). The response MUST NOT include each user's
`role` or any credential material.

#### Scenario: Authenticated USER lists the directory
- **WHEN** a `USER` sends `GET /users` with a valid bearer token
- **THEN** the system responds `200` with an array of `{ id, email }` for all users
- **AND** no `role` field is included in the entries

#### Scenario: Authenticated ADMIN lists the directory
- **WHEN** an `ADMIN` sends `GET /users` with a valid bearer token
- **THEN** the system responds `200` with an array of `{ id, email }`

#### Scenario: Missing or invalid token
- **WHEN** `GET /users` is called without an `Authorization` header or with an invalid token
- **THEN** the system responds `401`
