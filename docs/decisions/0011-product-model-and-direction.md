# 0011. Product model: invitations, a workbench and a ticket rail

Date: 2026-10-25

Status: Accepted for the items marked "owner", decided by the owner on 2026-10-25. Items marked "agent" are proposals for the owner to review.

Changes [0005](0005-email-first-then-text-then-slack.md): the tool notifies people inside the app, and sends email only to people who ask for it.

Changes [0009](0009-saas-look-and-adobe-content.md): the look is under review. See [the next version spec](../specs/next-version.md).

## Context

On October 25 the owner said the current design has nothing novel about it and would screenshot badly. He also corrected the product's goal. The tool is not about getting inactive people more active, nudging people or first come, first served. It makes it easier to become active. Coordinators keep track of who is in their volunteer queue, and get better tools for writing tasks, sorting what needs doing, managing the task list and handing out work. Volunteers keep track of what's needed and can pitch in when they want, if the organization works that way.

The Figma Make mockup in `quarterback/VolunteerIntakeSystem` has problems in how the tool should be designed. It is not a spec to follow.

## Decision

- **Owner:** the mental model is "Partiful meets Airtable meets a POS system output."
  - Partiful: what goes out to volunteers. Requests go out, and people answer them without an account.
  - Airtable and GitHub Projects: the coordinator's working view. Records with tags, several views of the same data, and saved filters.
  - A restaurant kitchen screen: incoming work shows as tickets, and finished work clears.
- **Owner:** the app keeps no conversations. Requests and answers are activities on a record. A reply from outside the app lands as one line in that record's activity.
- **Owner:** notifications happen inside the app. The app installs to the home screen, and may become an Electron app on desktop. Email goes only to people who ask for it.
- **Owner:** the volunteer side is easy to scan. The coordinator side can be dense. Bold means clear, not big.
- **Owner:** tag colors exist to sort things at a glance. Coordinators won't tag, so the tool tags tasks and people itself.
- **Owner:** a coordinator can paste a list, notes from a meeting or a long description. The tool proposes tasks, and a coordinator approves each one before it exists. This moves "Notes into tasks" out of [LATER.md](../LATER.md).
- **Owner:** each organization sets rules for how work gets handed out.
- **Agent:** three rules to choose from: assigned only, raise your hand, and claim directly.
- **Agent:** the screens in the next version spec: a Needs inbox for sorting new work, a task builder that shows a task's size as it's written, an Assign screen with the queue beside open work, coverage strips, and scope lines.
- **Agent:** a look built from the owner's own type and color, kept in one tokens file, on top of the existing components.

## Dropped

- Measures and screens about people who drifted away, and meters for how often someone was asked. They point the product at chasing people, which the owner ruled out.
- Conversation threads in the app, including the "conversation" direction on the October 21 canvas.

## Consequences

- Push notifications on an iPhone only work after a person adds the app to their home screen and allows them (iOS 16.4 and later). A newly approved volunteer hasn't done that, so the first request still needs a way to reach them. That choice is open in the spec.
- Model features (proposed tasks and tags) send the organization's notes and task text to a model provider. The rule in [0008](0008-pilot-build-choices.md) applies: the provider must not train on that data or keep it.
