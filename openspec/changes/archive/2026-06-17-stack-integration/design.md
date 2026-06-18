## Context

The root `docker-compose.yml` already orchestrates four services — `auth-db`,
`auth-service`, `task-db`, `task-service` — on a single `app-net` network, with an RS256
keypair shared from auth-service to task-service via a `keys` volume (private to auth,
read-only to task). The `frontend/` project (Phase 3) ships a working multi-stage
`Dockerfile` (`node:20` `vite build` → `nginx:1.27` serving `dist/` on :3000) and an
`nginx.conf` with SPA fallback, but it is not yet wired into Compose; it has only been run
via the host Vite dev server during Phase-3 verification.

Key constraints carried from prior phases:
- The frontend reads its API base URLs from `import.meta.env.VITE_*` at **build time**;
  Vite inlines them into the bundle during `vite build`. The Dockerfile already declares
  `ARG VITE_AUTH_BASE_URL` / `ARG VITE_API_BASE_URL` (per Phase-3 notes).
- Both backends are started with `CORS_ORIGINS=http://localhost:3000` only, so the
  frontend MUST be reachable at exactly that origin (host port 3000, no auto-bump).
- The browser — not the Compose network — is what calls the backends, so the build-arg
  URLs must be `localhost:8000` / `localhost:8080` (host-published ports), not the
  in-network DNS names `auth-service` / `task-service`.
- Docker runs natively in WSL2 Ubuntu and is not on the Windows PATH; Compose is invoked
  via `wsl -e bash -lc "cd /mnt/d/... && docker compose …"`.

This is the final local iteration (Phase 4) and closes AC-15. No application code changes
are expected — it is config + infra + docs.

## Goals / Non-Goals

**Goals:**
- Add a `frontend` Compose service so `docker compose up --build` brings up all five
  services, with the frontend reporting healthy.
- Pass `VITE_AUTH_BASE_URL` / `VITE_API_BASE_URL` as build args wired through `.env`.
- Document the stack per NFR-6 (root `README.md`) and the new keys (root `.env.example`).
- Verify AC-1…AC-15 end-to-end against the fully containerized stack.

**Non-Goals:**
- AWS / SPEC §12 (deferred). The build-arg URLs differ there (CloudFront/ALB) but that is
  a later phase and MUST NOT require app code changes.
- Any change to application code, API surface, DB schema, or the existing
  `frontend/Dockerfile` / `nginx.conf` (reused as-is).
- A reverse proxy / single-origin gateway that would let the browser reach the backends
  over the Compose network — out of scope for the MVP local stack.

## Decisions

**1. Build args via Compose `build.args`, sourced from `.env` — not runtime `environment:`.**
The `frontend` service uses `build: { context: ./frontend, args: { VITE_AUTH_BASE_URL,
VITE_API_BASE_URL } }`. Because Vite inlines env at build time, runtime `environment:`
would have no effect on the already-compiled bundle. Values come from `.env`
(`VITE_AUTH_BASE_URL=http://localhost:8000`, `VITE_API_BASE_URL=http://localhost:8080`)
with sensible defaults so a bare `docker compose up --build` still works.
*Alternative considered:* runtime env + an entrypoint that rewrites the bundle / serves a
generated `config.js` — rejected as unnecessary complexity for an MVP where the URLs are
known at build time (matches the Phase-3 locked decision).

**2. Build-arg URLs point at `localhost`, not in-network service names.**
The bundle runs in the user's browser, which reaches the backends through the host-mapped
ports `8000`/`8080`. Using `auth-service`/`task-service` DNS names would only resolve
inside the Compose network and would break in the browser (and would also miss the
`localhost:3000` CORS allow-list pairing).

**3. Frontend healthcheck via nginx.**
Add a Compose healthcheck that probes nginx locally inside the container (e.g.
`wget -qO- http://localhost:3000/` or an equivalent), so `docker compose up` can report
the frontend `healthy` and satisfy the spec's "all five healthy" scenario. The
`nginx:1.27` image is shell-capable; the check targets the SPA root. *Alternative:* no
healthcheck (rely on "running") — rejected because the spec calls for a healthy frontend
and a healthcheck catches a misbuilt/misconfigured nginx early.

**4. `depends_on` for ordering only.**
`frontend` `depends_on` `auth-service` and `task-service` (start ordering). The frontend
does not need them *healthy* to serve static files — the browser tolerates a backend that
comes up a moment later — so plain `depends_on` (condition `service_started`) is
sufficient and avoids coupling the SPA's availability to backend healthchecks.

**5. Reuse the existing Dockerfile/nginx.conf untouched.** The Phase-3 image already
multi-stage-builds and serves on :3000 with SPA fallback; the only new surface is the
Compose service definition, the `.env(.example)` keys, and the README.

## Risks / Trade-offs

- **Port 3000 occupied (e.g. a stray host Vite process) → CORS/connection failures.**
  Mitigation: README instructs keeping 3000 free and killing stray `vite`/node processes;
  Compose binds `3000:3000` explicitly (fails fast if taken rather than silently
  auto-bumping like the dev server).
- **Stale baked URLs after editing `.env`.** Because `VITE_*` are build args, changing
  `.env` requires `docker compose up --build` (not just `up`) to take effect.
  Mitigation: documented in README + `.env.example` comments.
- **Build-arg defaults diverge from AWS.** Local defaults are `localhost:*`; AWS will pass
  different build args. Mitigation: values are parameterized through `.env`/build args, so
  the AWS phase changes config only — consistent with the "no app code changes" rule.
- **nginx healthcheck false negatives** if the probe tool isn't present in the image.
  Mitigation: pick a probe available in `nginx:1.27` (wget is present in the Debian-based
  image; otherwise fall back to a `CMD-SHELL` curl or a TCP check) and verify during
  apply.

## Migration Plan

1. Add the `frontend` service + healthcheck to `docker-compose.yml`; add `VITE_*` keys to
   root `.env.example` (and local `.env`).
2. Write/extend root `README.md` per NFR-6.
3. `docker compose up --build` (via WSL); confirm five healthy services.
4. End-to-end smoke (admin + USER flows) against `http://localhost:3000`; confirm
   AC-1…AC-15.
Rollback is trivial: the change is additive Compose/docs; reverting the `frontend` service
restores the prior four-service stack with no data or schema impact.
