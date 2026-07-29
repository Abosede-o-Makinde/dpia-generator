import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  default:
    'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-px hover:opacity-95',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-border bg-white text-ink hover:border-primary/25 hover:bg-section-wash',
  ghost: 'bg-transparent hover:bg-white/60',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  link: 'h-auto bg-transparent p-0 text-primary underline-offset-4 hover:underline',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-xs',
  md: 'h-10 px-5 text-sm',
  lg: 'h-11 px-7 text-sm',
  icon: 'h-10 w-10',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200',
          'disabled:pointer-events-none disabled:opacity-50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          variants[variant],
          sizes[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
