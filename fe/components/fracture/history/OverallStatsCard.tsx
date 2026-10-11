import React from 'react';
import { OverallStats } from '@/hooks/fracture/history';

interface OverallStatsCardProps {
  stats: OverallStats;
}

interface StatCardProps {
  label: string;
  value: string;
  theme: 'gray' | 'green' | 'blue';
  icon: React.ReactNode;
}

function StatCard({ label, value, theme, icon }: StatCardProps) {
  const themes = {
    gray:  { wrap: 'bg-[var(--color-surface-raised)] border-[var(--color-border)]', icon: 'bg-[var(--color-surface-hover)] text-[var(--color-text-tertiary)]', value: 'text-[var(--color-text-primary)]' },
    green: { wrap: 'bg-[var(--color-primary-subtle)] border-[var(--color-primary-border)]', icon: 'bg-[var(--color-surface-raised)]/70 text-[var(--color-accent-text)]', value: 'text-[var(--color-accent-text)]' },
    blue: {
      wrap: 'bg-[var(--color-info-surface)] border-[var(--color-info-border)]',
      icon: 'bg-[var(--color-surface-raised)]/70 text-[var(--color-info-text)]',
      value: 'text-[var(--color-info-text)]',
    },
  };
  const t = themes[theme];

  return (
    <div className={`flex w-fit shrink-0 flex-col gap-0.5 rounded-md border px-1.5 py-1 ${t.wrap}`}>
      <p className="whitespace-nowrap text-[7px] font-bold uppercase leading-tight tracking-wide text-[var(--color-text-tertiary)]">{label}</p>
      <div className="flex min-w-0 items-center gap-1">
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${t.icon}`}>
          {icon}
        </span>
        <p className={`truncate text-[11px] font-bold leading-tight tabular-nums ${t.value}`}>{value}</p>
      </div>
    </div>
  );
}

export function OverallStatsCard({ stats }: OverallStatsCardProps) {
  return (
    <div className="flex w-fit gap-1.5">
      <StatCard
        label="Total Scans"
        value={String(stats.total_images)}
        theme="gray"
        icon={
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        }
      />
      <StatCard
        label="Avg IoU Score"
        value={`${stats.avg_iou_accuracy.toFixed(1)}%`}
        theme="green"
        icon={
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h8v8H8zM4 4h6v6H4zM14 14h6v6h-6z" />
          </svg>
        }
      />
      <StatCard
        label="Type Accuracy"
        value={`${stats.fracture_type_accuracy.toFixed(1)}%`}
        theme="blue"
        icon={
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 3c-2.755 0-5.295.932-7.313 2.5A12.005 12.005 0 003 12c0 4.418 3.582 8 8 8 3.56 0 6.58-2.32 7.62-5.5" />
          </svg>
        }
      />
    </div>
  );
}