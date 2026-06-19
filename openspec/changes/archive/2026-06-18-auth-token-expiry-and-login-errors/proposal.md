## Why

Access tokens currently live for 1 hour, which is longer than we want for a
short-lived session credential. Separately, the frontend's global `401` handler
treats *every* `401` as a session expiry — including the `POST /login` response
for bad credentials — so a user who mistypes their password sees the misleading
message "Your session has expired. Please log in again." instead of being told
their credentials were wrong.

## What Changes

- Shorten the default access-token lifetime to **15 minutes** (`JWT_EXPIRES_IN`
  default `3600` → `900`) in auth-service config and the documented env defaults.
- Keep the existing behaviour where an expired/`401` token on an authenticated
  request clears the session and redirects to the login screen, and verify it
  triggers reliably with the shorter lifetime.
- Distinguish authentication failures from session expiry on the frontend: a
  `401` from the unauthenticated `POST /login` (and `POST /register`) request
  MUST surface the credential error "Wrong email or password" rather than the
  global "session expired" message, and MUST NOT trigger the session-clear /
  redirect side effects.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `frontend-board`: the login flow surfaces a credential-specific error message
  ("Wrong email or password") that is distinct from the session-expiry message,
  and the global `401`-redirect behaviour applies only to authenticated requests
  — not to the login/register requests themselves.

## Impact

- **auth-service**: `app/config.py` default for `jwt_expires_in`; documented
  defaults in `.env.example` and `docker-compose.yml`. No code-path change to
  token issuance (lifetime already sourced from config).
- **frontend**: `src/api/client.ts` (scope global `401` handling to authenticated
  requests), `src/pages/LoginPage.tsx` and/or `src/auth/AuthContext.tsx` (map a
  login `401` to "Wrong email or password").
- No database, API contract, or new dependency changes. `expires_in` is already
  returned by `/login`, so clients observe the new lifetime automatically.
