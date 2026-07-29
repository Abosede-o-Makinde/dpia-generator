'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiFetch, ApiError } from '@/lib/api-client';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function MfaPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('shieldwise_mfa_token');
    if (!token) {
      router.replace('/login');
      return;
    }
    setMfaToken(token);
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setLoading(true);
    try {
      const result = await apiFetch<{ tokens?: { accessToken: string; refreshToken: string } }>(
        '/v1/auth/mfa/verify',
        { method: 'POST', body: { mfaToken, code }, skipOrgHeader: true },
      );
      sessionStorage.removeItem('shieldwise_mfa_token');
      if (result.tokens) {
        await login(result.tokens.accessToken, result.tokens.refreshToken);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      title="Verify access"
      subtitle="Enter the 6-digit code from your authenticator app, or a recovery code."
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-2">
          <Label htmlFor="code" className="text-ink">
            Authentication code
          </Label>
          <Input
            id="code"
            autoFocus
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="tracking-[0.3em] focus-visible:border-primary"
          />
        </div>
        {error && (
          <p className="rounded-2xl bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <Button type="submit" className="h-11 w-full text-sm font-semibold" loading={loading}>
          Verify and continue
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
