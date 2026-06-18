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
login the app SHALL show the board. When `POST /login` fails with `401` (bad
credentials), the login screen SHALL display the message "Wrong email or password";
it MUST NOT display the session-expiry message and MUST NOT clear an existing
session or redirect.

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

#### Scenario: Bad credentials show credential-specific message
- **WHEN** `POST /login` returns `401` because the email or password is wrong
- **THEN** the login screen shows "Wrong email or password"
- **AND** does not show the "session expired" message and does not redirect

### Requirement: Logout clears session

The frontend SHALL provide a logout action that removes the stored token from
`localStorage` and returns the user to the login screen. After logout, no
authenticated API call SHALL carry the cleared token.

#### Scenario: Logout clears token
- **WHEN** a logged-in user activates logout
- **THEN** the stored token is removed and the user is shown the login screen

### Requirement: Authentication routing and 401 handling

The frontend SHALL require authentication to view the board: an unauthenticated
visitor SHALL be shown the login screen. When an *authenticated* API call returns
`401`, the app SHALL clear the stored token and redirect to the login screen. The
global session-clear/redirect behaviour SHALL NOT apply to the unauthenticated
`POST /login` and `POST /register` requests, whose `401`/error responses are
surfaced to their own forms instead.

#### Scenario: Unauthenticated visitor routed to login
- **WHEN** a visitor without a stored token opens the app
- **THEN** the login screen is shown instead of the board

#### Scenario: 401 redirects to login
- **GIVEN** a logged-in user whose token has expired or been revoked
- **WHEN** an authenticated API call returns `401`
- **THEN** the app clears the token and redirects to the login screen

#### Scenario: Login 401 does not trigger session redirect
- **GIVEN** a visitor on the login screen submitting credentials
- **WHEN** `POST /login` returns `401`
- **THEN** the app does not clear/redirect via the global `401` handler and the
  error is shown on the login form

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

### Requirement: Board toolbar with issue count

The frontend SHALL render a board toolbar above the columns containing a "Board" title
and a muted subtitle showing the total number of cards currently loaded, in the form
"· N issues". The count SHALL reflect the number of cards across all five columns and
SHALL stay in sync as cards are created or deleted. The primary "Create issue" button
SHALL be presented on the opposite (trailing) side of the same toolbar.

#### Scenario: Toolbar shows total issue count

- **WHEN** the board has finished loading its cards
- **THEN** the toolbar shows a "Board" title and a subtitle reading "· N issues" where N
  equals the total number of loaded cards

#### Scenario: Count updates on create and delete

- **WHEN** a card is created or deleted
- **THEN** the toolbar's "N issues" count updates to the new total

#### Scenario: Create button in the toolbar

- **WHEN** the toolbar renders
- **THEN** the primary "Create issue" button is shown on the trailing side of the toolbar

### Requirement: Create card

The frontend SHALL present a single primary action to start creating a card: a blue,
rounded-border button labelled "Create issue" in the board area (replacing the
always-visible inline create form). Activating the button SHALL open a modal dialog for
entering ticket details. The modal SHALL contain a single-line **Subject** (title)
input, a multi-line **Description** `<textarea>` rendered visibly taller than the subject
field, a **Cancel** button, and a **Create** button.

For an ADMIN caller the modal SHALL additionally show an **Assignee** field — a select
list of users with a person icon immediately to its left — letting the ADMIN assign the
new ticket to another user; for a USER caller the modal SHALL NOT show any assignee
control (the service auto-assigns the creator).

Activating **Create** SHALL submit at least a title to task-service `POST /api/cards`
(including `assignee_id` only for ADMIN), and on success the new card SHALL appear on the
board and the modal SHALL close and reset its fields. An empty subject SHALL be prevented
client-side or its `400` error surfaced. Activating **Cancel**, pressing Escape, or
clicking the backdrop SHALL close the modal without creating a card.

#### Scenario: Create issue button opens modal
- **WHEN** a user clicks the blue "Create issue" button
- **THEN** a modal dialog opens with a single-line subject input and a multi-line
  description textarea

#### Scenario: Description is a multi-line textarea
- **WHEN** the create-ticket modal is open
- **THEN** the description field is a `<textarea>` taller than the single-line subject
  input

