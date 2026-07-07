# Architecture Wab-infos

## Vue d'ensemble

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Visiteurs  │────▶│  Cloudflare  │────▶│   Next.js   │
│  (Mobile/   │     │  CDN + Cache │     │  (SSR/SSG)  │
│   Desktop)  │     │  + WAF       │     │  Port 3000  │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                    ┌──────────────┐     ┌──────▼──────┐
                    │  PostgreSQL  │◀────│   Strapi    │
                    │  Port 5432   │     │  CMS :1337  │
                    └──────────────┘     └─────────────┘
```

## Frontend (Next.js)

### Rendu

| Page | Stratégie | Revalidation |
|------|-----------|--------------|
| Accueil | ISR (60s) | On-demand via webhook |
| Rubriques | SSG + ISR | 60s |
| Articles | ISR (60s) | On-demand |
| Recherche | SSR | — |
| TV | ISR | 60s |
| Sitemaps | Dynamique | 1h |

### Routes

```
/                           → Accueil
/{category}                 → Liste par rubrique
/{category}/{slug}          → Article
/recherche?q=               → Recherche
/tv                         → Wab-infos TV
/tv?tab=live|replay|...     → Sections vidéo
/auteur/{slug}              → Page auteur
/sitemap.xml                → Sitemap standard
/sitemap-news.xml           → Sitemap Google News
/robots.txt                 → Robots dynamique
/manifest.webmanifest       → PWA
```

### Composants clés

- `ArticleCard` — Cartes article (4 variantes)
- `BreakingNewsTicker` — Bandeau flash info
- `AdSense` — Emplacements publicitaires (lazy load, CLS-safe)
- `YouTubeEmbed` / `YouTubeLive` — Wab-infos TV
- `ThemeToggle` — Mode sombre/clair

## Backend (Strapi)

### Content Types

| Type | Description |
|------|-------------|
| Article | Articles avec statut, SEO, featured/breaking |
| Category | 9 rubriques éditoriales |
| Tag | Mots-clés |
| Author | Journalistes |
| Video | Contenus YouTube |
| Show | Émissions TV |
| Comment | Modération des commentaires |
| AdPlacement | Gestion des emplacements pub |

### Fonctionnalités éditoriales

- Brouillons et publication planifiée (`draftAndPublish`)
- Articles à la une (`isFeatured`)
- Breaking News (`isBreaking`)
- Articles recommandés (`isRecommended`)
- Compteur de vues (`viewCount`)
- Revalidation ISR automatique (lifecycle hooks)

## Sécurité

- JWT pour l'authentification Strapi
- Rate limiting connexion (5 tentatives/min)
- Headers de sécurité (XSS, CSRF, nosniff)
- CORS restreint aux domaines autorisés
- API token pour les requêtes serveur Next.js
- Secret de revalidation pour l'ISR on-demand

## Performance

- Images : AVIF/WebP via `next/image`
- Fonts : `display: swap`
- Ads : chargement différé (IntersectionObserver)
- CSS : Tailwind purgé
- Bundle : `optimizePackageImports` pour lucide-react, date-fns
- Cache : ISR + Cloudflare CDN
- PWA : service worker, cache partiel hors ligne

## Scalabilité

Conçu pour plusieurs centaines de milliers de visiteurs/mois :

- PostgreSQL avec pool de connexions (2-20)
- ISR pour minimiser les requêtes CMS
- CDN Cloudflare pour les assets statiques
- `output: 'standalone'` pour déploiement optimisé
- Migration Vercel possible sans changement de code
