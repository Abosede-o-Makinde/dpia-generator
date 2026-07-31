'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ComplianceSummary {
  framework: string;
  mappedControls: number;
  implementedControls: number;
  coverage: number;
  gaps: Array<{ id: string; key: string; name: string }>;
}

interface Control {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  mappings: Array<{ framework: string; reference: string; title: string }>;
}

export default function ControlsPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['compliance-summary'],
    queryFn: () => apiFetch<ComplianceSummary[]>('/v1/controls/compliance-summary'),
  });
  const { data: controls, isLoading: controlsLoading } = useQuery({
    queryKey: ['controls'],
    queryFn: () => apiFetch<Control[]>('/v1/controls'),
  });

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
        Review the safeguards used to reduce DPIA risks and see how implemented controls map to
        privacy and security frameworks.
      </p>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Framework coverage</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Implementation progress across mapped standards.
            </p>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:block">
            {summary?.length ?? 0} frameworks
          </span>
        </div>

        <Card className="overflow-hidden rounded-xl shadow-sm">
          {summaryLoading ? (
            <div className="px-5 py-14 text-center text-sm text-muted-foreground">
              Loading framework coverage…
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3">
              {summary?.map((item) => (
                <div
                  key={item.framework}
                  className="border-b border-border p-5 sm:border-r xl:[&:nth-child(3n)]:border-r-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {item.framework.replace(/_/g, ' ')}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.implementedControls} of {item.mappedControls} controls implemented
                      </p>
                    </div>
                    <span className="text-lg font-semibold tabular-nums text-ink">
                      {item.coverage}%
                    </span>
                  </div>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, Math.max(0, item.coverage))}%` }}
                    />
                  </div>
                </div>
              ))}
              {!summaryLoading && summary?.length === 0 && (
                <p className="col-span-full px-5 py-14 text-center text-sm text-muted-foreground">
                  No framework mappings are available.
                </p>
              )}
            </div>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Control catalogue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Safeguards and their corresponding framework requirements.
            </p>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:block">
            {controls?.length ?? 0} controls
          </span>
        </div>

        <Card className="overflow-hidden rounded-xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b border-border bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-[24%] px-5 py-3.5 font-semibold">Control</th>
                  <th className="w-[15%] px-5 py-3.5 font-semibold">Category</th>
                  <th className="w-[31%] px-5 py-3.5 font-semibold">Description</th>
                  <th className="px-5 py-3.5 font-semibold">Framework mappings</th>
                </tr>
              </thead>
              <tbody>
                {controlsLoading && (
                  <tr>
                    <td colSpan={4} className="px-5 py-14 text-center text-muted-foreground">
                      Loading controls…
                    </td>
                  </tr>
                )}
                {!controlsLoading && controls?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-14 text-center text-muted-foreground">
                      No controls are available.
                    </td>
                  </tr>
                )}
                {controls?.map((control) => (
                  <tr
                    key={control.id}
                    className="border-b border-border align-top last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-ink">{control.name}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{control.key}</p>
                    </td>
                    <td className="px-5 py-4 capitalize text-muted-foreground">
                      {control.category.replace(/_/g, ' ').toLowerCase()}
                    </td>
                    <td className="px-5 py-4 leading-6 text-muted-foreground">
                      {control.description}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {control.mappings.slice(0, 5).map((mapping) => (
                          <Badge
                            key={`${mapping.framework}-${mapping.reference}`}
                            variant="outline"
                            className="rounded-md bg-white px-2 py-1 text-xs font-medium"
                            title={mapping.title}
                          >
                            {mapping.framework.replace(/_/g, ' ')} {mapping.reference}
                          </Badge>
                        ))}
                        {control.mappings.length > 5 && (
                          <Badge
                            variant="outline"
                            className="rounded-md bg-slate-50 px-2 py-1 text-xs font-medium"
                          >
                            +{control.mappings.length - 5}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
