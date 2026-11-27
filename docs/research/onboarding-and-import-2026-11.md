# Research: first-run setup, naming, and import

**Date:** November 27, 2026.
**Asked for by:** the owner, after signing up at manyarms.app on a phone. In the owner's words, the sign-up and onboarding had "no flow", assumed "too much from a user", and used section names that were "too arcane". The owner also asked for a fake import from another tool, because nobody had seen one work.

This note records what the research found and what the import test showed. The design that came out of it is in [the setup guide spec](../specs/setup-guide.md) and [decision 0017](../decisions/0017-setup-guide-and-import.md).

## How to read the evidence

Three agents did the web research on November 27, 2026. Each marked its findings:

- **Read:** the agent opened the vendor's own help page.
- **Summary:** the wording comes from a search summary of the vendor's page. The page itself would not open.
- **Recalled:** from the model's memory, not confirmed that day.

Most sources are vendor help centers and design system guides. They show what tools do, not what works best. No controlled study turned up for any question here.

## What other tools call things

Ten tools had pages the agent read: Better Impact, Volgistics, Timecounts, Track It Forward, VolunteerHub, Bloomerang Volunteer, Rosterfy, Join It, Mailchimp, and Givebutter.

| Our old label | What others say | What we use now |
|---|---|---|
| Custom fields | "Custom fields" in Better Impact, Join It, and Givebutter. "Profile fields" in Timecounts and Track It Forward. | Custom fields |
| One choice | "Dropdown" or "Drop Down" in nearly every tool | Dropdown |
| Many choices | "Checkboxes" in Mailchimp, Google Forms, and Track It Forward | Checkboxes |
| Text | "Short Text" in Better Impact, "Short answer" in Google Forms | Short text |
| Categories | "Membership types" in Join It, Glue Up, and ClubExpress. "Membership levels" in Wild Apricot. | Membership types |
| Open application page | "Membership application form" in Wild Apricot, "Application forms" in Glue Up | Accept applications online |
| Coordinators | "Admins" or "Administrators" in Timecounts, Join It, Wild Apricot, and Better Impact. "Users" in the CRMs. No tool surveyed uses "Coordinators". | Admins and coordinators |
| Weekly ask limit | No volunteer tool surveyed has one. HubSpot has a "send frequency cap". | Asks per person each week |
| Map columns | "Match" in Mailchimp. HubSpot uses "Import as" and "Don't import column". | Match columns, Import as, Don't import |
| AT Protocol | No tool surveyed puts integrations ahead of basic setup. Givebutter has an Integrations tab beside Users. Join It keeps automations out of Settings. | Post tasks to Bluesky, under Advanced |

"Multiple choice" means pick one in Google Forms and Timecounts, and pick many in Wild Apricot. We avoid it.

**Not changed, and worth the owner's attention.** The research also found that "Shift" is close to universal for timed volunteer work, that no surveyed tool calls an invitation an "ask", and that "Needs" exists only as an internal term in Galaxy Digital, which shows users "opportunity" instead. Those words run through the whole product and its positioning, so this change leaves them alone.

## How tools get a new account started

- **A short checklist on the home screen.** Shopify's guidance says "Avoid more than five steps". Intercom suggests three to seven. Wild Apricot's trial checklist has six.
- **A step is a title that starts with a verb, one line of help, and one button.** Shopify, Intercom, and HubSpot all work this way.
- **Steps finish on their own.** Shopify describes steps "that are automatically marked as complete". Intercom recommends the same.
- **Steps can be skipped, and the guide can be hidden and reopened.** HubSpot has "skip for now". QuickBooks has Hide and a "Resume setup" link, and removes the guide when every step is done.
- **Structure comes before import.** Wild Apricot, Join It, MembershipWorks, Volgistics, and Golden all set up membership levels or fields before bringing people in.
- **Few questions at sign-up.** Appcues says about three and never more than five. This is vendor advice, not a study.
- **A checklist alone is not enough.** Userpilot reports an average completion rate of 19.2 percent across 188 companies. That is a vendor's own data. Nielsen Norman Group advises using empty screens to point at the next action.

## How tools import a list

