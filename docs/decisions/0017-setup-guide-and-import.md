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
- **Agent:** the guide is a six-step card on Today. Steps finish from the organization's own data. Two can be skipped. Settings and the desktop menu bring a hidden guide back.
- **Agent:** sign-up is two short screens. It keeps every question the approvers use, and makes the website and intended use optional.
- **Agent:** Settings is a menu with one page per section, and one line under each name.
- **Agent:** renames: Categories to Membership types, Coordinators to Admins and coordinators, One choice to Dropdown, Many choices to Checkboxes, Text to Short text, Map columns to Match columns, Weekly ask limit to Asks per person each week.
- **Agent:** AT Protocol is "Post tasks to Bluesky", under Advanced. It shows only when the server can post and setup is finished or hidden.
- **Agent:** the import chooses the email and phone columns by what the cells hold. It leaves unrecognized columns out unless the person switches them on. Before, every column became a field.
- **Agent:** an import can be undone.
- **Agent:** screens may carry one line of help, through one component. This narrows the owner's October 25 rule against explanatory text.

## Consequences

- **Tasks, Asks, and Needs keep their names.** The research found most tools say "shift" and "invite", and none says "ask" or "need". Those words are part of the product's positioning, which is the owner's to change.
- Until `ATPROTO_TASK_NSID` is set, nobody sees the Bluesky setting at all. Before, admins saw it marked "Not available".
- The help-line rule is looser than what the owner set on October 25. If the owner wants the old rule back, the lines are easy to find: they all go through the `Help` component.
- The guide has not been tried by anyone outside this session.
