'use client';

import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { playRhVoice, type RhVoiceCue } from './rh-action-voice';

const samples: { cue: RhVoiceCue; label: string }[] = [
  { cue: 'arrival', label: 'Tester l’arrivée' },
  { cue: 'departure', label: 'Tester la sortie' },
  { cue: 'submission', label: 'Tester la prestation' },
];

/** Monté exclusivement dans /rh/parametres, page réservée au super-administrateur. */
export function RhVoiceAdminTest() {
  const [last, setLast] = useState('');
  return <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
    <h2 className="flex items-center gap-2 text-base font-bold"><Volume2 className="h-5 w-5 text-primary" />Voix des confirmations RH</h2>
    <p className="mt-2 text-sm text-muted-foreground">Écoutez les annonces sans créer de pointage ni de prestation. Ce test est réservé à l’administration ; les collaborateurs n’ont que le contrôle du son.</p>
    <div className="mt-4 flex flex-wrap gap-2">{samples.map(sample=><button key={sample.cue} type="button" onClick={()=>{playRhVoice(sample.cue);setLast(sample.label);}} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">{sample.label}</button>)}</div>
    {last&&<p role="status" className="mt-2 text-xs text-muted-foreground">{last} · aucun enregistrement RH effectué.</p>}
  </section>;
}
