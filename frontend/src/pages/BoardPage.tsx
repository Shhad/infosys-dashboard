import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { isAdmin } from "../permissions";
import * as cardsApi from "../api/cards";
import { listUsers } from "../api/auth";
import { ApiError } from "../api/client";
import type { Card, Status, User } from "../types";
import { Board } from "../components/Board";
import { CreateCardForm } from "../components/CreateCardForm";

export function BoardPage() {
  const { user, logout } = useAuth();
  const me = user!; // ProtectedRoute guarantees a user here

  const [cards, setCards] = useState<Card[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showError = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : "Something went wrong.");

  const loadCards = useCallback(async () => {
    setLoading(true);
    try {
      setCards(await cardsApi.listCards());
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // ADMIN-only: load the user list for assignee pickers.
  useEffect(() => {
    if (!isAdmin(me)) return;
    listUsers()
      .then(setUsers)
      .catch(showError);
  }, [me]);

  const upsert = (updated: Card) =>
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

  async function onCreate(input: {
    title: string;
    description?: string;
    assignee_id?: string | null;
  }) {
    setError(null);
    setCreating(true);
    try {
      const created = await cardsApi.createCard(input);
      setCards((prev) => [...prev, created]);
    } catch (err) {
      showError(err);
    } finally {
      setCreating(false);
    }
  }

  async function onMove(card: Card, status: Status) {
    if (status === card.status) return;
    setError(null);
    try {
      upsert(await cardsApi.updateStatus(card.id, status));
    } catch (err) {
      // Non-optimistic: state is unchanged, so the card stays in its column.
      showError(err);
    }
  }

  async function onAssign(card: Card, assigneeId: string | null) {
    setError(null);
    try {
      upsert(await cardsApi.updateAssignee(card.id, assigneeId));
    } catch (err) {
      showError(err);
    }
  }

  async function onDelete(card: Card) {
    if (!window.confirm(`Delete card "${card.title}"?`)) return;
    setError(null);
    try {
      await cardsApi.deleteCard(card.id);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch (err) {
      showError(err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold text-slate-800">Task Dashboard</h1>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>
            {me.email} · {me.role}
          </span>
          <button
            onClick={logout}
            className="rounded border border-slate-300 px-3 py-1 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="space-y-4 p-6">
        {error && (
          <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <CreateCardForm
          admin={isAdmin(me)}
          users={users}
          onCreate={onCreate}
          submitting={creating}
        />

        {loading ? (
          <div className="text-slate-500">Loading cards…</div>
        ) : (
          <Board
            cards={cards}
            me={me}
            users={users}
            onMove={onMove}
            onDelete={onDelete}
            onAssign={onAssign}
          />
        )}
      </main>
    </div>
  );
}
