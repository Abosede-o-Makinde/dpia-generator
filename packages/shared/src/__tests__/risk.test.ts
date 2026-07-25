import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SCORING_CONFIG,
  evaluateRiskRules,
  levelForScore,
  scoreRisk,
  riskRuleSchema,
} from '../risk.js';

const rule = riskRuleSchema.parse({
  key: 'special-category-large-scale',
  title: 'Large-scale special category processing',
  description: 'Processing health data at scale without adequate safeguards.',
  condition: {
    all: [
      { q: 'tags', op: 'includes', value: 'tag:special-category' },
      { q: 'subjects_count', op: 'gte', value: 100000 },
    ],
  },
  likelihood: 3,
  impact: 5,
  modifiers: ['specialCategory', 'largeScale'],
  references: ['UK GDPR Art. 9', 'UK GDPR Art. 35(3)(b)'],
  recommendedControls: ['enc-at-rest', 'access-review'],
});

describe('risk scoring', () => {
  it('maps scores to levels via thresholds', () => {
    expect(levelForScore(3, DEFAULT_SCORING_CONFIG)).toBe('LOW');
    expect(levelForScore(8, DEFAULT_SCORING_CONFIG)).toBe('MEDIUM');
    expect(levelForScore(15, DEFAULT_SCORING_CONFIG)).toBe('HIGH');
    expect(levelForScore(20, DEFAULT_SCORING_CONFIG)).toBe('CRITICAL');
  });

  it('applies modifier weights multiplicatively', () => {
    const scored = scoreRisk(rule, DEFAULT_SCORING_CONFIG);
    // 3 × 5 × 1.4 (special) × 1.25 (scale) = 26.3 (rounded to 1dp)
    expect(scored.inherentScore).toBeCloseTo(26.3, 1);
    expect(scored.level).toBe('CRITICAL');
    expect(scored.modifiersApplied).toEqual(['specialCategory', 'largeScale']);
  });

  it('reduces residual score by control effectiveness, clamped at 0.95', () => {
    const scored = scoreRisk(rule, DEFAULT_SCORING_CONFIG, 0.6);
    expect(scored.residualScore).toBeCloseTo(10.5, 1);
    expect(scored.residualLevel).toBe('MEDIUM');
    const clamped = scoreRisk(rule, DEFAULT_SCORING_CONFIG, 2);
    expect(clamped.residualScore).toBeGreaterThan(0);
  });

  it('only fires rules whose conditions match the fact map', () => {
    const hit = evaluateRiskRules([rule], {
      tags: ['tag:special-category'],
      subjects_count: 500000,
    });
    const miss = evaluateRiskRules([rule], { tags: [], subjects_count: 500000 });
    expect(hit).toHaveLength(1);
    expect(miss).toHaveLength(0);
  });
});
