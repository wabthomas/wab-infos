import type { Metadata } from 'next';
import { createHash } from 'node:crypto';
import { db } from '@/lib/redaction/rh/database';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Vérification d’émission RH', robots: { index: false, follow: false } };

export default async function VerifyRhIssue({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let record: { company_name: string; company_registration: string; company_tax_id: string; kind: string; reference: string | null; document_date: string; fingerprint: string; png_hash: string; issued_at: Date; status: string } | undefined;
  if (/^[a-f0-9]{64}$/.test(token)) {
    try {
      const result = await db().query(`SELECT company_name,company_registration,company_tax_id,kind,reference,document_date,encode(content_hash,'hex') AS fingerprint,
        encode(png_hash,'hex') AS png_hash,issued_at,status FROM redaction_rh.official_issues
        WHERE token_hash=$1 AND status IN ('issued','revoked')`,[createHash('sha256').update(token).digest()]);
      record = result.rows[0];
    } catch { /* Ne pas exposer les détails de la base. */ }
  }
  return <main className="mx-auto min-h-screen max-w-2xl px-5 py-12 text-foreground sm:py-20">
    <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-lg sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Registre RH · vérification</p>
      <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{record?.status === 'issued' ? 'Émission enregistrée' : record?.status === 'revoked' ? 'Émission révoquée' : 'Document non vérifiable'}</h1>
      {record ? <div className="mt-6 space-y-4 text-sm leading-6">
        <p>Le registre de <strong>{record.company_name}</strong> {record.status === 'issued' ? 'contient une version numérique de référence' : 'indique que cette émission est révoquée'} pour ce numéro QR.</p>
        {(record.company_registration || record.company_tax_id) && <p className="text-muted-foreground">{record.company_registration && `RCCM : ${record.company_registration}`}{record.company_registration && record.company_tax_id && ' · '}{record.company_tax_id && `Identifiant fiscal : ${record.company_tax_id}`}</p>}
        <dl className="grid gap-3 rounded-xl bg-muted/50 p-5 sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Type</dt><dd className="font-semibold">{record.kind === 'lettre' ? 'Lettre administrative' : 'Communiqué officiel'}</dd></div>
          {record.reference && <div><dt className="text-muted-foreground">Référence du communiqué</dt><dd className="font-semibold">{record.reference}</dd></div>}
          <div><dt className="text-muted-foreground">Date inscrite</dt><dd className="font-semibold">{record.document_date}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted-foreground">Empreinte du fichier PNG enregistré (SHA-256)</dt><dd className="break-all font-mono text-xs">{record.png_hash}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted-foreground">Empreinte du contenu déclaré (SHA-256)</dt><dd className="break-all font-mono text-xs">{record.fingerprint}</dd></div>
        </dl>
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">Comparez le document en votre possession avec l’exemplaire conservé par l’administration RH et son empreinte. Un QR peut être recopié sur un autre document : sa seule présence ne prouve ni l’identité du signataire, ni l’absence d’altération du papier, ni une signature électronique qualifiée.</p>
      </div> : <p className="mt-5 text-sm leading-6 text-muted-foreground">Ce code n’est associé à aucun document émis consultable. Vérifiez l’adresse du QR ou contactez l’administration RH. Une émission en cours n’est pas encore validée.</p>}
    </div>
  </main>;
}
