# Agent Action Record: Standard wording for buttons and labels

**Review date:** 2026-10-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, main session
**Task or period under review:** Replacing made-up interface wording with the standard terms other apps use
**Accountable human (name or role):** Repository owner (the founder)

## 1. Intent: what was supposed to happen
**Instruction given:** "These are not standard CTAs. Why can't you research CTAs and microcopy in apps and use standard language?" The owner quoted the two sentences the last run kept: "This one's already filled. Thank you." and "This can't be undone."
**Success defined in advance as:**
- Buttons, labels and statuses use wording found in widely used design systems and apps, with sources.
- The two quoted sentences are gone.
- A check stops the replaced wording from coming back.

**Authority granted to the agent:** Change the app, docs and checks on `claude/volunteer-product-spec-946b8g` and push to PR #3.
**Out of scope:** Behavior changes. The message coordinators paste with each link.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Searched for, and read where it could, the guidance on buttons, confirmations and statuses from:
   - Apple's alert guidelines: "Cancel" for the way out, a specific verb for the action, no Yes or No
   - GitHub Primer's confirmation dialog: title as a question ("Delete repository?"), a button naming the action, and "Cancel"
   - Shopify Polaris: verb and noun, with common actions like Save and Cancel standing alone
   - Meetup and Luma: "Full", "Join waitlist", "Going", "Not going"
   - Google Calendar's "Going? Yes, No, Maybe"
   - HubSpot's import: "Map columns", "Import as", "Don't import column", "Next"

   Material Design's dialog page didn't load. No official source gave SignUpGenius's or OpenTable's exact wording.
2. Listed all 407 interface strings with `scripts/ui-copy.mjs` and replaced the ones with no standard equivalent. The full list is in the table in `EDITORIAL.md`. Main changes:
   - Volunteer page: Yes and No became Accept and Decline. "I can't make it" became "Cancel spot". The break became "Pause" and "Resume". "Stop asking me" became "Unsubscribe". The heading is now the organization's name instead of "Hi Sam".
   - "This one's already filled. Thank you." became "This task is full".
   - Deleting a person: the "This can't be undone." line is gone. The dialog is "Delete Sam Lee?" with "Delete person" and "Cancel", as in Apple's and Primer's examples.
   - Coordinator screens: Publish, Save and Edit replaced "Open task", "Save and open" and "Save changes". The statuses are now Pending, Accepted, Declined, Expired, Confirmed, Attended and No-show. Location, Contact, Description and "Volunteers needed" replaced Place, "Who to find", "What to do" and People.
   - "Volunteer details" became "Custom fields", and requirements now read "Field, Condition, Value" and "Team: Desk crew".
   - Import: Map columns, Import as, Don't import, Next, Import history, Skipped.
   - Ways to ask: In batches, All eligible, Manual.
   - Server messages: "Incorrect code.", "Sign in to continue.", "You don't have permission to do that." and others. The public page status and the expired-link page lost their extra sentences.
3. Updated `SPEC.md` where it named the old words, and `EDITORIAL.md` with a "Standard wording" rule, the replacement table and the sources.
4. Added a list of the replaced phrases to `scripts/check-docs.mjs`. Any screen string that uses one fails the docs check. Tested it by adding "Give up spot" to a screen, which failed as expected.
5. Updated the tests and the walkthrough. The walkthrough now starts waiting for the team-membership response before it ticks the box, which fixed a timing failure on its first run.

**What it produced or changed:** `src/web/pages/*`, `src/web/format.ts`, `src/shared/sentences.ts`, `src/shared/rules.ts`, server messages in `src/worker/`, `scripts/check-docs.mjs`, `e2e/smoke.mjs`, `test/api.test.ts`, `docs/SPEC.md`, `EDITORIAL.md`, and this record.
**Where actual behavior differed from the instruction:** The owner quoted two sentences. The agent changed the wording across every screen, reading the question as being about all buttons and labels.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** Use standard wording from other apps. Drop the two quoted sentences.
**Decisions the agent made alone, for owner review:**
- Accept and Decline instead of Yes and No. Google Calendar and Meetup use Yes and No under a "Going?" question. Apple says to avoid Yes and No on buttons. The agent picked the calendar-invite verbs.
- "Go back" as the way out when the action is itself a cancel ("Cancel task"). Apple says the way out is always "Cancel". Using that here would put two Cancel buttons side by side.
- "Unsubscribe" for a volunteer stopping all asks, borrowed from email.
- Renaming "details" to "custom fields" and the three ways to ask. The spec named the old terms, and the spec now uses the new ones.
- Keeping the message coordinators paste ("Hi Sam, can you help…? Answer here: [link]"), because it's a personal message, not interface text.

**Left to the owner:** Any of the choices above. The table in `EDITORIAL.md` is the place to change a word, and the check follows it.

## 4. Deviation: the gaps
- Most consumer-app wording came from help centers and secondary guides, not from the apps themselves.
- On a task page, someone who accepted and then cancelled shows "Accepted" under Asked and "Canceled" under Volunteers. That's correct but reads oddly, and it predates this run.
- Dark mode wasn't checked.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** These all pass:
- `npm run check`: 34 tests
- `npm run check:docs`: prosekeep on the docs and 401 interface strings, the 8-word screen limit, and the replaced-wording list
- the walkthrough at phone and desktop widths

**Risk:**
- Links already sent during testing still work. Only the words changed.
- The placeholder collection name and the stored values (`yes`, `no`, `few`, `everyone`, `hand`) didn't change, so exports and AT Protocol records keep their shape. Requirement text in posted records now reads "Team: Desk crew".

## 6. Change: what happens next
1. Owner reviews the replacement table in `EDITORIAL.md`.
2. Next run: check new wording against the table and a named design system before writing it.
