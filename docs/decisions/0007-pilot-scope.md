# 0007. What the pilot includes

Date: 2026-10-24

Status: Accepted. The owner made the decisions marked "owner". The agent made the ones marked "agent", for the owner to review.

## Context

The October 24 planning set was about 11,000 words across six documents. Its first version included an offline app, AI drafting, tiers, rounds, a weekly draft run, email delivery and hand-built Material 3 components. The owner wants a spec small enough to build and test with 3 to 5 organizations, which can grow over time.

## Decision

- **Owner:** one short spec ([SPEC.md](../SPEC.md)), one list of later ideas ([LATER.md](../LATER.md)), and decision records. The old documents move to `archive/`.
- **Owner:** the pilot is a small, real app used by 3 to 5 organizations.
- **Owner:** the tool is a set of schemas that works for any kind of work. Organizations define their own fields (skills, age, experience and anything else), and requirements are written against those fields.
- **Owner:** organizations write their own tasks. A model drafting tasks from notes comes later.
- **Owner:** import from any file (CSV, Excel, XML, text, PDF and similar). A data API comes later.
- **Owner:** asks go out as links the coordinator copies. The tool sends nothing in the pilot.
- **Owner:** use an existing Material component library (MUI) instead of building Material 3 components by hand. This changes [0004](0004-material-3-for-the-interface.md).
- **Owner:** working offline moves to later. This changes [0003](0003-coordinator-app-works-offline.md).
- **Agent:** the three ready-made ways to ask (a few at a time, everyone who fits, pick by hand), with a few at a time as the default.
- **Agent:** teams with leads who add and remove their own members, so a team decides who can do its work. Added because organizations and teams approve people for work that has requirements, and the research found no tool that documents team leads doing this ([research](../research/volunteer-tools-landscape-2026-10.md)).
- **Agent:** kept the weekly ask limit (2 in 7 days), the pause after three unanswered asks, and "done when its time passes" ([0002](0002-the-schedule-is-the-record.md)).
- **Agent:** asks expire after 48 hours, or 6 hours before the task starts.
- **Agent:** a model reads text, Word and PDF files for import. That means the file's contents, including contact details, go to the model provider, so the provider must not train on prompts or keep them.
- **Agent:** posted tasks are on by default once an organization connects its AT Protocol account, and each task can be switched to private.

## Consequences

The pilot reaches volunteers only through whatever channel the coordinator pastes links into.

Rounds and the weekly draft run are replaced by the ways to ask and the Today list. Tiers are gone. A coordinator who wants to ask some people less often can pause them or lower the weekly limit.

Any rule from the archived documents that SPEC.md doesn't repeat is not part of the pilot.
