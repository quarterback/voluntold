# Spec: pilot version

**Status:** the build spec for the first pilot with 3 to 5 organizations. Written October 24, 2026.
**Product name:** undecided. "Voluntold" is the repository name only.

This is the only document a coding agent needs to build the pilot. Ideas that are not in the pilot are in [LATER.md](LATER.md). The reasons behind each choice are in [decisions/](decisions/). The October 21 to 24 planning docs are in [archive/](archive/) for reference. Where they disagree with this spec, this spec wins.

## What it does

Organizations already have volunteers. Most don't know how to put them to work, so people who said they'd help are never asked. This tool does three things:

1. **Organize the volunteers you have,** by the details your organization cares about: skills, age, experience, languages, or anything else. The organization decides what those details are.
2. **Give the organization a way to put people to work.** The coordinator writes a task, says what it needs, and picks a ready-made way of asking people. The tool works out who fits and who has waited longest, and tells the coordinator when to ask more.
3. **Bring in the list you already have,** from any file.

It is not a contact database, a sign-up form or a recruiting tool. People come in already accepted by the organization. Everything in the tool is about getting them asked, getting a yes, and keeping them involved.

## How it grows

- This spec stays under about 2,500 words.
- A feature moves from [LATER.md](LATER.md) into this spec only when a pilot organization needs it. Each move gets a short decision record.
- If a feature needs more than a page of detail, it gets its own file in `docs/specs/`, and this spec links to it.
- The building blocks below are the base. New features add fields or new blocks. They don't change what existing fields mean.

## The building blocks

The whole tool is a set of building blocks, which are schemas. None of them assumes a kind of work. A food pantry, a radio station and a design chapter fill in the same blocks with different details.

**Organization.** Name. Its settings: how many asks one person can get in 7 days (default 2), and a link to the organization's own sign-up page, for people who aren't volunteers yet. Optional: its AT Protocol account.

**Member.** A person who runs things in the tool. Their role is admin, coordinator or team lead. Every organization should have at least two admins.

**Field.** A detail the organization tracks about volunteers. It has a label and a type: text, number, date, one choice, many choices, or yes/no. Choice fields have a list of options the organization writes, for example the experience levels "New", "Has done it before" and "Can lead". New organizations start with four suggested fields they can rename or delete: Skills, Experience, Age group and Availability.

**Volunteer.** Name, email, phone, and a value for each field. Also:
- the date the organization confirmed the person agreed to be contacted
- status: active, paused until a date, or stopped
- the teams they're on
- the last time they were asked

**Team.** An optional group inside the organization, such as "Sound crew" or "Events". Team leads add people to their own team and take them off. This is how a team decides who can do its work.

**Task.** The work. It has:
- a title and a description of what to do
- when: at a set time (start and end), by a date, or no date
- a place: a public part ("East Side branch") and a private part (the street address)
- how many people are needed
- its requirements
- how it asks people (see "Ways to ask")
- whether it is posted publicly
- an optional team that owns it

Its status is draft, open, filled, canceled or done.

**Requirement.** A rule that a volunteer must meet to be asked for a task. It is written against the organization's own fields: "Experience is Can lead", "Skills includes Audio", "Age group is 18 or over", "Food safety training is yes". A task can also require "on the Sound crew team". A task can have any number of requirements, and a volunteer must meet all of them.

**Ask.** One volunteer asked about one task, through a private link. It is waiting, yes, no, expired, or closed (when the task filled first).

**Spot.** Created when a volunteer says yes. It is holding, can't make it, done or missed.

**Import.** One file brought in: the file name, which column went to which field, how many rows were added, and the rows that were set aside.

**Event log.** Every change, with who made it and when.

## Bringing people in

The coordinator uploads a file: CSV, Excel, XML, JSON, a text file, a Word file or a PDF.

1. The tool reads the rows. CSV, Excel, XML and JSON are read directly. For text, Word and PDF files, a model pulls out the rows.
2. The tool suggests which column goes to which field and shows the first 10 rows. The coordinator fixes anything wrong. A column with no matching field can become a new field in one tap.
3. Likely duplicates (same email or phone) are shown side by side to merge or keep apart. Rows with no email or phone go on a separate list, because nobody can send those people a link.
4. The coordinator ticks "These people agreed to be contacted by us" before saving.

A coordinator can also add one person by hand. Nothing is saved until the coordinator confirms.

## Ways to ask

Each task uses one ready-made way to ask. The coordinator picks it when writing the task and can change the numbers.

- **A few at a time** (the default). Ask the people who fit and have waited longest, twice as many as the spots. If the task isn't full after 24 hours, Today says to ask the next group.
- **Everyone who fits.** Ask every eligible person at once. The first people to say yes get the spots.
- **Pick by hand.** The coordinator ticks people from the list of who fits.

**Who fits.** A volunteer can be asked about a task only if they:
- meet every requirement
- agreed to be contacted
- are active, not paused or stopped
- are under the weekly ask limit
- aren't already holding a spot at the same time

**Who goes first.** The person whose last ask was longest ago. Someone never asked goes before everyone else.

**Nobody chases.** The tool never sends "are you still available?" messages. After three asks in a row with no answer, the person is paused, and a coordinator sees it on Today. They become active again as soon as they answer anything.

## Sending asks

In the pilot, the tool sends nothing itself.

For each ask, the coordinator gets the person's private link and a short message to go with it: "Hi Sam, can you help with the registration desk on Thursday, 12:00 to 14:00? Answer here: [link]". There is a Copy button for each person, and "Copy all" for the whole group. The coordinator pastes it into email, a text, Slack or WhatsApp. Copying counts as sent.

An ask expires after 48 hours, or 6 hours before the task starts, whichever comes first.

