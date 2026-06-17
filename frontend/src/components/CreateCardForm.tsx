import { useState } from "react";
import type { User } from "../types";
import { AssigneePicker } from "./AssigneePicker";

// Create-card form. Title is required (blocked client-side). ADMINs may also
// pick an assignee; for USERs the service auto-assigns self.
export function CreateCardForm({
  admin,
  users,
  onCreate,
  submitting,
}: {
  admin: boolean;
  users: User[];
  onCreate: (input: {
    title: string;
    description?: string;
    assignee_id?: string | null;
  }) => Promise<void>;
  submitting: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return; // block empty title client-side
    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      assignee_id: admin ? assigneeId : undefined,
    });
    setTitle("");
    setDescription("");
    setAssigneeId(null);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg bg-white p-3 shadow-sm"
    >
      <label className="text-xs text-slate-600">
        <span className="block">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Card title"
          className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </label>

      <label className="text-xs text-slate-600">
        <span className="block">Description</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          className="mt-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
      </label>

      {admin && (
        <label className="text-xs text-slate-600">
          <span className="block">Assignee</span>
          <div className="mt-1">
            <AssigneePicker users={users} value={assigneeId} onChange={setAssigneeId} />
          </div>
        </label>
      )}

      <button
        type="submit"
        disabled={submitting || !title.trim()}
        className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add card"}
      </button>
    </form>
  );
}
