# Agent Action Record: Research making the product AT Protocol native

**Review date:** 2026-10-24
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session, research subagent)
**Task or period under review:** Research note on atproto for the volunteer product
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (summary of the actual request):** Research what "AT Protocol native" means for this product, the current state of private data on atproto, a public versus private data split, the no account rule and later claiming, apps to learn from, tooling and costs, and a staged path. Cite a source for every factual claim, check 2025 and 2026 sources, keep it under 1,800 words in plain language with no em dashes, and write it to `docs/research/atproto-native-2026-10.md`.
**Success defined in advance as:** The file exists, stays under 1,800 words, cites sources, and marks what is uncertain or only proposed.
**Authority granted to the agent:** Web research and writing that one file.
**Out of scope:** Changing the PRDs, architecture or decision records, and writing application code.

## 2. Action: what actually happened
1. Skimmed `README.md`, `PRODUCT-PRD.md`, `ARCHITECTURE.md` and `AGENT-HANDOFF.md`.
2. Searched the web and read primary sources: atproto.com specs and 2025 to 2026 blog posts (Spring 2026 roadmap, Spaces alpha, Spaces developer goals, atmospheric groups, TypeScript SDK upgrades, Bluesky Protocol Services, Tap, Hubble), proposal 0016, the atproto repo's Spaces pull request and Workers OAuth issue, Lexicon Community schemas, Smoke Signal, badge.blue, Cloudflare's Statusphere post and the PDS README.
3. Wrote the note, then cut it from about 2,300 words to 1,792 (counted with `wc -w`, sources included).
**What it produced or changed:** `docs/research/atproto-native-2026-10.md` and this record.
**Where actual behavior differed from the instruction:** Some secondary facts rest on third party pages, marked as such (OpenMeet listing). Blacksky, Graze and Frontpage got one line each because they matter little to this product.
**Stayed within granted authority?** Yes. Nothing was committed or pushed.

## 3. Judgment: human in the loop
**Decisions the agent made alone, for owner review:**
- D1 stays the system of record, and atproto is an opt in layer added after the pilot.
- Organization membership is treated as sensitive and kept private unless the person publishes it.
- Background check results are never published, even as "passed".
- No atproto code goes in the pilot. Only a nullable `did` column, stable IDs, a JSON export and a decision record.
**Left to the owner:** The schema domain, whether any opportunity is ever public by default, consent wording, and whether to write the decision record.

## 4. Deviation: the gaps
- Several pages could not be fetched (404 or 403), including the Frontpage tech talk and one Workers OAuth blog post. Claims that depended on them were dropped.
- Whether the official OAuth client runs on Workers is still unconfirmed. The note marks it Uncertain and recommends a spike.
- No primary 2026 source was found on whether Bluesky DMs are now encrypted. Marked Uncertain.
- Nothing was built or run. No machine trace was available, and the `closedtab` CLI was not installed, so `closedtab check` was not run.

## 5. Consequence: what it cost or risked
**Observed:** The founder has a sourced note to hand to coding agents, with a pilot plan that adds almost no work.
**Risk:** Spaces and atmospheric groups are changing week to week. The note will go stale within months.

## 6. Change: what happens next
1. The owner reviews the judgment calls in section 3.
2. If accepted, write a decision record saying D1 is the system of record and atproto is opt in.
3. Repeat the private data research before stage 3, or when Spaces launches.
