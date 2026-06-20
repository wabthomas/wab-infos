import { redirect } from 'next/navigation';
import { RedactionLoginForm } from '@/components/redaction/redaction-login-form';
import { getRedactionJwt, verifyRedactionUser } from '@/lib/redaction/strapi-editor';

export default async function RedactionLoginPage() {
  const jwt = await getRedactionJwt();
  if (jwt && (await verifyRedactionUser(jwt))) {
    redirect('/redaction');
  }

  return <RedactionLoginForm />;
}
