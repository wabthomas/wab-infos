'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { useToast } from '@/components/ui/toast';

/** Conserve le message dans la fiche tout en notifiant chaque action, même répétée. */
export function useRhNotice(kind: 'error' | 'success' | 'info' | 'auto' = 'info'): [string, Dispatch<SetStateAction<string>>] {
  const [value, setValue] = useState('');
  const toast = useToast();
  const update = useCallback<Dispatch<SetStateAction<string>>>((next) => {
    if (typeof next === 'function') { setValue(next); return; }
    setValue(next);
    if (!next) return;
    const variant = kind === 'auto' ? (/impossible|indisponible|erreur|invalide|échoué|vérifiez|refusé|non disponible|pas disponibles|indisponibles|maximum/i.test(next) ? 'error' : 'success') : kind;
    toast[variant](next);
  }, [kind, toast]);
  return [value, update];
}
