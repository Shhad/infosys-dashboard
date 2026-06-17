import type { User } from "../types";

// ADMIN-only assignee selector, populated from GET /admin/users.
export function AssigneePicker({
  users,
  value,
  onChange,
  disabled,
}: {
  users: User[];
  value: string | null;
  onChange: (assigneeId: string | null) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:opacity-50"
      title="Assignee"
    >
      <option value="">Unassigned</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.email}
        </option>
      ))}
    </select>
  );
}
