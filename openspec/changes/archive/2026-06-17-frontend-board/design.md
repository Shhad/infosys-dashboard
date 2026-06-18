## Context

Phases 1–2 delivered headless `auth-service` (FastAPI, RS256 JWT, JWKS) and
`task-service` (Java/Spring, card CRUD with SPEC §4.2 role/ownership rules). Both
already allow the `http://localhost:3000` origin via CORS. This change builds the
only human-facing piece — a React SPA — consuming those APIs unchanged. It must
respect the build-time nature of Vite env vars (SPEC §6 caveat: `VITE_*` are baked
in at `vite build`, not runtime) and be containerizable for the Phase 4 compose
stack without requiring Node on the host.

The relevant API surface (confirmed against the code):
- auth-service: `POST /register`, `POST /login` → `{ access_token, token_type,
  expires_in }`, `GET /users/me` → `{ id, email, role }`, `GET /admin/users` → list
  of those.
- task-service: `GET /api/cards`, `POST /api/cards`, `PATCH /api/cards/{id}/status`,
  `PATCH /api/cards/{id}/assignee`, `DELETE /api/cards/{id}`; card shape
  `{ id, title, description, status, creator_id, assignee_id, created_at, updated_at }`.

## Goals / Non-Goals

**Goals:**
- A runnable React 18 + TS + Vite + Tailwind SPA on port 3000 covering all SPEC §6
  requirements: auth screens, 5-column board, create/move/delete, role-aware gating,
  admin assignee picker, `VITE_*` config, `401`→login.
- A multi-stage Docker image (Node build → static server) ready for Phase 4 compose.
- UI authorization that mirrors — never replaces — server-side enforcement.

**Non-Goals:**
- Backend changes of any kind (none needed).
- Wiring into the full compose stack / root README (Phase 4 `stack-integration`).
- AWS build values for `VITE_*` (Phase 2 / §12, deferred).
- Drag-and-drop polish, optimistic caching libraries, SSR, or real-time updates.
- Token refresh flows — MVP stores a single access token until `401`/logout.

## Decisions

**D1 — Stack: React 18 + TypeScript + Vite + TailwindCSS.** Mandated by SPEC §6.
Vite for fast dev and a small static build; Tailwind utility-first with
`tailwind.config.js`. Alternative (CRA/webpack) rejected as heavier and effectively
deprecated.

**D2 — Routing & state: `react-router-dom` + React Context, no Redux.** App is small
(login, register, board). A single `AuthContext` holds the token + decoded
identity (`GET /users/me`); a lightweight board state hook owns cards. Redux/Zustand
rejected as overkill for MVP.

**D3 — API access via a thin fetch wrapper.** One module reads
`import.meta.env.VITE_AUTH_BASE_URL` / `VITE_API_BASE_URL`, injects the `Bearer`
header, and centralizes error handling: it parses the `{ error: { code, message } }`
envelope and, on `401`, clears the token and redirects to login. This keeps the
`401`→login and env-config requirements in one place. Axios rejected — native
`fetch` suffices and avoids a dependency.

**D4 — Token in `localStorage`.** Permitted by SPEC §6 for MVP. Read on app boot to
restore the session; cleared on logout and on `401`. Role/identity derived from
`GET /users/me` (authoritative) rather than trusting a client-decoded JWT, so the UI
gate uses the same source the server does.

**D5 — UI authorization mirrors SPEC §4.2, defense-in-depth only.** A card's
controls are computed from `role` and `creator_id == me`: ADMIN → all controls;
USER → move/delete only on own-created cards; assignee picker only for ADMIN
(needs `GET /admin/users`). The server still enforces every rule; the UI just hides
what would `403`. We never hide a card the API returned — visibility is the server's
job via `GET /api/cards`.

**D6 — Move = status PATCH.** Moving a card between columns calls
`PATCH /api/cards/{id}/status` with the target column's status. Start with simple
move buttons/select; drag-and-drop is an optional enhancement, not required by §6.

**D7 — Container: multi-stage Dockerfile.** Stage 1 `node:20` runs `vite build` with
`VITE_*` build args; stage 2 serves the static `dist/` (nginx or `serve`) on 3000.
Mirrors the no-host-toolchain pattern already used by task-service. Because `VITE_*`
are build-time, they are passed as Docker build args, documented in `.env.example`.

## Risks / Trade-offs

- **Build-time env confusion** (devs expecting runtime config) → Document loudly in
  `.env.example` and README; pass values as Docker build args in Phase 4.
- **`localStorage` token exposes to XSS** → Accepted for MVP per SPEC; mitigated by
  React's default escaping and no `dangerouslySetInnerHTML`. Revisit (httpOnly
  cookie) if hardened later.
- **UI gate drifting from server rules** → Treat server as source of truth; always
  surface `403`/`401` envelopes instead of assuming the UI gate is complete.
- **CORS/URL mismatch in local dev** → `VITE_*` defaults point at the documented
  local ports (auth + task) that already allow origin 3000.
- **Reading identity via extra `GET /users/me` call** → one small request on login;
  acceptable and avoids trusting client-side JWT decoding.

## Migration Plan

Additive, new `frontend/` directory only — no existing code touched, nothing to roll
back in the backend. Standalone verification: `npm run dev` (or the container) against
running auth/task services. Full compose integration and end-to-end AC-15 land in the
Phase 4 `stack-integration` change.

## Open Questions

- Move interaction for MVP: per-card status `<select>`/buttons (simplest) vs.
  drag-and-drop — default to select/buttons unless drag-and-drop is requested.
- Card delete confirmation UX (inline confirm vs. modal) — default to a simple
  confirm.
