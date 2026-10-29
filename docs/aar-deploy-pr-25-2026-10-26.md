# Agent Action Record: Deploy the demo after pull request 25 merged

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Redeploying after the deletes and the Volly work landed
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "it's pushed", after the owner merged pull request 25.
**Success defined in advance as:** The demo serves `main`, including the change CI forced and the demo had not yet had.
**Authority granted to the agent:** Deploy.
**Out of scope:** New work, merging anything, product decisions.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Fetched `main` and confirmed pull request 25 merged as `893a710`.
2. Fast forwarded the working branch to it. No conflict: the branch was its source.
3. Checked for pending migrations. None. The deletes added routes, not schema.
4. Ran `npm run check` (34 tests, type checks, build) and `npm run check:docs`. Both passed. The agent is running the docs check again after CI caught screen copy rules it had been skipping.
5. Deployed. Version `aa249139-b50b-4ec8-bcd4-a85bd313c5d3`.
6. Checked the deployed bundle rather than trusting the deploy: fetched the built JavaScript and searched it. The removed confirmation copy is absent and the delete organization control is present. The page returns 200.
**What it produced or changed:** This record, and the demo worker's new version.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** Merge pull request 25. Redeploy.
**Decisions the agent made alone, for owner review:**
- Running `npm run check:docs` again, against the owner's earlier standing instruction not to. CI runs it, and skipping it is what let the delete confirmation copy through. The agent is treating the owner's "copy lint yes" as covering this, and still not writing or running new tests.
- Searching the deployed bundle for the changed strings instead of reporting the deploy as done. The demo had been serving a version built before the copy fix, so this was the one thing worth proving.
**Left to the owner:** The two things the pull request body flags for a reviewer: that deleting a task now erases attendance, against decision 0002, and that the OpenGraph addresses are hardcoded to the demo.

## 4. Deviation: the gaps
- No screen was opened in this run. The check was the bundle contents and a status code.
- The deletes have still not been clicked through end to end in a browser, and still only exercised as an admin.
- A private link to a deleted task is still unchecked.
- No machine trace was available. This record has not been reconciled with `closedtab reconcile`.

## 5. Consequence: what it cost or risked
**Observed:** The demo serves `main`. The delete controls and the confirmation copy CI asked for are both live.
**Risk:** Unchanged from the last run. `DEV_MODE = "1"` means anyone with the link signs in as any address, and the deletes are irreversible, so a visitor who signs in as an admin can empty an organization. The owner's plan to gate access is what stands between those two facts.

## 6. Change: what happens next
1. Settle whether a completed task keeps its attendance record.
2. Gate access before the link goes to an outside organization.
3. Change the OpenGraph addresses when a domain exists, then rerun `node scripts/make-og.mjs` if the name changed.
