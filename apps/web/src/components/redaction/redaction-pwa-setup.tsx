'use client';

import { useEffect } from 'react';
import { registerRedactionServiceWorker } from '@/lib/redaction/register-service-worker';

export function RedactionPwaSetup() {
  useEffect(() => {
    registerRedactionServiceWorker().catch(() => undefined);
  }, []);

  return null;
}
