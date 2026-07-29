import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'destructive';

const variants: Record<Variant, string> = {
  default: 'bg-primary/10 text-primary border-primary/20',
  secondary: 'bg-muted text-muted-foreground border-transparent',
  outline: 'bg-transparent text-foreground border-border',
  success: 'bg-risk-low/10 text-risk-low border-risk-low/20',
  warning: 'bg-risk-medium/10 text-risk-medium border-risk-medium/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

const RISK_VARIANT: Record<string, Variant> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'destructive',
  CRITICAL: 'destructive',
};

export function RiskBadge({ level }: { level: string }) {
  return (
    <Badge
      variant={RISK_VARIANT[level] ?? 'secondary'}
      className={level === 'CRITICAL' ? 'font-bold' : undefined}
    >
      {level}
    </Badge>
  );
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  LEGAL_REVIEW: 'Legal review',
  SECURITY_REVIEW: 'Security review',
  DPO_APPROVAL: 'DPO approval',
  EXECUTIVE_APPROVAL: 'Executive approval',
  APPROVED: 'Approved',
  IMPLEMENTED: 'Implemented',
  MONITORING: 'Monitoring',
  REVIEW_DUE: 'Review due',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export function StatusBadge({ status }: { status: string }) {
  const variant: Variant =
    status === 'APPROVED' || status === 'IMPLEMENTED'
      ? 'success'
      : status === 'REJECTED'
        ? 'destructive'
        : status === 'REVIEW_DUE'
          ? 'warning'
          : 'default';
  return <Badge variant={variant}>{STATUS_LABEL[status] ?? status}</Badge>;
}
