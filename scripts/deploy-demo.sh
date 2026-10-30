#!/usr/bin/env bash
# Deploy the demo to volleydemo.vloora.com.
#
# The demo runs in the visitor's browser: the app's own routes run in the page
# over SQLite and save to that browser's storage. There's no sign-in, and
# nothing a visitor does reaches the server or anyone else. The deploy is
# static files only (wrangler.browser-demo.toml).
#
# Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment.
# The token needs Workers Scripts: Edit.

set -euo pipefail
cd "$(dirname "$0")/.."

: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"

# A copied dashboard URL leaves a slash on the front of the account id.
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID#/}"

npm run build:demo
npx wrangler deploy --config wrangler.browser-demo.toml
