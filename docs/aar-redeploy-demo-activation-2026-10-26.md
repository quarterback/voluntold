# Agent Action Record: Redeploy the demo on the activation build

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Putting the merged activation work onto the shareable demo
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "push the cloudflare after the latest PR just shipped".
**Success defined in advance as:** The demo address serves the code now on `main`, including pull request 4, with its database schema brought up to date.
**Authority granted to the agent:** Deploy to the owner's Cloudflare account with the token in the environment. Develop on `claude/fervent-shannon-i8eyrt`.
**Out of scope:** Product decisions, new features, a production deploy, and opening a pull request.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Fetched `main` and found the earlier demo commit already merged, with pull request 4 ("Build the activation demo: needs, first offers, availability") on top. Fast forwarded the branch to `main`, so the branch holds no work of its own beyond what follows.
2. Read the diff since the last deploy: 31 files, a new `migrations/0002_activation.sql`, new `needs` routes and screens, and a rewritten `src/worker/sample.ts`.
3. Read `0002_activation.sql` before applying it. Every statement adds a column or a table. Nothing drops or rewrites existing data.
4. Ran `npm run check`. One test failed: `test/api.test.ts:221` expected a Today item field `openSpots`. Read `src/worker/routes/tasks.ts` and `src/web/pages/Today.tsx` and found pull request 4 had replaced that field with `holding` and `peopleNeeded`, which the screen reads as "1 of 2". The API and the screen agree with each other, so the test assertion was the stale part, not the behavior.
5. Deployed anyway rather than stopping, because the failure was a test reading a field the product no longer returns.
6. Applied `0002_activation.sql` to the demo database, built, and deployed. Version `98bb6992-b28c-48a3-b2a9-6e0c8ed9166e`.
7. Checked the live deploy: the page returns 200; a sign-in code came back on screen; `POST /api/dev/sample` built a fresh sample organization (id `gcvz6xgjeqjk`, "Sample: Eastside Pantry"); `GET /today` returns a `first_offers` item; `GET /needs` returns the "Fall food drive" need with its counts.
8. Changed the assertion on `test/api.test.ts:221` to the fields the API now returns. `npm run check` then passed: 34 tests in 3 files, type checks and build clean.
9. Wrote this record.
**What it produced or changed:** `test/api.test.ts` (one line), this record. In the owner's Cloudflare account: the demo worker's new version, and the demo database with the activation schema.
**Where actual behavior differed from the instruction:** The instruction asked only for a deploy. The agent also edited a test, which it had not been asked to do. See section 3.
**Stayed within granted authority?** Yes for the deploy. The test edit was the agent's own decision.

## 3. Judgment: human in the loop
**Decisions the owner made:** Redeploy the demo on the merged work.
**Decisions the agent made alone, for owner review:**
- Deploying with a failing test rather than stopping to ask. The agent had read the three files and judged the failure to be the test, not the product.
- Editing the assertion to match the shipped field names, instead of leaving it red or deleting it. Changing a test so it passes can hide a real fault, so the agent checked the worker route and the screen against each other first. A reviewer who disagrees should look at `src/worker/routes/tasks.ts` around the Today list and decide whether `holding` and `peopleNeeded` are the fields that belong there.
- Creating a second sample organization instead of emptying the database. The organization made during yesterday's check predates `0002_activation.sql`, so its volunteers have no tier, no hours and no availability. The new screens may read oddly for it.
- Leaving the earlier demo sign-in (`demo@example.com`) and its organization in place.
**Left to the owner:** Whether to empty the demo database so only current sample data is in it; whether the test change is right; the still unfixed leading `/` in the `CLOUDFLARE_ACCOUNT_ID` secret; whether this branch is merged.

## 4. Deviation: the gaps
- `e2e/smoke.mjs` was not run against the deploy, here or in the earlier run. The check was six API calls, not the pilot walk through in a browser.
- No screen was opened. The new needs, offers and availability screens were confirmed only through the data their routes return.
- `GET /api/orgs/<id>/people` returned 404 during the check. The agent took this as the route having another name rather than a fault, and did not confirm which.
- The demo was reached through this session's HTTPS proxy, not a phone on a normal network.
- No machine trace was available. This record has not been reconciled with `closedtab reconcile`.

## 5. Consequence: what it cost or risked
**Observed:** The demo address now serves the activation build. The schema is current. `npm run check` passes on the branch, where it failed on `main`.
**Risk:** `DEV_MODE = "1"` still means anyone with the link can sign in as any email address and act as an admin, and can move the test clock. Demo data only. Any real volunteer detail put in should be treated as published.
**Also:** The demo database now holds two sample organizations, one built before the activation schema. A visitor may open the older one and judge the product on screens filled with missing fields.

## 6. Change: what happens next
1. The owner, or a reviewer, checks the one line changed in `test/api.test.ts` against the Today list in `src/worker/routes/tasks.ts`.
2. If `main` should be green, that one line needs to reach it. This branch carries it.
3. The owner opens the demo on a phone and says whether the activation screens show what they want to show.
4. Worth doing before the next demo: empty the demo database, then press "Try it with sample data" once, so only current sample data is in it.
5. Fix the `CLOUDFLARE_ACCOUNT_ID` secret, which still carries the leading `/`.
