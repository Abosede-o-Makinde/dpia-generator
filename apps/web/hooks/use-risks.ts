'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  residualScore: number;
  residualLevel: string;
  status: string;
  dpia: { id: string; reference: string; title: string } | null;
  controlLinks: Array<{ status: string; control: { id: string; key: string; name: string } }>;
}

export function useRisks(params: { level?: string; status?: string; page?: number } = {}) {
  const qs = new URLSearchParams();
  if (params.level) qs.set('level', params.level);
  if (params.status) qs.set('status', params.status);
  qs.set('page', String(params.page ?? 1));
  return useQuery({
    queryKey: ['risks', params],
    queryFn: () => apiFetch<{ items: RiskItem[]; total: number }>(`/v1/risks?${qs}`),
  });
}
