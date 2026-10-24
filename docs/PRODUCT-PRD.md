# Product requirements: volunteer activation

**Status:** v0 planning, revised October 24, 2026 | **Owner:** Vloora | **First written:** October 21, 2026
**Working title:** Volunteer Mobilization (not the final product name)

## What changed on October 24

The October 21 version made intake the front door and ended each contribution with an organizer confirming it. Decisions made since then change both.

- The product starts after a volunteer is approved. Recruiting and vetting stay outside it ([0001](decisions/0001-start-after-approval.md)).
- The schedule is the record. There is no confirm step and no timesheet ([0002](decisions/0002-the-schedule-is-the-record.md)).
- The coordinator's app works when the internet is down ([0003](decisions/0003-coordinator-app-works-offline.md)).
- The interface follows Material 3 ([0004](decisions/0004-material-3-for-the-interface.md)).
- Offers go out by email first, then by text, then by Slack ([0005](decisions/0005-email-first-then-text-then-slack.md)).
- New: volunteer tiers, a Today screen of drafted asks, rounds of offers, a weekly limit on asks per person, and import from spreadsheets.

## Product outcome

Help small organizations put the volunteers they have already approved to work, and keep them working.

A coordinator opens the app to a short list of decisions. Most are asks the app has drafted for people who have waited longest. The coordinator approves them, and they go out. Volunteers answer yes or no from a link, without an account. The app takes the routine asking, reminding and record keeping off the coordinator.

It also helps organizers turn a vague need into work someone can say yes to. Most volunteer work is loosely defined and hard to scope. Finding a driver is the easy case.

## Terms

- **Need:** what the organizer says is going on, in their own words.
- **Opportunity:** a published piece of work with an outcome, an effort estimate or a coverage window, and a number of slots.
- **Offer:** a request to one volunteer to take an opportunity. Screens and messages call it an **ask**. The code, database and API say `offer`.
- **Contribution:** the record created when a volunteer says yes. It ends `done`, `withdrawn`, `canceled` or `missed`.
- **Availability:** the times a volunteer said they can help. A window can have an end date.
- **Tier:** how much a volunteer wants to be asked: One time, Seasonal, Regular or Core.
- **Round:** one batch of offers for the same opportunity.
- **Wait:** time since a volunteer's last offer. Someone never offered anything counts as having waited longest ([MOBILIZATION-PRD.md](MOBILIZATION-PRD.md#choosing-who-gets-asked)).

