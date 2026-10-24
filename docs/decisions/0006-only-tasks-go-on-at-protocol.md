# 0006. Only tasks go on AT Protocol

Date: 2026-10-24

Status: Accepted, decided by the owner on 2026-10-24

## Context

The owner wants to be able to say the product is AT Protocol native, without putting the whole product on AT Protocol.

Everything stored in an AT Protocol account is public. Private storage, called Spaces, has been in alpha since August 20, 2026, and Bluesky says not to use it for real data yet ([research](../research/atproto-native-2026-10.md)). Volunteer contact details, approvals and checks can't go there.

VarsityApex already uses AT Protocol in a similar way. A school's results live in the school's own account, in a shared open format, so the school can move hosts and keep them, and other services can follow new results without a custom connection ([post](https://blog.ronbronson.dev/3msnpahn5r22k)).

## Decision

Tasks are the only thing that goes on AT Protocol. An organization that connects its account posts its open tasks there, in its own account. The record has the title, description, time, the public part of the place, how many people are needed, requirements as text, status, and a link to the task's public page. Tasks set for a time are also written as `community.lexicon.calendar.event` records.

Nothing about volunteers is ever posted: no names, contact details, field values, asks or answers. Tasks sent to specific people stay private.

The app's own database stays the record for everything else.

## Consequences

The product can say: "Every task an organization posts lives in the organization's own AT Protocol account, in an open format anyone can follow."

People who see a posted task and aren't volunteers yet are sent to the organization's own sign-up page, because the tool doesn't do intake.

The record format needs a name tied to a domain we own. It can't be renamed once records exist, so the domain has to be chosen before the first real post.
