import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** 5x5 likelihood x impact heat map. Cell colour scales with likelihood*impact severity. */
export function RiskHeatmap({ data }: { data: number[][] }) {
  const max = Math.max(1, ...data.flat());

  function cellClass(likelihood: number, impact: number, count: number): string {
    const severity = (likelihood + 1) * (impact + 1);
    if (count === 0) return 'bg-muted text-muted-foreground/40';
    if (severity >= 20) return 'bg-risk-critical text-white';
    if (severity >= 12) return 'bg-risk-high text-white';
    if (severity >= 6) return 'bg-risk-medium text-white';
    return 'bg-risk-low text-white';
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Risk heat map</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center">
        <div className="flex w-full max-w-[300px] gap-3">
          <div className="flex flex-col justify-between py-1 text-xs text-muted-foreground">
            {[5, 4, 3, 2, 1].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="grid grid-cols-5 gap-1">
              {[4, 3, 2, 1, 0].map((likelihoodIdx) =>
                [0, 1, 2, 3, 4].map((impactIdx) => {
                  const count = data[likelihoodIdx]?.[impactIdx] ?? 0;
                  return (
                    <div
                      key={`${likelihoodIdx}-${impactIdx}`}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-lg text-sm font-medium',
                        cellClass(likelihoodIdx, impactIdx, count),
                      )}
                      title={`Likelihood ${likelihoodIdx + 1}, Impact ${impactIdx + 1}: ${count} risk(s)`}
                      style={{ opacity: count === 0 ? 1 : 0.55 + (0.45 * count) / max }}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  );
                }),
              )}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>Impact →</span>
              <span>5</span>
            </div>
          </div>
        </div>
        <span className="sr-only">Likelihood increases from bottom to top.</span>
      </CardContent>
    </Card>
  );
}
