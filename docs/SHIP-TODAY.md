# Ship today: October 24, 2026

Replaces the October 21 plan. What changed and why is in the "What changed" section of [PRODUCT-PRD.md](PRODUCT-PRD.md) and in [docs/decisions/](decisions/).

## Shipping decision

Ship a public **working beta** that completes one real activation loop: approved volunteers come in, an opportunity goes out in rounds, a volunteer says yes from a phone, and the work is recorded as done when its time passes. It is an end to end product, not a slideshow. It uses its own data and API. Do not promise outreach to real volunteers until the launch blockers below pass.

Application code goes in this repository, `quarterback/voluntold`. The product name is temporary.

## Hard scope for today's build

**Must be working**

1. Organizer sign in, create an organization, and add a second admin.
2. CSV import of approved volunteers: name, email, phone, tier, skills and availability as free text, and an optional "last helped" date. Likely duplicates are shown for merging. Rows with no contact information go on a separate list.
3. Organizer types a need. The model proposes opportunities. If the model is missing or down, an editable manual draft works. The organizer edits and approves.
4. Approving an opportunity drafts round 1 by the rules in [MOBILIZATION-PRD.md](MOBILIZATION-PRD.md#choosing-who-gets-asked). The Review screen shows each draft with its one line reason. The coordinator ticks drafts and taps "Approve N".
5. Approved offers go out by email when a provider key is set. Without one, the coordinator copies each person's link.
6. The volunteer opens the link on a phone with no account and answers Yes or No. The first yes answers fill the slots. A later yes gets "This one is already filled." Remaining offers close when the opportunity fills.
7. Cron jobs expire offers, send the next round, send reminders the day before, run the weekly draft run, and move `accepted` contributions to `done` when the window ends or the due date passes.
8. Today lists decisions. People groups volunteers by tier and sorts them by wait, with a plain status sentence for each.
9. The volunteer's page shows what is coming up with "I can't make it" (which reopens the slot), a way to flag a blocker, "Mark done" for outcome work, past work, open slots they can take, take a break until a date, change tier, and stop all contact.
10. Offline: the app opens with no connection and shows the last synced records. Drafts approved offline go into the outbox and are sent after reconnecting, exactly once.
11. CSV export of contributions and volunteers.
12. Sample mode with two organizations, clearly labeled as sample data.

**Launch blockers:** tenant isolation, organizer authentication, scoped token checks and revocation, last slot protection, the weekly offer limit enforced at send time, contact consent, outbox replay that never applies an action twice, basic rate limits, a layout that works on phones and by keyboard, database migrations, and working deploy instructions.

**Cut first if delayed,** in this order:

1. Person first work suggestions from the model (skip that draft)
2. The weekly draft run (a "Draft asks now" button on Today instead)
3. Reminder emails
4. Model drafting of opportunities (manual fields only)
5. Email delivery (copied links only)
6. Offline writes (keep offline reading)

**Deferred:** text messages, Slack and Discord, urgent asks, intake switches and waitlists by tier, roles with requirements and renewal, Google Drive and sheet write back, several coordinators with their own work, recurring templates, billing, self hosting, discovery across organizations, native mobile apps, bylaws and governance tools.

## Screens for today

All in Material 3 ([0004](decisions/0004-material-3-for-the-interface.md)), built for a 412 px wide phone first. Navigation bar: Today, Work, People, Intake.

| Screen | What it holds |
|---|---|
| Today | Decisions, each a row that opens one screen. This week's work and how full each piece is. An empty state. |
| Review drafts | Each draft with its avatar, name, ask, time and reason, and a checkbox. A bottom bar with "N of M selected" and "Approve N". An offline banner when there is no connection. |
| An opportunity | Time, place, requirements as chips, a progress bar of filled slots, who said yes, and each round with its counts. "Change time" and "Send round N now". |
| Work | Ongoing work and projects, with lead, schedule, open slots and drafts waiting. "Add work". |
| People | Tier filter chips with counts, sorted by wait. Each row: skills, availability and a status sentence. |
| Intake | CSV import, private invitations, and new people waiting for approval. |
| Volunteer page | Coming up with "I can't make it", flag a blocker, mark outcome work done, past work, open slots to take, take a break, how often, stop contact. No login. |
| Offer email | The ask in plain words, Yes and No links, a link to their page, and how to stop emails. |

Screen copy follows the rules in [PRODUCT-PRD.md](PRODUCT-PRD.md#v0-capabilities-ship-together-as-one-working-slice): buttons say what they do, status is a sentence, and no internal names appear.

## Sample data

**Organization 1:** a local design association chapter with a public lecture next Thursday. Its need produces: check the event page (60 minutes, due Wednesday), prepare check in instructions (45 minutes), and the registration desk from 12:00 to 14:00 (coverage, 2 people).

The opportunities suggest these skills: the event page asks for communications or design, the check in instructions for writing, and the desk for events.

Its CSV has 20 approved volunteers, including:

- Alex: communications, weekday evenings, Seasonal, last helped in August
- Sam: design, one afternoon a month, One time, never asked
- Jordan: events, with a current window that starts next month, Regular
- Dr. Ana: physician, weekday evenings, never asked. Her skills match none of the suggested skills, so the weekly draft run gives her a person first suggestion.
- Rae and Lee: ordinary rows
- Bea S. and Beatrice Smith with the same email: a likely duplicate pair
- one row with a name and no contact information

After the import, the seed script gives Rae three expired offers in a row, which makes her `inactive`, and pauses Lee until November 15.

Matching must leave Jordan out of this week's desk shift, leave Rae and Lee out of every draft, rank Sam ahead of Alex for the event page (both strong fits, and Sam was never asked), and never accept on anyone's behalf.

**Organization 2:** a neighborhood arts group with its own admin and volunteers. Tenant separation must stop it from reading, offering or exporting anything of Organization 1's.

## Work sequence for coding agents

**Hour 0 to 1: foundation**

- Deploy target, lockfile, `env.example`, migrations, seed script, check and test commands.
- Organizer authentication and two organization authorization tests. Document the cloud secrets needed without committing any.
- PWA shell: service worker, Dexie database, sync endpoint stub.

**Hour 1 to 3: the loop on the server**

- Import, volunteers and statuses, needs and opportunities.
- Eligibility, ranking and round sizing as plain functions with unit tests against the sample data.
- Offers and contributions by the state tables, with last slot protection and the weekly limit at send time.
- Cron jobs for expiry, next rounds and `done`.
- The ops endpoint with `client_op_id` handling.
- API tests for every allowed and forbidden state change.

**Hour 3 to 5: screens**

- Today, Review drafts, an opportunity, Work, People, Intake, volunteer page, offer email.
- The model adapter behind an interface with a timeout and a manual fallback. No model key in the browser.
- Offline reading and the outbox.
- A browser test through the whole loop on a phone sized viewport.

**Hour 5 to 7: deploy and check**

- Deploy a preview to a public URL. Inspect it at phone and desktop sizes.
- Run the live smoke test below with real persistence. Run the security and abuse checks. Check error monitoring and the cost meter.
- If the gates pass, real organizations can be invited. If not, publish a demo only site and keep real data off.

These timings are an aggressive target for an agent assisted build with hosting and auth credentials ready. They are not a guarantee.

## Live smoke test

1. A new organizer creates "Chapter A", imports the sample CSV and confirms the people agreed to be contacted. The duplicate pair and the no contact row show as expected. Run the seed step for Rae and Lee.
2. They enter "Need help for a public lecture," edit the drafts, and approve "Registration desk, 12:00 to 14:00, 2 people."
3. Review shows round 1 with reasons. Rae and Lee are not in it. They approve it.
4. In two other browsers on phone sized windows, two volunteers open their links and say yes. The opportunity shows 2 of 2. A third volunteer says yes and gets "already filled."
5. Turn the network off in the coordinator's browser. Approve a draft for another opportunity. Turn it back on. The offer goes out once, and only once.
6. One volunteer taps "I can't make it." The slot reopens and the next round goes out. A volunteer from that round says yes, and the opportunity is full again.
7. Move the clock past the window in the test environment. Both contributions are `done`, with nobody confirming them.
8. Export the CSV. Refresh every browser, and the state persists.
9. Create "Chapter B" under a different organizer. Cross organization API requests and reused tokens are all rejected. Two volunteers answering yes for the last slot at the same moment: exactly one gets it.

## Go or no go

**Go:** a deployed URL, expected routes return 200, a persistent database, role and tenant checks pass, expired and revoked links fail closed, the loop completes on a phone, offline replay applies once, the test suite passes, no volunteer personal data appears to unauthenticated users in page HTML or the API, and logging is good enough to diagnose problems.

**No go for live data:** any missing tenant isolation, uncertain token checks, no way to stop offers, the weekly limit not enforced on the server, simulated answers shown as real, a broken phone flow, or unconfigured auth or secrets. In that case a seed only demo can still ship today with real volunteer data disabled.

## Right after launch

- Start text message registration ([0005](decisions/0005-email-first-then-text-then-slack.md)) so it is approved when the text release is ready.
- Fix blockers before adding channels.
- Publish operating cost without disclosing personal data.
