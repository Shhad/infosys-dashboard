## Why

The card on the kanban board currently spreads its controls vertically — a "Move to"
status dropdown, an assignee dropdown, and a bottom "Delete" link — which is visually
noisy and makes the card feel cluttered. The status is shown as plain dropdown text
with no at-a-glance color cue, the assignee email has no visual anchor, the assignee
dropdown overflows the card bounds, and both dropdowns list redundant options (the
card's current status, the already-assigned user). This change tightens the card into
a cleaner, more conventional layout.

## What Changes

- Add a "…" (three-dots) overflow menu button on the same row as the card title.
- Move the status-change and delete actions into the overflow menu:
  - A "Move to" control showing the current status with a select list of the
    **other** statuses (the current status is excluded from the list).
  - A "Delete" item with a trash icon.
- **Remove** the standalone bottom "Delete" link (now lives in the menu).
- On the main card view, show the card's status inside a colored frame (border only),
  color-coded by status: OPEN = gray, TODO = yellow, IN_PROGRESS = blue,
  REVIEW = purple, DONE = green.
- For the assignee display, place a person icon to the left of the assignee email.
- In the assignee picker, exclude the already-assigned user from the select list.
- Fix the assignee select dropdown overflowing outside the card bounds.

## Capabilities

### New Capabilities
<!-- None: this is a visual/UX refinement of existing board behavior. -->

### Modified Capabilities
- `frontend-board`: Refines the card UI presentation — status now rendered as a
  color-coded badge, status-change and delete actions relocated into a per-card
  overflow ("…") menu, the move list excludes the current status, the assignee
  picker excludes the current assignee and gains a person icon, and the picker is
  constrained to the card bounds.

## Impact

- Frontend only. No API, backend, or data-model changes.
- Affected code:
  - `frontend/src/components/CardItem.tsx` — overflow menu, status badge, layout.
  - `frontend/src/components/AssigneePicker.tsx` — person icon, exclude current
    assignee, overflow fix.
  - Possibly a small shared status-color map (e.g. in `types.ts` or a helper).
- No new runtime dependencies; icons via inline SVG / existing Tailwind utilities.
