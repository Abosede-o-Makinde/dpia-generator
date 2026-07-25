import { describe, expect, it } from 'vitest';
import { evaluateCondition, type Condition } from '../conditions.js';

describe('evaluateCondition', () => {
  const facts = {
    industry: 'healthcare',
    data_categories: ['HEALTH', 'CONTACT'],
    subjects_count: 250_000,
    uses_ai: true,
    tags: ['tag:biometric'],
  };

  it('evaluates eq / neq', () => {
    expect(evaluateCondition({ q: 'industry', op: 'eq', value: 'healthcare' }, facts)).toBe(true);
    expect(evaluateCondition({ q: 'industry', op: 'neq', value: 'finance' }, facts)).toBe(true);
  });

  it('evaluates in / includes / includesAny', () => {
    expect(
      evaluateCondition({ q: 'industry', op: 'in', value: ['healthcare', 'finance'] }, facts),
    ).toBe(true);
    expect(
      evaluateCondition({ q: 'data_categories', op: 'includes', value: 'HEALTH' }, facts),
    ).toBe(true);
    expect(
      evaluateCondition(
        { q: 'data_categories', op: 'includesAny', value: ['GENETIC', 'CONTACT'] },
        facts,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { q: 'data_categories', op: 'includesAny', value: ['GENETIC', 'BIOMETRIC'] },
        facts,
      ),
    ).toBe(false);
  });

  it('evaluates numeric comparisons with coercion', () => {
    expect(evaluateCondition({ q: 'subjects_count', op: 'gte', value: 100_000 }, facts)).toBe(true);
    expect(evaluateCondition({ q: 'subjects_count', op: 'lt', value: 100 }, facts)).toBe(false);
    expect(evaluateCondition({ q: 'industry', op: 'gt', value: 1 }, facts)).toBe(false); // non-numeric → false
  });

  it('evaluates answered / truthy on missing values', () => {
    expect(evaluateCondition({ q: 'missing', op: 'answered' }, facts)).toBe(false);
    expect(evaluateCondition({ q: 'uses_ai', op: 'truthy' }, facts)).toBe(true);
  });

  it('evaluates nested boolean logic', () => {
    const cond: Condition = {
      all: [
        { q: 'uses_ai', op: 'truthy' },
        {
          any: [
            { q: 'data_categories', op: 'includes', value: 'HEALTH' },
            { q: 'tags', op: 'includes', value: 'tag:children' },
          ],
        },
        { not: { q: 'industry', op: 'eq', value: 'retail' } },
      ],
    };
    expect(evaluateCondition(cond, facts)).toBe(true);
  });
});
