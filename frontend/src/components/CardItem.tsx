import { STATUSES, type Card, type Status, type User } from "../types";
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

  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-medium text-slate-800">{card.title}</h3>
      {card.description && (
        <p className="mt-1 text-xs text-slate-500">{card.description}</p>
      )}

      {/* Move control — only for cards the user may modify. */}
      {canModify && (
        <div className="mt-2">
          <label className="text-xs text-slate-500">
            Move to{" "}
            <select
              value={card.status}
              onChange={(e) => onMove(card, e.target.value as Status)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Assignee picker — ADMIN only. */}
      {admin && (
        <div className="mt-2">
          <AssigneePicker
            users={users}
            value={card.assignee_id}
            onChange={(assigneeId) => onAssign(card, assigneeId)}
          />
        </div>
      )}

      {canModify && (
        <button
          onClick={() => onDelete(card)}
          className="mt-2 text-xs text-red-600 hover:underline"
        >
          Delete
        </button>
      )}
    </div>
  );
}
