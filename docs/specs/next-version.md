# Spec: next version

**Status:** build spec for the next version, written October 25, 2026. Items marked "proposed" need the owner's review before they're built. The reasons are in [decision 0011](../decisions/0011-product-model-and-direction.md).

**Builds on:** the pilot in [SPEC.md](../SPEC.md) and the demo in [decision 0010](../decisions/0010-activation-demo.md). Keep their building blocks. This spec adds fields and screens. It doesn't change what existing fields mean.

**Not a source:** the Figma Make mockup in `quarterback/VolunteerIntakeSystem`. Don't copy its screens.

## What the tool is for

The tool makes it easier for people to become active volunteers.

- **Coordinators** keep track of who is in their volunteer queue. They write tasks, sort out what needs doing, manage the task list and hand out work.
- **Volunteers** keep track of what's needed and what they've said yes to. If the organization allows it, they pick up work themselves.

The tool doesn't chase people, measure who drifted away, or rank people by how fast they answer.

## The model

"Partiful meets Airtable meets a POS system output." Each part covers one surface.

| Part | Surface | What it means here |
| --- | --- | --- |
| Partiful | What volunteers receive | A request opens a clean page with a date, a place and two buttons. People answer without an account. |
| Airtable and GitHub Projects | The coordinator's working view | Records with colored tags, several views of the same records, saved filters, and an activity log on each record. |
| A kitchen ticket screen | New and in-flight work | New work arrives as tickets. A ticket's color shows how long it has waited. Finished work clears with one tap. |

## Rules for every screen

1. **No conversations.** Each task, need and person has an activity log: created, tagged, requested, accepted, swapped, reported a problem, done. A reply from outside the app becomes one line in that log. Use the existing event log as the source.
2. **Volunteer screens are easy to scan.** One item per row. The same fact in the same place on every row. Date and time lead. One action per row.
3. **Coordinator screens can be dense.** Tags, counts and columns are fine.
4. **Clear beats big.** Strong type and consistent layout. No decorative graphics.
5. **Color means a tag.** Each tag keeps one color for good. Status uses words, never color alone.
6. **A person approves anything the model proposes,** except tags, which a coordinator can change at any time.

## 1. Needs inbox

New work lands in Needs before it becomes tasks. Linear's Triage inbox is the reference.

- **Where needs come from:** typed by a coordinator, pasted notes (section 2), or a team lead's request.
- **Each need shows:** a title, where it came from, how long it has waited, its tags, and the tasks proposed so far.
- **Actions:** Make tasks, Merge into an existing need, Park, and Decline. Park hides the need until a date the coordinator picks, or until someone adds to it.
- **Ticket color by wait time:** new, waiting longer than 2 days, and waiting longer than 7 days. The thresholds are a setting.

**Done when:** a coordinator can take a pasted note to approved tasks without leaving Needs, and a parked need returns on its date.

## 2. Notes into tasks

A coordinator pastes a list, meeting notes or a long description. The model proposes tasks.

- **Each proposal has:** a title, a description, when (a set time, by a date, or no date), how many people, requirements written against the organization's own fields, and tags.
- The coordinator approves, edits or removes each proposal. Nothing becomes a task until approved.
- Anything the model couldn't work out shows as an empty field, not a guess. For example, "How many people?" stays blank when the notes don't say.
- **Model provider:** the same rule as import ([0008](../decisions/0008-pilot-build-choices.md)). Its terms must say it doesn't train on prompts or keep them.

**Done when:** pasting the sample meeting notes in `samples/` produces proposals, and approving two of them creates two tasks under one need.

## 3. Tags the tool applies

Tags sort tasks, needs and people at a glance.

- Every organization has a tag set. It starts empty.
- When a task, need or person is created or imported, the model picks tags from the existing set.
- The model creates a new tag only when nothing in the set fits. New tags show a small "new" mark until a coordinator has seen them.
- A tag gets a color from a fixed palette when it's created, and keeps it.
- A coordinator can add, remove, rename or merge tags in one click. Merging moves every record to the kept tag.
- With no model configured, tagging is manual, and everything else still works.

**Done when:** importing `samples/volunteers.csv` tags people with no coordinator action, and merging "kitchen help" into "Kitchen" recolors every record.

## 4. Task list views

The task list works like a GitHub project. The data stays the same, and the coordinator switches views.

- **Views:** a list grouped by status, a board with a column for each status, and a calendar.
- **Each row or card shows:** the title, the date, a fill count ("1 of 2"), tags, and the need it belongs to.
- **Filters:** by tag, need, date, status and team. A coordinator can save a filter as a named view.

**Done when:** all three views show the same tasks, and a saved view reopens with its filters.

## 5. Task builder

Writing a task shows its size as you go.

- A block beside the form updates as fields fill in: people needed, total hours, when, and requirements.
- For work at a set time of 2 hours or longer, "Split into 2" makes two shorter tasks. This is the demo's existing split.
- The builder shows how many people in the queue fit the task right now, as a number with a link to the list.

