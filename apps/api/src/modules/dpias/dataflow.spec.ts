import { analyseDataFlow, dataFlowRiskTags } from './dataflow';

describe('analyseDataFlow', () => {
  const flow = {
    nodes: [
      {
        id: 'app',
        kind: 'system' as const,
        label: 'Patient app',
        country: 'GB',
        trustZone: 'internal',
      },
      {
        id: 'db',
        kind: 'database' as const,
        label: 'Postgres',
        country: 'GB',
        trustZone: 'internal',
      },
      {
        id: 'llm',
        kind: 'vendor' as const,
        label: 'LLM API',
        country: 'US',
        trustZone: 'third-party',
        isProcessor: true,
      },
    ],
    edges: [
      { id: 'e1', source: 'app', target: 'db', dataCategories: ['HEALTH'], encrypted: true },
      { id: 'e2', source: 'app', target: 'llm', dataCategories: ['HEALTH'], encrypted: false },
    ],
  };

  it('detects cross-border transfers to non-adequate countries', () => {
    const findings = analyseDataFlow(flow);
    const crossBorder = findings.filter((f) => f.kind === 'cross_border_transfer');
    expect(crossBorder).toHaveLength(1);
    expect(crossBorder[0]!.nodeIds).toEqual(['llm']);
    expect(crossBorder[0]!.severity).toBe('HIGH');
  });

  it('detects third-party processors, trust boundaries, unencrypted + sensitive flows', () => {
    const findings = analyseDataFlow(flow);
    const kinds = findings.map((f) => f.kind);
    expect(kinds).toContain('third_party_processor');
    expect(kinds).toContain('trust_boundary_crossing');
    expect(kinds).toContain('unencrypted_flow');
    expect(kinds).toContain('high_risk_processing');
    // encrypted internal edge produces no unencrypted finding
    expect(findings.filter((f) => f.edgeId === 'e1' && f.kind === 'unencrypted_flow')).toHaveLength(
      0,
    );
  });

  it('emits deduplicated risk tags for the risk engine', () => {
    const tags = dataFlowRiskTags(analyseDataFlow(flow));
    expect(tags).toContain('tag:cross-border');
    expect(tags).toContain('tag:third-party-processor');
    expect(tags).toContain('tag:unencrypted-transit');
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('returns nothing for an all-internal encrypted UK flow', () => {
    const clean = analyseDataFlow({
      nodes: [
        { id: 'a', kind: 'system', label: 'A', country: 'GB', trustZone: 'internal' },
        { id: 'b', kind: 'database', label: 'B', country: 'GB', trustZone: 'internal' },
      ],
      edges: [{ id: 'e', source: 'a', target: 'b', dataCategories: ['CONTACT'], encrypted: true }],
    });
    expect(clean).toHaveLength(0);
  });
});
