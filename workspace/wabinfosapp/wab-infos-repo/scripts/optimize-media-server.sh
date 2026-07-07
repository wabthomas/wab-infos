#!/usr/bin/env bash
# Optimisation médias Strapi — PlanetHoster / SSH (npm hors PATH par défaut)
# Usage:
#   bash scripts/optimize-media-server.sh --dry-run
#   bash scripts/optimize-media-server.sh
#   bash scripts/optimize-media-server.sh --limit=50
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
MEDIA_DIR="$APP_DIR/scripts/media-optimize"
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
  for bin in \
    "$HOME/nodevenv/wab-infos/apps/redaction/20/bin/node" \
    "$HOME/nodevenv/wab-infos/apps/web/20/bin/node" \
    "$HOME"/nodevenv/*/bin/node \
    "$HOME"/nodevenv/*/*/bin/node \
    "$HOME"/nodevenv/*/*/*/bin/node
  do
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

setup_planet_hoster_deps() {
  # N0C : pas de node_modules racine ; deps dans nodevenv/apps/<app>/20/lib/node_modules
  local nodevenv_modules=""
  for candidate in \
    "$HOME/nodevenv/wab-infos/apps/redaction/20/lib/node_modules" \
    "$HOME/nodevenv/wab-infos/apps/web/20/lib/node_modules"
  do
    if [ -d "$candidate/next" ] || [ -d "$candidate/sharp" ]; then
      nodevenv_modules="$candidate"
      break
    fi
  done

  if [ -z "$nodevenv_modules" ]; then
    return 1
  fi

  echo "→ PlanetHoster node_modules: $nodevenv_modules"

  local npm_app="redaction"
  if [[ "$nodevenv_modules" == *"/apps/web/"* ]]; then
    npm_app="web"
  fi

  if [ ! -x "$nodevenv_modules/.bin/tsx" ]; then
    echo "→ Installation tsx, node-fetch, form-data (apps/$npm_app)"
    npm install --prefix "apps/$npm_app" tsx node-fetch form-data --no-save
  fi

  if [ ! -e "$MEDIA_DIR/node_modules" ]; then
    ln -sf "$nodevenv_modules" "$MEDIA_DIR/node_modules"
    echo "→ Lien scripts/media-optimize/node_modules → nodevenv"
  fi

  export PATH="$nodevenv_modules/.bin:$PATH"
  return 0
}

if ! setup_node_path; then
  echo "❌ npm introuvable en SSH."
  echo ""
  echo "PlanetHoster — lister Node :"
  echo "  ls -la ~/nodevenv/*/bin/npm ~/nodevenv/*/*/bin/npm 2>/dev/null"
  echo ""
  echo "Puis activer (exemple) :"
  echo "  export PATH=\"\$HOME/nodevenv/wab-infos/apps/redaction/20/bin:\$PATH\""
  echo "  bash scripts/optimize-media-server.sh --dry-run"
  exit 1
fi

export NPM_CONFIG_FUND=false

echo "→ Répertoire: $APP_DIR"

if setup_planet_hoster_deps && command -v tsx >/dev/null 2>&1; then
  exec tsx "$MEDIA_DIR/src/optimize-strapi-media.ts" "$@"
fi

if [ -x "$APP_DIR/node_modules/.bin/tsx" ]; then
  exec "$APP_DIR/node_modules/.bin/tsx" "$MEDIA_DIR/src/optimize-strapi-media.ts" "$@"
fi

exec npm run optimize --workspace=@wab-infos/media-optimize -- "$@"
