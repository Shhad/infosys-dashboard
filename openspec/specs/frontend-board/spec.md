# frontend-board Specification

## Purpose

The React/TypeScript single-page app (Vite + TailwindCSS, port 3000) that lets users
register, log in, and manage cards on a 5-column kanban board. It consumes the
existing auth-service and task-service APIs, gates UI actions to the SPEC §4.2
role/ownership matrix, gives ADMINs an assignee picker, reads API URLs from
build-time `VITE_*` variables, and handles session/`401` flows. Covers SPEC §6.

## Requirements
### Requirement: Build-time API configuration

The frontend SHALL read the auth and task API base URLs exclusively from the
build-time environment variables `VITE_AUTH_BASE_URL` and `VITE_API_BASE_URL`,
injected into the bundle during `vite build` (not at runtime). The repository SHALL
ship an `.env.example` documenting both variables. The app MUST NOT hardcode API
hostnames in source.

#### Scenario: API URLs sourced from env at build
- **WHEN** the app issues a request to the auth or task service
- **THEN** the request base URL equals the value of `VITE_AUTH_BASE_URL` or
  `VITE_API_BASE_URL` respectively as resolved at build time

#### Scenario: Env example documents required variables
- **WHEN** a developer inspects the frontend `.env.example`
- **THEN** it lists `VITE_AUTH_BASE_URL` and `VITE_API_BASE_URL` with example values

### Requirement: User registration

The frontend SHALL provide a registration screen that collects email and password
and submits them to auth-service `POST /register`. On success it SHALL direct the
user to log in (or log them in automatically). On failure it SHALL display the
error message from the standard error envelope without losing the entered email.

#### Scenario: Successful registration
- **WHEN** a visitor submits the registration form with a valid new email and password
- **THEN** the app calls `POST /register`, and on `201` advances the user toward an
  authenticated session

#### Scenario: Registration error surfaced
- **WHEN** registration fails (e.g. duplicate email returns a non-2xx envelope)
- **THEN** the form shows the error message and keeps the form usable

### Requirement: User login and token storage

The frontend SHALL provide a login screen that submits email and password to
auth-service `POST /login` and, on success, store the returned `access_token` in
`localStorage` and attach it as a `Bearer` token on subsequent API requests. After
login the app SHALL show the board.

#### Scenario: Successful login stores token
- **WHEN** a user submits valid credentials
- **THEN** the app stores the `access_token` from the `200` response in `localStorage`
  and renders the board

#### Scenario: Token attached to API calls
- **WHEN** an authenticated request is made to the task service
- **THEN** the request carries an `Authorization: Bearer <token>` header

#### Scenario: Invalid credentials rejected
- **WHEN** a user submits invalid credentials
- **THEN** the app shows an error and does not store a token

### Requirement: Logout clears session

The frontend SHALL provide a logout action that removes the stored token from
`localStorage` and returns the user to the login screen. After logout, no
authenticated API call SHALL carry the cleared token.

#### Scenario: Logout clears token
- **WHEN** a logged-in user activates logout
- **THEN** the stored token is removed and the user is shown the login screen

### Requirement: Authentication routing and 401 handling

The frontend SHALL require authentication to view the board: an unauthenticated
visitor SHALL be shown the login screen. When any API call returns `401`, the app
SHALL clear the stored token and redirect to the login screen.

#### Scenario: Unauthenticated visitor routed to login
- **WHEN** a visitor without a stored token opens the app
- **THEN** the login screen is shown instead of the board

#### Scenario: 401 redirects to login
- **GIVEN** a logged-in user whose token has expired or been revoked
- **WHEN** an API call returns `401`
- **THEN** the app clears the token and redirects to the login screen

### Requirement: Five-column kanban board

The frontend SHALL render the board as exactly five columns corresponding to the
statuses `OPEN`, `TODO`, `IN_PROGRESS`, `REVIEW`, and `DONE`. It SHALL load the
caller's visible cards from task-service `GET /api/cards` and place each card in the
column matching its `status`.

#### Scenario: Board shows five status columns
- **WHEN** the board renders
- **THEN** five columns are displayed, one per status in
  `OPEN, TODO, IN_PROGRESS, REVIEW, DONE`

#### Scenario: Cards grouped by status
- **GIVEN** the API returns cards with various statuses
- **WHEN** the board renders
- **THEN** each card appears in the column equal to its `status` field

### Requirement: Create card

The frontend SHALL let an authenticated user create a card by submitting at least a
title to task-service `POST /api/cards`. On success the new card SHALL appear on the
board. An empty title SHALL be prevented client-side or its `400` error surfaced.

#### Scenario: Create card appears on board
- **WHEN** a user submits the create-card form with a title
- **THEN** the app calls `POST /api/cards` and the returned card is shown in its column

#### Scenario: Empty title prevented
- **WHEN** a user attempts to create a card without a title
- **THEN** the app blocks submission or surfaces the `400` error from the service

### Requirement: Status color badge

The frontend SHALL display a card's status on the main card view as a badge whose
frame (border) is color-coded by status: `OPEN` gray, `TODO` yellow, `IN_PROGRESS`
blue, `REVIEW` purple, `DONE` green. The color SHALL be applied to the badge frame
around the status only.

#### Scenario: Status shown with status-specific frame color

- **WHEN** a card with a given status is rendered on the board
- **THEN** its status is shown inside a bordered badge whose frame color matches the
  status (OPEN→gray, TODO→yellow, IN_PROGRESS→blue, REVIEW→purple, DONE→green)

#### Scenario: Color applied only to the frame

