import type { Metadata } from 'next';
import { AdminLoginForm } from '@/components/auth/admin-login-form';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Connexion rédaction',
  description: `Espace rédaction ${siteConfig.name} — connexion administrateur`,
  robots: { index: false, follow: false },
};

export default function ConnexionPage() {
  return <AdminLoginForm />;
}
