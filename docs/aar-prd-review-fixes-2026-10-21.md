# Agent Action Record: Fix the review findings in the planning docs

**Review date:** 2026-10-21
**Reviewed by:** agent self-review
**Agent / system:** Claude Code (cloud session)
**Task or period under review:** Correcting the problems found in the vloora PR #105 review, now that the docs live in this repository
**Accountable human (name or role):** Repository owner

## 1. Intent — what was supposed to happen
**Instruction given (actual wording):** "Then do it", answering the agent's offer to fix the PRD problems in voluntold and open a PR to `main`.
**Success defined in advance as:** The findings listed in `docs/aar-move-planning-docs-2026-10-21.md` section 4 are fixed, and a pull request to `main` carries the planning docs.
**Authority granted to the agent:** Edit the planning docs, push `claude/github-pr-review-lvzw1m` and open a pull request. Merging stays with the owner.
**Out of scope:** New features, the product name, application code, and anything in `quarterback/vloora`.

## 2. Action — what actually happened
**What the agent did (step by step):**
1. Replaced the two conflicting state models with one. `docs/MOBILIZATION-PRD.md` now has tables for opportunity, offer and contribution states, with allowed next states and who may make each move. Contributions gained `blocked` and `withdrawn`, and `canceled` when the opportunity is called off. `reopened` became a transition (organizer sends submitted work back to `in_progress`). The offer state `withdrawn` became `retracted`, so "withdrawn" means only a volunteer stepping back. Spelling is `canceled` throughout.
2. Added a Terms section to `docs/PRODUCT-PRD.md` that makes "contribution" the name of the record, and renamed the `commitments` table to `contributions` in `docs/ARCHITECTURE.md`, with `offer_id`, `withdrawn_at` and a blocker note. Replaced "commitment" and "assignment" where they named the record. Where "commitment" meant an amount of time, it now says time.
3. Changed the coverage example's need from 7 a.m. to 5 p.m. to 10 a.m. to 2 p.m., so the two desk slots cover it.
4. Made the token-to-cookie exchange a launch requirement in `docs/ARCHITECTURE.md`, with redirect, cookie flags, `Referrer-Policy`, log redaction and revocation ending sessions. The volunteer API now takes the scoped session.
5. Said how open-interest responses create records: always a new volunteer record, never attached by email, with manual merging by an organizer inside one organization. `docs/ACTIVATION-PRD.md` now defines when an existing record may be reused.
6. Made a no-training, no-retention model provider a requirement, recorded in an ADR before real volunteer text is sent.
7. Added matching acceptance items to `docs/AGENT-HANDOFF.md` and `docs/MOBILIZATION-PRD.md`, and blocker and withdrawal work to the build sequence in `docs/SHIP-TODAY.md`.
8. Re-read the state section and fixed a contradiction the first draft introduced: it said only the volunteer could move a contribution to `in_progress`, while the table let either side clear a blocker.
9. Ran `grep` for "commitment", "assign", "cancell", "reopened" and "token required" to find leftovers. The remaining "commitment" is the Terms entry naming what not to use.
**What it produced or changed:** `README.md`, the six planning documents in `docs/`, and this record.
**Where actual behavior differed from the instruction:** None known.
**Stayed within granted authority?** Yes.

## 3. Judgment — human in the loop
**Decisions the agent made alone, for owner review:**
- The state names `blocked`, `withdrawn`, `retracted` and `canceled`, and that a contribution may skip `in_progress`.
- That a blocked contribution keeps its slot, so a blocker does not invite a second volunteer.
- Shortening the example event to 10 a.m. to 2 p.m. rather than adding more desk slots.
- That email is never enough to reuse a volunteer record. This costs some duplicate records for organizers to merge in exchange for not attaching one person's answers to another's record.
- Requiring a no-retention provider. This may narrow which open-weight hosts qualify.
**Left to the owner:** Merging; the product name; whether to close vloora PR #105.

## 4. Deviation — the gaps
- No machine trace was available; this record has not been reconciled with `closedtab reconcile`.
- Nothing was built or tested. The state tables have not been checked against code, because there is none yet.
- Vloora issues #99 to #104 were not recreated here.

## 5. Consequence — what it cost or risked
**Observed:** A coding agent now has one state model, one name for the record, and a token rule it must meet, instead of having to choose between conflicting versions.
**Risk:** The state model was written by an agent from the PRDs' own wording. If the owner wants different behavior, such as a blocker freeing the slot, the tables and the handoff's acceptance items must change together.

## 6. Change — what happens next
1. Owner reviews the state tables and the four judgment calls in section 3, then merges.
2. The coding agent implements the state tables as written and tests each allowed and forbidden transition.
3. Close vloora PR #105 or reduce it to its records so only one copy of the PRDs exists.
4. Recreate vloora issues #99 to #104 here.
