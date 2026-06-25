# Wab-infos — Plateforme média professionnelle

Plateforme d'actualités moderne remplaçant WordPress, optimisée pour Google News, Google Discover, Google Search et Google AdSense.

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 15+ (App Router), TypeScript, Tailwind CSS |
| CMS | Strapi 5, PostgreSQL |
| CDN | Cloudflare |
| Hébergement | PlanetHoster (migration Vercel possible) |

## Structure du projet

```
wab-infos/
├── apps/
│   ├── web/          # Site public Next.js (port 3000)
│   ├── redaction/    # App rédaction mobile (port 3001)
│   └── cms/          # Backend Strapi (port 8090)
├── packages/
│   └── shared/       # Types TypeScript partagés
├── scripts/
│   ├── database/     # Scripts PostgreSQL
│   └── wordpress-import/  # Migration WordPress
├── docs/             # Documentation
├── docker-compose.yml
└── .env.example
```

## Démarrage rapide

### Prérequis

- Node.js 20+
- PostgreSQL 16 (ou Docker)
- npm 10+

### Installation

```bash
# Cloner et installer
git clone <repo> wab-infos
cd wab-infos
cp .env.example .env

# Démarrer PostgreSQL
docker compose up -d postgres

# Installer les dépendances
npm install

# Configurer Strapi
cp apps/cms/.env.example apps/cms/.env
cd apps/cms && npm install && cd ../..

# Configurer le frontend
cp .env.example apps/web/.env.local

# Démarrer en développement
npm run dev
```

- **Frontend** : http://localhost:3000
- **CMS Admin** : http://localhost:8090/admin

### Import WordPress

```bash
# 1. Exporter WordPress (Outils → Exporter)
# 2. Placer le XML dans data/wordpress-export.xml
# 3. Lancer l'import
npm run import:wordpress

# Simulation sans écriture
npm run dry-run --workspace=scripts/wordpress-import
```

## Rubriques

- Actualités RDC
- Politique
- Économie
- Sécurité
- Société
- Sports
- International
- Technologies
- Wab-infos TV

## Documentation

- [Architecture](docs/architecture.md)
- [Déploiement PlanetHoster](docs/deployment.md)
- [Stratégie SEO Google News](docs/seo-google-news.md)
- [Guide de maintenance](docs/maintenance.md)

## Licence

Propriétaire — Wab-infos © 2026
