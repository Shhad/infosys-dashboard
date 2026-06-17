// Card status enum — the five kanban columns, in board order.
export const STATUSES = [
  "OPEN",
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
] as const;

export type Status = (typeof STATUSES)[number];

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
