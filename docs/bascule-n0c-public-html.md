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

Il faut l'attacher à la **même application Node.js** que `app.wab-infos.com` (dossier `~/app`).

### Panneau Node.js / Setup Node.js App

1. Ouvrir l'application dans **`~/app`**
2. Section **Domaines** / **Application URL** :
   - **Ajouter** : `wab-infos.com`
   - **Ajouter** : `www.wab-infos.com` (optionnel)
3. Garder `app.wab-infos.com` en alias ou le retirer (les deux peuvent coexister)
4. **Redémarrer** l'application

Après ça : `wab-infos.com` = Next.js, plus d'erreur 500.

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
