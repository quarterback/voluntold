# Agent Action Record: Next version spec, decision 0011 and issues

**Review date:** 2026-10-25
**Reviewed by:** agent self review
**Agent / system:** Claude, in a Claude app session with this repository attached
**Task or period under review:** Writing the next version spec and issues from the owner's October 25 design direction
**Accountable human (name or role):** Repository owner (the founder)

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "write a spec/PRD/task/issues for the repo and update what's been done by closing what's necessary and then give me a spec i can have an agnt work on"
**Success defined in advance as:** a spec an agent can build from, issues for the work, and the issue tracker showing what's already done.
**Authority granted to the agent:** write docs, open a pull request, create and close issues on `quarterback/voluntold`.
**Out of scope:** application code, test runs (the owner's standing instruction), deploying.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Read the repo on main after PR #4, decision 0010, `LATER.md` and the pilot spec.
2. Wrote decision 0011 from the owner's October 25 statements, marking owner decisions and agent proposals separately.
3. Wrote `docs/specs/next-version.md` with 11 sections, rules for every screen, open questions and a build order.
4. Linked it from `SPEC.md`, marked 0005 and 0009 as changed by 0011, and moved "Notes into tasks", email and the desktop app in `LATER.md`.
5. Added `samples/meeting-notes.txt` for the notes feature.
6. Opened issues for the build order and closed issues recording the work already merged.

**What it produced or changed:** `docs/decisions/0011-product-model-and-direction.md`, `docs/specs/next-version.md`, `docs/SPEC.md`, `docs/LATER.md`, `docs/decisions/0005-email-first-then-text-then-slack.md`, `docs/decisions/0009-saas-look-and-adobe-content.md`, `samples/meeting-notes.txt`, `samples/README.md`, this record, and GitHub issues.
**Where actual behavior differed from the instruction:** The repo had no issues to close. The agent created closed issues for merged work so the tracker shows it.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- The three rules for handing out work, and Raise your hand as the proposed default.
- The Assign screen, coverage strip and scope line, marked proposed.
- Keeping existing components and replacing only the theme, marked proposed.
- Tags applied without approval but easy to change, and new tags created only when nothing fits.
- Ticket color thresholds of 2 and 7 days.
- Keeping the copied link for first contact until the owner decides.

**Of those, which should a human have made or seen:** all of them. They are listed in the spec's open questions or marked proposed.
**Where a human actually intervened:** the owner set the model, the no conversations rule, notifications, scanability and tags in chat.
**Points where it should have escalated and didn't:** none known.
**Accountable for these actions:** the repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):** `npm run check` and `npm run check:docs` were not run, per the owner's instruction.
**Good deviations:** none.
**Confidently wrong:** none known.

## 5. Consequence: what it cost or risked
**Actual outcome:** docs only. No code changed.
**Harm / cost / risk:** a builder could treat proposed items as decided. Each one is labeled.
**Downstream affected parties:** the next coding agent.
**Expected failure if this run happened 100 times:** proposed items built before review.

## 6. Change: what happens next
**Specific changes before next run:** the owner answers the four open questions and reviews the proposed items.
**Keep doing:** marking owner decisions and agent proposals separately.
**Should not be delegated to an agent at all:** the first contact choice and the default rule for handing out work.
**Signal that the change worked:** the build order runs without the owner having to correct a proposed item after it's built.
