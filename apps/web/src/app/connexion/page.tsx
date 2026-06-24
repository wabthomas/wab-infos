import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminLoginForm } from '@/components/auth/admin-login-form';
import { siteConfig } from '@/config/site';
import { getRedactionJwt, verifyRedactionUser } from '@/lib/redaction/strapi-editor';

export const metadata: Metadata = {
  title: 'Connexion rédaction',
  description: `Espace rédaction ${siteConfig.name} — connexion administrateur`,
  robots: { index: false, follow: false },
};

export default async function ConnexionPage() {
  const jwt = await getRedactionJwt();
  if (jwt && (await verifyRedactionUser(jwt))) {
    redirect('/redaction');
  }

  return <AdminLoginForm />;
}
