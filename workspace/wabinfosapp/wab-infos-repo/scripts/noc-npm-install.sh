#!/usr/bin/env bash
# PlanetHoster N0C — installer les deps npm quand « npm » ne marche pas en SSH
# et quand le bouton « Installer module NPM » ne suffit pas (monorepo).
#
# Usage (SSH) :
#   cd ~/wab-infos
#   bash scripts/noc-npm-install.sh              # rédaction (défaut)
#   bash scripts/noc-npm-install.sh web
#   APP=redaction bash scripts/noc-npm-install.sh
#
# Diagnostic seul :
#   bash scripts/noc-npm-install.sh --check
set -euo pipefail

APP="${APP:-redaction}"
CHECK_ONLY=0
if [ "${1:-}" = "--check" ]; then
  CHECK_ONLY=1
elif [ -n "${1:-}" ] && [ "$1" != "--check" ]; then
  APP="$1"
fi

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

echo "══════════════════════════════════════════"
echo "  N0C / PlanetHoster — npm monorepo ($APP)"
echo "  Répertoire: $APP_DIR"
echo "══════════════════════════════════════════"

find_npm() {
  local candidates=(
    "$HOME/nodevenv/wab-infos/apps/$APP/20/bin/npm"
    "$HOME/nodevenv/wab-infos/apps/web/20/bin/npm"
    "$HOME/nodevenv/wab-infos/20/bin/npm"
  )
  local p bin dir
  for p in "${candidates[@]}"; do
    if [ -x "$p" ]; then
      echo "$p"
      return 0
    fi
  done
  for bin in "$HOME"/nodevenv/*/bin/npm "$HOME"/nodevenv/*/*/bin/npm "$HOME"/nodevenv/*/*/*/bin/npm; do
    [ -x "$bin" ] || continue
    echo "$bin"
    return 0
  done
  return 1
}

NPM_BIN=""
if NPM_BIN=$(find_npm); then
  NODE_BIN="$(dirname "$NPM_BIN")/node"
  export PATH="$(dirname "$NPM_BIN"):$PATH"
  echo "→ npm trouvé : $NPM_BIN"
  echo "→ node       : $NODE_BIN ($( "$NODE_BIN" -v ))"
else
  echo "❌ npm introuvable."
  echo ""
  echo "   Lister les binaires CloudLinux :"
  echo "     ls -la ~/nodevenv/*/bin/npm ~/nodevenv/*/*/bin/npm 2>/dev/null"
  echo ""
  echo "   Puis relancer avec le chemin complet, ex. :"
  echo "     export PATH=\"\$HOME/nodevenv/wab-infos/apps/redaction/20/bin:\$PATH\""
  echo "     bash scripts/noc-npm-install.sh $APP"
  echo ""
  echo "   Si le dossier nodevenv n'existe pas :"
  echo "     N0C → Langues → Node.js → créer l'app (racine apps/$APP, server.js)"
  echo "     puis « Installer module NPM » une fois pour créer le nodevenv."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm toujours absent du PATH après détection."
  exit 1
fi

echo ""
echo "→ Diagnostic"
if [ -f "$APP_DIR/apps/$APP/.next/BUILD_ID" ]; then
  echo "   build .next ($APP) : OK"
else
  echo "   ⚠️  build .next ($APP) : MANQUE — uploadez *-next-build.tar.gz"
fi

if [ -d "$APP_DIR/node_modules/next" ]; then
  echo "   node_modules racine (next) : OK"
else
  echo "   node_modules racine (next) : MANQUE"
fi

if [ -d "$APP_DIR/apps/$APP/node_modules/next" ]; then
  echo "   node_modules apps/$APP (next) : OK"
else
  echo "   node_modules apps/$APP (next) : absent (normal si hoisting racine)"
fi

echo ""
echo "→ Test require() comme Passenger"
if (
  cd "$APP_DIR/apps/$APP"
  "$NODE_BIN" -e "
    require('../../scripts/setup-monorepo-node-path.cjs').setupMonorepoNodePath(process.cwd());
    require('next');
    console.log('   next  : OK');
    try { require('sharp'); console.log('   sharp : OK'); } catch (e) { console.log('   sharp : MANQUE —', e.message); }
  "
); then
  echo "   modules runtime : OK"
else
  echo "   ⚠️  modules runtime : échec (npm install requis)"
fi

if [ "$CHECK_ONLY" -eq 1 ]; then
  echo ""
  echo "Diagnostic terminé (--check). Pour installer : bash scripts/noc-npm-install.sh $APP"
  exit 0
fi

export NPM_CONFIG_FUND=false
export NPM_CONFIG_AUDIT=false

echo ""
echo "→ npm install (racine monorepo — obligatoire)"
"$NPM_BIN" install --include=dev

echo ""
echo "→ npm install (apps/$APP — deps locales + sharp Linux)"
"$NPM_BIN" install --prefix "apps/$APP" --include=dev

if [ "$APP" = "redaction" ] || [ "$APP" = "web" ]; then
  echo ""
  echo "→ pwa:fcm ($APP)"
  "$NPM_BIN" run pwa:fcm --prefix "apps/$APP" || true
fi

echo ""
echo "→ Vérification finale"
(
  cd "$APP_DIR/apps/$APP"
  "$NODE_BIN" -e "
    require('../../scripts/setup-monorepo-node-path.cjs').setupMonorepoNodePath(process.cwd());
    require('next');
    require('sharp');
    console.log('OK next + sharp');
  "
)

echo ""
echo "✅ Installation terminée."
echo "   N0C → Langues → Node.js → app $APP → Redémarrer"
echo "   Test SSH : cd apps/$APP && NODE_ENV=production $NODE_BIN server.js"
