# Application rédaction mobile — Wab-infos

Interface mobile-first pour les journalistes (~10 comptes) : rédaction, publication, flash info, modération et statistiques.

## Accès

- **URL** : `https://redaction.app.wab-infos.com`
- **Connexion** : `https://redaction.app.wab-infos.com/login`
- **Admin Strapi complet** : `https://cms.app.wab-infos.com/admin` (ou `/connexion` sur le site public → redirect)

L’ancienne URL `app.wab-infos.com/redaction` redirige automatiquement vers l’app dédiée.

## Configuration

Variables dans `apps/redaction/.env.local` (voir `apps/redaction/.env.example`).

```env
STRAPI_API_TOKEN=votre-token-full-access
STRAPI_URL=https://cms.app.wab-infos.com
REVALIDATION_SECRET=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
FIREBASE_SERVICE_ACCOUNT_JSON=...
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

**Une seule application** Wab-infos pour tous (lecteurs et rédaction), installable depuis n’importe quelle page du site.

| Contexte | Comportement |
|----------|--------------|
| **Site public** (accueil, articles…) | Bandeau « Installer Wab-infos » en bas d’écran ; splash au lancement : **Wab-infos** |
| **`/redaction/login`** | Bandeau « Installer l’app rédaction » ; si installé depuis cette page, splash au lancement : **Rédaction** |

1. **Lecteurs** : ouvrir `https://app.wab-infos.com` → bandeau d’installation ou Chrome ⊕ / Safari Partager
2. **Journalistes** : ouvrir `https://app.wab-infos.com/redaction/login` → même procédure (variante rédaction mémorisée)
3. Se connecter — accepter les **notifications push** pour la modération commentaires

Technique : manifest unique `/manifest.webmanifest`, service worker `sw.js` (scope `/`), icônes PNG 192×512.

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

## Notifications push (Firebase Cloud Messaging)

1. Créer un projet sur [Firebase Console](https://console.firebase.google.com/)
2. Ajouter une app Web, activer **Cloud Messaging**, copier la config et la clé Web Push (VAPID)
3. Générer un compte de service (JSON) pour `firebase-admin`

Copier dans `apps/web/.env.local` :

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Puis générer la config du service worker :

```bash
npm run pwa:fcm --workspace=apps/web
```

`REVALIDATION_SECRET` doit être identique côté CMS (`apps/cms/.env`) pour que Strapi déclenche `/api/redaction/push/notify` à la création d’un commentaire.

## Commentaires publics

Les lecteurs peuvent commenter en bas de chaque article. Les commentaires arrivent en `pending` dans Strapi et déclenchent une push aux rédacteurs abonnés.

## Développement local

```bash
npm run dev:web
npm run dev:cms
npm run dev:redaction
```

Créer un utilisateur test dans Strapi admin, puis :

`http://localhost:3001/login`

## Déploiement PlanetHoster (N0C)

L’app rédaction est **séparée** du site public (`apps/web`). Un build `.next` valide ne suffit pas : **Passenger** doit pointer vers `apps/redaction/server.js`.

### Symptômes

| Test SSH | HTTPS |
|----------|-------|
| `node server.js` → `Next.js rédaction ready` | `503` sur redaction.app |

→ Problème de **domaine / Passenger**, pas de build.

### 1. Application Node.js (panneau N0C)

**Langues → Node.js → Créer une application** (ou modifier si elle existe) :

| Champ | Valeur |
|-------|--------|
| URL | `redaction.app.wab-infos.com` |
| Racine | `/home/anvvbzrr/wab-infos/apps/redaction` |
| Fichier de démarrage | `server.js` |
| Version Node | 20 |

Cliquer **Créer** puis **Redémarrer**. Utiliser **Installer module NPM** une fois.

### 2. Racine document du sous-domaine

**Domaines** → `redaction.app.wab-infos.com` → racine document, par ex. `~/redaction`.

Le panneau Node.js y écrit en général le bloc Passenger dans `~/redaction/.htaccess`. Sinon, copier le modèle :

`deploy/public_html/passenger-redaction.htaccess.example`

### 3. Build sur le serveur

```bash
cd ~/wab-infos
git pull origin main
npm install
npm run pwa:fcm --prefix apps/redaction

# Archive uploadée depuis le PC :
rm -rf apps/redaction/.next
tar -xzf redaction-next-build.tar.gz -C apps/redaction
test -f apps/redaction/.next/BUILD_ID && echo OK
```

> Si `npm install --workspace=apps/redaction` échoue (« No workspaces found »), rester à la racine `~/wab-infos` pour `npm install`, puis `npm install --prefix apps/redaction --include=dev`.

**Important (503)** : Passenger utilise le **nodevenv rédaction** (`~/nodevenv/wab-infos/apps/redaction/20/`). Sans `next` dedans, l’app crash au démarrage. Vérifier :

```bash
cd ~/wab-infos/apps/redaction
~/nodevenv/wab-infos/apps/redaction/20/bin/node -e "require('next'); console.log('OK')"
```

Si erreur → **N0C → Langues → Node.js → app rédaction → Installer module NPM**, puis Redémarrer.

### 4. Vérification

```bash
curl -sI https://redaction.app.wab-infos.com/login | head -1
# HTTP/2 200
```

Debug Passenger : voir `docs/depannage-nodejs-5000.md` (sections 4–5).