- **Four steps: upload, map, review, import.** OneSchema, Dromo, Flatfile, Wild Apricot, Salesforce, and Volgistics all follow this order.
- **Each mapping row starts from the file's column and shows what it holds.** Wild Apricot shows "the values for the first 3 records" beside a "Map to" list.
- **Skipping a column is one clear choice.** "Don't import column" in HubSpot, "Ignore this column" in ClickUp.
- **Results come as counts, plus the rows that failed.** HubSpot offers "Download error file". Dromo lets people download the failed rows, fix them, and upload again.
- **Undo is rare and limited.** Mailchimp can undo an import, which removes only the contacts it added. Wild Apricot says "You cannot undo the importing of contact records".

No surveyed tool documents how it handles mixed date formats in one file.

## The fake import

The agent wrote seven made-up exports that copy the column names and formatting of real ones, and imported each into a new organization on a phone-sized screen. The files are in [`samples/exports/`](../../samples/exports/README.md). The Mailchimp and Google Contacts column names come from real exports. The Wild Apricot names come from its field list. The SignUpGenius and Google Forms layouts are recalled.

### Before the changes

| File | What happened |
|---|---|
| Wild Apricot members | Imported, but every email address was lost. A column called "Email delivery disabled" was also read as the email, and the two were joined into one invalid address. One person with an email and no phone was skipped as having no contact details. Thirteen bookkeeping columns became fields. |
| Mailchimp audience | Imported, with 19 new fields, among them IP addresses and map coordinates. |
| Google Forms responses | Stopped. "Your full name" was not recognized as a name. A person could fix it by hand. |
| SignUpGenius report | Dead end. The title row was read as the column names, so the file had one column. |
| Google Contacts | Imported nobody. "E-mail 1 - Label" was read as the email. Ten fields were created anyway. |
| Excel roster with a title row | Dead end, for the same reason as SignUpGenius. |
| French roster, semicolons | Stopped. The column names were not recognized, and day-first dates would have been dropped. |

One file of seven produced usable people.

### After the changes

All seven import with the right names, emails, phones, dates, and details. `test/importing.test.ts` reads the six text files and checks each of these results. The Excel file was checked by hand in the browser.

### What still goes wrong

- An archived or lapsed member comes in as an active person. The status column is offered as a field, not acted on.
- A file where only some names are written "Last, First" keeps them as written.
- One row holding two people, such as a household, becomes one person.
- Old Excel files (.xls) and zip files are refused with a message that says what to do.
- Text, Word, and PDF files still need a model set up on the server. The upload screen offers them only when one is.

## Sources

Checklists and design systems:
- https://shopify.dev/docs/apps/design/user-experience/onboarding
- https://www.intercom.com/help/en/articles/6899972-checklist-best-practices
- https://knowledge.hubspot.com/help-and-resources/use-your-home-page
- https://www.nngroup.com/articles/empty-state-interface-design/
- https://www.nngroup.com/articles/progressive-disclosure/
- https://userpilot.com/blog/onboarding-checklist-completion-rate-benchmarks/
- https://www.appcues.com/blog/user-onboarding-surveys

Volunteer and membership tools:
- https://gethelp.wildapricot.com/en/articles/2980-trial-setup-checklist
- https://gethelp.wildapricot.com/en/articles/19-importing-contacts-and-members
- https://support.joinit.com/en/articles/3065733-onboarding-guide-for-new-organizations
- https://support.joinit.com/en/articles/989924-create-custom-fields-for-your-membership-types
- https://support.membershipworks.com/portal/en/kb/articles/setup-list
- https://www.volgistics.com/help/volgistics-platform/basic-account-set-up/
- https://support.betterimpact.com/en/articles/9587680-glossary-and-abbreviations
- https://help.timecounts.app/en/articles/7153534-set-up-profile-fields-for-your-organization
- https://help.trackitforward.com/doc/configuring-volunteer-profile
- https://help.givebutter.com/en/articles/2118934-how-to-manage-account-users

Import:
- https://knowledge.hubspot.com/import-and-export/import-records-for-a-single-object
- https://mailchimp.com/help/import-contacts-mailchimp/
- https://mailchimp.com/help/undo-contact-import/
- https://docs.oneschema.co/docs/3-map-template-columns
- https://developer.dromo.io/faqs
- https://www.smashingmagazine.com/2020/12/designing-attractive-usable-data-importer-app/

Export formats:
- https://mailchimp.com/help/view-export-contacts/
- https://support.google.com/contacts/answer/15147365
- https://support.betterimpact.com/en/articles/8368729-importing-user-profiles
- https://www.signupgenius.com/blog/feature-tips-export-volunteer-reports
