import type { RawFinding, Scanner, ScannerContext } from './types';

/**
 * Kubernetes manifest static analysis. Uses line-level heuristics rather than
 * a YAML parser to stay dependency-free; matches the checks CIS K8s Benchmark
 * cares about most for workloads handling personal data.
 */
export class KubernetesScanner implements Scanner {
  readonly provider = 'KUBERNETES';

  async scan(ctx: ScannerContext): Promise<RawFinding[]> {
    const findings: RawFinding[] = [];
    for (const file of ctx.files) {
      const c = file.content;
      const checks: Array<
        [RegExp, RawFinding['severity'], RawFinding['category'], string, string]
      > = [
        [
          /privileged:\s*true/,
          'CRITICAL',
          'iam',
          'Privileged container',
          'Remove privileged: true; grant specific capabilities instead.',
        ],
        [
          /hostNetwork:\s*true/,
          'HIGH',
          'network',
          'Pod uses host network',
          'Avoid hostNetwork; expose via Services/Ingress.',
        ],
        [
          /runAsUser:\s*0(\s|$)/,
          'HIGH',
          'iam',
          'Container runs as UID 0',
          'Set runAsNonRoot: true and a non-zero runAsUser.',
        ],
        [
          /allowPrivilegeEscalation:\s*true/,
          'HIGH',
          'iam',
          'Privilege escalation allowed',
          'Set allowPrivilegeEscalation: false.',
        ],
        [
          /hostPath:/,
          'MEDIUM',
          'iam',
          'hostPath volume mounted',
          'Prefer PVCs; hostPath breaks isolation between node and pod.',
        ],
      ];
      for (const [re, severity, category, title, remediation] of checks) {
        if (re.test(c)) {
          findings.push({
            severity,
            category,
            resourceId: file.path,
            title,
            description: `${title} detected in ${file.path}.`,
            remediation,
          });
        }
      }
      if (/kind:\s*(Deployment|StatefulSet|DaemonSet)/.test(c) && !/resources:\s*\n/.test(c)) {
        findings.push({
          severity: 'LOW',
          category: 'network',
          resourceId: file.path,
          title: 'No resource limits',
          description: 'Workload defines no resource requests/limits (availability risk).',
          remediation: 'Set resources.requests and resources.limits.',
        });
      }
      if (/kind:\s*Secret/.test(c) && /type:\s*Opaque/.test(c) && /stringData:/.test(c)) {
        findings.push({
          severity: 'MEDIUM',
          category: 'secrets',
          resourceId: file.path,
          title: 'Plaintext secret committed as manifest',
          description:
            'Secret material appears in a manifest (stringData) rather than a secret store.',
          remediation: 'Use sealed-secrets / external-secrets and keep values out of git.',
        });
      }
    }
    return findings;
  }
}
