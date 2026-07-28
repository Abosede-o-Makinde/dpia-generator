import type { DataFlowDto, DataFlowEdge, DataFlowNode } from './dto';

/**
 * Static analysis of the data-flow model: cross-border transfers, third-party
 * processors, trust-boundary crossings and unencrypted sensitive links.
 */

/** UK + EEA (adequacy-covered for UK GDPR purposes, simplified). */
const ADEQUATE_COUNTRIES = new Set([
  'GB',
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LV',
  'LI',
  'LT',
  'LU',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'CH',
  'JP',
  'NZ',
  'KR',
  'CA',
  'IL',
]);

export interface DataFlowFinding {
  kind:
    | 'cross_border_transfer'
    | 'third_party_processor'
    | 'trust_boundary_crossing'
    | 'unencrypted_flow'
    | 'high_risk_processing';
  severity: 'INFO' | 'MEDIUM' | 'HIGH';
  message: string;
  nodeIds: string[];
  edgeId?: string;
  /** Risk tags fed into the risk engine fact map. */
  riskTags: string[];
}

export function analyseDataFlow(flow: DataFlowDto): DataFlowFinding[] {
  const findings: DataFlowFinding[] = [];
  const nodesById = new Map<string, DataFlowNode>(flow.nodes.map((n) => [n.id, n]));

  for (const node of flow.nodes) {
    if (node.kind === 'vendor' || node.isProcessor) {
      findings.push({
        kind: 'third_party_processor',
        severity: 'MEDIUM',
        message: `"${node.label}" is a third-party processor — an Art. 28 processing agreement is required.`,
        nodeIds: [node.id],
        riskTags: ['tag:third-party-processor'],
      });
    }
    if (node.country && !ADEQUATE_COUNTRIES.has(node.country.toUpperCase())) {
      findings.push({
        kind: 'cross_border_transfer',
        severity: 'HIGH',
        message: `"${node.label}" processes data in ${node.country.toUpperCase()}, outside UK adequacy — an IDTA/SCC transfer mechanism and TRA are required (Art. 46).`,
        nodeIds: [node.id],
        riskTags: ['tag:cross-border', 'tag:restricted-transfer'],
      });
    }
  }

  for (const edge of flow.edges) {
    const source = nodesById.get(edge.source);
    const target = nodesById.get(edge.target);
    if (!source || !target) continue;

    if (source.trustZone && target.trustZone && source.trustZone !== target.trustZone) {
      findings.push({
        kind: 'trust_boundary_crossing',
        severity: 'MEDIUM',
        message: `Flow "${edgeLabel(edge, source, target)}" crosses a trust boundary (${source.trustZone} → ${target.trustZone}).`,
        nodeIds: [source.id, target.id],
        edgeId: edge.id,
        riskTags: ['tag:trust-boundary'],
      });
    }

    const sensitive = edge.dataCategories.some((c) =>
      ['HEALTH', 'BIOMETRIC', 'GENETIC', 'FINANCIAL', 'CRIMINAL_CONVICTIONS', 'CHILDREN'].includes(
        c,
      ),
    );
    if (edge.encrypted === false) {
      findings.push({
        kind: 'unencrypted_flow',
        severity: sensitive ? 'HIGH' : 'MEDIUM',
        message: `Flow "${edgeLabel(edge, source, target)}" is not encrypted in transit${sensitive ? ' and carries sensitive data' : ''}.`,
        nodeIds: [source.id, target.id],
        edgeId: edge.id,
        riskTags: ['tag:unencrypted-transit'],
      });
    }
    if (sensitive && (target.kind === 'vendor' || target.isProcessor)) {
      findings.push({
        kind: 'high_risk_processing',
        severity: 'HIGH',
        message: `Sensitive data flows to third party "${target.label}" — verify processor guarantees (Art. 28(1)) and minimisation.`,
        nodeIds: [target.id],
        edgeId: edge.id,
        riskTags: ['tag:sensitive-to-processor'],
      });
    }
  }

  return findings;
}

/** Risk tags contributed by data-flow analysis, for the risk engine fact map. */
export function dataFlowRiskTags(findings: DataFlowFinding[]): string[] {
  return [...new Set(findings.flatMap((f) => f.riskTags))];
}

function edgeLabel(edge: DataFlowEdge, source: DataFlowNode, target: DataFlowNode): string {
  return edge.label || `${source.label} → ${target.label}`;
}
