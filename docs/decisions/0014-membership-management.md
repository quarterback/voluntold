# 0014. Membership management for small organizations

Date: 2026-11-25

Status: Accepted for the items marked "owner", decided by the owner on 2026-11-25. Items marked "agent" are how the agent built them, for the owner to review.

Builds on [0012](0012-free-launch-and-email.md) and [0013](0013-approve-new-organizations.md).

## Context

On November 25 the owner widened the product from volunteer coordination to membership management: "i wanted member mgt expasnion bc its a fit for what the tool does and broadens it". The owner then described the audience:

> I'm targeting audiences that are smaller or established in different kind of way, and so I'm not looking at audiences that already have tooling. I don't think they have the incentives to leave their tools for organizations that are small organizations that are new organizations that are looking for a way to get off of really expensive tooling.

## Decision

- **Owner:** the launch is free membership and volunteer management. Volley is an organization's main membership database, not an add-on to another one.
- **Owner:** the audience is small and new organizations, and organizations leaving software that costs too much. Organizations happy with their current tools aren't the target, though they can use it.
- **Owner:** dues are recorded, not collected. Payments, branded newsletters, integrations and automation by a model come later.
- **Agent:** each person has a membership category, a member since date, an expiry date and a dues paid date. Their state (current, expiring or expired) comes from the expiry date, so there is no status to keep up to date by hand.
- **Agent:** each organization chooses what to call its people: volunteers, members or participants. The settings section for people who run the tool is now "Coordinators", so "members" means the roster.
- **Agent:** imports recognize the column names membership tools commonly export, and a re-import updates membership dates.
- **Agent:** renewal reminders go out once per expiry date, 30 days before by default, with the organization's renewal link and a signed unsubscribe link.
- **Agent:** a public application page at `/join/<organization id>`, off until the organization turns it on and an admin of the tool has approved it. Applicants confirm they are 18 or older and agree to be contacted. A hidden field and a rate limit keep out bots.
- **Agent:** a coordinator can email everyone shown on the People screen after filtering. It goes only to people who agreed to be contacted and haven't unsubscribed, and counts against the daily limit.
- **Agent:** sign-up asks for a website, size, what the organization uses today, what it will use Volley for, and a confirmation that everyone on the roster is 18 or older. Admins see the answers on `/admin` and in the sign-up email.
- **Agent:** the home page and Product Hunt copy speak to small organizations, and don't name competitors.

## Consequences

- Group email reverses the line in 0012 that kept bulk email out. Approval, the daily limit, consent and unsubscribe are the controls on it.
- The browser demo shows the application and unsubscribe pages, but submitting them there doesn't work, because the demo has no server.
- Students stay out. A future product for school sports would need its own rules for minors' data.
