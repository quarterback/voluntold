# Ship today: October 21, 2026

## Shipping decision

Ship a public **working beta** that completes one real activation-to-contribution transaction. Treat launch as an end-to-end product, not a slideshow or a stack of AI screens. Use the product's own data and API. Do not promise volunteer outreach or public launch until auth, privacy, token and tenant tests pass.

Application code goes in this repository, `quarterback/voluntold`, alongside these planning documents. Product name is temporary.

## Hard scope for today's build

**Must be working**
1. Organizer sign-in and create organization.
2. Organizer types a need. The system proposes a task; if the AI provider is missing/unavailable, an editable manual draft works.
3. Organizer edits and publishes an opportunity.
4. Organizer copies a link and sends it in any channel (or uses direct intake link).
5. Volunteer completes short intake on mobile, with no account.
6. Organizer gets eligibility/match explanation or sees a volunteer interested in the open opportunity.
7. Volunteer explicitly accepts one offered/open opportunity.
8. Volunteer marks done; organizer can see a durable record and optionally confirm; CSV export works.
9. Sample mode shows two organizations and several volunteers for demos without presenting sample records as real-world adoption.

**Launch blockers**: tenant isolation, organizer auth, scoped token validation and revocation, double-claim handling, contact consent, basic rate limits, responsive/keyboard-usable interface, database migrations, and functioning deploy instructions.

**Cut first if delayed**: agent-driven conversational intake (use structured fields), fuzzy matching (use simple tags), automatic invite sending (copy links), realtime updates (refresh), hour verification complexities (optional number), and polishing analytics charts.

**Deferred**: native Slack/Discord bots, recurring auto-generation, background reactivation emails, bulk CSV imports, advanced permissions, billing, self-host installer, national discovery, mobile apps, bylaws and governance tools.

## Concrete sample data

Organization 1: local design association; organizer preparing a public lecture next Thursday. Needs event page review (60 minutes, flexible), preparation of check-in instructions (45 minutes, flexible), and registration desk (12:00–14:00 fixed coverage).

Volunteers: Alex (communications, 90 minutes this week), Sam (design, one afternoon this month), Jordan (events, available next month, prefers recurring work). Matching must exclude Jordan from this week's fixed coverage; match Alex to time-bounded communications work if otherwise eligible; never accept on a volunteer's behalf.

Organization 2: neighborhood arts group with a distinct administrator and volunteers. Tenant separation must prevent cross-reading and cross-claiming all records.

## Work sequence for coding agents

**Hour 0–1: foundation**
- Deployment target, lockfile, env.example, migrations, seed script, check/test commands.
- Organizer authentication and two-tenant auth tests. Document required cloud secrets without committing any.

**Hour 1–3: transaction backend**
- CRUD for needs, tasks, volunteer intake and scoped access.
- Claim/accept with atomic capacity enforcement, blocker and withdrawal, submit/confirm, event record, CSV export.
- Unit and API tests for state transitions and permission boundaries.

**Hour 3–5: usable UI**
- Mobile-first organizer and volunteer routes, link-sharing, status, errors, empty states.
- Agent task decomposition behind interface with timeout and manual fallback; no model API key in browser.
- Seeded demo and browser test through the entire transaction.

**Hour 5–7: deployment and quality**
- Deploy preview to a publicly reachable URL; inspect desktop and mobile.
- Test real persisted end-to-end flow; run security and abuse smoke checks, monitor errors, run cost-meter check.
- If gates pass, invite first real organization; otherwise publish an explicitly demo-only site and retain private-data onboarding off.

Timings are an aggressive target for an agent-assisted build with hosting/auth credentials available, not a guarantee.

## Exact live smoke test

A newly authenticated organizer creates “Chapter A”; enters “Need help for a public lecture”; edits/publishes “Review event page, 60 minutes”; copies the volunteer link; completes intake as Alex in a separate browser; expresses interest and accepts; marks task done; organizer sees completed contribution and downloads a CSV. Refresh both browsers; state persists. Create “Chapter B” under a different organizer; attempt cross-tenant API requests and unauthorized token reuse; all rejected. In a two-person race, exactly one volunteer can claim a one-slot task.

## Go / no-go

**Go:** deployed URL, 200s for expected routes, persistent DB, role/tenant checks pass, expired/revoked links fail closed, organizer can publish and volunteer can complete the transaction on mobile, test suite passes, no volunteer PII exposed in page HTML/API to unauthenticated users, sufficient logging for operational diagnosis.

**No-go for live data:** any missing tenant isolation, uncertain token authorization, no ability to stop invitations, simulated acceptance presented as real, broken mobile flow, or unconfigured auth/secrets. In this case, a seed-only demonstrator can still ship today while real volunteer participation stays disabled.

## Immediately after launch

- Invite five actual organizations that already have interested volunteers and concrete unfinished work.
- Instrument orgs that published, volunteer intake completion, opportunity acceptance, completed contributions, and org repeat use.
- Gather confusion points, especially whether first-time organizers can shape worthwhile tasks and volunteers can finish on mobile.
- Fix blockers before adding Slack/Discord. Audit and publish operating cost without disclosing personal data.
