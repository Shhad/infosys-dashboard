## Context

Card creation today lives in `frontend/src/components/CreateCardForm.tsx`: an
always-visible inline `<form>` of bare inputs (Title, Description, optional Assignee,
"Add card") rendered by `BoardPage` above the board. Description is a single-line
`<input>`. There is no modal infrastructure anywhere in the SPA yet.

Relevant existing pieces we reuse rather than rebuild:
- `BoardPage.onCreate({ title, description?, assignee_id? })` and its `creating` flag —
  the submit wiring and error handling stay as-is.
- `AssigneePicker` (`<select>` over the loaded user list) — already used by ADMIN on
  cards and previously in the inline create form.
- The `PersonIcon` SVG convention from `CardItem.tsx` for the assignee row.
- Role gating via `isAdmin(me)` from `permissions.ts`.

Constraints: frontend-only change, no new dependencies (the stack has no UI/modal
library and no state library), Tailwind for styling, keep `tsc --noEmit` clean.

## Goals / Non-Goals

**Goals:**
- A single blue, rounded "Create issue" button replaces the inline form.
- A modal with single-line subject, multi-line description textarea, and Cancel/Create.
- ADMIN-only assignee select inside the modal, with the person icon; USER sees none.
- Accessible, dependency-free modal (Escape, backdrop click, focus-sensible).

**Non-Goals:**
- No backend/API changes; payload and endpoints are unchanged.
- No edit-in-modal or view-ticket modal — creation only.
- No new component/animation library; no global state management.

## Decisions

- **Build a small dependency-free modal rather than add a library.** The SPA
  deliberately avoids extra deps. A simple fixed-overlay `<div>` with a centered panel,
  closed on Escape/backdrop, is enough and mirrors the outside-click/Escape pattern
  already in `CardItem.tsx`. *Alternative considered:* Radix/Headless UI — rejected as
  over-kill for one modal and against the "no state/UI library" convention.

- **Split into `CreateCardButton` (the blue button + open state) and `CreateCardModal`
  (the dialog), replacing `CreateCardForm`.** Keeps `BoardPage` wiring minimal — it
  still passes `admin`, `users`, `onCreate`, `submitting`. *Alternative:* keep one
  component holding both button and modal — fine too; the split just isolates the modal
  markup. Either way `CreateCardForm.tsx` is removed/renamed.

- **Reuse `AssigneePicker` for the ADMIN assignee field**, wrapped with the existing
  `PersonIcon` to its left to match the card assignee row. No `excludeId` is passed
  (a new card has no current assignee). *Alternative:* a bespoke select — rejected, no
  reason to duplicate.

- **Reset form state on successful create and on close.** Subject/description/assignee
  cleared when the modal closes so reopening starts clean (the old form reset after
  submit; we extend that to cancel/close).

- **Keep client-side empty-subject guard** (disable Create when subject is blank), as the
  inline form did, while still surfacing a server `400`.

## Risks / Trade-offs

- **Accessibility of a hand-rolled modal** (focus trap, `role="dialog"`,
  `aria-modal`) → keep it simple but set `role="dialog"`/`aria-modal`, label it, focus
  the subject input on open, and support Escape; full focus-trapping is acceptable to
  defer for this MVP.
- **Background scroll / interaction while open** → render an overlay that covers the
  viewport and intercepts clicks (backdrop close); good enough without scroll-lock.
- **Losing entered text on accidental backdrop click** → acceptable for a short create
  form; Cancel and backdrop behave identically per the spec.
