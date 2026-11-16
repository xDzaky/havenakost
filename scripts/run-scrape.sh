#!/usr/bin/env bash
# Jalankan google-maps-scraper untuk mencari kost di Malang.
# Hasil: data/kost-malang-raw.csv (link Google Maps ada di kolom "link")
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="${GMS_BIN:-/tmp/opencode/gms/gms}"
INPUT="$ROOT/data/queries.txt"
OUT="$ROOT/data/kost-malang-raw.csv"

# Titik tengah Kota Malang + radius 15 km (mencakup seluruh kota & pinggiran kampus)
GEO="${GEO:--7.9666,112.6326}"
RADIUS="${RADIUS:-15000}"
ZOOM="${ZOOM:-13}"
DEPTH="${DEPTH:-8}"
CONCURRENCY="${CONCURRENCY:-2}"

if [[ ! -x "$BIN" ]]; then
  echo "Binary scraper tidak ditemukan: $BIN" >&2
  echo "Download: https://github.com/gosom/google-maps-scraper/releases" >&2
  exit 1
fi

export DISABLE_TELEMETRY=1

# Sekali saja: pasang browser Playwright yang dipakai scraper.
if [[ ! -d "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}" ]]; then
  echo "== Memasang browser Playwright (sekali saja) =="
  "$BIN" -install-playwright
fi

echo "== Mulai scrape =="
echo "   geo=$GEO radius=${RADIUS}m zoom=$ZOOM depth=$DEPTH c=$CONCURRENCY"
echo "   output=$OUT"

"$BIN" \
  -input "$INPUT" \
  -results "$OUT" \
  -lang id \
  -geo "$GEO" \
  -zoom "$ZOOM" \
  -radius "$RADIUS" \
  -depth "$DEPTH" \
  -c "$CONCURRENCY" \
  -exit-on-inactivity 5m

echo "== Selesai. Membersihkan data =="
python3 "$ROOT/scripts/build_report.py" "$OUT"
