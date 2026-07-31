'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Search } from 'lucide-react';
import { apiFetch, apiUpload } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

interface EvidenceItem {
  id: string;
  filename: string;
  type: string;
  sizeBytes: number;
  createdAt: string;
  dpiaLinks: Array<{ dpia: { id: string; reference: string; title: string } }>;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EvidencePage() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => apiFetch<EvidenceItem[]>('/v1/evidence'),
  });
  const filteredEvidence = data?.filter((item) =>
    item.filename.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'OTHER');
      await apiUpload('/v1/evidence', formData);
      await qc.invalidateQueries({ queryKey: ['evidence'] });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Upload policies, contracts, assessments, and technical records that support DPIA answers
          and demonstrate implemented controls.
        </p>
        <input ref={fileInput} type="file" className="hidden" onChange={handleFile} />
        <Button
          className="shrink-0 rounded-lg shadow-none"
          onClick={() => fileInput.current?.click()}
          loading={uploading}
        >
          <Upload className="h-4 w-4" /> Upload evidence
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search evidence"
            className="h-10 rounded-lg pl-10"
          />
        </div>
        <p className="hidden text-sm text-muted-foreground sm:block">
          {data?.length ?? 0} {data?.length === 1 ? 'file' : 'files'}
        </p>
      </div>

      <Card className="overflow-hidden rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-border bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3.5 font-semibold">File</th>
                <th className="px-5 py-3.5 font-semibold">Type</th>
                <th className="px-5 py-3.5 font-semibold">Size</th>
                <th className="px-5 py-3.5 font-semibold">Linked DPIAs</th>
                <th className="px-5 py-3.5 font-semibold">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-muted-foreground">
                    Loading evidence…
                  </td>
                </tr>
              )}
              {!isLoading && filteredEvidence?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <FileText className="mx-auto mb-3 size-6 text-slate-400" />
                    <p className="font-medium text-ink">
                      {search ? 'No matching evidence' : 'No evidence uploaded yet'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {search
                        ? 'Try another filename.'
                        : 'Upload a document to support an assessment or control.'}
                    </p>
                    {!search && (
                      <Button
                        variant="outline"
                        className="mt-4 rounded-lg"
                        onClick={() => fileInput.current?.click()}
                      >
                        <Upload className="size-4" /> Upload your first file
                      </Button>
                    )}
                  </td>
                </tr>
              )}
              {filteredEvidence?.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50">
                        <FileText className="size-4 text-slate-500" />
                      </div>
                      <span className="max-w-sm truncate font-medium text-ink">
                        {item.filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.type.replace(/_/g, ' ')}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {formatFileSize(item.sizeBytes)}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {item.dpiaLinks.length > 0
                      ? item.dpiaLinks.map((link) => link.dpia.reference).join(', ')
                      : '—'}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
