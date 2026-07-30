import type { RiskLevel } from './enums.js';

/**
 * UK GDPR Article 36 prior consultation decision support.
 *
 * Controllers must consult the supervisory authority when residual risk
 * remains high after planned measures. We flag consultation when any open
 * residual risk is still HIGH or CRITICAL.
 */

export interface PriorConsultationRiskInput {
  residualLevel: RiskLevel | string;
  /** OPEN / ACCEPTED / MITIGATED / TRANSFERRED / CLOSED — closed risks ignored. */
  status?: string;
  title?: string;
}

export interface PriorConsultationAssessment {
  /** Whether Article 36 prior consultation appears required. */
  required: boolean;
  reason: string;
  highOrCriticalCount: number;
  criticalCount: number;
  triggeringRisks: string[];
  references: string[];
}

const OPEN_STATUSES = new Set(['OPEN', 'ACCEPTED', 'MITIGATED', 'TRANSFERRED']);

export function assessPriorConsultation(
  risks: PriorConsultationRiskInput[],
): PriorConsultationAssessment {
  const openHigh = risks.filter((risk) => {
    const status = (risk.status ?? 'OPEN').toUpperCase();
    if (status === 'CLOSED') return false;
    if (!OPEN_STATUSES.has(status) && risk.status !== undefined) return false;
    const level = String(risk.residualLevel).toUpperCase();
    return level === 'HIGH' || level === 'CRITICAL';
  });

  const criticalCount = openHigh.filter(
    (risk) => String(risk.residualLevel).toUpperCase() === 'CRITICAL',
  ).length;
  const triggeringRisks = openHigh
    .map((risk) => risk.title)
    .filter((title): title is string => Boolean(title));

  if (openHigh.length === 0) {
    return {
      required: false,
      reason:
        'No open residual risks remain HIGH or CRITICAL after planned measures. Article 36 prior consultation is not indicated on residual-risk grounds alone.',
      highOrCriticalCount: 0,
      criticalCount: 0,
      triggeringRisks: [],
      references: ['UK GDPR Art. 36', 'ICO DPIA guidance — consulting the ICO'],
    };
  }

  return {
    required: true,
    reason: `Residual risk remains ${criticalCount > 0 ? 'CRITICAL' : 'HIGH'} after planned measures (${openHigh.length} open high/critical risk${openHigh.length === 1 ? '' : 's'}). Consult the ICO under Article 36 before starting the processing unless residual risk can be reduced further.`,
    highOrCriticalCount: openHigh.length,
    criticalCount,
    triggeringRisks,
    references: ['UK GDPR Art. 36', 'ICO DPIA guidance — consulting the ICO'],
  };
}
