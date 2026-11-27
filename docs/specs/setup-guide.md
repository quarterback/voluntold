# Spec: sign-up and the setup guide

**Status:** built November 27, 2026, from [decision 0017](../decisions/0017-setup-guide-and-import.md). The research behind it is in [the research note](../research/onboarding-and-import-2026-11.md).

This covers what a new organization sees from "Request free access" to its first ask. The owner reshaped it twice on November 27: first asking for a guided first run, then for one helper that leads sign-up and stays through setup. It replaces the part of [the onboarding spec](onboarding.md) that said not to build a setup guide. That spec's facilitated sessions and its demo guide are unchanged.

## Sign-up

One question on each screen, with a progress bar and one line of help beside the helper's face. Nothing is created until the last step, so a person who stops leaves nothing half set up.

1. **What is your organization called?** The name, and what it calls its people: volunteers, members, or participants.
2. **How do we reach you?** The person's email, and a website if there is one.
3. **Tell us about your group.** How many people, and where the list is today. The person confirms everyone on the roster is 18 or older. The screen says why it asks: an admin of the tool reviews each organization before it can send email ([decision 0013](../decisions/0013-approve-new-organizations.md)).
4. **Check your email.** The 6 digit code. "Create organization" checks the code, creates the account and the organization, and opens Today.

Someone already signed in sees steps 1 and 3 only. Answers survive a reload until the organization is created.

**Done when:** a person can create an organization on a phone, one question at a time, without scrolling.

## The setup guide

After the organization exists, a helper stays with the person from screen to screen. It sits where the demo guide sits: beside the page on a wide screen, a sheet above the tabs on a phone. It shows one step at a time.

| Step | Finishes when | Can skip |
|---|---|---|
| Create your organization | Always done | |
| Add another admin | The organization has two people who can sign in | Yes |
| Bring in your people | The organization has one person | |
| Check what you track about people | The person chooses Done on Custom fields | Yes |
| Create your first task | The organization has one task | |
| Ask people to help | The organization has sent one ask | |

- **Before the person goes there,** the guide shows the step's name, one line on what it is for, and one button. "Bring in your people" also has "Add one person". Its line follows the sign-up answer: upload your spreadsheet, or export from your current tool.
- **Once they are on that screen,** the line changes to what to do there, and the button goes away. On a phone the sheet shrinks to a strip, so it stays out of the way of the work.
- **When the step is done,** the guide moves to the next one by itself. The server counts admins, people, tasks, and asks each time the person changes screens. Nobody ticks a box.
- **All steps** are listed under the current one on a wide screen, and behind a button on a phone. Tapping one opens it.
- Until the organization is approved, the "Ask people to help" step says email is off and links can be copied.
- When every step is done or skipped, the guide says "Setup is done". Choosing Done removes it for good.
- While setup is unfinished and the organization is empty, Today leaves out "Capacity" and "Urgent ask".

**Putting it away.** The close button shrinks the guide to a small "Setup" button with the count, which brings it back. Settings has a "Setup guide" row that does the same. Both go away when setup is finished.

**Who sees it.** Admins and coordinators of a real organization. Team leads and sample organizations don't.

**The helper's face** is a round head with five arms. It is a placeholder drawing for the owner to approve or replace. The help is scripted. It is not a chatbot, and nothing a person types goes to a model.

**Done when:** a new organization can go from sign-up to a sent ask using only the guide's buttons, and `node e2e/smoke.mjs` walks that path.

## Settings

Settings is a menu. Each row has a name and one line saying what is inside, and opens its own page.

1. Organization: name, what you call your people, asks per person each week, your sign-up page
2. Custom fields
3. Tags
4. Teams
5. Membership: membership types, renewals and dues, online applications
6. Admins and coordinators
7. Import and export
8. Advanced: post tasks to Bluesky, delete the organization

**Bluesky posting** shows under Advanced only when all of these are true: the person is an admin, the server can post, and setup is finished. An organization that already connected an account always sees it. The task form shows its "Post to" switch only when an account is connected. The words "AT Protocol" don't appear in the interface.

## Import

Three steps, one on screen at a time: Upload, Match columns, Review.

**Upload.** One button. A sample file to download, and a link to add one person instead. Import history sits below, with Undo import.

**Match columns.** The tool finds the row that holds the column names, even under a title, and says how many title rows it skipped. Columns come in three groups:

- **Matched:** columns the tool recognized. Each shows its name, its first three values, and an "Import as" list.
- **Other columns:** columns it didn't recognize. Each has a Keep switch. A kept column becomes a custom field, with a type chosen from its values.
- **Left out:** the other tool's record numbers, timestamps, and empty columns, behind a "Show" button.

The rules that matter:
- Only one column is the email and one the phone. The tool chooses by what the cells hold, not only the column's name.
- First name and last name are separate choices. A full name column works too.
- A person needs a name and an email or phone.

**Review.** Three counts: new, merged, skipped. Then the first three people as they will be saved, possible duplicates with Merge or Keep both, and the skipped rows with the reason. Nothing is saved until "Import".

**After.** Counts, View people, Download skipped rows, and Undo import. Undo removes the people that import added, except anyone asked since. Details merged into people who were already there stay.

**Done when:** every file in `samples/exports/` imports with the right names, emails, phones, and dates, and `npm test` checks it.

## Help lines

These screens carry one line of help where a person would otherwise have to guess. The rule and its limits are in `EDITORIAL.md`, under "Help lines".
