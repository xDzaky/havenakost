#!/usr/bin/env bash
#
# Smoke test cepat (read-only) untuk backend Havena Kost.
# Hanya melakukan request GET + login. Tidak membuat/mengubah data.
#
# Pemakaian:
#   ./scripts/smoke-test.sh                                  # default: produksi
#   ./scripts/smoke-test.sh http://localhost:3000             # dev lokal
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... ./scripts/smoke-test.sh
#
# Exit code 0 bila semua cek lolos, 1 bila ada yang gagal.

set -uo pipefail

BASE_URL="${1:-${BASE_URL:-https://havenakost.vercel.app}}"
BASE_URL="${BASE_URL%/}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

PASS=0
FAIL=0

have() { command -v "$1" >/dev/null 2>&1; }

if ! have curl; then
  echo "curl tidak ditemukan." >&2
  exit 1
fi
if ! have jq; then
  echo "jq tidak ditemukan. Install dulu: sudo pacman -S jq / sudo apt install jq" >&2
  exit 1
fi

# expect <label> <expected-code> <method> <path> [json-body]
expect() {
  local label="$1" want="$2" method="$3" path="$4" body="${5:-}"
  local args=(-s -o /tmp/smoke.body -w '%{http_code}' -X "$method" "$BASE_URL$path"
    -H "Origin: $BASE_URL")
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi
  local code
  code="$(curl "${args[@]}")"
  if [ "$code" = "$want" ]; then
    PASS=$((PASS + 1))
    printf 'PASS  %-46s %s\n' "$label" "$code"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL  %-46s got %s want %s\n' "$label" "$code" "$want"
    printf '      %s\n' "$(head -c 300 /tmp/smoke.body)"
  fi
}

# with-session <label> <expected-code> <method> <path> [json-body]
with_session() {
  local label="$1" want="$2" method="$3" path="$4" body="${5:-}"
  local args=(-s -o /tmp/smoke.body -w '%{http_code}' -X "$method" "$BASE_URL$path"
    -b "$JAR" -c "$JAR" -H "Origin: $BASE_URL")
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi
  local code
  code="$(curl "${args[@]}")"
  if [ "$code" = "$want" ]; then
    PASS=$((PASS + 1))
    printf 'PASS  %-46s %s\n' "$label" "$code"
  else
    FAIL=$((FAIL + 1))
    printf 'FAIL  %-46s got %s want %s\n' "$label" "$code" "$want"
    printf '      %s\n' "$(head -c 300 /tmp/smoke.body)"
  fi
}

echo "Smoke test: $BASE_URL"
echo

expect "GET /api/health" 200 GET /api/health
if jq -e '.data.database == "connected"' /tmp/smoke.body >/dev/null 2>&1; then
  PASS=$((PASS + 1))
  printf 'PASS  %-46s\n' "health: database connected"
else
  FAIL=$((FAIL + 1))
  printf 'FAIL  %-46s %s\n' "health: database connected" "$(head -c 200 /tmp/smoke.body)"
fi

expect "GET /api/public/facilities" 200 GET /api/public/facilities
expect "GET /api/public/kost" 200 GET "/api/public/kost?limit=1"
expect "GET /api/public/locations/search" 200 GET \
  "/api/public/locations/search?latitude=-7.9412&longitude=112.6201&radius=3000"
expect "GET /api/public/review/token-invalid (404)" 404 GET /api/public/review/token-tidak-dikenal
expect "GET /api/owner/profile tanpa login (401)" 401 GET /api/owner/profile
expect "GET /api/admin/dashboard tanpa login (401)" 401 GET /api/admin/dashboard

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  with_session "POST /api/auth/sign-in/email (admin)" 200 POST /api/auth/sign-in/email \
    "$(jq -cn --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" '{email:$e,password:$p}')"
  with_session "GET /api/admin/dashboard (admin)" 200 GET /api/admin/dashboard
  with_session "GET /api/admin/logs (admin)" 200 GET "/api/admin/logs?limit=1"
  with_session "GET /api/owner/profile (admin, 403)" 403 GET /api/owner/profile
else
  echo "SKIP  login admin (set ADMIN_EMAIL & ADMIN_PASSWORD untuk mengaktifkan)"
fi

echo
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
