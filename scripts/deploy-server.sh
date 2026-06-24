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
  grep -E '^(NEXT_PUBLIC_|STRAPI_|REVALIDATION_|NEWSLETTER_|SMTP_|BREVO_|VAPID_|PUSH_|GOOGLE_)' "$APP_DIR/.env" > "$APP_DIR/apps/web/.env.local" || true
else
  echo "→ Mise à jour apps/web/.env.local (variables clés depuis .env)"
  TMP_ENV=$(mktemp)
  grep -E '^(NEXT_PUBLIC_|STRAPI_|REVALIDATION_|NEWSLETTER_|SMTP_|BREVO_|VAPID_|PUSH_|GOOGLE_)' "$APP_DIR/.env" > "$TMP_ENV" || true
  if [ -s "$TMP_ENV" ]; then
    while IFS= read -r line; do
      key="${line%%=*}"
      if [ -n "$key" ]; then
        if grep -q "^${key}=" "$APP_DIR/apps/web/.env.local" 2>/dev/null; then
          sed -i "s|^${key}=.*|${line}|" "$APP_DIR/apps/web/.env.local"
        else
          echo "$line" >> "$APP_DIR/apps/web/.env.local"
        fi
      fi
    done < "$TMP_ENV"
  fi
  rm -f "$TMP_ENV"
fi

echo "→ git pull"
git pull --ff-only origin main

echo "→ npm install (racine)"
npm install

echo "→ npm install (CMS)"
npm install --prefix apps/cms

echo "→ npm install (web, binaires natifs Linux + deps build)"
rm -rf apps/web/node_modules apps/web/.next
# NODE_ENV=production (souvent défini sur mutualisé) omet les devDependencies — inutile pour
# typescript (skip en low-mem) mais compile-css exige tailwind/postcss (désormais en dependencies).
npm install --workspace=apps/web --include=optional --include=dev

echo "→ Lien Strapi monorepo"
node scripts/setup-strapi-link.js

# ── CMS admin (Vite/esbuild) — en premier tant que le quota LVE est frais ──
if [ -f "$APP_DIR/cms-build.tar.gz" ]; then
  echo "→ Extraction CMS depuis cms-build.tar.gz (build local)"
  rm -rf apps/cms/dist
  tar -xzf cms-build.tar.gz -C apps/cms
elif [ -f "$APP_DIR/apps/cms/dist/build/index.html" ] && [ "${FORCE_CMS_BUILD:-0}" != "1" ]; then
  echo "→ CMS déjà compilé (apps/cms/dist) — skip"
  echo "   FORCE_CMS_BUILD=1 pour reconstruire sur le serveur"
elif [ "${SKIP_CMS_BUILD:-0}" = "1" ]; then
  echo "→ Build CMS ignoré (SKIP_CMS_BUILD=1)"
else
  echo "→ Build CMS admin (Vite/esbuild, ~1,5 Go heap)"
  export CMS_BUILD_HEAP_MB="${CMS_BUILD_HEAP_MB:-1536}"
  export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-1}"
  export RAYON_NUM_THREADS="${RAYON_NUM_THREADS:-1}"
  if ! node scripts/build-cms-production.mjs; then
    echo ""
    echo "❌ Build admin CMS impossible sur ce serveur (CloudLinux / esbuild)."
    echo "   En local : npm run build:cms && npm run pack:cms-build"
    echo "   Uploadez cms-build.tar.gz dans $APP_DIR puis relancez ce script."
    echo "   Ou si l'admin n'a pas changé : SKIP_CMS_BUILD=1 bash scripts/deploy-server.sh"
    exit 1
  fi
fi

# ── Frontend Next.js ──
if [ -f "$APP_DIR/web-next-build.tar.gz" ]; then
  echo "→ Extraction frontend depuis web-next-build.tar.gz (build local)"
  rm -rf apps/web/.next
  tar -xzf web-next-build.tar.gz -C apps/web
else
  echo "→ Build frontend (Webpack, mode faible mémoire)"
  export LOW_MEM_BUILD="${LOW_MEM_BUILD:-1}"
  export BUILD_HEAP_MB="${BUILD_HEAP_MB:-768}"
  export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-1}"
  export RAYON_NUM_THREADS="${RAYON_NUM_THREADS:-1}"
  export NEXT_CPU_COUNT="${NEXT_CPU_COUNT:-1}"
  export NEXT_TELEMETRY_DISABLED=1
  npm run build:web:low-mem || {
    echo ""
    echo "❌ Build frontend impossible sur ce serveur (CloudLinux / EAGAIN)."
    echo "   En local : npm run build:web && npm run pack:web-build"
    echo "   Uploadez web-next-build.tar.gz dans $APP_DIR puis : npm run unpack:web-build"
    exit 1
  }
fi

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
