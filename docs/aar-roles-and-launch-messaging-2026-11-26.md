# Agent Action Record: Roles, succession, optional renewals and launch messaging

**Review date:** 2026-11-26
**Reviewed by:** agent self review
**Agent / system:** Claude Code, cloud session
**Task or period under review:** The owner's decisions on the membership research, from decision 0015
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "I would approve recommendations 1, 2 and 3, modify 4, and treat 5 and 6 as launch constraints." Then: "I would add one more capability: organizational succession. When a committee chair or board member leaves, Volley should preserve their responsibilities, outstanding assignments and role history." Then the messaging ("Put your membership to work."), campaigns by audience, a three-way customer discovery plan, and: "I would now stop expanding the product concept".
**Success defined in advance as:** The owner's table of decisions, succession, the new home page, campaigns and the discovery plan.
**Authority granted to the agent:** Build and write them on `claude/volley-launch-strategy-aktbyn`.
**Out of scope:** New concepts, the name, deploying.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. `migrations/0010_roles.sql`: the renewals setting (on for organizations that already had expiry dates), `roles`, `role_terms`, and a role on tasks.
2. `src/worker/routes/roles.ts`: list, create, edit and delete roles; assign or hand off, end a term, change a term's end date; a person's roles; and linking a task to a role, checked against the organization.
3. Renewal reminders go out only when the setting is on. Settings has the switch. Expiry, dues and the renewal filters hide when it's off.
4. Screens: a Roles tab with vacant and ending-soon badges, a role page (holder, responsibilities, handoff notes, open tasks, previous holders, hand off, end term), roles on a person's page, a role picker on tasks, and asked, accepted and took-part counts on a person.
5. The home page: "Put your membership to work.", the owner's subhead, "Unlimited members. No per-person fees.", "Request free access", a problem section on the same few people doing everything, a roles feature with a new screenshot from sample data, and new questions. Updated the sign-up title and page metadata.
6. Wrote `docs/launch/campaigns.md`, updated the Product Hunt draft and the research note (decisions, discovery plan, limits), decision 0015, the spec and the README.
7. Tests: 56 pass, including 3 new role tests and a renewals-off test. Checked the Roles screen in Chromium with no page errors.

**What it produced or changed:** `migrations/0010_roles.sql`, `src/worker/routes/roles.ts`, `src/web/pages/Roles.tsx`, changes in `src/worker` and `src/web/pages`, `public/screens/roles.png`, `index.html`, `test/roles.test.ts`, `test/membership.test.ts`, `test/rules.test.ts`, the launch, research, decision, spec and README docs, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the agent made on its own:**
- Renewals on by default for organizations that already had expiry dates.
- 60 days counts as ending soon.
- A task belongs to at most one role.
- Roles as their own tab.
- The home page's problem headline: "A big list means little if the same few people do everything."
- The Product Hunt tagline "Free membership and volunteer management software", from the owner's earlier draft.

**Of those, which should a human have made or seen:** The problem headline and the tagline.
**Where a human actually intervened:** None during the build.
**Points where it should have escalated and didn't:** None found.
**Accountable for these actions:** The repository owner.

## 4. Deviation: the gaps
**Gaps between intent and action, and why (root cause):** Outstanding assignments carry over only for tasks linked to a role. Spots a person holds on other tasks stay with the person.
**Good deviations (correct departures from a flawed instruction):** None.
**Confidently wrong:** None known.

## 5. Consequence: what it cost or risked
**Actual outcome (did the work hold up):** Tests and the browser checks pass. Not deployed.
**Harm / cost / risk, realized or narrowly avoided:** The Roles tab makes five items in the phone's bottom bar, which is tighter.
**Downstream affected parties:** Organizations that hand off leadership.
**Expected failure if this run happened 100 times:** Some runs would add more concepts after the owner froze the scope.

## 6. Change: what happens next
**Specific changes before next run:** Deploy, recruit the first organizations from the three discovery groups, and watch what they use.
**Keep doing:** Building only what the owner decided.
**Should not be delegated to an agent at all:** Customer interviews and approving organizations.
**Signal that the change worked:** An organization hands off a role and the new holder finds the open work.

No machine trace of this run was available for reconciliation.
