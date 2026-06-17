import { request } from "./client";
import type { Card, Status } from "../types";

export function listCards(): Promise<Card[]> {
  return request<Card[]>({ service: "task", path: "/api/cards" });
}

export function createCard(input: {
  title: string;
  description?: string;
  assignee_id?: string | null;
}): Promise<Card> {
  return request<Card>({
    service: "task",
    method: "POST",
    path: "/api/cards",
    body: input,
  });
}

export function updateStatus(id: string, status: Status): Promise<Card> {
  return request<Card>({
    service: "task",
    method: "PATCH",
    path: `/api/cards/${id}/status`,
    body: { status },
  });
}

export function updateAssignee(id: string, assignee_id: string | null): Promise<Card> {
  return request<Card>({
    service: "task",
    method: "PATCH",
    path: `/api/cards/${id}/assignee`,
    body: { assignee_id },
  });
}

export function deleteCard(id: string): Promise<void> {
  return request<void>({
    service: "task",
    method: "DELETE",
    path: `/api/cards/${id}`,
  });
}
