#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/node/bin:$PATH"
uname -a
cat /etc/os-release
findmnt -T "$PWD"
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm check
node apps/cli/dist/main.js doctor --json
