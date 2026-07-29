'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  _count: { memberships: number; dpias: number; risks: number };
}

export default function OrganisationSettingsPage() {
  const { data } = useQuery({
    queryKey: ['org-current'],
    queryFn: () => apiFetch<OrgDetail>('/v1/orgs/current'),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-muted-foreground">
        <Link href="/settings/members" className="font-medium text-primary hover:underline">
          Manage members
        </Link>
      </p>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle>{data.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{data.slug}</p>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-light tracking-tight text-ink">{data._count.memberships}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
            <div>
              <p className="text-2xl font-light tracking-tight text-ink">{data._count.dpias}</p>
              <p className="text-xs text-muted-foreground">DPIAs</p>
            </div>
            <div>
              <p className="text-2xl font-light tracking-tight text-ink">{data._count.risks}</p>
              <p className="text-xs text-muted-foreground">Risks</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
