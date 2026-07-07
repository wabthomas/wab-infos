# Erreur 5000 — Node.js PlanetHoster / N0C

L’erreur **5000** au redémarrage ou à la création signifie : **l’application ne démarre pas** (Passenger n’arrive pas à lancer `server.js`).

Causes les plus fréquentes pour Wab-infos :

---

## 1. Build `.next` absent sur le serveur

```bash
ls -la ~/wab-infos/apps/web/.next/BUILD_ID
```

Si le fichier n’existe pas :

```bash
cd ~/wab-infos
rm -rf apps/web/.next
tar -xzf web-next-build.tar.gz -C apps/web
```

Le build se fait **en local** (PC), pas sur le serveur mutualisé.

---

## 2. `node_modules` manquant (monorepo)

L’app Node pointe vers `wab-infos/apps/web`, mais les dépendances s’installent à la **racine** :

```bash
cd ~/wab-infos
npm install
npm install --workspace=apps/web --include=optional
```

Dans le panneau Node.js : bouton **« Installer module NPM »** sur l’app web (une fois).

---

## 3. Fichier `.env` manquant

```bash
ls ~/wab-infos/apps/web/.env.local
ls ~/wab-infos/.env
```

Minimum dans `apps/web/.env.local` :

```env
NEXT_PUBLIC_SITE_URL=https://wab-infos.com
NEXT_PUBLIC_STRAPI_URL=https://cms.app.wab-infos.com
STRAPI_URL=https://cms.app.wab-infos.com
```

---

## 4. Tester en SSH (voir l’erreur exacte)

```bash
cd ~/wab-infos/apps/web
NODE_ENV=production node server.js
```

Messages fréquents :

| Message | Solution |
|---------|----------|
| `Could not find a production build` | Extraire `web-next-build.tar.gz` |
| `Cannot find module 'next'` | `npm install` à la racine du monorepo |
| `Cannot find module '@wab-infos/shared'` | `npm install` à la racine |

Ctrl+C pour arrêter le test.

---

## 5. Mode debug Passenger (page d’erreur détaillée)

Éditer **`~/app/.htaccess`** (pas dans `apps/web`) — après le bloc Passenger :

```apache
PassengerFriendlyErrorPages on
PassengerAppEnv development
```

Recharger le site → la vraie erreur s’affiche dans le navigateur.

**Remettre en prod après correction :**

```apache
PassengerFriendlyErrorPages off
PassengerAppEnv production
```

Doc PlanetHoster : [Debugging Node.js](https://kb.n0c.com/en/knowledge-base/debugging-a-nodejs-ruby-or-python-application-with-n0c/)

---

## 6. Erreur 5300 vs 5000

| Code | Signification |
|------|----------------|
| **5300** | Domaine mal configuré (`app.wab-infos.com` / `~/app`) |
| **5000** | App créée mais **crash au démarrage** |

---

## Checklist rapide

```bash
cd ~/wab-infos
test -f apps/web/.next/BUILD_ID && echo "OK build" || echo "MANQUE .next"
test -d node_modules/next && echo "OK next" || echo "MANQUE npm install"
cd apps/web && NODE_ENV=production timeout 5 node server.js
```

Puis **Restart** dans le panneau Node.js.
