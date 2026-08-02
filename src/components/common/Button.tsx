import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600 disabled:bg-emerald-300',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:outline-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600 disabled:bg-red-300',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-slate-400 dark:text-slate-300 dark:hover:bg-slate-800',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-sm px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2',
};

export function Button({ variant = 'primary', size = 'md', icon, fullWidth, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