## What the volunteer sees

No account. No app. A private link opens a page on their phone with:

- the task: what, when, the place, what it needs, and who to find
- **Yes** and **No**
- the work they've said yes to, each with **I can't make it**, which reopens the spot
- **Pause until** a date, and **Stop asking me**

A yes takes a spot if one is open. If the task is already full, they see "This one's already filled. Thank you." When the task fills, the other waiting asks close.

## Work is done when its time passes

There's no timesheet and no "confirm hours" step. A task set for a time is done when its end time passes. A task due by a date is done when the date passes. Every spot still holding then becomes done. A coordinator can mark a spot missed afterward. Nothing prompts them to.

## Screens for the coordinator

Built for phones first. Navigation: Today, Tasks, People, Settings.

- **Today:** the short list of things to do now:
  - time to ask the next group for a task
  - tasks starting within 48 hours that aren't full
  - people never asked
  - people paused after three unanswered asks
  - import rows set aside

  When there's nothing to do, it says so.
- **Tasks:** open tasks with how full they are, and **New task**. A task's page shows who said yes, who's waiting, and the next group to ask.
- **People:** everyone, with a filter for any field, team or status, sorted by longest since asked. A filter can be saved as a list ("Spanish speakers who can lead"). Each person's row says in a sentence where they stand: "Asked 3 weeks ago, said yes", "Never asked", "Paused until Nov 15".
- **Settings:** fields, teams, members, the weekly ask limit, the sign-up link, the AT Protocol account, import, and export.

Buttons say what they do: "Ask 6 people", "Copy all", "I can't make it". Status shows as a sentence, never a code.

## Tasks on AT Protocol

Tasks are the only thing that goes on AT Protocol. Nothing about volunteers ever does. See [decision 0006](decisions/0006-only-tasks-go-on-at-protocol.md).

- An organization can connect its AT Protocol account, such as its Bluesky account. Once it's connected, open tasks are posted publicly by default. Any task can be switched to private.
- A posted task is a record in the organization's own account. It holds the title, the description, when, the public part of the place, how many people are needed, the requirements as text, the status, and a link to the task's public page.
- A task set for a time is also written in the shared calendar format, `community.lexicon.calendar.event`, so calendar apps that read AT Protocol can show it.
- When the task fills, is canceled or is done, the record's status changes. If a coordinator switches the task to private, the record is deleted.
- The public page shows the task and says: "Already volunteer with us? Watch for your link. New? Sign up here", linking to the organization's own sign-up page.
- Never posted: names, contact details, field values, who was asked, who said yes or no, private addresses.

Our record format needs a name tied to a domain we own, such as `com.example.volunteer.task`. It can't be renamed once records exist, so choose the domain before the first real post.

## Export

An admin can download everything as CSV: volunteers with their fields, tasks, asks and spots. The download also comes as one JSON file with stable IDs, so a future version or another tool can import it.

## For the coding agent

**Stack:** Cloudflare Workers and D1. A React web app using MUI, themed from the Material 3 seed color `#00B8A9`, with dark mode from the same seed. Sign-in uses a managed service with email codes. Never build passwords. Add "Log in with Bluesky" only if the AT Protocol OAuth client passes a one-day test on Workers. If it doesn't, use the client on a small separate server or keep email sign-in and connect AT Protocol only for posting.

**Model for imports:** used only to pull rows out of text, Word and PDF files. Its output must be checked against a schema. Use a provider whose terms say it doesn't train on prompts or keep them. Record which provider and the date it was checked in a decision record before any real file goes through it.

**Must pass before real volunteer data goes in:**
- One organization can never read, ask or export another's data. There are API tests for every route.
- Private links: random tokens, stored only as hashes. Each is limited to one person and one organization, and can expire and be revoked. The token is removed from the URL after the link is opened. Tokens never appear in logs.
- Only one person can take the last spot, even when two say yes at the same moment. Test it with simultaneous requests.
- The weekly ask limit and the "who fits" rules are checked on the server.
- No volunteer details reach anyone signed out, in page HTML or the API.
- Rate limits on public routes. Database migrations. A seed script. Deploy instructions.

**Order:** sign-in and organizations, fields and volunteers, import, tasks and requirements, who fits, ways to ask and copy links, the volunteer page, done when time passes, Today, export, AT Protocol posting.

## The check before inviting pilot organizations

Using sample data on a phone-sized screen:

1. Create an organization and add a second admin. Add the fields Skills, Experience (New, Has done it before, Can lead) and Age group.
2. Import a 20-row CSV and a PDF list. Map the columns. Merge one duplicate. One row with no contact details is set aside.
3. Create a team, "Desk crew". Its lead adds 4 people.
4. Write a task: "Registration desk", Thursday 12:00 to 14:00, 2 people. It requires "Experience is Can lead" and "on Desk crew". Only people who meet both appear, ordered by longest wait.
5. Use "A few at a time". Copy all. Open two links in two other browsers and say yes. The task shows 2 of 2. A third person says yes and sees "already filled".
6. One person taps "I can't make it". Today says to ask the next group.
7. Connect an AT Protocol test account. The task appears in that account with no volunteer details. Switch it to private, and the record is gone.
8. Move the clock past Thursday 14:00. Both spots are done, and nobody confirmed anything.
9. A second organization can't see or reach any of the first one's data. Export works. Reloading keeps everything.

## How we'll know the pilot worked

Each organization sees these on its own:
- the share of its volunteers asked in the last 30 days
- the share who said yes to something in the last 30 days
- tasks filled

The pilot works if, after 6 weeks, more of each organization's volunteers did something than before the pilot, and coordinators used the tool every week without being reminded.
