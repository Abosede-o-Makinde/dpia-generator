import { z } from 'zod';
import { RISK_LEVELS, RISK_STATUSES } from '@shieldwise/shared';

export const listRisksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  level: z.enum(RISK_LEVELS).optional(),
  status: z.enum(RISK_STATUSES).optional(),
  dpiaId: z.string().uuid().optional(),
});
export type ListRisksDto = z.infer<typeof listRisksSchema>;

export const createRiskSchema = z.object({
  dpiaId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  category: z.string().max(60).default('privacy'),
  likelihood: z.number().int().min(1).max(5),
  impact: z.number().int().min(1).max(5),
  ownerId: z.string().uuid().optional(),
  dueDate: z.coerce.date().optional(),
});
export type CreateRiskDto = z.infer<typeof createRiskSchema>;

export const updateRiskSchema = z.object({
  status: z.enum(RISK_STATUSES).optional(),
  treatment: z.string().max(5000).optional(),
  ownerId: z.string().uuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});
export type UpdateRiskDto = z.infer<typeof updateRiskSchema>;

export const controlStatusSchema = z.object({
  status: z.enum(['RECOMMENDED', 'PLANNED', 'IN_PROGRESS', 'IMPLEMENTED', 'NOT_APPLICABLE']),
});
export type ControlStatusDto = z.infer<typeof controlStatusSchema>;
