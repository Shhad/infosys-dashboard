## Context

Token lifetime is already config-driven (`settings.jwt_expires_in` → `exp` claim
in `auth-service/app/security.py:issue_token`), so shortening it to 15 minutes is
purely a default-value change in three places: `app/config.py`, `.env.example`,
and `docker-compose.yml`.

The login-error problem is in the frontend HTTP layer. `frontend/src/api/client.ts`
intercepts **all** `401` responses globally — it clears the token, invokes the
registered `unauthorizedHandler` (which sets `user = null`, causing `ProtectedRoute`
to redirect to `/login`), and throws `ApiError(401, "unauthorized", "Your session
has expired. Please log in again.")`. Because `POST /login` returns `401` on bad
credentials, that path runs even though there was no session to expire, and
`LoginPage` only ever sees the hardcoded "session expired" message.

## Goals / Non-Goals

**Goals:**
- Default access-token lifetime of 15 minutes.
- An expired token on an authenticated call still clears the session and redirects
  to login (existing behaviour, preserved).
- A `401` from `POST /login` shows "Wrong email or password" and does not trigger
  the global session-clear/redirect.

**Non-Goals:**
- No refresh tokens or sliding-expiry / proactive client-side expiry timer.
- No change to the auth-service login response contract or error envelope.
- No change to task-service token validation (still local RS256 + `exp`).

## Decisions

**D1 — Scope the global `401` handler to authenticated requests.** In
`client.ts`, gate the "clear token + unauthorizedHandler + session-expired throw"
block on `auth === true`. Unauthenticated requests (`auth: false`, i.e. `login`
and `register`) fall through to the standard envelope-error path and throw an
`ApiError` carrying the server's status/code/message. *Alternative considered:*
special-casing by path string (`/login`) — rejected as more brittle than keying
off the `auth` flag the request already carries.

**D2 — Map the login `401` to a credential message at the page.** `LoginPage`
already catches `ApiError`; change it to render "Wrong email or password" when the
caught error is an `ApiError` with `status === 401`, keeping the envelope message
for other statuses. Keeps the wording a frontend presentation concern and avoids
depending on the exact server message text. *Alternative:* surface the raw server
envelope message — rejected because the user explicitly wants the fixed label.

**D3 — 15 minutes = 900 seconds** as the new `JWT_EXPIRES_IN` default, overridable
per environment via the existing env var. No code path beyond the default changes.

## Risks / Trade-offs

- [Shorter sessions mean more frequent re-login] → Acceptable and intended; the
  expiry-redirect flow already handles it gracefully. Operators can raise
  `JWT_EXPIRES_IN` if needed.
- [A genuine session-expiry on the login screen could be misattributed] → Not a
  real case: the login request is unauthenticated, so its `401` can only mean bad
  credentials; authenticated calls retain the session-expiry message.
