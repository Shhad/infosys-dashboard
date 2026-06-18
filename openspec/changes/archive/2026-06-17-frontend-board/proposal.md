## Why

The backend slices are done: `auth-service` issues RS256 JWTs and `task-service`
serves the card domain with role/ownership rules. Nothing yet lets a human use the
system — there is no UI to register, log in, or move cards across the board. This is
Phase 3 of the local build plan and the last user-facing gap before stack
integration (Phase 4). It closes SPEC §6.

## What Changes

- Add a **React 18 + TypeScript + Vite + TailwindCSS** single-page app served on
  port `3000`, the frontend origin both services already allow via CORS.
- **Auth flows**: register, login (store JWT in `localStorage`), logout (clear token).
  Unauthenticated users are routed to the login screen; a `401` from any API call
  clears the token and redirects to login.
- **Kanban board**: 5 status columns (`OPEN`, `TODO`, `IN_PROGRESS`, `REVIEW`,
  `DONE`) populated from `GET /api/cards`.
- **Card actions**: create a card, move a card between columns (status change),
  delete a card.
- **Role-aware UI**: actions disallowed by the SPEC §4.2 role/ownership matrix are
  hidden or disabled (a USER cannot move/delete cards they did not create).
- **Admin assignee picker**: an ADMIN can pick an assignee from `GET /admin/users`
  when creating/assigning a card.
- **Build-time config**: API base URLs come from `VITE_API_BASE_URL` and
  `VITE_AUTH_BASE_URL`, baked into the bundle at `vite build`; an `.env.example`
  documents them.
- Containerize the app (multi-stage build → static server) so it joins the compose
  stack in Phase 4. No host Node required.

## Capabilities

### New Capabilities
- `frontend-board`: The React SPA covering auth screens, the 5-column kanban board,
  card create/move/delete, role/ownership-aware UI gating, the admin assignee
  picker, build-time `VITE_*` API configuration, and session/401 handling.

### Modified Capabilities
<!-- None. Frontend consumes existing auth-service and task-service APIs unchanged. -->

## Impact

- **New code**: a `frontend/` workspace (Vite/React/TS/Tailwind), its `Dockerfile`,
  `.env.example`, and `nginx`/static-serve config.
- **APIs consumed (unchanged)**: auth-service `POST /register`, `POST /login`,
  `GET /users/me`, `GET /admin/users`; task-service `GET /api/cards`,
  `POST /api/cards`, `PATCH /api/cards/{id}/status`, `PATCH /api/cards/{id}/assignee`,
  `DELETE /api/cards/{id}`.
- **No backend changes** required; CORS for `http://localhost:3000` is already in place.
- **Dependencies**: Node 20 (build only), React, react-router, Tailwind. Wiring the
  service into the full compose stack is deferred to the Phase 4 `stack-integration`
  change.
