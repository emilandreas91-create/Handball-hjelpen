import { clsx } from 'clsx';
import { StatType } from '../../hooks/useMatch';

interface StatButtonProps {
    type: StatType;
    label: string;
    count: number;
    onClick: () => void;
    color: string;
}

export function StatButton({ label, count, onClick, color }: StatButtonProps) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-transparent transition-all active:scale-95 hover:brightness-110 shadow-lg overflow-hidden group",
                color // Expecting tailwind bg class like 'bg-green-600'
            )}
        >
            <span className="text-xl font-bold text-white uppercase tracking-wider relative z-10">{label}</span>
            <div className="mt-2 bg-black/40 px-4 py-1 rounded-lg relative z-10">
                <span className="text-3xl font-black text-white">{count}</span>
            </div>

            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
}
