# Agent Action Record: Interface copy and form density

**Review date:** 2026-10-25
**Reviewed by:** agent self review, before a separate agent's review
**Agent / system:** Claude Code, main session
**Task or period under review:** Rewriting the app's screen text with the owner's writing tools and standards, and making the forms shorter
**Accountable human (name or role):** Repository owner (the founder)

## 1. Intent: what was supposed to happen
**Instruction given:** "You didn't use my tooling to fix the awful wordiness of this tool. It doesn't use any style standards or guidelines, so it's a mess. The UI is too long for the size of the content. Why is it so long? I have another agent review, but make sure to write an AAR."
**Success defined in advance as:**
- The screen text follows the owner's standards and is checked by the owner's tools.
- The forms are no taller than their content needs.
- This record exists for the reviewing agent.

**Authority granted to the agent:** Change the app and its checks on `claude/volunteer-product-spec-946b8g` and push to PR #3.
**Out of scope:** New features, changes to the rules or the API, and filling in `EDITORIAL.md`.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Loaded the `plain-language-default` and `prosekeep` skills. Read prosekeep's 18F, GSA, accessible-content and style-mechanics references, and the interface rules in `quarterback/vloora/guides/style/source.md`: sentence case on buttons and labels, no dashes, numerals in labels. `EDITORIAL.md` is still a blank template, so the Vloora manual was used as the governing guide.
2. Wrote `scripts/ui-copy.mjs`. It uses the TypeScript parser to pull every visible string out of the code: JSX text, labels, helper text, placeholders, titles, aria labels, `confirm()` text, server `fail()` messages and status maps. The baseline was 388 strings and 1,778 words. `prosekeep check` found no mechanical problems, so wordiness was an editorial judgment the tools couldn't make on their own.
3. Rewrote the copy:
   - removed helper text under fields, using short placeholders instead
   - cut each section intro to one line
   - shortened confirmations and status sentences ("Paused: no answer to 3 asks")
   - grouped the people who can't be asked by reason in one line, instead of one row each
   - shortened server error messages so each still says what happened and what to do

   The result is 374 strings and 1,218 words, 31 percent fewer.
4. Changed the layout:
   - the theme makes all fields compact (40 px instead of 56 px)
   - the page is narrower (640 px), with tighter spacing
   - related fields share a row: place and address, people and who to find, how to ask and team
   - the three paragraph-sized "how to ask" buttons became one dropdown with a one-line hint
   - the People detail filters sit behind a Filters button

   At 412 px wide, the task form went from 2,048 to 1,000 px tall, Settings from 3,421 to 2,075, and Import from 2,002 to 1,600. The date and time fields stack on phones, because side by side they cut off the date.
5. Added the interface copy to `npm run check:docs`. prosekeep now checks the extracted copy on every PR, and the check fails any single string over 20 words.
6. Updated the one API test and the walkthrough selectors that matched old wording. Made the walkthrough wait for animations and scroll to the top before each screenshot, which fixed the two broken screenshots from before.

**What it produced or changed:** `src/web/theme.ts`, every page in `src/web/pages/`, `src/web/format.ts`, `src/shared/sentences.ts`, messages in `src/worker/model.ts`, `src/worker/routes/tasks.ts` and `src/worker/routes/org.ts`, `scripts/ui-copy.mjs`, `scripts/check-docs.mjs`, `test/api.test.ts`, `e2e/smoke.mjs`, and this record.
**Where actual behavior differed from the instruction:** None known.
**Stayed within granted authority?** Yes. No rules, routes or data changed.

## 3. Judgment: human in the loop
**Decisions the owner made:** The copy was too wordy and the forms too tall. Use the owner's tools.
**Decisions the agent made alone, for owner review:**
- The Vloora style manual governs interface copy until `EDITORIAL.md` is filled in.
- A 20-word limit per interface string. It's a guard against regressions, not a measure of quality.
- Wording choices: "Missing a requirement" instead of "Doesn't meet the requirements", "Paused: no answer to 3 asks", "Ask 3" instead of "Ask 3 people", "Edit" instead of "Change", "Skip" instead of "Leave out", and "Members" for the people who run things.
- `plain-language-default check` stays out of CI. It reads a list of short strings as run-on sentences.
- The ask message volunteers receive, the public task page, and "This one's already filled. Thank you." were left as they were, because the spec names them.

**Left to the owner:** Filling in `EDITORIAL.md`, and any wording they want back.

## 4. Deviation: the gaps
- The extractor misses text built in plain helper functions outside JSX and outside the listed calls. Today's list was checked by eye for this.
- Screens were checked at 412 px wide in light mode only. Dark mode and desktop weren't re-shot.
- No real coordinator has read the new wording.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** These all pass: `npm run check` (both type checks, 31 tests, build), `npm run check:docs` (prosekeep on 32 files and on 374 interface strings, nothing over 20 words, every record 6/6), and the phone walkthrough.
**Risk:**
- Shorter labels carry less explanation. "Address" and "Place" rely on their placeholders to show which one is private.
- The 20-word limit could push a needed explanation into two strings.

## 6. Change: what happens next
1. The reviewing agent checks the copy against the Vloora style manual and the spec's required wording.
2. The owner fills in `EDITORIAL.md`, so prosekeep has the project's own voice to check against.
3. Next run: use the owner's writing tools on the interface from the start, not only on docs.
