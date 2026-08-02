import { NextResponse } from 'next/server';

/** Endpoint dédié pour forcer un vrai HTTP 404 (workaround Next soft-404 sur [category]/[slug]). */
export function GET() {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="robots" content="noindex, nofollow"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Page non trouvée — Wab-infos</title>
  <style>
    body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#fafafa;color:#111}
    main{text-align:center;padding:2rem}
    a{color:#c41e3a;font-weight:600}
  </style>
</head>
<body>
  <main>
    <p style="letter-spacing:.12em;text-transform:uppercase;font-size:.75rem;opacity:.6">404</p>
    <h1>Page non trouvée</h1>
    <p>Cet article n’existe pas, a été déplacé, ou n’est plus publié.</p>
    <p><a href="/">Retour à l’accueil</a> · <a href="/recherche">Rechercher</a></p>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'private, no-store',
    },
  });
}
