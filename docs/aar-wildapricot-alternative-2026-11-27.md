# Agent Action Record: A WildApricot comparison page

**Review date:** 2026-11-27
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** Adding a landing page at manyarms.app/wildapricot-alternative
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** The owner shared Outseta's Memberstack alternative page, then said: "yesah i was trying to find that kind of language since the GTM style marketing copy doesn;'t come naturally to me so if this makes snese i'm into it". This replied to the agent's offer to draft a WildApricot alternative page for manyarms.app.
**Success defined in advance as:** Not defined in advance. The agent took it as: a page in the style of the Outseta example that compares price and features honestly and sends people to sign up or try the demo.
**Authority granted to the agent:** Change the app on `claude/volley-launch-strategy-aktbyn`, pull request #33, and deploy as on earlier runs.
**Out of scope:** The home page, pricing, product features.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Read wildapricot.com/pricing on November 27, 2026. The 100 Contacts plan costs $66 a month billed monthly, the price rises with contact count, and there is no free plan.
2. Checked the code for each claim about ManyArms: renewal emails can link to the organization's payment page (`renewal_url`), the import recognizes "Membership level", "Renewal due" and "Member since", and reports group renewals by 30, 60 and 90 days.
3. Added `src/web/pages/Alternative.tsx` with a price comparison, a feature table, a section on what ManyArms adds, migration steps, a section on when WildApricot is the better fit, questions and a closing call to action. Added the route and exempted the page from the 8-word screen rule, like the home page.
4. Ran `npm run check` (60 tests pass) and `npm run check:docs`, and checked the page at desktop and phone widths.

**What it produced or changed:** `src/web/pages/Alternative.tsx`, `src/web/App.tsx`, `scripts/check-docs.mjs`, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Owner revision, same day:** "I dont like all the hedging and cowardly disclaimers". Removed the better-fit section, the dated source line, the trademark note, the dues question and the rows where ManyArms said No. Added rows for growth pricing, volunteer asks, roles with terms and answering without a login.

**Second page, same day:** "Yes to the same for a galaxydigital version without hedging". Galaxy Digital's pricing page returned 404; its FAQ says each product is custom-priced and offers a demo, volunteers sign up by creating a profile, and its product pages list no membership renewals, dues or board terms. The page became one template with a data entry per competitor, and Galaxy Digital is at /galaxy-digital-alternative. The agent dropped an "Application page: No" row for Galaxy Digital because volunteer applications are likely there.

**Decisions the agent made on its own:**
- Only WildApricot's own published price, with the date checked. Third-party price lists disagreed and were left out.
- The table lists only features both products are known to have or lack. It makes no claim about roles or succession in WildApricot.
- A section that tells groups needing a member website, ticketing or online dues to stay with WildApricot.
- The home page doesn't link to this page, so competitor names stay off the main page.
- A trademark and no-affiliation note in the footer.

**Of those, which should a human have made or seen:** The honest "better fit" section and the decision to leave the page unlinked.
**Where a human actually intervened:** None during the build.
**Points where it should have escalated and didn't:** None found.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):** The page is part of the single-page app, so link previews and crawlers that don't run scripts see the home page title and card.
**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** None known.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** Tests, docs checks and browser checks pass.
**Harm / cost / risk, realized or narrowly avoided:** WildApricot prices change. A stale price on a comparison page misleads people.
**Downstream affected parties:** People comparing the two products.
**Expected failure if this run happened 100 times:** Some runs would quote third-party prices or claim WildApricot lacks features without checking.

## 6. Change: what happens next
**Specific changes before next run:** Recheck the WildApricot price before any ad spend and update `CHECKED`. Serve page-specific titles and cards from the worker if the page gets shared.
**Keep doing:** Use the competitor's own published numbers and date them.
**Should not be delegated to an agent at all:** Ad spend and which competitors to name.
**Signal that the change worked:** Sign-up requests that arrive from this page.

No machine trace of this run was available for reconciliation.
