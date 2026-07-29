'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuestionRenderer } from './question-renderer';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { usePatchAnswers, type DpiaDetail } from '@/hooks/use-dpias';
import { apiFetch } from '@/lib/api-client';

interface Props {
  dpia: DpiaDetail;
}

export function QuestionnaireWizard({ dpia }: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(dpia.answers);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const patchAnswers = usePatchAnswers(dpia.id);

  useEffect(() => {
    setAnswers(dpia.answers);
  }, [dpia.answers]);

  const debouncedSave = useDebouncedCallback(async (patch: Record<string, unknown>) => {
    setSaveState('saving');
    await patchAnswers.mutateAsync(patch);
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 1500);
  }, 700);

  function handleChange(key: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    debouncedSave({ [key]: value });
  }

  async function handleImprove(questionKey: string, draft: string): Promise<string> {
    const result = await apiFetch<{ improved: string; issues: string[] }>('/v1/ai/improve-answer', {
      method: 'POST',
      body: { dpiaId: dpia.id, questionKey, draft },
    });
    return result.improved;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
        <span>{dpia.questionnaire.completeness}% of required DPIA questions complete</span>
        <span className="flex items-center gap-1">
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'saved' && (
            <>
              <Check className="h-3 w-3 text-risk-low" /> Saved
            </>
          )}
        </span>
      </div>

      {dpia.questionnaire.sections.map((section) => (
        <Card key={section.key}>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {section.questions.map((q) => (
              <QuestionRenderer
                key={q.key as string}
                question={q as never}
                value={answers[q.key as string]}
                onChange={(v) => handleChange(q.key as string, v)}
                disabled={!dpia.editable}
                onImprove={
                  dpia.editable ? (draft) => handleImprove(q.key as string, draft) : undefined
                }
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
