#!/usr/bin/env bash
# Starts the studio dev server and tees output to a log the agent can read.
#
# Run this from a normal terminal, not from an agent shell: processes spawned by
# the agent inherit a low scheduling priority and never finish compiling.
set -uo pipefail

cd "$(dirname "$0")" || exit 1

LOG=/tmp/design-studio-dev.log

echo "Stopping any stale dev servers..."
pkill -f "next dev" 2>/dev/null
for port in 3000 3001 3002; do
  pid=$(lsof -ti:"$port" 2>/dev/null) && [ -n "$pid" ] && kill -9 $pid 2>/dev/null
done
sleep 1

echo "Starting Next.js. First compile is slow (the build cache was cleared)."
echo "Logging to $LOG"
echo

npm run dev 2>&1 | tee "$LOG"
