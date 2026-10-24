# PRD: shaping work and asking people

**Release:** v0 | **Revised:** October 24, 2026 | **First written:** October 21, 2026

## Problem

Organizations know their goals and have approved volunteers, but cannot turn the work into asks a person can comfortably say yes to. They define a standing position where one task would do, or keep a long shift whole when it could be split. They also cannot see who has gone longest without being asked, so the same few people get every ask.

## Goal

Help coordinators turn a real need into clear opportunities, ask the right approved people in the right order, and keep a record without anyone confirming the work afterward.

## Need to opportunity

1. The organizer types a need in their own words, such as "We have a chapter event in three weeks and need help getting ready."
2. The model lists what is unknown: the outcome, deadline, time and place, materials or access, who decides, whether continuous coverage is essential, and who answers volunteer questions.
3. The organizer answers or marks each one unknown. Unknowns stay visible and are never invented away.
4. The model proposes one or more draft opportunities. Each has its own outcome, a realistic effort range, earliest start, due date, a person to ask for help, prerequisites, instructions, suggested skills, and whether it is single, repeatable or recurring.
5. The organizer edits and approves each one. Approving it publishes it to its audience and drafts its first round of offers. The coordinator approves that round on the Review screen.
6. Offers go out in rounds until it is full, as described below. A volunteer chooses whether to say yes.
7. A volunteer who said yes sees what to do, who to find and any linked document. They can flag a blocker, step back, or for outcome work, mark it done early.
8. The contribution becomes `done` when its time passes. No one confirms it ([0002](../decisions/0002-the-schedule-is-the-record.md)).

Every step works by hand with no model.

## Two kinds of work

**Outcome work:** for example, review an event page and send suggested edits. It can be done any time before a due date. Effort is estimated, not clocked.

**Coverage work:** for example, check in attendees from 12:00 to 14:00. It has a start, an end, a number of people needed and a replacement rule. A volunteer who steps back reopens the slot, and the next round goes out.

Recurring work will be an opportunity template that produces separate opportunities, not a permanent position. Templates come in a later release.

## Required fields on publish

- Short title and a clear result
- Organization and coordinator contact
- Effort estimate, or the coverage window
- Due date, or the window
- Place, or remote
- Access or training requirements, if any
- Person to ask for help
- Number of people needed (default 1)
- Visibility: private (offers only), unlisted link, or public

Optional: a linked document such as a run of show, dependencies, accessibility notes, work that must come first, and suggested skills.

## States

This is the only state model. The database, API, screens and CSV export all use these names. Screens show them as plain sentences, never as raw state names.

**Need:** `draft` → `scoping` → `ready` → `closed`.

**Opportunity**

| State | Meaning | Next |
|---|---|---|
| `draft` | Being written. Not visible to volunteers. | `published`, `canceled` |
| `published` | Visible to its audience and being offered. At least one slot open. | `filled`, `completed`, `canceled` |
| `filled` | Every slot is held by a contribution. | `published` (someone stepped back), `completed`, `canceled` |
| `completed` | Its window ended or due date passed. Set by the system. | none |
| `canceled` | The organizer called off the work. | none |

**Offer** (an "ask" on screen)

| State | Meaning | Next |
|---|---|---|
| `proposed` | Drafted by the tool or a coordinator. The volunteer cannot see it. | `sent`, `retracted` |
| `sent` | A coordinator approved it, or it went out in a later round of an approved opportunity. | `accepted`, `declined`, `expired`, `closed`, `retracted` |
| `accepted` | The volunteer said yes while a slot was open. A contribution was created. | none |
| `declined` | The volunteer said no. | none |
| `expired` | Reached `expires_at` with no answer. Counts toward `unanswered_in_a_row`. | none |
| `closed` | The opportunity filled or was canceled before an answer. A later yes gets "This one is already filled. Thanks for saying yes." It does not count as unanswered. | none |
| `retracted` | A coordinator pulled it back before an answer. | none |

**Contribution:** created when a volunteer says yes to an offer, or takes an open slot from their page.

| State | Meaning | Holds a slot | Next |
|---|---|---|---|
| `accepted` | Said yes. The work is ahead. | yes | `blocked`, `done`, `withdrawn`, `canceled` |
| `blocked` | The volunteer flagged a blocker with a note. Shows on Today. | yes | `accepted`, `done`, `missed`, `withdrawn`, `canceled` |
| `done` | The window ended or the due date passed while `accepted`, or the volunteer marked outcome work done. Set by the system or the volunteer. | yes | `missed` |
| `withdrawn` | The volunteer stepped back before the work. The slot reopens and the next round goes out. | no | none |
| `canceled` | The opportunity was canceled. | no | none |
| `missed` | A coordinator corrected the record afterward. Nothing prompts this. | no | none |

The volunteer moves a contribution to `accepted`, `blocked`, `withdrawn` or, for outcome work, `done`. The system moves `accepted` to `done` when the time passes. A `blocked` contribution stays `blocked` past its time and shows on Today until a coordinator marks it `done` or `missed`. The opportunity still becomes `completed` on time. Either side can clear a blocker before the time passes. A coordinator can mark `done` work `missed`, or cancel the opportunity.

**Answers that arrive late.** A yes on an offer that is no longer `sent`:

- `expired` or `closed`, with a slot open and the person still eligible: treated as taking the open slot. A contribution is created, and the offer keeps its state.
- `expired` or `closed`, with no slot open: "This one is already filled. Thanks for saying yes."
- `retracted`: "This ask was withdrawn."

Any late answer, yes or no, still counts as an answer for `unanswered_in_a_row`. No AI action can move any state for either side. Every change writes a timestamped event.

## Choosing who gets asked

**Hard filters.** A person is eligible only if all of these hold:

