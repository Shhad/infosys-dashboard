## Context

Cards carry only an opaque `assignee_id` (UUID) on the wire (`CardResponse`,
`task-service`). The frontend resolves that id to a human-readable email by looking
the user up in a directory loaded from auth-service `GET /admin/users` — which is
admin-only (`require_admin`). Consequently `BoardPage` loads the directory only for
ADMINs, and `CardItem` shows the `AssigneePicker` only when `isAdmin(me)`. A USER
therefore sees nothing about who a card is assigned to.

The ask: USERs should *see* the assignee as a read-only label; only ADMINs may
change it. The constraint that makes this non-trivial is data access — a USER has no
endpoint that maps `assignee_id → email`.

auth-service is FastAPI (`auth-service/app`); the frontend is React/TS
(`frontend/src`); task-service (Java) is untouched.

## Goals / Non-Goals

**Goals:**
- USERs see a read-only assignee label (person icon + email, or "Unassigned") on
  every card.
- ADMINs keep the existing editable picker unchanged.
- Provide a minimal, authenticated way for USERs to resolve assignee ids to emails.

**Non-Goals:**
- No change to who may *modify* the assignee (still ADMIN-only, enforced server-side
  by task-service `PATCH /api/cards/{id}/assignee`).
- No change to the card wire shape or any database schema.
- No avatars, display names, or assignee filtering — email text only.

## Decisions

### Decision: Add an authenticated user-directory endpoint `GET /users` in auth-service
The label needs `assignee_id → email`. A USER cannot call `GET /admin/users`. Add
`GET /users`, requiring any valid bearer token (`get_current_user`, not
`require_admin`), returning a slim list of `{ id, email }`. The existing
`repository.list_all` is reused; a new slim response schema omits `role` so the
directory does not leak who is an admin to non-admins.

**Alternatives considered:**
- *Enrich `CardResponse` with `assignee_email` in task-service.* Rejected:
  task-service is database-per-service and has no user emails; it would need a
  cross-service call per card (or denormalized copies that drift). Heavier and
  couples the services.
- *Relax `GET /admin/users` to allow USERs.* Rejected: that endpoint returns `role`
  and is semantically admin-scoped; widening it leaks role membership.
- *Per-id lookup `GET /users/{id}`.* Rejected: N calls per board render; a single
  directory fetch matches the existing ADMIN pattern and the frontend's `users[]`
  state.

### Decision: Frontend loads the directory for all authenticated users
`BoardPage` currently early-returns the directory load unless `isAdmin(me)`. Change
it so ADMINs continue to call `GET /admin/users` (they need `role`/full list) while
USERs call the new `GET /users`. Both populate the same `users` state used to resolve
the label. Keeping the ADMIN path on `/admin/users` avoids changing ADMIN behavior.

### Decision: `CardItem` renders role-conditional assignee UI
Reuse the existing person-icon row. When `isAdmin(me)` → render `AssigneePicker`
(unchanged). Otherwise → render a read-only label: the assignee's email resolved from
`users`, or "Unassigned" when `assignee_id` is null. Introduce a small
`AssigneeLabel` presentational component (or an inline `<span>`) for the read-only
case. The label is shown to USERs regardless of card ownership (seeing the assignee is
not gated by the §4.2 modify matrix).

## Risks / Trade-offs

- **Exposing the email directory to all authenticated users** → Mitigation: this is
  an internal team dashboard; the slim shape omits `role` and password data. Only
  `{ id, email }` is returned, which authenticated members can already infer by being
  assigned to each other.
- **Directory fetch failure leaves labels unresolved** → Mitigation: fall back to
  showing "Unassigned"/blank gracefully (or the raw absence) rather than erroring the
  board; surface the load error via the existing `showError` path as today.
- **Label/picker divergence** → Mitigation: both read from the same `users` state and
  the same `card.assignee_id`, so they stay consistent.

## Migration Plan

Additive, no data migration. Deploy auth-service (new route) before/with the
frontend. Rollback = revert both; the card wire shape is unchanged so task-service is
unaffected either way.
