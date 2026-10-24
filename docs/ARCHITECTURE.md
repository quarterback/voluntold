# Technical architecture: low-cost, scalable volunteer mobilization

**Date:** October 21, 2026 | **Decision status:** proposed implementation; validate before provision/deploy

## Design target

A small team using coding agents can ship one persistent end-to-end transaction quickly. The design must support many separate organizations without turning each volunteer into a paid user seat or requiring volunteer authentication. It should have a clear path from tens to thousands of active tenants, with a low floor for operating cost.

## Proposed stack

- **App/API:** TypeScript, Hono on Cloudflare Workers, static React/Vite client served through Workers static assets (or equivalent same-origin configuration).
- **Database:** Cloudflare D1 with versioned SQL migrations and tenant-aware repository layer. Keep SQL dialect conventional; a move to managed PostgreSQL is possible.
- **Organizer identity:** use a proven managed authentication service (email OTP or OAuth) rather than implementing credentials or homegrown sessions. Verify signed auth tokens server-side; store org membership and permissions locally.
- **Volunteer access:** one-time and reusable **scoped capability links**. Store only hash digests of random tokens; enforce org, volunteer, task, scope, expiration, revocation and usage limits server-side.
- **AI calls:** separate adapter/gateway (Qwen or DeepSeek via hosted inference provider initially). Structured JSON-schema output, input minimization, per-request token limits, rate limiting, deadlines and budget caps. Manual editing always possible.
- **Model provider requirement:** use only a provider whose terms say prompts and outputs are not used for training and are not retained beyond short-term abuse monitoring. Record the provider, the terms and the date checked in an ADR before any real volunteer text is sent. Send volunteer intake text only for the call that needs it; task drafting needs the organizer's need, not volunteer profiles.
- **Async events:** Cloudflare Queues later for outbound messages, retries, reminders and provider rate limits. Launch can share URLs manually to avoid a deliverability dependency; organizer sign-in may still require a configured auth email service.
- **Files:** avoid uploads in v0. Defer object storage until materials and export attachments justify it.
- **Monitoring:** structured events, request IDs and error logging without leaking volunteer intake text or token URLs; basic uptime checks.

This stack is a recommendation, not a claim that provider pricing or self-hosting costs are fixed. Keep external providers behind narrow interfaces.

## Data model (minimum)

`organizations(id, name, created_at, plan)`  
`organization_members(id, org_id, auth_subject, role, created_at)`  
`volunteers(id, org_id, preferred_name, contact_email_nullable, status, consent_at, contact_preference, created_at)`  
`volunteer_profiles(volunteer_id, interests_json, skill_tags_json, preferences_json, updated_at)`  
`availability(id, org_id, volunteer_id, starts_at, ends_at, capacity_minutes, recurring_rule_nullable, last_confirmed_at)`  
`needs(id, org_id, author_member_id, description, status, created_at)`  
`opportunities(id, org_id, need_id, title, description, outcome, task_type, estimate_minutes, start_at, deadline_at, capacity, status, visibility, reviewer_member_id)`  
`offers(id, org_id, opportunity_id, volunteer_id, status, expires_at, created_at)`  
`contributions(id, org_id, opportunity_id, volunteer_id, offer_id_nullable, status, accepted_at, submitted_at, confirmed_at, withdrawn_at, blocker_note_nullable, hours_minutes_nullable)`  
`capabilities(id, org_id, volunteer_id_nullable, opportunity_id_nullable, token_hash, permission_scope, expires_at, revoked_at, uses)`  
`events(id, org_id, actor_kind, actor_id_nullable, verb, object_type, object_id, timestamp, metadata_json)`  
`ai_usage(id, org_id, provider, model, purpose, input_tokens, output_tokens, cost_usd_estimate, created_at)`

All organization-scoped read/write paths require tenant membership or a valid narrowly scoped volunteer capability. Never trust `org_id` supplied by the client without server-side authorization.

## API contract (first cut)

Organizer (authenticated):
- `POST /api/orgs`, `GET /api/orgs/:orgId`
- `POST /api/orgs/:orgId/needs`, `POST /api/orgs/:orgId/needs/:needId/suggest`
- `POST /api/orgs/:orgId/opportunities`, `PATCH /api/orgs/:orgId/opportunities/:id`
- `POST /api/orgs/:orgId/invitations`, `GET /api/orgs/:orgId/volunteers`
- `POST /api/orgs/:orgId/offers`, `GET /api/orgs/:orgId/contributions/export`

