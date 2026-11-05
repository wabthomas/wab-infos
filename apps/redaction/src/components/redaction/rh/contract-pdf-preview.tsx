'use client';

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';

/** Renders the actual PDF, not an HTML approximation of its clauses. Only the visible A4 page is rasterized. */
export function ContractPdfPreview({ bytes, status }: { bytes: Uint8Array | null; status: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    let task: ReturnType<typeof import('pdfjs-dist').getDocument> | null = null;
    let loaded: PDFDocumentProxy | null = null;
    setDocument(null); setPageNumber(1); setError('');
    if (bytes) {
      void (async () => {
        try {
          const pdfjs = await import('pdfjs-dist');
          if (!active) return;
          pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
          // PDF.js transfers its input to the worker; keep the caller's buffer intact.
          task = pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true });
          loaded = await task.promise;
          if (active) setDocument(loaded);
          else void loaded.destroy();
        } catch { if (active) setError('Impossible d’afficher cet aperçu PDF.'); }
      })();
    }
    return () => { active = false; if (task) void task.destroy(); else if (loaded) void loaded.destroy(); };
  }, [bytes]);

  useEffect(() => {
    if (!document) return;
    let active = true;
    let job: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | null = null;
    setRendering(true); setError('');
    void (async () => {
      try {
        const page = await document.getPage(pageNumber);
        if (!active) return;
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d', { alpha: false });
        if (!canvas || !context) throw new Error('Canvas unavailable');
        const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 1.4;
        const viewport = page.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        job = page.render({ canvasContext: context, viewport });
        await job.promise;
        if (active) setRendering(false);
      } catch { if (active) { setRendering(false); setError('Impossible d’afficher cette page.'); } }
    })();
    return () => { active = false; job?.cancel(); };
  }, [document, pageNumber]);

  useEffect(() => {
    if (!expanded) return;
    closeRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [expanded]);

  return <section role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} aria-label={expanded ? 'Aperçu agrandi du contrat A4' : undefined} className={expanded ? 'fixed inset-0 z-[120] overflow-y-auto bg-black/90 p-3 sm:p-6' : 'rounded-xl border bg-muted/20 p-3 sm:p-4'}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className={expanded ? 'font-bold text-white' : 'font-bold'}>Aperçu du contrat · A4</h3>
      <div className="flex items-center gap-2">
        {expanded ? <button ref={closeRef} type="button" onClick={() => setExpanded(false)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black">Fermer</button>
          : document && <button type="button" onClick={() => setExpanded(true)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold">Agrandir</button>}
      </div>
    </div>
    {document && <div className="mb-3 flex items-center justify-center gap-3" aria-label="Navigation dans le contrat">
      <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber(n => n - 1)} className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Précédente</button>
      <span className={expanded ? 'text-xs font-semibold text-white' : 'text-xs font-semibold'}>Page {pageNumber} / {document.numPages}</span>
      <button type="button" disabled={pageNumber >= document.numPages} onClick={() => setPageNumber(n => n + 1)} className="rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Suivante</button>
    </div>}
    {document && !error ? <div className="relative mx-auto w-full max-w-[210mm] bg-white shadow-lg ring-1 ring-black/10">
      <canvas ref={canvasRef} role="img" aria-label={`Page ${pageNumber} sur ${document.numPages} du contrat A4`} className="block h-auto w-full" />
      {rendering && <div className="absolute inset-0 grid place-items-center bg-white/75 text-sm text-slate-600">Préparation de la page…</div>}
    </div> : <div className="mx-auto flex aspect-[210/297] max-w-[210mm] items-center justify-center rounded-lg border bg-white p-5 text-center text-sm text-slate-600">{error || status}</div>}
  </section>;
}
