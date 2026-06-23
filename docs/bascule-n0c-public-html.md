# Bascule N0C / PlanetHoster — configuration réelle (cPanel)

D'après votre panneau **Domaines** :

| Domaine | Racine du document | Rôle |
|---------|-------------------|------|
| **wab-infos.com** | `~/public_html` | Domaine principal — **vide** → **500** |
| **app.wab-infos.com** | `~/app` | **Next.js** (Node.js) ✅ |
| **cms.app.wab-infos.com** | `~/cms` | **Strapi** ✅ |
| **wp.wab-infos.com** | `~/public_html/wp` | **WordPress** ✅ |

```
~/                          (racine compte)
├── app/                    ← Next.js (app.wab-infos.com)
├── cms/                    ← Strapi (cms.app.wab-infos.com)
└── public_html/
    └── wp/                 ← WordPress (wp.wab-infos.com)
```

> Next.js n'est **pas** dans `public_html/app` — il est dans **`~/app`**, au même niveau que `public_html`.

---

## Ce qui manque (1 action)

**`wab-infos.com`** pointe encore vers `~/public_html` (vide).

L'URL d'application Node.js est **souvent verrouillée** après création — on ne peut pas remplacer `app.wab-infos.com` par `wab-infos.com` dans le formulaire.

### Solution A — Copier la config Passenger dans `public_html` (recommandé)

1. Ouvrir **`~/app/.htaccess`** (racine de `app.wab-infos.com`)
2. Copier le bloc `CLOUDLINUX PASSENGER CONFIGURATION`
3. Créer **`~/public_html/.htaccess`** avec ce même bloc
4. Tester `https://wab-infos.com`

Modèle : `deploy/public_html/passenger-nextjs.htaccess.example`

### Solution B — Recréer l'application Node.js

1. Noter le chemin : `/home/.../wab-infos/apps/web`
2. **Supprimer** l'app `wab-infos/apps/web` dans le panneau Node.js
3. **Créer** une nouvelle app avec **URL = `wab-infos.com`** dès le départ (même chemin, `server.js`)
4. Redémarrer

### Solution C — Support PlanetHoster

> « Je ne peux pas modifier l'URL de mon application Node.js `wab-infos/apps/web`. Pouvez-vous attacher le domaine principal **wab-infos.com** à cette application Passenger ? »

---

## WordPress — déjà bien configuré

- URL : **https://wp.wab-infos.com**
- Dossier : `~/public_html/wp`

Vérifier en base MySQL :

```sql
UPDATE wp_options
SET option_value = 'https://wp.wab-infos.com'
WHERE option_name IN ('siteurl', 'home');
```

Test : `https://wp.wab-infos.com/wp-admin`

---

## Variables `.env` serveur (dossier `~/app`)

```env
NEXT_PUBLIC_SITE_URL=https://wab-infos.com
STRAPI_URL=https://cms.app.wab-infos.com
NEXT_PUBLIC_STRAPI_URL=https://cms.app.wab-infos.com
WP_BASE_URL=https://wp.wab-infos.com
WP_UPLOADS_ORIGIN=https://wp.wab-infos.com
```

Puis rebuild :

```bash
cd ~/app   # ou ~/wab-infos selon où est le projet
npm run build:web:low-mem
# Redémarrer via panneau Node.js ou : pm2 restart wab-web
```

---

## Résultat final

| URL | Sert |
|-----|------|
| **wab-infos.com** | Nouveau site (Next.js) |
| **app.wab-infos.com** | Next.js (alias, optionnel) |
| **wp.wab-infos.com** | WordPress (archive / admin) |
| **cms.app.wab-infos.com** | Strapi admin |

---

## Ne pas faire

- ❌ Mettre WordPress dans `~/app` (c'est Next.js)
- ❌ Laisser `wab-infos.com` sur `~/public_html` sans proxy Node.js
- ❌ Oublier le **rebuild** après `NEXT_PUBLIC_SITE_URL=https://wab-infos.com`
