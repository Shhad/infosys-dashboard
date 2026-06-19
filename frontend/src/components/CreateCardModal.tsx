import { useEffect, useRef, useState } from "react";
import type { UserRef } from "../types";
import { AssigneePicker } from "./AssigneePicker";

// Create-ticket modal. Subject (title) is required and blocked client-side. ADMINs
// may also pick an assignee (person icon + select); for USERs the service
// auto-assigns self, so no assignee control is shown. Controlled via `open`/`onClose`.
export function CreateCardModal({
  admin,
  users,
  open,
  onClose,
  onCreate,
  submitting,
}: {
  admin: boolean;
  users: UserRef[];
  open: boolean;
  onClose: () => void;
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
  const subjectRef = useRef<HTMLInputElement>(null);

  // Focus the subject input on open and reset all fields whenever the modal closes,
  // so reopening always starts clean.
  useEffect(() => {
    if (open) {
      subjectRef.current?.focus();
    } else {
      setTitle("");
      setDescription("");
      setAssigneeId(null);
    }
  }, [open]);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return; // block empty subject client-side
    await onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      assignee_id: admin ? assigneeId : undefined,
    });
    onClose();
  }

  return (
    // Backdrop — clicking it (but not the panel) closes the modal.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create issue"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-ink">Create issue</h2>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block text-sm text-muted">
            <span className="block font-medium">Subject</span>
            <input
              ref={subjectRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Issue subject"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="block text-sm text-muted">
            <span className="block font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Add a description (optional)"
              className="mt-1 w-full resize-y rounded-lg border border-line px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          {admin && (
            <label className="block text-sm text-muted">
              <span className="block font-medium">Assignee</span>
              <div className="mt-1 flex items-center gap-1">
                <PersonIcon />
                <AssigneePicker users={users} value={assigneeId} onChange={setAssigneeId} />
              </div>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted hover:bg-bg hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-ink shadow-primary hover:brightness-105 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PersonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 text-faint"
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
