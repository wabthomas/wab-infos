# Guide de maintenance — Wab-infos

## Tâches quotidiennes

- Vérifier les articles en brouillon et planifiés dans Strapi
- Modérer les commentaires en attente (`status: pending`)
- Surveiller le bandeau Breaking News

## Tâches hebdomadaires

- Vérifier Google Search Console (erreurs d'indexation)
- Analyser les articles les plus lus (Strapi `viewCount`)
- Vérifier les Core Web Vitals (PageSpeed Insights)
- Contrôler les sauvegardes PostgreSQL

## Tâches mensuelles

- Mettre à jour les dépendances npm (`npm outdated`)
- Vérifier les certificats SSL
- Analyser les performances AdSense
- Nettoyer les médias orphelins dans Strapi

## Commandes utiles

```bash
# Développement
npm run dev              # Frontend + CMS
npm run dev:web          # Frontend seul
npm run dev:cms          # CMS seul

# Production
npm run build            # Build frontend
npm run build:cms        # Build CMS
pm2 restart all          # Redémarrer les services

# Import WordPress
npm run import:wordpress
npm run dry-run --workspace=@wab-infos/wordpress-import

# Base de données
docker compose up -d postgres
pg_dump -U postgres wab_infos > backup.sql

# Logs
pm2 logs wab-web
pm2 logs wab-cms
```

## Gestion éditoriale (Strapi)

### Publier un article

1. Admin Strapi → Articles → Créer
2. Remplir titre, extrait, contenu, image
3. Sélectionner catégorie, auteur, tags
4. Options : À la une, Breaking, Recommandé
5. SEO : titre et description optimisés
6. Publier ou planifier

### Breaking News

Activer `isBreaking` sur l'article. Le bandeau défilant s'affiche automatiquement sur l'accueil.

### Revalidation du cache

Après publication, Strapi déclenche automatiquement la revalidation ISR via webhook. En cas de problème :

```bash
curl -X POST https://wab-infos.com/api/revalidate \
  -H "x-revalidation-secret: VOTRE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type":"article","slug":"mon-article","category":"politique"}'
```

## Gestion des publicités

Les emplacements AdSense sont configurés dans `src/components/ads/adsense.tsx` :

| Slot | Position | Composant |
|------|----------|-----------|
| header-ad | Bannière haute | `HeaderAd` |
| sidebar-ad | Colonne droite | `SidebarAd` |
| in-article-ad | Dans le contenu | `InArticleAd` |
| sticky-mobile-ad | Bas mobile | `StickyMobileAd` |

Configurer `NEXT_PUBLIC_ADSENSE_CLIENT` dans `.env`.

## Sauvegardes

### Automatique (cron)

```bash
# PostgreSQL — quotidien 3h
0 3 * * * pg_dump -U postgres wab_infos | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Médias Strapi — quotidien 4h
0 4 * * * tar czf /backups/uploads-$(date +\%Y\%m\%d).tar.gz apps/cms/public/uploads
```

### Restauration

```bash
# Base de données
gunzip -c backup.sql.gz | psql -U postgres wab_infos

# Médias
tar xzf uploads-backup.tar.gz -C apps/cms/public/
```

## Dépannage

### Le frontend n'affiche pas les articles

1. Vérifier que Strapi est démarré (`pm2 status`)
2. Vérifier `STRAPI_API_TOKEN` dans `.env`
3. Vérifier les permissions API dans Strapi (Public → find)
4. Tester : `curl http://localhost:1337/api/articles`

### Erreurs 500 sur Strapi

1. Vérifier les logs : `pm2 logs wab-cms`
2. Vérifier la connexion PostgreSQL
3. Rebuild : `npm run build:cms && pm2 restart wab-cms`

### Images non affichées

1. Vérifier `NEXT_PUBLIC_STRAPI_URL`
2. Vérifier les `remotePatterns` dans `next.config.ts`
3. Vérifier les permissions du dossier `uploads/`

### Cache obsolète

```bash
# Forcer la revalidation
curl -X POST https://wab-infos.com/api/revalidate \
  -H "x-revalidation-secret: SECRET" \
  -d '{"path":"/"}'

# Purger le cache Cloudflare
# Dashboard Cloudflare → Caching → Purge Everything
```

## Contacts techniques

- Hébergement : PlanetHoster support
- CDN : Cloudflare dashboard
- CMS : [docs.strapi.io](https://docs.strapi.io)
- Frontend : [nextjs.org/docs](https://nextjs.org/docs)
