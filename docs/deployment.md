# Déploiement PlanetHoster

## Architecture de production

```
wab-infos.com (Cloudflare DNS)
    │
    ├── Cloudflare CDN (cache, WAF, SSL)
    │
    ├── wab-infos.com → Next.js (port 3000, PM2)
    │
    ├── cms.wab-infos.com → Strapi (port 1337, PM2)
    │
    └── PostgreSQL (PlanetHoster ou Docker)
```

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
- `NEXT_PUBLIC_SITE_URL=https://wab-infos.com`
- `STRAPI_URL=https://cms.wab-infos.com`
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

```nginx
# /etc/nginx/sites-available/wab-infos.com
server {
    listen 80;
    server_name wab-infos.com www.wab-infos.com;
    return 301 https://wab-infos.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name wab-infos.com www.wab-infos.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# CMS
server {
    listen 443 ssl http2;
    server_name cms.wab-infos.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:1337;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. Cloudflare

1. Ajouter le domaine à Cloudflare
2. Configurer les DNS :
   - `A` wab-infos.com → IP serveur (proxied)
   - `A` cms.wab-infos.com → IP serveur (proxied)
3. SSL/TLS : Full (strict)
4. Activer : Auto Minify (JS, CSS, HTML), Brotli, HTTP/3
5. Page Rules :
   - `wab-infos.com/uploads/*` → Cache Everything
   - `wab-infos.com/_next/static/*` → Cache Everything

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
