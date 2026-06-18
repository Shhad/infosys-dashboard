# frontend — CLAUDE.md

The Task Dashboard SPA: a kanban board over `task-service`, authenticating against
`auth-service`. Built as a static bundle and served by **nginx** with SPA fallback;
the running container needs no Node and no runtime config.

## Stack

- **React 18** + **TypeScript**, bundled by **Vite 5**.
- **react-router-dom 6** for routing.
- **Tailwind CSS 3** (+ PostCSS / autoprefixer) for styling.
- No state library — auth state lives in a React context; server data is fetched per page.

Scripts (`package.json`): `dev` (Vite on port 3000), `build` (`tsc -b && vite build`),
`preview`, `lint` (`tsc --noEmit`).

## Build-time config (important)

API base URLs are **build-time** `VITE_*` args, inlined by Vite at `vite build` — they are
**not** runtime env. The browser (not the compose network) calls the backends, so they are
host-published localhost ports:

- `VITE_AUTH_BASE_URL` → auth-service (`http://localhost:8000`)
- `VITE_API_BASE_URL` → task-service (`http://localhost:8080`)

Changing them requires `docker compose up --build` (a plain `up` reuses the old image).
Read them only via `import.meta.env` in `src/api/client.ts` — **never hardcode hostnames
elsewhere.**

## Layout (`src/`)

| Path | Responsibility |
|------|----------------|
| `main.tsx` | Mount; wraps `<App>` in router + `AuthProvider`. |
| `App.tsx` | Routes: `/login`, `/register`, `/` (board, protected), `*` → `/`. |
| `api/client.ts` | `request<T>()` fetch wrapper: base-URL selection, Bearer header, `{ error: { code, message } }` parsing into `ApiError`, **global 401 handling**. |
| `api/token.ts` | Access token in `localStorage` under `td_access_token` (MVP, SPEC §6). |
| `api/auth.ts` | `login`, `register`, `getMe` (auth-service calls). |
| `api/cards.ts` | Card CRUD (task-service calls). |
| `auth/AuthContext.tsx` | `AuthProvider` / `useAuth`: session restore on boot, login/register (register auto-logs-in), logout, global-401 → clear session. |
| `auth/ProtectedRoute.tsx` | Redirects unauthenticated users to `/login`. |
| `permissions.ts` | Client mirror of SPEC §4.2 (`canModifyCard`, `isAdmin`) — UI gating only. |
| `types.ts` | `Card`, `User`, etc. (snake_case fields matching the API). |
| `pages/` | `LoginPage`, `RegisterPage`, `BoardPage`. |
| `components/` | `Board`, `Column`, `CardItem`, `CreateCardForm`, `AssigneePicker`, `AssigneeLabel`. |

Other: `index.html`, `index.css` (Tailwind entry), `tailwind.config.js`, `vite.config.ts`,
`nginx.conf` (SPA fallback for the container), `Dockerfile` (multi-stage build → nginx).

## Auth flow

1. `login()` posts to auth-service, stores `access_token`, then fetches `getMe()`.
2. `register()` creates the user then auto-logs-in.
3. On boot, `AuthProvider` restores the session by calling `getMe()` if a token exists.
4. The API client clears the token on any `401` from an **authenticated** request and
   notifies `AuthProvider` (via `onUnauthorized`) to drop the user → redirect to login.
   Unauthenticated requests (login/register) skip this so their 401 surfaces to the form.

## Permissions (UI gating only — defense in depth)

`permissions.ts` mirrors the server's authorization matrix so the UI can hide actions that
would 403. **The server (`task-service`) is the authoritative enforcer** — never rely on
these checks for security; keep them in sync with SPEC §4.2 when rules change.

## Conventions

- All HTTP goes through `api/client.ts`’s `request<T>()`; don't call `fetch` directly in
  components/pages. New endpoints get a typed wrapper in `api/auth.ts` or `api/cards.ts`.
- Consume errors as `ApiError` (`.status`, `.code`, `.message`).
- Field names match the API's snake_case (`creator_id`, `assignee_id`, …).
- Keep `npm run lint` (`tsc --noEmit`) clean — the Docker build runs `tsc -b`.

## Dev vs container

- **Container (default):** static bundle served by nginx on `:3000` with URLs baked at
  build time.
- **Local dev:** `cp .env.example .env && npm install && npm run dev` runs Vite (hot
  reload) against the containerized backends. **Keep the dev server on port 3000** — both
  backends only allow that CORS origin.
