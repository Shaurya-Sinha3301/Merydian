import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'ink' | 'cyan' | 'quiet' | 'outline';
type Size = 'md' | 'lg';

const base =
  'rounded-xl inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap select-none transition-colors duration-150 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  ink: 'bg-ink text-paper hover:bg-cyan hover:text-ink disabled:bg-rule disabled:text-ink-2',
  cyan: 'bg-cyan text-ink hover:bg-ink hover:text-paper disabled:bg-rule disabled:text-ink-2',
  quiet: 'bg-transparent text-ink underline underline-offset-4 decoration-2 decoration-ink hover:decoration-cyan disabled:text-ink-3',
  outline: 'bg-paper text-ink border-2 border-ink hover:bg-yellow disabled:border-rule disabled:text-ink-3',
};

const sizes: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

function cls(variant: Variant, size: Size, extra?: string) {
  return `${base} ${variant === 'quiet' ? 'px-1' : sizes[size]} ${variants[variant]} ${extra ?? ''}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'ink', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cls(variant, size, className)}
    >
      {loading && <span aria-hidden className="inline-block h-1.5 w-4 bg-current animate-pulse" />}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends LinkProps {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({ variant = 'ink', size = 'md', className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link {...rest} className={cls(variant, size, className as string | undefined)}>
      {children}
    </Link>
  );
}
