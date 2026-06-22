# Switch task-service to JWKS — AWS Deployment Readiness

## Goal
Move task-service's RS256 public-key source from the **shared `keys` Docker
volume** to auth-service's **JWKS HTTP endpoint** (`/.well-known/jwks.json`), so
the two services no longer require a shared filesystem and can be deployed on
separate hosts (ECS tasks / EC2 instances / K8s pods) for the deferred AWS rollout
(SPEC §12). Keep **local** signature verification — only the *key source* changes.

## Why (motivation)
Today the keypair lives in a shared `keys` volume: auth-service writes
`private.pem` + `public.pem`, task-service mounts the same volume **read-only** and
reads `public.pem`. This is simplest and most resilient on a single host, but:

- **It assumes a shared filesystem** — both services must run on the same host /
  volume. That breaks the moment services are distributed across machines, which
  is exactly what an AWS deployment implies.
- **No graceful key rotation** — task-service loads the public key **once at
  startup**; rotating keys requires a restart and there's no `kid`-based lookup at
  runtime (even though the JWT header already carries a `kid`).

JWKS solves both: standard OIDC pattern, no shared disk, rotation-friendly,
local verification preserved (so we keep the resilience/perf of not calling auth
per-request).

## Current state
- **auth-service** already publishes JWKS. See `auth-service/app/main.py`
  (`/.well-known/jwks.json` wired in the app factory) and
  `auth-service/app/security.py` (JWKS construction + `kid` derived from SHA-256 of
  the DER public key, first 16 b64url chars). JWT header already carries `kid`.
- **task-service** already has a JWKS fallback path. See
  `task-service/src/main/java/com/taskdashboard/taskservice/security/JwtKeyProvider.java`
  ("Loads the RS256 public key (PEM path, JWKS fallback)") and `JwtAuthFilter.java`
  (local RS256 verify + expiry/clock-skew). Today it prefers `JWT_PUBLIC_KEY_PATH`
  (`/keys/public.pem`); `AUTH_JWKS_URL` is wired but **empty/disabled by default**
  and, per the docs, currently **loaded once at startup**.
- **docker-compose.yml** sets `AUTH_JWKS_URL: ${AUTH_JWKS_URL:-}` (empty) and mounts
  `keys:/keys:ro` into task-service (lines ~71–78).

So the plumbing exists — this work is about making JWKS the **primary** source,
adding **runtime refresh + `kid` selection**, and removing the volume dependency.

## Proposed work

### 1. task-service — make JWKS primary, with caching + rotation
In `JwtKeyProvider.java`:
- When `AUTH_JWKS_URL` is set, use it as the **primary** key source; treat the PEM
  path as the fallback (invert today's precedence).
- **Cache** the fetched JWKS and **select the key by `kid`** from the incoming
  JWT header (don't assume a single key). On an unknown `kid`, refresh the JWKS
  once (bounded) before rejecting — this is what enables zero-downtime rotation.
- Add a **refresh policy**: TTL-based cache + refresh-on-unknown-`kid`, so we are
  not "loaded once at startup" anymore.
- **Resilience:** keep the last-known-good JWKS in memory so a transient
  auth-service outage doesn't break verification (preserves the NFR-2 spirit —
  no hard per-request dependency).

### 2. Config
- Default `AUTH_JWKS_URL` to the in-network auth URL for compose
  (e.g. `http://auth-service:8000/.well-known/jwks.json`) — note this is the
  **container-network** name/port, not the host-published `localhost:8000`.
- Keep `JWT_PUBLIC_KEY_PATH` as documented fallback for the single-host path.
- Document new keys in root `.env.example` and both service `CLAUDE.md`s.

### 3. Decouple deployment (the actual AWS payoff)
- Drop the `keys:/keys:ro` mount from **task-service** once JWKS is primary; the
  `keys` volume then belongs to auth-service alone.
- Remove the `task-service depends_on auth-service` "wait for public.pem"
  ordering coupling (replace with JWKS fetch + retry/backoff on startup).
- task-service now needs only **network reachability** to auth's JWKS endpoint —
  no shared disk. This is the property that makes separate-host AWS deploys work.

### 4. Verify
- Extend `task-service/verify.sh` (or add a case) to prove tokens validate with
  the volume **unmounted** and only `AUTH_JWKS_URL` set.
- Add a **rotation test**: rotate the auth keypair, confirm task-service picks up
  the new `kid` without a restart and old (unexpired) tokens still verify until
  expiry.

## Trade-offs / things to watch
- **Startup dependency:** JWKS fetch reintroduces a *startup-time* need for auth
  reachability. Mitigate with retry/backoff + cached last-known-good; do **not**
  fetch per-request.
- **Rotation story:** the real win is `kid`-based multi-key support — without it,
  JWKS is no better than the volume for rotation. Make sure auth-service keeps
  publishing the old key in JWKS for at least one token-TTL window after rotation.
- **AWS-native option (note for later):** instead of (or alongside) JWKS, the
  keypair could live in AWS Secrets Manager / KMS and be mounted/injected. JWKS is
  the more portable, vendor-neutral choice and reuses what auth-service already
  exposes — recommended as the first step.

## Effort
Moderate. Most surface is in `JwtKeyProvider.java` (cache + `kid` selection +
refresh) plus compose/env/docs and verify additions. No DB or schema changes; no
change to *how* signatures are verified, only where the key comes from.
Estimate ~half a day including a rotation verify run.

## Recommendation
Do this as an **OpenSpec change** (`/opsx:propose`) since it touches a documented
NFR (NFR-2) and the deployment model. Sequence it **before** the AWS deployment
work (SPEC §12) — it's a prerequisite for running the services on separate hosts.
Keep local verification throughout; this is a key-distribution change, not an
authn-model change.

## Key references
- `task-service/.../security/JwtKeyProvider.java` — PEM + JWKS loading (invert
  precedence here)
- `task-service/.../security/JwtAuthFilter.java` — local RS256 verify
- `auth-service/app/main.py` — `/.well-known/jwks.json`
- `auth-service/app/security.py` — JWKS + `kid` derivation
- `docker-compose.yml` — `AUTH_JWKS_URL`, `keys:/keys:ro` mount (~71–78)
- Related prior note: `context/todo/jwt-refresh/jwt-refresh-proposal.md`
