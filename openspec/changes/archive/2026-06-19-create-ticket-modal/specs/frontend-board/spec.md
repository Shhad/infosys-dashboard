## MODIFIED Requirements

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
