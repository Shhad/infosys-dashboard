# Handoff: Task Board (Kanban Dashboard) Redesign

## Overview
A redesign of the existing **Task Dashboard** — a kanban board where issues move across five status columns (OPEN → TODO → IN_PROGRESS → REVIEW → DONE). Each issue card shows a title, optional description, a status badge, and an inline assignee dropdown. The goal of this redesign is purely visual/UX polish: same data model and functionality as the current app, but a cleaner, more legible, better-organized presentation.

## About the Design Files
The file in this bundle (`task-board.html`) is a **design reference created in HTML/CSS/JS** — a prototype that shows the intended look and behavior. It is **not production code to copy directly**. The task is to **recreate this design inside your existing codebase**, using its established framework, component library, and patterns (React, Vue, Svelte, etc.). The HTML uses vanilla JS to render the board from data arrays only so the structure is easy to read — reimplement it with your app's real components and data layer. If there is no front-end environment yet, pick the framework that best fits the project and build it there.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are specified below and in the HTML. Recreate the UI to match — exact hex values, radii, and type are given in Design Tokens. Swap the inline `<select>`/avatar implementation for your component library's equivalents while preserving the visual result.

## Screens / Views

### Screen: Task Board
- **Purpose**: View all issues grouped by status; reassign issues inline; create new issues.
- **Layout** (desktop, ~1440px reference width):
  - **Top bar** — fixed-height 60px, white surface, 1px bottom border (`--line`), horizontal padding 26px. Left: square app logo (28px, gradient) + "Task Dashboard" title. Right (margin-left:auto): user block (30px circular avatar + email + role label) and a "Log out" outline button, gap 16px.
  - **Toolbar** — padding `20px 26px 6px`. Left: "Board" title (20px/800) + muted "· N issues" subtitle. Right (margin-left:auto): the primary "Create issue" button.
  - **Board** — CSS grid, `grid-template-columns: repeat(5, 1fr)`, `gap: 16px`, padding `16px 26px 32px`, `align-items: start`. Each column is independent and as tall as its content.
  - **Column** — vertical flex. A **column header** row (status dot + UPPERCASE name + count chip) sits above a **column body**: a tinted lane (`#eef0f4`, radius 14px, padding 11px, `min-height:120px`) holding a vertical stack of cards with `gap: 11px`.
