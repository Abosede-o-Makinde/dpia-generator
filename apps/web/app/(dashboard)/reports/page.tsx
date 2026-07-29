'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';

interface ReportExport {
  id: string;
  template: string;
  format: string;
  createdAt: string;
  dpia: { reference: string; title: string } | null;
}

export default function ReportsPage() {
  const { data } = useQuery({
    queryKey: ['report-exports'],
    queryFn: () => apiFetch<ReportExport[]>('/v1/reports/exports'),
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Downloadable records of completed DPIA content, risks, controls, evidence, and approval
        history. Generate an export from the relevant assessment.
      </p>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">DPIA</th>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 font-medium">Format</th>
              <th className="px-4 py-3 font-medium">Generated</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  {r.dpia ? `${r.dpia.reference} — ${r.dpia.title}` : '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.template}</td>
                <td className="px-4 py-3 uppercase text-muted-foreground">{r.format}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(r.createdAt)}</td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No DPIA reports generated yet. Open an assessment to create an export.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
