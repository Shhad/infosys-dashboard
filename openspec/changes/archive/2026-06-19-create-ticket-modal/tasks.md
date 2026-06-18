## 1. Build the create-ticket modal component

- [x] 1.1 Add a `CreateCardModal` component (`frontend/src/components/CreateCardModal.tsx`) with props `admin`, `users`, `open`, `onClose`, `onCreate`, `submitting`.
- [x] 1.2 Render a fixed full-viewport backdrop + centered panel with `role="dialog"` and `aria-modal`; close on Cancel, Escape, and backdrop click.
- [x] 1.3 Add a single-line **Subject** `<input>` and a multi-line **Description** `<textarea>` (taller than the subject), holding local state.
- [x] 1.4 For ADMIN only, render an **Assignee** field that reuses `AssigneePicker` with the `PersonIcon` to its left; hide it entirely for USER.
- [x] 1.5 Add **Cancel** and **Create** buttons; disable **Create** when the subject is blank; on submit call `onCreate({ title, description?, assignee_id? })` (assignee only for admin), then close and reset fields.
- [x] 1.6 Focus the subject input when the modal opens and reset all fields on close.

## 2. Add the "Create issue" button and wire into the board

- [x] 2.1 Add a blue, rounded-border **"Create issue"** button (a `CreateCardButton` or inline in `BoardPage`) that toggles modal open state.
- [x] 2.2 Update `BoardPage.tsx` to render the button + `CreateCardModal` in place of the inline `CreateCardForm`, passing `admin`, `users`, `onCreate`, and `submitting`/`creating`.
- [x] 2.3 Remove the old `CreateCardForm.tsx` (and its import) now that it is replaced.

## 3. Verify

- [x] 3.1 Run `npm run lint` (`tsc --noEmit`) and ensure it is clean.
- [x] 3.2 Manually verify: button opens modal; USER sees no assignee; ADMIN sees assignee select with person icon; Create adds the card and closes; Cancel/Escape/backdrop close without creating; empty subject is blocked.
