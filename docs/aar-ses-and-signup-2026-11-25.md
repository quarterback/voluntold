# Agent Action Record: Amazon SES and a sign-up path for launch

**Review date:** 2026-11-25
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** Moving email to Amazon SES, and letting a new organization sign up on the live site
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "I think aws i s bettee than resend. And yes there needs to be a real user signup now flow i had it before just a a demo but wemd want a different patj for consimers when i launch the site to be able to signup and use the tool but i built this a sa demo and now we're just gonna prep it for launch and launch it on black friday"
**Success defined in advance as:** Not defined in advance. The agent took it as: all email goes through SES, and a stranger on the live site can sign up and create an organization without help.
**Authority granted to the agent:** Change the code on `claude/volley-launch-strategy-aktbyn`.
Later: "Or resend or another tool faster? I dont want a lag". The agent explained that the lag is SES's production-access review, not sending speed, and added Resend back as a second provider.
**Out of scope:** The AWS account, domain verification, deploying, the product name and the home page's wording.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Told the owner up front that new SES accounts can only send to verified addresses until AWS grants production access.
2. Added `aws4fetch` 1.0.20 to sign SES requests. `sendEmail` in `src/worker/mail.ts` calls the SES v2 API. Sign-in codes and the tool's emails both use it, 10 at a time. Resend is gone.
3. Changed the environment variables to `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (default `us-west-2`) and `EMAIL_FROM`.
4. Changed the email tests' stand-in to check the SES address and the signature header.
5. The live home page now leads with Get started and offers Sign in and Try the demo. The browser demo's home page is unchanged.
6. Get started opens the sign-in page titled "Get started". After the code, a new account lands on "Set up your organization", with a link to try a sample. Before, it landed on the sample picker with no way to create an organization. The picker now always links back to setup.
7. Ran `npm run check`: 43 tests pass. Walked the sign-up path in Chromium at phone width: home, Get started, code, setup, then the new organization's settings. No page errors.
8. Updated the README, the spec and 0012.
9. After the owner asked about lag, added Resend back. `sendEmails` uses Resend's batch endpoint when `RESEND_API_KEY` is set, and SES otherwise. Added a test for it; 44 tests pass.

**What it produced or changed:** `package.json`, `package-lock.json`, `src/worker/mail.ts`, `src/worker/auth.ts`, `src/worker/env.ts`, `.dev.vars.example`, `test/email.test.ts`, `src/web/pages/Home.tsx`, `Login.tsx`, `Start.tsx`, `README.md`, `docs/SPEC.md`, `docs/decisions/0012-free-launch-and-email.md`, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- Using `aws4fetch` instead of writing request signing by hand.
- Removing Resend, then adding it back as a second provider that wins when both are set.
- The default region `us-west-2`.
- The labels Get started, Set up your organization, Try a sample organization and Continue.
- Leaving Try the demo pointing at sample organizations on the live server, not at volleydemo.vloora.com.

**Of those, which should a human have made or seen:** The labels, and where Try the demo goes on the live site.
**Where a human actually intervened:** None during the build.
**Points where it should have escalated and didn't:** None found.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):** The SES code has been tested only against a stand-in. It hasn't sent a real email.
**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** None known.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** Tests and the browser walk-through pass.
**Harm / cost / risk, realized or narrowly avoided:**
- Without SES production access before Black Friday, sign-in codes reach only verified addresses, so nobody else can sign in.
- On the free Workers plan, a request can make only 50 outside calls, so an ask to more than about 45 people would fail partway.
- The home page calls the product "AI-native". The owner said the launch shouldn't be framed around AI. The agent didn't change it.

**Downstream affected parties:** New organizations signing up at launch.
**Expected failure if this run happened 100 times:** Some runs would point Try the demo somewhere the owner didn't expect.

## 6. Change: what happens next
**Specific changes before next run:** Get SES production access, verify the domain, set the secrets, run the migration on production, deploy, and send one real ask to a personal inbox.
**Keep doing:** Walking the real path in a browser, not only running tests.
**Should not be delegated to an agent at all:** The AWS account, the domain, and the home page's wording.
**Signal that the change worked:** A stranger signs up and sends an ask on launch day with no help.

No machine trace of this run was available for reconciliation.
