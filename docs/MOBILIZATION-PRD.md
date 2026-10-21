# PRD: shaping work and mobilizing contributors

**Release:** v0 | **Date:** October 21, 2026

## Problem

Organizations often know their goals and have interested members but cannot turn work into requests another person can comfortably accept. They define a standing position where a bounded contribution would suffice, or fill a long shift with duties that could be split.

## Goal

Help coordinators describe a real organizational need, produce manageable opportunities with clear expectations, match willing participants, and close the loop on finished contributions.

## Need-to-task workflow

1. Organizer enters a natural-language need, such as "We have a chapter event in three weeks and need help getting ready."
2. Agent identifies unanswered questions about required outcome, deadline, time and location constraints, materials/access, approval authority, whether continuous coverage is essential, and who can answer volunteer questions.
3. Organizer answers or marks unknown. Unknowns should remain visible, not be invented away.
4. Agent proposes one or more **task drafts**, each with an independent outcome, realistic effort band, earliest start, due date, owner/reviewer, prerequisites, instructions, skill preferences, and whether it is one-off, repeatable or recurring.
5. Organizer edits and approves each draft. Published opportunity page is then shareable.
6. System identifies matching volunteers or makes an open opportunity available for claiming. A volunteer chooses whether to accept.
7. Accepted volunteer sees the handoff and can mark progress, report a blocker, withdraw, or finish.
8. Organizer confirms completion when verification is appropriate and has a durable record.

## Two task types

**Outcome-based task:** e.g. review an event page and send suggested edits; may be completed at any point before a deadline. Effort is estimated, not clocked.

**Coverage task:** e.g. check in attendees 12:00–14:00. Has explicit start/end window, minimum capacity and replacement rules. A withdrawal reopens the uncovered slot and triggers coordinator visibility; it does not imply the volunteer may abandon a confirmed coverage commitment without notifying anyone.

Recurring tasks are templated opportunities that generate discrete commitments, rather than permanent role assignments.

## Required fields on publish

- Short task title and clear final deliverable
- Organization and coordinator contact
- Effort estimate or scheduled coverage window
- Deadline / active availability window
- Location and participation modality
- Specific access or training requirements
- Reviewer or person to ask for help
- Number of contributors needed (default 1)
- Privacy/visibility setting: private invitation, unlisted share link, or public

Optional: referenced source materials, dependencies, accessibility needs, tasks that must precede this one, and suggested skills.

## Task and commitment states

Need: `draft` → `scoping` → `ready` → `closed`.

Opportunity: `draft` → `published` → `filled` → `completed` or `cancelled`.

Offer: `proposed` → `sent` → `accepted` / `declined` / `expired` / `withdrawn`.

Contribution: `accepted` → `in_progress` → `submitted` → `confirmed` or `reopened`.

The accepted state requires an explicit volunteer action. No AI-generated status transition may impersonate a volunteer. Keep a timestamped event history.

## Example test case

Need: "Our local arts chapter has a public program Thursday, 7 a.m. to 5 p.m.; registration and welcome desk must be staffed; marketing needs review before Wednesday."

Suggested decomposition:
- Publish/check the event page, estimated 45–75 minutes, deliverable-based, due Wednesday.
- Prepare accessible check-in instructions, 60 minutes, outcome-based.
- Welcome desk 10:00–12:00, fixed coverage, one person required.
- Welcome desk 12:00–14:00, fixed coverage, one person required.

A volunteer available 10:45–12:00 can cover a suitable sub-slot *only if the organizer agrees the coverage unit can be split*. The agent does not change fixed schedules autonomously. Someone available just one afternoon is eligible for independent work if prerequisites fit.

## Matching logic

Hard filters: current availability, commitment capacity, visibility, required authorization/certifications, location and minimum coverage window.

Soft signals: stated interests, self-described skills, preferred types of work, prior opt-in history and whether the task matches the person's requested commitment size.

Show explanations such as "Interested in communications; available this week; estimated 60 minutes" and explicit mismatches such as "Only available next month." Coordinator approves targeted offers; published open tasks can be claimed subject to eligibility and capacity rules.

## Acceptance tests

- Organizer can publish a useful opportunity without completing an organizational chart.
- Organizer can manually modify all AI-generated text and publish without calling a model.
- Coverage tasks are never silently converted to more flexible commitments.
- Two volunteers claiming the last available slot at the same time cannot both obtain the sole slot.
- Withdrawing from accepted coverage notifies the organizer's dashboard and marks the gap.
- Completed tasks preserve agreed outcome, contributor, approval state and optional hours.
- An unassigned opportunity is distinguishable from one offered but not yet accepted.
- Organization A cannot publish, claim, edit or export organization B's tasks.
- All public links hide volunteer contact details and private organizer notes.

## After launch

Slack/Discord claim buttons, reminders, replacements, recurring task templates, volunteer-recommended work, richer role shaping and multi-chapter administration. The browser workflow remains the source of truth.
