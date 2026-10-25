# Agent Action Record: Bring the planning docs in line with the October 23 and 24 decisions

**Review date:** 2026-10-24
**Reviewed by:** agent self review, plus one separate review agent reading the finished docs
**Agent / system:** Claude (cloud session)
**Task or period under review:** Revising the October 21 planning docs into a working spec for today's build
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "This doesnt inform a prd check the repo and lets plan the build today i need a working spec today", followed by a link to this repository.
**Success defined in advance as:** Not stated. The agent took it to mean: the PRD set in this repository reflects what the owner decided after October 21, and a coding agent can start building from it today.
**Authority granted to the agent:** Edit the planning docs on a branch. Pushing and merging stay with the owner.
**Out of scope:** Application code, the product name, the Vloora website, and the design canvas.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Read every file in this repository, and the HourKeep repository's project docs skill for the owner's documentation habits.
2. Listed where the October 21 docs conflict with decisions the owner made on October 23 and 24: intake as the front door, `submitted` and `confirmed` states with organizer confirmation, an online only architecture, text messages and Slack out of scope, and no tiers, rounds, weekly limit or Today screen.
3. Wrote five decision records in `docs/decisions/`: start after approval, the schedule is the record, the coordinator app works offline, Material 3, and email first then text then Slack.
4. Revised `PRODUCT-PRD.md`, `ACTIVATION-PRD.md`, `MOBILIZATION-PRD.md`, `ARCHITECTURE.md`, `SHIP-TODAY.md`, `AGENT-HANDOFF.md` and `README.md` to match. Kept the October 21 security, token, tenant and cost rules.
5. Checked outside facts used in the docs against their sources: Twilio's blocking of unregistered 10DLC and unverified toll free texts, Material Web's maintenance status, Dexie Cloud pricing, Slack interactive messages, and the NHS Volunteer Responders figures.
6. Ran the owner's `plain-language-default` checker over every changed file, and searched for dashes in prose.
7. Had a separate agent read the finished docs for contradictions. It found 24, including a wait rule that contradicted itself, imported people with no contact permission, missing data model fields and endpoints, and sample data that broke the import rule. The agent fixed all 24. Notes of extra hours moved out of v0 into the roles release, to resolve a conflict with "no hour logging".
**What it produced or changed:** `README.md`, six files in `docs/`, five decision records, and this record.
**Where actual behavior differed from the instruction:** None known.
**Stayed within granted authority?** Yes. The session could not push to this repository, so the changes were handed to the owner as files.

## 3. Judgment: human in the loop
**Decisions the owner made:** Start after approval; no hour verification and no confirm step; works when the internet is down; Material 3; tiers; waitlists; nobody chases volunteers.
**Decisions the agent made alone, for owner review:**
- Contribution states `accepted`, `blocked`, `done`, `withdrawn`, `canceled` and `missed`, with `done` set by the system when time passes, and `missed` as a correction a coordinator can make but is never prompted to make.
- Later rounds of an approved opportunity go out without another approval. The first round and every drafted ask need approval.
- Defaults: 2 offers per person in any 7 days; a wait before the weekly run drafts someone of 90 days for One time, 28 for Seasonal, 14 for Regular and 7 for Core; offers expire after 24 hours for coverage (or 6 hours before the start) and 48 hours for outcome work; 3 unanswered offers in a row make a person `inactive`.
- Ranking order: fit band, then longest wait, then yes rate. People never asked count as having waited longest.
- An outbox replayed to the existing Workers and D1 server for offline work, instead of a sync engine.
- Shared opportunity links stay, and the people they bring in wait for approval as `new`.
- An import sets email permission for everyone in it once the coordinator confirms they agreed to be contacted.
- Tier sets how often the weekly run reaches someone, through the wait thresholds above.
- A late yes takes an open slot if one exists.
- Email ships before text messages, because text needs carrier registration.
- The order of releases after v0.
**Left to the owner:** Merging; the product name; the email, auth and inference providers; who registers for texting and who pays; the license.

## 4. Deviation: the gaps
- Nothing was built or run. The state tables and the rules for choosing who gets asked have not been checked against code.
- The defaults in section 3 are the agent's choices, not measured values.
- The radio station, spreadsheet only and several coordinator cases are in the release plan as single lines. Their screens are not specified.
- No machine trace was available. This record has not been reconciled with `closedtab reconcile`.

## 5. Consequence: what it cost or risked
**Observed:** A coding agent now has one model that matches the owner's decisions, today's slice with sample data that exercises the new rules, and a smoke test.
**Risk:** The coding agent will build the defaults and the ranking order exactly as written. If the owner wants different ones, they should change here before the build starts.

## 6. Change: what happens next
1. The owner reviews the judgment calls in section 3, then commits this branch and merges it.
2. A coding agent builds `SHIP-TODAY.md` from `AGENT-HANDOFF.md`.
3. Text message registration starts the day the beta ships.
