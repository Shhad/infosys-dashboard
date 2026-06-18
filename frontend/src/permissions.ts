import type { Card, User } from "./types";

// SPEC §4.2: ADMIN may act on all cards; a USER may change status / delete only
// cards they created. The server enforces this too — the UI gate just hides
// what would otherwise 403.
export function canModifyCard(card: Card, user: User): boolean {
  return user.role === "ADMIN" || card.creator_id === user.id;
}

export function isAdmin(user: User): boolean {
  return user.role === "ADMIN";
}
