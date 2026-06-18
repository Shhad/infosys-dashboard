import { STATUS_LABEL, STATUS_STYLE, type Card, type Status, type User, type UserRef } from "../types";
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
  users: UserRef[];
  onMove: (card: Card, status: Status) => void;
  onDelete: (card: Card) => void;
  onAssign: (card: Card, assigneeId: string | null) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      {/* Header row — stage dot + UPPERCASE name + count chip — sits above the lane. */}
      <div className="flex items-center gap-[9px] px-1.5 pb-3 pt-1">
        <span className={`h-[9px] w-[9px] flex-none rounded-full ${STATUS_STYLE[status].dot}`} />
        <h2 className="text-[12.5px] font-extrabold tracking-[0.04em] text-ink">
          {STATUS_LABEL[status]}
        </h2>
        <span className="min-w-[22px] rounded-full border border-line bg-surface px-2 text-center text-[11.5px] font-bold tabular-nums text-muted">
          {cards.length}
        </span>
      </div>
      <div className="flex min-h-[120px] flex-col gap-[11px] rounded-lane bg-line-soft p-[11px]">
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
