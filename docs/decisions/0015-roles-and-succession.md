# 0015. Roles, succession and optional renewals

Date: 2026-11-26

Status: Accepted for the items marked "owner", decided by the owner on 2026-11-26. Items marked "agent" are how the agent built them, for the owner to review.

Changes [0014](0014-membership-management.md): renewals and dues are optional, and the launch messaging changes.

## Context

The owner read the [membership research](../research/membership-language-2026-11.md) and decided on its six recommendations. The owner saw a larger opportunity in it: "Volley could help organizations distribute responsibility across their membership. ... Having 5,000 members means relatively little if the same 25 people do everything." The owner then froze the concept: "I would now stop expanding the product concept, complete the membership functionality, implement controlled organization registration, and start recruiting real organizations."

## Decision

- **Owner:** renewals and dues are optional. Membership has to fit informal and formal organizations.
- **Owner:** messaging leads with participation and keeps "membership management" and "volunteer management" as the categories. Headline: "Put your membership to work." Call to action: "Request free access."
- **Owner:** roles with terms, including previous holders, vacancies and terms ending soon.
- **Owner:** nobody is labeled inactive. Track what people were offered, what they accepted and what they took part in.
- **Owner:** succession. When a chair or board member leaves, the role keeps its responsibilities, open tasks and history, and the next person sees what they inherit.
- **Owner:** no all-in-one suite before launch. Free stays an acquisition strategy, not the only selling point.
- **Owner:** stop expanding the concept. Finish, register organizations under control, recruit real ones, and let usage drive the next decisions.
- **Agent:** "Track renewals and dues" is an organization setting, off for new organizations and on for any that already had expiry dates. When it's off, expiry, dues, the renewal settings and the Current, Expiring and Expired filters are hidden, and no renewal reminders go out.
- **Agent:** a role has a name, an optional team, responsibilities and handoff notes. Its terms record who held it, from when and until when. Handing off ends the current term and starts the next. A task can belong to a role, so it stays with the role, not the person.
- **Agent:** the Roles screen lists vacant roles first, then terms ending within 60 days, then the rest.
- **Agent:** a person's page shows their roles, and how many times they were asked, accepted and took part.
- **Owner, November 26:** "Expiring members should be a report you run nobody is gonna view 000s of menbwrs in a snapshot youbhave tomake this tool's reports scannable". Renewal status moved off the People list into a Reports screen.
- **Agent:** Reports show counts first. Renewal groups don't overlap (next 30 days, 31 to 60, 61 to 90, expired in the last 90), and picking one lists only those people, with Export CSV and Email. The screen also counts participation, roles and applications.
- **Owner, November 26:** "It can autosend updates or hage the person be able to do it manuually". Renewal reminders are automatic or manual, set per organization.
- **Agent:** automatic is the default. In manual mode nothing goes out on a schedule. Reports shows who has been reminded, and "Send reminders" sends the standard renewal email to the people in a group who haven't been reminded for their current expiry date. A person counts as reminded only when the email goes out.
- **Agent:** the sign-up page is titled "Request free access". Approval from 0013 is the control on registration.

## Consequences

- Succession needs organizations to keep their roles current. Terms ending soon and vacancies are what remind them.
- Campaign messages for each audience are in [docs/launch/campaigns.md](../launch/campaigns.md).
