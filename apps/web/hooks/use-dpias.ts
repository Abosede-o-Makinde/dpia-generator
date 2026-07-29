'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QuestionnaireTemplate } from '@shieldwise/shared';
import { apiFetch } from '@/lib/api-client';

export interface DpiaListItem {
  id: string;
  reference: string;
  title: string;
  status: string;
  completeness: number;
  ownerId: string;
  dueDate: string | null;
  nextReviewAt: string | null;
  updatedAt: string;
  project: { id: string; name: string } | null;
  _count: { risks: number; comments: number };
}

export interface DpiaDetail {
  id: string;
  organisationId: string;
  reference: string;
  title: string;
  description: string | null;
  status: string;
  answers: Record<string, unknown>;
  completeness: number;
  dataFlow: unknown;
  classification: Record<string, unknown> | null;
  template: { key: string; name: string; version: number };
  questionnaire: {
    sections: Array<{
      key: string;
      title: string;
      description?: string;
      questions: Array<Record<string, unknown>>;
    }>;
    missingRequired: string[];
    completeness: number;
  };
  availableTransitions: Array<{ to: string; action: string; requiresComment?: boolean }>;
  editable: boolean;
  risks: Array<Record<string, unknown>>;
  workflowEvents: Array<{
    fromStatus: string;
    toStatus: string;
    comment: string | null;
    createdAt: string;
  }>;
}

export function useDpias(params: { status?: string; page?: number; search?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  qs.set('page', String(params.page ?? 1));
  return useQuery({
    queryKey: ['dpias', params],
    queryFn: () =>
      apiFetch<{ items: DpiaListItem[]; total: number; totalPages: number }>(`/v1/dpias?${qs}`),
  });
}

export function useDpia(id: string) {
  return useQuery({
    queryKey: ['dpia', id],
    queryFn: () => apiFetch<DpiaDetail>(`/v1/dpias/${id}`),
    enabled: !!id,
  });
}

export function useCreateDpia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string; templateKey?: string }) =>
      apiFetch<{ id: string }>('/v1/dpias', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dpias'] }),
  });
}

export function usePatchAnswers(dpiaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answers: Record<string, unknown>) =>
      apiFetch<{ answers: Record<string, unknown>; questionnaire: DpiaDetail['questionnaire'] }>(
        `/v1/dpias/${dpiaId}/answers`,
        { method: 'PATCH', body: { answers } },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dpia', dpiaId] }),
  });
}

export function useTransition(dpiaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { to: string; comment?: string }) =>
      apiFetch(`/v1/dpias/${dpiaId}/transition`, { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dpia', dpiaId] });
      qc.invalidateQueries({ queryKey: ['dpias'] });
    },
  });
}

export function useEvaluateRisks(dpiaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/v1/dpias/${dpiaId}/evaluate-risks`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dpia', dpiaId] }),
  });
}

export type { QuestionnaireTemplate };
