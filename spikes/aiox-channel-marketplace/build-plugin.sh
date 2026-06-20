#!/usr/bin/env bash
# Bundle the aiox channel server into a single self-contained file inside the
# channel plugin (R3 strategy D spike).
#
# Why a bundle (Codex review finding 1): `claude plugin install` COPIES the
# marketplace source into Claude's plugin cache, so a plain `dist/` copy can no
# longer resolve runtime deps (@modelcontextprotocol/server, zod) from the repo
# node_modules — the channel server dies with ERR_MODULE_NOT_FOUND. esbuild
# inlines every non-builtin dep into one file so it runs from the cache (or any
# install location) with no node_modules nearby. The channel server's import
# graph pulls no native module (better-sqlite3 is daemon-side, reached only via
# the unix socket), so the bundle is clean.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/plugins/aiox-channel-ingress"
ENTRY="$REPO_ROOT/src/adapters/claude/channel-server.ts"
OUT="$PLUGIN_DIR/channel-server.js"
ESBUILD="$REPO_ROOT/node_modules/.bin/esbuild"

echo "[build-plugin] bundling channel-server -> single file..."
"$ESBUILD" "$ENTRY" \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile="$OUT"

echo "[build-plugin] verifying no external imports remain (only node: builtins allowed)..."
# Negative check: any static import whose specifier is NOT node:* means a dep
# leaked out of the bundle (incl. scoped pkgs like @modelcontextprotocol/server).
if grep -nE '^import .* from "' "$OUT" | grep -v 'from "node:' >/dev/null; then
  echo "[build-plugin] FAIL: unbundled external import found in $OUT"
  grep -nE '^import .* from "' "$OUT" | grep -v 'from "node:' | head
  exit 1
fi

echo "[build-plugin] done. channel-server bundle at:"
echo "  $OUT"
test -f "$OUT" \
  && echo "[build-plugin] OK: bundle present ($(du -h "$OUT" | cut -f1))" \
  || { echo "[build-plugin] FAIL: bundle missing"; exit 1; }
