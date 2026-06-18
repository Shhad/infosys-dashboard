## Why

The MVP board works but looks utilitarian — flat slate columns, a plain header, and a
border-only status badge. A high-fidelity redesign (`context/todo/new-design/`) specifies
a cleaner, more legible kanban layout: a proper top bar, a board toolbar with an issue
count, tinted column lanes, and richer cards. This change applies that visual polish to
the existing board **without changing any data, API calls, or role/ownership behavior** —
it is a styling/layout pass only.

## What Changes

- **Top bar**: a 60px white bar with a gradient app-logo square + "Task Dashboard" title
  on the left, and a user block (email + role label) plus an outline "Log out" button on
  the right. (No initial-letter avatar — see Impact.)
- **Toolbar**: a "Board" title with a muted "· N issues" subtitle (total card count) on
  the left and the existing primary "Create issue" button on the right.
- **Board layout**: switch from a horizontally-scrolling flex row to a 5-column responsive
  grid with `align-items: start` so each column is only as tall as its content; keep
  horizontal scroll as the narrow-viewport fallback.
- **Columns**: a header row (status dot + UPPERCASE name + count chip) sitting *above* a
  tinted lane that holds the cards, instead of one flat slate box.
- **Cards**: white surface with refined border, radius, padding, hover lift/shadow.
- **Status badge** — **BREAKING (visual)**: replace the border-only badge with a filled
  pill — a stage-tinted background, a leading stage-colored dot, and stage-colored
  uppercase text. This changes the existing "Status color badge" requirement (frame-only).
- **Typography & tokens**: introduce the Plus Jakarta Sans font and the design's color /
  spacing / radius / shadow tokens via Tailwind config + utility classes.
- **Unchanged behavior**: assignee handling stays exactly as today — ADMINs get the
  editable picker, USERs get a read-only label; the existing person icon is kept (the
  redesign's hashed initial-letter avatar is **not** adopted). Create/move/delete/assign
  flows, permissions, and all API calls are untouched.

## Capabilities

### New Capabilities
<!-- None — this is a visual reskin of an existing capability. -->

### Modified Capabilities
- `frontend-board`: the **Status color badge** requirement changes from a border/frame-only
  badge to a filled, stage-tinted pill with a leading dot and stage-colored text.

## Impact

- **Code**: `frontend/src/pages/BoardPage.tsx` (top bar + toolbar), `components/Board.tsx`
  (grid), `components/Column.tsx` (header + lane), `components/CardItem.tsx` (card chrome
  + badge), `components/AssigneePicker.tsx` / `AssigneeLabel.tsx` (restyle only),
  `frontend/tailwind.config.js` (theme tokens), `frontend/index.html` + `src/index.css`
  (font), `components/CreateCardModal.tsx` (button/token consistency).
- **Spec**: one MODIFIED requirement in `frontend-board` (status badge).
- **No changes** to APIs, types, data flow, routing, auth, permissions, or build config.
- **Design decision (no avatars)**: the redesign shows initial-letter colored avatars for
  the assignee and the logged-in user. Per request these are **not** adopted; the assignee
  keeps the existing person icon, and the top-bar user block shows email + role with no
  initial-letter avatar. This keeps the spec's "person icon" requirements intact.
