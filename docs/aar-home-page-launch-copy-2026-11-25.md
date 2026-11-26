# Agent Action Record: Home page rewritten for the public launch

**Review date:** 2026-11-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** Removing the "AI-native" framing and rewriting the home page as a launch page
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "Get rid of rhe Ai narive thing i had that during pilot phase just learn from gtm skills out there and redo the site in thar frame. Ok resend then it is"
**Success defined in advance as:** Not defined in advance. The agent took it as: no AI framing, and a page built the way launch pages are built, with every claim true of the product today.
**Authority granted to the agent:** Rewrite the home page.
**Out of scope:** The product name, the headline the owner chose in October, the screenshots, the page metadata and the email provider.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Loaded the copywriting skill and read the home page, `EDITORIAL.md` and the spec.
2. Kept the owner's headline, "Volunteers activated". Replaced the subhead with what the tool does: it emails asks to the right volunteers, who answer from their phone with no account.
3. Laid the page out as: hero with Start free and Try the demo, the problem, three steps, four features with the existing screenshots, six questions, and a closing call to action. Added "Free to use. No card needed." under the hero buttons.
4. Took every claim from the spec, decision 0012 and the code: the import formats, the weekly limit of two asks, attendance when a task's time passes, confirmation and reminder emails, export, coordinators and team leads.
5. Broke each feature's text into short lines, which also cleared the four long-sentence failures this file had in `npm run check:docs`.
6. Checked the page in Chromium at 390 and 1280 pixels wide: no page errors and no sideways scrolling.
7. Took "Ok resend then it is" as confirming Resend for launch. No code change, since Resend is used whenever its key is set.

**What it produced or changed:** `src/web/pages/Home.tsx`, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- All new wording, including "People said yes. Nobody asked them." and "Put your list to work".
- The button label Start free, in place of Get started.
- Leaving out the tags the tool proposes, because that feature uses a model and the owner asked for no AI framing.
- Keeping the SES code as a second option instead of deleting it.

**Of those, which should a human have made or seen:** The wording, especially the problem section's claim that "the same few people end up doing everything", which is the owner's argument but has no figure behind it.
**Where a human actually intervened:** None during the build.
**Points where it should have escalated and didn't:** None found.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):** The page has no proof such as customer names or quotes, because there are none yet.
**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** None known.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** Type checks pass. The docs check no longer flags this file.
**Harm / cost / risk, realized or narrowly avoided:** "It's free" makes no promise about the future, which matches 0012. The name Volley appears in the copy and must change with the rename.
**Downstream affected parties:** Visitors on launch day.
**Expected failure if this run happened 100 times:** Some runs would invent a statistic or a testimonial for the problem section.

## 6. Change: what happens next
**Specific changes before next run:** Add pilot quotes or organization names once partners agree. Replace "Volley" across the page and metadata when the name is set.
**Keep doing:** Taking every claim from the spec and the code.
**Should not be delegated to an agent at all:** The final headline and the name.
**Signal that the change worked:** Visitors choose Start free more often than Try the demo.

No machine trace of this run was available for reconciliation.
