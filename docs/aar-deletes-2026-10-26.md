# Agent Action Record: Let people delete organizations, needs and any task

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Adding the deletes the tool was missing
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "you ned to make it so people can delete records right now i can't delete a demo/dummy org or record and that's not realistic". Then, while the work was running: "there's nothing i need to preserve that it's a issue if peopel delete it's just a tool i'll gate access to".
**Success defined in advance as:** A person can remove an organization they made, and the records inside it, from the screens.
**Authority granted to the agent:** Add the routes and the controls, deploy.
**Out of scope:** Undo, an archive state, soft deletes, deleting a user account.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Audited what already deleted: need items, members, custom fields, teams, team members and leads, saved lists, the AT Protocol connection, volunteers, tags, and tasks while they were still drafts.
2. Found the gaps: no way to delete an organization at all, no way to delete a need, and tasks refused once published with "Only drafts can be deleted. Cancel it instead."
3. The owner's second message settled the open question. The agent had been weighing whether finished work should stay, because decision 0002 says the schedule is the record. The owner said nothing needs preserving, so the draft only guard came out rather than being kept for completed tasks.
4. `DELETE /tasks/:taskId` now works at any status and removes the task's spots, asks, problem reports, skips and tags with it. Spots are deleted before asks, because a spot points at the ask it came from.
5. Added `DELETE /needs/:needId`: the need, its supplies and its tags. Tasks already made from it stay and lose only the link back, because they hold their own spots and asks and are deleted from the task page.
6. Added `DELETE /orgs/:orgId`, admins only, clearing 20 tables then the organization. The order came from clearing the demo database earlier today, which failed the first time on exactly this: a foreign key from spots to asks. Partner rows are removed from both sides, so no other organization keeps a reference.
7. Screens: "Delete task" on every task page, "Delete" in the need editor, and a "Delete organization" section at the foot of Settings for admins.
8. Checked it against the live demo on a throwaway organization rather than the clean sample: deleted a completed task, a need and a volunteer, then the organization itself. Counted rows in all 20 tables before and after. Before: 13 spots, 22 asks, 55 taggings, 25 volunteers and the rest. After: zero in every table, including partner references from the other direction.
9. Deleted the throwaway's partner organization through the same new route, and removed the test account.
**What it produced or changed:** `src/worker/routes/tasks.ts`, `needs.ts`, `org.ts`, `src/web/pages/TaskDetail.tsx`, `Needs.tsx`, `Settings.tsx`, this record.
**Where actual behavior differed from the instruction:** None.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** Deletes are needed. Nothing needs preserving. Access will be gated instead.
**Decisions the agent made alone, for owner review:**
- Deleting a need keeps the tasks made from it. Removing a need should not silently take away work that is already scheduled and that people have accepted.
- Hard deletes, no archive or soft delete column. The owner said nothing needs preserving, and a deleted_at column changes every query in the app.
- The organization delete asks the admin to type the name. Every other delete is one confirm. This is the only action that removes everyone else's work as well, and the owner is about to share the link. It is one extra step and can be dropped to a plain confirm if the owner wants.
- Admins only for the organization. Coordinators and team leads keep the deletes they had.
- Deleting a task removes its history: who was asked, who accepted, who attended. The owner's instruction covers this, and it is worth saying plainly because decision 0002 points the other way.
- Volunteers were already deletable and were left as they were.
**Left to the owner:** Whether the typed confirmation stays. Whether deleting a completed task should really erase its attendance, or whether that one case deserves an exception once this stops being a demo.

## 4. Deviation: the gaps
- The checks were API calls plus two screenshots of the confirmations. The agent did not click through a delete in the browser end to end.
- Nothing was checked as a coordinator or a team lead, only as an admin. The permission checks were read, not exercised.
- A volunteer holding a private link to a deleted task was not checked. The link should stop working, since the ask row is gone, but that path was not tested.
- No test was written, per the owner's standing instruction. The copy lint was run: 612 strings, up 15, all of it the delete confirmations.
- No docs check was run, per the same instruction.
- Deleting an organization leaves the person on it signed in; the screen sends them to the start page. A second admin with the page open will see errors rather than a message.
- No machine trace was available. This record has not been reconciled with `closedtab reconcile`.

## 5. Consequence: what it cost or risked
**Observed:** A person can now clear out a demo organization from the screens, which is what the owner could not do. Verified to leave nothing behind.
**Risk:** These are irreversible and there is no undo. On the demo, where anyone with the link signs in as anyone, an admin delete removes an organization for everyone in it. The owner's plan to gate access is what stands between that and a visitor.
**Also:** Deleting a task erases the record of who turned up. That is the owner's call, recorded here, and worth revisiting before real volunteer data exists.

## 6. Change: what happens next
1. Decide whether the typed confirmation on the organization stays.
2. Before real data: decide whether completed tasks keep their attendance, and whether an archive is wanted instead of a delete.
3. Worth checking: a private link to a task that has been deleted.
4. Exercise the deletes once as a coordinator and as a team lead.
