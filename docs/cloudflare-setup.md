# Cloudflare gratuit — Wab-infos + PlanetHoster

Guide pas à pas pour accélérer `wab-infos.com` avec le plan **Free**.

## Prérequis

- Accès au registrar DNS (là où est géré `wab-infos.com`)
- IP ou hostname d’origine PlanetHoster (panneau N0C → informations du serveur)
- Site Next.js déjà en prod sur PlanetHoster

## 1. Créer le compte Cloudflare

1. [cloudflare.com](https://www.cloudflare.com/) → inscription gratuite
2. **Add a site** → `wab-infos.com`
3. Choisir le plan **Free**

## 2. Importer les enregistrements DNS

Cloudflare scanne vos DNS actuels. Vérifiez :

| Type | Nom | Contenu | Proxy |
|------|-----|---------|-------|
| A ou CNAME | `@` (wab-infos.com) | IP PlanetHoster | **Proxied** (nuage orange) |
| CNAME | `www` | `wab-infos.com` | Proxied |
| CNAME | `cms.app` | (inchangé) | **DNS only** (nuage gris) au début |
| CNAME | `app` | (inchangé) | DNS only |
| CNAME | `redaction.app` | (inchangé) | DNS only |
| CNAME | `wp` | (inchangé) | DNS only |

> Commencez par mettre **uniquement le domaine principal** en proxy orange. Les sous-domaines CMS / rédaction peuvent rester en gris pour éviter les surprises (admin, cookies, API).

## 3. Changer les nameservers

Cloudflare affiche 2 nameservers (ex. `ada.ns.cloudflare.com`).

Chez votre registrar / PlanetHoster → **Domaines** → remplacez les NS par ceux de Cloudflare.

Propagation : 15 min à 48 h (souvent < 2 h).

## 4. SSL / TLS

Cloudflare → **SSL/TLS** :

| Réglage | Valeur |
|---------|--------|
| Mode de chiffrement | **Full (strict)** |
| Always Use HTTPS | **On** |
| Automatic HTTPS Rewrites | **On** |
| Minimum TLS Version | 1.2 |

Si erreur 525 : passez temporairement en **Full** (sans strict), installez/renouvelez Let’s Encrypt sur PlanetHoster, puis repassez en strict.

## 5. Règles de cache (plan gratuit)

### A. Respecter l’origine (recommandé au départ)

**Caching** → **Configuration** :

- **Caching Level** : Standard
- Les en-têtes `Cache-Control` de Next.js (ISR `revalidate = 60`) sont respectés

### B. Cache Rules (gratuit — 10 règles)

**Rules** → **Cache Rules** → Create rule :

**Règle 1 — Assets Next.js (long cache)**

- If : URI Path contains `/_next/static/`
- Then : Cache eligibility = Eligible, Edge TTL = 1 month, Browser TTL = 1 month

**Règle 2 — Images / icônes**

- If : URI Path starts with `/icons/` OR Extension equals `png`, `jpg`, `webp`, `avif`, `ico`, `woff2`
- Then : Edge TTL = 7 days

**Règle 3 — Ne pas cacher l’API**

- If : URI Path starts with `/api/`
- Then : Cache eligibility = Bypass

**Règle 4 — Bypass admin / preview** (si applicable)

- If : URI Path starts with `/connexion`
- Then : Bypass cache

### C. Page Rules (legacy, 3 gratuites — optionnel)

Si pas d’accès aux Cache Rules :

```
URL: wab-infos.com/_next/static/*
→ Cache Level: Cache Everything, Edge Cache TTL: 1 month
```

## 6. Optimisations gratuites utiles

**Speed** → **Optimization** :

| Option | Recommandation |
|--------|----------------|
| Auto Minify (JS, CSS, HTML) | On |
| Brotli | On |
| Early Hints | On |
| HTTP/2 to Origin | On |
| HTTP/3 (QUIC) | On |

**Rocket Loader** : **Off** (peut casser React / Next.js)

## 7. Vérifications après activation

```bash
# Headers cache (depuis votre PC)
curl -sI https://wab-infos.com | grep -i cf-
curl -sI https://wab-infos.com/_next/static/ | head -5
```

Dans le navigateur :

1. `https://wab-infos.com` — site OK, articles récents
2. [PageSpeed Insights](https://pagespeed.web.dev/) — TTFB en baisse sur 2e test (cache chaud)
3. Cloudflare → **Analytics** → cache hit ratio augmente après quelques heures

## 8. Préchauffage (cron PlanetHoster)

Évite le cold start Node + remplit le cache edge :

```bash
# crontab -e (toutes les 5 minutes)
*/5 * * * * curl -s -o /dev/null https://wab-infos.com/
```

## 9. Ce qu’il ne faut pas faire

- Ne pas mettre **cms.app** en cache agressif (admin Strapi, uploads API)
- Ne pas activer **Rocket Loader**
- Ne pas mettre cache « Everything » sur `/*` sans TTL court (actualités périmées)
- Ne pas oublier de **rebuild + redéployer** les optimisations code (Strapi, scripts)

## 10. Déploiement code perf (complément)

Après Cloudflare, déployez les changements web :

```bash
# En local
npm run build:web:pack

# Upload web-next-build.tar.gz + code sur le serveur
# SSH : tar -xzf web-next-build.tar.gz -C apps/web
# N0C : redémarrer l’app web
```

## Résultat attendu

| Métrique | Avant | Cible |
|----------|-------|-------|
| TTFB | ~2,5 s | ~1,2–1,8 s (cache chaud) |
| LCP | ~4,4 s | ~2,5–3,5 s |

Les Core Web Vitals CrUX se mettent à jour sur **28 jours** — retestez PageSpeed chaque semaine.

## Support

- [Cloudflare SSL modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)
- [Cache Rules](https://developers.cloudflare.com/cache/how-to/cache-rules/)
- PlanetHoster : vérifier que l’IP d’origine dans Cloudflare correspond au serveur actuel
