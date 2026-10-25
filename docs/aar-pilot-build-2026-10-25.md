# Agent Action Record: Pilot build

**Review date:** 2026-10-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, main session
**Task or period under review:** Building the pilot app from `docs/SPEC.md` and opening a pull request
**Accountable human (name or role):** Repository owner (the founder)

## 1. Intent: what was supposed to happen
**Instruction given:** "Build a working spec and make a pr"
**How the agent read it:** Build the small, real app the owner chose for the 3 to 5 organization pilot, from `docs/SPEC.md`. Then open a pull request. The agent didn't ask whether "working spec" meant the app or another document. The owner had already chosen "A real app, small", and had asked for fewer questions.
**Success defined in advance as:** The spec's "Must pass" list holds in automated tests, and the spec's pilot check runs on a phone-sized screen.
**Authority granted to the agent:** Write code in `quarterback/voluntold` on `claude/volunteer-product-spec-946b8g`, push, and open one pull request.
**Out of scope:** Deploying, creating Cloudflare or Resend accounts, choosing the product name or the record domain, merging.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Set up a Worker with D1, Hono, React, MUI 9 and Vite, and wrote the schema for the spec's building blocks.
2. Wrote the rules as plain functions: requirements, who fits, who goes first, expiry, and batch size.
3. Wrote the server:
   - email code sign-in
   - roles
   - organizations, fields, teams and members
   - volunteers and import with duplicate merging
   - tasks, asking, answering, and "I can't make it"
   - the sweep that expires asks, pauses people, and marks work done
   - Today, export, AT Protocol posting, and the public task page
4. Wrote 31 tests: 12 for the rules, 17 for the API, and 2 for AT Protocol with Bluesky's servers faked. The first run found a real bug: asking didn't expire old asks first. It was fixed.
5. Built the screens and a Playwright walk through the spec's pilot check on a 412 pixel wide screen. The walk found and fixed three problems:
   - no way to import a second file
   - a team checkbox that lagged until the server answered
   - a filled task showing "Nothing to answer" instead of "already filled"
6. Read the screenshots. Fixed import column guessing after the XML sample made "id" and "skill" into new details.
7. Updated the spec in three places where the build settled details. Wrote decision 0008, updated the README, added CI, and wrote this record.

**What it produced or changed:** the application under `src/`, `migrations/`, `lexicons/`, `test/`, `e2e/`, `samples/`, project config, `.github/workflows/check.yml`, `README.md`, `docs/SPEC.md`, `docs/LATER.md`, `docs/decisions/0008-pilot-build-choices.md`, and this record.
**Where actual behavior differed from the instruction:** None known. The spec differences are listed in section 4.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made earlier:** Everything in decisions 0001 to 0007.
**Decisions the agent made alone, for owner review:** Everything in decision 0008, mainly:
- email code sign-in built into the app, not a managed sign-in service
- an AT Protocol app password for posting
- Claude as the default import model
- `.xlsx` only
- an ask counts as sent when created
- a late yes still takes an open spot
- the placeholder record name `com.example.volunteer.task`

**Left to the owner:** The record domain, the model provider and its data terms, the Resend sending domain, the Cloudflare account, the product name, merging.

## 4. Deviation: the gaps
- The spec asked for a managed sign-in service. The build has its own email code sign-in with no passwords (0008).
- The spec named "Log in with Bluesky" after a one-day OAuth test. That test wasn't run. Posting uses an app password instead.
- Not run against real services: Resend, the Anthropic API, and a real Bluesky account. AT Protocol posting was tested against a fake server that follows the documented API shapes.
- Two steps of the pilot check were covered by API tests rather than the browser walk: moving the clock past the task, and a second organization's isolation.
- `npm audit` reports 6 high advisories, all in development tools (wrangler, miniflare, undici). Runtime dependencies have none.
- `@cloudflare/vitest-pool-workers` is deprecated in favor of `@cloudflare/vitest-plugin`. The old name still works with vitest 4.
- No machine trace was available, and the `closedtab` CLI isn't installed, so `closedtab check` wasn't run and nothing was reconciled.

## 5. Consequence: what it cost or risked
**Observed:** All of these pass: `npm run check` (both type checks, 31 tests, build) and `node e2e/smoke.mjs` against `wrangler dev`.
**Risk:**
- The sign-in code is the app's own. It needs the same review a managed service would have had.
- Rate limits live in D1 with a fixed window. That's fine for a pilot, but not for open signups.
- The AT Protocol session cache lives in memory per Worker instance, so busy organizations may sign in to Bluesky more often than needed.

## 6. Change: what happens next
1. The owner reviews decision 0008 and picks the record domain.
2. Set up Cloudflare, Resend and secrets, deploy a preview, and run `e2e/smoke.mjs` against it.
3. Test with one real organization before inviting the others.
4. Next run: test AT Protocol OAuth on Workers, and move to `@cloudflare/vitest-plugin`.
