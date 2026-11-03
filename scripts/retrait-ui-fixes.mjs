import fs from 'node:fs';

function edit(file, steps) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to, label] of steps) {
    const before = text;
    text = text.replace(from, to);
    console.log(label, text === before ? 'MISS' : 'OK');
  }
  fs.writeFileSync(file, text, 'utf8');
}

// 1) PayoutMethods: bouton "Retirer de l'argent" en haut de la section.
edit('apps/redaction/src/components/redaction/rh/payout-methods.tsx', [
  [
    /  return \(\n    <div className="space-y-4">\n/,
    `  return (
    <div className="space-y-4">
      <button type="button" onClick={() => window.dispatchEvent(new Event('rh-open-withdraw'))} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground sm:w-auto">Retirer de l'argent</button>
`,
    'PAYOUT_BUTTON',
  ],
]);

// 2) MyWithdrawals: retirer l'ancien bouton, ajouter l'écoute d'événement,
//    supprimer le commentaire, renforcer le viewport clavier.
edit('apps/redaction/src/components/redaction/rh/my-withdrawals.tsx', [
  [
    /\n        <div className="mt-5 flex flex-wrap items-center gap-2">[\s\S]*?Aucun transfert automatique[\s\S]*?<\/div>/,
    '',
    'REMOVE_OLD_CTA',
  ],
  [
    /<p className="mt-1 text-sm text-muted-foreground">Chaque demande[\s\S]*?<\/p>\s*/,
    '',
    'REMOVE_HISTORY_COMMENT',
  ],
  [
    /  const \[keyboardViewport, setKeyboardViewport\] = useState<\{ top: number; height: number \} \| null>\(null\);\r?\n  useEffect\(\(\) => \{[\s\S]*?\}, \[requestOpen\]\);/,
    `  const [viewportBox, setViewportBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    if (!requestOpen) { setViewportBox(null); return; }
    const visual = window.visualViewport;
    const update = () => {
      setViewportBox({ top: visual?.offsetTop ?? 0, height: visual?.height ?? window.innerHeight });
    };
    update();
    window.addEventListener('resize', update);
    visual?.addEventListener('resize', update);
    visual?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      visual?.removeEventListener('resize', update);
      visual?.removeEventListener('scroll', update);
    };
  }, [requestOpen]);
  useEffect(() => {
    const open = () => setRequestOpen(true);
    window.addEventListener('rh-open-withdraw', open);
    return () => window.removeEventListener('rh-open-withdraw', open);
  }, []);`,
    'VIEWPORT_AND_EVENT',
  ],
  [
    /className="fixed inset-0 z-\[90\] flex items-end justify-center overflow-y-auto bg-black\/55 p-0 sm:items-center sm:p-4" style=\{keyboardViewport \? \{ top: keyboardViewport\.top, height: keyboardViewport\.height, bottom: 'auto' \} : undefined\}/,
    `className="fixed inset-x-0 top-0 z-[90] flex items-end justify-center overflow-hidden bg-black/55 p-0 sm:items-center sm:p-4" style={viewportBox ? { top: viewportBox.top, height: viewportBox.height, bottom: 'auto' } : { top: 0, height: '100dvh' }}`,
    'OVERLAY_STYLE',
  ],
  [
    /className="relative max-h-full w-full max-w-xl/,
    'className="relative max-h-full w-full max-w-xl overscroll-contain',
    'FORM_OVERSCROLL',
  ],
]);

// 3) RecordSheets: retirer le commentaire PDF A4.
edit('apps/redaction/src/components/redaction/rh/record-sheets.tsx', [
  [
    /<p className="text-xs text-muted-foreground">PDF A4[\s\S]*?<\/p>\s*/,
    '',
    'REMOVE_PDF_COMMENT',
  ],
]);
