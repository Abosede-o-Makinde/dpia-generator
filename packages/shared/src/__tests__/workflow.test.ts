import { describe, expect, it } from 'vitest';
import { DPIA_WORKFLOW, allowedTransitions, canTransition } from '../workflow.js';
import { DPIA_STATUSES } from '../enums.js';

describe('DPIA workflow state machine', () => {
  it('defines transitions for every status', () => {
    for (const s of DPIA_STATUSES) {
      expect(DPIA_WORKFLOW[s]).toBeDefined();
    }
  });

  it('every transition target is a valid status', () => {
    for (const transitions of Object.values(DPIA_WORKFLOW)) {
      for (const t of transitions) {
        expect(DPIA_STATUSES).toContain(t.to);
      }
    }
  });

  it('enforces role-based transitions', () => {
    expect(canTransition('DRAFT', 'SUBMITTED', ['CONTRIBUTOR'])).toBe(true);
    expect(canTransition('DPO_APPROVAL', 'APPROVED', ['CONTRIBUTOR'])).toBe(false);
    expect(canTransition('DPO_APPROVAL', 'APPROVED', ['DPO'])).toBe(true);
    expect(canTransition('EXECUTIVE_APPROVAL', 'APPROVED', ['DPO'])).toBe(false);
  });

  it('viewers can never transition anything', () => {
    for (const s of DPIA_STATUSES) {
      expect(allowedTransitions(s, ['VIEWER'])).toHaveLength(0);
    }
  });

  it('archived is terminal', () => {
    expect(DPIA_WORKFLOW.ARCHIVED).toHaveLength(0);
  });

  it('every non-terminal status is reachable from DRAFT', () => {
    const reachable = new Set<string>(['DRAFT']);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [from, transitions] of Object.entries(DPIA_WORKFLOW)) {
        if (!reachable.has(from)) continue;
        for (const t of transitions) {
          if (!reachable.has(t.to)) {
            reachable.add(t.to);
            changed = true;
          }
        }
      }
    }
    for (const s of DPIA_STATUSES) {
      expect(reachable, `status ${s} unreachable`).toContain(s);
    }
  });
});
