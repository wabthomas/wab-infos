# Stratégie SEO Google News — Wab-infos

## Objectif

Optimiser Wab-infos pour l'indexation Google News, Google Discover et Google Search afin de maximiser la visibilité et le trafic organique.

## Implémentation technique

### 1. Schema.org (JSON-LD)

Chaque article génère automatiquement :

**NewsArticle** (`src/lib/seo.ts`) :
- `headline`, `description`, `image`
- `datePublished`, `dateModified`
- `author` (Person), `publisher` (Organization + logo)
- `articleSection`, `keywords`, `wordCount`
- `isAccessibleForFree: true`, `inLanguage: "fr"`

**BreadcrumbList** — Fil d'Ariane structuré sur chaque article.

**WebSite** — Schema global avec `SearchAction` pour la recherche.

### 2. Meta tags

| Tag | Implémentation |
|-----|----------------|
| Open Graph | `og:type=article`, images 1200×630 |
| Twitter Cards | `summary_large_image` |
| Canonical | URL canonique par article |
| `robots` | `max-image-preview: large`, `max-snippet: -1` |

### 3. Sitemaps

**`/sitemap.xml`** — Toutes les pages (accueil, rubriques, articles).

**`/sitemap-news.xml`** — Articles des dernières 48h au format Google News :
```xml
<news:news>
  <news:publication>
    <news:name>Wab-infos</news:name>
    <news:language>fr</news:language>
  </news:publication>
  <news:publication_date>2026-06-18T10:00:00Z</news:publication_date>
  <news:title>Titre de l'article</news:title>
</news:news>
```

### 4. Robots.txt dynamique

- Autorise `Googlebot-News` sur tout le site sauf `/api/` et `/admin/`
- Référence les deux sitemaps
- `host` défini sur le domaine principal

### 5. URLs et redirections

- Structure : `/{rubrique}/{slug}`
- Slugs WordPress conservés à l'import
- Redirections 301 via `middleware.ts` + `redirects.json`
- Trailing slashes supprimés (301)

## Checklist Google News Publisher Center

### Avant soumission

- [ ] Domaine vérifié dans Google Search Console
- [ ] Sitemap News soumis et validé
- [ ] Logo publisher 600×60px minimum
- [ ] Page « À propos » avec informations éditoriales
- [ ] Page « Contact » avec adresse et email
- [ ] Politique de confidentialité
- [ ] Mentions légales
- [ ] Auteurs identifiables sur chaque article
- [ ] Dates de publication visibles
- [ ] HTTPS actif sur tout le site

### Configuration Publisher Center

1. Aller sur [publishercenter.google.com](https://publishercenter.google.com)
2. Ajouter la publication « Wab-infos »
3. URL : `https://wab-infos.com`
4. Catégorie : News
5. Pays : République Démocratique du Congo
6. Langue : Français
7. Soumettre le sitemap : `https://wab-infos.com/sitemap-news.xml`

### Sections à déclarer

| Section Google News | Rubrique Wab-infos |
|---------------------|-------------------|
| World | International |
| Nation | Actualités RDC, Politique |
| Business | Économie |
| Technology | Technologies |
| Sports | Sports |
| Health | Société |
| Science | Technologies |

## Core Web Vitals

| Métrique | Cible | Optimisation |
|----------|-------|-------------|
| LCP | < 2.5s | Images priority, SSR, CDN |
| INP | < 200ms | Code splitting, lazy ads |
| CLS | < 0.1 | Réservation espace ads (min-height), dimensions images |

## Google Discover

- Images minimum 1200px de large
- Titres informatifs (pas de clickbait)
- Contenu original et de qualité
- HTTPS obligatoire
- Pas de contenu interstitiel intrusif

## Suivi

- Google Search Console : couverture, Core Web Vitals, performances News
- Google Analytics 4 : trafic organique, pages les plus vues
- Sitemap News : vérifier l'indexation des articles récents (< 48h)
