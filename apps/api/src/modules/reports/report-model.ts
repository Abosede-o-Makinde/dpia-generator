import type { QuestionnaireTemplate } from '@shieldwise/shared';

/** Normalised report model consumed by every renderer. */
export interface ReportModel {
  reference: string;
  title: string;
  status: string;
  organisation: string;
  generatedAt: string;
  approvedAt?: string;
  nextReviewAt?: string;
  description?: string;
  completeness: number;
  sections: Array<{
    title: string;
    items: Array<{ question: string; answer: string; references?: string[] }>;
  }>;
  risks: Array<{
    title: string;
    category: string;
    likelihood: number;
    impact: number;
    inherentScore: number;
    residualScore: number;
    level: string;
    residualLevel: string;
    status: string;
    references: string[];
    controls: Array<{ name: string; status: string }>;
  }>;
  controls: Array<{ key: string; name: string; status: string; frameworks: string[] }>;
  approvals: Array<{ stage: string; decision: string; comment?: string; decidedAt: string }>;
  workflowHistory: Array<{ from: string; to: string; comment?: string; at: string }>;
  dataFlowFindings: Array<{ severity: string; message: string }>;
  priorConsultation: {
    required: boolean;
    reason: string;
    highOrCriticalCount: number;
    criticalCount: number;
    triggeringRisks: string[];
    references: string[];
  };
}

export function formatAnswer(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(String).join(', ');
  return String(value);
}

/** Which report sections each template includes. */
export const REPORT_TEMPLATES = {
  'dpia-full': { questionnaire: true, risks: true, controls: true, approvals: true, history: true },
  ico: { questionnaire: true, risks: true, controls: true, approvals: true, history: false },
  board: { questionnaire: false, risks: true, controls: true, approvals: true, history: false },
  dpo: { questionnaire: true, risks: true, controls: true, approvals: true, history: true },
  audit: { questionnaire: true, risks: true, controls: true, approvals: true, history: true },
  'executive-summary': {
    questionnaire: false,
    risks: true,
    controls: false,
    approvals: false,
    history: false,
  },
} as const;
export type ReportTemplateKey = keyof typeof REPORT_TEMPLATES;

export function buildSections(
  template: QuestionnaireTemplate,
  answers: Record<string, unknown>,
): ReportModel['sections'] {
  return template.sections
    .map((section) => ({
      title: section.title,
      items: section.questions
        .filter((q) => answers[q.key] !== undefined)
        .map((q) => ({
          question: q.label,
          answer: formatAnswer(answers[q.key]),
          references: q.references,
        })),
    }))
    .filter((s) => s.items.length > 0);
}
