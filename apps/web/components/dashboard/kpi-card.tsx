import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: 'default' | 'warning' | 'destructive';
}) {
  return (
    <div className="portal-stat transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl',
            tone === 'warning' && 'bg-risk-medium/10 text-risk-medium',
            tone === 'destructive' && 'bg-risk-high/10 text-risk-high',
            tone === 'default' && 'bg-section-wash text-primary',
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-light tracking-tight text-ink sm:text-[2rem]">{value}</p>
    </div>
  );
}
