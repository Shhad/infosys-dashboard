## 1. Design tokens & font

- [x] 1.1 Extend `frontend/tailwind.config.js` `theme.extend` with the colors (`bg`,
  `surface`, `line`, `line-soft`, `ink`, `muted`, `faint`, `primary`/`primary.ink`, and
  the `stage` palette), `fontFamily.sans` (Plus Jakarta Sans + fallbacks), `boxShadow`
  (`card`, `card-hover`, `primary`), and `borderRadius` (`card`, `lane`) per design D1
- [x] 1.2 Add the Plus Jakarta Sans Google-Fonts `<link>` (preconnect + css2, weights
  400–800) to `frontend/index.html`
- [x] 1.3 In `frontend/src/index.css` set the body to `font-sans`, global letter-spacing
  −0.01em, and a `tabular-nums` utility for counts (base/utility layer)

## 2. Status badge data (MODIFIED spec)

- [x] 2.1 Replace `STATUS_BADGE` in `frontend/src/types.ts` with a purge-safe
  `STATUS_STYLE` record giving each status its text color, tint background (arbitrary
  rgba), and dot color — used by both the card badge and the column header dot

## 3. Top bar & toolbar (BoardPage)

- [x] 3.1 Rebuild the header in `BoardPage.tsx` as the 60px top bar: gradient app-logo
  square with "T", "Task Dashboard" title, right-aligned user block (email + role label,
  **no initial-letter avatar**) and outline "Log out" button
- [x] 3.2 Add the board toolbar: "Board" title + muted "· {cards.length} issues" subtitle
  on the left and the primary "Create issue" button (restyled, `shadow-primary`, leading
  "+") on the trailing side
- [x] 3.3 Apply the `bg-bg`/`text-ink` page surface and keep the error banner and loading
  state working with the new palette

## 4. Board grid & columns

- [x] 4.1 Change `Board.tsx` to a 5-column grid (`grid grid-cols-5 gap-4 px-[26px] pt-4
  pb-8 items-start`) inside an `overflow-x-auto` wrapper with a `min-w` fallback for narrow
  viewports (design D3)
- [x] 4.2 Rebuild `Column.tsx` as a header row (stage dot + UPPERCASE name + count chip)
  above a tinted lane (`bg-line-soft rounded-lane p-[11px] min-h-[120px]`) holding the
  card stack with `gap-[11px]`; dot color from `STATUS_STYLE`

## 5. Card chrome & status badge

- [x] 5.1 Restyle the `CardItem.tsx` card surface: `bg-surface border border-line
  rounded-card` padding, `shadow-card`, hover lift (`-translate-y-px`, `shadow-card-hover`,
  `border-[#dcdee8]`) and transition
- [x] 5.2 Restyle the title row (14/700), optional description (`line-clamp-2`, muted), and
  the existing "…" overflow menu trigger to the new palette (keep menu behavior intact)
- [x] 5.3 Render the status as the filled pill badge from `STATUS_STYLE` (tint background +
  leading stage-color dot + stage-color uppercase label)
- [x] 5.4 Restyle the assignee row with the top divider (`border-t border-line-soft`),
  keeping the existing `PersonIcon` + ADMIN `AssigneePicker` / USER `AssigneeLabel` split
  (no colored initial avatar)

## 6. Assignee controls & modal polish

- [x] 6.1 Restyle `AssigneePicker.tsx` select to the quiet→hover→focus states (transparent,
  `hover:bg-bg`+border, `focus:border-primary`); restyle `AssigneeLabel.tsx` text to match
- [x] 6.2 Align `CreateCardModal.tsx` button/field styling with the new tokens (primary
  button, `rounded`, focus ring) — no behavior change

## 7. Verify

- [x] 7.1 Run `npm run lint` (`tsc --noEmit`) in `frontend/` and fix any type errors
- [x] 7.2 Build/run the frontend and visually verify against
  `context/todo/new-design/task-board.html`: top bar, toolbar issue count, column lanes +
  count chips, card hover, pill badges per status, and that ADMIN sees the picker / USER
  sees the read-only label with the person icon
