# Coding agent handoff: build the first public beta

Copy this into a Codex or other coding agent session with write access to **`quarterback/voluntold`**. Build the application in that repository. Product specs are in its `docs/` directory. Revised October 24, 2026.

## Instruction

Build a production minded, end to end beta for volunteer activation. Read these before coding:

- [PRODUCT-PRD.md](PRODUCT-PRD.md)
- [ACTIVATION-PRD.md](ACTIVATION-PRD.md)
- [MOBILIZATION-PRD.md](MOBILIZATION-PRD.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [SHIP-TODAY.md](SHIP-TODAY.md)
- every record in [decisions/](../decisions/)

The first user story: a coordinator imports approved volunteers, describes a need, approves an opportunity, and approves a round of drafted asks. A volunteer says yes from a phone with no account. The work becomes done when its time passes, with no one confirming it.

Build the exact slice in `SHIP-TODAY.md` and its tests. Do not add hour logging or notes of extra hours, a confirm step, timesheets, shift management beyond coverage slots, billing, text messages, Slack or Discord bots, or discovery across organizations.

## Stack

Cloudflare Workers, Hono, D1 and React with Vite, with versioned migrations. The coordinator client is a progressive web app with Dexie and an outbox ([0003](../decisions/0003-coordinator-app-works-offline.md)). Material 3 components built on React Aria, with color roles from `@material/material-color-utilities` ([0004](../decisions/0004-material-3-for-the-interface.md)). Use managed authentication for organizers, and never build a password system. Volunteers use narrowly scoped, hashed, revocable capability links. Model calls go through a server side adapter to an affordable open weight model. Validate its JSON output against a schema and keep a manual fallback. A missing model key must not break the core app.

If another stack is clearly faster, write the tradeoff in a decision record in `docs/decisions/` before changing course. No provider credentials in commits.

## Acceptance

- The full loop persists over refresh and across two clients.
- Two organizations cannot reach each other's records.
- Expired or revoked links cannot reach intake, offers or pages.
- A one slot opportunity cannot be taken by two volunteers at once.
- Every drafted ask needs a coordinator's approval: round 1 of each opportunity and every ask from the weekly draft run. Rounds 2 and later, reminders and "already filled" replies send on their own.
- Every contribution needs the volunteer's yes.
- Offer, opportunity and contribution states follow the tables in `MOBILIZATION-PRD.md`. `accepted` becomes `done` when the time passes, with no confirm step. Stepping back from coverage reopens the slot and starts the next round.
- No person gets more than the weekly offer limit, checked at send time.
- People who are `new`, `paused`, `inactive` or `opted_out` get no offers.
- An action approved offline is applied exactly once after reconnecting. A rejected one shows on Today with its reason.
- A volunteer token never appears in server logs, analytics or the address bar after the first redirect.
- Model prompts never contain a volunteer's name, email or phone number.
- Screens use Material 3 role tokens only, with no raw hex values in components.
- Volunteers never create accounts. Consent and opt out work.
- Every key screen works at 375 px wide and by keyboard.
- No model call is needed to view, offer, answer, finish or export work.
- API, browser and build checks pass.
- A public preview URL and repeatable deploy instructions are in the PR.

## Deliverables

1. App source and migrations in `quarterback/voluntold`.
2. `README.md` with local run, environment variables, and migration, seed, test and deploy commands.
3. `env.example`, with no credentials.
4. Tests proving auth, tenant isolation, link scoping, state changes, last slot protection, the weekly limit and outbox replay.
5. The sample data from `SHIP-TODAY.md`: two organizations, with the named volunteers and cases.
6. Preview URL, the exact scenario tested, known defects, and a measured estimate of model cost.
7. A pull request with test output and a six section ClosedTab AAR in `docs/aar-<slug>.md`, following the Vloora agent work protocol (`docs/closedtab-workflow.md` in `quarterback/vloora`).

Never mark a flow tested unless it was run. If production auth or deploy credentials are missing, leave real user data off, deploy the seeded demo if possible, and name the exact missing configuration.

## Agent task order

Schema and auth with tenant tests → import and volunteer statuses → needs and opportunities → eligibility, ranking and rounds → offers and answers → contributions and cron → Today, Review and People → volunteer page and offer email → offline outbox → model adapter → visual check, deploy and smoke test. Commit in reviewable steps and report what actually happened after each one.

## Product language

Describe work in plain words. Screens call an offer an "ask". Buttons say what they do. Status is a sentence, such as "Taking a break until Nov 15", never a tag. Avoid employee words such as performance, scheduled employee or shift compliance. State the effort, the time, who to find and what done looks like. Availability is a signal, not a contract.
