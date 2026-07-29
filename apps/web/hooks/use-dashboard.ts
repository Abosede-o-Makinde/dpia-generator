'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface DashboardData {
  kpis: { totalDpias: number; openHighRisks: number; evidenceCount: number; dueForReview: number };
  dpiasByStatus: Record<string, number>;
  risksByLevel: Record<string, number>;
  heatmap: number[][];
  trend: Array<{ month: string; total: number; highOrCritical: number }>;
  upcomingReviews: Array<{ id: string; reference: string; title: string; nextReviewAt: string }>;
  recentActivity: Array<{ dpia: string; title: string; from: string; to: string; at: string }>;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardData>('/v1/analytics/dashboard'),
  });
}
