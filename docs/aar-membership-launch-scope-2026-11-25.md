# Agent Action Record: Membership management for the launch

**Review date:** 2026-11-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** Building the membership launch scope, from decision 0014
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** The owner pasted a plan that set a membership launch scope, then said: "Intold the atent i wanted member mgt expasnion bc its a fit for what the tool does and broadens it so thats why i shifted i moved he agent towards what i wanted". Mid-run the owner described the audience: "organizations that are small organizations that are new organizations that are looking for a way to get off of really expensive tooling", and approved four follow-ups with "Go stead ahead yes".
**Success defined in advance as:** The pasted scope: directory, custom fields, import and export, categories and statuses, groups, skills, assignments, targeted email, participation history, renewal reminders and public applications. Dues collection, newsletters, integrations and model automation later.
**Authority granted to the agent:** Build it on `claude/volley-launch-strategy-aktbyn`.
**Out of scope:** Payments, the product name, the domain and deploying.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Pointed out that the pasted plan argued two positions (primary database, and add-on to an existing one). The owner settled it: primary database, for small organizations.
2. Mapped the scope to the code. Directory, custom fields, import and export, groups (teams), skills (fields and requirements), assignments and participation history already existed.
3. `migrations/0008_membership.sql`: membership category, member since, expiry and dues paid on each person; the organization's word for its people, categories, renewal days, renewal link and application switch; `applications` and `messages` tables; and a rebuilt `emails` table that allows renewal and message emails.
4. Server: membership on create, update, import (with re-import updating dates) and export; renewal reminders in the cron run; signed unsubscribe links at `/u/`; the application page at `/join/`; accept and decline; and email to a chosen group in `src/worker/routes/membership.ts`.
5. Screens: a Membership section on each person, Current, Expiring and Expired filters, a category filter, Applications on the People screen, an Email button for the people shown, a Membership section in Settings, and the organization's word on screens. Renamed the settings section for people who run the tool from "Members" to "Coordinators".
6. After the audience note: sign-up questions (`migrations/0009_access_request.sql`) shown to admins; import wording for "your old system's export" and column names from membership exports; the home page rewritten for small organizations; page metadata; and draft Product Hunt copy in `docs/launch/product-hunt.md`.
7. Committed and pushed partway, when a hook asked for uncommitted work to be pushed, after the tests passed.
8. Tests: 52 pass, including 6 new ones for membership, renewals, unsubscribe, applications, group email and sign-up questions. Walked sign-up, settings, a person's membership, approval, the application page and accepting an applicant in Chromium at phone width with no page errors.
9. Wrote decision 0014 and updated the spec and README.

**What it produced or changed:** `migrations/0008_membership.sql`, `migrations/0009_access_request.sql`, `src/shared/membership.ts`, `src/worker/routes/membership.ts`, changes across `src/worker` and `src/web/pages`, `index.html`, `test/membership.test.ts`, `test/email.test.ts`, `test/helpers.ts`, `test/rules.test.ts`, `docs/decisions/0014-membership-management.md`, `docs/launch/product-hunt.md`, `docs/SPEC.md`, `README.md`, this record.
**Where actual behavior differed from the instruction:** The owner stopped one tool call to explain the audience. The agent resumed after the owner said to go ahead.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- Membership state comes from the expiry date instead of a status someone sets.
- Group email goes to whoever is shown on the People screen after filtering, instead of a separate audience builder.
- Unsubscribe links are signed, not stored.
- The home page headline "Run your membership. Rally your people." comes from the owner's pasted plan. It replaces "Volunteers activated".
- The Product Hunt first comment speaks in the owner's voice, including a line about the owner's background that the owner must confirm.
- The 18 or older confirmations at sign-up and on the application page.

**Of those, which should a human have made or seen:** The headline, the Product Hunt comment, and group email reversing 0012's line against bulk email.
**Where a human actually intervened:** The owner corrected the audience mid-run.
**Points where it should have escalated and didn't:** None found.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):**
- Application and unsubscribe pages show in the browser demo, but submitting them there fails, because the demo has no server.
- The People list rows don't show a person's category or expiry; only the filters and the person's page do.
- The home page screenshots still show volunteer screens.

**Good deviations (correct departures from a flawed instruction):** Not naming competitors on the home page, since the audience mostly has no tool to compare.
**Confidently wrong:** None known.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** Tests and the browser walk pass. Nothing is deployed, and no real email has been sent.
**Harm / cost / risk, realized or narrowly avoided:** Group email is the largest abuse risk in the product. Approval, the daily limit, consent and unsubscribe are the controls. Migration 0008 rebuilds the `emails` table; it is safe on a new database and copies existing rows.
**Downstream affected parties:** Members of organizations that use renewals and group email.
**Expected failure if this run happened 100 times:** Some runs would build payment processing or a separate audience builder, which the scope left out.

## 6. Change: what happens next
**Specific changes before next run:** Retake the home page screenshots with membership screens. Confirm the Product Hunt first comment. Rename everything once the name is chosen.
**Keep doing:** Mapping a pasted plan to the code before building, and asking when a plan argues two ways.
**Should not be delegated to an agent at all:** Which organizations get approved, and the public voice of the launch posts.
**Signal that the change worked:** A small organization imports its roster, sets renewals and accepts an applicant on launch day without help.

No machine trace of this run was available for reconciliation.
