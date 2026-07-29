'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { useTransition, type DpiaDetail } from '@/hooks/use-dpias';
import { ApiError } from '@/lib/api-client';

export function WorkflowActions({ dpia }: { dpia: DpiaDetail }) {
  const transition = useTransition(dpia.id);
  const [pending, setPending] = useState<{
    to: string;
    action: string;
    requiresComment?: boolean;
  } | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!pending) return;
    setError(null);
    try {
      await transition.mutateAsync({ to: pending.to, comment: comment || undefined });
      setPending(null);
      setComment('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Transition failed');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge status={dpia.status} />
      <div className="flex flex-wrap gap-2">
        {dpia.availableTransitions.map((t) => (
          <Button key={t.to} variant="outline" size="sm" onClick={() => setPending(t)}>
            {t.action}
          </Button>
        ))}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl">
            <h3 className="font-semibold">{pending.action}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {pending.requiresComment
                ? 'Explain this decision. The comment will be included in the DPIA audit history.'
                : 'Add an optional note to the DPIA audit history.'}
            </p>
            <Textarea
              className="mt-3"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Record the reason for this workflow decision…"
            />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button
                onClick={confirm}
                loading={transition.isPending}
                disabled={pending.requiresComment && !comment.trim()}
              >
                Confirm decision
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
