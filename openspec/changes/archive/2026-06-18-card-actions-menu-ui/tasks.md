## 1. Status color badge

- [x] 1.1 Add a status→Tailwind-class map (full literal class strings) in `types.ts` or a new `cardStatus.ts` helper colocated with `STATUSES` (OPEN gray, TODO yellow, IN_PROGRESS blue, REVIEW purple, DONE green).
- [x] 1.2 In `CardItem.tsx`, render the card's status as a bordered, rounded badge using the map so only the frame (border + matching text) is colored.

## 2. Card overflow ("…") actions menu

- [x] 2.1 In `CardItem.tsx`, add the "…" trigger button on the same row as the card title, shown only when `canModifyCard` is true; use a real `<button>` with `aria-haspopup`/`aria-expanded`.
- [x] 2.2 Add local `open` state and a menu panel; close on outside `mousedown` and Escape, attaching the document listener only while open and cleaning it up in the effect teardown.
- [x] 2.3 In the menu, render a "Move to" status control showing the current status with a select list filtered to `STATUSES.filter(s => s !== card.status)`, wired to `onMove`.
- [x] 2.4 In the menu, render a "Delete" item with an inline-SVG trash icon wired to `onDelete`.
- [x] 2.5 Remove the standalone bottom "Delete" link and the old inline "Move to" block from `CardItem.tsx`.

## 3. Assignee picker refinements

- [x] 3.1 In `AssigneePicker.tsx`, exclude the option whose `id === value` (current assignee) from the select list while keeping the "Unassigned" option.
- [x] 3.2 Add an inline-SVG person icon to the left of the assignee email display.
- [x] 3.3 Constrain the picker width (`w-full`/`max-w-full`) and ensure the card does not clip it so the control stays within the card bounds.

## 4. Verify

- [x] 4.1 Run `npm run lint` (tsc) in `frontend/` and fix any type errors.
- [x] 4.2 Manually verify against `context/todo/things_to_change.png`: badge colors per status, "…" menu with Move-to (current status excluded) and Delete-with-trash, no bottom Delete link, person icon beside assignee, current assignee excluded, no dropdown overflow.
