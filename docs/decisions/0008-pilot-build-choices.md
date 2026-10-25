# 0008. Choices made while building the pilot

Date: 2026-10-25

Status: Proposed. The agent made these choices while building [SPEC.md](../SPEC.md), for the owner to review.

## Context

The spec left some technical details open, and a few of its assumptions didn't hold once the code was written.

## Decision

- **Sign-in.** Coordinators sign in with a 6 digit code sent by email. The app sends the code through Resend and keeps its own sessions, stored as hashes. There are no passwords. The spec asked for a managed sign-in service. This is smaller than adding one. It can be swapped for one later without changing anything else.
- **AT Protocol posting.** The organization connects with an app password it makes in its Bluesky settings. The app stores it encrypted. AT Protocol OAuth replaces it once the one-day test on Workers passes. App passwords are a standard Bluesky feature. The organization can revoke one at any time.
- **The record name.** Until the owner picks a domain, the task record uses the placeholder `com.example.volunteer.task`. Posting stays off on any server where `ATPROTO_TASK_NSID` isn't set.
- **Model for imports.** The adapter calls Claude through the Anthropic SDK, with `claude-opus-5-5` as the default and `MODEL_NAME` to change it. It runs only for text, Word and PDF imports. With no key set, those imports show a clear message and CSV, Excel, XML and JSON still work. The owner still decides the provider and records its data terms before any real file goes through.
- **Excel.** Only .xlsx files are read, using `read-excel-file`. The `xlsx` package on npm is stuck at a version with known security problems, so it isn't used.
- **Links.** Ask links are stored only as hashes, so the app can't show a link again. A coordinator who loses one makes a new link, and the old one stops working.
- **When an ask counts as sent.** When the coordinator taps Ask, not when they copy. The server can't see a copy, and the weekly limit has to hold on the server.
- **A late yes.** A yes on an expired ask still takes a spot if one is open.
- **Asking again.** Before asking anyone, the server expires old asks and applies the pause after three unanswered asks. This way "who fits" always reflects the current time.

## Consequences

Before inviting pilot organizations, the owner needs to:

- set up Resend with a sending domain
- choose the domain for the task record name
- either set up the model for imports or tell pilots to import CSV or Excel files
