'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { redactionPublicPath } from '@/lib/redaction/public-path';

export const RH_VOICE_KEY = 'redaction-rh-voice-enabled-v1';
export type RhVoiceCue = 'arrival' | 'departure' | 'submission' | 'arrival-offline' | 'departure-offline' | 'submission-offline';
type NativeRhVoiceBridge = { playRhVoice?: (cue: RhVoiceCue) => boolean; stopRhVoice?: () => void };
let playing: HTMLAudioElement | null = null;
const prepared = new Map<RhVoiceCue, HTMLAudioElement>();

function nativeVoice(): NativeRhVoiceBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { AndroidBridge?: NativeRhVoiceBridge }).AndroidBridge;
}
function stopRhVoice() {
  playing?.pause(); playing = null;
  prepared.forEach(audio => audio.pause());prepared.clear();
  try { nativeVoice()?.stopRhVoice?.(); } catch { /* Pont natif ancien ou indisponible. */ }
}

/** Précharge après le geste de l'utilisateur : utile aux anciennes WebViews sans pont vocal. Ne joue rien. */
export function prepareRhVoice(cue: RhVoiceCue) {
  if (nativeVoice()?.playRhVoice || prepared.has(cue)) return;
  try {
    const audio = new Audio(redactionPublicPath(`/rh-voice/${cue}.mp3`));
    audio.preload = 'auto'; audio.load();prepared.set(cue,audio);
  } catch { /* Le succès de l'action ne dépend pas de l'audio. */ }
}

/** Le pont Android lit un MP3 embarqué dans l'APK ; les anciennes APK retombent sur l'audio web. */
export function playRhVoice(cue: RhVoiceCue) {
  playing?.pause();playing=null;
  try { if (nativeVoice()?.playRhVoice?.(cue)) { prepared.delete(cue);return; } }
  catch { /* Repli audio web. */ }
  try {
    const audio = prepared.get(cue) ?? new Audio(redactionPublicPath(`/rh-voice/${cue}.mp3`));
    prepared.delete(cue);playing=audio;
    audio.onended=()=>{if(playing===audio)playing=null;};
    void audio.play().catch(()=>{if(playing===audio)playing=null;});
  } catch { /* Confirmation écrite conservée. */ }
}

/** Préférence locale, activée par défaut ; les tests audio ne sont pas exposés au collaborateur. */
export function useRhActionVoice() {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    const refresh = () => { try { setEnabled(localStorage.getItem(RH_VOICE_KEY) !== 'off'); } catch { setEnabled(true); } };
    refresh();window.addEventListener('storage',refresh);window.addEventListener('rh-voice-preference',refresh);
    return ()=>{window.removeEventListener('storage',refresh);window.removeEventListener('rh-voice-preference',refresh);};
  }, []);
  function change(next:boolean){
    try {localStorage.setItem(RH_VOICE_KEY,next?'on':'off');setEnabled(next);window.dispatchEvent(new Event('rh-voice-preference'));}
    catch {setEnabled(next);}
    if(!next)stopRhVoice();
  }
  function prepare(cue:RhVoiceCue){if(enabled)prepareRhVoice(cue);}
  function speak(cue:RhVoiceCue){if(enabled)playRhVoice(cue);}
  return {enabled,change,prepare,speak};
}

export function RhActionVoiceToggle({voice}:{voice:ReturnType<typeof useRhActionVoice>}){
  return <button type="button" aria-pressed={voice.enabled} aria-label={voice.enabled?'Son activé : appuyer pour désactiver':'Son désactivé : appuyer pour activer'} title={voice.enabled?'Son activé':'Son désactivé'} onClick={()=>voice.change(!voice.enabled)} className={`inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-colors print:hidden ${voice.enabled?'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400':'border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-400'}`}>
    {voice.enabled?<Volume2 className="h-5 w-5" aria-hidden/>:<VolumeX className="h-5 w-5" aria-hidden/>}
  </button>;
}
