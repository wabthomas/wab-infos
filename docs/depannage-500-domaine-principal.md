# Dépannage — wab-infos.com erreur 500

## Diagnostic rapide

| URL | Attendu | Problème si… |
|-----|---------|--------------|
| `https://app.wab-infos.com` | **200** (Next.js) | Build ou PM2 arrêté |
| `https://wab-infos.com` | **200** (Next.js après bascule) | **500** = domaine principal pas encore routé vers Node |
| `https://cms.app.wab-infos.com/admin` | **200** | Strapi arrêté |

Si **app.** fonctionne mais **wab-infos.com** renvoie **500**, le nouveau site tourne — c’est le **routage du domaine principal** qui est en cause (pas le code des articles).

---

## Cause la plus fréquente (PlanetHoster / cPanel)

`wab-infos.com` pointe encore sur **`public_html`** (WordPress / Apache). Un `.htaccess` avec proxy vers le port 3000 sans `mod_proxy` activé provoque une **erreur 500**.

### Solution A — Proxy Nginx (recommandé si disponible)

Utiliser `deploy/nginx/wab-infos-production.conf` :

- `wab-infos.com` → `http://127.0.0.1:3000`
- `app.wab-infos.com` → WordPress (sous-dossier) ou laisser cPanel gérer `app.`

Puis :

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d wab-infos.com -d www.wab-infos.com
```

### Solution B — cPanel seul (sans Nginx)

1. **Ne pas** laisser un `.htaccess` proxy cassé dans `public_html` — supprimez-le si vous voyez `[P]` ou `ProxyPass`.
2. Demander au **support PlanetHoster** :
   > « Je souhaite que le domaine principal wab-infos.com soit en reverse proxy vers mon application Node.js locale sur le port 3000 (comme app.wab-infos.com). »
3. WordPress déplacé sur `app.wab-infos.com` (sous-domaine cPanel).

### Solution C — Rollback temporaire

Remettre WordPress dans `public_html` et restaurer la base MySQL jusqu’à ce que le proxy soit configuré.

---

## Après bascule : variables d’environnement

Sur le serveur, **obligatoire** avant rebuild :

```env
NEXT_PUBLIC_SITE_URL=https://wab-infos.com
STRAPI_URL=https://cms.app.wab-infos.com
WP_UPLOADS_ORIGIN=https://app.wab-infos.com
```

Puis :

```bash
npm run build:web:low-mem
pm2 restart wab-web
```

Sans rebuild, les liens et sitemaps restent sur `app.wab-infos.com`.

---

## Vérifications

```bash
# Next.js écoute ?
curl -I http://127.0.0.1:3000

# Depuis le serveur, domaine principal
curl -I https://wab-infos.com

# Logs
pm2 logs wab-web --lines 50
```

---

## Redirections URLs WordPress

Format ancien : `https://wab-infos.com/{slug}/`  
Format nouveau : `https://wab-infos.com/{rubrique}/{slug}`

Une fois Next.js servi sur le domaine principal, la redirection 301 est gérée dans `[category]/page.tsx` (fichier `lib/legacy-url.ts`).
