import { clsx } from 'clsx';
import { CheckCircle2, Info, WifiOff } from 'lucide-react';

interface FeedbackBannerProps {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

const styles = {
    success: 'border-green-500/30 bg-green-500/10 text-green-100',
    error: 'border-red-500/30 bg-red-500/10 text-red-100',
    info: 'border-primary/30 bg-primary/10 text-primary',
    warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100',
} satisfies Record<FeedbackBannerProps['type'], string>;

export function FeedbackBanner({ type, message }: FeedbackBannerProps) {
    return (
        <div className={clsx('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm', styles[type])} aria-live="polite">
            {type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : null}
            {type === 'info' ? <Info size={18} className="mt-0.5 shrink-0" /> : null}
            {type === 'warning' ? <WifiOff size={18} className="mt-0.5 shrink-0" /> : null}
            {type === 'error' ? <Info size={18} className="mt-0.5 shrink-0" /> : null}
            <span>{message}</span>
        </div>
    );
}
