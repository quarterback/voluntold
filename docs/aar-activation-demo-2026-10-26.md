# Agent Action Record: Activation demo build

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Building the approved "Next demo" screens into the app: needs, first offers, availability, tiers, batches, splitting, partner sharing, problem reports and the new Today
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "okay so build that funcitonality into the demo now, this is approved for the next stage of the demo update so i can share it"
**Scope:** the seven boards in the "Next demo, current app look" row of the "Volunteer activation screens" canvas, made after the owner shared a research note on activation gaps. The owner said the October 23 mockups' structure, not their wording, was what the app had lost.
**Success defined in advance as:** the demo does what the boards show, in the current look, on phones and desktop, and can be shared.
**Authority granted to the agent:** change the app, its sample data and docs on a branch, and open a pull request.
**Out of scope:** test runs. The owner said on October 25: "No more tests... Screenshots yes, tests no."

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Branched `claude/activation-demo` from `claude/fervent-shannon-i8eyrt`, which holds the demo deploy setup.
2. Added `migrations/0002_activation.sql`: needs and need items, availability and tiers on volunteers, remote, effort, bring and files on tasks, batch numbers on asks, offer skips, problem reports, and partners.
3. Added the availability rule to `src/shared/rules.ts` (hours a week, usual times, remote) as a new reason someone doesn't fit.
4. Added to the engine: first offers, splitting work at a set time, sharing with a partner, and a volunteer taking open work from their own page.
5. Added the needs routes, and to the task routes: batches, next batch, options when work stays open, first offers, skips, problem reports and a new Today with decisions, this week and capacity.
6. Built the screens: Today, Needs (list and detail, two panes on desktop), First offers, the task page's batches and options, People rows with history, counts and tiers, the person's tier and availability, and the volunteer page's details, problem report, open work and availability.
7. Rewrote the sample data as Eastside Pantry, with a partner, Westside Pantry, so each screen has data on it.
8. Wrote decision 0010 and updated `SPEC.md` and `LATER.md`.
9. Ran the type checks and the build, ran it locally, walked the screens in a phone-sized and a desktop browser, and called the split, share, offer, take and report routes once each.

**What it produced or changed:** see the pull request's file list. The demo deploy was not run.
**Where actual behavior differed from the instruction:** the shared demo address was not updated. This session has no Cloudflare credentials, so `scripts/deploy-demo.sh` can't run here.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** build the approved boards; no test runs.
**Decisions the agent made alone, for owner review:**
- How first offers choose work: remote first, then work that asks for a specific skill, then the shortest.
- People with no usual times fit any time, so imported lists keep working.
- Tiers are shown and filtered on but don't change who fits.
- Splitting keeps people who said yes on the original and moves open spots to the new pieces.
- Sharing sends the partner a draft copy with requirements as text.
- "Days to 1st offer" counts only people who joined in the last 90 days.
- The "Open" link button on shared links shows only in dev mode, so a demo viewer can see the volunteer's page.

**Points where it should have escalated and didn't:** none known.

## 4. Deviation: the gaps
- The demo isn't deployed (no credentials in this session).
- `npm run check`, `check:docs` and the walkthrough were not run, per the owner. Some existing API tests and walkthrough steps likely fail on changed wording ("Cancel spot", "Upcoming").
- Screen copy wasn't put through `check:docs`. It was kept short by hand.
- There is no screen for adding a partner. The sample data creates one.
- No machine trace was available to reconcile this record against.

## 5. Consequence: what it cost or risked
**Observed:** the screens work locally with the sample data, with no page errors in the walk-through.
**Risk:** the demo runs in dev mode, so anyone with the link can sign in as anyone. It's safe only with made-up data. The research's point that scheduled work isn't proof of attendance is still open.

## 6. Change: what happens next
- A follow-up run put the screen text through `check:docs` at the owner's request. It fixed two standard-wording failures and replaced invented labels with the standard ones in `EDITORIAL.md` (Accepted, Declined, Pending, Expired, Eligible, Never asked, Cancel spot, Upcoming, To do).
1. Run `scripts/deploy-demo.sh` from a session or machine with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. It applies migration 0002 and deploys. Then press "Use sample data" for the new story.
2. The owner reviews decision 0010.
3. Decide whether tiers should change who fits, and how attendance is told apart from scheduled work.