**Done when:** changing "people needed" from 2 to 4 updates the block and the fit count without saving.

## 6. Assign screen (proposed)

The volunteer queue sits on one side, and open work on the other. Restaurant host tools, which show tables and waiting parties together, are the reference.

- **Left side:** people in the queue, filtered by tag, availability and team. Each person shows their tags and what they've said yes to this week.
- **Right side:** open tasks, each with its fill count. Selecting a task highlights the people who fit it.
- Dragging a person onto a task, or tapping Request, sends that person a request. The request is an activity, delivered as in section 9.

**Done when:** a coordinator can request three people for one task from this screen, and the task shows three pending requests.

## 7. Coverage strip and scope line (proposed)

- **Coverage strip:** for work at a set time, one strip per task across the day in 15-minute cells. Cells are covered, short or over. The shortfall shows as a number in each short cell. Call center scheduling grids are the reference.
- **Scope line:** for a need, a small chart with two lines over time. One is the total spots across its tasks, and the other is spots filled. When tasks are added, the total line steps up. Linear's cycle graph is the reference.

**Done when:** adding a task to a need moves the scope line, and cancelling a spot opens a short cell on the strip.

## 8. Rules for handing out work

Each organization picks one rule in Settings. The volunteer's page follows it.

| Rule | What volunteers see | Who decides |
| --- | --- | --- |
| Assigned only | Only work they were asked about | The coordinator |
| Raise your hand | Open work they fit, with "I'm interested" | The coordinator picks from the people interested, within a window the organization sets |
| Claim directly | Open work they fit, with "Take this" | The first person to claim it |

The demo's "open work to accept" becomes Claim directly. The default rule is proposed as Raise your hand, for the owner to confirm.

**Done when:** switching the rule changes the volunteer page with no other setup.

## 9. Notifications and delivery

- **In the app:** a notifications list for coordinators and volunteers. It covers new requests, answers, swaps, problem reports, and needs waiting past their threshold.
- **Installable:** the web app installs to the home screen. After someone taps to allow notifications, they get push notifications. On iPhone this needs iOS 16.4 or later.
- **Email only on request:** each person can turn on email for some or all notification types. Email requests carry Accept and Decline buttons that answer in the app. A reply with text becomes one activity line (rule 1).
- **First contact (owner to decide):** a newly approved volunteer hasn't installed anything. The options are to keep the pilot's copied link, to send one first email, or to show an install prompt on the first link someone opens. Until the owner decides, keep the copied link.
- **Desktop app (later):** an Electron build for coordinators, wrapping the same web app.

**Done when:** a coordinator gets an in-app notification when a volunteer accepts, and a volunteer who turned on email gets a request with working buttons.

## 10. The volunteer page

It keeps the demo's features: what to bring, files, who to find, Report a problem, and their own availability. It's laid out by rule 2:

- **Top:** their next commitment, with date, time, place and who to find.
- **Then:** their other commitments in date order.
- **Then:** open work they fit, if the organization's rule allows it.
- **At the bottom:** Pause and Unsubscribe.

**Done when:** a volunteer with three commitments can find the time and place of each without opening anything.

## 11. Look (proposed)

- **Type:** the owner's fonts. PP Object Sans for headings and PP Neue Montreal for text, from the font files in the owner's other repositories.
- **Tokens:** type, color, radius and spacing in one tokens file. Every screen reads from it.
- **Components:** keep the existing components and replace their theme. Don't rebuild components yet.
- **Volunteer screens** carry the bold type and color, because screenshots come from them.

The owner reviews the tokens before any screen changes.

## Out of scope

- Conversation threads.
- Measures or screens about people who stopped volunteering, and meters for how often someone was asked.
- Ranking volunteers by response speed.
- Recruiting and screening, which stay outside the tool ([0001](../decisions/0001-start-after-approval.md)).

## Open questions for the owner

1. How should a newly approved volunteer get their first request (section 9)?
2. Which rule should be the default (section 8)?
3. On the task page, the labels "Confirmed" and "Attended" suggest someone checked attendance. Decision [0002](../decisions/0002-the-schedule-is-the-record.md) says the schedule is the record. Which words should those statuses use?
4. Should tags also apply to needs from partner organizations, or only to the organization's own records?

## Build order

1. Tags (section 3), because the views and filters depend on them.
2. Activity log and notifications in the app (rule 1, section 9).
3. Needs inbox and notes into tasks (sections 1 and 2).
4. Task list views and task builder (sections 4 and 5).
5. Rules for handing out work and the volunteer page (sections 8 and 10).
6. The look (section 11), after the owner approves the tokens.
7. Assign screen, coverage strip and scope line (sections 6 and 7), after the owner reviews them.

## For the coding agent

- Work on a branch and open a pull request per numbered item in the build order.
- The owner said not to run test suites at this stage. Take phone and desktop screenshots of every changed screen and attach them to the pull request.
- Interface text follows `EDITORIAL.md`. The owner runs his own wording checks.
- Write a ClosedTab action record for each run, as `CLAUDE.md` says.
