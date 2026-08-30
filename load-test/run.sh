#!/usr/bin/env bash
set -euo pipefail

SCRIPT="${1:-mixed.js}"
BASE_URL="${BASE_URL:-http://localhost:4000}"
K6_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/k6" && pwd)"

# A host-shell `ulimit -n` does NOT propagate into the container — Docker
# has its own fd limit per container, separate from the host's. At 5000+
# concurrent VUs each holding a socket open, Docker's default is nowhere
# near enough, so set it explicitly on every run (override via env if needed).
ULIMIT_NOFILE="${ULIMIT_NOFILE:-65536}"

# --network host only works meaningfully on Linux Docker (shares the host's
# real network stack — best option there, whether hitting localhost or a
# remote LAN address). On Mac/Windows Docker Desktop it's unsupported/a
# no-op, since the daemon runs inside its own VM: set DOCKER_NETWORK_ARGS=""
# there. Hitting a REMOTE machine over LAN doesn't need --network host at
# all — plain bridge networking reaches it fine either way.
DOCKER_NETWORK_ARGS="${DOCKER_NETWORK_ARGS---network host}"

docker run --rm -i \
  $DOCKER_NETWORK_ARGS \
  --ulimit nofile="${ULIMIT_NOFILE}:${ULIMIT_NOFILE}" \
  -e BASE_URL="$BASE_URL" \
  -e SMOKE="${SMOKE:-}" \
  -v "$K6_DIR":/scripts \
  -w /scripts \
  grafana/k6 run "$SCRIPT"
