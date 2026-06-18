import { useEffect, useRef, useState } from "react";
import {
  STATUSES,
  STATUS_LABEL,
  STATUS_STYLE,
  type Card,
  type Status,
  type User,
  type UserRef,
} from "../types";
import { canModifyCard, isAdmin } from "../permissions";
import { AssigneePicker } from "./AssigneePicker";
import { AssigneeLabel } from "./AssigneeLabel";

// A single card with role/ownership-gated move, delete, and assignee controls.
export function CardItem({
  card,
  me,
  users,
  onMove,
  onDelete,
  onAssign,
}: {
  card: Card;
  me: User;
  users: UserRef[];
  onMove: (card: Card, status: Status) => void;
  onDelete: (card: Card) => void;
  onAssign: (card: Card, assigneeId: string | null) => void;
}) {
  const canModify = canModifyCard(card, me);
  const admin = isAdmin(me);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the overflow menu on outside click or Escape — listeners only live
  // while the menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className="rounded-card border border-line bg-surface p-[13px] pb-3 shadow-card transition hover:-translate-y-px hover:border-[#dcdee8] hover:shadow-card-hover">
      {/* Title row — title on the left, "…" overflow menu on the right. */}
      <div className="flex items-start gap-2">
        <h3 className="mt-[1px] min-w-0 flex-1 text-sm font-bold leading-[1.3] text-ink">
          {card.title}
        </h3>

        {canModify && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Card actions"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded px-1 leading-none tracking-widest text-faint hover:bg-line-soft hover:text-ink"
            >
              …
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-line bg-surface p-2 shadow-card-hover"
              >
                <label className="block text-xs text-muted">
                  Move to{" "}
                  <select
                    value=""
                    onChange={(e) => {
                      onMove(card, e.target.value as Status);
                      setMenuOpen(false);
                    }}
                    className="mt-1 w-full rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
                  >
                    <option value="" disabled>
                      {card.status}
                    </option>
                    {STATUSES.filter((s) => s !== card.status).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(card);
                  }}
                  className="mt-2 flex w-full items-center gap-1 rounded px-1 py-1 text-xs text-red-600 hover:bg-red-50"
                >
                  <TrashIcon />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {card.description && (
        <p className="mt-[5px] text-[12.5px] leading-[1.45] text-muted line-clamp-2">
          {card.description}
        </p>
      )}

      {/* Status badge — filled pill: stage tint background, leading dot, and
          stage-colored uppercase label. Color is confined to the pill. */}
      <div className="mt-2.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[10.5px] font-extrabold tracking-[0.05em] ${STATUS_STYLE[card.status].tint} ${STATUS_STYLE[card.status].text}`}
        >
          <span className={`h-[5px] w-[5px] rounded-full ${STATUS_STYLE[card.status].dot}`} />
          {STATUS_LABEL[card.status]}
        </span>
      </div>

      {/* Assignee row — ADMIN gets the editable picker, USER gets a read-only
          label. Person icon sits left of the printed email either way. Shown for
          every card regardless of modify permission. */}
      <div className="mt-3 flex items-center gap-[9px] border-t border-line-soft pt-[11px] text-faint">
        <PersonIcon />
        {admin ? (
          <AssigneePicker
            users={users}
            value={card.assignee_id}
            excludeId={card.assignee_id}
            onChange={(assigneeId) => onAssign(card, assigneeId)}
          />
        ) : (
          <AssigneeLabel users={users} assigneeId={card.assignee_id} />
        )}
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
