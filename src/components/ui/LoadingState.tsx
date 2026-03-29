import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface LoadingStateProps {
  title?: string;
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({
  title = 'Laster innhold',
  message = 'Vi gjør klar arbeidsflaten din.',
  fullScreen = false,
}: LoadingStateProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-center',
        fullScreen ? 'min-h-screen px-4' : 'min-h-[280px] px-4 py-12',
      )}
    >
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-card/90 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
          <Loader2 className="animate-spin" size={28} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
          Handball-hjelpen
        </p>
        <h2 className="mt-3 text-2xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-400">{message}</p>
      </div>
    </div>
  );
}
