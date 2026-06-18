import { useEffect, useRef, useState } from "react";
import {
  STATUSES,
  STATUS_BADGE,
  type Card,
  type Status,
  type User,
} from "../types";
import { canModifyCard, isAdmin } from "../permissions";
import { AssigneePicker } from "./AssigneePicker";

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
  users: User[];
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
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      {/* Title row — title on the left, "…" overflow menu on the right. */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-800 mt-[2px]">{card.title}</h3>

        {canModify && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Card actions"
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded px-1 leading-none text-slate-500 hover:bg-slate-100"
            >
              …
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-1 w-40 rounded border border-slate-200 bg-white p-2 shadow-lg"
              >
                <label className="block text-xs text-slate-500">
                  Move to{" "}
                  <select
                    value=""
                    onChange={(e) => {
                      onMove(card, e.target.value as Status);
                      setMenuOpen(false);
                    }}
                    className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
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
        <p className="mt-1 text-xs text-slate-500">{card.description}</p>
      )}

      {/* Status badge — color applied to the frame only. */}
      <div className="mt-2">
        <span
          className={`inline-block rounded border px-2 py-0.5 text-xs ${STATUS_BADGE[card.status]}`}
        >
          {card.status}
        </span>
      </div>

      {/* Assignee picker — ADMIN only. Person icon sits left of the printed email. */}
      {admin && (
        <div className="mt-2 flex items-center gap-1">
          <PersonIcon />
          <AssigneePicker
            users={users}
            value={card.assignee_id}
            excludeId={card.assignee_id}
            onChange={(assigneeId) => onAssign(card, assigneeId)}
          />
        </div>
      )}
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
