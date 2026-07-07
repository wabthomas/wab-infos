# Prompt à donner à Cursor

Copie-colle le texte ci-dessous tel quel dans Cursor (chat / agent mode) à la racine du projet `wab-infos`.

---

## PROMPT

Corrige un bug SEO critique dans ce projet Next.js (monorepo, app `apps/web`).

**Contexte du bug** : le site a récemment migré de WordPress vers Next.js, avec un
changement complet de structure d'URLs (ex: `/rdc-mon-article/` → `/politique/mon-article`).
Les redirections censées transférer l'ancien contenu vers les nouvelles URLs utilisent
actuellement la fonction `redirect()` de `next/navigation`, qui renvoie un code HTTP
**307 (temporaire)**. Or, ce sont de vraies redirections **permanentes** : Google ne
transfère jamais l'autorité SEO (ancienneté, backlinks) d'une redirection temporaire,
ce qui empêche les articles du site d'être bien indexés/positionnés sur Google.

**Correctif à appliquer** : remplacer `redirect()` par `permanentRedirect()` (même
module `next/navigation`, disponible nativement depuis Next.js 14+) à chaque endroit
où la redirection correspond à un déplacement définitif d'URL — PAS pour les
redirections réellement temporaires (comme vers un espace d'administration externe).

### Fichiers à corriger

1. **`apps/web/src/app/[category]/[slug]/page.tsx`**
   - Dans l'import : remplacer `import { notFound, redirect } from 'next/navigation';`
     par `import { notFound, permanentRedirect } from 'next/navigation';`
   - Dans le corps de `ArticlePage`, remplacer l'appel
     `redirect(\`/${articleCategorySlug}/${slug}\`);`
     par `permanentRedirect(\`/${articleCategorySlug}/${slug}\`);`
   - Ce cas gère la redirection d'un article vers sa catégorie canonique correcte.

2. **`apps/web/src/app/[category]/page.tsx`**
   - Dans l'import : remplacer `import { notFound, redirect } from 'next/navigation';`
     par `import { notFound, permanentRedirect } from 'next/navigation';`
   - Dans le corps de `CategoryPage`, remplacer l'appel `redirect(legacyPath);`
     par `permanentRedirect(legacyPath);`
   - Ce cas gère la redirection des anciens permaliens WordPress
     (`/{slug}` à la racine) vers le nouveau format (`/{rubrique}/{slug}`).

### Fichiers à NE PAS modifier (redirections volontairement temporaires, ne pas toucher)

- `apps/web/src/app/connexion/page.tsx` (redirection vers le CMS, correcte en l'état)
- `apps/web/next.config.ts`, bloc `redirects()` pour `/redaction` (correct, `permanent: false` est voulu)
- `apps/web/src/middleware.ts` (utilise déjà `NextResponse.redirect(..., 301)`, déjà correct — ne rien changer ici)

### Après le correctif

1. Vérifie que le projet compile sans erreur TypeScript (`npm run build` dans `apps/web`
   si possible, sinon au minimum vérifie les types avec `tsc --noEmit`).
2. Ajoute un commentaire bref au-dessus de chaque `permanentRedirect(...)` expliquant
   pourquoi un statut permanent est nécessaire ici (transfert de l'autorité SEO vers
   la nouvelle URL).
3. Fais un commit avec le message :
   `fix(seo): use permanentRedirect (308) instead of redirect (307) for legacy URL redirects`
4. Ne modifie aucun autre fichier ni comportement fonctionnel du site.

---

## Après l'intervention de Cursor

Une fois le correctif appliqué et déployé en production, va dans Google Search Console :
1. **Inspection d'URL** → teste 2-3 anciennes URLs (ex: un ancien permalien WordPress
   du type `/mon-ancien-article/`) → vérifie que le statut de redirection est bien 308
   et non plus 307.
2. Redemande l'indexation des articles concernés.
3. Vérifie dans quelques jours/semaines l'évolution du nombre de "Pages indexées"
   dans le rapport de couverture.
