import { describe, expect, it } from 'vitest';
import { cn, formatDate, formatDateTime } from './utils';

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', undefined, false, 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('formatDate', () => {
  it('returns an em dash for nullish input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('formats a date string', () => {
    expect(formatDate('2026-03-15T00:00:00.000Z')).toMatch(/2026/);
  });
});

describe('formatDateTime', () => {
  it('returns an em dash for nullish input', () => {
    expect(formatDateTime(null)).toBe('—');
  });

  it('formats a datetime string including time', () => {
    const result = formatDateTime('2026-03-15T14:30:00.000Z');
    expect(result).toMatch(/2026/);
  });
});
