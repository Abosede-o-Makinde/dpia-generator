'use client';

import Link from 'next/link';
import { FileText, AlertTriangle, Paperclip, CalendarClock } from 'lucide-react';
import { useDashboard } from '@/hooks/use-dashboard';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { RiskHeatmap } from '@/components/dashboard/risk-heatmap';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatDateTime } from '@/lib/utils';

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">DPIA programme</p>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Track assessments in progress, unresolved high risks, supporting evidence, and upcoming
          reviews.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="DPIAs created" value={data.kpis.totalDpias} icon={FileText} />
        <KpiCard
          label="Open high/critical risks"
          value={data.kpis.openHighRisks}
          icon={AlertTriangle}
          tone="destructive"
        />
        <KpiCard label="Evidence items" value={data.kpis.evidenceCount} icon={Paperclip} />
        <KpiCard
          label="Reviews due in 60 days"
          value={data.kpis.dueForReview}
          icon={CalendarClock}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <RiskHeatmap data={data.heatmap} />
        <TrendChart data={data.trend} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.upcomingReviews.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing due for review in the next 60 days.
              </p>
            )}
            {data.upcomingReviews.map((d) => (
              <Link
                key={d.id}
                href={`/dpias/${d.id}`}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-section-wash"
              >
                <span className="min-w-0 truncate">
                  <span className="font-mono text-xs text-muted-foreground">{d.reference}</span>{' '}
                  <span className="text-ink">{d.title}</span>
                </span>
                <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                  {formatDate(d.nextReviewAt)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent workflow activity.</p>
            )}
            {data.recentActivity.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-mono text-xs text-muted-foreground">{a.dpia}</span>{' '}
                  <span className="text-ink">
                    {a.from} → {a.to}
                  </span>
                </span>
                <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(a.at)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
