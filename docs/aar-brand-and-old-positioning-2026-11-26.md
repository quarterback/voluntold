# Agent Action Record: Removing the old "volunteer activation" wording, and one place for the name

**Review date:** 2026-11-26
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** Bringing the app's remaining copy in line with the membership positioning, and making the name easy to change
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "i thughi had you uodate the site and it's not update withthe new mission of the work", then "it' still a volinteer activiation tool and that's not what i wanted it to say it needs to have the new content in theory because i want to update the name of what th is is"
**Success defined in advance as:** Not defined in advance. The agent took it as: no "volunteer activation" anywhere, the new positioning everywhere, and a rename that takes one change.
**Authority granted to the agent:** Change the app on `claude/volley-launch-strategy-aktbyn`, pull request #32. The Vloora site's Volley page is a separate record in that repository.
**Out of scope:** Choosing the name.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Searched for the old wording. It was in the demo intro, the share card image and its alt text.
2. Added `src/shared/brand.ts` with the name, tagline, description and contact address. The home page, demo intro, guide, start page, link previews for volunteer pages and `index.html` read from it. `vite.config.ts` fills `index.html` at build time.
3. The wordmark is drawn outlines that spell Volley. After a rename it shows the new name as text until new outlines are drawn.
4. Demo intro now says the product is free membership and volunteer management software.
5. Share card redrawn with "Put your membership to work". The page's link previews now point at volleydemo.vloora.com instead of the old workers.dev address.
6. The guide's settings stop no longer calls the people who run the tool "Members".
7. `npm run check` passes, 60 tests. The docs check passes apart from the guide's long sentences, as before.

**What it produced or changed:** `src/shared/brand.ts`, `vite.config.ts`, `index.html`, `public/og.png`, `scripts/og-card.html`, `src/web/Wordmark.tsx`, `src/web/pages/DemoIntro.tsx`, `Guide.tsx`, `Home.tsx`, `Start.tsx`, `src/worker/routes/volunteer.ts`, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- The page title "Volley: Put your membership to work".
- Pointing link previews at volleydemo.vloora.com.
- Showing a renamed product as text in the display face until a new wordmark exists.

**Of those, which should a human have made or seen:** The page title.
**Where a human actually intervened:** The owner pointed out the old wording.
**Points where it should have escalated and didn't:** The earlier home page rewrite missed the demo intro and the share card. A search for the old wording should have been part of it.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):** The demo guide's stops still teach the volunteer features with food-pantry samples. Sample organizations have no roles, renewals or reports to show.
**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** The earlier claim that the home page carried the new positioning, when other screens still had the old line.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** Checks pass. Nothing is deployed until the branch is.
**Harm / cost / risk, realized or narrowly avoided:** The live demo shows the old wording until this branch is deployed.
**Downstream affected parties:** Visitors to the demo, and anyone who shares its link.
**Expected failure if this run happened 100 times:** Some runs would rename strings by hand and miss some.

## 6. Change: what happens next
**Specific changes before next run:** Deploy the demo from this branch. Add roles, renewals and reports to the sample organizations and the guide.
**Keep doing:** Searching every file for retired wording after a positioning change.
**Should not be delegated to an agent at all:** The name.
**Signal that the change worked:** Changing `BRAND.name` and rebuilding renames the product everywhere except the wordmark outlines.

No machine trace of this run was available for reconciliation.

## Follow-up: the membership sample

**Instruction (actual wording):** "remove the old sample", "and update it", then "make sure to clean up the text against humanizer and ap style skill and remove any slop".
**What changed:** The demo's membership sample, Riverbend Design Alliance, now calls its people members, has categories (Professional, Student, Life member), renewal dates spread so every renewal report has people in it, six roles (one vacant, one term ending soon, one with a past holder, three with linked tasks), and two pending applications. It is first in the demo's sample picker. `src/worker/samples/common.ts` gained an optional `membership` block, and `src/worker/sample.ts` writes it. The Vloora site's Volley page now uses screenshots from this sample instead of the food pantry. 60 tests pass.
**Decision made alone:** The renewal dates, roles, terms and applications in the sample, and putting it first in the picker.

## Follow-up: the name ManyArms

**Instruction (actual wording):** "new product is gonna be called EightArms or ManyArms (.app) deciding now", then "Many Arms is easier to say and could be fun to brand with a wordmark".
**What changed:** `BRAND.name` is ManyArms. New wordmark outlines drawn from PP Object Sans Heavy with fontTools, at the old wordmark's tracking (checked by rebuilding the Volley outlines first). New favicon and app icons, share card and `public/wordmark.svg`. Link previews point at manyarms.app. Added an `[env.production]` block in `wrangler.toml` for manyarms.app, `scripts/deploy-production.sh`, which refuses to run until the database id and `ADMIN_EMAILS` are set, and the checklist `docs/launch/deploy.md`. Decision 0016 records the name. 60 tests pass.
**Decisions made alone:** One word, ManyArms. The address plan. Keeping volleydemo.vloora.com alive. Leaving `ADMIN_EMAILS` empty in the repository, so no personal address is committed.

## Follow-up: the Heilo Champion wordmark and the production deploy

**Instruction (actual wording):** "go ahead with the deploy", then "found a wordmark logo for the product under its new name as manyarms (all lower case, one word)" with the Heilo Champion font kits, then "i have the logo already in non webfont too not just webont i have the desttop version".
**What changed:** Created the production database `manyarms`, ran migrations 0001 to 0011, deployed `voluntold-production` to manyarms.app with the 15-minute schedule, and set the secrets APP_SECRET (generated, never shown), EMAIL_FROM and RESEND_API_KEY. That key is a new sending-only Resend key limited to mail.manyarms.app, passed straight to Cloudflare without being printed. `ADMIN_EMAILS` is now a secret instead of a committed variable; it isn't set yet. The wordmark, favicon, icons and share card are redrawn from Heilo Champion Regular with the font's kerning, under the owner's desktop license. The font files stay out of the repository.
**Decisions made alone:** Regular over Slant. Keeping prose as "ManyArms". Making ADMIN_EMAILS a secret.
**Open:** The owner proposed signup@mail.manyarms.app as the admin address, but that subdomain only sends, so it can't receive sign-in codes. The owner stopped a test sign-in email to Resend's test address partway, so delivery from production isn't confirmed. The Heilo font has only capitals, so the lowercase "manyarms" the owner described renders as MANYARMS.
