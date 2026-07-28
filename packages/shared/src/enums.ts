/**
 * Core domain enums shared across the Shieldwise platform.
 * These mirror the Prisma enums — keep in sync (enforced by api unit test).
 */

export const ROLES = [
  'OWNER',
  'ADMIN',
  'DPO',
  'PRIVACY_ENGINEER',
  'SECURITY_REVIEWER',
  'LEGAL_REVIEWER',
  'CONTRIBUTOR',
  'VIEWER',
] as const;
export type Role = (typeof ROLES)[number];

export const DPIA_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'LEGAL_REVIEW',
  'SECURITY_REVIEW',
  'DPO_APPROVAL',
  'EXECUTIVE_APPROVAL',
  'APPROVED',
  'IMPLEMENTED',
  'MONITORING',
  'REVIEW_DUE',
  'REJECTED',
  'ARCHIVED',
] as const;
export type DpiaStatus = (typeof DPIA_STATUSES)[number];

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_STATUSES = [
  'IDENTIFIED',
  'ANALYSING',
  'MITIGATING',
  'MITIGATED',
  'ACCEPTED',
  'TRANSFERRED',
  'CLOSED',
] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

export const DATA_CATEGORIES = [
  'BASIC_PERSONAL',
  'CONTACT',
  'IDENTIFIERS',
  'FINANCIAL',
  'LOCATION',
  'BEHAVIOURAL',
  'COMMUNICATIONS',
  'EMPLOYMENT',
  'EDUCATION',
  'IMAGES_AV',
  'ONLINE_ACTIVITY',
  // Special category (UK GDPR Art. 9)
  'HEALTH',
  'GENETIC',
  'BIOMETRIC',
  'RACIAL_ETHNIC',
  'POLITICAL_OPINIONS',
  'RELIGIOUS_BELIEFS',
  'TRADE_UNION',
  'SEX_LIFE_ORIENTATION',
  // Art. 10
  'CRIMINAL_CONVICTIONS',
  // Heightened protection
  'CHILDREN',
] as const;
export type DataCategory = (typeof DATA_CATEGORIES)[number];

/** Art. 9 special categories subset */
export const SPECIAL_CATEGORIES: readonly DataCategory[] = [
  'HEALTH',
  'GENETIC',
  'BIOMETRIC',
  'RACIAL_ETHNIC',
  'POLITICAL_OPINIONS',
  'RELIGIOUS_BELIEFS',
  'TRADE_UNION',
  'SEX_LIFE_ORIENTATION',
];

export const LAWFUL_BASES = [
  'CONSENT',
  'CONTRACT',
  'LEGAL_OBLIGATION',
  'VITAL_INTERESTS',
  'PUBLIC_TASK',
  'LEGITIMATE_INTERESTS',
] as const;
export type LawfulBasis = (typeof LAWFUL_BASES)[number];

export const QUESTION_TYPES = [
  'TEXT',
  'TEXTAREA',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'BOOLEAN',
  'NUMBER',
  'DATE',
  'SCALE',
  'FILE',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const FRAMEWORKS = [
  'UK_GDPR',
  'EU_GDPR',
  'ISO_27001',
  'ISO_27701',
  'NIST_CSF_2',
  'NIST_PRIVACY',
  'CIS_V8',
  'OWASP_ASVS_4',
  'SOC_2',
  'PCI_DSS_4',
  'HIPAA',
] as const;
export type FrameworkId = (typeof FRAMEWORKS)[number];

export const EVIDENCE_TYPES = [
  'POLICY',
  'CONTRACT',
  'SCREENSHOT',
  'ARCHITECTURE_DIAGRAM',
  'PENETRATION_TEST',
  'RISK_ASSESSMENT',
  'SECURITY_REPORT',
  'VENDOR_ASSESSMENT',
  'DPA',
  'OTHER',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const AUDIT_ACTIONS = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'MFA_ENROLLED',
  'MFA_CHALLENGE',
  'TOKEN_ISSUED',
  'TOKEN_REVOKED',
  'STATUS_CHANGE',
  'APPROVE',
  'REJECT',
  'EXPORT',
  'UPLOAD',
  'DOWNLOAD',
  'AI_INVOCATION',
  'SCAN',
  'PERMISSION_CHANGE',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const CONNECTOR_PROVIDERS = [
  'AWS',
  'AZURE',
  'GCP',
  'M365',
  'GITHUB',
  'GITLAB',
  'KUBERNETES',
  'TERRAFORM',
  'DOCKER',
] as const;
export type ConnectorProvider = (typeof CONNECTOR_PROVIDERS)[number];

export const TRANSFER_MECHANISMS = [
  'ADEQUACY',
  'IDTA',
  'SCC_ADDENDUM',
  'BCR',
  'DEROGATION',
  'NONE',
] as const;
export type TransferMechanism = (typeof TRANSFER_MECHANISMS)[number];
