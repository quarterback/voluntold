# Agent Action Record: Pilot spec rewrite

**Review date:** 2026-10-24
**Reviewed by:** agent self review
**Agent / system:** Claude Code, main session
**Task or period under review:** Turning the October 24 planning set into one short buildable spec, a list for later, and decision records
**Accountable human (name or role):** Repository owner (the founder)

## 1. Intent: what was supposed to happen
**Instruction given:** "Build the spec of the volunteer product like a working spec I can ship to start testing it, but make sure the PRD isn't too bloated and then can make it grow with time. Ask me questions."
**Later owner input:**
- Pilot with 3 to 5 organizations, as a small real app.
- One short spec plus a backlog.
- Copy links only. An off-the-shelf Material library.
- Write questions in plain language.
- Approval isn't first come, first served. Requirements gate work, and teams and organizations approve people. Research existing tools and their gaps. Find out how to make it AT Protocol native.
- Think of the tool as a series of schemas. Organizations write their own asks, and AI help comes later.
- The first version organizes volunteers by org-defined details (skills, age, experience), designs a flow for putting them to work, and imports another tool's data. Warm small tasks come later. Intake is not in the tool.
- Only tasks go on AT Protocol. Look at VarsityApex.
- Import any file. A data API comes later. "Stop making this so complicated."

**Success defined in advance as:** A spec a coding agent can build from, small enough to read, with a clear way to add features.
**Authority granted to the agent:** Write and restructure the planning docs in `quarterback/voluntold` on `claude/volunteer-product-spec-946b8g`, commit and push.
**Out of scope:** Building the app, choosing the product name or domain, opening a pull request.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Read the README, PRODUCT-PRD, SHIP-TODAY and the five decision records.
2. Asked two rounds of questions. The second round used jargon, and the owner said so.
3. Started two research subagents: one on existing volunteer tools, and one on AT Protocol. Both wrote files in `docs/research/` with their own records, and both were committed.
4. Read the VarsityApex essay in `quarterback/vloora` and Ron's blog post, and searched for standard.site, to borrow its AT Protocol pattern.
5. Wrote `docs/SPEC.md` (about 2,400 words) and `docs/LATER.md`. Wrote decisions 0006 (only tasks go on AT Protocol) and 0007 (pilot scope). Marked 0003, 0004 and 0005 as changed by 0007. Rewrote the README.
6. Moved the six old documents to `docs/archive/` and fixed their links to the decision records. Checked for broken links and dashes.

**What it produced or changed:** `README.md`, `docs/SPEC.md`, `docs/LATER.md`, `docs/decisions/0006-only-tasks-go-on-at-protocol.md`, `docs/decisions/0007-pilot-scope.md`, edits to decisions 0003 to 0005, `docs/archive/`, and this record.
**Where actual behavior differed from the instruction:** The owner asked for questions. After the owner pushed back, the agent stopped asking and made the remaining calls itself, marked as its own in 0007.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** Everything marked "owner" in 0007, plus only tasks on AT Protocol (0006), and login by either email or Bluesky.
**Decisions the agent made alone, for owner review:**
- The three ways to ask, with "a few at a time" as the default.
- Teams with leads who manage their own members.
- Asks expire after 48 hours or 6 hours before start. The weekly limit of 2 and the pause after three unanswered asks were kept.
- Text, Word and PDF imports go through a model, so contact details reach the model provider.
- Posted tasks are on by default once an AT Protocol account is connected.
- A public task page sends new people to the organization's own sign-up link.
- Tiers, rounds and the weekly draft run were dropped from the pilot.
- The pilot success measure: more volunteers active after 6 weeks, and coordinators using the tool weekly.
- The spec's size limit was raised from 2,000 to 2,500 words after the draft came in at about 2,400.

**Left to the owner:** The product name; the domain for the AT Protocol record name; the sign-in and model providers; merging.

## 4. Deviation: the gaps
- Nothing was built or run. The rules haven't been checked against code.
- It's not confirmed that the AT Protocol OAuth client runs on Cloudflare Workers. The spec calls for a one-day test.
- The owner's phrase "design an effective flow for both" was never clarified. The agent read "both" as organizing people and putting them to work.
- No machine trace was available, and the `closedtab` CLI isn't installed, so `closedtab check` wasn't run and nothing was reconciled.

## 5. Consequence: what it cost or risked
**Observed:** A coding agent has one file to build from instead of six. The old detail is kept in the archive.
**Risk:** The agent's calls in section 3 will be built as written unless the owner changes them first. Rules from the archive that the spec doesn't repeat are dropped on purpose, and some may turn out to have been needed.

## 6. Change: what happens next
1. The owner reads SPEC.md and changes any of the agent's calls in 0007.
2. Pick the domain for the AT Protocol record name before any real post.
3. Run the one-day test of AT Protocol sign-in on Workers, then build in the order the spec gives.
4. Next run: ask fewer questions, in plain words, and offer a default with each one.
