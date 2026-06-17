## ADDED Requirements

### Requirement: Card data model

The task-service SHALL persist cards in its own `taskdb` database with fields: `id` (UUID, primary key), `title` (NOT NULL), `description` (nullable text), `status` (one of `OPEN`, `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`, defaulting to `OPEN`), `creator_id` (UUID, NOT NULL), `assignee_id` (UUID, nullable), `created_at` and `updated_at` (timestamps with time zone). `creator_id` and `assignee_id` reference users owned by auth-service and MUST NOT be foreign keys (cross-service references).

#### Scenario: Card persisted with defaults
- **WHEN** a card is created without an explicit status
- **THEN** it is stored with status `OPEN`, a generated UUID `id`, and `created_at`/`updated_at` timestamps

#### Scenario: Card shape returned
- **WHEN** the API returns a card
- **THEN** the body is `{ id, title, description, status, creator_id, assignee_id, created_at, updated_at }`

### Requirement: List cards with role-based visibility

`GET /api/cards` SHALL require authentication and return cards according to the caller's role: an `ADMIN` SHALL receive all cards; a `USER` SHALL receive only cards where `creator_id` equals their own id OR `assignee_id` equals their own id.

#### Scenario: USER sees own-created and assigned cards only
- **GIVEN** a USER A and three cards: one created by A, one assigned to A (created by someone else), and one unrelated to A
- **WHEN** A sends `GET /api/cards`
- **THEN** the response `200` contains exactly the first two cards and not the unrelated card

#### Scenario: ADMIN sees all cards
- **GIVEN** cards created by and assigned to several different users
- **WHEN** an ADMIN sends `GET /api/cards`
- **THEN** the response `200` contains all cards in the system

### Requirement: Create card with auto-assignment for USER

`POST /api/cards` SHALL require authentication and create a card with `creator_id` set to the caller. When the caller is a `USER`, the service SHALL set both `creator_id` AND `assignee_id` to the caller's id, ignoring any `assignee_id` supplied in the request body. When the caller is an `ADMIN`, the service SHALL honor the supplied `assignee_id` (or leave it null if absent). A missing or empty `title` SHALL return `400`.

#### Scenario: USER create auto-assigns self even if another assignee is supplied
- **GIVEN** a logged-in USER
- **WHEN** they `POST /api/cards` with a title and an `assignee_id` belonging to another user
- **THEN** the created card has `creator_id` and `assignee_id` both equal to the USER's own id

#### Scenario: ADMIN create with explicit assignee
- **GIVEN** a logged-in ADMIN and an existing USER B
- **WHEN** the ADMIN `POST /api/cards` with a title and `assignee_id = B`
- **THEN** the created card has `assignee_id == B` and `creator_id` equal to the ADMIN's id

#### Scenario: Missing title rejected
- **WHEN** a card is created without a title
- **THEN** the response is `400` with the standard error envelope

### Requirement: Change card status

`PATCH /api/cards/{id}/status` SHALL require authentication and set the card's `status` to the supplied value. Any value within the enum is accepted (transitions are unrestricted, any state to any state). A value outside the enum SHALL return `400`. An `ADMIN` MAY change the status of any card; a `USER` MAY change the status only of cards they created (`creator_id == me`), otherwise `403`. A non-existent card SHALL return `404`.

#### Scenario: USER changes status of own card
- **GIVEN** a USER and a card they created with status `OPEN`
- **WHEN** they `PATCH /api/cards/{id}/status` with status `DONE`
- **THEN** the response `200` shows the card with status `DONE`

#### Scenario: USER cannot change status of a card they did not create
- **GIVEN** a USER and a card assigned to them but created by someone else
- **WHEN** they `PATCH /api/cards/{id}/status`
- **THEN** the response is `403`

#### Scenario: Invalid status rejected
- **WHEN** a `PATCH /api/cards/{id}/status` request supplies a status outside the enum
- **THEN** the response is `400`

#### Scenario: ADMIN changes status of any card
- **GIVEN** an ADMIN and a card created by another user
- **WHEN** the ADMIN `PATCH /api/cards/{id}/status` with a valid status
- **THEN** the response `200` shows the updated status

### Requirement: Change card assignee

`PATCH /api/cards/{id}/assignee` SHALL require authentication and set the card's `assignee_id` to the supplied value. An `ADMIN` MAY reassign any card; a `USER` MAY reassign only cards they created (`creator_id == me`), otherwise `403`. A non-existent card SHALL return `404`.

#### Scenario: USER reassigns own card
- **GIVEN** a USER and a card they created
- **WHEN** they `PATCH /api/cards/{id}/assignee` with a new `assignee_id`
- **THEN** the response `200` shows the updated `assignee_id`

#### Scenario: USER cannot reassign a card they did not create
- **GIVEN** a USER and a card created by another user
- **WHEN** they `PATCH /api/cards/{id}/assignee`
- **THEN** the response is `403`

### Requirement: Delete card

`DELETE /api/cards/{id}` SHALL require authentication. An `ADMIN` MAY delete any card; a `USER` MAY delete only cards they created (`creator_id == me`), otherwise `403`. A successful delete SHALL return `204`. A non-existent card SHALL return `404`.

#### Scenario: USER cannot delete another user's card
- **GIVEN** a USER and a card created by someone else
- **WHEN** they `DELETE /api/cards/{id}`
- **THEN** the response is `403`

#### Scenario: ADMIN deletes any card
- **GIVEN** an ADMIN and a card created by another user
- **WHEN** the ADMIN `DELETE /api/cards/{id}`
- **THEN** the response is `204` and the card no longer exists

#### Scenario: Deleting a missing card
- **WHEN** a `DELETE /api/cards/{id}` targets an id that does not exist
- **THEN** the response is `404`
