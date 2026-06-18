## Context

The board card is rendered by `frontend/src/components/CardItem.tsx`, with the
ADMIN-only assignee dropdown in `frontend/src/components/AssigneePicker.tsx`. Status
values come from `STATUSES` in `frontend/src/types.ts`. The stack is React 18 +
TypeScript + TailwindCSS 3; there is no component library and no icon package
installed. Permission gating (`canModifyCard`, `isAdmin`) already decides which
controls a card shows.

This is a presentation-only refinement; no API, routing, or state-management changes.
All handler props (`onMove`, `onDelete`, `onAssign`) stay as they are.

## Goals / Non-Goals

**Goals:**
- Consolidate move + delete into a "…" overflow menu on the title row.
- Render status as a color-framed badge with a per-status border color.
- Exclude the current status from the move list and the current assignee from the
  assignee list.
- Add a person icon beside the assignee email and keep the assignee dropdown inside
  the card bounds.

**Non-Goals:**
- No new npm dependencies (no icon library, no headless-menu library).
- No drag-and-drop, no backend/API changes, no change to the permission model.
- No redesign of columns, header, or the create-card form.

## Decisions

- **Overflow menu: custom, no library.** Implement the "…" menu as local component
  state (`const [open, setOpen] = useState(false)`) toggled by a button, with the menu
  rendered as an absolutely-positioned panel. Close on outside click (a `mousedown`
  listener on `document` while open) and on Escape. Rationale: the project ships no
  menu/popover library and the interaction is simple; adding one would be
  disproportionate. Alternative considered: Radix/Headless UI — rejected to avoid a
  new dependency.

- **Icons via inline SVG.** Use small inline SVG for the trash and person icons rather
  than adding `lucide-react` or similar. Keeps the bundle and dependency surface
  unchanged. A tiny local `icons.tsx` (or inline JSX) holds the two paths.

- **Status colors via a Tailwind class map.** Add a `STATUS_BORDER` (or
  `statusColor`) map keyed by `Status` returning Tailwind border + text classes, e.g.
  `OPEN → border-slate-300 text-slate-600`, `TODO → border-yellow-400 text-yellow-700`,
  `IN_PROGRESS → border-blue-400 text-blue-700`, `REVIEW → border-purple-400
  text-purple-700`, `DONE → border-green-500 text-green-700`. The badge is an inline
  element with `border` and rounded corners; color applies to the frame (and matching
  text) only, not a fill. Because Tailwind purges unused classes, the classes are
  written as complete literals in the map (no dynamic string concatenation). Placement:
  a small helper in `types.ts` or a `cardStatus.ts` helper, colocated with `STATUSES`.

- **Move list excludes current status.** Filter `STATUSES.filter(s => s !== card.status)`
  for the move control's options. The control still shows the current status as context
  (the "Move to <current>" label / disabled current value), but only other statuses are
  selectable — matching the screenshot where the label shows current status and the
  list offers the rest.

- **Assignee list excludes current assignee.** Filter the `users` passed to the select
  so the option whose `id === card.assignee_id` is omitted. Keep the "Unassigned"
  option. The person icon sits to the left of the rendered email.

- **Dropdown overflow fix.** The card is `overflow`-clipping the native `<select>` /
  menu. Fix by ensuring the menu/select container uses appropriate width
  (`w-full`/`max-w-full`) and the card does not clip it (avoid `overflow-hidden` on the
  card, or render the popover within the card's padding box). Native `<select>` option
  popups are browser-drawn and not clipped by the card; the reported overflow is the
  control box itself stretching past the card, addressed by constraining its width.

## Risks / Trade-offs

- [Custom outside-click handling can leak listeners or misbehave with multiple open
  menus] → Attach the `document` listener only while a menu is open and clean it up in
  the effect's teardown; each card owns its own `open` state so only one toggles at a
  time per card.
- [Tailwind purge dropping dynamically-built color classes] → Store full class strings
  as literals in the status map; never concatenate fragments.
- [Accessibility regressions from a custom menu] → Use a real `<button>` for the
  trigger with `aria-haspopup`/`aria-expanded`, focusable menu items, and Escape-to-
  close; keep the native `<select>` for status/assignee so keyboard support is retained.
