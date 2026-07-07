# npm ne fonctionne pas sur N0C / PlanetHoster

Sur l’hébergement mutualisé, **`npm` n’est pas dans le PATH SSH** par défaut. Le bouton **« Installer module NPM »** du panneau installe seulement dans `apps/redaction` (ou `apps/web`) **sans** le monorepo racine — `next`, `sharp` et `@wab-infos/shared` restent souvent manquants.

---

## 1. Diagnostic (SSH)

```bash
cd ~/wab-infos
bash scripts/noc-npm-install.sh --check
```

Le script liste le `npm` du **nodevenv** CloudLinux et teste si `next` / `sharp` sont chargeables.

---

## 2. Installation correcte (SSH)

```bash
cd ~/wab-infos
bash scripts/noc-npm-install.sh redaction
```

Équivalent manuel si le script échoue encore :

```bash
# Trouver npm (adapter le chemin affiché dans N0C → Langues → Node.js)
ls -la ~/nodevenv/wab-infos/apps/redaction/20/bin/npm

export PATH="$HOME/nodevenv/wab-infos/apps/redaction/20/bin:$PATH"
node -v && npm -v

cd ~/wab-infos
npm install --include=dev
npm install --prefix apps/redaction --include=dev
```

Puis **N0C → Langues → Node.js → app rédaction → Redémarrer**.

---

## 3. Pourquoi le bouton N0C ne suffit pas

| Ce que fait N0C | Ce qu’il faut pour Wab-infos |
|-----------------|------------------------------|
| `npm install` dans `apps/redaction` seul | `npm install` à la **racine** `~/wab-infos` (workspaces) |
| nodevenv isolé | `server.js` charge aussi `~/wab-infos/node_modules` (voir `scripts/setup-monorepo-node-path.cjs`) |
| Pas de build `.next` | Archive `redaction-next-build.tar.gz` uploadée depuis le PC |

---

## 4. Erreurs fréquentes

| Symptôme | Cause | Action |
|----------|-------|--------|
| `npm: command not found` | PATH SSH | `export PATH="$HOME/nodevenv/.../20/bin:$PATH"` |
| `Cannot find module 'next'` | Pas d’install racine | `npm install` dans `~/wab-infos` |
| `Cannot find module 'sharp'` | Binaire Linux manquant | `npm install --prefix apps/redaction` **sur le serveur** |
| Erreur **5000** au redémarrage N0C | Crash `server.js` | `cd apps/redaction && node server.js` pour voir l’erreur |
| Upload photo `Internal Server Error` | `sharp` absent en prod | `noc-npm-install.sh redaction` puis redémarrer |

---

## 5. Vérification rapide

```bash
cd ~/wab-infos/apps/redaction
~/nodevenv/wab-infos/apps/redaction/20/bin/node -e "
  require('../../scripts/setup-monorepo-node-path.cjs').setupMonorepoNodePath(process.cwd());
  require('next');
  require('sharp');
  console.log('OK');
"
test -f .next/BUILD_ID && echo "OK build"
```

---

## 6. Si nodevenv n’existe pas

1. **N0C → Langues → Node.js → Créer une application**
2. Racine : `/home/VOTRE_USER/wab-infos/apps/redaction`
3. Fichier de démarrage : `server.js`
4. Node **20**
5. **Créer** puis **Installer module NPM** (crée le dossier `~/nodevenv/...`)
6. Relancer `bash scripts/noc-npm-install.sh redaction`

Doc associée : [depannage-nodejs-5000.md](./depannage-nodejs-5000.md), [redaction-app.md](./redaction-app.md#déploiement-planethoster-n0c).
