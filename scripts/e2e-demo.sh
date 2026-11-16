#!/usr/bin/env bash
#
# E2E demo flow: owner baru -> approval admin -> listing -> kamar -> QR ->
# penghuni -> submit -> approve admin -> cek endpoint publik.
#
# Script ini MENULIS data ke database target. Jangan jalankan ke produksi
# kecuali memang ingin membuat data demo.
#
# Pemakaian:
#   ADMIN_EMAIL=admin@havenakost.app ADMIN_PASSWORD='...' \
#     ./scripts/e2e-demo.sh https://havenakost.vercel.app
#
#   ./scripts/e2e-demo.sh http://localhost:3000 --keep   # data demo tidak diarsipkan
#
# Exit code 0 bila semua langkah lolos.

set -uo pipefail

BASE_URL="${1:-${BASE_URL:-http://localhost:3000}}"
BASE_URL="${BASE_URL%/}"
KEEP="${2:-}"
: "${ADMIN_EMAIL:?Set ADMIN_EMAIL}"
: "${ADMIN_PASSWORD:?Set ADMIN_PASSWORD}"

for bin in curl jq; do
  command -v "$bin" >/dev/null 2>&1 || { echo "$bin wajib terpasang" >&2; exit 1; }
done

STAMP="$(date +%s)"
OWNER_EMAIL="owner.demo.${STAMP}@example.com"
OWNER_PASSWORD="DemoOwner${STAMP}!"
ADMIN_JAR="$(mktemp)"
OWNER_JAR="$(mktemp)"
trap 'rm -f "$ADMIN_JAR" "$OWNER_JAR"' EXIT

PASS=0
FAIL=0
KOST_ID=""
SLUG=""
REVIEW_URL=""

say() { printf '\n== %s\n' "$1"; }

# call <jar> <method> <path> [json] -> sets BODY, CODE (HTTP), CURL_RC (transport)
call() {
  local jar="$1" method="$2" path="$3" body="${4:-}"
  local args=(-s -X "$method" "$BASE_URL$path" -H "Origin: $BASE_URL" -w $'\n%{http_code}')
  [ -n "$jar" ] && args+=(-b "$jar" -c "$jar")
  [ -n "$body" ] && args+=(-H "Content-Type: application/json" -d "$body")
  local out attempt=1
  while :; do
    out="$(curl "${args[@]}" 2>/tmp/e2e-demo.curl.err)"
    CURL_RC=$?
    CODE="$(printf '%s' "$out" | tail -n1)"
    BODY="$(printf '%s' "$out" | sed '$d')"
    # Ulangi hanya GET saat gagal transport (aman, idempoten).
    if [ "$CURL_RC" -eq 0 ] || [ "$method" != "GET" ] || [ "$attempt" -ge 3 ]; then
      break
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
}

# step <label> <expected-code>
step() {
  if [ "${CODE:-}" = "$2" ]; then
    PASS=$((PASS + 1))
    printf 'PASS  %-46s %s\n' "$1" "$CODE"
  else
    FAIL=$((FAIL + 1))
    if [ "${CURL_RC:-0}" -ne 0 ]; then
      printf 'FAIL  %-46s transport error (curl exit %s)\n' "$1" "$CURL_RC"
      printf '      %s\n' "$(head -c 200 /tmp/e2e-demo.curl.err 2>/dev/null)"
    else
      printf 'FAIL  %-46s got %s want %s\n' "$1" "${CODE:-none}" "$2"
      printf '      %s\n' "$(printf '%s' "${BODY:-}" | head -c 400)"
    fi
  fi
}

say "0. Login admin"
call "$ADMIN_JAR" POST /api/auth/sign-in/email \
  "$(jq -cn --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" '{email:$e,password:$p}')"
step "admin sign-in" 200
[ "$FAIL" -gt 0 ] && { echo "Login admin gagal, hentikan."; exit 1; }

say "1. Registrasi & profil owner ($OWNER_EMAIL)"
call "$OWNER_JAR" POST /api/auth/sign-up/email \
  "$(jq -cn --arg e "$OWNER_EMAIL" --arg p "$OWNER_PASSWORD" \
    '{email:$e,password:$p,name:"Pemilik Demo"}')"
step "owner sign-up" 200
[ "$FAIL" -gt 0 ] && { echo "Registrasi owner gagal, hentikan."; exit 1; }

call "$OWNER_JAR" PATCH /api/owner/profile \
  '{"full_name":"Pemilik Demo","business_name":"Havena Demo Property","phone":"6281234567890","address":"Jl. Soekarno Hatta No. 10, Malang"}'
step "owner update profile" 200