Scoped volunteer:
- `GET /v/:token` exchanges the token for a scoped session and redirects to the intake or opportunity its scope allows (see token handling below)
- `POST /api/volunteer/intake` (scoped session required)
- `POST /api/volunteer/offer-response` (scoped session required)
- `POST /api/volunteer/contribution` (scoped session required)
- `POST /api/volunteer/availability` and `POST /api/volunteer/opt-out` (scoped session required)

Open opportunity:
- `GET /o/:publicId` sanitized opportunity page
- `POST /api/opportunities/:publicId/interest` rate limited, Turnstile as needed. Creates a new volunteer record in the opportunity's organization with status `responded` and returns a scoped capability for the next step. It never attaches the response to an existing record by email; see ACTIVATION-PRD.md.

Token handling (required for launch):
- Each time a `/v/:token` link is opened, the server checks the token, sets a short-lived `HttpOnly`, `Secure`, `SameSite=Lax` session cookie limited to that capability's scope, and redirects to a URL without the token. Later requests use the cookie.
- Serve `/v/*` with `Referrer-Policy: no-referrer` and no third-party scripts, so the token cannot leak through the Referer header.
- Request logging, error reporting and analytics redact the `/v/:token` path segment.
- Revoking or expiring the capability also ends sessions created from it.

## Matching contract

The agent converts a need into validated `TaskDraft[]` and `OpenQuestion[]`, never a direct DB mutation. It may help normalize free-text volunteer interests and task tags.

Deterministic filters exclude volunteers whose explicit window is incompatible, whose capacity is insufficient, who lack required prerequisites, or who have opted out. Ranking uses explainable overlap from self-disclosed interests/skills and preferred task shapes. Every recommendation stores reasons and relevant eligibility facts; do not expose a numerical "trust" score or infer protected attributes.

## Authorization and abuse controls

- Organizer admin / organizer member permissions; deny-by-default per organization.
- SHA-256/HMAC of cryptographically strong invitation token (server secret held outside repository); rotate/revoke; sensible expiry. Hash comparison not plain-text token storage.
- Random opaque public IDs; no sequential volunteer identifiers in shareable URLs.
- CSRF protections for cookie-authenticated state-changing endpoints; CORS default-deny; parameterized SQL; per-route request limits.
- Double-claim protection: an atomic conditional write so the count of slot-holding contributions (see [MOBILIZATION-PRD.md](MOBILIZATION-PRD.md#states)) never exceeds the opportunity's capacity; test concurrency.
- Contact consent, self-service opt-out, admin deletion/export, modest retention defaults, no model training on volunteer profiles by default.
- Admins can see only their org; volunteers can see only their own scoped information and published opportunity details.
- Keep test data synthetic and visibly labeled in test/demo environment, never pass it off as completed volunteer activity.

## Growth path

0–100 orgs: Workers + D1, only human-triggered inference, manual sharing of URLs, CSV export.

100–1,000 orgs: stronger rate-limits, background jobs, abuse monitoring, observability dashboards, event processing, database query/index review, provider costs metered by org.

1,000–10,000+ orgs: partition tenancy where appropriate; evaluate D1 size and read/write throughput constraints, or managed PostgreSQL. Maintain migration tests and verify actual p95 latency and queue processing under load; no ungrounded claim of throughput.

The volunteer does not need a hosted identity account, so volunteer *records* and monthly *active participants* should be modeled separately. Adapter contracts keep Slack/Discord/email as delivery channels rather than parallel stores of contributions.

## Service cost controls

Log model tokens and estimated cost per purpose, org and month. Default ceiling per org; globally configured emergency cutoff. AI work runs only on explicit intent (new task, refresh suggestions, intake classification). No inference on every page load or task state change. Cache accepted task drafts. Fall back to manual entry on provider outage. Email, background processing and storage costs are separately accounted for. Do not assume inference is the main cost of growth; include support, uptime, backup, abuse and maintenance in ops reporting.

## Baseline performance and tests

Measure API p50/p95, error rate, completed transaction rate, model spend per completed contribution, token misuse attempts, and jobs/retries once queues exist. Load test concurrent task views and last-slot claims; verify tenant boundaries with two seeded orgs. Automated unit, API integration, authorization and browser mobile flows must pass before live pilot data is accepted.

## Integration roadmap

V0: web URL + copy to Slack/Discord/email manually.  
V1: Slack install, event cards and interactive claim or respond; Discord bot commands and interaction cards; each calls the same API and preserves volunteer consent.  
V2: managed exports, richer community integrations, optional federated discovery and self-hosting packaging.

Integration credentials never appear in public repo. Avoid integrations as first-launch blockers.
