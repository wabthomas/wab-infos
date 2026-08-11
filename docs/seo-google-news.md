# Stratégie SEO Google News — Wab-infos

## Objectif

Optimiser Wab-infos pour l'indexation Google News, Google Discover et Google Search afin de maximiser la visibilité et le trafic organique.

## Correctifs Arena (août 2026) — code

- Soft-404 : `notFound()` aussi dans `generateMetadata` des articles
- Canonique www → apex : middleware + redirects Next (compléter avec Cloudflare Always HTTPS)
- Sitemaps : plus de `lastmod = now()` ; auteurs dédoublonnés ; tags hors sitemap
- Tags : `noindex` si moins de 3 articles
- Un seul `<h1>` par article ; cache `s-maxage=300` sur `/:category/:slug`
- Redirects manuels : `/television` → `/tv`, `/login-page` → `/`, `/wab-infos` → `/a-propos`

## Implémentation technique

### 1. Schema.org (JSON-LD)

Chaque article génère automatiquement :

**NewsArticle** (`apps/web/src/lib/seo.ts`) :
- `headline` (= H1 visible), `description`, `url`
- `image` en `ImageObject` (largeur/hauteur)
- `datePublished`, `dateModified`
- `author` (Person), `publisher` (`NewsMediaOrganization` + logo)
- `speakable` (titre + chapô)
- `articleSection`, `keywords`, `wordCount`
- `isAccessibleForFree: true`, `inLanguage: "fr"`

**BreadcrumbList** — Fil d'Ariane structuré sur chaque article.

**WebSite** + **NewsMediaOrganization** — Schema global (layout) avec `SearchAction`.

### 2. Meta tags

| Tag | Implémentation |
|-----|----------------|
| Title | `title.absolute` (évite le double « — Wab-infos ») |
| Open Graph | `og:type=article`, images 1200×630 |
| Twitter Cards | `summary_large_image` |
| Canonical | URL canonique par article |
| `robots` | `max-image-preview: large`, `max-snippet: -1` |
| Verification | `GOOGLE_SITE_VERIFICATION` |
| AdSense | meta `google-adsense-account` si client configuré |

### 3. Sitemaps

**`/sitemap.xml`** — **Index** de sitemaps :
- `/sitemaps/static.xml` — accueil, légales, rubriques, TV, auteurs, tags, vidéos
- `/sitemaps/articles/0`, `/1`, … — articles par chunks (~4000 URLs)

**`/sitemap-news.xml`** — Articles des dernières 48h (Google News).  
`news:name` doit être exactement **`Wab-infos`** (Publisher Center).  
Si Strapi est down → **503** (pas de sitemap vide).

**`/sitemap-videos.xml`** — Vidéos Strapi + chaîne YouTube.

**RSS** : `/feed.xml`, `/feed-tv.xml` (annoncés dans le layout).

### 4. Robots.txt dynamique

- Autorise `Googlebot` / `Googlebot-News` (sauf `/api/`, `/admin/`, `/_next/` pour les bots généraux)
- Liste : `sitemap.xml`, `sitemap-news.xml`, `sitemap-videos.xml`
- `Host: wab-infos.com` (hostname seul)
- Cloudflare peut préfixer un Managed robots (blocage GPTBot / Google-Extended) : **OK** tant que Googlebot n’est pas bloqué

### 5. URLs et redirections

- Structure : `/{rubrique}/{slug}`
- Slugs WordPress conservés à l'import
- Redirections 301 via `middleware.ts` (trailing slash, anciennes URLs WordPress)
- Trailing slashes supprimés (301)

### 6. IndexNow (Bing / Yandex)

- `INDEXNOW_KEY` dans l’env web ; preuve servie par le middleware (`/{key}.txt`)
- Notification à la publication via `/api/revalidate`
- Générer une clé : `npm run setup:indexnow`

### 6b. Google Indexing API

Demande d’indexation Google (équivalent « Request indexing ») :

1. Dans [Google Cloud](https://console.cloud.google.com/) : activer **Web Search Indexing API**
2. Créer un **compte de service** + télécharger la clé JSON
3. Dans [Search Console](https://search.google.com/search-console) → Paramètres → Utilisateurs : ajouter `client_email` du compte de service en **propriétaire**
4. Sur le serveur web (`apps/web` env) :

```bash
GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# ou
GOOGLE_INDEXING_CLIENT_EMAIL=...@....iam.gserviceaccount.com
GOOGLE_INDEXING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

5. À la publication / via l’assistant SEO rédaction : `URL_UPDATED` sur l’URL article
6. Quota typique : **~200 URL / jour** — l’indexation groupée est plafonnée à 40

Sans credentials, IndexNow continue de fonctionner seul ; le wizard affiche « Google non configuré ».

### 7. AdSense

- CSP doit autoriser les iframes AdSense (`frame-src` googlesyndication / doubleclick / google)
- `ads.txt` : `google.com, pub-XXXXXXXX, DIRECT, f08c47fec0942fa0`
- Slots distincts par emplacement (éviter le même ID top + in-content sur une page)

## Checklist post-deploy (Search Console + Publisher)

### Search Console

1. [ ] Propriété `https://wab-infos.com` vérifiée (meta déjà en place si `GOOGLE_SITE_VERIFICATION` est set)
2. [ ] Soumettre / resoumettre :
   - `https://wab-infos.com/sitemap.xml`
   - `https://wab-infos.com/sitemap-news.xml`
   - `https://wab-infos.com/sitemap-videos.xml`
3. [ ] Inspection d’URL sur 2–3 articles récents + demande d’indexation
4. [ ] Vérifier qu’il n’y a pas d’erreurs « Soft 404 » sur rubriques vides (noindex)

### Publisher Center

1. [ ] Publication nommée exactement **Wab-infos**
2. [ ] URL : `https://wab-infos.com`
3. [ ] Sitemap : `https://wab-infos.com/sitemap-news.xml`
4. [ ] Logo publisher **400×200** (`public/publisher-logo.png`) — source : `publisher-logo-source.png`, puis `npm run generate:publisher-logo`
5. [ ] Pages À propos / Contact / Mentions / Confidentialité OK
6. [ ] Sections (World → International, Nation → Actualités RDC / Politique, etc.)

### AdSense

1. [ ] `ads.txt` accessible
2. [ ] Console navigateur sans erreur CSP `frame-src` sur les iframes pubs
3. [ ] Accueil : slots header + sidebar ; articles : top / in-content / bottom

## Configuration Publisher Center (détail)

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
