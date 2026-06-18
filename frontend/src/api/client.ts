import { clearToken, getToken } from "./token";

// Build-time API base URLs. These are inlined by Vite at build time; never
// hardcode hostnames elsewhere in the app.
const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_URL;
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type Service = "auth" | "task";

// Error carrying the standard envelope { error: { code, message } }.
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// Registered by AuthContext so a global 401 can clear session + redirect.
let unauthorizedHandler: (() => void) | null = null;
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

function baseFor(service: Service): string {
  return service === "auth" ? AUTH_BASE : API_BASE;
}

interface RequestOptions {
  service: Service;
  method?: string;
  path: string;
  body?: unknown;
  auth?: boolean; // attach Bearer token (default true)
}

export async function request<T>({
  service,
  method = "GET",
  path,
  body,
  auth = true,
}: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${baseFor(service)}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Global 401 handling: clear token and let the app redirect to login.
  if (res.status === 401) {
    clearToken();
    if (unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(401, "unauthorized", "Your session has expired. Please log in again.");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    // Standard error envelope: { error: { code, message } }.
    const code = data?.error?.code ?? "error";
    const message = data?.error?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, code, message);
  }

  return data as T;
}
