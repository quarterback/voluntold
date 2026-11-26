# Deploying ManyArms

What it takes to put the product with accounts at manyarms.app and the demo at demo.manyarms.app. The steps that need the owner's logins are marked "Owner".

## Addresses

| Address | What it is |
|---|---|
| manyarms.app | The product: the home page, Request free access, accounts and email |
| demo.manyarms.app | The demo that runs in the visitor's browser, with no account |
| vloora.com/manyarms | Vloora's product page, linking to both |

Every .app domain requires HTTPS. Cloudflare provides it.

## Steps

1. **Owner:** buy manyarms.app and add it to the Cloudflare account that hosts vloora.com.
2. **Owner:** create the database: `npx wrangler d1 create manyarms`. Put the id it prints in `wrangler.toml` under `[[env.production.d1_databases]]`.
3. **Owner:** in `wrangler.toml` under `[env.production.vars]`, set `ADMIN_EMAILS` to the address that approves new organizations.
4. **Owner:** in Resend, add and verify the sending domain (manyarms.app, or a subdomain such as mail.manyarms.app) with the DNS records Resend gives you.
5. **Owner:** set the secrets once:
   - `npx wrangler secret put APP_SECRET --env production` (a long random string; keep it, because changing it breaks every private link)
   - `npx wrangler secret put RESEND_API_KEY --env production`
   - `npx wrangler secret put EMAIL_FROM --env production` (for example `ManyArms <hello@manyarms.app>`)
6. **Owner:** run `scripts/deploy-production.sh` with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set. It builds, runs the database migrations and deploys.
7. **Owner:** add `{ pattern = "demo.manyarms.app", custom_domain = true }` to the routes in `wrangler.browser-demo.toml`, then run `scripts/deploy-demo.sh`.
8. Sign up at manyarms.app with your own email, approve the organization at manyarms.app/admin, and send yourself one ask. Check that it arrives and isn't marked as spam.

## After the first deploy

- Point the "Try the demo" links on vloora.com at demo.manyarms.app, and add a Request free access link to manyarms.app.
- The free Resend plan allows 100 emails a day. Move to the paid plan before inviting organizations.
