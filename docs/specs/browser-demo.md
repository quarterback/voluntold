# Spec: the demo runs in the browser

**Status:** built on October 30, 2026, at the owner's request. It changes how the demo in `docs/specs/demo.md` is served. What the demo shows is the same.

## Why

The demo was the real app on a Cloudflare Worker with one shared database. A visitor signed in with an email address and a code that showed on screen. So anyone could sign in as anyone, and everything a visitor typed was visible to the next person. The product page had to warn people to keep real volunteer details out of it.

The owner pointed to [Tack's demo](https://tack.social/try/) as the model. It opens straight onto a working board with sample data, it runs in the visitor's browser, and nothing they do leaves the browser.

## What it does

- The address is volleydemo.vloora.com. It opens on the sample organization picker. There's no sign-in screen.
- Each visitor gets their own copy of the six sample organizations. What they change stays in their browser and comes back when they return.
- **Start over** is in the sidebar, in Settings and on the picker once a sample is open. It clears the visitor's copy and goes back to the picker.
- The volunteer's page opens in a new tab, as it does on the server. Accepting there shows up on the coordinator's screens.
- Exports download as files. Imports of CSV and Excel files work. Text, Word and PDF imports need a model, so they say to use CSV or Excel instead, as the server does when no model is set up.
- There's no "get your own" step. The guide ends by asking for feedback at hello@vloora.com, as `docs/specs/demo.md` says.

## How it works

`src/browser/main.ts` loads before the app. It opens a SQLite database in the page with sql.js, runs the files in `migrations/`, and passes requests to `/api/`, `/v/` and `/t/` to the worker's own Hono app instead of the network. So the screens, the rules and the sample data are the same code the server runs.

- `src/browser/d1.ts` gives the worker the parts of D1 it uses.
- `src/browser/cookie.ts` keeps sessions in local storage, because browsers drop cookie headers on requests and responses made in script.
- The database is saved to IndexedDB after any request that changes it. A tab reloads it when another tab has saved since, so the volunteer's tab and the coordinator's tab agree.
- The visitor is signed in as you@example.com when the page loads.
- The job that expires asks runs when the page loads and every five minutes after.
- The demo build swaps the model code for a stand-in, so the AI SDK stays out of the page.

`npm run build:demo` builds it into `dist-demo/`, and `scripts/deploy-demo.sh` deploys those files with `wrangler.browser-demo.toml`. That deploy has no worker code, database or secret.

## Limits

- A visitor's copy lives in one browser on one device. Clearing site data, or a private window, starts them over.
- Two tabs that change things at the same moment can overwrite each other's last change.
- The page downloads about 1 MB of script and a 0.7 MB SQLite file before it starts.
