# 0010. The activation demo: needs, first offers and availability

Date: 2026-10-26

Status: Accepted, decided by the owner on 2026-10-26 ("this is approved for the next stage of the demo update so I can share it"). The agent chose the specific behavior below, for the owner to review.

## Context

The pilot asks approved people about tasks a coordinator writes. Research the owner shared on October 25 found that the pilot doesn't help with three things: getting a first offer to people who were never asked, matching work to the time people actually have, and turning something the organization wants to run into tasks. The owner approved the mockups on the "Volunteer activation screens" canvas (the "Next demo" row) as the next stage of the demo.

## Decision

These move from [LATER.md](../LATER.md), or are new, for the demo:

- **Needs.** A need is something the organization wants to run, such as "Saturday delivery". It holds assignments (ordinary tasks with a `need_id`) and the supplies and information it can't start without. Each assignment shows the person who fits and has waited longest, or a gap. **Offer** publishes the assignments that have people who fit and asks each one's first batch.
- **First offers.** For each approved person never asked, the tool proposes the open work that fits them: remote first, then work that uses a specific skill, then the shortest. A coordinator approves each one; nothing is sent without approval ([0001](0001-start-after-approval.md) still holds).
- **Availability.** A person can have hours a week, usual times (day and morning, afternoon or evening) and "remote is fine". Work longer than their hours, or in-person work at a time outside their usual times, doesn't fit. People with no usual times fit any time, so imported lists still work.
- **Tiers.** One time, seasonal, regular and core, set by the coordinator. They're shown and filtered on; they don't change who fits yet.
- **Batches.** Each ask records which batch it went out in. A task's page shows each batch and how it went, and when the next one is due.
- **When work stays open.** Work at a set time that's 2 hours or longer can be split into two shorter pieces. Open work can be shared with a partner organization: the partner gets a draft copy and decides whether to ask its own people. Requirements travel as text, because each organization's fields are its own.
- **The volunteer's page.** Shows what to bring, files and who to find; "Report a problem", which shows on the coordinator's Today; open work the person fits, which they can accept directly; and their own availability.
- **Today.** Lists decisions (first offers, needs with work to offer or gaps, problem reports, batches due, people paused), then this week's work, then capacity: approved people, people never offered, median days from joining to a first ask, and people who said yes twice.
- **Navigation.** Today, Needs, Tasks, People. Settings moves to the top bar on phones and stays in the sidebar on desktop.

## Consequences

- The "done when its time passes" rule ([0002](0002-the-schedule-is-the-record.md)) is unchanged, so the demo still can't tell scheduled work from attended work. The research flagged this; it needs its own decision.
- Partner sharing in the demo works between organizations that list each other as partners. There's no screen to add a partner yet; the sample data sets one up.
- Asks taken from the volunteer's own page have no link, so they never open a session.
