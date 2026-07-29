export interface ScanInputFile {
  path: string;
  content: string;
}

export interface ScannerContext {
  /** Decrypted connector configuration (credentials, tenant ids…). */
  config: Record<string, unknown>;
  /** Files supplied for static-analysis providers (Terraform, Docker, K8s). */
  files: ScanInputFile[];
}

export interface RawFinding {
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category:
    'encryption' | 'iam' | 'public-exposure' | 'secrets' | 'logging' | 'mfa' | 'network' | 'backup';
  resourceId: string;
  title: string;
  description: string;
  remediation: string;
  /** Suggested DPIA answer pre-population, keyed by question key. */
  dpiaHints?: Record<string, unknown>;
}

export interface Scanner {
  readonly provider: string;
  scan(ctx: ScannerContext): Promise<RawFinding[]>;
}
