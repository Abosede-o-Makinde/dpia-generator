'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface QuestionOption {
  value: string;
  label: string;
}

interface Question {
  key: string;
  type: string;
  label: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
  options?: QuestionOption[];
  references?: string[];
  min?: number;
  max?: number;
}

interface Props {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  onImprove?: (draft: string) => Promise<string>;
}

export function QuestionRenderer({ question, value, onChange, disabled, onImprove }: Props) {
  const [improving, setImproving] = useState(false);

  async function handleImprove() {
    if (!onImprove || typeof value !== 'string' || !value.trim()) return;
    setImproving(true);
    try {
      const improved = await onImprove(value);
      onChange(improved);
    } finally {
      setImproving(false);
    }
  }

  const supportsAiImprove = ['TEXT', 'TEXTAREA'].includes(question.type) && !!onImprove;

  return (
    <div className="space-y-1.5 border-b border-border/60 py-4 first:pt-0 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <Label htmlFor={question.key} className="text-sm">
          {question.label}
          {question.required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
        {supportsAiImprove && !disabled && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleImprove}
            loading={improving}
            className="h-7 shrink-0 text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" /> Improve with AI
          </Button>
        )}
      </div>
      {question.help && <p className="text-xs text-muted-foreground">{question.help}</p>}

      {(question.type === 'TEXT' || question.type === 'NUMBER' || question.type === 'DATE') && (
        <Input
          id={question.key}
          type={question.type === 'NUMBER' ? 'number' : question.type === 'DATE' ? 'date' : 'text'}
          placeholder={question.placeholder}
          value={(value as string | number | undefined) ?? ''}
          onChange={(e) =>
            onChange(question.type === 'NUMBER' ? Number(e.target.value) : e.target.value)
          }
          disabled={disabled}
        />
      )}

      {question.type === 'TEXTAREA' && (
        <Textarea
          id={question.key}
          placeholder={question.placeholder}
          value={(value as string | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={4}
        />
      )}

      {question.type === 'BOOLEAN' && (
        <div className="flex gap-2">
          {[
            { v: true, label: 'Yes' },
            { v: false, label: 'No' },
          ].map((opt) => (
            <button
              key={String(opt.v)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.v)}
              className={`rounded-md border px-4 py-1.5 text-sm transition-colors ${
                value === opt.v
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {question.type === 'SINGLE_SELECT' && (
        <select
          id={question.key}
          value={(value as string | undefined) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <option value="">Select…</option>
          {question.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {question.type === 'MULTI_SELECT' && (
        <div className="flex flex-wrap gap-2">
          {question.options?.map((o) => {
            const selected = Array.isArray(value) && value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                disabled={disabled}
                onClick={() => {
                  const current = Array.isArray(value) ? (value as string[]) : [];
                  onChange(selected ? current.filter((v) => v !== o.value) : [...current, o.value]);
                }}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}

      {question.type === 'SCALE' && (
        <div className="flex items-center gap-3">
          <input
            id={question.key}
            type="range"
            min={question.min ?? 1}
            max={question.max ?? 5}
            value={(value as number | undefined) ?? question.min ?? 1}
            onChange={(e) => onChange(Number(e.target.value))}
            disabled={disabled}
            className="flex-1"
          />
          <span className="w-6 text-center text-sm">{(value as number) ?? question.min ?? 1}</span>
        </div>
      )}

      {question.references && question.references.length > 0 && (
        <p className="text-xs text-muted-foreground">{question.references.join(' · ')}</p>
      )}
    </div>
  );
}