#### Scenario: Create card appears on board
- **WHEN** a user fills the subject and clicks "Create" in the modal
- **THEN** the app calls `POST /api/cards`, the returned card is shown in its column, and
  the modal closes

#### Scenario: Empty title prevented
- **WHEN** a user attempts to create a card without a subject
- **THEN** the app blocks submission or surfaces the `400` error from the service

#### Scenario: Cancel closes the modal without creating
- **WHEN** a user clicks "Cancel" (or presses Escape / clicks the backdrop)
- **THEN** the modal closes and no card is created

#### Scenario: ADMIN sees assignee field in the modal
- **GIVEN** a logged-in ADMIN
- **WHEN** they open the create-ticket modal
- **THEN** an assignee select field with a person icon to its left is shown, populated
  from the loaded user list

#### Scenario: USER does not see assignee field in the modal
- **GIVEN** a logged-in USER (non-admin)
- **WHEN** they open the create-ticket modal
- **THEN** no assignee control is shown and the created card is auto-assigned to the
  creator by the service

### Requirement: Status color badge

The frontend SHALL display a card's status on the main card view as a filled pill
badge color-coded by status: `OPEN` gray, `TODO` yellow/amber, `IN_PROGRESS` blue,
`REVIEW` purple, `DONE` green. The badge SHALL render a stage-tinted background, a
leading dot in the stage color, and the uppercase status label in the stage color.
The badge SHALL be a self-contained inline pill — its color SHALL NOT fill the entire
card or surrounding content.

#### Scenario: Status shown with status-specific color

- **WHEN** a card with a given status is rendered on the board
- **THEN** its status is shown inside a pill badge whose dot and text color match the
  status (OPEN→gray, TODO→amber, IN_PROGRESS→blue, REVIEW→purple, DONE→green) over a
  matching tinted background

#### Scenario: Color confined to the badge

- **WHEN** the status badge is rendered
- **THEN** the status-specific color (tint background, dot, and text) is confined to the
  badge pill and is not applied as a fill of the entire card or surrounding content

#### Scenario: Badge label matches the column

- **WHEN** a card renders in a status column
- **THEN** the badge's uppercase label matches that column's status name

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

### Requirement: USER read-only assignee label

When the logged-in user is a `USER` (non-admin), the frontend SHALL display each
card's assignee as a read-only label rather than an editable picker. The label SHALL
show a person icon immediately to the left of the assignee's email, resolved from the
loaded user directory; when the card has no assignee the label SHALL read
"Unassigned". The label SHALL be shown for every card regardless of whether the USER
may modify it, and the USER MUST NOT be offered any control to change the assignee.

To resolve assignee ids to emails for non-admin callers, the frontend SHALL load the
user directory from auth-service `GET /users` (the authenticated directory endpoint)
for `USER`-role callers.

#### Scenario: USER sees assignee email as a read-only label
- **GIVEN** a logged-in `USER` and a card assigned to a known user
- **WHEN** the board renders that card
- **THEN** the card shows a person icon followed by the assignee's email as static text
- **AND** no assignee picker or other control to change the assignee is shown

#### Scenario: USER sees "Unassigned" for an unassigned card
- **GIVEN** a logged-in `USER` and a card with no assignee
- **WHEN** the board renders that card
- **THEN** the assignee label reads "Unassigned"

#### Scenario: USER directory loaded to resolve labels
- **GIVEN** a logged-in `USER`
- **WHEN** the board loads
- **THEN** the app calls auth-service `GET /users` and uses the returned
  `{ id, email }` entries to resolve assignee emails

### Requirement: Admin assignee picker

When the logged-in user is an ADMIN, the frontend SHALL load the user list from
auth-service `GET /admin/users` and present it as an assignee picker, letting the
ADMIN set a card's assignee on creation and/or via
`PATCH /api/cards/{id}/assignee`. The picker SHALL be shown to ADMIN-role callers
only; USER-role callers SHALL instead see the read-only assignee label (see
"USER read-only assignee label"). The currently assigned user SHALL be excluded from
the picker's select list. The assignee display SHALL show a person icon to the left of
the assignee email, and the picker's dropdown SHALL be constrained so it does not
overflow outside the card bounds.

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
- **AND** the read-only assignee label is shown instead

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

