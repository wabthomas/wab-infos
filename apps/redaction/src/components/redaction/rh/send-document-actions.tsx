'use client';

import { useState } from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';

export function SendDocumentActions({
  collaboratorId,
  getPdf,
  filename,
  subject,
}: {
  collaboratorId: string;
  getPdf: () => Promise<Blob>;
  filename: string;
  subject: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function sendEmail() {
    setBusy(true); setError(''); setMessage('');
    try {
      const blob = await getPdf();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      const response = await fetchRedaction('/api/redaction/rh/envoyer-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratorId, pdfBase64, filename, subject }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Envoi impossible.');
      setMessage(`Document envoyé à ${data.email}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Envoi impossible.'); }
    finally { setBusy(false); }
  }

  async function shareWhatsApp() {
    setBusy(true); setError(''); setMessage('');
    try {
      const blob = await getPdf();
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: subject });
        setMessage('Document partagé.');
      } else {
        setError('Le partage de fichiers WhatsApp nécessite l’application mobile ou un navigateur compatible.');
      }
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError('Partage impossible.');
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
      <button type="button" disabled={busy} onClick={() => void sendEmail()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold disabled:opacity-50"><Mail className="h-3.5 w-3.5" /> Envoyer par e-mail</button>
      <button type="button" disabled={busy} onClick={() => void shareWhatsApp()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold disabled:opacity-50"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</button>
      {message && <span className="text-xs text-primary">{message}</span>}
      {error && <span role="alert" className="text-xs text-red-700 dark:text-red-300">{error}</span>}
    </div>
  );
}