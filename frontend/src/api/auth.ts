import { request } from "./client";
import type { TokenResponse, User } from "../types";

export function register(email: string, password: string): Promise<User> {
  return request<User>({
    service: "auth",
    method: "POST",
    path: "/register",
    body: { email, password },
    auth: false,
  });
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return request<TokenResponse>({
    service: "auth",
    method: "POST",
    path: "/login",
    body: { email, password },
    auth: false,
  });
}

export function getMe(): Promise<User> {
  return request<User>({ service: "auth", path: "/users/me" });
}

// ADMIN-only: list of users for the assignee picker.
export function listUsers(): Promise<User[]> {
  return request<User[]>({ service: "auth", path: "/admin/users" });
}

// Any authenticated caller: slim {id, email} directory used to resolve a card's
// assignee_id to a display email (e.g. for the USER read-only assignee label).
export function listDirectory(): Promise<Pick<User, "id" | "email">[]> {
  return request<Pick<User, "id" | "email">[]>({ service: "auth", path: "/users" });
}
