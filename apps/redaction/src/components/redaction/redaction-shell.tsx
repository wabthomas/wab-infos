'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDownUp,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Settings,
  User,
  UserPen,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchRedaction } from '@/lib/redaction/public-path';
import { ManagementBell, useManagementNotifications } from '@/components/redaction/rh/management-bell';
import { MyRhTopbarActions } from '@/components/redaction/rh/my-rh-topbar';
import { RedactionPushBanner } from '@/components/redaction/redaction-push-setup';
import {
  RedactionNotificationsBell,
  useRedactionNotifications,
} from '@/components/redaction/redaction-notifications';
import { touchRedactionSession } from '@/lib/redaction/touch-session';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AiEditorChat, type AiChatAction } from '@/components/redaction/ai-editor-chat';
import { WabAiAvatar } from '@/components/redaction/wab-ai-avatar';
import { useToast } from '@/components/ui/toast';
import { storePendingAiActions } from '@/lib/redaction/ai-pending-actions';
import {
  SIDEBAR_COOKIE,
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from '@/lib/redaction/sidebar-pref';

type NavIcon = typeof Home;

interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
  badge?: 'drafts' | 'comments';
}

const NAV_MAIN: NavItem[] = [
  { href: '/', label: 'Accueil', icon: Home, exact: true },
  { href: '/articles', label: 'Articles', icon: FileText, badge: 'drafts' },
  { href: '/comments', label: 'Commentaires', icon: MessageSquare, badge: 'comments' },
  { href: '/stats', label: 'Statistiques', icon: BarChart3 },
];

const NAV_ADMIN: NavItem[] = [
  { href: '/rh', label: 'Ressources humaines', icon: Users },
  { href: '/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
];

const MOBILE_NAV: NavItem[] = [
  { href: '/', label: 'Accueil', icon: Home, exact: true },
  { href: '/articles', label: 'Articles', icon: FileText, badge: 'drafts' },
  { href: '/comments', label: 'Commentaires', icon: MessageSquare, badge: 'comments' },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/profil', label: 'Profil', icon: User },
];

/** Barre mobile contextuelle : gestion RH. */
const RH_MOBILE_ADMIN: NavItem[] = [
  { href: '/rh', label: 'RH', icon: LayoutDashboard, exact: true },
  { href: '/rh/equipe', label: 'Équipe', icon: Users },
  { href: '/rh/conges', label: 'Congés', icon: CalendarDays },
  { href: '/rh/retraits', label: 'Retraits', icon: ArrowDownUp },
  { href: '/rh/plus', label: 'Plus', icon: MoreHorizontal },
];

/** Barre mobile contextuelle : espace RH personnel. */
const RH_MOBILE_MY: NavItem[] = [
  { href: '/mon-rh', label: 'Mon RH', icon: LayoutDashboard, exact: true },
  { href: '/mon-rh/conges', label: 'Congés', icon: CalendarDays },
  { href: '/mon-rh/prestations', label: 'Prestations', icon: ClipboardList },
  { href: '/mon-rh/retraits', label: 'Retraits', icon: ArrowDownUp },
  { href: '/mon-rh/plus', label: 'Plus', icon: MoreHorizontal },
];

function isWritingPage(pathname: string): boolean {
  return pathname === '/nouveau' || /\/articles\/[^/]+\/edit$/.test(pathname);
}

function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getDesktopPageTitle(pathname: string): { title: string; eyebrow: string } {
  if (pathname === '/') return { title: 'Tableau de bord', eyebrow: 'Vue d’ensemble' };
  if (pathname === '/articles' || pathname.startsWith('/articles/'))
    return { title: 'Articles', eyebrow: 'Contenus' };
  if (pathname === '/comments') return { title: 'Commentaires', eyebrow: 'Modération' };
  if (pathname === '/stats') return { title: 'Statistiques', eyebrow: 'Audience' };
  if (pathname === '/profil/modifier') return { title: 'Modifier le profil', eyebrow: 'Mon compte' };
  if (pathname === '/profil' || pathname.startsWith('/profil/'))
    return { title: 'Profil', eyebrow: 'Mon compte' };
  if (pathname === '/parametres') return { title: 'Paramètres du site', eyebrow: 'Administration' };
  if (pathname === '/rh' || pathname.startsWith('/rh/')) return { title: 'Ressources humaines', eyebrow: 'Administration' };
  if (pathname === '/newsletter') return { title: 'Newsletter', eyebrow: 'Administration' };
  if (pathname === '/nouveau') return { title: 'Nouvel article', eyebrow: 'Rédaction' };
  return { title: 'Rédaction', eyebrow: 'Wab-infos' };
}

function formatBadge(count: number, max = 99): string {
  if (count <= 0) return '';
  return count > max ? `${max}+` : String(count);
}

function initialsOf(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'W';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function AiFab({ onOpen, className }: { onOpen: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'fixed z-50 flex items-center justify-center rounded-full bg-transparent p-0 shadow-lg shadow-primary/25 ring-2 ring-background transition-transform hover:scale-105 active:scale-95',
        className
      )}
      aria-label="Ouvrir Wab Ai"
      title="Wab Ai — assistant de rédaction"
    >
      <WabAiAvatar size="md" className="pointer-events-none" />
    </button>
  );
}

