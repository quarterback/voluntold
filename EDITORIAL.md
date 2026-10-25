# Editorial policy for this project

This document belongs to the product owner. The owner's latest explicit instruction takes precedence over anything here. Sections the owner hasn't filled in are marked "Owner to fill in".

## Purpose and audience

- **Publisher:** Vloora. The product name is undecided.
- **Readers:**
  - coordinators at small organizations, often volunteers themselves, with minutes to spare
  - volunteers answering an ask from a link on their phone
  - coding agents building from `docs/SPEC.md`
- **What the app should help people do:** ask the right volunteers for each task, and say yes or no quickly.
- **Source of product facts:** `docs/SPEC.md` and `docs/decisions/`.

## Which guide governs

| Writing | Governing guide |
|---|---|
| Interface text: screens, buttons, labels, messages | [Adobe Spectrum content standards](https://spectrum.adobe.com/page/voice-and-tone/), as the owner asked on October 25, 2026 |
| Buttons and confirmations | [Adobe Commerce Admin style guide, buttons and links](https://developer.adobe.com/commerce/admin-developer/style-guide/content/buttons-and-links), except its title case |
| Docs, decisions and records | The Vloora style manual (`quarterback/vloora`, `guides/style/source.md`) |
| Both | Plain language (`plain-language-default`) and prosekeep's Vloora profile |

## Voice and register

Adobe's three voice principles:
- **Rational:** clear and understandable. Not opinionated, funny or trendy.
- **Human:** friendly, honest and responsible. Acknowledge how people feel when something goes wrong.
- **Focused:** concise and simple. Describe only what's needed. Don't invent concepts.

Tone shifts with the moment, as in Adobe's tone spectrum: instructive most of the time, reassuring when people worry, supportive when something has gone wrong, and motivational rarely.

- **A representative paragraph:** Owner to fill in.

## Interface mechanics

Adobe rules, with the local decisions that apply:

- **Case:** sentence case for titles, buttons, labels and headings. No all caps except acronyms.
- **Punctuation:**
  - no periods in headings or buttons
  - no colon at the end of a field label
  - no exclamation marks
  - "and" instead of "&"
  - an ellipsis only to show work in progress ("Reading…") or to prompt a picker
- **Buttons:** a verb and a noun, three words or fewer: "Add person", "Cancel task", "Import 18 people". Common actions stand alone, as Polaris allows: Save, Edit, Publish, Cancel, Next, Copy. The primary button in a confirmation names the action. Never OK, Yes or No.
- **Confirmations:** the title asks the question ("Cancel this task?"). The buttons are the action and "Cancel" ("Delete person", "Cancel"), or "Go back" when the action is itself a cancel ("Cancel task", "Go back").
- **Errors:** lead with what happened, then how to fix it. Give the cause only when it helps. Save "sorry" for serious failures. Never blame the person. Use "we" and "you" to show who acts.
- **Empty states:** a short title and the action button.
- **Contractions:** use them, except in text about security, consent or deleting data.
- **Pronouns:** address people as "you". Don't speak as the user. Use "they" for a person.
- **Numbers:** numerals in labels, counts and tiles. Zero through nine as words in running sentences.
- **Times:** lowercase am and pm with no space, and no ":00" ("12pm", "9:30am"). A range shares the period when both match ("12 to 2pm").
- **Dates:** "Thu, Oct 29" in the interface. "October 29, 2026" in docs, as the Vloora manual sets.
- **Percentages:** "%" in the interface (Adobe). "percent" in docs (Vloora).
- **Status:** a word, never color alone. Badges carry the word.
- **No microcopy.** The owner set this on October 25, 2026. Screens carry only:
  - labels, buttons and headings
  - data and status
  - error messages, which say what went wrong

  Leave out helper text under fields, section notes, hints, example placeholders, subtitles that explain, and pleasantries. A confirmation is a question and two buttons, with no body text.
- **Standard wording.** The owner set this on October 25, 2026: use the words people already know from other apps, not wording made up for this one. Sources: [Apple HIG alerts](https://developer.apple.com/design/human-interface-guidelines/alerts), [GitHub Primer confirmation dialogs](https://primer.style/product/components/confirmation-dialog/guidelines), [Shopify Polaris buttons](https://polaris.shopify.com/components/actions/button), [Meetup](https://help.meetup.com/hc/en-us/articles/41229648295181-How-to-Join-an-Event-Waitlist-on-Meetup), [Luma](https://help.luma.com/p/waitlist.md) and the [HubSpot import](https://knowledge.hubspot.com/crm-setup/import-objects).

  | Use | Not |
  |---|---|
  | Accept, Decline, Accepted, Declined, Pending | Yes, No, Said yes, No answer yet |
  | Cancel spot | I can't make it, Give up spot |
  | Pause, Resume, Paused until | Take a break, End break, On a break until |
  | Unsubscribe, Unsubscribed | Stop asking me, Stop asks, Asked not to be contacted |
  | This task is full, Full | This one's already filled. Thank you. |
  | Publish, Save, Edit | Open task, Save and open, Save changes |
  | Confirmed, Canceled, Attended, No-show | Coming, Can't make it, Done, Missed |
  | Location, Contact, Description, Volunteers needed | Place, Who to find, What to do, People |
  | Custom fields, Field, Condition, Add option | Details, Rule, Add choice |
  | Map columns, Import as, Don't import, Next, Import history, Skipped | Match columns, Goes to, Skip, Find duplicates, Past imports, Set aside |
  | In batches, All eligible, Manual, Batch size | A few at a time, Everyone who fits, Pick by hand, Group size |
  | Not eligible, Missing requirement, Weekly limit reached, Schedule conflict | Can't ask, Asked enough this week, Busy then |
  | Reset link, Share link, Copy, Copy all | Get new link, Send this link, Copy message |

  The dismiss button in a confirmation is "Cancel" (Apple, Primer). When the action itself is a cancel ("Cancel task", "Cancel spot"), the dismiss button is "Go back", so two buttons never both say Cancel.
- **Length:** no string on a screen over 8 words, and no full sentences. No server message over 20 words. `npm run check:docs` enforces both.

## Writing mechanics for docs

Follow the Vloora style manual:
- sentence case
- the serial comma
- no em or en dashes, except an en dash in number ranges
- one through nine spelled out in text
- "percent" in text
- month, day and year in full in text

## Factual fidelity and decisions

- **Evidence:** say whether something was proposed, attempted, acknowledged, reported or independently verified. Records must say what was tested and what wasn't.
- **Decisions an agent may not revise:** anything in `docs/decisions/` marked as decided by the owner.
- **Citations:** link the primary source with its date.
- **When a human decides:** product scope, positioning, the product name, the record domain, and wording the spec names.

## Publishing checks

- **Source of truth:** `docs/SPEC.md` for behavior. The code in `src/` for interface text.
- **Checks:** `npm run check` (types, tests, build) and `npm run check:docs`. The docs check runs:
  - prosekeep on the docs and on every interface string
  - the Adobe rules above that a machine can check
  - the 20-word limit, the 8-word screen limit, and the list of replaced wording above
  - `closedtab check` on every record

  `node e2e/smoke.mjs` walks the pilot on a phone-sized screen.
- **Reviewers and sign-off:** Owner to fill in.
- **Content review cadence:** Owner to fill in.

## Reference standards

Run `prosekeep standards` to see the sourced modules. The `standards` array in `.editorial.json` lists the ones this project uses. An external reference is guidance until it's adopted here.
