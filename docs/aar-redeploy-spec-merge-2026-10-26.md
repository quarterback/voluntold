# Agent Action Record: Redeploy the demo after the spec pull request landed

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Redeploying the demo after pull request 5 merged
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "deploy again with the cloudflare demo the newest pr just landed".
**Success defined in advance as:** The demo address serves what is now on `main`.
**Authority granted to the agent:** Deploy to the owner's Cloudflare account.
**Out of scope:** Merging anything, product decisions, and a production deploy.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Fetched `main` and found pull request 5 ("Next version spec and decision 0011") merged as `f113b03`, which the owner merged themselves.
2. Listed what the merge changed: nine files, all under `docs/` and `samples/`. Checked `src/`, `migrations/`, `test/`, `e2e/`, `package.json`, `package-lock.json`, `wrangler.toml`, `index.html` and `vite.config.ts` for changes and found none. Nothing in the merge reaches the deployed bundle, because the worker ships `src/` and the built `dist/`, not `docs/` or `samples/`.
3. Told the owner this before deploying, so the deploy would not be read as putting something new on the demo.
4. Merged `origin/main` into the working branch. Confirmed the demo database had no migrations to apply.
5. Ran `npm run check`: 34 tests, type checks and build passed.
6. Deployed. Version `a20ff916-0821-4ec8-8d8f-3113a8ab3d82`.
7. Checked the live deploy: the page returns 200; a sign-in code came back on screen; the session opened; a fresh sample organization was built; `GET /today`, `GET /needs` and `GET /tags` all return 200.
8. Wrote this record.
**What it produced or changed:** This record, and the demo worker's new version. No change a visitor can see.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** Merge pull request 5; redeploy the demo.
**Decisions the agent made alone, for owner review:**
- Deploying even though nothing in the merge reaches the bundle. The instruction asked for it, the cost is seconds, and it removes any doubt that the live bundle matches `main` after three earlier deploys built from working branches. The alternative, reporting "nothing to deploy" and stopping, would have left that unproven.
- Saying plainly that the merge was documentation and samples only, rather than reporting a deploy as though the demo gained something.
- Created a fourth sample organization during the check, rather than reusing one or emptying the database.
**Left to the owner:** Whether to empty the demo database; whether the action records on this branch reach `main`; the leading `/` still on the `CLOUDFLARE_ACCOUNT_ID` secret.

## 4. Deviation: the gaps
- The check was five API calls returning status codes. No response body was read this time, and no screen was opened.
- `e2e/smoke.mjs` has still not been run against the demo in any run.
- The tags screens, the model path that applies tags, and the activation screens remain unexercised through the interface.
- The demo database now holds four sample organizations, the oldest two predating migrations `0002` and `0003`.
- No machine trace was available. This record has not been reconciled with `closedtab reconcile`.

## 5. Consequence: what it cost or risked
**Observed:** The live bundle is now known to match `main`. Nothing a visitor sees changed.
**Risk:** `DEV_MODE = "1"` still means anyone with the link can sign in as any email address and act as an admin, and can move the test clock. Demo data only.
**Also:** Four sample organizations now sit in the demo. Two of them predate the current schema, so a visitor who opens one will see screens with fields missing. This has been raised in three records and not acted on.

## 6. Change: what happens next
1. Empty the demo database, then press "Try it with sample data" once. The agent has not done this because it destroys data it was not asked to destroy, and the owner has not answered twice.
2. Open the demo on a phone and look at the tags and activation screens, which no run has checked through the interface.
3. Fix the `CLOUDFLARE_ACCOUNT_ID` secret.
4. Decide whether this branch, which carries four action records and the Today list test fix, is merged or abandoned. The test fix is already on `main` by another route.
