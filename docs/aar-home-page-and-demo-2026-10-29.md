# Agent Action Record: Home page and demo tour, on the Volly look

**Review date:** 2026-10-29
**Reviewed by:** agent self review
**Agent / system:** Claude Code, main session
**Task or period under review:** A public home page and a guided demo for new people, rebuilt on the current design
**Accountable human (name or role):** Repository owner (the founder)

## 1. Intent: what was supposed to happen
**Instruction given:** The tool needs a proper home page, like a SaaS product page with screenshots, and a demo mode so a new person knows where to go and what to do. Sample data is a good default, since most people will use it to look around. Then: "That is not using the new design that I already have on the repo. Check the repo and get the more modern design that currently exists." Standing instructions: no test runs, screenshots yes.
**Success defined in advance as:**
- A public page at `/` in the Volly look, with real screenshots and a way into the demo.
- A new person who signs in lands on the sample organization by default and gets walked through it.
- Screenshots for the owner.

**Authority granted to the agent:** Change the app and docs on `claude/volunteer-product-spec-946b8g` and push.
**Out of scope:** Deploying. This session has no Cloudflare credentials.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Built the first version on the branch as it stood. The owner saw it and said it wasn't the current design. The branch had been merged as PR #3 on October 25 and `main` had moved on: the activation demo (needs, offers, availability), tags, the Volly codename with a wordmark and favicon, the owner's fonts and palette, and a deployed demo at `voluntold-demo.square-dawn-9932.workers.dev`. The agent hadn't checked `main` before building. That mistake is section 4.
2. Kept the first attempt under the local branch `old-home-demo`, reset the working branch onto `main`, and rebuilt the local database with the current migrations.
3. Read decision 0011, the next version spec, `docs/specs/onboarding.md` and the October 26 records, then rebuilt both pieces:
   - `src/web/pages/Home.tsx`: an ink header and hero with the Volly wordmark in lime, the owner's line "Volunteers activated" with the slanted tangerine cut from the card, two sentences from the spec's "What the tool is for", and lime "Try the demo" buttons. Four features with the new-look screenshots already in `docs/screens/new-look/`, shrunk into `public/screens/`. An ink call-to-action block and a footer with the wordmark. No invented claims and no Vloora line, as the owner asked on October 26.
   - `src/web/pages/DemoTour.tsx`: the five stops from `docs/specs/onboarding.md`, Today, People, the task with the group to ask next, the volunteer page, and Tags, as an ink card with a lime Next button. Each stop names what the screen shows and asks the question the onboarding design asks, since the demo's purpose is to learn where the visitor's volunteer work backs up. Stop 4 has an "Open volunteer page" button, backed by `POST /api/orgs/:id/demo/volunteer-link`, which renews the latest waiting ask's link in a sample organization only.
   - `src/web/pages/Start.tsx`: a new person sees "Start with the demo" first, with "Or create your organization" under it. "Try the demo" on the home page signs the person in and lands them in the sample organization.
   - `migrations/0004_sample_orgs.sql` flags the sample organization. `POST /api/sample` creates one per person, or returns the one they have, and works outside dev mode. The partner organization the sample creates isn't flagged, so the tour shows only in Eastside Pantry.
4. Found two overlaps in the screenshots and fixed them: the tour card sat under the Urgent ask button on phones, and over it on desktop. The card now sits above other controls on phones and at the bottom left of the content on desktop.
5. Exempted the home page and the tour from the no-sentences screen rule in `scripts/check-docs.mjs`. Both are prose by design.
6. Ran the app locally and took screenshots: the home page at desktop and phone width, the first screen for a new person, each stop on a phone, the volunteer page opened from the tour, and two stops on desktop.
7. The owner then said the tool is called Volley, not Volly. Renamed it everywhere outside the historical records: the page title and OpenGraph tags, the card and its image, the favicon's label, and the wordmark. The wordmark is outlines, so the agent installed fonttools, pulled the glyphs for "Volley" from PP Object Sans Heavy, and derived the tracking from the old mark (minus 45 units, the same minus 0.045em the card uses). The V outline came out identical to the old one, which confirmed the method. The favicon's V is unchanged.

**What it produced or changed:** `src/web/pages/Home.tsx`, `DemoTour.tsx`, `Start.tsx`, `App.tsx`, `OrgShell.tsx`, `Login.tsx`, `Wordmark.tsx`, `public/screens/*`, `public/wordmark.svg`, `public/favicon.svg`, `public/og.png`, `index.html`, `scripts/og-card.html`, `migrations/0004_sample_orgs.sql`, `src/worker/index.ts`, `db.ts`, `sample.ts`, `routes/org.ts`, `routes/tasks.ts`, `scripts/check-docs.mjs`, `README.md`, and this record.
**Where actual behavior differed from the instruction:** The first attempt was built on stale code and shown to the owner. It cost a round.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** A product home page with screenshots. A demo for new people, with sample data as the default. The current design, not the October 25 one.
**Decisions the agent made alone, for owner review:**
- Putting "Volunteers activated" on the home page. The October 26 record left whether the tagline goes on a screen to the owner. A product page is the place for it, so the agent used it.
- The two sentences under it, taken from the spec's "What the tool is for".
- The five stops and their questions, taken from the onboarding design rather than written fresh. That design recommended building almost nothing until sessions had run. The owner has now asked for a demo mode, so the stops went in as a card, with the questions kept because they're the point.
- One sample organization per person, reused on later visits.
- `POST /api/sample` open to any signed-in person, outside dev mode too.

**Left to the owner:** The feature headings and copy on the home page. The wording of the five stops. Whether the questions should stay on the card or move to a facilitator script.

## 4. Deviation: the gaps
- The agent built on a merged, stale branch without checking `main` first. The repository's rule for a merged branch is to restart it from `main`. Next run: `git fetch` and compare before any work.
- No test runs, as the owner asked. The type checks and the build ran so the deploy won't fail.
- The home page screenshots are the October 26 new-look set, so the dates in them read October 26.
- The home page screenshots show the desktop at a small size in the two-column features. Readable as a picture of the screen, not as text.
- Dark mode wasn't checked.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** The type checks and the build pass. The screenshot run signed in as a new person, took the demo, went through all five stops, opened the volunteer page from stop 4 and reached Tags.
**Risk:**
- The demo deploy must run migration 0004. `scripts/deploy-demo.sh` applies migrations before deploying.
- The first attempt's commits were force-pushed away. They're on the local branch `old-home-demo` in this session only.

## 6. Change: what happens next
1. Owner reads the home page and the five stops, and changes any wording.
2. Someone with the Cloudflare secrets runs `scripts/deploy-demo.sh` from this branch, or merges and deploys from `main`.
3. Next run, before any build: fetch, check whether the branch was merged, and restart from `main` if so.
