## Why

The create-card form currently sits inline above the board as a row of bare inputs
("Title", "Description", optional "Assignee", "Add card"). It is visually noisy, takes
permanent vertical space at the top of the board, and uses a single-line input for the
description. We want a clean board header with a single prominent "Create issue" action
that opens a focused modal for entering ticket details.

## What Changes

- Replace the always-visible inline `CreateCardForm` with a **blue, rounded "Create
  issue" button** in the board area.
- Clicking the button opens a **modal dialog** for creating a ticket containing:
  - a single-line **Subject** (title) input,
  - a multi-line **Description** `<textarea>` (visibly taller than the subject field),
  - a **Cancel** button that closes the modal without creating anything,
  - a **Create** button that submits the new ticket.
- **Role-aware assignee field inside the modal:**
  - A **USER** sees no assignee control (the service auto-assigns the creator).
  - An **ADMIN** sees an additional **Assignee** select field, with a **person icon** to
    its left (matching the assignee display on board cards), to assign the ticket to
    another user on creation.
- Modal UX details: closes on Cancel / Escape / backdrop click, blocks an empty subject
  client-side, surfaces create errors, and resets its fields after a successful create.

## Capabilities

### New Capabilities
<!-- None — this refines existing frontend board behavior. -->

### Modified Capabilities
- `frontend-board`: The **Create card** requirement changes from an inline always-visible
  form to a "Create issue" button that opens a modal with a single-line subject, a
  multi-line description textarea, and Cancel/Create actions. The **Admin assignee
  picker** requirement is extended so the create-time assignee field (admin-only, with
  person icon) lives inside the create modal.

## Impact

- **Frontend only** — no backend/API changes. Still uses task-service `POST /api/cards`
  with the same `{ title, description?, assignee_id? }` payload and the existing
  role-aware user-directory loading.
- Affected code (`frontend/src/`):
  - `components/CreateCardForm.tsx` — replaced by a modal-based component (e.g.
    `CreateCardButton` + `CreateCardModal`).
  - `pages/BoardPage.tsx` — renders the new button/modal instead of the inline form;
    `onCreate` wiring unchanged.
  - Reuses the existing `AssigneePicker` and person-icon convention.
