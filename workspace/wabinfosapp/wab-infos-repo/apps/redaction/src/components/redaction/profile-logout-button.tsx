'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function ProfileLogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/redaction/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-semibold text-muted-foreground active:bg-muted"
    >
      <LogOut className="h-4 w-4" />
      Se déconnecter
    </button>
  );
}
