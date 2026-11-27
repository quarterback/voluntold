# Spec: sign-up and the setup guide

**Status:** built November 27, 2026, from [decision 0017](../decisions/0017-setup-guide-and-import.md). The research behind it is in [the research note](../research/onboarding-and-import-2026-11.md).

This covers what a new organization sees from "Request free access" to its first ask. It replaces the part of [the onboarding spec](onboarding.md) that said not to build a setup guide. That spec's facilitated sessions and its demo guide are unchanged.

## Sign-up

1. **Email and code.** Unchanged.
2. **Create your organization.** The organization's name, and what it calls its people: volunteers, members, or participants.
3. **Tell us about it.** How many people, where the list is today, a website, and what the organization will use the tool for. The last two are optional. The screen says why it asks: an admin of the tool reviews each organization before it can send email ([decision 0013](../decisions/0013-approve-new-organizations.md)). The person confirms everyone on the roster is 18 or older.

The organization then opens on Today.

**Done when:** a person can create an organization on a phone without scrolling past a field they don't understand.

## The setup guide

A card at the top of Today, titled "Get started", with a count and a progress bar.

| Step | Finishes when | Can skip |
|---|---|---|
| Create your organization | Always done | |
| Choose what to track about people | The person opens Custom fields, or the organization has people | Yes |
| Add your people | The organization has one person | |
| Create your first task | The organization has one task | |
| Ask people to help | The organization has sent one ask | |
| Add another admin | The organization has two people who can sign in | Yes |

- The first unfinished step is open. It shows one line of help and one button. The "Add your people" step also has "Add one person". Tapping another step opens it instead.
- The help for "Add your people" follows the sign-up answer: upload your spreadsheet, or export from your current tool.
- Nobody ticks a box. The server counts people, tasks, asks, and admins each time the organization loads.
- Until the organization is approved, the card says so in one line, and that links can be copied meanwhile.
- While the guide shows and the organization is empty, Today leaves out "To do", "Capacity", and "Urgent ask".

**Where it goes.** The close button hides the guide. Settings shows a "Setup guide" row with the count, and the desktop menu shows the same, until every step is done or skipped. Either one brings the guide back. When every step is done or skipped, the guide and both links go away.

**Who sees it.** Admins and coordinators of a real organization. Team leads and sample organizations don't.

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

**Bluesky posting** shows under Advanced only when all of these are true: the person is an admin, the server can post, and the setup guide is finished or hidden. An organization that already connected an account always sees it. The task form shows its "Post to" switch only when an account is connected. The words "AT Protocol" don't appear in the interface.

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
