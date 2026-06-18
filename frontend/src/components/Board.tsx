import { STATUSES, type Card, type Status, type User } from "../types";
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
  users: User[];
  onMove: (card: Card, status: Status) => void;
  onDelete: (card: Card) => void;
  onAssign: (card: Card, assigneeId: string | null) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
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
  );
}
