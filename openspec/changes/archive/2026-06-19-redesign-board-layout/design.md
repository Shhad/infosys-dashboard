## Context

The board is a React 18 + TypeScript SPA styled with **Tailwind CSS 3** (no custom theme
yet — `tailwind.config.js` has an empty `extend`). The hi-fi target lives in
`context/todo/new-design/task-board.html` (vanilla HTML/CSS with `:root` design tokens)
and is summarised in the same folder's `README.md`. The prototype is a *reference*, not
code to copy: it renders from plain data arrays and uses raw CSS custom properties and an
inline `<select>`. We must reproduce the look with our real components, data layer, and
Tailwind utilities.

Current components: `BoardPage` (header + toolbar + `Board`), `Board` (flex row of
`Column`), `Column` (slate box: header + card stack), `CardItem` (card chrome, status
badge, "…" menu, assignee row), `AssigneePicker` (ADMIN select), `AssigneeLabel` (USER
read-only). Behavior, permissions, and API calls are correct and must not change.

## Goals / Non-Goals

**Goals:**
- Reproduce the redesign's top bar, toolbar, column lanes, card chrome, and pill status
  badge using Tailwind utility classes.
- Add the Plus Jakarta Sans font and map the design's color/spacing/radius/shadow tokens
  into `tailwind.config.js` so class names read cleanly.
- Keep `tsc --noEmit` clean and the static nginx build unaffected.

**Non-Goals:**
- No data-model, API, routing, auth, or permission changes.
- **No initial-letter avatars.** The assignee keeps the existing `PersonIcon`; the top-bar
  user block shows email + role only. (Explicit user instruction.)
