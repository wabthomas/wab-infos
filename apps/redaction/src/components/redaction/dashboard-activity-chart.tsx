'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatStatsDate } from '@/lib/redaction/admin-analytics';
import type { AdminAnalyticsPoint } from '@/lib/redaction/types';

interface DashboardActivityChartProps {
  publications: AdminAnalyticsPoint[];
  comments: AdminAnalyticsPoint[];
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-foreground">{formatStatsDate(label)}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-muted-foreground">
          <span className="font-medium" style={{ color: entry.color }}>
            {entry.name}
          </span>
          {' : '}
          {entry.value}
        </p>
      ))}
    </div>
  );
}

export function DashboardActivityChart({ publications, comments }: DashboardActivityChartProps) {
  const data = publications.map((point, index) => ({
    date: point.date,
    publications: point.value,
    comments: comments[index]?.value ?? 0,
  }));

  const hasActivity = data.some((d) => d.publications > 0 || d.comments > 0);

  if (!hasActivity) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground lg:h-[220px]">
        Aucune activité sur les 7 derniers jours
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full lg:h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="dashPubFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c41e3a" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#c41e3a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="dashComFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => formatStatsDate(String(v))}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="publications"
            name="Publications"
            stroke="#c41e3a"
            strokeWidth={2}
            fill="url(#dashPubFill)"
          />
          <Area
            type="monotone"
            dataKey="comments"
            name="Commentaires"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#dashComFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
