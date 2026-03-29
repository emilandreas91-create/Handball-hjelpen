import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center shadow-xl',
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-primary">
        <Icon size={26} />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