- No new interactions (drag-and-drop, search box, per-column quick-add "+", card "···"
  beyond today's existing menu) — the prototype's search and "+" are not adopted.
- No change to the create-issue modal's behavior (token/button consistency only).

## Decisions

### D1 — Map design tokens into `tailwind.config.js`, not raw CSS vars
Extend `theme.extend.colors`, `fontFamily`, `boxShadow`, and `borderRadius` so components
use semantic utilities (e.g. `bg-surface`, `text-ink`, `shadow-card`). Rationale: keeps
the redesign idiomatic to the existing Tailwind setup and avoids a parallel CSS-variable
system. Alternative (raw `:root` vars + arbitrary `bg-[var(--ink)]` values) was rejected
as harder to read and inconsistent with the project's "Tailwind classes" convention.

Proposed config additions:

```js
// tailwind.config.js → theme.extend
colors: {
  bg: "#f5f6f8", surface: "#ffffff",
  line: "#e7e8ee", "line-soft": "#eef0f4",
  ink: "#1c1e26", muted: "#6b7080", faint: "#9a9eb0",
  primary: { DEFAULT: "#5b5bf0", ink: "#ffffff" },
  stage: {                      // dot/text colors
    open: "#7b8194", todo: "#d98a1f", prog: "#2f7be0",
    rev: "#8b5cf6", done: "#1f9d6b",
  },
},
fontFamily: { sans: ['"Plus Jakarta Sans"', "system-ui", "-apple-system", "sans-serif"] },
boxShadow: {
  card: "0 1px 2px rgba(20,22,30,.04)",
  "card-hover": "0 8px 20px -10px rgba(20,22,30,.22)",
  primary: "0 6px 16px -6px rgba(91,91,240,.6)",
},
borderRadius: { card: "12px", lane: "14px" },
```

Stage **tint** backgrounds (low-alpha) are applied as Tailwind arbitrary values per badge,
e.g. `bg-[rgba(217,138,31,0.13)]`, since they are one-off rgba fills.

### D2 — CSS → Tailwind mapping (reference for implementers)
| Design (CSS) | Tailwind |
|---|---|
| top bar `height:60px; px:26px; border-bottom 1px --line; bg --surface` | `h-[60px] px-[26px] bg-surface border-b border-line flex items-center gap-3.5` |
| app logo 28px radius8 gradient "T" | `h-7 w-7 rounded-lg grid place-items-center text-white font-extrabold bg-gradient-to-br from-[#5b5bf0] to-[#8a7bff]` |
| app title 17/800 −.02em | `text-[17px] font-extrabold tracking-[-0.02em]` |
| role label 11/700 faint .06em | `text-[11px] font-bold text-faint tracking-[0.06em]` |
| logout outline btn | `text-[13px] font-semibold text-muted border border-line rounded-[9px] px-[13px] py-[7px] hover:bg-bg hover:text-ink` |
| toolbar `py 20/6 px26` title 20/800 | `flex items-center gap-3.5 px-[26px] pt-5 pb-1.5` + `text-xl font-extrabold tracking-[-0.025em]` |
| subtitle "· N issues" 13/600 muted | `text-[13px] font-semibold text-muted` |
| create primary btn | `bg-primary text-white text-[13.5px] font-bold rounded-[10px] px-4 py-2.5 shadow-primary hover:brightness-105 inline-flex items-center gap-[7px]` |
| board grid 5×, gap16, pad `16/26/32`, align-start | `grid grid-cols-5 gap-4 px-[26px] pt-4 pb-8 items-start` (+ narrow fallback, see D3) |
| col header dot+name+count | dot `h-[9px] w-[9px] rounded-full`; name `text-[12.5px] font-extrabold tracking-[0.04em]`; count chip `bg-surface border border-line rounded-full text-[11.5px] font-bold text-muted px-2 min-w-[22px] text-center tabular-nums` |
| col body lane | `flex flex-col gap-[11px] bg-line-soft rounded-lane p-[11px] min-h-[120px]` |
| card | `bg-surface border border-line rounded-card p-[13px] pb-3 shadow-card hover:shadow-card-hover hover:-translate-y-px hover:border-[#dcdee8] transition` |
| card title 14/700 lh1.3 | `text-sm font-bold leading-[1.3]` |
| desc 12.5 muted clamp2 | `text-[12.5px] text-muted leading-[1.45] line-clamp-2` |
| status pill | `inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.05em] rounded-md px-2 py-[3px]` + per-stage text color & arbitrary tint bg + 5px dot |
| assignee row | `flex items-center gap-[9px] mt-3 pt-[11px] border-t border-line-soft` |

### D3 — Responsive board
Default `grid grid-cols-5` at the desktop reference width. For narrow viewports keep the
project's existing horizontal-scroll behavior: wrap the grid so columns get a sensible
`min-width` and the board scrolls horizontally rather than crushing five columns. Simplest
implementation: `grid grid-cols-5 ... min-w-[1100px]` inside an `overflow-x-auto` wrapper,
preserving today's scroll fallback while matching the grid look at full width.

### D4 — Status badge as data-driven pill (MODIFIED spec)
Replace the border-only `STATUS_BADGE` map in `types.ts` with per-stage text + tint +
dot color. Keep full literal class strings (Tailwind purge-safe; never concatenate). Each
entry supplies: text color class, tint background (arbitrary rgba), and dot color. The
column header dot reuses the same stage color, so a single `STATUS_STYLE` record drives
both the column dot and the card badge.

### D5 — Font delivery
Add the Plus Jakarta Sans `<link>` (preconnect + css2 url, weights 400–800) to
`frontend/index.html` and set it as the default `sans` family in Tailwind, so `font-sans`
(Tailwind's base) resolves to it app-wide. Global letter-spacing −0.01em and tabular-nums
on counts via `index.css` base layer / utility classes. Self-hosting is deferred (matches
the prototype's Google-Fonts approach; acceptable for this visual pass).

### D6 — Assignee presentation unchanged
ADMIN → `AssigneePicker`; USER → `AssigneeLabel`; both keep the existing `PersonIcon` to
the left. Restyle the picker `<select>` to the design's quiet/hover/focus states
(transparent → `bg-bg` + border on hover, `border-primary` on focus) but do **not** swap
in the prototype's colored initial avatar. This satisfies the existing "person icon"
scenarios in `frontend-board` without a spec change.

## Risks / Trade-offs

- **Arbitrary Tailwind values everywhere** (exact px/rgba from tokens) → keep them in a
  small number of components and the `STATUS_STYLE` map so they're not scattered; document
  the mapping (D2) for consistency.
- **Native `<select>` can't fully match the custom CSS chevron** → restyle to the design's
  hover/focus look and keep the native control; pixel-perfect chevron is non-essential.
- **5-column grid on small screens** → mitigated by the `overflow-x-auto` + `min-w`
  fallback (D3), preserving today's mobile behavior.
- **Google Fonts network dependency** → acceptable for this pass; self-hosting can follow
  later without spec impact.

## Open Questions

None blocking. Self-hosting the font and adopting drag-and-drop are explicitly out of scope
and can be separate changes.