- status `approved`
- permission to be contacted on their channel (email permission in v0)
- under the weekly limit: fewer than 2 offers sent to them in the last 7 days, across the organization (a setting)
- no current availability window that misses the work: a current window must overlap the coverage window, or leave room for the estimate before the due date. People with no current window pass ([ACTIVATION-PRD.md](ACTIVATION-PRD.md#availability-without-chasing)).
- the opportunity is not an indivisible coverage slot longer than their stated capacity
- they meet required prerequisites and location
- no open offer to them for the same opportunity
- no contribution of theirs overlaps the same time

**Ranking among eligible people:**

1. Fit band:
   - **strong:** one of the person's skill tags matches a suggested skill
   - **some:** no skill tag matches, but an interest or a preferred kind of work matches
   - **none:** nothing matches, or the opportunity suggests no skills
2. Within a band, longest wait first
3. Then higher past yes rate

Every tier fits every opportunity in v0. Recurring templates, which will prefer Regular and Core, come later.

Wait counts from the person's last offer. An imported "last helped" date stands in for a last offer. A person never offered anything, with no "last helped" date, counts as having waited longest.

Each draft stores the facts behind it, and shows one line of reason built from them, such as "Physician. Free weekday evenings. Never asked." The model may write the line, but only from those stored facts.

## Rounds

- **Round size:** add people in rank order until their expected yes count covers the open slots. Expected yes for a person is their past yes rate, or 0.35 with fewer than 3 past offers. Stop at 4 times the open slots.
- **Expiry:** an offer for coverage work expires 24 hours after sending, or 6 hours before the window starts, whichever comes first. An offer for outcome work expires after 48 hours. Both are settings.
- **Next round:** when a round's offers have expired or been declined and slots remain, the next round goes to the next people in rank order. A coordinator can send the next round sooner with "Send round N now."
- **Filling:** the first yes answers fill the slots. When the last slot fills, the remaining `sent` offers become `closed`. No message goes out for that. A later yes gets the "already filled" reply.
- **Reminder:** the day before coverage work, or the day before a due date, the volunteer gets a reminder with how to start and a way to say they can't make it. That reopens the slot.
- **Not filling:** if no eligible people remain, or the window starts within 48 hours with open slots, Today shows it. The coordinator can change the time, change the requirements, or drop it.

Reminders and "already filled" replies do not count toward the weekly limit.

The weekly limit is checked again at send time. A person over the limit when a round goes out is skipped, and the next person in rank order takes their place. They are not held for later.

Round numbers count up for each opportunity. Asks for an opportunity from the weekly draft run take the next round number, and need approval like round 1.

## Copied link mode

When no email provider is configured, approving drafts marks the offers `sent` and shows each person's link with a Copy button. The coordinator sends them however they like. Later rounds and reminders are not sent on their own in this mode. Each one appears on Today as a list of links to copy, at the time it would have gone out.

## The weekly draft run

Once a week (Monday at 7:00, the organization's time, by default), the tool drafts asks for approved people whose wait is past their tier's threshold ([ACTIVATION-PRD.md](ACTIVATION-PRD.md#tiers)), longest wait first.

- For each person, it drafts an offer for the open opportunity they are eligible for in the highest fit band.
- If they are eligible for none, or only in the "none" band, the model suggests a new piece of work drawn from the person's skills and the organization's stated needs. For example, a physician free on weekday evenings could teach staff to spot cold weather injuries. The suggestion lands as a draft opportunity (one slot, private) with the offer drafted for it. Approving the offer publishes that opportunity. Skipping it discards both.
- The drafts land on Today as "Review N draft asks." Nothing is sent until a coordinator approves it.

## Today

v0 shows these, newest decisions first:

- Review draft asks (from the weekly run, or a newly approved opportunity)
- An opportunity not filling
- New people waiting for approval
- A blocked contribution
- A suggested tier change
- An action made offline that the server rejected, with the reason ([0003](../decisions/0003-coordinator-app-works-offline.md))

Below the list: this week's work and how full each piece is. When the list is empty, Today says "Nothing needs a decision" and when the next drafts arrive.

## Example test case

Need: "Our local arts chapter has a public program Thursday, 10 a.m. to 2 p.m. The registration and welcome desk must be staffed the whole time. Marketing needs review before Wednesday."

Suggested breakdown:

- Check the event page: 45 to 75 minutes, outcome work, due Wednesday.
- Prepare accessible check in instructions: 60 minutes, outcome work.
- Welcome desk 10:00 to 12:00: coverage, one person.
- Welcome desk 12:00 to 14:00: coverage, one person.

A volunteer free from 10:45 to 12:00 can cover part of a slot only if the organizer agrees the slot can be split. The model never changes fixed coverage on its own. Someone free one afternoon is eligible for the outcome work if the prerequisites fit.

## Acceptance tests

- An organizer can publish a useful opportunity without an org chart.
- An organizer can change all AI text and publish without calling a model.
- Coverage work is never silently turned into flexible work.
- Two volunteers answering yes for the last slot at the same moment cannot both get it. The second gets "already filled."
- When the last slot fills, the other `sent` offers become `closed`, and no message goes out.
- A volunteer who steps back from coverage reopens the slot, moves the opportunity from `filled` to `published`, and starts the next round.
- An `accepted` contribution becomes `done` when its window ends, with no one confirming it.
- A `blocked` contribution keeps its slot, shows its note on Today, and stays `blocked` after its time passes.
- No person gets more than 2 offers in 7 days. Reminders and "already filled" replies do not count.
- The weekly run drafts nothing for people who are `paused`, `inactive`, `new` or `opted_out`.
- An opportunity nobody has been offered looks different from one offered but not yet answered.
- Organization A cannot publish, offer, edit or export organization B's work.
- Public links never show volunteer contact details or private notes.
