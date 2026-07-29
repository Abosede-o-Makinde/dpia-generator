'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRisks } from '@/hooks/use-risks';
import { Card } from '@/components/ui/card';
import { RiskBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export default function RisksPage() {
  const [level, setLevel] = useState<string | undefined>();
  const { data, isLoading } = useRisks({ level });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review privacy risks identified from DPIA answers and data flows, including their residual
        risk after controls.
      </p>

      <div className="flex gap-2">
        <Button
          variant={!level ? 'default' : 'outline'}
          size="sm"
          onClick={() => setLevel(undefined)}
        >
          All
        </Button>
        {LEVELS.map((l) => (
          <Button
            key={l}
            variant={level === l ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLevel(l)}
          >
            {l}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">DPIA</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Residual</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Controls</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {data?.items.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="max-w-xs px-4 py-3">
                  <p className="font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.description}</p>
                </td>
                <td className="px-4 py-3">
                  {r.dpia ? (
                    <Link
                      href={`/dpias/${r.dpia.id}`}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {r.dpia.reference}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Manual</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.category}</td>
                <td className="px-4 py-3">
                  <RiskBadge level={r.residualLevel} />
                  <span className="ml-2 text-xs text-muted-foreground">{r.residualScore}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.controlLinks.slice(0, 3).map((c) => (
                      <span
                        key={c.control.id}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px]',
                          c.status === 'IMPLEMENTED'
                            ? 'border-risk-low/30 bg-risk-low/10 text-risk-low'
                            : 'border-border text-muted-foreground',
                        )}
                      >
                        {c.control.name}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
