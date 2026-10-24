# Agent Action Record: Research on gaps in volunteer management tools

**Review date:** 2026-10-24
**Reviewed by:** agent self review
**Agent / system:** Claude, a research subagent started by the main session
**Task or period under review:** Market research on volunteer management software, written to `docs/research/volunteer-tools-landscape-2026-10.md`
**Accountable human (name or role):** Repository owner (the founder)

## 1. Intent: what was supposed to happen
**Instruction given (summary of the main agent's brief):** Use web search and fetch to research the 2025 to 2026 market for volunteer management software and where it falls short. Cite a source URL for every claim. Cover the named tools, their pricing, how requirements gate sign-up, and whether approval is per role or team. Collect complaints, retention research and acquisitions. Stay under 1,800 words, in plain language with no em dashes. Mark anything unverified. Return a 200 word summary.
**New founder input passed along:** Getting onto work is not first come, first served. Requirements such as training, checks, licenses, skills and membership gate it, and teams or the organization approve people per role, team or task.
**Success defined in advance as:** One file in the stated structure, with every claim sourced and unverified items marked.
**Authority granted to the agent:** Create the research file and its folder.
**Out of scope:** Editing the PRDs or decision records, and committing or pushing.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Read `README.md`, `PRODUCT-PRD.md` and `AGENT-HANDOFF.md`, and searched the ACTIVATION and MOBILIZATION PRDs for requirements and eligibility. Found that the NHS Volunteer Responders figures were already cited and kept them brief.
2. Ran about 60 web searches and 45 page fetches across vendor help centers, pricing pages, press releases, NCVO, the US Census and AmeriCorps.
3. Confirmed that Better Impact bought Galaxy Digital (announced March 10, 2026), Momentive bought VolunteerMatters (July 30, 2025), Golden took in IVolunteerNow (September 2025), and Bloomerang bought InitLive (2023).
4. Wrote the file, renumbered the citations, and cut the text to 1,784 words by `wc -w`, sources included. Searched it for em and en dashes and found none.
**What it produced or changed:** `docs/research/volunteer-tools-landscape-2026-10.md` and this record.
**Where actual behavior differed from the instruction:** Reddit, G2 and Capterra could not be fetched (403 errors). Review quotes come from search result extracts, and the file says so.
**Stayed within granted authority?** Yes. Nothing was committed.

## 3. Judgment: human in the loop
**Decisions the agent made alone, for owner review:**
- It concluded that no tool documents approval by a team inside an organization. This is absence of evidence, and the file labels it that way.
- It treated vendor blog posts and vendor-sponsored surveys (Rosterfy, VolunteerHub, Better Impact) as evidence and named them as vendor sources.
- It used third-party price listings where official pages did not load, and marked them.
- It did not verify the Timecounts sale to AlpineTEC, which rests on one page.

## 4. Deviation: what went wrong or changed course
- The brief asked what Golden is "now part of". No acquisition of Golden was found. The file says this and does not guess.
- Several pricing pages returned 404 or empty content. Track It Forward prices come from search extracts of its own pricing page.

## 5. Consequence: what it led to
- The file is ready for the founder to read. Nothing in the product spec changed.
- Risk: third-party prices and review extracts may be stale or paraphrased. Check them before anything is said in public.

## 6. Change: what to do next time
- Before quoting reviews publicly, use a browser that can open G2, Capterra and Reddit.
- The founder decides whether per-role and per-team approval moves into v0 or stays in the planned "roles with requirements" release.
- `closedtab check` was not run because the CLI is not installed here. No trace was available for reconciliation.