- **WHEN** the status badge is rendered
- **THEN** the status-specific color is applied to the badge's border (frame), not as
  a fill of the entire card or surrounding content

### Requirement: Card overflow actions menu

The frontend SHALL present a "…" (three-dots) overflow menu button on the same row as
the card title, available for cards the caller may modify. Opening the menu SHALL
reveal a "Move to" status control and a "Delete" item with a trash icon. The previous
standalone bottom "Delete" link SHALL NOT be shown.

#### Scenario: Overflow button on the title row

- **GIVEN** a card the caller may modify
- **WHEN** the card renders
- **THEN** a "…" overflow button is shown on the same row as the card title

#### Scenario: Menu exposes move and delete

- **WHEN** the caller opens the "…" menu
- **THEN** the menu shows a "Move to" status control and a "Delete" item with a trash
  icon

#### Scenario: No standalone bottom delete link

- **WHEN** a card the caller may modify renders
- **THEN** no standalone bottom "Delete" link is shown outside the overflow menu

### Requirement: Move card between columns (status change)

The frontend SHALL let a permitted user change a card's status, moving it to the
target column, via task-service `PATCH /api/cards/{id}/status`. The status-change
control SHALL live in the card's "…" overflow menu, labelled "Move to" and showing
the card's current status; the select list of target statuses SHALL exclude the card's
current status. The UI SHALL reflect the new column on success and revert/surface the
error on failure (e.g. `403`).

#### Scenario: Permitted move updates column

- **GIVEN** a user permitted to change a card's status
- **WHEN** they choose a target status from the "Move to" control
- **THEN** the app calls `PATCH /api/cards/{id}/status` with the target status and the
  card is shown in the new column

#### Scenario: Current status excluded from move list

- **GIVEN** a card with a given status
- **WHEN** the caller opens the "Move to" status list
- **THEN** the list offers every status except the card's current status

#### Scenario: Rejected move surfaced

- **WHEN** a status change returns `403`
- **THEN** the card stays in its original column and the error is surfaced

### Requirement: Delete card

The frontend SHALL let a permitted user delete a card via task-service
`DELETE /api/cards/{id}`, removing it from the board on success. The delete action
SHALL be presented as a "Delete" item with a trash icon inside the card's "…" overflow
menu.

#### Scenario: Delete removes card

- **GIVEN** a user permitted to delete a given card
- **WHEN** they choose "Delete" from the "…" menu and confirm
- **THEN** the app calls `DELETE /api/cards/{id}` and the card disappears from the board

### Requirement: Role and ownership aware UI

The frontend SHALL hide or disable actions not permitted by the SPEC §4.2 matrix
based on the caller's role (from `GET /users/me`) and per-card ownership. An ADMIN
MAY act on all cards. A USER MAY change status and delete only cards they created
(`creator_id == me`); for cards they did not create (e.g. only assigned), the move
and delete controls SHALL be hidden or disabled.

#### Scenario: USER cannot act on non-owned card
- **GIVEN** a logged-in USER and a card assigned to them but created by another user
- **WHEN** the board renders that card
- **THEN** its move and delete controls are hidden or disabled

#### Scenario: USER can act on own card
- **GIVEN** a logged-in USER and a card they created
- **WHEN** the board renders that card
- **THEN** its move and delete controls are available

#### Scenario: ADMIN can act on any card
- **GIVEN** a logged-in ADMIN and cards created by various users
- **WHEN** the board renders
- **THEN** move and delete controls are available on every card

### Requirement: Admin assignee picker

When the logged-in user is an ADMIN, the frontend SHALL load the user list from
auth-service `GET /admin/users` and present it as an assignee picker, letting the
ADMIN set a card's assignee on creation and/or via
`PATCH /api/cards/{id}/assignee`. The picker SHALL NOT be shown to USER-role callers.

The currently assigned user SHALL be excluded from the picker's select list. The
assignee display SHALL show a person icon to the left of the assignee email, and the
picker's dropdown SHALL be constrained so it does not overflow outside the card bounds.

#### Scenario: Admin sees assignee picker populated from user list
- **GIVEN** a logged-in ADMIN
- **WHEN** they open the assignee picker
- **THEN** the app has called `GET /admin/users` and the picker lists those users

#### Scenario: Current assignee excluded from picker list
- **GIVEN** a card already assigned to a user
- **WHEN** an ADMIN opens the assignee picker for that card
- **THEN** the currently assigned user is not offered as a selectable option

#### Scenario: Assignee shown with person icon
- **WHEN** a card with an assignee is rendered
- **THEN** a person icon is shown immediately to the left of the assignee email

#### Scenario: Picker stays within card bounds
- **WHEN** the assignee picker is shown on a card
- **THEN** the picker control does not overflow outside the card's bounds

#### Scenario: Admin assigns a card
- **GIVEN** a logged-in ADMIN choosing an assignee for a card
- **WHEN** they confirm the selection
- **THEN** the app calls `PATCH /api/cards/{id}/assignee` (or sets `assignee_id` on
  create) with the chosen user's id

#### Scenario: USER does not see assignee picker
- **WHEN** a USER-role caller views card controls
- **THEN** no assignee picker is shown

### Requirement: Loading and error states

The frontend SHALL surface API errors using the message from the standard error
envelope `{ "error": { "code", "message" } }` rather than failing silently, and
SHOULD display loading indicators while requests are in flight.

#### Scenario: Error envelope message shown
- **WHEN** an API call fails with a standard error envelope
- **THEN** the app displays the envelope's `message` to the user

#### Scenario: Loading indicated
- **WHEN** the board is fetching cards
- **THEN** a loading state is shown until the request resolves

