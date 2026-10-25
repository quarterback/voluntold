# Making the volunteer product AT Protocol native

Research note, October 24, 2026. Brackets point to sources at the end. **Proposed** and **Uncertain** mark what is not settled.

## Short answer

- All data in an atproto account's store is public today. Private data exists only as an alpha that Bluesky says not to use in production [13][14].
- So D1 stays the system of record for volunteer data. Atproto becomes an opt in layer for login and for what people choose to publish.
- The pilot needs no atproto code, only small hooks (section 7).

## 1. What "atproto native" means

- **DID:** a permanent account ID, such as `did:plc:abc123`. It points to a document saying where the account's data lives and listing its public keys [1].
- **Handle:** a readable name that is a domain, such as `pantry.org`. It can change. The DID does not [1].
- **PDS (personal data server):** the server that holds an account's data and signing keys. Anyone can run one [1].
- **Repo:** one account's data, as records grouped into collections. "Repository contents are entirely public and verifiable" [2]. Changes are signed with the account's key. A deleted record leaves no trace in the repo [2].
- **Record:** one JSON document in a repo. Its `$type` names its schema [1].
- **Lexicon and NSID:** Lexicon is the schema language. An NSID is a schema name written as a reversed domain, such as `community.lexicon.calendar.event`. Whoever controls the domain controls the name, through a `_lexicon` DNS record [1][3]. Schemas may only add optional fields. A breaking change needs a new name [3].
- **AppView:** an app's backend that reads records from many repos and builds its own view [1]. Our Worker and D1 would be one.
- **Relay, firehose, Jetstream, Tap:** a relay gathers changes from many PDSes into one stream, the firehose [1]. Jetstream is a simpler JSON stream filtered by collection or account. Its events are unsigned, so you trust its operator [4]. Tap filters and checks events and can call a webhook [5].
- **OAuth for atproto:** people log in at their own PDS, with PKCE, PAR and DPoP required [6]. The `atproto` scope alone only proves identity [6]. Scopes such as `repo:com.example.record` allow writing one collection [7].

Native means people log in with their own DID, shared records live in their own repo under your published schemas, and your server is one view others could rebuild.

## 2. The tension: repos are public

**What exists today**

- Anyone can read and copy any record [2]. Hubble mirrors all public repos and drops deleted records [9]. Other copies may not (my inference).
- A hidden flag is a hint. WhiteWind's `visibility` field "Tells the visibility of the article to AppView" [10]. The record is still public.
- Bluesky launched DMs in 2024 with encryption planned "down the line" [11]. They use a separate chat permission [6]. **Uncertain:** I found no primary 2026 source saying they are now encrypted. Germ offers encrypted messages over atproto identities, in beta [12].

**What is proposed or in alpha**

- The Spring 2026 roadmap made "non-public data with explicit access control" a summer focus [8].
- **Proposed:** proposal 0016, now "atproto Spaces", says "This is a proposal, not the final specification" [13]. A space has an authority DID that decides who gets short lived credentials. Each member's records stay in a per space repo on their own PDS. Apps sync from each PDS, not through a relay [13][14].
- **Alpha** since August 20, 2026: "THIS IS ALPHA SOFTWARE DO NOT USE IT IN PRODUCTION". No careful security review yet, and the goal is "launching later this year" [14]. Breaking changes followed [15].
- Spaces give "access control, not confidentiality". Hosts and apps with access can read everything [13][14].
- **Proposed:** atmospheric groups (October 22, 2026). A group has its own DID, spaces and roles, and admins sign in with their own accounts [16]. This resembles an organization whose teams approve people per role. The group standard is a community proposal [16].

**Meaning for us:** nothing on atproto is fit today for contact details, approvals or checks. Even with Spaces, every member's PDS and every app with access can read the data, and a volunteer with no account has no PDS.

## 3. The split

**Could be public. Opt in, off by default.**

