import type { RawFinding, Scanner, ScannerContext } from './types';

/** Dockerfile static analysis (privacy/security posture heuristics). */
export class DockerScanner implements Scanner {
  readonly provider = 'DOCKER';

  async scan(ctx: ScannerContext): Promise<RawFinding[]> {
    const findings: RawFinding[] = [];
    for (const file of ctx.files) {
      const lines = file.content.split('\n');
      const hasUser = lines.some((l) => /^\s*USER\s+(?!root)/i.test(l));
      if (!hasUser) {
        findings.push({
          severity: 'MEDIUM',
          category: 'iam',
          resourceId: file.path,
          title: 'Container runs as root',
          description: 'No non-root USER instruction found.',
          remediation: 'Add a dedicated unprivileged user and a USER instruction.',
        });
      }
      lines.forEach((line, i) => {
        const at = `${file.path}:${i + 1}`;
        if (/^\s*FROM\s+\S+:latest\b/i.test(line) || /^\s*FROM\s+[^:@\s]+\s*$/i.test(line)) {
          findings.push({
            severity: 'LOW',
            category: 'iam',
            resourceId: at,
            title: 'Unpinned base image',
            description: `Base image is not pinned to a digest or version: "${line.trim()}".`,
            remediation: 'Pin images to a specific version (ideally a digest).',
          });
        }
        if (/^\s*(ENV|ARG)\s+\w*(PASSWORD|SECRET|TOKEN|API_?KEY)\w*\s*[= ]\s*\S+/i.test(line)) {
          findings.push({
            severity: 'CRITICAL',
            category: 'secrets',
            resourceId: at,
            title: 'Secret baked into image',
            description: 'Credential-like ENV/ARG with an inline value.',
            remediation:
              'Inject secrets at runtime (orchestrator secrets, not image layers); rotate the value.',
          });
        }
        if (/curl[^|]*\|\s*(ba)?sh/.test(line)) {
          findings.push({
            severity: 'HIGH',
            category: 'iam',
            resourceId: at,
            title: 'Pipe-to-shell install',
            description: 'Remote script executed without verification.',
            remediation:
              'Download, checksum-verify, then execute; or install from a pinned package.',
          });
        }
      });
    }
    return findings;
  }
}
