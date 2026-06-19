import { STATUSES, type Card, type Status, type User, type UserRef } from "../types";
import { Column } from "./Column";

// The five-column board. Cards are grouped by status.
export function Board({
  cards,
  me,
  users,
  onMove,
  onDelete,
  onAssign,
}: {
  cards: Card[];
  me: User;
  users: UserRef[];
  onMove: (card: Card, status: Status) => void;
  onDelete: (card: Card) => void;
  onAssign: (card: Card, assigneeId: string | null) => void;
}) {
  return (
    // Five-column grid at the desktop reference width; on narrow viewports the
    // min-width forces horizontal scroll instead of crushing the columns.
    <div className="overflow-x-auto">
      <div className="grid min-w-[1100px] grid-cols-5 items-start gap-4 px-[26px] pb-8 pt-4">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            cards={cards.filter((c) => c.status === status)}
            me={me}
            users={users}
            onMove={onMove}
            onDelete={onDelete}
            onAssign={onAssign}
          />
        ))}
      </div>
    </div>
  );
}
