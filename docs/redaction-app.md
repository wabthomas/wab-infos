# Application rédaction mobile — Wab-infos

Interface mobile-first pour les journalistes (~10 comptes) : rédaction, publication, flash info et statistiques.

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
```

Le token doit permettre : articles (CRUD), auteurs, catégories, upload.

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

1. Ouvrir `https://app.wab-infos.com/redaction/login` dans Chrome/Safari
2. **Ajouter à l’écran d’accueil**
3. L’app s’ouvre en plein écran

## Fonctionnalités MVP

| Fonction | Description |
|----------|-------------|
| Rédaction | Titre, chapô, contenu, rubrique, image à la une |
| Brouillon / Publier | Enregistrement ou publication directe |
| Flash info | Toggle `isBreaking` |
| Stats | Vues cumulées, top articles, brouillons |
| Mes articles | Liste filtrée par statut |

## Phase 2 (prévue)

- Modération des commentaires
- Notifications push
- Planification de publication

## Développement local

```bash
npm run dev:web
npm run dev:cms
```

Créer un utilisateur test dans Strapi admin, puis :

`http://localhost:3000/redaction/login`
