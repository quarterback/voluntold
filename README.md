# Volunteer tool (working title)

A Vloora product. The product name is undecided.

Organizations already have volunteers but don't know how to put them to work, so people who said they'd help are never asked. This tool organizes the volunteers an organization has, by the details it cares about. It helps the organization ask the right people for each task, and records the work as done when its time passes. Volunteers answer from a link on their phone, with no account. Tasks an organization posts live in its own AT Protocol account.

## Read first

- [Spec](docs/SPEC.md): what the pilot does, the building blocks, and the check before inviting pilot organizations.
- [Later](docs/LATER.md): ideas not in the pilot, one line each.
- [Decisions](docs/decisions/): what was decided, when, and why.
- [Research](docs/research/): existing volunteer tools and their gaps, and how AT Protocol fits.
- [Archive](docs/archive/): the October 21 to 24 planning documents. Where they disagree with the spec, the spec wins.

## What's built

The pilot in [SPEC.md](docs/SPEC.md):

- organizations, members and roles (admin, coordinator, team lead)
- details defined by each organization, and teams
- import from CSV, Excel, XML, JSON, text, Word and PDF files, with duplicate merging
- tasks with requirements, and the three ways to ask
- private links and the volunteer's page
- work marked done when its time passes
- the Today list and export
- posting tasks to AT Protocol

It runs on Cloudflare Workers and D1, with a React and MUI web app.

| Folder | What's in it |
|---|---|
| `src/shared` | The building blocks and the rules for who fits, who goes first, and when asks expire |
| `src/worker` | The API, the sweep that runs as time passes, AT Protocol posting, and import reading |
| `src/web` | The coordinator's screens and the volunteer's page |
| `migrations` | The database schema |
| `lexicons` | The AT Protocol record format for a task |
| `test` | Rule tests, API tests for the launch checks, and AT Protocol tests |
| `e2e` | A walk through the spec's pilot check on a phone-sized screen |
| `samples` | Made-up volunteer lists for trying the import |

## Run it locally

Needs Node 22 or newer.

```sh
npm install
cp .dev.vars.example .dev.vars        # sets dev mode: sign-in codes appear on screen
npm run build
npm run db:migrate:local
npx wrangler dev                      # http://localhost:8787
```

Sign in with any email. In dev mode the code shows on the screen. "Try it with sample data" sets up a sample organization. You can also import `samples/volunteers.csv`.

## Check it

```sh
npm run check                         # type checks, tests, build
npm run check:docs                    # prosekeep style check, closedtab check on every record
node e2e/smoke.mjs                    # with wrangler dev running: the pilot check in a browser
```

## Deploy

1. `npx wrangler d1 create voluntold`, then put the database id in `wrangler.toml`.
2. `npm run db:migrate:remote`
3. Set the secrets: `npx wrangler secret put APP_SECRET` (a long random string), `RESEND_API_KEY` and `EMAIL_FROM` for sign-in email, and optionally `MODEL_PROVIDER=anthropic` with `MODEL_API_KEY` for text, Word and PDF imports.
4. In `wrangler.toml`, set `APP_URL` to the public address and `ATPROTO_TASK_NSID` to the record name under your domain. Keep `DEV_MODE = "0"`.
5. `npm run build && npx wrangler deploy`

Before real volunteer data goes in, read the "Must pass" list in the spec and [decision 0008](docs/decisions/0008-pilot-build-choices.md).

## Repository status

The application is built here, in `quarterback/voluntold`. The Vloora company website is not the application backend, and unreleased features are not Vloora website product claims.
