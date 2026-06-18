// Card status enum — the five kanban columns, in board order.
export const STATUSES = [
  "OPEN",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
] as const;

export type Status = (typeof STATUSES)[number];

// Human-readable column/badge labels per status.
export const STATUS_LABEL: Record<Status, string> = {
  OPEN: "Open",
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

// Per-status filled-pill styling: tint background, text color, leading dot.
// Full literal class strings so Tailwind's purge keeps them — never build
// these by concatenation.
export const STATUS_STYLE: Record<
  Status,
  { tint: string; text: string; dot: string }
> = {
  OPEN: { tint: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  TODO: { tint: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-400" },
  IN_PROGRESS: { tint: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  REVIEW: { tint: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  DONE: { tint: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
};

export type Role = "ADMIN" | "USER";

// Identity from auth-service GET /users/me.
export interface User {
  id: string;
  email: string;
  role: Role;
}

// Slim user reference for the directory — enough to resolve an assignee_id to a
// display email. A full `User` is assignable to this. (auth GET /users, and the
// admin GET /admin/users list narrows to it.)
export interface UserRef {
  id: string;
  email: string;
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
