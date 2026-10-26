# Agent Action Record: Deploy the shareable demo to Cloudflare

**Review date:** 2026-10-26
**Reviewed by:** agent self review
**Agent / system:** Claude (cloud session)
**Task or period under review:** Deploying the pilot build as a demo anyone with the link can try
**Accountable human (name or role):** Repository owner

## 1. Intent: what was supposed to happen
**Instruction given (actual wording):** "i did this so now you can deploy it, from voluntold". This answered an earlier session message asking the owner to add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as environment secrets.
**Success defined in advance as:** A `workers.dev` address the owner can send to demo people, with sign-in codes on screen so nobody needs email, and the sample data button on.
**Authority granted to the agent:** Create Cloudflare resources in the owner's account with the token they supplied, and deploy. Develop on `claude/fervent-shannon-i8eyrt`.
**Out of scope:** Application code and copy, a production deploy, a custom domain, email sending, and opening a pull request.

## 2. Action: what actually happened
**What the agent did (step by step):**
1. Read the environment secrets and found `CLOUDFLARE_ACCOUNT_ID` carried a leading `/`, as a copied dashboard URL does. Stripped it for every command in this run. Confirmed the token with `wrangler whoami`.
2. Found that `scripts/deploy-demo.sh`, which the earlier session message said was already on the branch, did not exist. Told the owner the earlier claim was wrong and wrote the script in this run.
3. Created the D1 database `voluntold-demo`.
4. Added an `[env.demo]` section to `wrangler.toml` holding the demo database, `DEV_MODE = "1"` and the `workers.dev` address, rather than changing the top-level settings. The committed defaults stay safe for a real deploy.
5. Applied `0001_init.sql` to the demo database.
6. Set `APP_SECRET` on the demo worker from 48 random bytes. The value was piped straight to `wrangler secret put` and never printed.
7. Built the web app and deployed. Address: `https://voluntold-demo.square-dawn-9932.workers.dev`.
8. Checked the live deploy: the page returns 200; `POST /api/auth/start` returns a `devCode` on screen; `POST /api/auth/verify` opens a session; `POST /api/dev/sample` created a sample organization (id `xvlbkvfwaq2f`).
9. Wrote `scripts/deploy-demo.sh` so the deploy repeats, and this record.
**What it produced or changed:** `wrangler.toml`, `scripts/deploy-demo.sh`, this record. In the owner's Cloudflare account: the `voluntold-demo` worker, its `APP_SECRET`, and the `voluntold-demo` D1 database.
**Where actual behavior differed from the instruction:** Nothing was asked for beyond the deploy. The script and this record are additions the repository's own rules require.
**Stayed within granted authority?** Yes.

## 3. Judgment: human in the loop
**Decisions the owner made:** Deploy the demo; accept that sign-in codes show on screen; keep real volunteer data out of it.
**Decisions the agent made alone, for owner review:**
- A separate `[env.demo]` section and a separate `voluntold-demo` database, instead of setting `DEV_MODE = "1"` on the main worker. A later production deploy then needs no undoing, and demo data never mixes with real data.
- The worker name `voluntold-demo`, which sets the address.
- `APP_SECRET` generated here, not chosen by the owner. The owner cannot read it back, only replace it.
- The script leaves an existing `APP_SECRET` alone. Replacing it signs everyone out and makes existing volunteer links unreadable.
- `ATPROTO_TASK_NSID` left empty, so the demo posts nothing to AT Protocol.
- The sample organization created during the check was left in place as demo content.
- The 15-minute cron that marks work done is inherited by the demo, so the demo shows that behavior.
**Left to the owner:** Fixing the stray `/` in the `CLOUDFLARE_ACCOUNT_ID` secret; whether to merge this branch; whether the demo gets a custom domain; when a production deploy happens.

## 4. Deviation: the gaps
- `npm run check` was not run in this session. The branch carries the merge commit of the pilot build, which passed those checks, and this run changed no application code.
- `e2e/smoke.mjs` was not run against the deploy. The check in step 8 was four API calls, not the pilot walk-through in a browser.
- The demo was reached through this session's HTTPS proxy, not a phone on a normal network.
- No machine trace was available. This record has not been reconciled with `closedtab reconcile`.

## 5. Consequence: what it cost or risked
**Observed:** The owner has an address to send to demo people. Sign-in needs no email.
**Risk:** `DEV_MODE = "1"` means the sign-in code is returned to whoever asks for it, so anyone with the link can sign in as any email address, read everything in the demo organization and act as an admin. The test clock header is also on, so a visitor can move time forward. The demo is open to the internet with no password in front of it. It is safe only for made-up data. Any real volunteer name, email or phone number put in it should be treated as published.
**Also:** The demo worker and database sit in the owner's Cloudflare account and bill to it. D1 reads and writes are small at demo scale.

## 6. Change: what happens next
1. The owner fixes the `CLOUDFLARE_ACCOUNT_ID` secret so later sessions need no workaround.
2. The owner tries the address on a phone and says whether the demo shows what they want to show.
3. Before any real volunteer data: a production deploy with `DEV_MODE = "0"`, a `RESEND_API_KEY` and `EMAIL_FROM` for sign-in email, and the "Must pass" list in `docs/SPEC.md`.
4. When the demo is finished with, delete the worker and the `voluntold-demo` database so neither keeps the demo data.
