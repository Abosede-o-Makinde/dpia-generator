'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText } from 'lucide-react';
import { apiFetch, apiUpload } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

interface EvidenceItem {
  id: string;
  filename: string;
  type: string;
  sizeBytes: number;
  createdAt: string;
  dpiaLinks: Array<{ dpia: { id: string; reference: string; title: string } }>;
}

export default function EvidencePage() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { data } = useQuery({
    queryKey: ['evidence'],
    queryFn: () => apiFetch<EvidenceItem[]>('/v1/evidence'),
  });

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Upload policies, contracts, assessments, and technical records that support DPIA answers
          and demonstrate implemented controls.
        </p>
        <input ref={fileInput} type="file" className="hidden" onChange={handleFile} />
        <Button onClick={() => fileInput.current?.click()} loading={uploading}>
          <Upload className="h-4 w-4" /> Upload evidence
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((e) => (
          <Card key={e.id}>
            <CardContent className="flex items-start gap-3 p-4">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{e.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {e.type} · {(e.sizeBytes / 1024).toFixed(0)} KB · {formatDate(e.createdAt)}
                </p>
                {e.dpiaLinks.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Linked: {e.dpiaLinks.map((l) => l.dpia.reference).join(', ')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {data?.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            No evidence uploaded yet. Add documents that support an assessment or control.
          </p>
        )}
      </div>
    </div>
  );
}
