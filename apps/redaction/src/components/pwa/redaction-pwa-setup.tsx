'use client';

import { useEffect } from 'react';
import { registerRedactionServiceWorker } from '@/lib/redaction/register-service-worker';

/** Register early, including before login, so desktop browsers can offer PWA installation. */
export function RedactionPwaSetup() {
  useEffect(() => { void registerRedactionServiceWorker(); }, []);
  return null;
}
