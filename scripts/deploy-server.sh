#!/usr/bin/env bash
# Déploiement Wab-infos sur serveur Linux (PlanetHoster / VPS)
# Usage: bash scripts/deploy-server.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

echo "══════════════════════════════════════════"
echo "  Wab-infos — Déploiement serveur"
echo "  Répertoire: $APP_DIR"
echo "══════════════════════════════════════════"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js requis (v20+). Installez via nvm: nvm install 20"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Node.js 20+ requis (actuel: $(node -v))"
  exit 1
fi

if [ ! -f "$APP_DIR/.env" ]; then
  echo "❌ Fichier .env manquant à la racine."
  echo "   cp .env.example .env && nano .env"
  exit 1
fi

if [ ! -f "$APP_DIR/apps/cms/.env" ]; then
  echo "❌ Fichier apps/cms/.env manquant."
  echo "   cp apps/cms/.env.example apps/cms/.env && nano apps/cms/.env"
  exit 1
fi

# Sync frontend env from root .env
if [ ! -f "$APP_DIR/apps/web/.env.local" ]; then
  echo "→ Création apps/web/.env.local depuis .env"
  grep -E '^(NEXT_PUBLIC_|STRAPI_|REVALIDATION_)' "$APP_DIR/.env" > "$APP_DIR/apps/web/.env.local" || true
fi

echo "→ git pull"
git pull --ff-only origin main

echo "→ npm install (racine)"
npm install

echo "→ npm install (CMS)"
npm install --prefix apps/cms

echo "→ npm install (web, binaires natifs Linux)"
rm -rf apps/web/node_modules apps/web/.next
npm install --workspace=apps/web --include=optional

echo "→ Lien Strapi monorepo"
node scripts/setup-strapi-link.js

echo "→ Build frontend (Webpack — évite le panic Turbopack sur hébergement mutualisé)"
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=2048}"
export NEXT_CPU_COUNT="${NEXT_CPU_COUNT:-1}"
export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-2}"
npm run build:web

echo "→ Build CMS"
npm run build:cms

if command -v pm2 >/dev/null 2>&1 && [ "${USE_PM2:-}" = "1" ]; then
  echo "→ PM2 reload (USE_PM2=1)"
  pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
  pm2 save
  echo ""
  pm2 status
else
  echo "→ PM2 ignoré (PlanetHoster : redémarrer via N0C Langues → Node.js)"
fi

echo ""
echo "✅ Déploiement terminé."
echo "   Site: vérifier https://app.wab-infos.com"
echo "   CMS:  vérifier https://cms.app.wab-infos.com/admin"
