# JWT Auto-Refresh — Sliding Access Token Proposal

## Goal
Silently refresh the signed user JWT before its 15-minute expiry so an active
session no longer gets a hard logout at the 15-minute mark.

## Current state
- **auth-service** issues a single RS256 JWT, `jwt_expires_in = 900` (15 min),
  no refresh endpoint. See `auth-service/app/security.py` (`issue_token`) and
  `auth-service/app/config.py:12`.
- **frontend** stores the access token in `localStorage`; any `401` clears the
  token and redirects to login. See `frontend/src/api/client.ts:64` and
  `frontend/src/auth/AuthContext.tsx:36`. No proactive refresh exists.
- **task-service** validates the JWT locally against the public key (JWKS) and
  never calls auth-service per request. So all refresh logic lives in
  auth-service + frontend only.

## Recommended mechanism: sliding access token
Lowest-surface approach that fits the MVP architecture.

### Backend (auth-service) — ~10 lines, one endpoint
Add to `auth-service/app/routers/auth.py`:

```python
@router.post("/refresh", response_model=TokenResponse)
def refresh(user: User = Depends(get_current_user)):
    token, expires_in = security.issue_token(str(user.id), user.email, user.role)
    return TokenResponse(access_token=token, token_type="Bearer", expires_in=expires_in)
```

- Reuses `get_current_user` (a still-valid token is required) and `issue_token`.
- No DB change, no new key, no schema change.
- Identity/role re-read from DB, so role changes propagate on refresh.

### Frontend — ~30-40 lines across a few files
- Add `authApi.refresh()` in `frontend/src/api/auth.ts`.
- In `AuthContext.tsx`, after login/boot, schedule a refresh at
  `~ expires_in - 60s`. On success, `setToken(...)` and reschedule. On failure,
  fall back to the existing 401 -> logout path.
- Persist `expires_in` (or decode `exp`) so a page reload restarts the timer.

## Trade-off
Sliding session: as long as the tab is active (or reloaded) within any 15-min
window, the session stays alive. If idle/expired past 15 min, the refresh 401s
and the user re-logs in — same as today's behavior.

## Effort
Shallow. ~1-2 hours including a verify run. Touches 3-4 files, adds zero
infrastructure, does not change how task-service validates tokens.

## Heavier alternative (deferred)
True refresh tokens: long-lived refresh token + short-lived access token,
httpOnly cookie, rotation, server-side revocation list. Deeper — a DB table,
cookie/CORS-credentials handling, rotation logic, logout-revocation (~a day+).
Worth it for real revocability and multi-day "stay logged in"; overkill for the
current MVP.

## Recommendation
Go with the sliding-token approach. It directly answers "auto-refresh after 15
minutes" with minimal risk and matches existing codebase patterns. Can be done
as an OpenSpec change proposal (`/opsx:propose`) or as direct edits.
