#!/usr/bin/env bash
# Verify apex landing page and app subdomain redirects after deploy.
set -euo pipefail

APEX="${APEX:-https://shiplocal.cloud}"
APP="${APP:-https://app.shiplocal.cloud}"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

pass() {
  echo "OK:   $1"
}

echo "Checking apex landing ($APEX)..."
apex_status=$(curl -sI "$APEX" | head -1)
if echo "$apex_status" | grep -q ' 302 '; then
  location=$(curl -sI "$APEX" | awk -F': ' 'tolower($1)=="location" {print $2}' | tr -d '\r')
  fail "apex returns 302 → ${location:-unknown}. Caddy is still routing / to the API (:4000), or the server image was not rebuilt. See docs/deploy.md § Landing page still redirects."
fi
if ! echo "$apex_status" | grep -q ' 200 '; then
  fail "apex expected HTTP 200, got: $apex_status"
fi
pass "apex returns 200"

echo "Checking API health ($APEX/health)..."
health=$(curl -s "$APEX/health")
if ! echo "$health" | grep -q '"status"'; then
  fail "health endpoint did not return JSON: $health"
fi
pass "health endpoint works"

echo "Checking app → apex redirect ($APP/)..."
app_status=$(curl -sI "$APP/" | head -1)
if echo "$app_status" | grep -q ' 308 '; then
  pass "app root redirects to apex (308)"
elif echo "$app_status" | grep -q ' 200 '; then
  fail "app root returns 200 — rebuild dashboard with NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_APP_URL, then pm2 restart"
else
  fail "app root unexpected status: $app_status"
fi

echo ""
echo "All landing checks passed."
