import fs from 'node:fs';

// 1) Shell RH : plus de bandeau sombre ni d'onglets horizontaux sur mobile.
{
  const file = 'apps/redaction/src/components/redaction/rh/rh-section-shell.tsx';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace(
    /<header className=\{`relative overflow-hidden rounded-\[1\.75rem\] bg-\[#191923\][^`]*`\}>/,
    '<header className={`relative hidden overflow-hidden rounded-[1.75rem] bg-[#191923] px-5 py-6 text-white shadow-sm sm:px-8 sm:py-7 lg:block`}>',
  );
  text = text.replace(
    /className=\{`lg:sticky lg:top-4 lg:w-56 lg:shrink-0 \$\{\(pathname === '\/mon-rh\/chat'\) \? 'hidden lg:block' : ''\} \$\{\(pathname === '\/mon-rh\/retraits' \|\| pathname === '\/mon-rh\/remunerations'\) \? 'order-2 lg:order-none' : ''\}`\}/,
    "className={`hidden lg:sticky lg:top-4 lg:block lg:w-56 lg:shrink-0 ${(pathname === '/mon-rh/chat') ? 'hidden lg:block' : ''} ${(pathname === '/mon-rh/retraits' || pathname === '/mon-rh/remunerations') ? 'order-2 lg:order-none' : ''}`}",
  );
  fs.writeFileSync(file, text, 'utf8');
  console.log('SHELL', text.includes('relative hidden overflow-hidden') && text.includes('className={`hidden lg:sticky') ? 'OK' : 'MISS');
}

// 2) Header mobile : titres RH à la place du nom répété ; Profil sans topbar mobile.
{
  const file = 'apps/redaction/src/components/redaction/redaction-shell.tsx';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes('RH_MOBILE_TITLES')) {
    const map = `const RH_MOBILE_TITLES: Record<string, string> = {
  '/rh': 'Ressources humaines',
  '/rh/equipe': 'Collaborateurs',
  '/rh/prestations': 'Prestations',
  '/rh/presence': 'Présence',
  '/rh/conges': 'Congés et absences',
  '/rh/remunerations': 'Rémunérations',
  '/rh/paiements-anciens': 'Paiements historiques',
  '/rh/retraits': 'Retraits',
  '/rh/documents': 'Documents',
  '/rh/medias': 'Bibliothèque des médias',
  '/rh/contrats': 'Contrats',
  '/rh/correspondance': 'Correspondance RH',
  '/rh/contestations': 'Contestations',
  '/rh/rapports': 'Rapports',
  '/rh/parametres': 'Paramètres RH',
  '/rh/plus': 'Plus',
  '/mon-rh': 'Mon espace RH',
  '/mon-rh/conges': 'Mes congés',
  '/mon-rh/prestations': 'Mes prestations',
  '/mon-rh/presence': 'Ma présence',
  '/mon-rh/fiche': 'Ma fiche',
  '/mon-rh/carte-service': 'Ma carte de service',
  '/mon-rh/chat': 'Chat RH',
  '/mon-rh/remunerations': 'Mes rémunérations',
  '/mon-rh/paiements-anciens': 'Anciens paiements',
  '/mon-rh/retraits': 'Mes retraits',
  '/mon-rh/contrats': 'Mes contrats',
  '/mon-rh/documents': 'Mes documents',
  '/mon-rh/contestations': 'Mes contestations',
  '/mon-rh/notifications': 'Mes notifications',
  '/mon-rh/parametres': 'Paramètres',
  '/mon-rh/plus': 'Plus',
};

`;
    text = text.replace('const MOBILE_NAV: NavItem[] = [', map + 'const MOBILE_NAV: NavItem[] = [');
    text = text.replace(
      "const inChat = pathname === '/mon-rh/chat';",
      "const inChat = pathname === '/mon-rh/chat';\n  const inProfile = pathname === '/profil';\n  const rhMobileTitle = RH_MOBILE_TITLES[pathname] ?? (inMyRh ? 'Mon espace RH' : inRh ? 'Ressources humaines' : authorName ?? 'Wab-infos');",
    );
    // Cacher la topbar mobile sur Profil : le nouveau bandeau devient le haut de page.
    text = text.replace(
      "inChat && chatConversation && 'hidden')}",
      "inChat && chatConversation && 'hidden', inProfile && 'hidden')}",
    );
    // Titre de section au lieu du nom d'auteur répété.
    text = text.replace(
      "<p className=\"text-[10px] font-bold uppercase tracking-[0.16em] text-primary\">\n                  {inRh || inMyRh ? 'Espace RH' : 'Rédaction'}\n                </p>\n                <p className=\"truncate font-display text-sm font-bold\">{authorName ?? 'Wab-infos'}</p>",
      "<p className=\"text-[10px] font-bold uppercase tracking-[0.16em] text-primary\">\n                  {inRh || inMyRh ? 'Espace RH' : 'Rédaction'}\n                </p>\n                <p className=\"truncate font-display text-sm font-bold\">{inRh || inMyRh ? rhMobileTitle : authorName ?? 'Wab-infos'}</p>",
    );
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log('TOPBAR', text.includes('rhMobileTitle') && text.includes('inProfile &&') ? 'OK' : 'MISS');
}

// 3) Profil : le hero occupe le haut de page, avec la safe-area.
{
  const file = 'apps/redaction/src/app/(editor)/profil/page.tsx';
  let text = fs.readFileSync(file, 'utf8');
  text = text.replace('className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-[#c41e3a] via-[#9e172e] to-[#1d3557] px-5 pt-6 pb-20 text-white shadow-lg"', 'className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-[#c41e3a] via-[#9e172e] to-[#1d3557] px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-20 text-white shadow-lg"');
  fs.writeFileSync(file, text, 'utf8');
  console.log('PROFILE', text.includes('safe-area-inset-top') ? 'OK' : 'MISS');
}
