import { describe, expect, it } from 'vitest';
import {
  buildFactMap,
  resolveVisibility,
  questionnaireTemplateSchema,
  type QuestionnaireTemplate,
} from '../questionnaire.js';

const template: QuestionnaireTemplate = questionnaireTemplateSchema.parse({
  key: 'test',
  name: 'Test template',
  version: 1,
  sections: [
    {
      key: 'basics',
      title: 'Basics',
      questions: [
        { key: 'uses_ai', type: 'BOOLEAN', label: 'Uses AI?', required: true },
        {
          key: 'ai_purpose',
          type: 'TEXTAREA',
          label: 'AI purpose',
          required: true,
          visibleWhen: { q: 'uses_ai', op: 'eq', value: true },
        },
        {
          key: 'data_categories',
          type: 'MULTI_SELECT',
          label: 'Data categories',
          required: true,
          options: [
            { value: 'HEALTH', label: 'Health', riskTags: ['tag:special-category'] },
            { value: 'CONTACT', label: 'Contact' },
          ],
        },
      ],
    },
    {
      key: 'ai_section',
      title: 'AI details',
      visibleWhen: { q: 'uses_ai', op: 'eq', value: true },
      questions: [{ key: 'model_type', type: 'TEXT', label: 'Model type', required: false }],
    },
  ],
});

describe('resolveVisibility', () => {
  it('hides follow-ups and conditional sections until triggered', () => {
    const r = resolveVisibility(template, { uses_ai: false });
    const keys = r.sections.flatMap((s) => s.questions.map((q) => q.key));
    expect(keys).toEqual(['uses_ai', 'data_categories']);
    expect(r.missingRequired).toEqual(['data_categories']);
  });

  it('reveals follow-up questions when the trigger answer is given', () => {
    const r = resolveVisibility(template, { uses_ai: true });
    const keys = r.sections.flatMap((s) => s.questions.map((q) => q.key));
    expect(keys).toContain('ai_purpose');
    expect(keys).toContain('model_type');
    expect(r.missingRequired).toEqual(['ai_purpose', 'data_categories']);
  });

  it('computes completeness over visible required questions only', () => {
    const r = resolveVisibility(template, {
      uses_ai: true,
      ai_purpose: 'Triage',
      data_categories: ['HEALTH'],
    });
    expect(r.completeness).toBe(100);
    expect(r.missingRequired).toEqual([]);
  });
});

describe('buildFactMap', () => {
  it('emits risk tags from selected options', () => {
    const facts = buildFactMap(template, { data_categories: ['HEALTH', 'CONTACT'] });
    expect(facts.tags).toEqual(['tag:special-category']);
  });
});