- **Components**:
  - **App logo**: 28×28, radius 8px, `linear-gradient(135deg, #5b5bf0, #8a7bff)`, white "T", 800 weight.
  - **Title** "Task Dashboard": 17px, weight 800, letter-spacing −0.02em.
  - **User avatar**: 30px circle, solid `#5b5bf0`, white initial, 700/12px. Email 13px/600; role "ADMIN" 11px/700, color `--faint`, letter-spacing .06em.
  - **Log out button**: transparent bg, 1px `--line` border, radius 9px, padding `7px 13px`, 13px/600 `--muted`; hover → bg `--bg`, text `--ink`.
  - **Create issue button (primary)**: bg `--primary` (#5b5bf0), white text 13.5px/700, radius 10px, padding `10px 16px`, leading "+" glyph, shadow `0 6px 16px -6px rgba(91,91,240,.6)`; hover → `brightness(1.05)`.
  - **Column header**: 9px status dot (per-stage color), name 12.5px/800 letter-spacing .04em, and a count chip (white, 1px border, radius 999px, 11.5px/700 `--muted`, min-width 22px centered).
  - **Card**: white, 1px `--line`, radius 12px, padding `13px 14px 12px`, shadow `0 1px 2px rgba(20,22,30,.04)`, `cursor: grab`. Hover → `translateY(-1px)`, shadow `0 8px 20px -10px rgba(20,22,30,.22)`, border `#dcdee8`.
    - **Title**: 14px/700, line-height 1.3.
    - **Menu** "···": color `--faint`, top-right of card head.
    - **Description** (optional): 12.5px/1.45 `--muted`, clamped to 2 lines (`-webkit-line-clamp: 2`).
    - **Status badge**: inline pill, 10.5px/800 letter-spacing .05em, radius 6px, padding `3px 8px`, margin-top 10px. Text color = stage color; background = stage tint (see tokens); leading 5px dot in the stage color. Label matches the column.
    - **Assignee row**: margin-top 12px, padding-top 11px, top border `--line-soft`. Contains a 24px circular avatar + an inline assignee `<select>`.
      - **Avatar**: 24px circle, white initial (10px/700). Background color derived by hashing the email (palette below). **Unassigned** state → dashed placeholder: bg `#eceef3`, 1px dashed `#cfd2dd`, "?" in `--faint`.
      - **Select**: `appearance:none`, transparent until hover, 12.5px/600 `--ink`, radius 8px, padding `6px 26px 6px 9px`, text-overflow ellipsis. Hover → bg `--bg` + 1px `--line`. Focus → bg `--bg` + 1px `--primary`. Custom chevron drawn with CSS borders at right. When value is "Unassigned", text uses `--faint`.

## Interactions & Behavior
- **Reassign**: changing the assignee `<select>` updates the avatar (initial + color) live, and toggles the unassigned/dashed style. In the real app this should persist via your API/mutation.
- **Create issue**: the primary button should open your create-issue flow (modal or route). Not built in the prototype.
- **Add to column ("+")**: removed — no per-column quick-add.
- **Card menu ("···")**: opens per-card actions (edit/move/delete) — not built.
- **Hover states**: cards lift slightly; log-out, add, and select all have hover styling as specified.
- **Drag and drop** (recommended, not in prototype): cards are styled with `cursor: grab` to signal draggability. Implement moving a card between columns to change its status, updating the source/target column counts.
- **Counts**: each column header count reflects the number of cards in that column and should stay in sync as cards move.
- **Responsive**: reference is a 5-column desktop grid. On narrow viewports, allow horizontal scroll of the board or collapse to fewer columns — match your app's existing responsive conventions.

## State Management
- `columns`: ordered list of statuses `[OPEN, TODO, IN_PROGRESS, REVIEW, DONE]` with display label + color metadata.
- `people`: list of assignable users (emails), plus the "Unassigned" sentinel.
- `tasks`: issues keyed/filterable by status; each task = `{ id, title, description?, status, assignee }`.
- Derived: per-column count = number of tasks with that status; "N issues" subtitle = total tasks.
- Transitions: changing a task's `assignee` (select) or `status` (drag) updates that task and any derived counts. Wire to your data layer.

## Design Tokens

**Colors**
| Token | Value | Use |
|---|---|---|
| `--bg` | `#f5f6f8` | App background |
| `--surface` | `#ffffff` | Bars, cards, chips |
| `--line` | `#e7e8ee` | Default borders |
| `--line-soft` | `#eef0f4` | Card inner divider; also the column-lane fill `#eef0f4` |
| `--ink` | `#1c1e26` | Primary text |
| `--muted` | `#6b7080` | Secondary text |
| `--faint` | `#9a9eb0` | Tertiary text / placeholders |
| `--primary` | `#5b5bf0` | Primary button, focus ring, avatar |
| Logo gradient | `linear-gradient(135deg,#5b5bf0,#8a7bff)` | App logo |

**Stage colors (dot / badge text)** and **badge tints (badge background)**
| Stage | Color | Tint |
|---|---|---|
| OPEN | `#7b8194` | `rgba(123,129,148,.12)` |
| TODO | `#d98a1f` | `rgba(217,138,31,.13)` |
| IN_PROGRESS | `#2f7be0` | `rgba(47,123,224,.12)` |
| REVIEW | `#8b5cf6` | `rgba(139,92,246,.13)` |
| DONE | `#1f9d6b` | `rgba(31,157,107,.13)` |

**Avatar hash palette**: `#5b5bf0, #2f7be0, #1f9d6b, #d98a1f, #8b5cf6, #e0567b, #0ea5a5` — pick by hashing the email so each user gets a stable color. Initial = first letter of email, uppercased.

**Typography**
- Font family: **Plus Jakarta Sans** (Google Fonts; weights 400/500/600/700/800), fallback `system-ui, -apple-system, sans-serif`.
- Global letter-spacing −0.01em; tabular numerals (`font-variant-numeric: tabular-nums`) on counts.
- Scale: title 20px/800, app title 17px/800, card title 14px/700, body/desc 12.5px, select 12.5px/600, column name 12.5px/800, count 11.5px/700, role label 11px/700, badge 10.5px/800.

**Spacing** — board padding `16px 26px 32px`; grid gap 16px; card stack gap 11px; card padding `13px 14px 12px`; lane padding 11px.

**Radius** — cards 12px, lanes 14px, buttons/search 10px, badge 6px, select 8px, chips/avatars 999px/50%.

**Shadows** — card rest `0 1px 2px rgba(20,22,30,.04)`; card hover `0 8px 20px -10px rgba(20,22,30,.22)`; primary button `0 6px 16px -6px rgba(91,91,240,.6)`.

## Assets
- **Fonts**: Plus Jakarta Sans via Google Fonts (`https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800`). Self-host or use your app's font pipeline.
- **Icons**: none external — the chevron, "+" (Create issue), and "···" are CSS/glyph-drawn. Replace with your icon library (e.g. the chevron icon you already use).
- No images.

## Files
- `task-board.html` — the full hi-fi prototype (markup, CSS, and the data arrays `COLUMNS`, `PEOPLE`, `TASKS` plus the render logic). All tokens above live in the `:root` block; card construction is in the `cardEl()` function.
