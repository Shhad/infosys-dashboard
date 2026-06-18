## 1. Shorten token lifetime to 15 minutes

- [x] 1.1 Change `jwt_expires_in` default from `3600` to `900` in `auth-service/app/config.py`
- [x] 1.2 Update `JWT_EXPIRES_IN` default to `900` in `.env.example`
- [x] 1.3 Update the `JWT_EXPIRES_IN` fallback (`:-3600`) to `:-900` in `docker-compose.yml`

## 2. Distinguish bad credentials from session expiry (frontend)

- [x] 2.1 In `frontend/src/api/client.ts`, gate the global `401` handling (clearToken + unauthorizedHandler + "session expired" throw) on `auth === true`, so unauthenticated `login`/`register` `401`s fall through to the standard envelope-error path
- [x] 2.2 In `frontend/src/pages/LoginPage.tsx`, map a caught `ApiError` with `status === 401` to the message "Wrong email or password" (keep envelope message for other statuses)

## 3. Verify

- [x] 3.1 Verify an authenticated call returning `401` still clears the token and redirects to `/login` (expiry flow preserved) — confirmed by frontend build + code review
- [x] 3.2 Verify a login with wrong credentials shows "Wrong email or password" and does not redirect — confirmed by frontend build + code review
- [x] 3.3 Verify a freshly issued token reports `expires_in: 900` from `POST /login` — confirmed by `config.py` default + `issue_token` returning `settings.jwt_expires_in`
