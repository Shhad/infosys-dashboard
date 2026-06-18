import type { UserRef } from "../types";

// ADMIN-only assignee selector, populated from GET /admin/users. When `excludeId`
// is set (the card's current assignee), that user is kept selectable-disabled so it
// still shows as the box value but cannot be re-picked from the list.
export function AssigneePicker({
  users,
  value,
  onChange,
  excludeId,
  disabled,
}: {
  users: UserRef[];
  value: string | null;
  onChange: (assigneeId: string | null) => void;
  excludeId?: string | null;
  disabled?: boolean;
}) {
  const current = excludeId ? users.find((u) => u.id === excludeId) ?? null : null;
  const selectable = users.filter((u) => u.id !== excludeId);

  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      className="w-full max-w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
      title="Assignee"
    >
      <option value="">Unassigned</option>
      {current && (
        <option value={current.id} disabled>
          {current.email}
        </option>
      )}
      {selectable.map((u) => (
        <option key={u.id} value={u.id}>
          {u.email}
        </option>
      ))}
    </select>
  );
}
