# Agent Action Record: The tool emails asks, confirmations, reminders and notes

**Review date:** 2026-11-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** Building email into the tool, from decision 0012
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "The only thiny missing right now is orgs have to be able to enail people inside the tool"
**Success defined in advance as:** Not defined in advance. The agent used the four emails in [decision 0012](decisions/0012-free-launch-and-email.md): the ask with its private link, a confirmation and a reminder, accept or decline through the link, and a note to coordinators when a task isn't full.
**Authority granted to the agent:** Build it on `claude/volley-launch-strategy-aktbyn`.
**Out of scope:** Deploying, setting secrets, a sending domain, the product name, text messages and newsletters.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Read the ask engine, the link route, sign-in email and the tests.
2. Added `migrations/0006_email.sql`: an `emails` table that records each email without its text, an `ask_links` table for extra private links, and columns so reminders and notes go out once.
3. Wrote `src/worker/mail.ts`. It sends through Resend's batch endpoint, 100 emails a request, from the organization's name, with replies going to the coordinator. It stops at 300 emails per organization per day and never sends for sample organizations.
4. `createAsks` now emails everyone with an address, and each ask says whether it was emailed. `answerAsk` sends a confirmation after a yes; a failed send doesn't undo the yes. The cron sweep sends reminders 24 hours before and notes 48 hours before. The sweep a coordinator's screen runs sends nothing.
5. The link route accepts the extra links. A new link for an ask removes them. Deleting a task, a volunteer or an organization deletes their email rows and extra links.
6. The ask dialog marks people who were emailed, lists the people to copy for first, and shows "Copy all" only when more than one link needs copying.
7. Added `test/email.test.ts` with 9 tests. It uses a stand-in for Resend because the test server has no key.
8. Rewrote the spec's "Sending asks" section and updated the README and 0012.
9. Ran `npm run check`: type checks, both builds and 43 tests pass. Checked the ask dialog in Chromium at phone width with no page errors. Ran `npm run check:docs`; see section 4.

**What it produced or changed:** `migrations/0006_email.sql`, `src/worker/mail.ts`, `src/worker/engine.ts`, `src/worker/routes/volunteer.ts`, `tasks.ts`, `people.ts`, `org.ts`, `src/web/pages/TaskDetail.tsx`, `test/email.test.ts`, `docs/SPEC.md`, `README.md`, `docs/decisions/0012-free-launch-and-email.md`, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- Plain text emails, no HTML.
- The wording of all four emails.
- The 300 a day limit, the 24 hour reminder and the 48 hour note, and sending the note to the task's author or else the admins.
- Asks go out by email automatically when an address exists, with no switch for the coordinator.
- Reminders only for work at a set time, not work due by a date.
- No reminder for people who accepted within the last day.
- The new link from "make a new link" is not emailed.

**Of those, which should a human have made or seen:** The email wording, the automatic sending and the limit.
**Where a human actually intervened:** None during the build.
**Points where it should have escalated and didn't:** None found.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):**
- `e2e/smoke.mjs` fails before reaching asks. It expects to create an organization right after sign-in, but since the October 30 demo work a new user is sent to the sample picker. The agent did not fix the script.
- `npm run check:docs` fails on long sentences in `src/web/pages/Guide.tsx`, as it did before this change.
- The spec is about 2,700 words, past its 2,500 limit. It was 2,537 before.

**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** None known. Sending to the real provider has not been tried.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** Tests pass. No email has gone to a real inbox.
**Harm / cost / risk, realized or narrowly avoided:**
- In production a new user lands on the sample picker with no way to make an organization, unless they know `/start?choose=1`. Sample organizations may also be off in production. This blocks self-service sign-up and is not fixed.
- Plain text from a shared address with no sending domain may land in spam.

**Downstream affected parties:** Volunteers who get the emails, and coordinators who get replies.
**Expected failure if this run happened 100 times:** Some runs would let the screen's sweep send email and slow the coordinator's screens.

## 6. Change: what happens next
**Specific changes before next run:** Fix the start page for new users. Send real email from a verified domain once the name is chosen. Update `e2e/smoke.mjs`.
**Keep doing:** Never storing email text, and keeping sample organizations from sending.
**Should not be delegated to an agent at all:** The sending domain, and the final email wording.
**Signal that the change worked:** A coordinator asks people and nobody copies a link.

No machine trace of this run was available for reconciliation.
