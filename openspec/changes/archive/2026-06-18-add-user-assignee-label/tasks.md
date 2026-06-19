## 1. auth-service: authenticated user directory

- [x] 1.1 Add a slim `UserDirectoryEntry` schema (`{ id: UUID, email: EmailStr }`, `from_attributes=True`) to `auth-service/app/schemas.py`
- [x] 1.2 Add `GET /users` to `auth-service/app/routers/auth.py` using `Depends(get_current_user)` (any authenticated role), returning `list[UserDirectoryEntry]` from `repository.list_all(db)`
- [x] 1.3 Verify the route is registered (auth_router is already included in `main.py`) and returns `200` with `[{id, email}]` for a USER token, and `401` without a token

## 2. frontend: directory API + load for all users

- [x] 2.1 Add `listDirectory(): Promise<Pick<User, "id" | "email">[]>` to `frontend/src/api/auth.ts` calling `GET /users` (authenticated)
- [x] 2.2 In `frontend/src/pages/BoardPage.tsx`, load the directory for every authenticated user: ADMINs keep calling `listUsers()` (`/admin/users`); USERs call `listDirectory()` (`/users`). Populate the same `users` state in both branches
- [x] 2.3 Handle directory load failure gracefully via the existing `showError` path without breaking the board render

## 3. frontend: read-only assignee label for USERs

- [x] 3.1 Add an `AssigneeLabel` read-only view (person icon + email, or "Unassigned") — a new small component in `frontend/src/components/` or an inline render in `CardItem`
- [x] 3.2 In `frontend/src/components/CardItem.tsx`, render the `AssigneePicker` when `isAdmin(me)` and the read-only `AssigneeLabel` otherwise; resolve the email from `users` by `card.assignee_id`
- [x] 3.3 Ensure the label shows for USERs on every card regardless of `canModifyCard`, and that no assignee-change control is rendered for USERs

## 4. Verification

- [x] 4.1 As a USER, confirm each card shows the person icon + assignee email (or "Unassigned") and no picker; as an ADMIN, confirm the editable picker is unchanged
- [x] 4.2 Confirm `GET /admin/users` still returns `403` for USERs and `GET /users` returns `200` with `{id, email}` only (no `role`)
- [x] 4.3 Run frontend build/typecheck (`npm run build` in `frontend/`) and auth-service `verify.sh` to confirm no regressions
