import type { ReactNode } from 'react';

interface CardProps {
  children?: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-6 shadow-xl ${className}`}>
      {children}
    </div>
  );
}
