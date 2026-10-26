# Agent Action Record: Issue cleanup, the new look deploy, and an onboarding design

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Bringing the GitHub issues current, deploying the new look, designing onboarding as a feedback conversation, and emptying the demo database
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instructions given (actual wording), in order:**
1. "wipe it and make one clean sample org"
2. "did the UI get updated from what my last agent worked on in the esign chat previosly?", with a link to a Design canvas
3. "it's pushed now, update the issues on github to make them current and close what's done"
4. "i think the tool needs a legitimately onboarding that lets you see how the tool would work for your situation. study real onboarding from articles online about this and help desgn this ... import is tough because the formatting is hard to get right, so we probably won't put that feature into onboarding right now. instead, we'd do some kind of demo of the existing screens, how they work and the goal is to get feedback from them about where their bottlenecks are, how they have a tough time engaging people already and where their current set of tooling works well but where there are gaps and how a tbridge tool might be useful to them. that's really the only purpose of this tool right now"

**Success defined in advance as:** Not stated. The agent took it to mean: the issues reflect what is built, the demo serves `main`, the demo database holds one current sample, and there is a written onboarding design grounded in published practice that a reviewer can argue with.
**Authority granted to the agent:** Edit and close issues. Deploy. Delete demo data. Write a design.
**Out of scope:** Building the onboarding, merging anything further, and changing the product's direction.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Answered question 2 before acting on it: the new look was in open pull request 24, not merged, so the demo did not have it. Read the Design canvas's index only, not its 32 artboards, and said so.
2. Confirmed pull request 24 merged as `e22b91b`, ran `npm run check` (34 tests, type checks, build), deployed, and confirmed the fonts were served live. Version `17ee382f-da78-4597-8caa-03893dcce299`.
3. Listed the 12 open issues. Found every one linked to the spec on branch `claude/next-version-spec`, which was deleted when pull request 5 merged, so all 12 links were dead. Confirmed the branch was gone and the spec was on `main` with the same anchors.
4. Checked the code before closing anything: no needs inbox actions, no activity log, no notifications, no board or calendar views, no handing out rule setting. So issues 10 to 17, 19 and 20 are not built.
5. Repointed the spec links in issues 10 to 17, 19, 20 and 21 at `main`. Added a note to 17 that pull request 24 restyled the volunteer page but left its layout to do. Updated 21 to say the look no longer needs review and sections 6 and 7 still do.
6. Closed issue 22 with a comment naming the deployed version, the three migrations it carries, and the one thing in it not done: deploying on every merge.
7. For the onboarding: ran five web searches, read what came back, and wrote `docs/specs/onboarding.md`. Kept the spec's existing shape, including "Done when" lines.
8. Before emptying the demo database, listed its contents. Found 13 organizations, 12 named "Sample:", and one named "USA DATA" belonging to the owner's own address, plus a user `platisu@sol.com` who is not the owner and not the agent. Stopped and reported rather than deleting.
9. Emptied the sample data with a targeted script: 24 deletes by `org_id`, keeping "USA DATA" and both real user accounts, removing the four `demo*@example.com` accounts the agent had made during deploy checks. The first run failed on a foreign key and rolled back whole; the agent read the reference graph out of the migrations, found `spots.ask_id` pointed at `asks` which it had deleted first, reordered, and reran. 883 rows removed.
10. Created one sample set under a new shared account, `demo@voluntold.app`, and confirmed Today, needs, tasks, tags and offers all answer.
11. Wrote this record.
**What it produced or changed:** `docs/specs/onboarding.md`, this record. On GitHub: 11 issue bodies, one comment, issue 22 closed. On Cloudflare: the demo's new version, 883 rows deleted, one sample set created.
**Where actual behavior differed from the instruction:** The wipe was asked for first and done last, because the agent judged the sample should be built on the final code. The owner's "USA DATA" organization was kept, which a literal reading of "wipe it" would have deleted.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** The tool's only purpose right now is learning where organizations' volunteer work backs up; import stays out of onboarding; onboarding is a demo of existing screens aimed at feedback.
**Decisions the agent made alone, for owner review:**
- Keeping "USA DATA". It is empty, so nothing was lost by keeping it, and it is the owner's.
- Creating the sample under `demo@voluntold.app` rather than signing in as the owner. Each account on this demo sees only its own organizations, so a prepared sample is visible only to whoever owns it. A shared demo account means the owner can hand the same organization to a facilitator. The agent did not want to act as the owner's account to do it.
- "One clean sample org" produced two organizations, not one. `createSampleOrg` makes a partner organization ("Sample: Westside Pantry", 8 people) alongside the main one, because the partners feature needs one. That is the sample working as built, not accumulation.
- Repointing the issue links was read as the main part of "make them current". The agent did not update the links in the closed issues 9 and 18, which still point at the deleted branch.
- Closing only issue 22. Nothing else was verifiably done.
- In the design: recommending that almost nothing be built yet, and that the first sessions run from a written script. That is a recommendation against work, which the owner may disagree with.
- In the design: a facilitated session over a self serve walkthrough, because the follow up question is where the learning is.
- Leaving the 28/24/18/16/14 coordinator time split out of the design as a fact. It is attributed to a 2025 Better Impact report, but only vendor blogs citing it were findable, not the report. It is in the design as a hypothesis to test.
**Left to the owner:** The five open questions at the end of the design. Whether "USA DATA" should go. Whether the dead links in closed issues 9 and 18 matter. The leading `/` still on the `CLOUDFLARE_ACCOUNT_ID` secret.

## 4. Deviation: the gaps
- The research is weak evidence. The sources are vendor blogs and sales practice writing. No controlled study comparing demo formats was found, and the design says so in its own text.
- The Design canvas the owner linked was not read past its index, so the design was not checked against whatever is drawn there. The agent offered to do that comparison and did not do it.
- The five stops in the design were chosen by the agent from the screens that exist. No visitor has walked them.
- The facilitator script and the session notes template that the design calls for were not written. The design holds the questions; the one page script does not exist yet.
- No screen was opened in a browser in this run or any earlier one. Every check was API calls and status codes.
- `e2e/smoke.mjs` has still never been run against the demo.
- Whether `platisu@sol.com` should have access to the demo was not asked. That account was left alone.
- No machine trace was available. This record has not been reconciled with `closedtab reconcile`.

## 5. Consequence: what it cost or risked
**Observed:** The demo serves `main` with the new type and color. The demo database holds one current sample set plus the owner's empty organization. The issue list no longer points at a deleted branch and no longer implies the look is outstanding. There is a design to argue with.
**Risk:** `DEV_MODE = "1"` means anyone with the link signs in as any address and acts as an admin. `platisu@sol.com` has already done so. Before this demo goes to an outside organization, that is worth a decision: it is fine for a facilitated session on a call, and not fine for a link sent to a stranger with anything real in it.
**Also:** 883 rows were deleted and cannot be recovered. All of it was sample data, created by the sample button.
**And:** The design argues for building almost nothing. If the owner wants onboarding in the product soon, this record is where the disagreement starts.

## 6. Change: what happens next
1. The owner answers the five open questions in `docs/specs/onboarding.md`, in particular who runs the sessions and how many before anything is decided.
2. If the design holds: write the one page facilitator script and the session notes template, then run one session and rewrite the design from what it teaches.
3. Compare the design against the Design canvas the owner linked, if what is drawn there is meant to constrain it.
4. Decide on `DEV_MODE` for sessions with outside organizations.
5. Fix the `CLOUDFLARE_ACCOUNT_ID` secret.
6. Open an issue for deploying on every merge, if that is wanted. It was named in the comment closing issue 22 and is tracked nowhere.
