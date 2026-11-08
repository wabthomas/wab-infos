'use client';

import { useState, type ReactNode } from 'react';
import { Building2, Mail, Megaphone, ShieldCheck, SlidersHorizontal, Users, Volume2 } from 'lucide-react';

export type RhSettingsTabIcon = 'building' | 'mail' | 'announcement' | 'voice' | 'features' | 'roles';

export interface RhSettingsTab {
  id: string;
  label: string;
  description: string;
  icon: RhSettingsTabIcon;
  content: ReactNode;
}

const icons = {
  building: Building2,
  mail: Mail,
  announcement: Megaphone,
  voice: Volume2,
  features: SlidersHorizontal,
  roles: Users,
} as const;

export function RhSettingsTabs({ tabs }: { tabs: RhSettingsTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '');
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return <div className="space-y-5">
    <div role="tablist" aria-label="Sections des paramètres RH" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {tabs.map((tab) => {
        const Icon = icons[tab.icon];
        const selected = tab.id === current?.id;
        return <button key={tab.id} type="button" role="tab" aria-selected={selected} aria-controls={`rh-settings-${tab.id}`} onClick={() => setActive(tab.id)}
          className={`group flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? 'border-primary/50 bg-primary/[0.07] shadow-sm' : 'border-border bg-card hover:bg-muted/40'}`}>
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}><Icon className="h-4 w-4" /></span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">{tab.label}</span>
            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{tab.description}</span>
          </span>
        </button>;
      })}
    </div>
    {current && <section role="tabpanel" id={`rh-settings-${current.id}`} aria-label={current.label} className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <div><h3 className="text-sm font-bold">{current.label}</h3><p className="text-xs text-muted-foreground">{current.description}</p></div>
      </div>
      {current.content}
    </section>}
  </div>;
}
