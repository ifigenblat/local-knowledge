#!/bin/bash
# LocalKnowledge: stop everything, then start
# Run from project root: ./restart.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

"$ROOT/stop.sh"
echo ""
"$ROOT/start.sh"
