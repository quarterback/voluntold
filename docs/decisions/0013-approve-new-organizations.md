# 0013. Approve new organizations before they send email

Date: 2026-11-25

Status: Accepted. The owner asked for approval. The agent chose how it works, marked "agent", for the owner to review.

Changes [0012](0012-free-launch-and-email.md): anyone can still sign up, but a new organization sends no email until it is approved.

## Context

On November 25 the owner said: "I think imf want to approve orgs rather than just let anyone sign up this way, this way, there is an abuse of the tool or at least I can curtail it. Eventually, there'll be an automated process". The owner plans to bring in large membership organizations, such as state high school athletic associations and coaches associations.

## Decision

- **Owner:** an admin of the tool approves each new organization. An automated check comes later.
- **Agent:** sign-up stays open. A new organization can import people, write tasks and ask. Until it is approved, the tool sends no email for it, so asks fall back to copied links, and its screens show "Pending approval: email is off".
- **Agent:** the people who approve are the addresses in `ADMIN_EMAILS`. They get an email when an organization signs up, and approve it at `/admin`. They can also take an approval back.
- **Agent:** each organization has its own daily email limit, 300 to start. An admin raises it for a large organization at `/admin`.
- **Agent:** organizations that existed before this change count as approved.

## Consequences

- Email is the part of the tool that could be abused, so this blocks abuse without making people wait to set up.
- If the owner wants new organizations locked out entirely until approval, that is a small change to the start page and the routes.
