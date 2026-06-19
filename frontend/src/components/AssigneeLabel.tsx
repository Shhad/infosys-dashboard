import type { UserRef } from "../types";

// Read-only assignee display for USER-role callers: the assignee's email resolved
// from the loaded directory, or "Unassigned". No control to change the assignee.
export function AssigneeLabel({
  users,
  assigneeId,
}: {
  users: UserRef[];
  assigneeId: string | null;
}) {
  const assignee = assigneeId ? users.find((u) => u.id === assigneeId) ?? null : null;
  return (
    <span
      className={`truncate text-[12.5px] font-semibold ${assignee ? "text-ink" : "text-faint"}`}
      title="Assignee"
    >
      {assignee ? assignee.email : "Unassigned"}
    </span>
  );
}