States for each are defined once, in [MOBILIZATION-PRD.md](MOBILIZATION-PRD.md#states).

## Who it is for

- **Coordinator:** A staff member or a volunteer who decides what volunteers do. Often the only person managing volunteers. In groups run by volunteers, the job often changes hands every year or two. Has minutes for this work, not hours.
- **Approved volunteer:** Someone the organization has already accepted. May help once, for a season, regularly, or as a core volunteer. Mostly on a phone. Will not log in to a portal.
- **Organization admin:** Controls who can coordinate, contact permissions and access to records. Every organization should have at least two.
- **Organizations:** professional association chapters, community radio stations, food pantries, arts groups, clubs, mutual aid groups and small nonprofits. Many have no paid staff. Many run on spreadsheets, several email lists, Slack, or a volunteer tool used only to store contact details.

Standing roles, such as a radio show host or a board seat, are different from contributions. They come in a later release as roles with requirements. The tool must not treat them as contributions.

## Primary jobs

1. Bring in people the organization has already approved, by import or by private invitation.
2. Describe work in the organizer's own words and get back clarifying questions and drafted opportunities.
3. Draft asks for approved people who have waited longest. That includes suggesting new work for people whose skills fit no open opportunity.
4. Let the coordinator approve drafts in one pass. Send approved asks in rounds until the work is full.
5. Let volunteers answer yes or no from a link, take a break, change their tier and see their own record.
6. Let the schedule stand as the record. Work is done when its time passes.
7. Show who is active, what they hold and how long since each person was asked, over time.

## North star metric

**Completed contributions per active organization per 30 days.**

The product also shows each organization three activation measures:

- time from approval to first offer, for each volunteer
- wait, for each volunteer
- share of approved volunteers with a contribution in the last 90 days

Instrument the funnel separately: organizations with an approved opportunity, offers sent, offers answered, contributions accepted, contributions done, repeat opportunities and repeat contributors. Do not count drafts, records or sent offers as completed work.

Adoption targets (aspirational, not projections):

- First real pilot: 5 independent organizations complete at least one contribution.
- Initial public proof: 100 independently active organizations.
- Scale milestone: 1,000 independently active organizations with repeat use.
- Publish aggregated, privacy preserving service metrics and operating costs when sample sizes warrant.

## Product tenets

- **Start after approval.** The tool records that a person is approved. It does not recruit or vet.
- **Volunteers are people helping, not employees.** Small asks, plain language, flexible participation.
- **Nobody chases.** The tool never sends "are you still available?" messages. An ask is how availability gets checked. Three unanswered asks in a row stop asks to that person until they answer anything. Volunteers can pause themselves.
- **The schedule is the record.** No timesheets and no confirm step.
- **A match is a recommendation, an offer is a request, and a contribution exists only after the volunteer says yes.** No AI action and no coordinator action can accept for a volunteer.
- **A coordinator approves every drafted ask.** That covers round 1 of each opportunity and every ask from the weekly draft run. Rounds 2 and later of an opportunity, reminders and "already filled" replies go out on their own.
- **Nobody is asked too often.** A weekly limit on asks per person holds across the whole organization. The default is 2 in any 7 days.
- **Fixed coverage stays honest.** Model it as fixed. Let a volunteer drop out so the coordinator can find a replacement.
- **Help organizations find work they can hand off,** including work they have not defined yet.
- **It works when the internet is down,** for the coordinator.
- **Free hosted use,** low infrastructure cost and portable records.
- **Data about volunteers is private** to the organization and its coordinators.

## v0 capabilities (ship together as one working slice)

**Coordinator**

- Sign in, create an organization and add a second admin.
- Add approved volunteers by hand, by CSV import, or by sending a private invitation to the intake.
- Approve or decline people who arrived through a shared opportunity link.
- Describe a need, answer clarifying questions, and approve drafted opportunities. Every field can be edited, and every step works without a model.
- **Today:** a list of decisions, each opening one screen:
  - draft asks to review
  - an opportunity that is not filling
  - new people waiting for approval
  - a blocked contribution
  - a suggested tier change
  - an action made offline that the server rejected, with the reason
  - when nothing needs a decision, Today says so and says when the next drafts arrive
- **Review drafts:** each draft shows the person, the ask and one line on why it fits. The coordinator ticks the ones to send, edits any of them, and approves the selection.
- **Rounds:** an approved opportunity goes out in rounds until it is full, as `MOBILIZATION-PRD.md` describes.
- **Work:** opportunities with their open slots, lead and drafts waiting.
- **Intake:** import, private invitations, and new people waiting for approval. Tier switches and waitlists come in a later release.
- **People:** volunteers grouped by tier and sorted by wait. Each row says in a plain sentence where the person stands, for example "Taking a break until Nov 15" or "No reply to her last 3 asks, so asks stopped Oct 14."
- Export contributions and volunteers as CSV.
- **Offline:** the app opens and shows the last synced records with no connection. Approvals and edits made offline go out when the device reconnects.

**Volunteer**

- Open a private link from the organization, with no account.
- Answer a short intake: at most five prompts, as `ACTIVATION-PRD.md` lists.
- Read an ask: what to do, when, where, what it needs, and who to find. Answer Yes or No.
- On their own page: see what is coming up and say "I can't make it," see past work, see open slots they are eligible for and take one, take a break until a date, change tier, and stop all contact.
- Flag a blocker with a note.
- For outcome work, mark it done early if they want. Otherwise it is done at its due date.

Notes of unscheduled hours come with roles, in a later release.

**AI assistance**

- Turn a vague need into drafted opportunities and specific follow up questions.
- Write the wording of each drafted ask, and its one line reason.
- For an approved person who has waited a long time and fits no open opportunity, suggest a piece of work drawn from their skills and the organization's needs. The coordinator accepts, edits or skips it.
- Produce structured output validated against JSON schemas. Name what is uncertain instead of inventing scope.
- Never receive a volunteer's name, email or phone number. Prompts use internal IDs, skill tags and availability.
- Provide a fully usable manual path whenever the model is down or the budget cap is reached.

**Delivery**

- Asks go out by email when an email provider is configured. Otherwise the coordinator copies each link, as [MOBILIZATION-PRD.md](MOBILIZATION-PRD.md#copied-link-mode) describes.
- Opportunity links can be shared in the organization's own Slack, Discord, email or website. People who answer arrive as `new`, waiting for approval.

**Interface**

- Material 3, built for phones first, as [0004](decisions/0004-material-3-for-the-interface.md) sets out.
- Screen copy in plain language. Buttons say what they do ("Approve 3," "Send round 3 now," "I can't make it"). No arrows in labels, no status tags, and no internal names such as `offer` on screen.

## Planned releases after v0

In order. Each must work without the ones after it.

1. **Text messages:** asks, answers and reminders by text, once a number is registered ([0005](decisions/0005-email-first-then-text-then-slack.md)). STOP and HELP replies work.
2. **Intake and waitlist by tier:** a switch per tier. When a tier is off, new volunteers join its waitlist and hear when to expect an ask. Everyone who joins hears from the organization within 3 days.
3. **Urgent asks:** what, when, how many and where. The ask goes first to a lead who has led before, then to everyone who opted into urgent asks within the set distance.
4. **Roles with requirements:** a role such as show host can carry yearly requirements, such as 24 hours outside the show, two meetings and a training. Requirements fill in from contributions, RSVPs and one line notes of unscheduled hours, which this release adds. People short on hours get drafts first. Renewal goes to the host with their status, and the coordinator sees a list grouped by status. The coordinator decides each renewal.
5. **Slack:** asks as direct messages with Yes and No buttons.
6. **Spreadsheets and docs:** connect Google Drive. Read old signup tabs as history, and ask what colors mean. Draft work from documents such as a run of show. Write a roster tab and a schedule tab back into the organization's own sheet, protected, without touching any other tab.
7. **Several coordinators:** each owns their own work and sees only their own decisions on Today. The weekly limit still holds across all of them.

## Out of scope

- Recruiting, screening, references and background checks.
- Verifying hours, timesheets and confirm steps.
- Public volunteer marketplace, search and discovery across organizations.
- Records shared across organizations.
- CRM, donor management, fundraising and payments.
- Employee scheduling, clock in and clock out, performance reviews.
- Bylaw drafting, legal advice, board elections and certification.
- Paid plans and billing.
- A fully autonomous volunteer director.

## Business and deployment model

Core hosted product: free during adoption, with transparent fair use limits for abuse and AI use. No billing per volunteer. Larger organizations could later pay for advanced controls, reports across chapters, managed integrations or service guarantees. Self hosting is a future capability, supported by an exportable data model. Do not delay launch for it.

## Risks and countermeasures

- **Drafts read as busywork:** coordinators stop approving and volunteers stop saying yes. Each draft shows why it fits, every word can be edited, and person first suggestions come from the organization's own needs.
- **Asking too often:** the weekly limit, a pause any volunteer can set, and three unanswered asks stopping further asks.
- **Wrong work proposed:** opportunities need organizer editing and approval.
- **Sensitive information:** public opportunity pages never show volunteer details. Model prompts never carry contact details.
- **Coordinator turnover:** two admins from the start. The full history stays with the organization.
- **Offline conflicts:** actions replay in order through the server's rules, and a rejected action shows on Today with its reason.
- **Texting held up by registration:** email ships first, and registration starts the day v0 ships.
- **High AI bills:** inference only on an explicit action or a scheduled draft run, with drafts cached, and budgets per organization and globally.
- **Spam:** throttle offers and public endpoints, and require permission to contact each person.

## Release acceptance

A first time coordinator imports 20 approved volunteers from a CSV, publishes one opportunity and approves a set of drafts in under 15 minutes, using sample data. A volunteer answers an ask on a phone without an account. The opportunity fills, a late yes gets an "already filled" message, and the contribution becomes `done` when its window ends with no one confirming it. The coordinator can approve a draft with the device offline, and the ask goes out after reconnecting. All state persists on reload. Tenant isolation, scoped link expiry and revocation, authorization, form validation, spam controls and basic monitoring pass automated tests. Public release with real volunteer information waits until these gates pass.
