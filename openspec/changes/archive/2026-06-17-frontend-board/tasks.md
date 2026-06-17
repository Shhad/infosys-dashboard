## 1. Project scaffold & tooling

- [x] 1.1 Create `frontend/` Vite project (React 18 + TypeScript template) with `package.json`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`
- [x] 1.2 Install and configure TailwindCSS (`tailwind.config.js`, `postcss.config.js`, base `@tailwind` directives in `src/index.css`)
- [x] 1.3 Add `react-router-dom` and set up the router shell (login, register, board routes)
- [x] 1.4 Add `.env.example` documenting `VITE_AUTH_BASE_URL` and `VITE_API_BASE_URL` with local defaults; add `.gitignore` for `node_modules`, `dist`, `.env`

## 2. API client & auth context

- [x] 2.1 Create a fetch wrapper that reads `import.meta.env.VITE_AUTH_BASE_URL` / `VITE_API_BASE_URL`, attaches `Authorization: Bearer <token>`, and parses the `{ error: { code, message } }` envelope
- [x] 2.2 In the wrapper, handle `401` globally: clear the stored token and redirect to login
- [x] 2.3 Implement token storage in `localStorage` (read on boot, write on login, clear on logout/401)
- [x] 2.4 Create `AuthContext` that holds the token and the identity from `GET /users/me` (`id`, `email`, `role`), exposing `login`, `register`, `logout`, and `isAuthenticated`
- [x] 2.5 Add a `ProtectedRoute` that shows the board only when authenticated, else redirects to login

## 3. Auth screens

- [x] 3.1 Build the registration screen: email + password form → `POST /register`; advance to login/session on success, surface envelope error on failure without clearing the email
- [x] 3.2 Build the login screen: email + password form → `POST /login`; store `access_token` and route to the board on success, show error on invalid credentials
- [x] 3.3 Add a logout action that clears the token and returns to login

## 4. Kanban board & cards

- [x] 4.1 Define TS types for the card shape (`id, title, description, status, creator_id, assignee_id, created_at, updated_at`) and the `OPEN|TODO|IN_PROGRESS|REVIEW|DONE` status enum
- [x] 4.2 Fetch cards from `GET /api/cards` and render five columns, placing each card in the column matching its `status`
- [x] 4.3 Build the create-card form (title required, optional description) → `POST /api/cards`; block empty title and show the new card on success
- [x] 4.4 Implement move (status change) via `PATCH /api/cards/{id}/status` to the target column; reflect the new column on success, revert and surface `403` on failure
- [x] 4.5 Implement delete via `DELETE /api/cards/{id}` (with confirm), removing the card from the board on success

## 5. Role/ownership-aware UI & admin assignee picker

- [x] 5.1 Compute per-card permissions from `role` and `creator_id == me`; hide/disable move and delete controls for USERs on cards they did not create; show all controls for ADMIN
- [x] 5.2 For ADMIN only, load `GET /admin/users` and render an assignee picker; hide it for USER-role callers
- [x] 5.3 Wire the picker to set `assignee_id` on create and/or call `PATCH /api/cards/{id}/assignee`

## 6. UX states

- [x] 6.1 Add loading indicators for in-flight requests (board fetch, form submits)
- [x] 6.2 Surface API errors using the envelope `message`; ensure `401` consistently redirects to login

## 7. Containerization

- [x] 7.1 Write a multi-stage `frontend/Dockerfile` (stage 1 `node:20` runs `vite build` with `VITE_*` build args; stage 2 serves static `dist/` on port 3000)
- [x] 7.2 Add static-server config (nginx or `serve`) and a `.dockerignore` (nginx with SPA fallback). NOTE: `docker build` itself not executed in this shell — Docker runs in WSL; the static build + nginx config are in place for Phase 4 stack-integration to run.

## 8. Verification

- [x] 8.1 Run the app against running auth + task services and manually verify each SPEC §6 flow: register, login, logout, 5 columns, create/move/delete, role gating, admin assignee picker, `401`→login. PARTIAL: production build (`npm run build`) and dev server (HTTP 200 on :3000) verified; full live click-through against the running backend stack is a manual step (needs the Docker stack up — defer to Phase 4 `stack-integration` or run locally).
- [x] 8.2 Confirm `VITE_*` values drive the API base URLs and that no API hostname is hardcoded in source (grep of `src/` for hostnames/ports returns no matches; only `client.ts` reads `import.meta.env`)
