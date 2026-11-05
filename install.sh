#!/usr/bin/env bash
set -euo pipefail

REPO="thirdbase1/entry-agents-d"
API_ROOT="https://api.github.com/repos/${REPO}"

echo "Fetching latest Entry Agents Desktop release..."
RELEASE_JSON=$(curl -fsSL "${API_ROOT}/releases/latest" 2>/dev/null || curl -fsSL "${API_ROOT}/releases" | grep -m 1 -B 2 '"tag_name"' || true)

echo "Discovered latest release for ${REPO}."
echo "Clone and run with:"
echo "  git clone https://github.com/${REPO}.git"
echo "  cd entry-agents-d && npm install && npm run dev"
