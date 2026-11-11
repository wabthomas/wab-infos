'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { MessageCircle, Mic, Paperclip, Reply, Send, Smile, Square, Users, X } from 'lucide-react';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { useRhNotice } from './use-rh-notice';

type Room = { id: string; title: string; kind: 'group' | 'private' };
type Person = { id: string; firstName: string; lastName: string };
type Msg = { id: string; senderId: string; body: string; replyTo: string | null; replyBody: string | null; createdAt: string; fileName: string | null; fileMime: string | null; firstName: string; lastName: string };
type Presence = { id: string; online: boolean; typing: boolean };
const api = '/api/redaction/rh/mon-espace/chat';

export function RhChat() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [currentId, setCurrentId] = useState('');
  const [room, setRoom] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [online, setOnline] = useState<Presence[]>([]);
  const [text, setText] = useState('');
  const [reply, setReply] = useState<Msg | null>(null);
  const [error, setError] = useRhNotice('error');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [chatHeight, setChatHeight] = useState('calc(100dvh - 15rem)');
  const section = useRef<HTMLElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLFormElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const nearBottom = useRef(true);
  const roomRef = useRef(room);
  roomRef.current = room;

  const loadRooms = useCallback(async () => {
    try {
      const response = await fetchRedaction(api, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Chat indisponible.');
      setRooms(data.rooms ?? []);
      setPeople(data.people ?? []);
      setCurrentId(data.currentId ?? '');
      setRoom(current => current || data.rooms?.[0]?.id || '');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chat indisponible.'); }
  }, [setError]);
  const loadMessages = useCallback(async () => {
    if (!room) return;
    try {
      const response = await fetchRedaction(`${api}?room=${encodeURIComponent(room)}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (roomRef.current !== room) return;
      setMessages(data.messages ?? []);
      setOnline(data.presence ?? []);
    } catch { /* A later refresh retries. */ }
  }, [room]);

  useEffect(() => { void loadRooms(); const id = window.setInterval(() => void loadRooms(), 20_000); return () => window.clearInterval(id); }, [loadRooms]);
  useEffect(() => { setMessages([]); setOnline([]); setReply(null); nearBottom.current = true; void loadMessages(); const id = window.setInterval(() => void loadMessages(), 5_000); return () => window.clearInterval(id); }, [loadMessages]);
  useEffect(() => { if (nearBottom.current) bottom.current?.scrollIntoView({ block: 'end' }); }, [messages, room]);
  useEffect(() => {
    const visual = window.visualViewport;
    const resize = () => {
      const top = section.current?.getBoundingClientRect().top ?? 160;
      const nav = document.querySelector('.redaction-mobile-nav')?.getBoundingClientRect().height ?? 76;
      setChatHeight(`${Math.max(180, (visual?.height ?? window.innerHeight) + (visual?.offsetTop ?? 0) - Math.max(0, top) - nav - 12)}px`);
      if (document.activeElement === input.current) window.setTimeout(() => composer.current?.scrollIntoView({ block: 'nearest' }), 80);
    };
    resize(); window.addEventListener('resize', resize); visual?.addEventListener('resize', resize); visual?.addEventListener('scroll', resize);
    return () => { window.removeEventListener('resize', resize); visual?.removeEventListener('resize', resize); visual?.removeEventListener('scroll', resize); };
  }, []);
  useEffect(() => {
    const field = input.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 144)}px`;
  }, [text, reply, room]);
  useEffect(() => () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }, []);

  function switchRoom(id: string) { if (id) setRoom(id); }
  function presence(typing = false) {
    if (!room) return;
    void fetchRedaction(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'presence', roomId: room, typing }) }).catch(() => undefined);
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || !room || busy) return;
    const body = text;
    setBusy(true); setError('');
    try {
      const response = await fetchRedaction(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'message', roomId: room, body, replyTo: reply?.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Envoi impossible.');
      setText(''); setReply(null); nearBottom.current = true;
      await loadMessages();
      input.current?.focus();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Envoi impossible.'); }
    finally { setBusy(false); }
  }
  function composerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends on desktop; Shift+Enter and the mobile keyboard keep line breaks.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia('(min-width: 768px)').matches) {
      event.preventDefault();
      if (!busy && text.trim()) event.currentTarget.form?.requestSubmit();
    }
  }
  async function newPrivate(id: string) {
    if (!id) return;
    setCreating(true); setError('');
    try {
      const response = await fetchRedaction(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'private_room', collaboratorId: id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Conversation impossible.');
      await loadRooms(); switchRoom(data.room.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Conversation impossible.'); }
    finally { setCreating(false); }
  }
  async function upload(file: File) {
    if (!room) return;
    const form = new FormData(); form.set('file', file); form.set('roomId', room);
    if (reply) form.set('replyTo', reply.id);
    form.set('body', text);
    setBusy(true); setError('');
    try {
      const response = await fetchRedaction(`${api}/fichiers`, { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Envoi du fichier impossible.');
      setText(''); setReply(null); nearBottom.current = true;
      await loadMessages();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Envoi du fichier impossible.'); }
    finally { setBusy(false); }
  }
  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await upload(file);
    event.target.value = '';
  }
  async function recordVoice() {
    if (recorder.current?.state === 'recording') { recorder.current.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recorder.current = rec; chunks.current = [];
      rec.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      rec.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
        const blob = new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size) void upload(new File([blob], `vocal-${Date.now()}.webm`, { type: blob.type }));
      };
      rec.start(); setRecording(true);
    } catch { setError('Autorisez le micro pour enregistrer un vocal.'); }
  }

  const active = rooms.find(item => item.id === room);
  const group = rooms.find(item => item.kind === 'group');
  const conversations = rooms.filter(item => item.kind === 'private');
  const fileUrl = (id: string) => `${api}/fichiers/${id}`;
  return <section ref={section} aria-label="Chat RH" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <div className="grid h-[var(--rh-chat-height)] min-h-0 md:h-[min(75vh,820px)] md:min-h-[520px] md:grid-cols-[16rem_minmax(0,1fr)]" style={{ '--rh-chat-height': chatHeight } as React.CSSProperties}>
      <aside aria-label="Conversations" className="hidden min-h-0 flex-col border-r border-border bg-muted/20 p-3 md:flex">
        <h2 className="mb-3 flex items-center gap-2 px-2 text-sm font-bold"><MessageCircle className="h-4 w-4 text-primary" />Conversations</h2>
        {group && <button type="button" onClick={() => switchRoom(group.id)} aria-current={room === group.id ? 'page' : undefined} className={`mb-1 flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm font-semibold ${room === group.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}><Users className="h-4 w-4" />{group.title}</button>}
        <label className="mt-2 text-xs font-semibold text-muted-foreground">Nouvelle discussion
          <select aria-label="Nouvelle discussion privée" disabled={creating} value="" onChange={event => void newPrivate(event.target.value)} className="mt-1 block min-h-10 w-full rounded-xl border border-border bg-background px-2 text-sm text-foreground"><option value="">Choisir un collègue…</option>{people.map(person => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</select>
        </label>
        <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto">{conversations.map(item => <button key={item.id} type="button" onClick={() => switchRoom(item.id)} aria-current={room === item.id ? 'page' : undefined} className={`block w-full truncate rounded-xl px-3 py-2.5 text-left text-sm ${room === item.id ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'}`}>{item.title}</button>)}</div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="shrink-0 border-b border-border bg-card px-3 py-2.5 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">{active?.kind === 'group' ? <Users className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}</span>
            <div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold">{active?.title ?? 'Chat RH'}</h2><p className="text-[11px] text-muted-foreground">{online.some(person => person.typing) ? 'Quelqu’un écrit…' : `${online.filter(person => person.online).length} en ligne`}</p></div>
            <select aria-label="Changer de conversation" value={room} onChange={event => switchRoom(event.target.value)} className="min-h-10 max-w-24 rounded-xl border border-border bg-background px-1 text-xs md:hidden"><option value="">Chats</option>{rooms.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
          </div>
          <select aria-label="Nouvelle discussion privée" disabled={creating} value="" onChange={event => void newPrivate(event.target.value)} className="mt-2 min-h-9 w-full rounded-lg border border-border bg-background px-2 text-xs md:hidden"><option value="">+ Discussion privée</option>{people.map(person => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</select>
        </header>
        {error && <p role="alert" className="shrink-0 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">{error}<button type="button" onClick={() => setError('')} className="ml-2 font-semibold underline">Fermer</button></p>}
        <div ref={list} onScroll={event => { const node = event.currentTarget; nearBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 110; }} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-muted/20 p-3 sm:p-4">
          {!messages.length && <p className="py-8 text-center text-xs text-muted-foreground">Aucun message dans cette conversation.</p>}
          {messages.map(message => { const own = message.senderId === currentId; return <article key={message.id} className={`w-fit max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm sm:max-w-[70%] ${own ? 'ml-auto rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border bg-card text-foreground'}`}>
            {!own && <p className="mb-1 text-[11px] font-bold opacity-80">{message.firstName} {message.lastName}</p>}
            {message.replyBody && <blockquote className="mb-2 max-w-full truncate border-l-2 border-current/40 pl-2 text-xs opacity-75">{message.replyBody}</blockquote>}
            {message.body && <p className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>}
            {message.fileMime?.startsWith('image/') && <img src={fileUrl(message.id)} alt={message.fileName ?? 'Image partagée'} className="mt-2 max-h-60 max-w-full rounded-xl object-contain" />}
            {message.fileMime?.startsWith('audio/') ? <audio controls src={fileUrl(message.id)} className="mt-2 max-w-full" /> : message.fileName && !message.fileMime?.startsWith('image/') ? <a href={fileUrl(message.id)} className="mt-2 flex items-center gap-1.5 break-all underline" target="_blank" rel="noopener noreferrer"><Paperclip className="h-4 w-4 shrink-0" />{message.fileName}</a> : null}
            <div className="mt-1.5 flex items-center justify-end gap-2 text-[10px] opacity-70"><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</time><button type="button" onClick={() => { setReply(message); input.current?.focus(); }} aria-label={`Répondre à ${message.firstName}`} className="rounded-full p-1 hover:bg-foreground/10"><Reply className="h-4 w-4" /></button></div>
          </article>; })}
          <div ref={bottom} aria-hidden="true" />
        </div>
        {reply && <div className="mx-3 mt-2 flex min-w-0 items-center gap-2 rounded-xl border-l-4 border-primary bg-muted px-3 py-2 text-xs"><Reply className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate">{reply.body || reply.fileName || 'Fichier'}</span><button type="button" onClick={() => setReply(null)} aria-label="Annuler la réponse" className="rounded-full p-1"><X className="h-4 w-4" /></button></div>}
        <form ref={composer} onSubmit={send} className="flex shrink-0 items-end gap-1.5 border-t border-border bg-card px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:gap-2 sm:p-3">
          <input type="file" ref={fileInput} onChange={chooseFile} className="hidden" accept="image/*,application/pdf,audio/*,video/mp4" />
          <button type="button" disabled={busy || !room} aria-label="Joindre un fichier" title="Joindre un fichier" onClick={() => fileInput.current?.click()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted disabled:opacity-50"><Paperclip className="h-5 w-5" /></button>
          <div className="flex min-w-0 flex-1 items-end rounded-[1.4rem] border border-border bg-background px-3 py-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
            <textarea ref={input} rows={1} value={text} maxLength={4000} onChange={event => { setText(event.target.value); presence(true); }} onKeyDown={composerKeyDown} onFocus={() => window.setTimeout(() => composer.current?.scrollIntoView({ block: 'nearest' }), 80)} placeholder="Écrire un message…" aria-label="Écrire un message" className="max-h-36 min-h-7 w-full min-w-0 resize-none overflow-y-auto bg-transparent py-1 text-base leading-6 outline-none placeholder:text-muted-foreground" />
            <button type="button" aria-label="Ajouter un emoji" title="Ajouter un emoji" onClick={() => { setText(value => value + ' 😊'); input.current?.focus(); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground"><Smile className="h-5 w-5" /></button>
          </div>
          <button type="button" disabled={busy || !room} aria-label={recording ? 'Arrêter l’enregistrement vocal' : 'Enregistrer un vocal'} title={recording ? 'Arrêter le vocal' : 'Enregistrer un vocal'} onClick={() => void recordVoice()} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full disabled:opacity-50 ${recording ? 'bg-red-500/10 text-red-600' : 'text-muted-foreground hover:bg-muted'}`}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}</button>
          <button type="submit" disabled={busy || !text.trim() || !room} aria-label="Envoyer le message" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm disabled:opacity-40"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  </section>;
}
