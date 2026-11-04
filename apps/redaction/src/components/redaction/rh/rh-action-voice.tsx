'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { redactionPublicPath } from '@/lib/redaction/public-path';

export const RH_VOICE_KEY = 'redaction-rh-voice-enabled-v1';
type Cue = 'arrival' | 'departure' | 'submission' | 'arrival-offline' | 'departure-offline' | 'submission-offline';
let playing: HTMLAudioElement | null = null;

/** La voix est optionnelle, locale à l'appareil et n'envoie aucune donnée du collaborateur. */
export function useRhActionVoice() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const refresh = () => { try { setEnabled(localStorage.getItem(RH_VOICE_KEY) === 'on'); } catch { setEnabled(false); } };
    refresh(); window.addEventListener('storage', refresh); window.addEventListener('rh-voice-preference', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('rh-voice-preference', refresh); };
  }, []);
  function change(next: boolean) {
    try { localStorage.setItem(RH_VOICE_KEY, next ? 'on' : 'off'); setEnabled(next); window.dispatchEvent(new Event('rh-voice-preference')); }
    catch { setEnabled(false); }
    if (!next) { playing?.pause(); playing = null; }
  }
  function speak(cue: Cue, force = false) {
    if (!enabled && !force) return;
    try {
      playing?.pause();
      const audio = new Audio(redactionPublicPath(`/rh-voice/${cue}.mp3`));
      audio.preload = 'auto'; playing = audio;
      audio.onended = () => { if (playing === audio) playing = null; };
      void audio.play().catch(() => { if (playing === audio) playing = null; });
    } catch { /* Le pointage ou la prestation restent enregistrés même sans son. */ }
  }
  return { enabled, change, speak };
}

export function RhActionVoiceToggle({ voice }: { voice: ReturnType<typeof useRhActionVoice> }) {
  return <div className="flex flex-wrap items-center gap-2 text-xs print:hidden">
    <button type="button" aria-pressed={voice.enabled} onClick={() => voice.change(!voice.enabled)} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 font-semibold">
      {voice.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      Voix de confirmation : {voice.enabled ? 'activée' : 'désactivée'}
    </button>
    {voice.enabled && <button type="button" onClick={() => voice.speak('arrival', true)} className="min-h-9 rounded-lg px-2 font-semibold text-primary underline">Tester la voix</button>}
    <span className="text-muted-foreground">Réglage sur cet appareil · la confirmation écrite reste disponible.</span>
  </div>;
}
