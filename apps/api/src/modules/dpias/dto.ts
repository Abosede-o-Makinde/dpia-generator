import { z } from 'zod';
import { DPIA_STATUSES } from '@shieldwise/shared';

export const createDpiaSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid().optional(),
  /** Template key; defaults to the built-in UK DPIA template. */
  templateKey: z.string().default('uk-dpia'),
});
export type CreateDpiaDto = z.infer<typeof createDpiaSchema>;

export const updateDpiaSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional(),
  projectId: z.string().uuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
});
export type UpdateDpiaDto = z.infer<typeof updateDpiaSchema>;

export const patchAnswersSchema = z.object({
  /** Partial answer map; null clears an answer. */
  answers: z.record(z.unknown()),
});
export type PatchAnswersDto = z.infer<typeof patchAnswersSchema>;

export const transitionSchema = z.object({
  to: z.enum(DPIA_STATUSES),
  comment: z.string().max(5000).optional(),
});
export type TransitionDto = z.infer<typeof transitionSchema>;

export const commentSchema = z.object({
  body: z.string().min(1).max(10_000),
  questionKey: z.string().max(200).optional(),
});
export type CommentDto = z.infer<typeof commentSchema>;

export const listDpiasSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(DPIA_STATUSES).optional(),
  projectId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});
export type ListDpiasDto = z.infer<typeof listDpiasSchema>;

// Data flow modeller ---------------------------------------------------------

export const dataFlowNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['system', 'api', 'database', 'user', 'vendor', 'cloud_service']),
  label: z.string().min(1).max(200),
  /** ISO 3166-1 alpha-2 country where the node processes/stores data. */
  country: z.string().length(2).optional(),
  /** Trust zone, e.g. "internal", "dmz", "third-party". */
  trustZone: z.string().max(60).optional(),
  isProcessor: z.boolean().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type DataFlowNode = z.infer<typeof dataFlowNodeSchema>;

export const dataFlowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().max(200).optional(),
  dataCategories: z.array(z.string()).default([]),
  encrypted: z.boolean().optional(),
});
export type DataFlowEdge = z.infer<typeof dataFlowEdgeSchema>;

export const dataFlowSchema = z.object({
  nodes: z.array(dataFlowNodeSchema),
  edges: z.array(dataFlowEdgeSchema),
});
export type DataFlowDto = z.infer<typeof dataFlowSchema>;
