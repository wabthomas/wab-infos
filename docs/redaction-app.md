# Application rédaction mobile — Wab-infos

Interface mobile-first pour les journalistes (~10 comptes) : rédaction, publication, flash info, modération et statistiques.

## Accès

- **URL** : `https://app.wab-infos.com/redaction`
- **Connexion** : `https://app.wab-infos.com/redaction/login`
- **Admin Strapi complet** : `/connexion` (tableau de bord CMS)

## Configuration Strapi (une fois)

### 1. Token API serveur

Dans `apps/web/.env.local` (production) :

```env
STRAPI_API_TOKEN=votre-token-full-access
STRAPI_URL=https://cms.app.wab-infos.com
REVALIDATION_SECRET=...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

Le token doit permettre : articles (CRUD), auteurs, catégories, commentaires, abonnements push, upload.

### 2. Permissions Users & Permissions

**Settings → Users & Permissions → Roles → Public**

- Cocher **Auth → Local** (connexion `/api/auth/local`)

**Settings → Users & Permissions → Roles → Authenticated**

- Cocher **User → me** (vérification de session)

### 3. Créer les comptes journalistes

**Content Manager → User** (collection Users)

Pour chaque rédacteur :

1. **Add new entry**
2. Username, Email, Password (confirmed)
3. Role : **Authenticated**
4. **Save**

L’app lie automatiquement le compte à un profil **Auteur** (par e-mail) ou en crée un à la première connexion.

## Installation PWA (mobile)

1. Ouvrir **`https://app.wab-infos.com/redaction/login`** (Chrome Android ou Safari iOS)
2. **Android / Chrome** : bouton **« Installer »** sur la page de connexion, ou icône ⊕ dans la barre d’adresse
3. **iPhone** : Safari → **Partager** → **Sur l’écran d’accueil** (bandeau d’aide affiché sur la page login)
4. Se connecter — accepter les **notifications push** pour la modération commentaires

Critères techniques : manifest dédié `/redaction/manifest.webmanifest`, service worker `sw-redaction.js` (scope `/redaction/`), icônes PNG 192×512.

Générer les icônes PNG après clone : `npm run pwa:icons --workspace=apps/web`

## Fonctionnalités

| Fonction | Description |
|----------|-------------|
| Rédaction | Titre, chapô, contenu, rubrique, image à la une |
| Brouillon / Publier | Enregistrement ou publication directe |
| Planification | Date/heure + bouton « Planifier » (cron serveur) |
| Flash info | Toggle `isBreaking` |
| Modération | `/redaction/comments` — approuver / refuser |
| Push | Notification à chaque nouveau commentaire en attente |
| Stats | Vues cumulées, top articles, brouillons, planifiés |
| Mes articles | Liste filtrée par statut |

## Publication planifiée (cron)

Un cron appelle toutes les minutes (ou 5 min) :

```bash
curl -X POST https://app.wab-infos.com/api/cron/publish-scheduled \
  -H "x-revalidation-secret: VOTRE_REVALIDATION_SECRET"
```

Exemple crontab PlanetHoster :

```cron
* * * * * curl -s -X POST https://app.wab-infos.com/api/cron/publish-scheduled -H "x-revalidation-secret: ..." > /dev/null
```

Les articles avec `status=scheduled` et `scheduledAt <= now` passent en publié automatiquement.

## Publication réseaux sociaux (Facebook & X)

À chaque publication d’un article récent (≤ 48 h), Strapi appelle `POST /api/social/publish-article` sur le site Next.js.

**Guide détaillé pas à pas** : [social-publish-setup.md](./social-publish-setup.md) (obtention des tokens Facebook & X, tests, dépannage).

### Configuration (`apps/web/.env`)

```env
SOCIAL_PUBLISH_ENABLED=true
SOCIAL_SEND_ON_PUBLISH=true

# Facebook — Page Wab-infos
FACEBOOK_PAGE_ID=votre-page-id
FACEBOOK_PAGE_ACCESS_TOKEN=token-longue-duree-avec-pages_manage_posts

# X (Twitter) — OAuth 1.0a (Developer Portal → Keys and tokens)
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
```

Côté CMS (`apps/cms/.env`) : `SOCIAL_SEND_ON_PUBLISH=true` et `NEXT_PUBLIC_SITE_URL` identiques à la prod.

Chaque plateforme enregistre `facebookPostedAt` / `xPostedAt` sur l’article pour éviter les doublons.

## Notifications push (VAPID)

Générer une paire de clés :

```bash
npx web-push generate-vapid-keys
```

Copier dans `apps/web/.env` :

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:redaction@wab-infos.com
```

`REVALIDATION_SECRET` doit être identique côté CMS (`apps/cms/.env`) pour que Strapi déclenche `/api/redaction/push/notify` à la création d’un commentaire.

## Commentaires publics

Les lecteurs peuvent commenter en bas de chaque article. Les commentaires arrivent en `pending` dans Strapi et déclenchent une push aux rédacteurs abonnés.

## Développement local

```bash
npm run dev:web
npm run dev:cms
```

Créer un utilisateur test dans Strapi admin, puis :

`http://localhost:3000/redaction/login`
