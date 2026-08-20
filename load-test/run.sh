#!/usr/bin/env bash
set -euo pipefail

SCRIPT="${1:-mixed.js}"
BASE_URL="${BASE_URL:-http://localhost:4000}"
K6_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/k6" && pwd)"

# --network host: simplest way for the k6 container to reach the backend on
# localhost. Works on Linux. On Mac/Windows Docker Desktop, drop --network host,
# use BASE_URL=http://host.docker.internal:4000 instead, and add
# --add-host=host.docker.internal:host-gateway if it's not resolved already.
docker run --rm -i \
  --network host \
  -e BASE_URL="$BASE_URL" \
  -e SMOKE="${SMOKE:-}" \
  -v "$K6_DIR":/scripts \
  -w /scripts \
  grafana/k6 run "$SCRIPT"
