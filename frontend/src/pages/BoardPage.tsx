import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { isAdmin } from "../permissions";
import * as cardsApi from "../api/cards";
import { listDirectory, listUsers } from "../api/auth";
import { ApiError } from "../api/client";
import type { Card, Status, UserRef } from "../types";
import { Board } from "../components/Board";
import { CreateCardModal } from "../components/CreateCardModal";

export function BoardPage() {
  const { user, logout } = useAuth();
  const me = user!; // ProtectedRoute guarantees a user here

  const [cards, setCards] = useState<Card[]>([]);
  const [users, setUsers] = useState<UserRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
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

  // Load the user directory for everyone so assignee_id resolves to an email.
  // ADMINs get the full list (GET /admin/users) for the picker; USERs get the
  // slim {id, email} directory (GET /users) for the read-only label.
  useEffect(() => {
    const load = isAdmin(me) ? listUsers() : listDirectory();
    load.then(setUsers).catch(showError);
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
    <div className="min-h-screen bg-bg text-ink">
      {/* Top bar — gradient app logo + title on the left, user block + logout right. */}
      <header className="flex h-[60px] items-center gap-3.5 border-b border-line bg-surface px-[26px]">
        <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-gradient-to-br from-[#5b5bf0] to-[#8a7bff] text-[15px] font-extrabold text-white">
          T
        </span>
        <h1 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">
          Task Dashboard
        </h1>
        <div className="ml-auto flex items-center gap-4">
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-ink">{me.email}</div>
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">
              {me.role}
            </div>
          </div>
          <button
            onClick={logout}
            className="rounded-[9px] border border-line px-[13px] py-[7px] text-[13px] font-semibold text-muted hover:bg-bg hover:text-ink"
          >
            Log out
          </button>
        </div>
      </header>

      <main>
        {/* Toolbar — "Board" title + total issue count, primary action on the right. */}
        <div className="flex items-center gap-3.5 px-[26px] pb-1.5 pt-5">
          <span className="text-xl font-extrabold tracking-[-0.025em] text-ink">
            Board
          </span>
          <span className="text-[13px] font-semibold text-muted tabular-nums">
            · {cards.length} issues
          </span>
          <button
            onClick={() => setCreateOpen(true)}
            className="ml-auto inline-flex items-center gap-[7px] rounded-[10px] bg-primary px-4 py-2.5 text-[13.5px] font-bold text-primary-ink shadow-primary hover:brightness-105"
          >
            <span className="text-base leading-none">+</span> Create issue
          </button>
        </div>

        {error && (
          <div className="mx-[26px] mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <CreateCardModal
          admin={isAdmin(me)}
          users={users}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={onCreate}
          submitting={creating}
        />

        {loading ? (
          <div className="px-[26px] py-4 text-muted">Loading cards…</div>
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
