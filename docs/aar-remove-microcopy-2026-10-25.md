# Agent Action Record: Removing microcopy

**Review date:** 2026-10-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, main session
**Task or period under review:** Removing helper and explanatory text from the app's screens
**Accountable human (name or role):** Repository owner (the founder)

## 1. Intent: what was supposed to happen
**Instruction given:** "Get rid of all microcopy. Those words are not how real UIs operate and it's just AI slop."
**Success defined in advance as:**
- Screens carry only labels, buttons, headings, data, status and errors.
- A check stops explanatory text from coming back.

**Authority granted to the agent:** Change the app, docs and checks on `claude/volunteer-product-spec-946b8g` and push to PR #3.
**Out of scope:** Server error messages, which say what went wrong and stay. Behavior changes.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Listed every screen string of four or more words with `scripts/ui-copy.mjs`. Searched for section notes, subtitles, empty-state bodies, helper text, placeholders and hints, which the script didn't read.
2. Removed:
   - every Settings section note, and the welcome and second-admin alerts
   - the helper text under Place, Address and Sign-up link
   - the "how to ask" hints
   - example placeholders: "Registration desk", "Greet people…", "Downtown library", "120 Main St…", "Priya, at the front door"
   - the People subtitle and empty-state bodies
   - the To do descriptions that explained instead of reporting data
   - the line on the copy dialog and the "who fits" line in the ask dialog
   - the sign-in explanation
   - the volunteer page's "Can you help?" label, its break explanation, and "Nothing to answer right now"
   - the body text in confirm dialogs, except "This can't be undone." on deleting a person
   - the public page's "Already volunteer with us?" paragraph, now a "Sign up to volunteer" link
3. Shortened status and outcome text to its core: "You said yes", "You said no", "Canceled", "Asks stopped", "Link expired", "Not posted: …", "3 skipped". The Post switch now shows the account handle, or is turned off when no account is connected, with no caption.
4. Updated `SPEC.md` where it named the removed public page paragraph.
5. Made `scripts/ui-copy.mjs` also read `note`, `subtitle`, `body` and `hint` props, and the `title`, `body`, `confirm` and `label` keys in object literals. `npm run check:docs` now fails:
   - any screen string over 8 words
   - any full sentence on a screen, apart from "This one's already filled. Thank you." (named in the spec) and "This can't be undone."
6. Recorded the rule in `EDITORIAL.md`.
7. Fixed what the screenshots showed once the text was gone: the add buttons in Settings sat above their fields and were cut off on phones. "Add choice" became a placeholder.
8. Updated the walkthrough's selectors.

**What it produced or changed:** `src/web/pages/*` (People, Person, Settings, TaskEdit, Tasks, TaskDetail, Today, Login, Start, Import, VolunteerPage), `src/worker/routes/public.ts`, `scripts/ui-copy.mjs`, `scripts/check-docs.mjs`, `e2e/smoke.mjs`, `EDITORIAL.md`, `docs/SPEC.md`, and this record.
**Where actual behavior differed from the instruction:** The agent kept two sentences: the spec's "This one's already filled. Thank you." and "This can't be undone." on a permanent delete. The agent also kept the accepted file types on Import and the format placeholder on the Bluesky handle, treating them as data rather than explanation.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** Remove all microcopy.
**Decisions the agent made alone, for owner review:**
- What counts as microcopy. Kept:
  - labels, buttons and headings
  - stat tile labels and "Last 30 days"
  - status sentences ("Asked 3 weeks ago, said yes")
  - errors
  - the two sentences above
  - "Name column required"
  - "CSV, XLSX, XML, JSON, TXT, DOCX or PDF"
  - the handle placeholder
- The limits: 8 words per screen string and no full sentences.
- Changing the spec's public page wording to a link, following the owner's latest instruction.

**Left to the owner:** Whether the two kept sentences and the file-type line should go too.

## 4. Deviation: the gaps
- The extractor still misses text built inside plain helper functions. Remaining screens were read by eye in the screenshots.
- Dark mode wasn't checked.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** These all pass:
- `npm run check`: 34 tests
- `npm run check:docs`: prosekeep on 35 docs and 407 interface strings, with no screen string over 8 words and no explanatory sentences
- the walkthrough at phone and desktop widths

Screens now hold 307 strings and 636 words, counting every label, option and status.
**Risk:**
- New coordinators get no hints. The pilot will show whether any screen needs one back.
- Without the "Only people you ask see it" note, the difference between Place and Address rests on the labels alone.

## 6. Change: what happens next
1. Watch the first pilot coordinator use the task form and Settings, and note where they hesitate.
2. Next run: write screens with labels and data only from the start.
