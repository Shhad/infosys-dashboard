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
