# Agent Action Record: The demo runs in the browser at volleydemo.vloora.com

**Review date:** 2026-10-30
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** Moving the public demo off the shared server onto a copy that runs in each visitor's browser, served at volleydemo.vloora.com
**Accountable human (name or role):** Ron Bronson, founder

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "i realie that vloora.com/volley is opening volley's demo in a cloudflare temporary and that's not gonna work for me, so i' mgonna attach it to a sudomain but i wonder how to have a demo that works more lke this one https://tack.social/try/". Then: "it's gonna be volleydemo.vloora.com, there wouldn't be a get your own button there are more expamples now when you look at the repo over there so do that. 1do the demo mode like they have and repoint my new url to this new demo experience lke tack's experience except no get your own button bcause our traffic isn't there yet." Mid-run: the founder attached volleydemo.vloora.com to the `voluntold-demo` worker, merged #29 (the six sample organizations), and said to rebase on `main`.
**Success defined in advance as:** volleydemo.vloora.com opens a demo that works like Tack's: no sign-in, sample data, everything kept in the visitor's browser, a reset, and no "get your own" button. It uses the six samples and the guide now on `main`.
**Authority granted to the agent:** Build it in this repository on `claude/confident-cray-btdxyh`, deploy it to the new address, and point vloora.com/volley at it.
**Out of scope:** Changing the guide, the samples or the product page copy on the app's home page.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Fetched tack.social/try. It's a static build under `/try/` whose security policy lets the page talk only to its own site, so the board and its "forge" run in the browser.
2. Found the six samples and the new guide on the unmerged branch, built on it, then rebased onto `main` once the founder merged #29.
3. Ran the worker's own Hono app in the page instead of rewriting the API. `src/browser/d1.ts` gives it D1 over sql.js. `src/browser/cookie.ts` replaces `hono/cookie`, because browsers drop cookie headers on requests and responses made in script. `src/browser/main.ts` runs the migrations, saves to IndexedDB after changes, reloads when another tab has saved, signs the visitor in as you@example.com, runs the sweep, serves `/v/` and `/t/` links as pages, and turns export links into downloads.
4. Changed the app in five places, only in the demo build: `/` goes to the picker, `/login` reloads instead of asking for a code, the organization switcher goes to the picker, and **Start over** replaces the email in the sidebar and **Sign out** in Settings. The picker says "Runs in your browser · Changes stay here".
5. Added `npm run build:demo` and `npm run dev:demo`. The demo build swaps `model.ts` and the Anthropic SDK for stand-ins, which cut the main script from 1.4 MB to 1.07 MB.
6. Tested in Chromium locally and then live: all 23 guide stops in the radio sample, the volunteer page in a second tab, accepting there and seeing it on the coordinator's task, a CSV export, the sample CSV import, Start over, a reload, and phone width. No page errors.
7. Deployed with `wrangler.browser-demo.toml` under the worker name `voluntold-demo`, which replaced the server demo at both volleydemo.vloora.com and the workers.dev address. The old deploy script is now `scripts/deploy-server-demo.sh`.
8. The founder said the first version skipped the product page and dropped visitors onto the picker with no context. The demo now opens on the product page without its sign-in buttons. Try the demo leads to the picker, which opens with `DemoIntro.tsx`: what Volley is, three steps for the demo, and where to send answers. The picker's wordmark links back to the product page. The intro is exempt from the eight-word screen rule in `scripts/check-docs.mjs`, as the home page and guide are.
9. Ran `npm run check`: type checks, both builds and 34 tests pass. Ran `npm run check:docs`; see section 4.

**What it produced or changed:** `src/browser/` (new), `src/web/demoMode.tsx` (new), `src/web/main.tsx`, `App.tsx`, `pages/Start.tsx`, `pages/OrgShell.tsx`, `pages/Settings.tsx`, `vite.config.ts`, `package.json`, `tsconfig.json`, `.gitignore`, `.editorial.json`, `wrangler.browser-demo.toml`, `scripts/deploy-demo.sh`, `scripts/deploy-server-demo.sh`, `README.md`, `docs/specs/browser-demo.md`, and this record. Two Cloudflare deploys of `voluntold-demo`.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- Running the worker's code in the page rather than writing a second, fake API. The demo can't drift from the app this way.
- Replacing the server demo under the same worker name, so the domain the founder attached keeps working. The server demo can come back with `scripts/deploy-server-demo.sh`.
- Turning workers.dev back on for the new demo, so links already shared still open.
- The wording of the picker's intro, and exempting it from the eight-word screen rule.
- The wording "Runs in your browser · Changes stay here" and "Undo all your changes?" for Start over.

**Of those, which should a human have made or seen:** The picker intro and the Start over wording.
**Where a human actually intervened:** The founder attached the domain and merged #29 during the run. He then asked for the product page first and for an intro on the picker.
**Points where it should have escalated and didn't:** Sending visitors straight to the picker dropped the product page the founder built. That should have been raised before deploying.
**Accountable for these actions:** The founder, for the deploy he asked for; the agent, for the code.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):**
- `npm run check:docs` fails on `main` before this change: 31 interface strings in `Guide.tsx`, `Home.tsx` and `Start.tsx` run past the word limits. This change adds none and leaves them for the owner.
- One live test run timed out on the first, cold load. The next run opened the picker in about 3 seconds.
- Dark mode wasn't checked.
- No machine trace was available to reconcile this record against.

**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** None known.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** volleydemo.vloora.com serves the browser demo. Each visitor gets their own copy of the six samples, with no sign-in and nothing sent to a server.
**Risk:**
- The old server demo's database and sessions are no longer reachable through the site. Anyone mid-demo there lost their place.
- Two tabs changing things at the same moment can overwrite each other's last change.
- The page loads about 1 MB of script and a 0.7 MB SQLite file.

## 6. Change: what happens next
1. Founder opens volleydemo.vloora.com and checks the picker intro and Start over.
2. Merge this branch so `main` matches what's deployed.
3. Decide whether the guide's long strings get shortened or exempted, so `check:docs` passes on `main`.
4. Next run: deploy the demo with `scripts/deploy-demo.sh`, not the server script.
