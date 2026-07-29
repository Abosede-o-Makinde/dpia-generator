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
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

interface LoginResult {
  mfaRequired: boolean;
  mfaToken?: string;
  tokens?: { accessToken: string; refreshToken: string };
}

export default function LoginPage() {
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
      const result = await apiFetch<LoginResult>('/v1/auth/login', {
        method: 'POST',
        body: values,
        skipOrgHeader: true,
      });
      if (result.mfaRequired && result.mfaToken) {
        sessionStorage.setItem('shieldwise_mfa_token', result.mfaToken);
        window.location.href = '/mfa';
        return;
      }
      if (result.tokens) {
        await login(result.tokens.accessToken, result.tokens.refreshToken);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    }
  }

  return (
    <AuthSplitLayout
      title="Log in"
      subtitle="Sign in to continue drafting, reviewing, and approving Data Protection Impact Assessments."
    >
      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
            autoComplete="current-password"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        {error && (
          <p className="rounded-2xl bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <Button type="submit" className="h-11 w-full text-sm font-semibold" loading={isSubmitting}>
          Log in
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
