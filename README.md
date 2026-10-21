# Volunteer Mobilization (working title)

Vloora product proposal, October 21, 2026. Product name and public brand are undecided.

## What the product does

A volunteer-run organization can describe work it needs done, prepare useful short- or long-term opportunities, reach people it already knows, and get a real commitment without making volunteers join another management platform. Volunteers can share skills, interests and temporary availability, accept work, and record a contribution from a link. Organizations get a durable record and a way to mobilize people again when new work appears.

The core unit is a **contribution**, rather than a volunteer's job title or shift. Fixed coverage remains available where the work genuinely requires it. Participation is opt-in; organizer proposals and agent matches are not assignments until a person accepts.

## Why this product

Organizations often know people willing to help but cannot translate unfinished work into achievable requests. Many volunteers are available sporadically, for two hours, a month, or a season. Existing volunteer administration can make them behave like employees and require more overhead than the contribution warrants.

Vloora's goal is broad adoption and evidence of a working zero-to-one product. A free hosted experience is the default. Future premium capabilities for larger organizations are possible, but subscription revenue is not the first-release success metric.

## Read first

- [Product PRD](docs/PRODUCT-PRD.md): outcomes, users, behaviors, constraints and acceptance criteria.
- [Activation PRD](docs/ACTIVATION-PRD.md): organizer-initiated invites, lightweight intake and time-bound availability.
- [Mobilization PRD](docs/MOBILIZATION-PRD.md): task shaping, matching, offers, claims and completion.
- [Architecture](docs/ARCHITECTURE.md): data model, security, AI gateway, providers and scaling.
- [Ship-today plan](docs/SHIP-TODAY.md): exact vertical slice, test fixtures, gates and sequencing.
- [Agent implementation handoff](docs/AGENT-HANDOFF.md): build instructions for a coding agent.

## Launch definition

The first releasable transaction is: create an organization → describe a need → approve a task → share an invitation or opportunity link → volunteer completes intake → organizer sees a suggested match → volunteer explicitly accepts → volunteer marks work done → organization records completion.

Use a real persistent database. Two organizations' data must remain isolated. Volunteer accounts are not required. Hosted preview and seeded examples are fine, but don't solicit real personal data until authorization and private-link tests pass.

## Distribution

An organizer can create and share a useful opportunity before importing a membership list. Opportunities travel as URLs in Discord, Slack, email and websites. Native Slack and Discord integrations follow after the browser workflow works. Future self-hosting requires exportable data and migration scripts.

## Repository status

The application is built here, in `quarterback/voluntold`. These planning documents were first drafted in `quarterback/vloora` (PR #105) and moved here so the specs and the code live together. The Vloora company website is not the application backend, and unreleased features are not Vloora website product claims.
