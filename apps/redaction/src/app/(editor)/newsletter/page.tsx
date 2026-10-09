import { redirect } from 'next/navigation';
import { NewsletterDesk } from '@/components/redaction/newsletter-desk';
import { isRedactionSuperAdmin, requireRedactionUser } from '@/lib/redaction/strapi-editor';

export default async function RedactionNewsletterPage() {
  const user = await requireRedactionUser();
  if (!isRedactionSuperAdmin(user)) {
    redirect('/');
  }

  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Administration</p>
        <h1 className="font-display text-xl font-bold">Newsletter</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuration d’envoi, test et liste des adresses.
        </p>
      </div>
      <NewsletterDesk />
    </div>
  );
}
