# 0005. Email first, then text messages, then Slack

Date: 2026-10-24

Status: Proposed

## Context

The October 21 PRDs put text messages and Slack out of scope for the first public version. Offers travel as links the organizer copies.

Since then, text messages became part of the design. Volunteers answer asks without an app or an account, and many will only answer a text. A community radio station that coordinates through several email lists and Slack showed the need for Slack delivery as well. Each volunteer chooses how the organization reaches them.

Texting in the United States needs carrier approval before the first message:

- Twilio blocks messages sent from a 10 digit long code number that is not tied to an approved A2P 10DLC campaign ([Twilio error 30034](https://www.twilio.com/docs/api/errors/30034)).
- Toll free numbers must be verified. Since January 31, 2024, messages from unverified toll free numbers are blocked ([Twilio support](https://support.twilio.com/hc/en-us/articles/20212966914075-Toll-Free-Verification-and-Developers-Navigating-the-New-Restrictions)).

Registration takes the organization's details and time to review.

## Decision

Offers go out by email in the first release, with the copied link as the fallback. Email needs no carrier approval, and organizer sign in already needs an email service.

Text messages come in the next release, once a number is registered. Slack comes after that, using Slack's interactive messages with Yes and No buttons ([Slack](https://api.slack.com/messaging/interactivity)).

All three carry the same offer, and answers in any channel change the same record.

## Consequences

The first release reaches volunteers who read email. Those who only answer texts wait for the second release.

Registration for texting should start the day the first release ships, so it is approved by the time the code is ready.

Who registers, each organization or the product as a platform, and who pays per message, are open questions in `ARCHITECTURE.md`.

## Alternatives considered

Text first. Blocked until registration is approved, which would hold up the whole first release.

Copied links only, as the October 21 PRDs had it. Every round of offers would become manual work for the coordinator, which defeats rounds.
