import type { DpiaStatus, Role } from './enums.js';

/**
 * DPIA workflow state machine.
 * Single source of truth for allowed transitions and who may perform them.
 * The API enforces this server-side; the UI uses it to render available actions.
 */
export interface Transition {
  to: DpiaStatus;
  /** Roles allowed to trigger the transition (ANY match). */
  roles: Role[];
  /** Human-readable action label, e.g. "Submit for review". */
  action: string;
  /** Requires a comment/justification to be recorded. */
  requiresComment?: boolean;
}

export const DPIA_WORKFLOW: Record<DpiaStatus, Transition[]> = {
  DRAFT: [
    {
      to: 'SUBMITTED',
      roles: ['OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'CONTRIBUTOR'],
      action: 'Submit for review',
    },
    { to: 'ARCHIVED', roles: ['OWNER', 'ADMIN', 'DPO'], action: 'Archive' },
  ],
  SUBMITTED: [
    {
      to: 'IN_REVIEW',
      roles: ['OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER'],
      action: 'Start review',
    },
    {
      to: 'DRAFT',
      roles: ['OWNER', 'ADMIN', 'DPO'],
      action: 'Return to draft',
      requiresComment: true,
    },
  ],
  IN_REVIEW: [
    {
      to: 'LEGAL_REVIEW',
      roles: ['OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER'],
      action: 'Send to legal review',
    },
    {
      to: 'SECURITY_REVIEW',
      roles: ['OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER'],
      action: 'Send to security review',
    },
    {
      to: 'DPO_APPROVAL',
      roles: ['OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER'],
      action: 'Request DPO approval',
    },
    {
      to: 'DRAFT',
      roles: ['OWNER', 'ADMIN', 'DPO'],
      action: 'Return to draft',
      requiresComment: true,
    },
  ],
  LEGAL_REVIEW: [
    {
      to: 'IN_REVIEW',
      roles: ['OWNER', 'ADMIN', 'LEGAL_REVIEWER', 'DPO'],
      action: 'Complete legal review',
      requiresComment: true,
    },
    {
      to: 'DRAFT',
      roles: ['OWNER', 'ADMIN', 'LEGAL_REVIEWER', 'DPO'],
      action: 'Return to draft',
      requiresComment: true,
    },
  ],
  SECURITY_REVIEW: [
    {
      to: 'IN_REVIEW',
      roles: ['OWNER', 'ADMIN', 'SECURITY_REVIEWER', 'DPO'],
      action: 'Complete security review',
      requiresComment: true,
    },
    {
      to: 'DRAFT',
      roles: ['OWNER', 'ADMIN', 'SECURITY_REVIEWER', 'DPO'],
      action: 'Return to draft',
      requiresComment: true,
    },
  ],
  DPO_APPROVAL: [
    {
      to: 'EXECUTIVE_APPROVAL',
      roles: ['OWNER', 'ADMIN', 'DPO'],
      action: 'Approve and escalate to executive',
      requiresComment: true,
    },
    {
      to: 'APPROVED',
      roles: ['OWNER', 'ADMIN', 'DPO'],
      action: 'Approve (DPO)',
      requiresComment: true,
    },
    { to: 'REJECTED', roles: ['OWNER', 'ADMIN', 'DPO'], action: 'Reject', requiresComment: true },
  ],
  EXECUTIVE_APPROVAL: [
    {
      to: 'APPROVED',
      roles: ['OWNER', 'ADMIN'],
      action: 'Approve (executive)',
      requiresComment: true,
    },
    { to: 'REJECTED', roles: ['OWNER', 'ADMIN'], action: 'Reject', requiresComment: true },
  ],
  APPROVED: [
    {
      to: 'IMPLEMENTED',
      roles: ['OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER'],
      action: 'Mark controls implemented',
    },
    { to: 'ARCHIVED', roles: ['OWNER', 'ADMIN', 'DPO'], action: 'Archive' },
  ],
  IMPLEMENTED: [
    {
      to: 'MONITORING',
      roles: ['OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER'],
      action: 'Begin monitoring',
    },
  ],
  MONITORING: [
    {
      to: 'REVIEW_DUE',
      roles: ['OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER'],
      action: 'Flag for periodic review',
    },
    { to: 'ARCHIVED', roles: ['OWNER', 'ADMIN', 'DPO'], action: 'Archive' },
  ],
  REVIEW_DUE: [
    {
      to: 'DRAFT',
      roles: ['OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER'],
      action: 'Reopen for re-assessment',
    },
    {
      to: 'MONITORING',
      roles: ['OWNER', 'ADMIN', 'DPO'],
      action: 'Review complete — continue monitoring',
      requiresComment: true,
    },
  ],
  REJECTED: [
    {
      to: 'DRAFT',
      roles: ['OWNER', 'ADMIN', 'DPO', 'PRIVACY_ENGINEER', 'CONTRIBUTOR'],
      action: 'Reopen as draft',
    },
    { to: 'ARCHIVED', roles: ['OWNER', 'ADMIN', 'DPO'], action: 'Archive' },
  ],
  ARCHIVED: [],
};

export function allowedTransitions(from: DpiaStatus, roles: readonly Role[]): Transition[] {
  return (DPIA_WORKFLOW[from] ?? []).filter((t) => t.roles.some((r) => roles.includes(r)));
}

export function canTransition(from: DpiaStatus, to: DpiaStatus, roles: readonly Role[]): boolean {
  return allowedTransitions(from, roles).some((t) => t.to === to);
}

/** Statuses in which the questionnaire content may still be edited. */
export const EDITABLE_STATUSES: readonly DpiaStatus[] = ['DRAFT'];

/** Terminal statuses. */
export const TERMINAL_STATUSES: readonly DpiaStatus[] = ['ARCHIVED'];
