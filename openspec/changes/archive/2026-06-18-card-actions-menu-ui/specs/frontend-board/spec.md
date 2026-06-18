## ADDED Requirements

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

## MODIFIED Requirements

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
