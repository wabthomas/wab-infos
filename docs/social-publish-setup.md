# Guide complet — Tokens Facebook & X pour Wab-infos

Ce guide explique comment obtenir toutes les clés nécessaires pour la **publication automatique** des articles sur [facebook.com/wabinfos](https://facebook.com/wabinfos) et [@wabinfos](https://x.com/wabinfos) lorsqu’un article est publié sur le site.

---

## Vue d’ensemble

| Variable | Où la mettre | Description |
|----------|--------------|-------------|
| `FACEBOOK_PAGE_ID` | `apps/web/.env` | Identifiant numérique de la Page Facebook |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | `apps/web/.env` | Token de la Page (longue durée) |
| `X_API_KEY` | `apps/web/.env` | Clé API (Consumer Key) |
| `X_API_SECRET` | `apps/web/.env` | Secret API (Consumer Secret) |
| `X_ACCESS_TOKEN` | `apps/web/.env` | Token d’accès utilisateur |
| `X_ACCESS_TOKEN_SECRET` | `apps/web/.env` | Secret du token d’accès |
| `SOCIAL_PUBLISH_ENABLED` | `apps/web/.env` | `true` pour activer |
| `SOCIAL_SEND_ON_PUBLISH` | `apps/web/.env` + `apps/cms/.env` | `true` pour déclencher à la publication |
| `SOCIAL_SECRET` | optionnel | Par défaut = `REVALIDATION_SECRET` |

**Prérequis communs**

- Compte **administrateur** de la Page Facebook Wab-infos
- Compte **propriétaire** du compte X @wabinfos (ou accès avec droit de publier)
- Accès au serveur de production pour éditer les fichiers `.env`

---

# Partie 1 — Facebook (Meta)

## Ce dont vous avez besoin

- Permission **`pages_manage_posts`** — publier sur la Page
- Permission **`pages_read_engagement`** — recommandée par Meta
- Un **Page Access Token** longue durée (plusieurs mois)

## Étape 1 — Compte développeur Meta

1. Ouvrez [developers.facebook.com](https://developers.facebook.com/)
2. Connectez-vous avec le compte Facebook qui **administre** la Page Wab-infos
3. Menu **Paramètres du compte** → acceptez les conditions développeur si demandé

## Étape 2 — Créer une application

1. **Mes applications** → **Créer une application**
2. Type : **Autre** → cas d’usage **Entreprise** (ou « Gérer les pages »)
3. Nom : `Wab-infos Publication` (ou similaire)
4. E-mail de contact : `redaction@wab-infos.com`
5. Associez la **Page Wab-infos** à l’application si Meta le propose

> Si l’application est en mode **Développement**, seuls les administrateurs/testeurs peuvent l’utiliser. Pour la production, passez l’app en **Live** après vérification (souvent simple pour une Page que vous possédez).

## Étape 3 — Ajouter les produits utiles

Dans le tableau de bord de l’app :

1. **Ajouter un produit** → **Facebook Login** (facultatif mais utile)
2. Vérifiez que **Graph API** est disponible (inclus par défaut)

## Étape 4 — Trouver l’ID de la Page (`FACEBOOK_PAGE_ID`)

**Méthode A — Paramètres de la Page**

1. Sur Facebook, ouvrez [facebook.com/wabinfos](https://facebook.com/wabinfos)
2. **Paramètres de la Page** → **À propos** → **Identifiant de la Page** (nombre long, ex. `123456789012345`)

**Méthode B — Graph API Explorer**

1. Ouvrez [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Sélectionnez votre application
3. Requête : `GET /me/accounts`
4. Générez un token utilisateur (étape 5), exécutez la requête
5. Repérez `"name": "Wab-infos"` → le champ `"id"` est votre `FACEBOOK_PAGE_ID`

## Étape 5 — Token utilisateur temporaire (Graph API Explorer)

1. [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. **Application** : votre app Wab-infos
3. **Utilisateur ou Page** → **Get User Access Token**
4. Cochez les permissions :
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
5. **Generate Access Token** → connectez-vous et autorisez

## Étape 6 — Récupérer le Page Access Token

Dans Graph API Explorer, avec le token utilisateur :

```
GET /me/accounts
```

Réponse (extrait) :

```json
{
  "data": [
    {
      "id": "123456789012345",
      "name": "Wab-infos",
      "access_token": "EAAxxxx..."
    }
  ]
}
```

- `id` → `FACEBOOK_PAGE_ID`
- `access_token` → token de Page (souvent encore courte durée)

## Étape 7 — Convertir en token longue durée

Remplacez les valeurs dans cette URL (navigateur ou `curl`) :

```
https://graph.facebook.com/v21.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id=VOTRE_APP_ID&
  client_secret=VOTRE_APP_SECRET&
  fb_exchange_token=TOKEN_UTILISATEUR_COURT
```

- **APP_ID** et **APP_SECRET** : tableau de bord app → **Paramètres** → **De base**

La réponse contient un `access_token` utilisateur **longue durée** (~60 jours).

Refaites ensuite :

```
GET /me/accounts
```

avec ce token long : le `access_token` de la Page sera alors **longue durée** (ne expire pas tant que le mot de passe Facebook et les permissions restent valides).

→ Copiez ce token dans `FACEBOOK_PAGE_ACCESS_TOKEN`.

## Étape 8 — Tester la publication

```bash
curl -X POST "https://graph.facebook.com/v21.0/VOTRE_PAGE_ID/feed" \
  -d "message=Test publication Wab-infos" \
  -d "link=https://app.wab-infos.com" \
  -d "access_token=VOTRE_PAGE_ACCESS_TOKEN"
```

Succès : JSON avec `"id": "PAGE_ID_POST_ID"`. Vérifiez sur la Page Facebook.

## Dépannage Facebook

| Erreur | Solution |
|--------|----------|
| `(#200) Requires pages_manage_posts` | Regénérez le token avec cette permission |
| `Invalid OAuth access token` | Token expiré → refaire étapes 5–7 |
| App en mode Développement | Ajoutez des testeurs ou passez l’app en Live |
| Publication invisible | Vérifiez que le token est bien celui de la **Page**, pas de l’utilisateur |

---

# Partie 2 — X (Twitter)

## Ce dont vous avez besoin

- Projet développeur X avec droit **`tweet.write`**
- Les 4 clés **OAuth 1.0a** liées au compte @wabinfos

> **Important** : depuis 2023, l’API X est en grande partie **payante**. Le plan **Free** ne permet généralement **pas** de publier des tweets via l’API. Prévoyez au minimum le plan **Basic** (~100 $/mois au tarif affiché sur [developer.x.com](https://developer.x.com/)) ou un plan supérieur selon votre usage.

## Étape 1 — Compte développeur

1. Connectez-vous à [x.com](https://x.com) avec **@wabinfos**
2. Ouvrez [developer.x.com](https://developer.x.com/)
3. **Sign up** / **Developer Portal** → acceptez les conditions
4. Décrivez l’usage : *« Publication automatique des liens d’articles de notre site d’actualités wab-infos.com »*

## Étape 2 — Créer un projet et une application

1. **Projects & Apps** → **+ Add Project**
2. Nom du projet : `Wab-infos Auto-publish`
3. Cas d’usage : **Making a bot** ou **Exploring the API**
4. Créez une **App** dans ce projet (ex. `wab-infos-publisher`)

## Étape 3 — Choisir le bon plan API

1. Dans le portail, section **Products** / **X API**
2. Souscrivez au plan qui inclut **POST /2/tweets** (écriture)
3. Vérifiez les limites (tweets / mois) selon votre volume d’articles

Sans `tweet.write`, la publication automatique **échouera** avec une erreur 403.

## Étape 4 — Permissions de l’application

Dans les paramètres de l’app :

1. **User authentication settings** → **Set up** (si pas encore fait)
2. Type d’app : **Web App** ou **Automated App / Bot**
3. Permissions : **Read and write** (lecture et écriture)
4. **Callback URL** : `https://app.wab-infos.com` (obligatoire même si vous n’utilisez pas OAuth interactif)
5. Enregistrez

## Étape 5 — Récupérer API Key et Secret

1. App → **Keys and tokens**
2. Section **Consumer Keys** :
   - **API Key** (aussi appelée *Consumer Key*) → `X_API_KEY`
   - **API Key Secret** (*Consumer Secret*) → `X_API_SECRET`

Cliquez **Regenerate** uniquement si nécessaire (cela invalide les anciennes clés).

## Étape 6 — Générer Access Token et Secret

Toujours dans **Keys and tokens**, section **Authentication Tokens** :

1. **Access Token and Secret** → **Generate**
2. Connectez-vous si demandé avec le compte **@wabinfos**
3. Copiez immédiatement (le secret ne sera plus affiché) :
   - **Access Token** → `X_ACCESS_TOKEN`
   - **Access Token Secret** → `X_ACCESS_TOKEN_SECRET`

Vérifiez que le compte affiché est bien **@wabinfos** et que les permissions incluent **Read and write**.

## Étape 7 — Tester la publication

```bash
curl -X POST "https://api.twitter.com/2/tweets" \
  -H "Authorization: Bearer VOTRE_BEARER_OU_OAUTH" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test publication Wab-infos https://app.wab-infos.com"}'
```

Avec OAuth 1.0a, utilisez plutôt le test intégré Wab-infos (section 4) ou un outil comme [Postman](https://www.postman.com/) configuré en OAuth 1.0a.

Succès : `"data": { "id": "...", "text": "..." }`.

## Alternative : Bearer Token OAuth 2.0 (`X_BEARER_TOKEN`)

Wab-infos accepte aussi un **Bearer Token** utilisateur (OAuth 2.0) à la place des 4 clés OAuth 1.0a :

```env
X_BEARER_TOKEN=...
```

Pour l’obtenir, il faut un flux OAuth 2.0 PKCE (plus complexe). **Recommandation** : utilisez les 4 clés OAuth 1.0a générées directement dans le portail (étape 6) — c’est le plus simple pour un serveur.

## Dépannage X

| Erreur | Solution |
|--------|----------|
| `403 Forbidden` | Plan API sans `tweet.write` → upgrade |
| `401 Unauthorized` | Clés incorrectes ou régénérées → mettre à jour `.env` |
| `429 Too Many Requests` | Limite mensuelle atteinte |
| Tweet du mauvais compte | Régénérez les tokens connectés à @wabinfos |

---

# Partie 3 — Configuration Wab-infos

## Fichier `apps/web/.env` (production)

```env
SOCIAL_PUBLISH_ENABLED=true
SOCIAL_SEND_ON_PUBLISH=true

FACEBOOK_PAGE_ID=123456789012345
FACEBOOK_PAGE_ACCESS_TOKEN=EAAxxxxxxxx...

X_API_KEY=xxxxxxxxxxxxxxxxxx
X_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
X_ACCESS_TOKEN=1234567890-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
X_ACCESS_TOKEN_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Fichier `apps/cms/.env` (production)

```env
SOCIAL_SEND_ON_PUBLISH=true
NEXT_PUBLIC_SITE_URL=https://app.wab-infos.com
REVALIDATION_SECRET=meme-secret-que-le-site
```

## Redémarrage

1. **Redémarrer Strapi** (nouveaux champs `facebookPostedAt` / `xPostedAt` si pas encore fait)
2. **Redémarrer l’app Next.js** (ou redéployer le build)
3. Ne commitez **jamais** les tokens dans Git

---

# Partie 4 — Test depuis Wab-infos

Publiez un **nouvel** article test (ou republiez un article récent de moins de 48 h sans `facebookPostedAt` / `xPostedAt`).

**Test manuel de l’API** :

```bash
curl -X POST "https://app.wab-infos.com/api/social/publish-article" \
  -H "Content-Type: application/json" \
  -H "x-social-secret: VOTRE_REVALIDATION_SECRET" \
  -d "{\"slug\":\"slug-de-votre-article\"}"
```

Réponse attendue :

```json
{
  "ok": true,
  "facebook": { "ok": true, "postId": "..." },
  "x": { "ok": true, "tweetId": "..." }
}
```

Si une plateforme est déjà publiée, vous verrez `"skipped": true` pour éviter les doublons.

---

# Partie 5 — Sécurité et maintenance

## Bonnes pratiques

- Stockez les tokens **uniquement** dans les `.env` serveur
- Limitez l’accès au compte Meta et @wabinfos (2FA activée)
- Ne partagez pas les tokens par e-mail ou messagerie non chiffrée
- Créez un **rôle développeur** dédié plutôt que d’utiliser un compte personnel si possible

## Renouvellement

| Token | Durée typique | Action |
|-------|---------------|--------|
| Facebook Page Token (long) | Ne expire pas* | Régénérer si mot de passe changé ou permissions révoquées |
| Facebook User Token | ~60 jours | Refaire échange longue durée si vous utilisez le user token |
| X OAuth 1.0a | Permanent* | Régénérer si compromis ou clés régénérées dans le portail |

\* Sous réserve des politiques Meta/X actuelles.

## Vérifier qu’un article a été publié

Dans Strapi → **Content Manager** → **Article** : champs **facebookPostedAt** et **xPostedAt** renseignés après succès.

---

# Résumé rapide (checklist)

### Facebook
- [ ] App Meta créée et liée à la Page
- [ ] Permissions `pages_manage_posts` + `pages_read_engagement`
- [ ] `FACEBOOK_PAGE_ID` récupéré
- [ ] Page Access Token longue durée
- [ ] Test `curl` sur `/feed` OK

### X
- [ ] Compte développeur @wabinfos
- [ ] Plan API avec **tweet.write**
- [ ] App en **Read and write**
- [ ] 4 clés OAuth 1.0a copiées
- [ ] Test tweet OK

### Wab-infos
- [ ] Variables dans `apps/web/.env`
- [ ] `SOCIAL_SEND_ON_PUBLISH=true` dans `apps/cms/.env`
- [ ] Strapi + Next.js redémarrés
- [ ] Test `POST /api/social/publish-article` OK

---

**Liens officiels**

- [Meta for Developers](https://developers.facebook.com/)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Documentation Graph API — Page Feed](https://developers.facebook.com/docs/graph-api/reference/page/feed/)
- [X Developer Portal](https://developer.x.com/)
- [X API — POST /2/tweets](https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets)
