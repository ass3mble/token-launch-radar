#!/bin/sh
# Rebuild the entry's outputs from the sealed snapshot and re-verify the gate locally.
# Usage: ./replay.sh [snapshot.json]  (defaults to the kit's input/snapshot.json)
set -e
cd "$(dirname "$0")"
SNAPSHOT="${1:-../kit/token-radar-01-kit/input/snapshot.json}"
rm -rf out
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input "$SNAPSHOT"
node scripts/check-gate.mjs out "$SNAPSHOT"
