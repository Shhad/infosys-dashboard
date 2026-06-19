## Why

Today only ADMINs can see who a card is assigned to: the assignee control is an
ADMIN-only picker, and the only user-directory endpoint (`GET /admin/users`) is
admin-gated. A USER viewing the board sees no indication of who a card belongs to.
USERs need to *see* the assignee (without being able to change it) so they know who
owns each card; changing the assignee must remain an ADMIN-only action.

## What Changes

- USER-role callers SHALL see a read-only "Assigned to" label (person icon +
  assignee email, or "Unassigned") on every card, in place of the ADMIN picker.
- ADMINs keep the existing editable assignee picker — no change to their experience.
- auth-service SHALL expose an authenticated (any-role) user-directory endpoint so
  the frontend can resolve a card's `assignee_id` (a UUID) into a display email for
  USER-role callers, who cannot call the admin-only `GET /admin/users`. The directory
  exposes only `{ id, email }` (no role) to non-admins.
- The frontend SHALL load this directory for all authenticated users (not just
  ADMINs) and use it to render the assignee label.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `user-authentication`: add an authenticated user-directory endpoint (`GET /users`)
  returning `{ id, email }` for any valid bearer token, so non-admin callers can
  resolve assignee ids to emails.
- `frontend-board`: the assignee display becomes role-aware — ADMINs get the existing
  editable picker, USERs get a read-only assignee label; the user directory is loaded
  for all authenticated callers.

## Impact

- **auth-service** (FastAPI): new route `GET /users` (any authenticated caller),
  reusing the existing user repository; returns a slim `{ id, email }` shape.
- **frontend** (React/TS): `api/auth.ts` gains a directory call; `BoardPage` loads
  the directory for everyone; `CardItem` renders a read-only label for USERs; a small
  read-only `AssigneeLabel` view (or reuse) is added.
- **Specs**: `user-authentication` and `frontend-board` delta specs.
- No database schema changes; no changes to task-service. `assignee_id` wire shape is
  unchanged.
