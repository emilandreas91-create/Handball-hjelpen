import { clsx } from 'clsx';
import type { StatType } from '../../lib/matchData';

interface StatButtonProps {
    type: StatType;
    label: string;
    count: number;
    onClick: () => void;
    color: string;
    disabled?: boolean;
}

export function StatButton({ label, count, onClick, color, disabled = false }: StatButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={`${label}: ${count}`}
            className={clsx(
                "group relative flex min-h-[112px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-transparent px-4 py-5 text-center shadow-lg transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[132px] sm:px-6 sm:py-6 touch-manipulation",
                !disabled && "hover:brightness-110",
                color // Expecting tailwind bg class like 'bg-green-600'
            )}
        >
            <span className="relative z-10 text-base font-bold uppercase tracking-wide text-white sm:text-xl">{label}</span>
            <div className="relative z-10 mt-3 rounded-lg bg-black/40 px-4 py-1.5 sm:px-5">
                <span className="text-3xl font-black text-white sm:text-4xl">{count}</span>
            </div>

            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
    );
}
