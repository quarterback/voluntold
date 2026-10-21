# PRD: organization-initiated volunteer activation

**Release:** v0 | **Date:** October 21, 2026

## Problem

An organization already has people willing to help but has incomplete information about what they can offer or when they are available. A contact list and occasional email exchange are poor ways to mobilize changing availability. An unused volunteer record is not an activated volunteer.

## Goal

An organizer shares an invitation that allows a person to complete a lightweight intake without an account. The system creates an organization-scoped volunteer record and turns it into useful, time-sensitive matching information.

## Entry points

1. **Direct invitation:** Organizer adds a person's name and contact method, gets a private invitation URL to send personally, and may invite in batches later. Do not contact anyone automatically without organizer action.
2. **Open intake:** Organization shares an approved public intake URL to its existing community. The volunteer chooses to express interest and confirms that the organization may contact them.
3. **Opportunity-first:** Someone opens a shared opportunity, completes only the missing intake information needed to accept, and may opt into future opportunities.

All three write to the same volunteer record for the organization when authorized and when identity can be reconciled safely. Do not silently merge volunteers across organizations.

## Intake interaction

A mobile-friendly form/conversation with at most five essential prompts:
- What would you like to be called?
- What would you enjoy helping with or know how to do? Support plain text and optional suggestions, without forcing a rigid taxonomy.
- What can you offer now? Examples: 45 minutes, two hours on weekends, one afternoon this month, recurring monthly, or ask me as things arise.
- What is the current availability window? Optional end date; show when the system will stop treating a response as current.
- May this organization contact you about opportunities? Choose how (e.g. organizer-shared link or email), consent and edit preference.

Optional fields: access requirements, remote/in-person preference, experience notes, preferred tasks, hours-contributed note. Never demand a résumé, full address, gender, birthdate, demographic information, employer or social account.

If a volunteer declines future outreach, they can still finish an existing accepted contribution. Organizer contact permissions and messages must respect that choice.

## Activation status

- `invited`: Invitation created, no volunteer response.
- `responded`: Intake submitted; volunteer has not accepted work.
- `available`: Current valid time window and consent permit suggestions.
- `committed`: Volunteer has explicitly accepted at least one active assignment.
- `inactive`: Availability expired or person has opted out.
- `alumni`: Past contributor; no current availability assumed.

Avoid employee concepts such as hired/terminated, on duty, attendance compliance or manager approval of the person.

## Matching attributes

Store `skill_tags`, `interests`, `preferred_task_types`, `available_from`, `available_until`, `weekly_capacity_minutes` (optional), `one_off_ok`, `recurring_ok`, `contact_permission`, `last_confirmed_at`. Do not imply that tags certify a skill.

Model eligibility deterministically: consent, task visibility, skill prerequisites where required, date/window intersection, capacity and any explicit exclusion. Rank or explain eligible matches by opt-in interests, relevant experience and effort fit. An LLM may suggest tags and text; organizer/volunteer can correct them. Never show a precise numerical proficiency score without evidence.

## Acceptance tests

- Link-first intake completes on a 375 px mobile layout and keyboard-only desktop.
- A volunteer declines all future contact; the organization can no longer create automated outreach for them.
- A volunteer available only during October is not shown as currently available in November without renewal.
- A person available for 60 minutes is not recommended for an indivisible 4-hour shift.
- Same email entered at two organizations does not leak data across tenants.
- Expired/revoked invitation URLs cannot view or edit private records.
- Accidental duplicate submissions don't create multiple distinct commitments.
- Organizer sees response, availability freshness and suggested tasks; volunteer can update their preferences via a scoped private URL.

## After launch

Bulk roster import with invitation consent safeguards, reusable volunteering history, seasonal reactivation prompts, and channel integrations. Do not equate a person's unexpired profile with a promise to accept work.
