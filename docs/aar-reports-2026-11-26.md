# Agent Action Record: Reports instead of renewal badges on the People list

**Review date:** 2026-11-26
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** Moving renewal status into a Reports screen
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "Expiring members should be a report you run obody is gonna view 000s of menbwrs in a snapshot youbhave tomake this tool's reports scannable"
**Success defined in advance as:** Not defined in advance. The agent took it as: renewal status off the People list, and reports that show counts first and only the people a coordinator asks for.
**Authority granted to the agent:** Change the app on `claude/volley-launch-strategy-aktbyn`, pull request #32.
**Out of scope:** New concepts beyond reports.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Removed the Current, Expiring and Expired chips and the row badges from the People list. Rows keep the category.
2. Added `src/worker/routes/reports.ts`: a summary (people, by category, renewal groups, participation in the last 90 days, roles, applications), and the people in one renewal group as JSON or CSV. Counts are computed in the database.
3. Added `src/web/pages/Reports.tsx`, a Reports item in the desktop menu, and a Reports button on the People screen for phones. Renewal groups don't overlap. Picking one lists those people soonest first, with Export CSV and Email. On a phone the table shows name, category and expiry date only.
4. Retook the roster screenshot without the badges, and updated the home page and the spec.
5. Added 2 report tests; 58 pass. Checked Reports with 309 members at desktop and phone width with no page errors.

**What it produced or changed:** `src/worker/routes/reports.ts`, `src/worker/index.ts`, `src/web/pages/Reports.tsx`, `People.tsx`, `OrgShell.tsx`, `App.tsx`, `Home.tsx`, `public/screens/roster.png`, `test/reports.test.ts`, `docs/SPEC.md`, decision 0015, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- Which reports to include beyond renewals: participation, roles, applications, categories.
- Renewal groups of 30, 60 and 90 days, and expired within the last 90.
- "Never offered a task" as the plain count, keeping to the owner's rule against labeling people inactive.
- Reports in the desktop menu, and a button on People for phones, instead of a sixth phone tab.

**Of those, which should a human have made or seen:** The choice of reports, and where they sit.
**Where a human actually intervened:** None during the build.
**Points where it should have escalated and didn't:** None found.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):** The People list still loads every person at once. Large rosters will need paging there too.
**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** None known.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** Tests and browser checks pass.
**Harm / cost / risk, realized or narrowly avoided:** A renewal group lists at most 5,000 people.
**Downstream affected parties:** Coordinators of large organizations.
**Expected failure if this run happened 100 times:** Some runs would add charts the owner didn't ask for.

## 6. Change: what happens next
**Specific changes before next run:** Page the People list for large rosters. Learn which reports pilot organizations open.
**Keep doing:** Counts first, then the people behind a number.
**Should not be delegated to an agent at all:** Which numbers an organization is judged by.
**Signal that the change worked:** A coordinator with thousands of members finds who is due this month in one tap.

No machine trace of this run was available for reconciliation.
