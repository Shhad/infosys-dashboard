// Card status enum — the five kanban columns, in board order.
export const STATUSES = [
  "OPEN",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
] as const;

export type Status = (typeof STATUSES)[number];

// Per-status badge frame colors. Full literal class strings so Tailwind's
// purge keeps them — never build these by concatenation.
export const STATUS_BADGE: Record<Status, string> = {
  OPEN: "border-slate-300 text-slate-600",
  TODO: "border-yellow-400 text-yellow-700",
  IN_PROGRESS: "border-blue-400 text-blue-700",
  REVIEW: "border-purple-400 text-purple-700",
  DONE: "border-green-500 text-green-700",
};

export type Role = "ADMIN" | "USER";

// Identity from auth-service GET /users/me.
export interface User {
  id: string;
  email: string;
  role: Role;
}

// Card shape returned by task-service.
export interface Card {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  creator_id: string;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

// auth-service POST /login response.
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}
