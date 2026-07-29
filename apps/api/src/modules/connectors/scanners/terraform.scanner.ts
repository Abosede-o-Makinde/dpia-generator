import type { RawFinding, Scanner, ScannerContext } from './types';

/**
 * Static analysis of Terraform HCL. Heuristic checks focused on the privacy
 * posture signals a DPIA needs: encryption, public exposure, secrets,
 * logging and backups.
 */
export class TerraformScanner implements Scanner {
  readonly provider = 'TERRAFORM';

  async scan(ctx: ScannerContext): Promise<RawFinding[]> {
    const findings: RawFinding[] = [];
    for (const file of ctx.files) {
      const blocks = splitResources(file.content);
      for (const block of blocks) {
        findings.push(...checkBlock(block, file.path));
      }
      findings.push(...checkSecrets(file.content, file.path));
    }
    return findings;
  }
}

interface HclBlock {
  type: string;
  name: string;
  body: string;
}

function splitResources(content: string): HclBlock[] {
  const blocks: HclBlock[] = [];
  const re = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const start = re.lastIndex;
    let depth = 1;
    let i = start;
    while (i < content.length && depth > 0) {
      if (content[i] === '{') depth += 1;
      else if (content[i] === '}') depth -= 1;
      i += 1;
    }
    blocks.push({ type: match[1]!, name: match[2]!, body: content.slice(start, i) });
  }
  return blocks;
}

function checkBlock(block: HclBlock, path: string): RawFinding[] {
  const findings: RawFinding[] = [];
  const id = `${path}:${block.type}.${block.name}`;

  if (block.type === 'aws_s3_bucket') {
    if (/acl\s*=\s*"(public-read|public-read-write)"/.test(block.body)) {
      findings.push({
        severity: 'CRITICAL',
        category: 'public-exposure',
        resourceId: id,
        title: 'S3 bucket with public ACL',
        description: 'Bucket grants public read/write access via ACL.',
        remediation:
          'Remove the public ACL, enable aws_s3_bucket_public_access_block with all four settings true.',
        dpiaHints: { encryption_at_rest: false },
      });
    }
  }
  if (
    ['aws_db_instance', 'aws_rds_cluster'].includes(block.type) &&
    !/storage_encrypted\s*=\s*true/.test(block.body)
  ) {
    findings.push({
      severity: 'HIGH',
      category: 'encryption',
      resourceId: id,
      title: 'RDS storage encryption not enabled',
      description: 'Database instance does not set storage_encrypted = true.',
      remediation: 'Set storage_encrypted = true (requires recreation for existing instances).',
      dpiaHints: { encryption_at_rest: false },
    });
  }
  if (block.type === 'aws_ebs_volume' && !/encrypted\s*=\s*true/.test(block.body)) {
    findings.push({
      severity: 'HIGH',
      category: 'encryption',
      resourceId: id,
      title: 'Unencrypted EBS volume',
      description: 'EBS volume does not enable encryption.',
      remediation: 'Set encrypted = true and use a CMK where required.',
      dpiaHints: { encryption_at_rest: false },
    });
  }
  if (
    ['aws_security_group', 'aws_security_group_rule'].includes(block.type) &&
    /0\.0\.0\.0\/0/.test(block.body) &&
    /(ingress|type\s*=\s*"ingress")/.test(block.body)
  ) {
    findings.push({
      severity: 'HIGH',
      category: 'network',
      resourceId: id,
      title: 'Security group open to the internet',
      description: 'Ingress rule allows 0.0.0.0/0.',
      remediation: 'Restrict ingress to known CIDRs or use a load balancer / VPN.',
    });
  }
  if (block.type === 'aws_cloudtrail' && /enable_logging\s*=\s*false/.test(block.body)) {
    findings.push({
      severity: 'MEDIUM',
      category: 'logging',
      resourceId: id,
      title: 'CloudTrail logging disabled',
      description: 'Audit trail is switched off.',
      remediation: 'Set enable_logging = true and protect the trail bucket.',
    });
  }
  if (
    block.type === 'azurerm_storage_account' &&
    /enable_https_traffic_only\s*=\s*false/.test(block.body)
  ) {
    findings.push({
      severity: 'HIGH',
      category: 'encryption',
      resourceId: id,
      title: 'Azure storage allows plain HTTP',
      description: 'Storage account does not enforce HTTPS-only traffic.',
      remediation: 'Set enable_https_traffic_only = true.',
      dpiaHints: { encryption_in_transit: false },
    });
  }
  if (block.type === 'google_storage_bucket' && /force_destroy\s*=\s*true/.test(block.body)) {
    findings.push({
      severity: 'LOW',
      category: 'backup',
      resourceId: id,
      title: 'GCS bucket allows force destroy',
      description: 'Bucket and all objects can be destroyed in one operation.',
      remediation: 'Disable force_destroy in production and enable object versioning.',
    });
  }
  return findings;
}

function checkSecrets(content: string, path: string): RawFinding[] {
  const findings: RawFinding[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/AKIA[0-9A-Z]{16}/, 'AWS access key id'],
    [/(password|secret|api_key)\s*=\s*"[^"${][^"]{7,}"/i, 'hard-coded credential'],
  ];
  for (const [re, label] of patterns) {
    if (re.test(content)) {
      findings.push({
        severity: 'CRITICAL',
        category: 'secrets',
        resourceId: path,
        title: `Possible ${label} in Terraform source`,
        description: `A value matching a ${label} pattern is committed in ${path}.`,
        remediation:
          'Move secrets to a secrets manager (AWS Secrets Manager / Vault) and reference via variables; rotate the exposed credential.',
      });
    }
  }
  return findings;
}
