#!/usr/bin/env bash
# Deploy ManyArms to manyarms.app. See docs/launch/deploy.md first.
#
# Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment. The
# secrets APP_SECRET, RESEND_API_KEY and EMAIL_FROM are set once with
# `npx wrangler secret put NAME --env production`.

set -euo pipefail
cd "$(dirname "$0")/.."

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID#/}"

if grep -q 'database_id = "00000000-0000-0000-0000-000000000000"' <(sed -n '/\[\[env.production.d1_databases\]\]/,/migrations_dir/p' wrangler.toml); then
  echo "Set the production database_id in wrangler.toml first (npx wrangler d1 create manyarms)." >&2
  exit 1
fi
if grep -q '^ADMIN_EMAILS = ""' <(sed -n '/\[env.production.vars\]/,$p' wrangler.toml); then
  echo "Set ADMIN_EMAILS under [env.production.vars] in wrangler.toml first." >&2
  exit 1
fi

npm run build
npx wrangler d1 migrations apply manyarms --remote --env production
npx wrangler deploy --env production
echo "Deployed to https://manyarms.app"
