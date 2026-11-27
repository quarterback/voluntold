# 0017. A setup guide, plainer names, and an import that reads other tools' files

Date: 2026-11-27

Status: Accepted. The owner asked for the change. The agent chose how it works, marked "agent", for the owner to review.

Changes [the onboarding spec](../specs/onboarding.md), which said not to build a setup guide or put import in a first session. Changes the "No microcopy" rule in `EDITORIAL.md`.

## Context

On November 27 the owner signed up at manyarms.app on a phone and sent three screenshots of Settings. The owner wrote: "The signup and onboarding is absolutely miserable there's no flow, assumes too much from a user, the categories and sections are titled too arcane". The owner asked for research on "other design patterns for tools like this" and "what things are called", then a revamp with "a navigator" that guides a person through the first run and is easy to get back into. On AT Protocol: "no one cares and that should be an advanced thing and hidden until after" onboarding. On import: the options were "confusing and difficult" to parse, and "you would need to do a fake import of data from another tool", because the owner worried it would not work.

A fake import of seven made-up exports showed the worry was right. One of the seven produced usable people. See [the research note](../research/onboarding-and-import-2026-11.md).

## Decision

- **Owner:** new organizations get a guided first run, and can get back to it.
- **Owner:** AT Protocol is an advanced setting, hidden until after onboarding.
- **Owner:** names follow what comparable tools use.
- **Agent:** the guide has six steps. Steps finish from the organization's own data. Two can be skipped. Its shape changed later the same day, below.
- **Agent:** Settings is a menu with one page per section, and one line under each name.
- **Agent:** renames: Categories to Membership types, Coordinators to Admins and coordinators, One choice to Dropdown, Many choices to Checkboxes, Text to Short text, Map columns to Match columns, Weekly ask limit to Asks per person each week.
- **Agent:** AT Protocol is "Post tasks to Bluesky", under Advanced. It shows only when the server can post and setup is finished or hidden.
- **Agent:** the import chooses the email and phone columns by what the cells hold. It leaves unrecognized columns out unless the person switches them on. Before, every column became a field.
- **Agent:** an import can be undone.
- **Agent:** screens may carry one line of help, through one component. This narrows the owner's October 25 rule against explanatory text.

## Later the same day: one helper, from sign-up through setup

The agent first built the guide as a six-row checklist card on Today, with sign-up as two forms after the email code. The owner saw that and wrote: "Account creation gets the same helper to guide you simply tjrough org naming, contact info, other detailsthen verify and create. Designate admins and then after account is verified then begin the process of account migration or other details that need to populate it again using a demo mode style navigator". Also: "the navigator mascot bot shoild help them with this idk", and that the "information density and cognitive load" should make it "much simplier".

- **Owner:** sign-up runs in this order: organization name, contact info, other details, then verify and create.
- **Owner:** after that come admins, then bringing people in, then the rest.
- **Owner:** the guide works like the demo guide and has a mascot. The owner was unsure about the mascot.
- **Agent:** sign-up is one question on each screen. The account and the organization are created together at the last step.
- **Agent:** "what you'll use it for" is gone from sign-up, to keep it short. The approvers still get the website, the size, and where the list is.
- **Agent:** the guide sits where the demo guide sits and shows one step at a time. On the screen a step needs, it says what to do there, and on a phone it shrinks to a strip.
- **Agent:** "after account is verified" was read as the emailed code, not the organization's approval. Waiting for approval would stop people before they import.
- **Agent:** the mascot is a simple placeholder drawing, and the help is scripted. It is not a chatbot.
- **Agent:** Bluesky posting now waits until setup is finished. Hiding the guide no longer reveals it.

## Consequences

- **Tasks, Asks, and Needs keep their names.** The research found most tools say "shift" and "invite", and none says "ask" or "need". Those words are part of the product's positioning, which is the owner's to change.
- Until `ATPROTO_TASK_NSID` is set, nobody sees the Bluesky setting at all. Before, admins saw it marked "Not available".
- The help-line rule is looser than what the owner set on October 25. If the owner wants the old rule back, the lines are easy to find: they all go through the `Help` component.
- The guide has not been tried by anyone outside this session.
- The mascot is new brand art that the owner has not approved.
