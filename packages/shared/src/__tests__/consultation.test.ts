import { describe, expect, it } from 'vitest';
import { assessPriorConsultation } from '../consultation.js';

describe('assessPriorConsultation', () => {
  it('does not require consultation when residual risks are medium/low', () => {
    const result = assessPriorConsultation([
      { residualLevel: 'MEDIUM', status: 'OPEN', title: 'Vendor access' },
      { residualLevel: 'LOW', status: 'OPEN', title: 'Logging retention' },
    ]);
    expect(result.required).toBe(false);
    expect(result.highOrCriticalCount).toBe(0);
  });

  it('requires consultation when an open residual risk is HIGH', () => {
    const result = assessPriorConsultation([
      { residualLevel: 'HIGH', status: 'OPEN', title: 'Biometric identification' },
      { residualLevel: 'LOW', status: 'OPEN', title: 'Badge logs' },
    ]);
    expect(result.required).toBe(true);
    expect(result.highOrCriticalCount).toBe(1);
    expect(result.triggeringRisks).toContain('Biometric identification');
    expect(result.reason).toMatch(/Article 36/);
  });

  it('ignores closed high residual risks', () => {
    const result = assessPriorConsultation([
      { residualLevel: 'CRITICAL', status: 'CLOSED', title: 'Old issue' },
    ]);
    expect(result.required).toBe(false);
  });
});
