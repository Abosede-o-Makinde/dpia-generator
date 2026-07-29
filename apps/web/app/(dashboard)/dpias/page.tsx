'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useDpias } from '@/hooks/use-dpias';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export default function DpiasPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useDpias({ search: search || undefined });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Create, complete, review, and revisit your organisation&apos;s DPIAs.
        </p>
        <Link href="/dpias/new">
          <Button>
            <Plus className="h-4 w-4" /> New DPIA
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title or reference…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Completeness</th>
              <th className="px-4 py-3 font-medium">Risks</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {data?.items.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No DPIAs yet — start with the processing activity you need to assess.
                </td>
              </tr>
            )}
            {data?.items.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/dpias/${d.id}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {d.reference}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dpias/${d.id}`} className="hover:underline">
                    {d.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={d.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${d.completeness}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{d.completeness}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{d._count.risks}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(d.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
