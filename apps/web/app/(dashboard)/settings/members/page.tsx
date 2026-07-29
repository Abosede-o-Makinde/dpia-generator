'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Member {
  id: string;
  role: string;
  user: { id: string; email: string; displayName: string; lastLoginAt: string | null };
}

const ROLES = [
  'OWNER',
  'ADMIN',
  'DPO',
  'PRIVACY_ENGINEER',
  'SECURITY_REVIEWER',
  'LEGAL_REVIEWER',
  'CONTRIBUTOR',
  'VIEWER',
];

export default function MembersPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CONTRIBUTOR');
  const [error, setError] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['org-members'],
    queryFn: () => apiFetch<Member[]>('/v1/orgs/members'),
  });

  async function addMember() {
    setError(null);
    try {
      await apiFetch('/v1/orgs/members', { method: 'POST', body: { email, role } });
      setEmail('');
      await qc.invalidateQueries({ queryKey: ['org-members'] });
    } catch {
      setError('Could not add member — check the email is a registered account.');
    }
  }

  async function updateRole(membershipId: string, newRole: string) {
    await apiFetch(`/v1/orgs/members/${membershipId}`, {
      method: 'PATCH',
      body: { role: newRole },
    });
    await qc.invalidateQueries({ queryKey: ['org-members'] });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">
        Manage who has access to this organisation and their role
      </p>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex h-10 rounded-md border border-border bg-card px-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={() => void addMember()} disabled={!email.trim()}>
          Add member
        </Button>
        {error && <p className="w-full text-sm text-destructive">{error}</p>}
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{m.user.displayName}</td>
                <td className="px-4 py-3 text-muted-foreground">{m.user.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={m.role}
                    onChange={(e) => void updateRole(m.id, e.target.value)}
                    className="rounded-md border border-border bg-card px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  {m.role === 'OWNER' && (
                    <Badge variant="default" className="ml-2">
                      Owner
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
