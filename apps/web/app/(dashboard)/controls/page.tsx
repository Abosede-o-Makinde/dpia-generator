'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const { data: summary } = useQuery({
    queryKey: ['compliance-summary'],
    queryFn: () => apiFetch<ComplianceSummary[]>('/v1/controls/compliance-summary'),
  });
  const { data: controls } = useQuery({
    queryKey: ['controls'],
    queryFn: () => apiFetch<Control[]>('/v1/controls'),
  });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review the safeguards used to reduce DPIA risks and see how implemented controls map to
        privacy and security frameworks.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summary?.map((s) => (
          <Card key={s.framework}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {s.framework.replace(/_/g, ' ')}
              </p>
              <p className="mt-1 text-xl font-semibold">{s.coverage}%</p>
              <p className="text-xs text-muted-foreground">
                {s.implementedControls}/{s.mappedControls} controls
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {controls?.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="text-sm">{c.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{c.description}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-1 pt-0">
              {c.mappings.slice(0, 6).map((m, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {m.framework.replace(/_/g, ' ')} {m.reference}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
