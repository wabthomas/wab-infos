# Configuration Strapi — Wab-infos

## 1. Créer le compte administrateur

1. Démarrez le CMS : `npm run dev:cms` (ou `npm run dev`)
2. Ouvrez http://localhost:8090/admin
3. Créez votre compte admin (première visite uniquement)

## 2. Activer l'API publique (obligatoire)

Le frontend Next.js lit les contenus via l'API REST. Sans cette étape, seules les données de démonstration s'affichent.

1. Admin Strapi → **Settings** (engrenage)
2. **Users & Permissions plugin** → **Roles**
3. Cliquez sur **Public**
4. Cochez **find** et **findOne** pour :
   - Article
   - Category
   - Tag
   - Author
   - Video
   - Show
5. **Save**

## 3. Vérifier la connexion

```powershell
curl http://localhost:8090/api/articles
```

Vous devez recevoir un JSON avec les articles (pas une erreur 403).

## 4. Contenu de démonstration

Au premier démarrage, Strapi crée automatiquement :
- 9 rubriques éditoriales
- 3 articles de démonstration
- 1 auteur « Rédaction Wab-infos »

## 5. Import WordPress (5000+ articles)

```powershell
# Placer l'export XML dans data/wordpress-export.xml
npm run import:wordpress
```

## 6. Token API (optionnel)

Pour les opérations serveur avancées, créez un token dans **Settings → API Tokens** et ajoutez-le dans `apps/web/.env.local` :

```
STRAPI_API_TOKEN=votre-token
```
