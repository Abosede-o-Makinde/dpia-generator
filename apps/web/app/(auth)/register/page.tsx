'use client';

import { useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { PasswordInput } from '@/components/auth/password-input';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

const schema = z.object({
  displayName: z.string().min(1, 'Required'),
  email: z.string().email(),
  password: z.string().min(12, 'At least 12 characters'),
  organisationName: z.string().min(2, 'Required'),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setError(null);
    try {
      const result = await apiFetch<{ tokens?: { accessToken: string; refreshToken: string } }>(
        '/v1/auth/register',
        { method: 'POST', body: values, skipOrgHeader: true },
      );
      if (result.tokens) {
        await login(result.tokens.accessToken, result.tokens.refreshToken);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    }
  }

  return (
    <AuthSplitLayout
      title="Sign up"
      subtitle="Create your organisation, then generate your first UK GDPR DPIA from the built-in questionnaire."
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-ink">
              Your name
            </Label>
            <Input
              id="displayName"
              autoComplete="name"
              placeholder="Alex Morgan"
              className="focus-visible:border-primary"
              {...register('displayName')}
            />
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="organisationName" className="text-ink">
              Organisation
            </Label>
            <Input
              id="organisationName"
              placeholder="Acme Health Trust"
              className="focus-visible:border-primary"
              {...register('organisationName')}
            />
            {errors.organisationName && (
              <p className="text-xs text-destructive">{errors.organisationName.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-ink">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@organisation.gov.uk"
            className="focus-visible:border-primary"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-ink">
            Password
          </Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="At least 12 characters"
            {...register('password')}
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {error && (
          <p className="rounded-2xl bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          className="mt-1 h-11 w-full text-sm font-semibold"
          loading={isSubmitting}
        >
          Create account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
