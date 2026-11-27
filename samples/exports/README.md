# Made-up exports from other tools

These files copy the column names and formatting of real exports, with made-up people. Every address uses example.org. They exist to test the import: `test/importing.test.ts` reads them, and you can upload them by hand.

| File | Copies | What it tests |
|---|---|---|
| `wild-apricot-members.csv` | A Wild Apricot member export | A second column with "email" in its name, a phone extension, an archived member, one person twice |
| `mailchimp-subscribed.csv` | A Mailchimp audience export | 17 bookkeeping columns, tags quoted inside one cell |
| `google-forms-responses.csv` | A Google Forms response sheet | Question text as column names, one full name column, checkbox answers in one cell |
| `signupgenius-report.csv` | A SignUpGenius sign-up report | Title rows above the column names, one person on several rows, empty slots |
| `google-contacts.csv` | A Google Contacts export | "E-mail 1 - Label" beside "E-mail 1 - Value", labels joined with ` ::: `, an address with a line break |
| `roster-with-title-rows.xlsx` | A hand-kept Excel roster | A title, a blank row, then the column names; a total row at the end |
| `european-semicolon.csv` | A French roster from Excel | Semicolons, a byte order mark, day-first dates, accented column names |

The column names for Mailchimp and Google Contacts come from real exports. The Wild Apricot names come from its field list. The SignUpGenius and Google Forms layouts are from memory, and the title rows in the SignUpGenius file are a worst case, not a confirmed layout. See `docs/research/onboarding-and-import-2026-11.md`.
