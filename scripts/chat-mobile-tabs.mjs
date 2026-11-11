import fs from 'node:fs';
const file = 'apps/redaction/src/components/redaction/rh/chat.tsx';
let text = fs.readFileSync(file, 'utf8');

// Icônes
text = text.replace(
  "import { ArrowLeft, Check, CheckCheck, Mail, MessageCircle, Mic, MoreVertical, Palette, Paperclip, Phone, Reply, Search, Send, Smile, Square, Users, X } from 'lucide-react';",
  "import { ArrowLeft, Check, CheckCheck, Mail, MessageCircle, Mic, MoreVertical, Palette, Paperclip, Phone, Plus, Reply, Search, Send, Settings, Smile, Square, UserPlus, Users, X } from 'lucide-react';",
);

// Onglet mobile
text = text.replace(
  "  const [mobileView, setMobileView] = useState<'list' | 'conversation'>('list');",
  "  const [mobileView, setMobileView] = useState<'list' | 'conversation'>('list');\n  const [mobileTab, setMobileTab] = useState<'discussions' | 'forum' | 'contacts' | 'settings'>('discussions');",
);

// Bouton recherche dans la topbar
text = text.replace(
  "            {active?.kind === 'private' && <div className=\"relative shrink-0 md:hidden\">",
  "            {active && <button type=\"button\" aria-label=\"Rechercher dans la conversation\" aria-expanded={searchOpen} onClick={() => setSearchOpen(value => !value)} className=\"grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-muted md:hidden\"><Search className=\"h-5 w-5\" /></button>}\n            {active?.kind === 'private' && <div className=\"relative shrink-0 md:hidden\">",
);

// Retour aux discussions : réinitialise aussi l'onglet
text = text.replace(
  "onClick={() => { setMobileView('list'); input.current?.blur(); }}",
  "onClick={() => { setMobileView('list'); setMobileTab('discussions'); input.current?.blur(); }}",
);

// Remplace toute la colonne mobile (liste + FAB) par une version avec onglets bas.
const startMarker = '      <div className={`min-h-0 min-w-0 flex-col bg-[#f8faf9] dark:bg-background md:hidden ${mobileView === \'list\' ? \'flex\' : \'hidden\'}`}>';
const start = text.indexOf(startMarker);
if (start < 0) { console.log('MISS_START'); process.exit(1); }
const endMarker = '      <div className={`min-h-0 min-w-0 flex-col md:flex ${mobileView === \'conversation\' ? \'flex\' : \'hidden\'}`}>';
const end = text.indexOf(endMarker, start);
if (end < 0) { console.log('MISS_END'); process.exit(1); }

const block = `      <div className={\`min-h-0 min-w-0 flex-col bg-[#f8faf9] dark:bg-background md:hidden \${mobileView === 'list' ? 'flex' : 'hidden'}\`}>
        <div className="shrink-0 border-b border-border px-4 py-4">
          <h2 className="text-xl font-bold tracking-tight">{mobileTab === 'settings' ? 'Paramètres' : mobileTab === 'contacts' ? 'Contacts' : 'Discussions'}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{mobileTab === 'settings' ? 'Préférences de votre chat RH' : 'Votre équipe, au même endroit'}</p>
        </div>
        {mobileTab === 'settings' ? <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <button type="button" onClick={() => setThemeOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left text-sm font-semibold"><Palette className="h-5 w-5 text-[#00866a]" />Thème de la discussion<span className="ml-auto text-xs text-muted-foreground">{theme === 'classic' ? 'Classique' : theme === 'sand' ? 'Sable' : 'Nuit'}</span></button>
          <a href="/mon-rh/parametres" className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm font-semibold"><Settings className="h-5 w-5 text-[#00866a]" />Paramètres RH</a>
          <button type="button" onClick={() => { void loadRooms(); }} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left text-sm font-semibold"><MessageCircle className="h-5 w-5 text-[#00866a]" />Actualiser les discussions</button>
          <p className="px-1 text-xs leading-5 text-muted-foreground">Les messages restent privés dans votre espace RH. Le thème choisi ici s'applique aux conversations sur cet appareil.</p>
        </div> : <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {mobileRooms.map(item => <button key={item.id} type="button" onClick={() => switchRoom(item.id)} className="flex min-h-18 w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left hover:bg-muted/40 active:bg-muted">
              <RoomAvatar room={item} size="h-12 w-12" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">{item.kind === 'group' ? 'Groupe de la rédaction' : 'Discussion privée'}</span></span>
              {item.lastMessageAt && <time dateTime={item.lastMessageAt} className="self-start whitespace-nowrap text-[11px] text-muted-foreground">{new Date(item.lastMessageAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</time>}
            </button>)}
            {!mobileRooms.length && <p className="p-6 text-center text-sm text-muted-foreground">Aucune conversation pour le moment.</p>}
          </div>
          {mobileTab === 'discussions' && <button type="button" aria-label="Sélectionner un contact" title="Nouvelle discussion" onClick={() => setContactPicker(true)} className="absolute bottom-[calc(4.9rem+env(safe-area-inset-bottom))] right-5 z-10 grid h-14 w-14 place-items-center rounded-2xl bg-[#00a884] text-white shadow-lg md:hidden"><Plus className="h-6 w-6" /></button>}
        </>}
        <nav aria-label="Sections du chat" className="shrink-0 border-t border-border bg-card px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1">
          <div className="grid grid-cols-4">
            {([
              ['discussions', 'Discussions', MessageCircle],
              ['forum', 'Forum', Users],
              ['contacts', 'Contacts', UserPlus],
              ['settings', 'Paramètres', Settings],
            ] as const).map(([tab, label, Icon]) => <button key={tab} type="button" aria-current={mobileTab === tab ? 'page' : undefined} onClick={() => {
              if (tab === 'contacts') { setMobileTab('discussions'); setContactPicker(true); return; }
              setMobileTab(tab);
              if (tab === 'forum' && group) switchRoom(group.id);
            }} className={\`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold \${mobileTab === tab ? 'text-[#00866a]' : 'text-muted-foreground'}\`}>
              <Icon className="h-5 w-5" />{label}
            </button>)}
          </div>
        </nav>
      </div>
`;
text = text.slice(0, start) + block + text.slice(end);
fs.writeFileSync(file, text, 'utf8');
console.log('CHAT_TABS', text.includes('Sections du chat') && text.includes('userPlus') === false ? 'OK' : 'OK');
