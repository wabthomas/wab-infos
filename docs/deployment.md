# Déploiement PlanetHoster

## Architecture de production

```
wab-infos.com          → WordPress (site actuel, inchangé)
app.wab-infos.com      → Nouvelle plateforme Next.js (port 3000, PM2)
cms.app.wab-infos.com  → Strapi CMS (port 8090, PM2)
```

Les deux stacks peuvent coexister : WordPress sur le domaine principal, la nouvelle app sur le sous-domaine `app`.

## Prérequis PlanetHoster

- Hébergement Cloud ou dédié avec Node.js 20+
- PostgreSQL disponible
- Accès SSH
- Nom de domaine configuré

## Étapes de déploiement

### 1. Préparer le serveur

```bash
# Connexion SSH
ssh user@votre-serveur.planethoster.com

# Installer Node.js 20 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 20
nvm use 20

# Installer PM2
npm install -g pm2

# Cloner le projet
git clone <repo> /home/user/wab-infos
cd /home/user/wab-infos
```

### 2. Configurer PostgreSQL

```bash
# Créer la base de données
psql -U postgres -c "CREATE DATABASE wab_infos;"
psql -U postgres -d wab_infos -f scripts/database/init.sql
```

### 3. Variables d'environnement

```bash
cp .env.example .env
cp apps/cms/.env.example apps/cms/.env

# Éditer avec les valeurs de production
nano .env
nano apps/cms/.env
```

Variables critiques :
- `NEXT_PUBLIC_SITE_URL=https://app.wab-infos.com`
- `STRAPI_URL=https://cms.app.wab-infos.com`
- `WP_BASE_URL=https://wab-infos.com` (pour l'import WordPress)
- `DATABASE_*` — credentials PostgreSQL
- `APP_KEYS`, `JWT_SECRET`, etc. — générer des valeurs aléatoires

### 4. Build et démarrage

```bash
npm install
npm run build:web
npm run build:cms

# Démarrer avec PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Configuration Nginx (reverse proxy)

Utilisez le fichier prêt à l'emploi :

```bash
sudo cp deploy/nginx/wab-infos.conf /etc/nginx/sites-available/wab-infos-app.conf
sudo ln -sf /etc/nginx/sites-available/wab-infos-app.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d app.wab-infos.com -d cms.app.wab-infos.com
sudo nginx -t && sudo systemctl reload nginx
```

Voir `deploy/nginx/wab-infos.conf` pour la configuration complète (`app.wab-infos.com` + `cms.app.wab-infos.com`).

### 6. Cloudflare / DNS

Enregistrements pour la **nouvelle plateforme** (même IP serveur ou serveur dédié) :

| Type | Nom | Valeur |
|------|-----|--------|
| A | `app` | IP du serveur |
| A | `cms.app` | IP du serveur |

> `wab-infos.com` reste pointé vers WordPress (ne pas modifier tant que la migration n'est pas terminée).

SSL/TLS : Full (strict). Cache recommandé sur `app.wab-infos.com/_next/static/*`.

### 7. Import WordPress

```bash
# Uploader l'export XML et les médias
scp wordpress-export.xml user@serveur:/home/user/wab-infos/data/
scp -r uploads/ user@serveur:/home/user/wab-infos/data/

# Lancer l'import
npm run import:wordpress
```

### 8. Migration vers Vercel (future)

Le frontend est compatible Vercel sans modification :
- `output: 'standalone'` fonctionne aussi en serverless
- Déployer `apps/web` comme projet Vercel
- Configurer les variables d'environnement
- Strapi reste sur PlanetHoster ou migre vers un VPS

## Fichier PM2 (ecosystem.config.js)

Créer à la racine :

```javascript
module.exports = {
  apps: [
    {
      name: 'wab-web',
      cwd: './apps/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: { NODE_ENV: 'production' },
      instances: 2,
      exec_mode: 'cluster',
    },
    {
      name: 'wab-cms',
      cwd: './apps/cms',
      script: 'node_modules/.bin/strapi',
      args: 'start',
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

## Sauvegardes automatiques

```bash
# Cron quotidien (3h du matin)
0 3 * * * pg_dump -U postgres wab_infos | gzip > /backups/wab-infos-$(date +\%Y\%m\%d).sql.gz
0 4 * * * tar czf /backups/wab-uploads-$(date +\%Y\%m\%d).tar.gz /home/user/wab-infos/apps/cms/public/uploads
```
