import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/contracts-workspace.tsx';
let text = fs.readFileSync(file, 'utf8');

// 1) Cause du bouton « Transmettre » inactif : snapshot sans displayOptions → mismatch permanent.
text = text.replace(
  "signatureDate:item.signatureDate || null }));",
  "signatureDate:item.signatureDate || null,displayOptions:{ ...DEFAULT_CONTRACT_DISPLAY, ...(item.displayOptions ?? {}) } }));",
);

// 2) État d'aperçu automatique.
text = text.replace(
  "  const [previewStatus, setPreviewStatus] = useState('Sélectionnez un collaborateur et saisissez le corps du contrat.');",
  `  const [previewStatus, setPreviewStatus] = useState('Sélectionnez un collaborateur et saisissez le corps du contrat.');
  const [autoPreview, setAutoPreview] = useState(true);
  const [previewNonce, setPreviewNonce] = useState(0);
  const previewNonceRef = useRef(0);
  useEffect(() => {
    try { if (localStorage.getItem('rh-contract-auto-preview') === '0') setAutoPreview(false); } catch { /* stockage indisponible */ }
  }, []);`,
);

// 3) Effet d'aperçu : forcer uniquement sur demande quand l'automatique est désactivé.
text = text.replace(
  "  useEffect(() => {\n    let active = true;\n    setPreviewPdf(null);",
  `  useEffect(() => {
    let active = true;
    const forced = previewNonce !== previewNonceRef.current;
    previewNonceRef.current = previewNonce;
    if (selected && selected.status === 'draft' && !autoPreview && !forced) {
      setPreviewStatus('Aperçu automatique désactivé — cliquez sur « Actualiser l’aperçu ».');
      return () => { active = false; };
    }
    setPreviewPdf(null);`,
);
text = text.replace(
  "clauses, birthPlace, signaturePlace, signatureDate, authorized, displayOptions, parties?.birthDate, parties?.address, parties?.phone, profileLoading, settings, sign, seal, signature, logo]);",
  "clauses, birthPlace, signaturePlace, signatureDate, authorized, displayOptions, parties?.birthDate, parties?.address, parties?.phone, profileLoading, settings, sign, seal, signature, logo, autoPreview, previewNonce]);",
);

// 4) Contrôle dans le panneau aperçu.
text = text.replace(
  "        <ContractPdfPreview bytes={previewPdf} status={previewStatus} />",
  `        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2 text-sm">
          <label className="inline-flex items-center gap-2 font-medium">
            <input type="checkbox" checked={autoPreview} onChange={event => { const next = event.target.checked; setAutoPreview(next); try { localStorage.setItem('rh-contract-auto-preview', next ? '1' : '0'); } catch { /* stockage indisponible */ } }} />
            Aperçu automatique
          </label>
          {!autoPreview && <button type="button" className="rounded-lg border px-3 py-1.5 text-xs font-semibold" onClick={() => setPreviewNonce(n => n + 1)}>Actualiser l’aperçu</button>}
        </div>
        <ContractPdfPreview bytes={previewPdf} status={previewStatus} />`,
);
fs.writeFileSync(file, text, 'utf8');
console.log('WORKSPACE', text.includes('previewNonceRef') && text.includes('Aperçu automatique') ? 'OK' : 'MISS');
