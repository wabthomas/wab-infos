# Bascule domaine — wab-infos.com (nouveau site) + app.wab-infos.com (WordPress)

## Objectif

| Avant | Après |
|-------|-------|
| `wab-infos.com` → WordPress (`public_html`) | `wab-infos.com` → **Next.js** (nouvelle plateforme) |
| `app.wab-infos.com` → Next.js | `app.wab-infos.com` → **WordPress** (archive / admin) |
| `cms.app.wab-infos.com` → Strapi | **inchangé** |

Les articles sont déjà importés : les URLs publiques restent `https://wab-infos.com/{rubrique}/{slug}`.

---

## Ordre recommandé (éviter la coupure)

### Phase 1 — Préparer WordPress sur `app.`

1. **Sauvegarde complète** : fichiers `public_html` + base MySQL WordPress.
2. Dans **cPanel → Sous-domaines**, créer `app.wab-infos.com` (ex. dossier `public_html/app` ou `app.wab-infos.com`).
3. **Copier** le contenu WordPress de `public_html` vers ce dossier (pas déplacer tout de suite).
4. Mettre à jour WordPress **dans la copie** (WP-CLI ou base de données) :

```sql
UPDATE wp_options SET option_value = 'https://app.wab-infos.com' WHERE option_name IN ('siteurl', 'home');
```

5. Tester `https://app.wab-infos.com/wp-admin` (connexion, médias, permaliens).

### Phase 2 — Préparer la nouvelle app sur le domaine principal

1. Sur le serveur, éditer `.env` et `apps/cms/.env` :

```env
NEXT_PUBLIC_SITE_URL=https://wab-infos.com
NEXT_PUBLIC_STRAPI_URL=https://cms.app.wab-infos.com
STRAPI_URL=https://cms.app.wab-infos.com
WP_BASE_URL=https://app.wab-infos.com
WP_UPLOADS_ORIGIN=https://app.wab-infos.com
```

2. **Rebuild obligatoire** (les `NEXT_PUBLIC_*` sont figés au build) :

```bash
npm run build:web:low-mem
# redémarrer PM2 / Node
pm2 restart wab-web
```

3. Redémarrer Strapi (CORS mis à jour dans le code).

### Phase 3 — Inverser le routage web

**Si Nginx gère les domaines** (voir `deploy/nginx/wab-infos-production.conf`) :

```bash
sudo cp deploy/nginx/wab-infos-production.conf /etc/nginx/sites-available/wab-infos.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d wab-infos.com -d www.wab-infos.com -d app.wab-infos.com -d cms.app.wab-infos.com
```

- `wab-infos.com` → proxy port **3000** (Next.js)
- `app.wab-infos.com` → racine WordPress (Apache/cPanel ou `root` du sous-domaine)

**Si tout passe par cPanel / Apache seul** :

- Vider ou renommer l’ancien `public_html` (WordPress déjà copié sur `app.`).
- Mettre un **proxy** vers Node 3000 dans `.htaccess` à la racine, **ou** demander à PlanetHoster d’activer Nginx en reverse proxy sur le domaine principal.

Exemple `.htaccess` (si mod_proxy activé) :

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

### Phase 4 — Redirections SEO

1. **Homepage WordPress** : sur `app.wab-infos.com`, rediriger `/` vers `https://wab-infos.com` (plugin Redirection ou `.htaccess`).
2. **Anciens permaliens WP** : WordPress utilisait `https://wab-infos.com/{slug}/` (sans rubrique). Le site Next.js redirige automatiquement en 301 vers `/{rubrique}/{slug}`. Les liens Google et réseaux sociaux existants continueront de fonctionner.
3. **`www`** : rediriger `www.wab-infos.com` → `https://wab-infos.com`.

### Phase 5 — DNS / Cloudflare

| Type | Nom | Valeur |
|------|-----|--------|
| A | `@` | IP serveur (Next.js) |
| A | `www` | IP serveur |
| A | `app` | IP serveur (WordPress) |
| A | `cms.app` | IP serveur (Strapi) |

SSL : **Full (strict)** sur tous les sous-domaines.

### Phase 6 — Outils Google

- **Search Console** : ajouter la propriété `wab-infos.com`, soumettre les sitemaps.
- **Publisher Center** : changer l’URL de publication vers `https://wab-infos.com`.
- **Analytics / AdSense** : vérifier le domaine autorisé.

---

## Checklist post-bascule

- [ ] `https://wab-infos.com` affiche la nouvelle home
- [ ] Un article : `https://wab-infos.com/{rubrique}/{slug}` OK
- [ ] Images articles OK (`/uploads` Strapi + anciens médias WP via proxy)
- [ ] `https://app.wab-infos.com/wp-admin` accessible (admin seulement)
- [ ] `https://cms.app.wab-infos.com/admin` OK
- [ ] Rédaction : `https://wab-infos.com/redaction/login`
- [ ] `/sitemap.xml` et `/sitemap-news.xml` sur le domaine principal
- [ ] Newsletter / push / réseaux sociaux testés (URLs dans les env)

---

## Rollback

Conserver la sauvegarde `public_html` + dump MySQL. En cas de problème : remettre WordPress dans `public_html`, repointer `NEXT_PUBLIC_SITE_URL` vers `app.wab-infos.com`, rebuild.
