# Volunteer Mobilization (working title)

Vloora product proposal. First written October 21, 2026, revised October 24, 2026. The product name and public brand are undecided.

## What the product does

It helps a small organization put the volunteers it has already approved to work, and keep them working.

A coordinator opens the app to a short list of decisions. Most are asks the app has drafted for people who have waited longest since they were last asked. The coordinator approves them, and they go out by email in rounds until the work is full. Volunteers answer yes or no from a link, with no account. Work is recorded as done when its time passes, and nobody confirms it afterward. The coordinator's app keeps working when the internet is down.

Recruiting and vetting volunteers stay with whatever the organization uses now. The product starts once a person is approved.

## Why this product

Organizations approve volunteers and then fail to keep them busy. Nobody has the time to work out what each person could do, or to chase people to see if they are still free. Most volunteer work is also loosely defined and hard to scope. The existing volunteer tools are built around shifts, sign ups and logged hours, and several charge by the number of volunteers.

Vloora's goal is broad adoption and evidence of a working product. A free hosted version is the default. Premium features for larger organizations are possible later. Subscription revenue is not how the first release is judged.

## Read first

- [Product PRD](docs/PRODUCT-PRD.md): outcome, users, jobs, tenets, v0 capabilities, release plan and acceptance.
- [Activation PRD](docs/ACTIVATION-PRD.md): how approved people come in, intake, tiers, statuses, and availability without chasing.
- [Mobilization PRD](docs/MOBILIZATION-PRD.md): shaping work, the state tables, who gets asked, rounds, the weekly draft run and Today.
- [Architecture](docs/ARCHITECTURE.md): stack, offline outbox, text messages, data model, API, security and costs.
- [Ship today](docs/SHIP-TODAY.md): today's slice, screens, sample data, build order, smoke test and go or no go.
- [Agent handoff](docs/AGENT-HANDOFF.md): build instructions for a coding agent.
- [Decisions](docs/decisions/): what was decided, when, and what was rejected.

## Launch definition

The first releasable loop: create an organization → import approved volunteers → describe a need → approve an opportunity → approve a round of drafted asks → a volunteer says yes from a phone → the opportunity fills → the work becomes done when its time passes.

Use a real persistent database. Two organizations' data must stay apart. Volunteers never need accounts. A hosted preview with sample data is fine. Do not collect real personal data until the authorization and private link tests pass.

## Distribution

An organizer can share an opportunity link in the organization's own Slack, Discord, email or website. People who answer it arrive waiting for approval. Offers go out by email first, then by text once a number is registered, then by Slack. Future self hosting needs exportable data and migration scripts.

## Repository status

The application is built here, in `quarterback/voluntold`. These planning documents were first drafted in `quarterback/vloora` (PR #105) and moved here so the specs and the code live together. The Vloora company website is not the application backend, and unreleased features are not Vloora website product claims.
