# Agent Action Record: SaaS redesign and Adobe content standards

**Review date:** 2026-10-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, main session
**Task or period under review:** Restyling the app to look like SaaS and consumer apps, and bringing interface text in line with Adobe's content standards
**Accountable human (name or role):** Repository owner (the founder)

## 1. Intent: what was supposed to happen
**Instruction given:**
- "The design should look more SaaS. It doesn't feel like Stripe or a consumer app like Tock or OpenTable, keeping the same standards as a content guide from Adobe."
- After the agent stopped to ask how to handle the guidelines: "Fetch the guidelines or another company and do the redesign!"

**Success defined in advance as:**
- Coordinator screens read as a modern SaaS dashboard, and the volunteer page as a consumer app.
- Interface text follows Adobe's published rules, and those rules are written down and checked.
- Everything that passed before still passes.

**Authority granted to the agent:** Change the app, docs and checks on `claude/volunteer-product-spec-946b8g` and push to PR #3.
**Out of scope:** New features, and changing the wording the spec names.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Fetched Adobe Spectrum's voice and tone page, its grammar and mechanics page, and its writing for errors and onboarding pages. Spectrum's button and dialog pages returned 404, so the agent used Adobe's Commerce Admin guide for buttons and links instead: verb plus noun, three words or fewer, and destructive confirmations named by the action.
2. Loaded the dataviz skill for the Today stat tiles. Per the skill, they're a sentence-case label plus a value in the text color, with no deltas or charts.
3. Replaced the Material 3 theme with a custom one:
   - neutral surfaces and thin borders
   - Inter type
   - labels above fields
   - one accent: the seed's hue darkened to #0E7C74 for contrast
   - matching dark tokens
4. Built a desktop sidebar, keeping the phone's top bar and bottom tabs. Added shared pieces: page header, section card, status badge, stat tile, empty state, and confirm and prompt dialogs.
5. Rebuilt the screens:
   - Today: stat tiles and a to-do list with badges
   - Tasks and People: table rows on desktop, stacked rows on phones
   - the task page: two columns
   - the task form: three sections
   - the person page: sections
   - sign-in: a centered card
   - the volunteer page: a date block, icon rows and large answer buttons
   - the public task page: matched by hand in its server-built HTML
6. Rewrote the text to Adobe's rules:
   - verb-plus-noun buttons ("Ask 3 people", "Edit task", "Find duplicates", "Copy message")
   - confirm dialogs named by the action, replacing browser `confirm()` and `prompt()`
   - times written "12 to 2pm" through a new `src/shared/time.ts`, which the ask messages also use
   - errors that say what happened, then what to do
7. Added Adobe's machine-checkable rules to `npm run check:docs`: no "!", no "&", no "click", no "please". Filled in `EDITORIAL.md` with the governing guides, voice, interface mechanics and the local exceptions. Wrote decision 0009 and marked 0004 as changed. Removed `@material/material-color-utilities`.
8. While writing the delete confirmations, found a bug: deleting a detail or a team left tasks requiring it, so those tasks matched no one. Deleting either now also removes it from unfinished tasks. Added a test.
9. Updated the walkthrough's selectors, scoped its navigation clicks to the main nav, and added desktop screenshots.
10. Fixed problems the screenshots showed:
    - a duplicate "New task" button when the list is empty
    - requirement fields cut off on phones
    - a status badge repeating "Never asked"
    - team names mixed into the "Last asked" column

**What it produced or changed:** `src/web/theme.ts`, `src/web/pages/*`, `src/web/format.ts`, `src/web/main.tsx`, `src/shared/time.ts`, `src/worker/engine.ts` (message times), `src/worker/routes/org.ts` (requirement cleanup), `src/worker/routes/volunteer.ts` and `src/worker/routes/public.ts` (page styles), `index.html` (Inter), `scripts/check-docs.mjs`, `test/rules.test.ts`, `test/api.test.ts`, `e2e/smoke.mjs`, `EDITORIAL.md`, `docs/decisions/0009-saas-look-and-adobe-content.md`, `docs/decisions/0004-material-3-for-the-interface.md`, `package.json`, and this record.
**Where actual behavior differed from the instruction:**
- The agent first stopped to ask how to handle the guidelines, after the owner rejected a first round of fetches. The owner then said to fetch them and go ahead.
- The requirement cleanup in step 8 is a behavior change beyond the restyle. It was needed for the new confirmation text to be true.

**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** A SaaS and consumer look, an Adobe content guide for the interface, and to go ahead.
**Decisions the agent made alone, for owner review:**
- Kept MUI and replaced only its look.
- The accent color #0E7C74, the gray scale, Inter, and the sidebar width.
- Used Adobe's Commerce Admin guide for buttons, because Spectrum's button page is gone. Kept sentence case over that guide's title case.
- Interface text uses Adobe's "%" and "12pm", and docs keep Vloora's "percent" and full dates. `EDITORIAL.md` records this.
- Kept "Yes", "No", "I can't make it" and "Stop asking me", because the spec names them.
- Badge words: Ready, Active, Paused, Stopped, Stuck, Soon and Not posted.
- Removing deleted details and teams from task requirements.

**Left to the owner:**
- the parts of `EDITORIAL.md` marked "Owner to fill in"
- whether the accent and type are right for the brand
- the product name, which the sign-in page shows as "Volunteers" for now

## 4. Deviation: the gaps
- Dark mode has tokens but wasn't checked in screenshots.
- Desktop screenshots cover Today, Tasks, People and one task. Settings, Import and the task form were checked at phone width only.
- The palette isn't a chart palette, so the dataviz validator wasn't run. Contrast for the accent was worked out by hand, not measured with a tool.
- No real coordinator or volunteer has used the new design.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** These all pass:
- `npm run check`: both type checks, 34 tests, the build
- `npm run check:docs`: prosekeep on 34 docs and 383 interface strings, the Adobe rules, the 20-word limit, and 6/6 on every record
- the walkthrough at phone and desktop widths, with no sideways scrolling and no page errors

**Risk:**
- Labels above fields depend on MUI style overrides. A future MUI upgrade could break them.
- The public page loads Inter from Google Fonts, the first outside request on a page volunteers open. The page falls back to system fonts if that request fails.

## 6. Change: what happens next
1. The owner reviews the look and decision 0009.
2. Check dark mode, and the remaining desktop screens, in screenshots.
3. Next run: when a published guideline page is missing, say so and name the substitute up front.