say "2. Approval owner oleh admin"
call "$ADMIN_JAR" GET "/api/admin/owners?approval_status=pending&limit=100"
step "admin list pending owners" 200
OWNER_USER_ID="$(printf '%s' "$BODY" | jq -r --arg e "$OWNER_EMAIL" '.data[]?|select(.email==$e)|.userId')"
if [ -n "$OWNER_USER_ID" ] && [ "$OWNER_USER_ID" != "null" ]; then
  PASS=$((PASS + 1)); printf 'PASS  %-46s %s\n' "find owner userId" "$OWNER_USER_ID"
  call "$ADMIN_JAR" POST "/api/admin/owners/$OWNER_USER_ID/approve"
  step "admin approve owner" 200
else
  FAIL=$((FAIL + 1)); printf 'FAIL  %-46s\n' "find owner userId"
fi

say "3. Owner membuat listing"
FACILITY_IDS="$(curl -s "$BASE_URL/api/public/facilities" | jq -c '[.data[0].id, .data[1].id]')"
call "$OWNER_JAR" POST /api/owner/listings \
  "$(jq -cn --argjson f "$FACILITY_IDS" --arg n "Kost Demo E2E $STAMP" \
    '{name:$n,
      description:"Listing demo otomatis dari scripts/e2e-demo.sh untuk menguji alur backend.",
      address:"Jl. Soekarno Hatta No. 10", province:"Jawa Timur", city:"Kota Malang",
      district:"Lowokwaru", subdistrict:"Tulusrejo", postal_code:"65141",
      latitude:-7.9412, longitude:112.6201, gender_policy:"mixed",
      price_min:700000, price_max:1500000, contact_phone:"6281234567890",
      facility_ids:$f}')"
step "owner create listing (201)" 201
KOST_ID="$(printf '%s' "$BODY" | jq -r '.data.id // empty')"
SLUG="$(printf '%s' "$BODY" | jq -r '.data.slug // empty')"
printf '      kost_id=%s slug=%s\n' "$KOST_ID" "$SLUG"
[ -z "$KOST_ID" ] && { echo "Gagal membuat listing."; exit 1; }

say "4. Kamar, QR, dan data penghuni"
call "$OWNER_JAR" POST "/api/owner/listings/$KOST_ID/rooms" \
  '{"room_code":"A01","room_name":"Kamar A01","description":"Kamar demo 3x3 dengan kamar mandi dalam.","monthly_price":900000,"room_status":"available"}'
step "owner create room (201)" 201
ROOM_ID="$(printf '%s' "$BODY" | jq -r '.data.id // empty')"
printf '      room_id=%s\n' "$ROOM_ID"

call "$OWNER_JAR" POST "/api/owner/rooms/$ROOM_ID/qr"
step "owner generate QR (201)" 201
QR_TOKEN="$(printf '%s' "$BODY" | jq -r '.data.token // empty')"
REVIEW_URL="$(printf '%s' "$BODY" | jq -r '.data.reviewUrl // empty')"
printf '      qr_token=%s\n' "$QR_TOKEN"

call "$OWNER_JAR" POST "/api/owner/rooms/$ROOM_ID/occupancies" \
  '{"tenant_name":"Budi Santoso","check_in_date":"2026-01-05","check_out_date":null,"occupancy_status":"active","notes":"Kamar A01"}'
step "owner add occupancy (201)" 201

say "5. Pengajuan & approval listing"
call "$OWNER_JAR" PATCH "/api/owner/listings/$KOST_ID" '{"status":"pending"}'
step "owner submit pending" 200
call "$ADMIN_JAR" POST "/api/admin/listings/$KOST_ID/approve"
step "admin approve listing" 200

say "6. Verifikasi endpoint publik"
call "" GET "/api/public/kost?q=Kost%20Demo%20E2E"
step "public search" 200
printf '      hits=%s\n' "$(printf '%s' "$BODY" | jq -r '.meta.total // 0')"
call "" GET "/api/public/kost/$SLUG"
step "public detail" 200
call "" GET "/api/public/kost/$SLUG/rooms"
step "public rooms" 200
call "" GET "/api/public/review/$QR_TOKEN"
step "public QR lookup" 200
printf '      turnstile_site_key=%s\n' "$(printf '%s' "$BODY" | jq -r '.data.form.turnstile_site_key // "none"')"
call "" GET "/api/public/locations/search?latitude=-7.9412&longitude=112.6201&radius=3000"
step "public nearby search" 200

say "7. Endpoint owner pasca-approval"
call "$OWNER_JAR" GET /api/owner/reviews
step "owner list reviews" 200
call "$OWNER_JAR" GET /api/owner/subscription
step "owner subscription" 200
call "$OWNER_JAR" GET /api/admin/dashboard
step "owner diblokir dari admin (403)" 403

if [ "$KEEP" != "--keep" ]; then
  say "8. Cleanup (arsipkan listing demo)"
  call "$OWNER_JAR" DELETE "/api/owner/listings/$KOST_ID"
  step "owner archive listing" 200
  echo "Catatan: akun owner demo tetap ada (tidak ada endpoint hapus akun)."
fi

printf '\nPASS=%d FAIL=%d\n' "$PASS" "$FAIL"
printf 'QR review URL: %s\n' "${REVIEW_URL:-}"
[ "$FAIL" -eq 0 ]
