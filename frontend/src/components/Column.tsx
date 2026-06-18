import type { Card, Status, User } from "../types";
import { CardItem } from "./CardItem";

// One kanban column: a status header and the cards in that status.
export function Column({
  status,
  cards,
  me,
  users,
  onMove,
  onDelete,
  onAssign,
}: {
  status: Status;
  cards: Card[];
  me: User;
  users: User[];
  onMove: (card: Card, status: Status) => void;
  onDelete: (card: Card) => void;
  onAssign: (card: Card, assigneeId: string | null) => void;
}) {
  return (
    <div className="flex w-64 shrink-0 flex-col rounded-lg bg-slate-100 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">{status}</h2>
        <span className="rounded-full bg-slate-200 px-2 text-xs text-slate-600">
          {cards.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
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
