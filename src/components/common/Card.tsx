import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export function Card({ children, padded = true, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${padded ? 'p-4 sm:p-5' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
