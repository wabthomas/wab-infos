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

## Indexation quasi temps réel (octobre 2026)

Objectif : qu’un article publié soit crawlé et indexé aussi vite qu’une vidéo
YouTube — sans attendre le prochain passage du sitemap ni l’expiration du cache CDN.

### Chaîne de publication

```
Strapi (publish / IA auto-publish)
  └─ lifecycle afterUpdate
       └─ POST /api/revalidate  { type: "article", slug, category }
            ├─ revalidatePath  → article, rubrique, home, sitemaps, RSS
            ├─ IndexNow        → Bing, Yandex, Naver, Seznam (api.indexnow.org)
            ├─ Google Indexing → URL_UPDATED (Search Console, quota ~200/j)
            └─ purge Cloudflare → URLs article + rubrique + sitemaps + RSS
```

Le point clé ajouté : **la purge CDN**. `revalidatePath()` ne vide que le cache
Next.js ; sans purge, Cloudflare continuait de servir un sitemap News vieux de
30 min à Googlebot. À chaque publication, les URLs exactes sont maintenant
purgées (`apps/web/src/lib/seo/publish-indexing.ts`).

### Variables d’environnement (apps/web)

| Variable | Rôle | Sans elle |
|---|---|---|
| `INDEXNOW_KEY` | Notification Bing/Yandex/Naver | IndexNow ignoré |
| `GOOGLE_INDEXING_CLIENT_EMAIL` + `GOOGLE_INDEXING_PRIVATE_KEY` (ou `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON`) | Google Indexing API | Google découvre via sitemap/crawl |
| `CLOUDFLARE_ZONE_ID` + `CLOUDFLARE_API_TOKEN` (permission **Cache Purge**) | Cache edge frais immédiatement | Cache CDN jusqu’à 5 min (sitemaps) / 30 min (News) |

Diagnostic : `GET /api/seo/health` avec l’en-tête `x-revalidation-secret`.
La rédaction affiche le même état (onglet SEO → « Veille concurrence & indexation »).

### Délais de cache après modification

| Ressource | Avant | Après |
|---|---|---|
| `sitemap-news.xml` | 30 min | 60 s (+ purge à la publication) |
| `sitemap.xml` / chunks articles | 1 h | 5 min (+ purge) |
| `feed.xml` | 30 min | 5 min (+ purge) |
| Article (ISR) | 5 min | 5 min, invalidé immédiatement à la publication |

### Correctifs de crawl

- `robots.txt` ne bloque plus `/_next/` : Googlebot doit charger JS/CSS pour
  rendre la page (un blocage dégrade le rendu et l’évaluation Core Web Vitals).
- `sitemap-news.xml` : `<lastmod>` par URL, filtre des articles `noindex`,
  fenêtre stricte de 48 h.
- `sitemap.xml` référence désormais explicitement `sitemap-news.xml` et
  `sitemap-videos.xml`.
- `feed.xml` : `lastBuildDate` = date du dernier article (plus « maintenant »
  à chaque requête) + `<ttl>5</ttl>`.
- JSON-LD `NewsArticle` enrichi : `publisher.sameAs`, `isPartOf`, `about`,
  `mentions`, `dateline`, `contentLocation`, `copyrightHolder`, `copyrightYear`,
  `license`, `creditText`, `alternativeHeadline`, `thumbnailUrl`.
- `news_keywords` exposé en meta pour les agrégateurs qui le lisent encore.

### Veille concurrence + brief IA (rédaction)

`GET /api/seo/competition` (site) lit les flux RSS des concurrents
(Actualite.cd, Radio Okapi, 7sur7, Le Potentiel, Opinion-Info), calcule :

- le volume de titres sur 24 h par média et le ratio face à Wab-infos ;
- les mots-clés dominants chez la concurrence (hors mots vides et termes
  trop génériques type « congo », « kinshasa ») ;
- les **trous de couverture** : sujets traités au moins 2 fois ailleurs et
  absents de nos titres récents.

Dans la rédaction (Paramètres → SEO → « Veille concurrence & indexation »),
chaque trou de couverture propose **Brief IA** : angle, titre, titre SEO,
méta description, requête cible, plan H2, faits à vérifier, sources, urgence.
Le brief peut créer un brouillon via le flux de recherche IA existant.

Le snapshot est mis en cache 10 min côté site (les flux concurrents ne sont
pas martelés à chaque ouverture de l’écran).

### Limites à connaître

- L’**Indexing API Google** est officiellement réservée aux offres d’emploi et
  aux diffusions en direct ; pour les articles elle fonctionne mais n’est pas
  garantie. Le levier fiable reste : sitemap News frais + maillage interne +
  crawl rapide.
- **IndexNow** couvre Bing, Yandex, Naver et Seznam — pas Google.
- La vitesse d’indexation dépend aussi de l’autorité du domaine : publier tôt,
  sourcer, mailler vers les articles récents et éviter les mises à jour
  cosmétiques qui changent `lastmod` sans contenu nouveau.

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
- `/sitemaps/static.xml` — accueil, légales, rubriques, TV, auteurs, vidéos
- `/sitemap-news.xml` et `/sitemap-videos.xml` — déclarés dans l’index
- `/sitemaps/articles/0`, `/1`, … — articles par chunks (~4000 URLs)

**`/sitemap-news.xml`** — Articles des dernières 48h (Google News).  
`news:name` doit être exactement **`Wab-infos`** (Publisher Center).  
Si Strapi est down → **503** (pas de sitemap vide).

**`/sitemap-videos.xml`** — Vidéos Strapi + chaîne YouTube.

**RSS** : `/feed.xml`, `/feed-tv.xml` (annoncés dans le layout).

### 4. Robots.txt dynamique

- Autorise `Googlebot` / `Googlebot-News` / `Bingbot` sur tout le site sauf `/api/`, `/admin/`
- `/_next/` **n’est plus bloqué** : les assets JS/CSS sont nécessaires au rendu Google
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

### Indexation temps réel (nouvelles variables)

1. [ ] `INDEXNOW_KEY` défini dans l’environnement `apps/web`
2. [ ] Compte de service Google ajouté **propriétaire** dans Search Console
3. [ ] `CLOUDFLARE_ZONE_ID` + `CLOUDFLARE_API_TOKEN` (permission **Cache Purge**) définis
4. [ ] `GET /api/seo/health` renvoie `indexNowConfigured`, `googleIndexingConfigured` et `cloudflarePurgeConfigured` à `true`
5. [ ] Publier un article test puis vérifier sous 2 min :
   - l’URL apparaît dans `/sitemap-news.xml`
   - l’URL est revenue fraîche depuis Cloudflare (`cf-cache-status: MISS` puis `HIT`)
   - le sitemap News ne contient plus la version cache précédente

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
