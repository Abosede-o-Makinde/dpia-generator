'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateDpia } from '@/hooks/use-dpias';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api-client';

const schema = z.object({
  title: z.string().min(3, 'At least 3 characters'),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function NewDpiaPage() {
  const router = useRouter();
  const createDpia = useCreateDpia();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const dpia = await createDpia.mutateAsync({ ...values, templateKey: 'uk-dpia' });
      router.push(`/dpias/${dpia.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create DPIA');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Start a DPIA</CardTitle>
          <CardDescription>
            Name the project, system, or processing activity you need to assess. Shieldwise will
            create a draft using the guided UK GDPR questionnaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1.5">
              <Label htmlFor="title">Processing activity</Label>
              <Input
                id="title"
                placeholder="e.g. AI-assisted patient triage chatbot"
                {...register('title')}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">What are you planning? (optional)</Label>
              <Textarea
                id="description"
                rows={4}
                placeholder="Briefly describe the purpose, people affected, personal data used, and any suppliers or systems involved."
                {...register('description')}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" loading={isSubmitting}>
              Start questionnaire
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
