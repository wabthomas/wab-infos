# Déploiement SSH depuis Windows (N0C / PlanetHoster)

Déployer le site et les apps Node.js depuis votre PC (Cursor / PowerShell) sans FTP.

## 1. Clé SSH (une fois)

La clé dédiée est **`~/.ssh/wab-infos-noc`** (privée) et **`wab-infos-noc.pub`** (publique).

Si elle n’existe pas encore :

```powershell
npm run deploy:setup
```

Ou manuellement :

```powershell
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\wab-infos-noc -C "wab-infos-deploy@noc" -N '""'
```

> Vous pouvez ajouter une passphrase plus tard : `ssh-keygen -p -f $env:USERPROFILE\.ssh\wab-infos-noc`

## 2. Enregistrer la clé sur N0C

1. Panneau **N0C** → **SSH** / **Clés SSH** (ou **Gestion des clés SSH**)
2. Coller le contenu de `wab-infos-noc.pub` (une seule ligne)
3. Enregistrer

Le script `deploy:setup` copie la clé publique dans le presse-papiers.

## 3. Configurer la connexion

### `~/.ssh/config`

Éditer le bloc `Host wab-noc` (créé par `deploy:setup`) :

```
Host wab-noc
  HostName ssh.VOTRE-SERVEUR.n0c.com
  User VOTRE_USER_CPANEL
  Port 5022
  IdentityFile ~/.ssh/wab-infos-noc
  IdentitiesOnly yes
```

`HostName` et `User` : panneau N0C → **Informations du compte** / **Accès SSH**.

### `deploy/.env.deploy`

```powershell
copy deploy\.env.deploy.example deploy\.env.deploy
```

Adapter si besoin :

```env
DEPLOY_SSH_HOST=wab-noc
DEPLOY_REMOTE_PATH=~/wab-infos
```

## 4. Tester

```powershell
npm run ssh:noc
```

Vous devez arriver en shell sur le serveur sans mot de passe.

## 5. Commandes de déploiement

| Commande | Action |
|----------|--------|
| `npm run deploy:web` | Build → upload → extraction → redémarrage Passenger (web) |
| `npm run deploy:redaction` | Build → upload → extraction → `noc-npm-install` → restart |
| `npm run deploy:cms` | Pack Strapi → upload → extraction → restart |
| `npm run deploy:all` | Web + rédaction |
| `npm run deploy:remote:server` | `deploy-server.sh` sur le serveur (git pull, etc.) |
| `npm run remote -- "commande"` | Commande SSH arbitraire |

**Pas besoin** de décompresser ni redémarrer à la main : tout est fait en SSH. Le redémarrage utilise `touch apps/…/tmp/restart.txt` (Passenger). En cas de 503, utilisez le bouton **Redémarrer** dans N0C en secours.

## 6. Exemples utiles

```powershell
# Git pull + script complet sur le serveur
npm run deploy:server

# Une commande ponctuelle
npm run remote -- "cd ~/wab-infos && git status"

# Réinstaller les modules Node rédaction sur N0C
npm run remote -- "cd ~/wab-infos && bash scripts/noc-npm-install.sh redaction"

# Upload manuel d’un fichier
powershell -File scripts/deploy-remote.ps1 upload -- web-next-build.tar.gz
```

## Sécurité

- Ne commitez **jamais** la clé privée ni `deploy/.env.deploy`
- Cette clé ne donne accès qu’au compte hébergement où vous l’avez enregistrée
- Préférez une clé dédiée au déploiement (pas votre clé GitHub personnelle)

## Dépannage

| Problème | Piste |
|----------|--------|
| `Permission denied (publickey)` | Clé publique non ajoutée dans N0C, ou mauvais `User` dans `~/.ssh/config` |
| `Host key verification failed` | `ssh wab-noc` une fois et accepter l’empreinte |
| Build OK mais 503 en prod | Attendre 30 s après deploy ; sinon N0C → Langues → Node.js → Redémarrer |
| Changements invisibles après deploy | Vider cache Cloudflare ; vérifier `apps/web/.next/BUILD_ID` en SSH |
| npm / Node introuvable en SSH | Voir [depannage-noc-npm.md](./depannage-noc-npm.md) |
