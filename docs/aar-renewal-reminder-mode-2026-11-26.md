# Agent Action Record: Renewal reminders, automatic or manual

**Review date:** 2026-11-26
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** A choice between automatic and manual renewal reminders
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "It can autosend updates or hage the person be able to do it manuually"
**Success defined in advance as:** Not defined in advance. The agent took it as: each organization picks automatic or manual, and a coordinator can send reminders to a group from Reports.
**Authority granted to the agent:** Build it on `claude/volley-launch-strategy-aktbyn`, pull request #32.
**Out of scope:** Other email types.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. `migrations/0011_renewal_mode.sql`: `renewal_mode`, automatic by default.
2. The cron run sends only for organizations set to automatic, that are approved, aren't samples, and only when email is set up.
3. A shared `remindRenewals` in `src/worker/mail.ts` sends the reminder and marks people reminded. A new route sends to a Reports group, skipping people already reminded for their current expiry date unless asked to send again.
4. Settings: "Renewal reminders", Send automatically or Send from Reports. Reports: a Reminded column, and a "Send N reminders" button that asks first and reports how many went out.
5. A browser check found that people were marked reminded even when email was off. Fixed: only people whose email went out are marked.
6. Tests: 60 pass, including manual mode, sending from Reports, and marking only on success.

**What it produced or changed:** `migrations/0011_renewal_mode.sql`, `src/worker/mail.ts`, `src/worker/routes/reports.ts`, `src/worker/routes/org.ts`, `src/worker/db.ts`, `src/web/pages/Reports.tsx`, `Settings.tsx`, `OrgShell.tsx`, `test/membership.test.ts`, the spec, decision 0015, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- Automatic as the default.
- Skipping people already reminded, with a way to send again that the screen doesn't offer yet.
- The labels "Send automatically" and "Send from Reports".

**Of those, which should a human have made or seen:** The default.
**Where a human actually intervened:** None during the build.
**Points where it should have escalated and didn't:** None found.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):** The first version marked people reminded before knowing whether the email went out. The browser check caught it.
**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** The first version, as above.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** Tests and browser checks pass.
**Harm / cost / risk, realized or narrowly avoided:** Without the fix, a coordinator could believe members were reminded when no email went out. In automatic mode, a failed send is retried on the next run.
**Downstream affected parties:** Members due to renew.
**Expected failure if this run happened 100 times:** Some runs would ship the marking bug without a browser check.

## 6. Change: what happens next
**Specific changes before next run:** Decide whether the screen needs a "Send again" choice.
**Keep doing:** Running the real flow in a browser, not only tests.
**Should not be delegated to an agent at all:** The wording of reminders an organization sends to its members.
**Signal that the change worked:** A manual organization sends its month's reminders from Reports, and the Reminded column matches what went out.

No machine trace of this run was available for reconciliation.
