#!/usr/bin/env bash
# Optimisation médias Strapi — PlanetHoster / SSH (npm hors PATH par défaut)
# Usage:
#   bash scripts/optimize-media-server.sh --dry-run
#   bash scripts/optimize-media-server.sh
#   bash scripts/optimize-media-server.sh --limit=50
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

setup_node_path() {
  if command -v npm >/dev/null 2>&1; then
    return 0
  fi

  if [ -n "${NODE_BIN:-}" ] && [ -x "$NODE_BIN" ]; then
    export PATH="$(dirname "$NODE_BIN"):$PATH"
    if command -v npm >/dev/null 2>&1; then
      echo "→ Node: $(node -v) — npm: $(command -v npm)"
      return 0
    fi
  fi

  local bin dir
  for bin in "$HOME"/nodevenv/*/bin/node "$HOME"/nodevenv/*/*/bin/node; do
    [ -x "$bin" ] || continue
    dir=$(dirname "$bin")
    export PATH="$dir:$PATH"
    if command -v npm >/dev/null 2>&1; then
      echo "→ Node: $(node -v) — npm: $(command -v npm)"
      return 0
    fi
  done

  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.nvm/nvm.sh"
    nvm use 20 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1 || true
    command -v npm >/dev/null 2>&1 && return 0
  fi

  return 1
}

if ! setup_node_path; then
  echo "❌ npm introuvable en SSH."
  echo ""
  echo "PlanetHoster — lister Node :"
  echo "  ls -la ~/nodevenv/*/bin/npm ~/nodevenv/*/*/bin/npm 2>/dev/null"
  echo ""
  echo "Puis activer (exemple) :"
  echo "  export PATH=\"\$HOME/nodevenv/wab-infos/apps/web/20/bin:\$PATH\""
  echo "  bash scripts/optimize-media-server.sh --dry-run"
  exit 1
fi

export NPM_CONFIG_FUND=false

echo "→ Répertoire: $APP_DIR"
exec npm run optimize --workspace=@wab-infos/media-optimize -- "$@"
