#!/usr/bin/env bash
# Déploiement Wab-infos sur serveur Linux (PlanetHoster / VPS)
# Usage: bash scripts/deploy-server.sh
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$APP_DIR"

setup_node_path() {
  if command -v node >/dev/null 2>&1; then
    return 0
  fi

  if [ -n "${NODE_BIN:-}" ] && [ -x "$NODE_BIN" ]; then
    export PATH="$(dirname "$NODE_BIN"):$PATH"
    return 0
  fi

  local bin dir
  for bin in "$HOME"/nodevenv/*/bin/node "$HOME"/nodevenv/*/*/bin/node; do
    [ -x "$bin" ] || continue
    dir=$(dirname "$bin")
    export PATH="$dir:$PATH"
    if command -v node >/dev/null 2>&1; then
      echo "→ Node (PlanetHoster nodevenv): $(node -v) — $bin"
      return 0
    fi
  done

  if [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.nvm/nvm.sh"
    nvm use 20 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1 || true
    if command -v node >/dev/null 2>&1; then
      echo "→ Node (nvm): $(node -v)"
      return 0
    fi
  fi

  return 1
}

echo "══════════════════════════════════════════"
echo "  Wab-infos — Déploiement serveur"
echo "  Répertoire: $APP_DIR"
echo "══════════════════════════════════════════"

if ! setup_node_path; then
  echo "❌ Node.js introuvable en SSH (v20+ requis)."
  echo ""
  echo "   PlanetHoster / N0C — trouver le binaire :"
  echo "     ls -la ~/nodevenv/*/bin/node ~/nodevenv/*/*/bin/node 2>/dev/null"
  echo "   Puis relancer :"
  echo "     export PATH=\"\$HOME/nodevenv/VOTRE_APP/20/bin:\$PATH\""
  echo "     bash scripts/deploy-server.sh"
  echo ""
  echo "   Ou : NODE_BIN=\$HOME/nodevenv/.../bin/node bash scripts/deploy-server.sh"
  echo "   (Chemin affiché dans N0C → Langues → Node.js → votre application)"
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
  grep -E '^(NEXT_PUBLIC_|STRAPI_|REVALIDATION_|NEWSLETTER_|SMTP_|BREVO_|FIREBASE_|PUSH_|GOOGLE_)' "$APP_DIR/.env" > "$APP_DIR/apps/web/.env.local" || true
else
  echo "→ Mise à jour apps/web/.env.local (variables clés depuis .env)"
  TMP_ENV=$(mktemp)
  grep -E '^(NEXT_PUBLIC_|STRAPI_|REVALIDATION_|NEWSLETTER_|SMTP_|BREVO_|FIREBASE_|PUSH_|GOOGLE_)' "$APP_DIR/.env" > "$TMP_ENV" || true
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

if [ ! -f "$APP_DIR/apps/redaction/.env.local" ]; then
  echo "→ Création apps/redaction/.env.local depuis .env"
  grep -E '^(NEXT_PUBLIC_|STRAPI_|REDACTION_|FIREBASE_|PUSH_)' "$APP_DIR/.env" > "$APP_DIR/apps/redaction/.env.local" || true
else
  echo "→ apps/redaction/.env.local déjà présent"
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

echo "→ Config Firebase service worker (public/firebase-messaging-config.js)"
npm run pwa:fcm --workspace=apps/web || true
npm run pwa:fcm --workspace=apps/redaction || true

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

# ── App rédaction Next.js ──
if [ -f "$APP_DIR/redaction-next-build.tar.gz" ]; then
  echo "→ Extraction rédaction depuis redaction-next-build.tar.gz (build local)"
  rm -rf apps/redaction/.next
  tar -xzf redaction-next-build.tar.gz -C apps/redaction
elif [ -f "$APP_DIR/apps/redaction/.next/BUILD_ID" ] && [ "${FORCE_REDACTION_BUILD:-0}" != "1" ]; then
  echo "→ Rédaction déjà compilée (apps/redaction/.next) — skip"
  echo "   FORCE_REDACTION_BUILD=1 pour reconstruire sur le serveur"
else
  echo "→ Build app rédaction"
  npm run build:redaction || {
    echo ""
    echo "❌ Build rédaction impossible sur ce serveur."
    echo "   En local : npm run build:redaction && npm run pack:redaction-build"
    echo "   Uploadez redaction-next-build.tar.gz dans $APP_DIR puis :"
    echo "   tar -xzf redaction-next-build.tar.gz -C apps/redaction"
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
echo "→ Vérification builds Next.js"
if [ -f "$APP_DIR/apps/web/.next/BUILD_ID" ]; then
  echo "   web: OK (BUILD_ID=$(cat "$APP_DIR/apps/web/.next/BUILD_ID"))"
else
  echo "   ⚠️  web: MANQUE apps/web/.next → risque 503 sur wab-infos.com"
fi
if [ -f "$APP_DIR/apps/redaction/.next/BUILD_ID" ]; then
  echo "   redaction: OK (BUILD_ID=$(cat "$APP_DIR/apps/redaction/.next/BUILD_ID"))"
else
  echo "   ⚠️  redaction: MANQUE apps/redaction/.next → 503 sur redaction.app.wab-infos.com"
  echo "      Uploadez redaction-next-build.tar.gz puis : npm run unpack:redaction-build"
fi

echo ""
echo "✅ Déploiement terminé."
echo "   Site: vérifier https://app.wab-infos.com"
echo "   Rédaction: vérifier https://redaction.app.wab-infos.com"
echo "   CMS:  vérifier https://cms.app.wab-infos.com/admin"