| Record | Whose repo | Notes |
|---|---|---|
| Organization profile | Org | |
| Published opportunity | Org | Only when marked public. A time and place can be unsafe to publish. For dated work, also write a `community.lexicon.calendar.event` [17]. |
| "I did this" | Volunteer | Only on request. Points at the opportunity, as an RSVP points at an event [18]. |
| Attestation of work or training | Org | Names the volunteer's DID, with consent. |
| Endorsement | Endorser | Opt in for both people. |

**Must stay in D1**

- Contact details, consent, availability, tier, pauses and wait.
- Approvals, declines, team role approvals and requirement status, including background checks and licenses.
- Who was asked, who said no, who did not answer, and missed work.
- Intake answers and coordinator notes.
- That a person helps an organization, unless they publish it. Membership can be sensitive, for example at a shelter (my judgment).

**How org attestations can work**

- Copy Bluesky's verification record. It lives in the verifier's repo, names a `subject` DID, and counts only "if issued by an account the app considers trusted" [19][20]. Smoke Signal does the same for event hosts [21].
- The org's repo is the signature, because its commits are signed with the org's key [2]. Anyone can fetch the record from the org's PDS and see who published it.
- For a credential carried inside the volunteer's repo, badge.blue ties signatures to the repo's DID so copies fail. It states no version and no revocation method [22]. **Proposed.**
- Revoke by deleting the record. Give expiring training an `expiresAt` field. Never publish background check results, even "passed".
- Name schemas under a domain the company will keep, and mark early ones experimental [3].

## 4. Volunteers without accounts

- Keep the planned answer links.
- Nothing can be written for someone without a DID, since a record belongs to the account whose repo holds it [2]. Until then, portability means a JSON or CSV download.
- **Claiming, later:** the volunteer page offers "Keep this record in your own account". The person logs in with atproto OAuth, granting only `atproto` and write access to the contribution collection [6][7]. The app saves the DID on that volunteer row and writes the contributions they pick to their repo. The organization can then attest to them. Link organizations only when the person claims each one, never by matching email.
- People can create an account at a PDS during the OAuth flow [23]. Do not create accounts for them.
- An account can move to another PDS and keep its DID and repo [24].

**Organization login**

- Coordinators may log in with their own atproto account, asking only for `atproto` [6]. D1 maps the DID to their role. Keep email login too.
- Publishing as the organization needs a separate organization account, ideally with its domain as handle [1]. An admin connects it once. A server side client can keep that session up to two years [25].
- **Proposed:** atmospheric groups may later let the organization be a group DID with roles [16].

## 5. Apps worth learning from

- **Statusphere** (tutorial): OAuth login, a custom Lexicon, writing to the user's repo, and Tap feeding a local database [26]. The stage 1 template.
- **Smoke Signal:** events and RSVPs on community schemas, plus an acceptance record for host approval [21]. It now indexes 51,448 events and sends hosts to atmo.rsvp or OpenMeet [27].
- **Lexicon Community:** a volunteer group keeping shared schemas for calendars, locations and more, on Tangled since July 2026 [28][29]. Reuse its event and location schemas.
- **OpenMeet and Roomy:** OpenMeet keeps events and RSVPs in the user's PDS [30], and Roomy shows them through shared atproto identity [31].
- **Contrail:** a pre alpha AppView builder on Workers and D1, fed by Jetstream [32]. Closest to our stack.
- Frontpage, Graze and Blacksky have little to copy here.

## 6. Tooling and costs

- **SDK:** use `@atproto/lex`, in "stable preview" since May 2026. `@atproto/api` moves to maintenance after `lex` 1.0 [33]. The `lex` command generates types from schemas [8][26].
- **OAuth:** `@atproto/oauth-client-node` was rebuilt in May 2026 [33]. **Uncertain on Workers:** an open bug reports problems with the official client's fetch options and DNS handle lookup [35]. Options: a community fork needing `nodejs_compat` [36], atcute's clients [37], or hand written OAuth, as Cloudflare's demo did [34]. Test first.
- **Listening:** we write our own records, so early stages need no listener. Jetstream's live stream needs no key; replay needs a token [38]. A hibernating Durable Object cannot hold a Jetstream socket, so Cloudflare's demo reconnects on a cron from a saved cursor [34].
- **PDS:** do not host one. The reference PDS wants 1 GB RAM, 1 CPU and 20 GB SSD for 1 to 20 users [39], about $6 a month at DigitalOcean [40].
- **Cost:** none in the pilot.

