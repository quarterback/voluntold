# PRD: activating approved volunteers

**Release:** v0 | **Revised:** October 24, 2026 | **First written:** October 21, 2026

## Problem

Organizations approve volunteers and then fail to put them to work. The person who said yes hears nothing for weeks, and drifts away. Nobody has the time to work out what each person could do, or to chase people to ask if they are still free.

England's NHS Volunteer Responders program shows the pattern at scale. About 750,000 people signed up, and 600,000 were ready after vetting. Only about 75,000 tasks were logged in the first month ([Gulf Times](https://www.gulf-times.com/story/662306/virus-crisis-volunteers-frustrated-at-lack-of-tasks)). Of volunteers who had done a task, 65% were satisfied, against 11% of those still waiting for one ([Royal Voluntary Service](https://www.royalvoluntaryservice.org.uk/media/kjdpkebn/working_paper_two_patient_findings_271120.pdf)).

## Goal

Every approved volunteer gets a first ask soon after approval, and gets asked again before they drift. The coordinator does not chase anyone to make that happen.

## How people come in

All routes write to one organization's volunteer records. Recruiting and vetting happen outside the tool ([0001](../decisions/0001-start-after-approval.md)).

1. **Import:** the coordinator uploads a CSV of people the organization has already approved. The importer maps columns, drafts tiers and availability from free text for the coordinator to correct, and shows likely duplicates within the file for the coordinator to merge. A "last helped" column, if present, sets each person's wait from day one. Imported people are `approved`. People with no email and no phone are held on the import's "no contact information" list, not added to the roster, until the coordinator fills them in or drops them.

Before the import finishes, the coordinator confirms that these people agreed to be contacted by the organization. That sets email permission for everyone imported. Permission for text messages needs its own consent, given by the volunteer.
2. **Private invitation:** the coordinator adds a person by name and contact method, and gets a private link to the intake. Nothing is sent without the coordinator's action. The person is `invited` until they answer, then `approved`.
3. **Shared opportunity link:** someone opens an opportunity shared in the organization's own channels, answers the intake, and says they are interested. They arrive as `new`. They get no offers until a coordinator approves them on Today. Approving them drafts an offer for that opportunity, if it still has an open slot and they are eligible. The coordinator approves that draft like any other. Declining them sets them to `declined`.

Reuse an existing record only when a person arrives through a private link already tied to it. A matching email or name is not proof of identity, because anyone can type one. Shared link responses create a new record, and a coordinator can merge duplicates by hand within their own organization. Never merge volunteers across organizations.

## Intake

A form that works on a phone, with at most five prompts:

- What would you like to be called?
- What would you enjoy helping with, or what do you know how to do? Plain text, with optional suggestions. No rigid list.
- How often do you want to be asked? One time, Seasonal, Regular or Core, each with a one line description.
- When can you usually help? Broad windows such as weekday evenings or Saturday mornings, with an optional end date.
- How should we reach you? Email now, text later. Consent to be contacted, and a way to change it.

Optional: access needs, remote or in person, experience notes, kinds of work they prefer. Never ask for a résumé, full address, gender, birth date, demographic details, employer or social accounts.

A volunteer who stops all contact can still finish work they already said yes to.

## Tiers

| Tier | Plain description shown to the volunteer |
|---|---|
| One time | A single shift or task |
| Seasonal | Regular help for a few months |
| Regular | Weekly or monthly, with no end date |
| Core | 20 hours a month or more |

The volunteer chooses at intake. When someone's record stops fitting, Today suggests a change. The coordinator moves them, or the volunteer changes it on their own page. Suggestions in v0:

- One time or Seasonal, with 3 or more contributions in the last 90 days: suggest Regular. For example: "Signed up for One time. Said yes to 5 of 6 asks since Aug 1."
- Regular or Core, with no yes in the last 90 days and at least 3 offers: suggest One time.

Tiers set how often the weekly draft run reaches someone. A person is drafted only once their wait passes their tier's threshold:

| Tier | Drafted after a wait of (default) |
|---|---|
| One time | 90 days |
| Seasonal | 28 days |
| Regular | 14 days |
| Core | 7 days |

Recurring work comes with templates in a later release, and will prefer Regular and Core.

## Volunteer status

| Status | Meaning | Gets offers |
|---|---|---|
| `invited` | Private invitation created. No answer yet. | no |
| `new` | Answered through a shared link. Waiting for a coordinator's approval. | no |
| `approved` | Approved and reachable. | yes |
| `paused` | The volunteer asked for a break until a date. Returns to `approved` on that date. | no |
| `inactive` | Did not answer 3 offers in a row. Returns to `approved` when they answer any offer, including an expired one, or open their page. | no |
| `opted_out` | Stopped all contact. Can still finish accepted work, and still gets reminders for it. Can turn contact back on from their own page. A coordinator cannot. | no |
| `declined` | A coordinator declined them after they arrived through a shared link. Kept for the record. | no |

`unanswered_in_a_row` goes back to 0 whenever the person answers any offer, yes or no.

"Has upcoming work" is shown, not stored. It is true when the person holds a contribution in `accepted` or `blocked`.

Avoid employee ideas such as hired and fired, on duty, attendance compliance, or a manager approving the person's performance.

## Availability without chasing

Availability is a signal, not a contract. The tool never sends a message that only asks whether someone is still available. The next ask does that job, and the answer updates the record.

When a stated window ends, the person stays `approved`. Someone with no stated window, or whose windows have all ended, passes the availability filter as "ask me as things come up." Their draft's reason line says so, for example "Said October only," and the coordinator decides. Only a current window that does not overlap the work keeps someone out.

## Matching attributes

Store `skill_tags`, `interests`, `preferred_task_types`, `tier`, availability windows (`starts_at`, `ends_at`, weekly pattern), `capacity_minutes` (optional), `contact_channel`, `email_permission`, `text_permission`, `paused_until`, `last_helped_at` (from import), `last_offered_at`, `unanswered_in_a_row`, `approved_at`.

Eligibility filters, ranking and reasons are defined in [MOBILIZATION-PRD.md](MOBILIZATION-PRD.md#choosing-who-gets-asked). A model may suggest tags from free text, and the coordinator or volunteer can correct them. Never show a numerical skill score.

## Acceptance tests

- Intake completes on a 375 px phone layout and by keyboard only on a desktop.
- A CSV with known duplicates shows each likely pair for merging. Nothing merges without the coordinator.
- A CSV row with no email and no phone lands on the "no contact information" list, not in the roster.
- An import cannot finish until the coordinator confirms the people agreed to be contacted.
- A volunteer whose only window ended last month appears in drafts, with a reason line saying so.
- A person who arrives through a shared link is `new` and appears in no draft until approved.
- A volunteer who stops all contact gets no further offers.
- A volunteer `paused` until a date appears in no draft before that date, and does after it.
- After 3 offers in a row expire unanswered, the volunteer is `inactive`, appears in no draft, and People says why.
- No message the tool sends asks only whether someone is still available.
- A person available for 60 minutes is not drafted for an indivisible 4 hour coverage slot.
- The same email at two organizations does not leak data between them.
- Expired or revoked invitation links cannot view or edit private records.
- Submitting the intake twice does not create two records.
