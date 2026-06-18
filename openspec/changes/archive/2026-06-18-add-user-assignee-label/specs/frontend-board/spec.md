## ADDED Requirements

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

## MODIFIED Requirements

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