interface RedactionShellProps {
  children: React.ReactNode;
  authorName?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
  initialPendingComments?: number;
  initialSidebarCollapsed?: boolean;
  managementNotificationsEnabled?: boolean;
  rhOnly?: boolean;
}

function Avatar({ name, src, size = 36 }: { name?: string; src?: string; size?: number }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-2 ring-background"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-xs font-bold text-primary-foreground ring-2 ring-background"
      style={{ width: size, height: size }}
    >
      {initialsOf(name)}
    </span>
  );
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
  active,
  badgeCount,
}: {
  href: string;
  label: string;
  icon: NavIcon;
  active: boolean;
  badgeCount?: number;
}) {
  const badge = formatBadge(badgeCount ?? 0, 9);
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="max-w-full truncate text-center text-[10px] font-semibold leading-none">
        {label}
      </span>
      {badge ? (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 -translate-y-0.5 translate-x-0.5 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarNavItem({
  item,
  active,
  collapsed,
  badgeCount,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  badgeCount?: number;
}) {
  const Icon = item.icon;
  const badge = formatBadge(badgeCount ?? 0);
  return (
    <Link
      href={item.href}
      prefetch
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex h-11 items-center rounded-xl text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-0' : 'gap-3 px-3',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      ) : null}
      <span className="relative flex shrink-0 items-center justify-center">
        <Icon className={cn('h-5 w-5', active && 'text-primary')} />
        {collapsed && badge ? (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white ring-2 ring-card">
            {formatBadge(badgeCount ?? 0, 9)}
          </span>
        ) : null}
      </span>
      {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
      {!collapsed && badge ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      {collapsed ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {item.label}
          {badge ? ` (${badge})` : ''}
        </span>
      ) : null}
    </Link>
  );
}

function RedactionSidebar({
  pathname,
  isSuperAdmin,
  draftCount,
  pendingComments,
  collapsed,
  onToggle,
}: {
  pathname: string;
  isSuperAdmin: boolean;
  draftCount: number;
  pendingComments: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const badgeFor = (item: NavItem) =>
    item.badge === 'drafts' ? draftCount : item.badge === 'comments' ? pendingComments : 0;

  return (
    <aside
      className="redaction-sidebar hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out lg:flex"
      style={{ width: 'var(--redaction-sidebar-w)' }}
    >
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border',
          collapsed ? 'justify-center px-2' : 'gap-3 px-4'
        )}
      >
        <Link
          href="/"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 font-display text-lg font-bold text-primary-foreground shadow-md shadow-primary/25"
          aria-label="Tableau de bord"
        >
          W
        </Link>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Wab-infos</p>
            <p className="font-display text-base font-bold leading-tight">Rédaction</p>
          </div>
        ) : null}
      </div>

      <nav
        className={cn(
          'flex flex-1 flex-col gap-1 p-3',
          collapsed ? 'overflow-visible' : 'overflow-y-auto'
        )}
        aria-label="Navigation rédaction"
      >
        {!collapsed ? (
          <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
            Menu
          </p>
        ) : null}
        {NAV_MAIN.map((item) => (
          <SidebarNavItem
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={isNavActive(pathname, item.href, item.exact)}
            badgeCount={badgeFor(item)}
          />
        ))}

        {isSuperAdmin ? (
          <>
            {collapsed ? (
              <span className="mx-auto my-2 h-px w-8 bg-border" aria-hidden />
            ) : (
              <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
                Administration
              </p>
            )}
            {NAV_ADMIN.map((item) => (
              <SidebarNavItem
                key={item.href}
                item={item}
                collapsed={collapsed}
                active={isNavActive(pathname, item.href, item.exact)}
              />
            ))}
          </>
        ) : null}
      </nav>

      <div className="shrink-0 border-t border-border p-3">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'flex h-10 w-full items-center rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
            collapsed ? 'justify-center' : 'gap-3 px-3'
          )}
          aria-label={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
          title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5" />
              <span>Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function ProfileMenu({
  authorName,
  avatarUrl,
  isSuperAdmin,
  rhOnly = false,
}: {
  authorName?: string;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  rhOnly?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetchRedaction('/api/redaction/auth/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  const roleLabel = rhOnly ? 'Collaborateur RH' : isSuperAdmin ? 'Administrateur' : 'Rédacteur';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-11 items-center gap-2.5 rounded-full border border-transparent py-1 pl-1 pr-3 transition-colors hover:border-border hover:bg-muted',
          open && 'border-border bg-muted'
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={authorName} src={avatarUrl} size={34} />
        <span className="hidden min-w-0 text-left xl:block">
          <span className="block max-w-[10rem] truncate text-sm font-semibold leading-tight">
            {authorName ?? 'Éditeur'}
          </span>
          <span className="block text-[11px] leading-tight text-muted-foreground">{roleLabel}</span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/10"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <Avatar name={authorName} src={avatarUrl} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{authorName ?? 'Éditeur'}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          {!rhOnly && <div className="p-1.5">
            <Link
              href="/profil"
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Voir le profil
            </Link>
            <Link
              href="/profil/modifier"
              role="menuitem"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
            >
              <UserPen className="h-4 w-4 text-muted-foreground" />
              Modifier le profil
            </Link>
          </div>}
          <div className="border-t border-border p-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={loggingOut}
              onClick={() => void logout()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-600/10 disabled:opacity-60 dark:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Déconnexion…' : 'Déconnexion'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DesktopTopbar({
  pathname,
  summary,
  managementNotifications,
  authorName,
  avatarUrl,
  isSuperAdmin,
  collapsed,
  onToggleSidebar,
  rhOnly = false,
}: {
  pathname: string;
  summary: ReturnType<typeof useRedactionNotifications>;
  managementNotifications: ReturnType<typeof useManagementNotifications>;
  authorName?: string;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  collapsed: boolean;
  onToggleSidebar: () => void;
  rhOnly?: boolean;
}) {
  const { title, eyebrow } = rhOnly
    ? { title: 'Espace RH', eyebrow: 'Ressources humaines' }
    : getDesktopPageTitle(pathname);
  return (
    <header className="redaction-desktop-topbar hidden h-16 shrink-0 items-center gap-4 border-b border-border bg-card/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-card/70 lg:flex">
      {!rhOnly && <button
        type="button"
        onClick={onToggleSidebar}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
        title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
      >
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        <h1 className="truncate font-display text-lg font-bold leading-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <ManagementBell state={managementNotifications} />
        {!rhOnly && <RedactionNotificationsBell summary={summary} />}
        <ThemeToggle className="h-10 w-10 rounded-full border-transparent bg-transparent shadow-none hover:border-border" />
        {!rhOnly && <Link
          href="/nouveau"
          className="ml-1 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-105 active:scale-[0.98]"
        >
          <PenLine className="h-4 w-4" />
          Nouvel article
        </Link>}
        {!rhOnly && <span className="mx-1 h-6 w-px bg-border" aria-hidden />}
        <ProfileMenu authorName={authorName} avatarUrl={avatarUrl} isSuperAdmin={isSuperAdmin} rhOnly={rhOnly} />
      </div>
    </header>
  );
}

export function RedactionShell({
  children,
  authorName,
  avatarUrl,
  isSuperAdmin = false,
  initialPendingComments = 0,
  initialSidebarCollapsed = false,
  managementNotificationsEnabled = false,
  rhOnly = false,
}: RedactionShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const writing = isWritingPage(pathname);
  const summary = useRedactionNotifications(60_000, !rhOnly);
  const managementNotifications = useManagementNotifications(managementNotificationsEnabled);
  const [pendingComments, setPendingComments] = useState(initialPendingComments);
  const [collapsed, setCollapsed] = useState(initialSidebarCollapsed);
  const [aiOpen, setAiOpen] = useState(false);

  /** Hors éditeur : une proposition d'article s'ouvre dans un nouveau brouillon. */
  const handleAiActions = useCallback(
    (actions: AiChatAction[]) => {
      if (!actions.length) return;
      storePendingAiActions(actions);
      setAiOpen(false);
      toast.success('Wab Ai', 'Ouverture de la proposition dans l’éditeur…');
      router.push('/nouveau');
    },
    [router, toast]
  );
  const draftCount = summary.draftCount;
  const effectivePending = summary.pendingComments || pendingComments;
  // Barre mobile contextuelle : le module RH remplace les onglets éditoriaux.
  const inRh = pathname === '/rh' || pathname.startsWith('/rh/');
  const inMyRh = pathname === '/mon-rh' || pathname.startsWith('/mon-rh/');
  const mobileNav: NavItem[] = inRh ? RH_MOBILE_ADMIN : inMyRh ? RH_MOBILE_MY : MOBILE_NAV;

  const toggleSidebar = useCallback(() => {
    setCollapsed((value) => {
      const next = !value;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? '1' : '0'}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  useEffect(() => {
    if (summary.pendingComments > 0 || summary.draftCount >= 0) {
      setPendingComments(summary.pendingComments);
    }
  }, [summary.pendingComments, summary.draftCount]);

  useEffect(() => {
    void touchRedactionSession();
    const interval = window.setInterval(() => void touchRedactionSession(), 10 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void touchRedactionSession();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    document.getElementById('redaction-main-scroll')?.scrollTo({ top: 0 });
  }, [pathname]);

  const rootStyle = {
    '--redaction-sidebar-w': `${collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED}px`,
  } as React.CSSProperties;

  const sidebar = (
    <RedactionSidebar
      pathname={pathname}
      isSuperAdmin={isSuperAdmin}
      draftCount={draftCount}
      pendingComments={effectivePending}
      collapsed={collapsed}
      onToggle={toggleSidebar}
    />
  );

  if (writing) {
    return (
      <div
        className="redaction-shell-root flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-background"
        style={rootStyle}
      >
        {sidebar}
        <div className="fixed inset-0 z-50 flex min-w-0 flex-col overflow-hidden bg-background lg:static lg:z-auto lg:flex-1">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className="redaction-shell-root flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-background"
      style={rootStyle}
    >
      {!rhOnly && sidebar}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="redaction-mobile-header z-40 shrink-0 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                {inRh || inMyRh ? 'Espace RH' : 'Rédaction'}
              </p>
              <p className="truncate font-display text-sm font-bold">{authorName ?? 'Wab-infos'}</p>
            </div>
            <div className="flex items-center gap-1">
              {inMyRh ? <MyRhTopbarActions /> : inRh ? <>
                <ManagementBell state={managementNotifications} />
                {rhOnly ? <MyRhTopbarActions /> : <ProfileMenu authorName={authorName} avatarUrl={avatarUrl} isSuperAdmin={isSuperAdmin} />}
              </> : <>
                <ManagementBell state={managementNotifications} />
                {!rhOnly && <RedactionNotificationsBell summary={summary} />}
              </>}
            </div>
          </div>
        </header>

        <DesktopTopbar
          pathname={pathname}
          summary={summary}
          managementNotifications={managementNotifications}
          authorName={authorName}
          avatarUrl={avatarUrl}
          isSuperAdmin={isSuperAdmin}
          collapsed={collapsed}
          onToggleSidebar={toggleSidebar}
          rhOnly={rhOnly}
        />

        <main
          id="redaction-main-scroll"
          className="redaction-main-scroll min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]"
        >
          <div
            className={cn(
              'mx-auto w-full px-4 py-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-8 lg:pb-10',
              pathname === '/parametres' ? 'lg:max-w-[1440px]' : 'lg:max-w-6xl'
            )}
          >
            {!rhOnly && <RedactionPushBanner />}
            {children}
          </div>
        </main>

        {isSuperAdmin ? (
          <Link
            href="/parametres"
            className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg lg:hidden"
            aria-label="Paramètres du site"
          >
            <Settings className="h-5 w-5" />
          </Link>
        ) : null}

        {!rhOnly && <Link
          href="/nouveau"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 lg:hidden"
          aria-label="Écrire un article"
        >
          <PenLine className="h-6 w-6" />
        </Link>}

        {!rhOnly && !aiOpen ? (
          <>
            {/* Mobile : au-dessus du bouton « Rédiger » (h-14 + 0.75rem d'écart). */}
            <AiFab
              onOpen={() => setAiOpen(true)}
              className="bottom-[calc(9rem+env(safe-area-inset-bottom))] right-5 h-12 w-12 lg:hidden"
            />
            <AiFab
              onOpen={() => setAiOpen(true)}
              className="bottom-6 right-6 hidden h-14 w-14 lg:flex"
            />
          </>
        ) : null}

        <AiEditorChat
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          article={{}}
          onActions={handleAiActions}
        />

        <nav className="redaction-mobile-nav fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur pb-[max(0.35rem,env(safe-area-inset-bottom))] lg:hidden">
          <div className="mx-auto flex max-w-lg items-end gap-0.5 px-2 pt-2">
            {mobileNav.map((item) => (
              <MobileNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isNavActive(pathname, item.href, item.exact)}
                badgeCount={
                  item.badge === 'drafts'
                    ? draftCount
                    : item.badge === 'comments'
                      ? effectivePending
                      : 0
                }
              />
            ))}
            {isSuperAdmin && !inRh && !inMyRh ? (
              <MobileNavItem
                href="/newsletter"
                label="E-mails"
                icon={Mail}
                active={pathname === '/newsletter'}
              />
            ) : null}
          </div>
        </nav>
      </div>
    </div>
  );
}
