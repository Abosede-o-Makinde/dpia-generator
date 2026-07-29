import { evaluateRiskRules, DEFAULT_SCORING_CONFIG } from '@shieldwise/shared';
import { RISK_RULES } from './risk-rules';

describe('built-in risk rules', () => {
  it('all rules parse against the shared schema and have controls or references', () => {
    expect(RISK_RULES.length).toBeGreaterThanOrEqual(20);
    for (const rule of RISK_RULES) {
      expect(rule.references.length).toBeGreaterThan(0);
      expect(rule.likelihood).toBeGreaterThanOrEqual(1);
      expect(rule.impact).toBeLessThanOrEqual(5);
    }
  });

  it('rule keys are unique', () => {
    const keys = RISK_RULES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('fires the expected rules for a high-risk healthcare AI scenario', () => {
    const facts = {
      tags: ['tag:special-category', 'tag:health', 'tag:large-scale'],
      uses_ai: true,
      automated_decisions: true,
      encryption_at_rest: false,
      third_party_processors: true,
      dpa_in_place: false,
      lawful_basis: 'PUBLIC_TASK',
      privacy_notice: true,
      dsar_process: true,
    };
    const scored = evaluateRiskRules(RISK_RULES, facts, DEFAULT_SCORING_CONFIG);
    const keys = scored.map((s) => s.ruleKey);

    expect(keys).toContain('special-category-processing');
    expect(keys).toContain('large-scale-special-category');
    expect(keys).toContain('ai-processing');
    expect(keys).toContain('automated-decision-making');
    expect(keys).toContain('no-encryption-at-rest');
    expect(keys).toContain('processor-without-dpa');
    expect(keys).not.toContain('no-privacy-notice');
    expect(keys).not.toContain('children-data');

    // Ordered by residual score, worst first.
    const scores = scored.map((s) => s.residualScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('fires nothing for a benign, well-controlled activity', () => {
    const facts = {
      tags: [],
      uses_ai: false,
      automated_decisions: false,
      encryption_at_rest: true,
      encryption_in_transit: true,
      third_party_processors: false,
      international_transfers: false,
      privacy_notice: true,
      dsar_process: true,
      public_monitoring: false,
      lawful_basis: 'CONTRACT',
    };
    const scored = evaluateRiskRules(RISK_RULES, facts, DEFAULT_SCORING_CONFIG);
    expect(scored).toHaveLength(0);
  });
});
