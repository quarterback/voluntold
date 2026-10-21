# Coding-agent handoff: build the first public beta

Copy this into a Codex or other coding-agent session with write access to **`quarterback/voluntold`**. Build the application in that repository. Product specs are in its `docs/` directory.

## Instruction

Build a production-minded, end-to-end beta for volunteer activation and mobilization. Read PRODUCT-PRD.md, ACTIVATION-PRD.md, MOBILIZATION-PRD.md, ARCHITECTURE.md and SHIP-TODAY.md before coding. The first user story is: organizer describes a need, creates a task, shares an invitation, volunteer completes a lightweight intake and accepts a contribution without making an account, marks it done, and organizer sees completion.

Implement the exact vertical slice and tests; resist adding project-management dashboards, shift-management bloat, billing, SMS, Slack bots, Discord bots or marketplace discovery. Create an accessible, responsive, practical interface that volunteers can use from a phone.

## Stack

Prefer Cloudflare Workers + Hono + D1 + React/Vite with versioned migrations. Use existing managed authentication for organizers; never build a password system from scratch. Volunteers access only narrowly scoped, hashed, revocable capability links. Model calls use a server-side adapter to an affordable open-weight model; validate JSON output with schema and offer manual fallback. A missing model key must not make the core app unusable.

If an existing repository or deployment platform makes another stack demonstrably faster, document the tradeoff in an ADR before diverging. No provider credentials in commits.

## Acceptance

- Full transaction persists over refresh and across two clients.
- Two organizations cannot access each other's records.
- Expired/revoked link cannot access intake or tasks.
- A one-slot opportunity cannot be claimed by two volunteers concurrently.
- Every outbound offer requires organizer action; every accepted contribution requires volunteer action.
- Contribution, offer and opportunity states follow the tables in MOBILIZATION-PRD.md, including `blocked` and `withdrawn`; withdrawing from coverage reopens the slot.
- A volunteer token never appears in server logs, analytics or the address bar after the first redirect.
- Temporary availability is respected; fixed coverage is not automatically fragmented.
- Volunteers do not create accounts; voluntary consent and opt-out work.
- All key screens work at small mobile widths and via keyboard.
- No AI model call is needed to view, accept, complete or export work.
- API integration, browser flow and build checks pass.
- A public preview URL and repeatable deployment instructions are included in the PR.

## Deliverables

1. App source and migrations in `quarterback/voluntold`, not under the Vloora static site.
2. `README.md` with local run, env vars, migration/seed/test/deploy commands.
3. `env.example`, no credentials.
4. Tests proving auth, tenant isolation, link scoping, state transitions and last-slot concurrency.
5. Minimal demo fixtures with two separate tenants and realistic work/availability.
6. Preview URL, exact tested scenario, known defects, measured estimate of model cost.
7. Pull request with test output and a six-section ClosedTab AAR in `docs/aar-<slug>.md`, following the Vloora agent-work protocol (`docs/closedtab-workflow.md` in `quarterback/vloora`).

Never mark a flow tested if it was not executed. If production auth or deployment credentials are missing, leave live real-user capture disabled, deploy seeded demo if possible, and give the precise blocking configuration.

## Agent task order

Implement data schema/auth and test tenant boundaries → need/task drafting → invite/intake → matching and offer → explicit acceptance → complete/export → model adapter → visual fit, deployment and smoke test. Commit in reviewable increments and report actual outcomes after each meaningful segment.

## Product language

Use plain descriptions of work and contribution. Avoid employee labels such as "worker performance", "scheduled employee" or "shift compliance". State effort, deadline, contact and what done looks like. Volunteer availability is a signal, not a contract.
