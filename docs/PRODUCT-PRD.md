# Product requirements: volunteer activation and mobilization

**Status:** v0 planning | **Owner:** Vloora | **Date:** October 21, 2026  
**Working title:** Volunteer Mobilization (not the final product name)

## Product outcome

Help volunteer-run organizations turn willingness to help into completed contributions. Organizations should be able to mobilize a person who can spare 45 minutes this week as easily as someone who helps every month. A coordinator identifies what needs doing and offers a well-scoped opportunity. A volunteer controls whether to accept and when to participate.

The system assists management judgment: asking organizers better questions, shaping tasks, checking capacity, and maintaining a record. It does not require formal role definitions, employee-style onboarding or mandatory volunteer accounts.

## Terms

- **Need:** what the organizer says is going on, in their own words.
- **Opportunity:** a published piece of work with an outcome, effort or coverage window, and a number of slots.
- **Offer:** an organizer's request to a specific volunteer to take an opportunity.
- **Contribution:** the record created when a volunteer accepts. It runs from acceptance to confirmation or withdrawal. The code, database and API use this word, not "commitment" or "assignment".
- **Availability:** a volunteer's stated window and capacity. It expires.

States for each are defined once, in [MOBILIZATION-PRD.md](MOBILIZATION-PRD.md#states).

## Target users

- **Organizer/coordinator:** A board member, chapter officer or volunteer director at a professional association, community group, member organization or small nonprofit. May be new to delegation and may not know how to specify tasks.
- **Existing volunteer:** Someone already in the organization's orbit. May contribute once, seasonally, sporadically or on a recurring basis. Often using a mobile phone. May only have time for a small independent task.
- **Prospective volunteer:** Someone who sees a public or privately shared opportunity and wants to help without registering on a platform.
- **Organization admin:** Controls invitations, who can publish opportunities, contact permissions, and access to records.

Volunteer board seats and formal fiduciary/governance roles are different from temporary contributions. The tool must not conflate them.

## Primary jobs

1. Organizers describe actual work in their own language and receive clarifying questions and proposed task shapes.
2. Organizers invite known people for lightweight intake or share a specific opportunity.
3. Volunteers specify interests, practical skills, how much time they can contribute and during which period; they can decline or update this later.
4. Matching suggests eligible volunteers for approved opportunities, with transparent reasons and missing information.
5. Volunteers explicitly claim or accept work, receive a clear handoff, and can withdraw or flag a blocker.
6. Organizations close out contributions and optionally confirm volunteered hours.
7. Both sides retain a minimal, privacy-conscious record of the contribution.

## North-star metric

**Completed contributions per active organization per 30 days**.

Instrument the preceding funnel independently: organizations with an approved opportunity; shareable opportunities viewed; volunteer responses; accepted contributions; confirmed contributions; repeat opportunities and repeat contributors. Do not treat generated tasks, registered records or sent invitations as completed work.

Adoption targets (aspirational; not projections):
- First real pilot: 5 independent organizations complete at least one contribution.
- Initial public proof: 100 independently active organizations.
- Scale milestone: 1,000 independently active organizations with repeat use.
- Publish aggregated, privacy-preserving service metrics and operating costs when sample sizes warrant.

## Product tenets

- Organization-initiated activation: coordinators can initiate volunteer invites directly.
- Volunteers are people helping, not employees: small asks, plain language, flexible participation.
- Availability is temporal. It has a date/window and can expire.
- A match is a recommendation; an offer is a request; a contribution exists only after explicit volunteer acceptance.
- Some work requires fixed coverage. Model it honestly and allow a volunteer to request release so the organizer can find replacement coverage.
- Help organizations discover the work they can delegate, including work they have not yet defined.
- Default to free hosted use, low infrastructure cost and portable records.
- An agent proposes, explains and asks questions. Coordinators approve publication and every outbound offer. No autonomous promises on behalf of volunteers.
- Data about volunteers is private to the inviting organization and its authorized coordinators.

## v0 capabilities (must ship together as a vertical slice)

**Organizer**
- Create organization and establish owner authentication.
- Describe a need; answer clarifying questions about outcome, deadline, time estimate, work type, access needs and reviewer.
- Create or accept an agent-proposed task draft, edit it, approve it and make a shareable opportunity link.
- Invite a known volunteer through a private link. Manual share/copy is sufficient at first.
- View intake responses and suggested matches, with reasons.
- Offer approved work to a volunteer or allow an eligible person to claim an open opportunity.
- See each opportunity's state and each contribution's state, as defined in [MOBILIZATION-PRD.md](MOBILIZATION-PRD.md#states), with blocked and withdrawn contributions called out.
- See volunteer response and contribution record; export CSV.

**Volunteer**
- Use an organization invitation link without creating an account.
- Answer short intake prompts: preferred name, interest/skills, current availability window, task preferences, preferred contact method and consent to be contacted.
- See an opportunity description including estimated effort, due date, specific outcome, location/remote requirement, point of contact, constraints and whether it requires fixed coverage.
- Accept, decline, or signal a different availability window.
- Access agreed instructions, flag a blocker, withdraw, and mark done with an optional note/hours.
- Reopen a valid private link to update availability or stop further invitations.

**AI assistance**
- Transform a vague organizational need into suggested tasks and specific follow-up questions.
- Produce structured outputs validated against JSON schemas; explain uncertainty instead of fabricating scope.
- Suggest volunteer matches using skill and time compatibility with deterministic exclusions. Do not infer sensitive traits or expose contact details in prompts when not required.
- Provide a fully usable manual path whenever model APIs are down or the budget cap is reached.

**Distribution**
- Publicly shareable opportunity pages with no volunteer login.
- Mobile-first UI and copyable links for email, Slack, Discord and websites.
- A clear distinction between open opportunities and private invitations.
- First-party events to measure completed real work; no invasive analytics required.

## Out of scope for the first public version

- Public nationwide volunteer marketplace, search index and organization discovery.
- Complete CRM, donor management, fundraising and payment handling.
- Employee scheduling, clock-in/clock-out enforcement, performance reviews or mandatory timesheets.
- Bylaw drafting, legal advice, board-election management, background checks or certification systems.
- Native Slack or Discord bots, SMS and calendar integrations.
- Paid plans, subscription billing or elaborate tenant-level analytics.
- A fully autonomous volunteer director.

These may become separate releases. The initial product must work without them.

## Business and deployment model

Core hosted product: free during adoption period with transparent fair-use protections for abuse or AI consumption. No volunteer-seat billing. Larger organizations could eventually pay for advanced controls, multi-chapter reporting, managed integrations or higher service guarantees. Self-hosted deployment is a future capability, supported by an exportable data model; don't delay launch for it.

## Risks and countermeasures

- **Wrong work proposed:** Tasks require organizer editing and approval. Keep a human reviewer on every task.
- **Volunteer overload:** Availability and maximum time are explicit; do not infer consent from a matching score.
- **Sensitive information:** Do not expose full volunteer details on public opportunity pages or another tenant's workspace.
- **Casual participants can't onboard:** Intake must be link-first, mobile-friendly and short; never gate acceptance behind volunteer account registration.
- **One coordinator becomes a bottleneck:** Surface blockers and show when a task is unclaimed or the promised handoff is missing.
- **No real tasks:** Provide seeded demo fixtures for self-testing; pilot with genuine organizations to measure real work.
- **High AI bills:** Trigger inference on an explicit user action, cache generated task drafts, enforce per-tenant and global budgets.
- **Spam:** Throttle invitations and publicly reachable endpoints; require proof of permission to contact recipients.

## Release acceptance

A first-time coordinator can complete the full transaction from an empty organization in under 10 minutes using sample data. An invited volunteer can complete intake and accept an opportunity on mobile without an account. All state persists on reload. The system can show accepted and completed contributions and produce a CSV export. Tenant isolation, scoped-link expiry/revocation, authorization, form validation, spam controls and basic monitoring pass automated tests. Public release with real volunteer information waits until these gates pass.
