import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
    isOpen: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    actions?: ReactNode;
    children?: ReactNode;
}

export function Dialog({ isOpen, title, description, onClose, actions, children }: DialogProps) {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="relative w-full rounded-t-3xl border border-white/10 bg-card p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dialog-title"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-gray-400 transition-colors hover:bg-white/20 hover:text-white"
                    aria-label="Lukk dialog"
                >
                    <X size={18} />
                </button>

                <h2 id="dialog-title" className="pr-10 text-2xl font-bold text-white">
                    {title}
                </h2>
                {description ? (
                    <p className="mt-3 text-sm leading-6 text-gray-400">{description}</p>
                ) : null}
                {children ? <div className="mt-5">{children}</div> : null}
                {actions ? <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">{actions}</div> : null}
            </div>
        </div>
    );
}
