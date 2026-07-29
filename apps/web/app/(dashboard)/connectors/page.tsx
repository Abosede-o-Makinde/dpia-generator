'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Cloud, Plus, Play } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

interface Connector {
  id: string;
  provider: string;
  name: string;
  status: string;
  lastScanAt: string | null;
  _count: { scans: number };
}

const PROVIDERS = ['AWS', 'TERRAFORM', 'DOCKER', 'KUBERNETES'] as const;

export default function ConnectorsPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>('TERRAFORM');

  const { data } = useQuery({
    queryKey: ['connectors'],
    queryFn: () => apiFetch<Connector[]>('/v1/connectors'),
  });

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await apiFetch('/v1/connectors', { method: 'POST', body: { provider, name, config: {} } });
      setName('');
      await qc.invalidateQueries({ queryKey: ['connectors'] });
    } finally {
      setCreating(false);
    }
  }

  async function scan(id: string) {
    await apiFetch(`/v1/connectors/${id}/scan`, { method: 'POST', body: { files: [] } });
    await qc.invalidateQueries({ queryKey: ['connectors'] });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Scan supported infrastructure for encryption, access-control, public-exposure, and secrets
        findings that may affect a DPIA.
      </p>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as never)}
              className="flex h-10 rounded-md border border-border bg-card px-3 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label>Connector name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production AWS account"
            />
          </div>
          <Button onClick={() => void create()} disabled={!name.trim()} loading={creating}>
            <Plus className="h-4 w-4" /> Add connector
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{c.name}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => void scan(c.id)}>
                  <Play className="h-3.5 w-3.5" /> Scan
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {c.provider} · {c._count.scans} scan{c._count.scans === 1 ? '' : 's'} · last:{' '}
                {formatDate(c.lastScanAt)}
              </p>
            </CardContent>
          </Card>
        ))}
        {data?.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No connectors configured yet.
          </p>
        )}
      </div>
    </div>
  );
}
