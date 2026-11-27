# Agent Action Record: One helper from sign-up through setup

**Review date:** 2026-11-27
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** Reshaping sign-up and the setup guide after the owner reviewed the first version
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "Volunteer import shoild happen after an account gets created or else people are going to banadon theee accounts before they start out of overwhelm or confusion; the navigator mascot bot shoild help them with this idk

Account creation gets the same helper to guide you simply tjrough org naming, contact info, other detailsthen verify and create. Designate admins and then after account is verified then begin the process of account migration or other details that need to populate it again using a demo mode style navigator to helpnuser know what thwy eanna do

But the information density and cognitive load you researched should make it much simplier for a hser to navigate"
**Success defined in advance as:** Not defined in advance. The agent took it as: sign-up in the order given, one thing on screen at a time; admins before import; a guide in the demo guide's style that stays with the person; less on each screen than the first version.
**Authority granted to the agent:** Change the app and docs on `claude/quirky-curie-6rpe1u` and push there.
**Out of scope:** Deploying. A pull request. Final brand art. A chatbot.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Wrote `src/web/pages/Signup.tsx`: name, contact, details, then the emailed code. The account and organization are created at the last step. Pointed "Request free access" and the start page at it.
2. Rewrote `src/web/pages/SetupGuide.tsx` as a panel in the demo guide's place, shown on every screen of the organization. It shows one step, changes its line when the person is on that step's screen, and shrinks to a strip on a phone there.
3. Reordered the steps in `src/shared/setup.ts`: admins, people, fields, task, ask. "Check what you track" now finishes when the person chooses Done, not when the page opens.
4. Drew a placeholder mascot in `src/web/Mascot.tsx`.
5. Removed the checklist card from Today and the guide link from the desktop menu.
6. Walked the whole path in a browser at phone and desktop sizes, 19 checks each, and read the screenshots. Shortened the guide on the import screen after seeing it cover a fifth of the phone.
7. Updated `e2e/smoke.mjs`, `test/setup.test.ts`, the setup guide spec, decision 0017 and the spec.

**What it produced or changed:** `Signup.tsx` and `Mascot.tsx` (new), `SetupGuide.tsx`, `Start.tsx`, `Home.tsx`, `App.tsx`, `OrgShell.tsx`, `Today.tsx`, `Settings.tsx`, `src/shared/setup.ts`, `test/setup.test.ts`, `e2e/smoke.mjs`, `docs/specs/setup-guide.md`, `docs/decisions/0017-setup-guide-and-import.md`, `docs/SPEC.md`, `README.md`, this record. One commit pushed. Nothing deployed.
**Where actual behavior differed from the instruction:** The owner listed "other details" in sign-up. The agent removed one optional question there, "what you'll use it for". The owner said "mascot bot". The agent built scripted help with a face, not a bot that answers questions.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- Reading "after account is verified" as the emailed code, not the organization's approval.
- Creating the account and the organization together at the last sign-up step.
- Dropping "what you'll use it for" from sign-up.
- Which screens show which line in the guide, and every line's wording.
- The mascot's drawing. It is new brand art.
- Not giving the mascot a name or a voice. The lines don't say "I".
- That closing the guide shrinks it to a button and never removes it until setup is finished.
- That Bluesky posting waits for setup to finish. Before this run, hiding the guide was enough.

**Of those, which should a human have made or seen:** The mascot, because it is brand art. The reading of "verified". The dropped sign-up question, because approvers used it.
**Where a human actually intervened:** The owner reviewed the first version and redirected it. That instruction started this run.
**Points where it should have escalated and didn't:** The agent could have asked what "verified" meant before building. It chose the reading that doesn't stall a new organization, and recorded it.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):**
- Nobody outside this session has used it. Every check was the agent driving a browser.
- The guide reloads the organization on every screen change while setup is unfinished. That is four requests per move, and was not measured on a slow connection.
- On a phone the guide's sheet covers the bottom of the page. The page gets extra room to scroll clear, which was checked on five screens, not all of them.
- The demo guide's text still describes the old Settings in places.
- The browser demo build compiles. Its screens were not opened.
- `npm run check:docs` still exits with an error on the demo guide's long paragraphs, as it did before both runs.
- No machine trace was available. This record has not been reconciled with `closedtab reconcile`.

**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** The first version, earlier the same day, put a six-row checklist on Today and asked for the email code before anything else. The owner corrected both.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** `npm run check` passes with 80 tests. `node e2e/smoke.mjs` passes. The walk from the home page to "Setup is done" passes at phone and desktop sizes.
**Harm, cost or risk, realized or narrowly avoided:** A person who abandons sign-up now leaves no account behind, because nothing is created before the code is checked.
**Downstream affected parties:** Organizations that already signed up see the guide on every screen until they finish or put it away. Approvers no longer get "what you'll use it for".
**Expected failure if this run happened 100 times:** The reading of "verified" is the likeliest miss. If the owner meant approval, the people step has to wait for it.

## 6. Change: what happens next
**Specific changes before next run:**
1. The owner says whether "verified" meant the emailed code or approval.
2. The owner approves, replaces or drops the mascot.
3. The owner says whether approvers need "what you'll use it for" back.
4. Run migration 0012 on production before deploying.
5. Watch one real coordinator go from the home page to a sent ask.

**Keep doing:** Walking the path in a browser and reading the screenshots before calling a flow simple.
**Should not be delegated to an agent at all:** Final brand art.
**Signal that the change worked:** A new person reaches "Setup is done" without asking the owner what a screen means.
