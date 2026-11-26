# Agent Action Record: Research on how small organizations talk about their people

**Review date:** 2026-11-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** Research before scoping membership further
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "not all organizations have actual paid memberships, so I think it's figuring out how to make sure that you don't have to do that in order to manage members, and I think doing some research on like the sorts of the sorts of language that people are using around their struggles with broader membership engagement, membership organization structure, and things like that, is a better sense of how to figure out how to scope this in a way that is targeted towards the people who need it rather than sort of chasing an audience. So do some research on that first". The owner attached a screenshot of a text from someone who runs a small organization.
**Success defined in advance as:** Not defined in advance. The agent took it as: the words and problems small groups describe, and what they mean for scope, before any more building.
**Authority granted to the agent:** Research and write it up.
**Out of scope:** Changing the product or the home page.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Ran twelve web searches across small nonprofits, clubs, associations, mutual aid groups, parent groups and neighborhood associations. Two searches limited to Reddit were refused.
2. Wrote `docs/research/membership-language-2026-11.md`: four patterns, a table of words to use and avoid, six scope recommendations, and interview questions for next time.
3. Summarized the screenshot without the person's name.
4. Ran `npm run check:docs`.

**What it produced or changed:** `docs/research/membership-language-2026-11.md`, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- Which sources to trust, and marking vendor and competitor sources.
- Leaving the person in the screenshot unnamed in the repository.
- The six recommendations, including an off-by-default renewals setting, roles with terms, and not chasing an all-in-one product.

**Of those, which should a human have made or seen:** All six recommendations are for the owner to decide.
**Where a human actually intervened:** None during the research.
**Points where it should have escalated and didn't:** None found.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):** The owner asked for the language people use. Without Reddit or interviews, most of it comes from surveys and guides written about those people, not by them.
**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** None known. Several figures are secondhand, and the document says so.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** A research note and recommendations. No product change.
**Harm / cost / risk, realized or narrowly avoided:** Vendor sources can overstate the problems they sell a fix for. The screenshot's sender isn't named.
**Downstream affected parties:** Whoever scopes the next build from this.
**Expected failure if this run happened 100 times:** Some runs would quote vendor claims as fact, or start building before the owner chose.

## 6. Change: what happens next
**Specific changes before next run:** The owner picks from the six recommendations. Interview six to ten people who run small groups.
**Keep doing:** Marking where each claim comes from.
**Should not be delegated to an agent at all:** The interviews.
**Signal that the change worked:** The next build and the launch copy use the words people use.

No machine trace of this run was available for reconciliation.
