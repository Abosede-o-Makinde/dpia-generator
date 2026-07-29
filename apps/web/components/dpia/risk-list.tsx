'use client';

import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { RiskBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEvaluateRisks } from '@/hooks/use-dpias';

interface Risk {
  id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  inherentScore: number;
  residualScore: number;
  level: string;
  residualLevel: string;
  status: string;
  references: string[];
}

export function RiskList({ dpiaId, risks }: { dpiaId: string; risks: Risk[] }) {
  const evaluate = useEvaluateRisks(dpiaId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {risks.length} risk{risks.length === 1 ? '' : 's'} identified from the questionnaire and
          data-flow assessment
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => evaluate.mutate()}
          loading={evaluate.isPending}
        >
          Re-run risk assessment
        </Button>
      </div>

      {risks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8" />
            <p>
              No risks have been identified yet. Complete the questionnaire and run the risk
              assessment.
            </p>
          </CardContent>
        </Card>
      )}

      {risks.map((r) => (
        <Card key={r.id}>
          <CardContent className="space-y-2 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="font-medium">{r.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
              </div>
              <RiskBadge level={r.residualLevel} />
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Likelihood {r.likelihood}/5</span>
              <span>Impact {r.impact}/5</span>
              <span>Inherent {r.inherentScore}</span>
              <span>Residual {r.residualScore}</span>
              <span>Status: {r.status}</span>
            </div>
            {r.references.length > 0 && (
              <p className="text-xs text-muted-foreground">{r.references.join(' · ')}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