## 7. Recommended path

**Stage 0, the pilot (3 to 5 organizations)**

1. No atproto code and no login change.
2. A nullable `did` column on volunteers, coordinators and organizations.
3. Stable IDs and plain fields (title, start, end) on opportunities and contributions.
4. "Download my record" (JSON) on the volunteer page.
5. A decision record: D1 is the system of record, and no volunteer data goes on atproto without that person's consent.
6. Choose the schema domain.

Optional: a one day spike testing OAuth on Workers, kept out of the pilot.

**Stage 1, after the pilot works:** atproto login for coordinators, organization accounts, publishing chosen opportunities, and experimental schemas.

**Stage 2:** volunteer claiming, "I did this" records, and attestations for work and training.

**Stage 3, after Spaces leaves alpha and passes security review:** consider spaces or groups for data members see anyway, such as a team schedule. Checks and contact details stay in D1.

## Sources

1. https://atproto.com/guides/glossary
2. https://atproto.com/specs/repository
3. https://atproto.com/specs/lexicon
4. https://atproto.com/blog/jetstream
5. https://atproto.com/blog/introducing-tap
6. https://atproto.com/specs/oauth
7. https://atproto.com/specs/permission
8. https://atproto.com/blog/2026-spring-roadmap
9. https://atproto.com/blog/introducing-hubble-a-public-mirror-for-the-whole-atmosphere
10. https://github.com/whtwnd/whitewind-blog/blob/main/lexicons/com/whtwnd/blog/entry.json
11. https://techcrunch.com/2024/05/22/bluesky-now-has-dms
12. https://techcrunch.com/2025/07/30/germ-brings-end-to-end-encrypted-messages-to-bluesky
13. https://github.com/bluesky-social/proposals/tree/main/0016-permissioned-data
14. https://atproto.com/blog/atproto-spaces-alpha
15. https://atproto.com/blog/devex-goals-for-spaces
16. https://atproto.com/blog/atmospheric-groups-intro
17. https://raw.githubusercontent.com/lexicon-community/lexicon/main/community/lexicon/calendar/event.json
18. https://raw.githubusercontent.com/lexicon-community/lexicon/main/community/lexicon/calendar/rsvp.json
19. https://atp.readthedocs.io/en/latest/models/app/bsky/graph/verification/
20. https://bsky.social/about/blog/04-21-2025-verification
21. https://tangled.org/shindakun.net/smokesignal
22. https://badge.blue/
23. https://atproto.com/blog/network-account-management
24. https://atproto.com/guides/account-migration
25. https://atproto.com/blog/oauth-improvements
26. https://atproto.com/guides/statusphere-tutorial
27. https://smokesignal.events/
28. https://tangled.org/lexicon.community/lexicons
29. https://github.com/lexicon-community/lexicon
30. https://blueskydirectory.com/other/openmeet (third party listing)
31. https://blog.muni.town/roomy-events-via-openmeet/
32. https://next.tangled.org/flo-bit.dev/contrail
33. https://atproto.com/blog/ts-sdk-upgrades
34. https://blog.cloudflare.com/serverless-atproto/
35. https://github.com/bluesky-social/atproto/issues/3292
36. https://socket.dev/npm/package/atproto-oauth-client-cloudflare-workers
37. https://github.com/mary-ext/atcute/blob/trunk/README.md
38. https://atproto.com/blog/introducing-bluesky-protocol-services
39. https://github.com/bluesky-social/pds
40. https://www.digitalocean.com/pricing/droplets
