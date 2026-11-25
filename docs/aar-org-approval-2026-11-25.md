# Agent Action Record: Approving new organizations

**Review date:** 2026-11-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** An approval step for new organizations, from decision 0013
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "I think imf want to approve orgs rather than just let anyone sign up this way, this way, there is an abuse of the tool or at least I can curtail it. Eventually, there'll be an automated process, but now I think we could just have it set up in a way that unless we see who's using it not a huge issue". The same message asked whether "membership management" is a better term than volunteer activation.
**Success defined in advance as:** Not defined in advance. The agent took it as: the owner sees every new organization and decides before it can send email.
**Authority granted to the agent:** Build it on `claude/volley-launch-strategy-aktbyn`.
**Out of scope:** An automated check, the product's category and the home page.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Told the owner how it would work before building, and offered a full lockout instead.
2. Added `migrations/0007_org_approval.sql`: `approved_at` and `email_daily_limit` on organizations. Organizations that already exist count as approved.
3. `deliver` in `src/worker/mail.ts` sends nothing for an organization that isn't approved, and uses its own daily limit.
4. Added `src/worker/routes/admin.ts`. Admins are the addresses in `ADMIN_EMAILS`. They get an email when an organization signs up, and can list organizations, approve, take an approval back and set the daily limit. Everyone else gets "Not found".
5. Added the `/admin` page and a link to it on the start page for admins. Unapproved organizations show "Pending approval: email is off".
6. Added 2 tests, and approved the organizations in the email tests that expect sending. 46 tests pass.
7. Walked it in Chromium at phone width: sign up, see the notice, approve as admin, notice gone. No page errors. Fixed a button that kept its old look after approving, and "1 tasks".
8. Wrote decision 0013 and updated the spec and README.

**What it produced or changed:** `migrations/0007_org_approval.sql`, `src/worker/routes/admin.ts`, `src/worker/mail.ts`, `src/worker/db.ts`, `src/worker/env.ts`, `src/worker/index.ts`, `src/worker/routes/org.ts`, `wrangler.toml`, `vitest.config.ts`, `src/web/App.tsx`, `src/web/pages/Admin.tsx`, `OrgShell.tsx`, `Start.tsx`, `test/email.test.ts`, `docs/decisions/0013-approve-new-organizations.md`, `docs/SPEC.md`, `README.md`, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- Gating email only, not the whole tool.
- Admins set by an environment variable, not a screen.
- A per-organization daily limit, editable by admins.
- Counting existing organizations as approved.
- The wording "Pending approval: email is off".

**Of those, which should a human have made or seen:** Gating email only. The agent said so before building.
**Where a human actually intervened:** None during the build.
**Points where it should have escalated and didn't:** None found.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):** None.
**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** None known.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** Tests and the browser walk-through pass.
**Harm / cost / risk, realized or narrowly avoided:** If `ADMIN_EMAILS` isn't set in production, nobody can approve, and no organization can send email. Sign-up email to admins needs email to be set up.
**Downstream affected parties:** New organizations waiting for approval.
**Expected failure if this run happened 100 times:** Some runs would lock out new organizations entirely, which the owner didn't ask for.

## 6. Change: what happens next
**Specific changes before next run:** Set `ADMIN_EMAILS` before launch. Decide whether pending organizations should be locked out entirely.
**Keep doing:** Saying how a gate works before building it.
**Should not be delegated to an agent at all:** Which organizations get approved.
**Signal that the change worked:** The owner approves each launch-day sign-up from `/admin`.

No machine trace of this run was available for reconciliation.
