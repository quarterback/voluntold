#!/usr/bin/env bash
# Deploy the shareable demo to Cloudflare Workers.
#
# The demo runs with DEV_MODE=1: sign-in codes appear on screen instead of
# going out by email, and the sample data button is on. Anyone with the link
# can sign in as anyone, so keep real volunteer data out of it.
#
# Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment.
# The token needs Workers Scripts: Edit and D1: Edit.
#
# First run creates the database. Put the id it prints into the
# [[env.demo.d1_databases]] block in wrangler.toml, then run this again.

set -euo pipefail
cd "$(dirname "$0")/.."

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"

# A copied dashboard URL leaves a slash on the front of the account id.
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID#/}"

if ! grep -q 'database_id = "f238db41' wrangler.toml; then
  echo "No demo database id in wrangler.toml. Create one with:"
  echo "  npx wrangler d1 create voluntold-demo"
  echo "then put the id in the [[env.demo.d1_databases]] block."
  exit 1
fi

npx wrangler d1 migrations apply DB --env demo --remote

# Only set the secret if the worker doesn't have it yet. Replacing it signs
# everyone out and makes existing volunteer links unreadable.
if ! npx wrangler secret list --env demo 2>/dev/null | grep -q APP_SECRET; then
  head -c 48 /dev/urandom | base64 | npx wrangler secret put APP_SECRET --env demo
fi

npm run build
npx wrangler deploy --env demo
