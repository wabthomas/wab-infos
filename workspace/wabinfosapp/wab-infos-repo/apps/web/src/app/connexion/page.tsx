import { redirect } from 'next/navigation';

const cmsUrl = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.app.wab-infos.com';

export default function ConnexionPage() {
  redirect(`${cmsUrl}/admin`);
}
