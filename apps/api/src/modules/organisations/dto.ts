import { z } from 'zod';
import { ROLES } from '@shieldwise/shared';

export const updateOrgSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  industry: z.string().max(80).optional(),
  settings: z.record(z.unknown()).optional(),
});
export type UpdateOrgDto = z.infer<typeof updateOrgSchema>;

export const createDepartmentSchema = z.object({ name: z.string().min(1).max(120) });
export const createTeamSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(1).max(120),
});
export const createProjectSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
  departmentId: z.string().uuid().optional(),
});
export type CreateProjectDto = z.infer<typeof createProjectSchema>;

export const addMemberSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(ROLES).default('CONTRIBUTOR'),
  departmentId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
});
export type AddMemberDto = z.infer<typeof addMemberSchema>;

export const updateMemberSchema = z.object({
  role: z.enum(ROLES),
});
export type UpdateMemberDto = z.infer<typeof updateMemberSchema>;
