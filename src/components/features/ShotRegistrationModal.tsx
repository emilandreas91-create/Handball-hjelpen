import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import type { TeamSide } from '../../lib/matchData';

type Step = 'court' | 'outcome' | 'goal';
type Outcome = 'goal' | 'save' | 'miss';

interface Props {
    isOpen: boolean;
    side: TeamSide;
    teamName: string;
    onCommit: (courtX: number, courtY: number, outcome: Outcome, goalX: number, goalY: number) => void;
    onClose: () => void;
}

export function ShotRegistrationModal({ isOpen, side, teamName, onCommit, onClose }: Props) {
    const [step, setStep] = useState<Step>('court');
    const [courtPos, setCourtPos] = useState<{ x: number; y: number } | null>(null);
    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const [courtPulse, setCourtPulse] = useState(false);
    const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setStep('court');
        setCourtPos(null);
        setOutcome(null);
        setCourtPulse(false);
    }, [isOpen]);

    useEffect(() => {
        return () => {
            if (advanceTimer.current) clearTimeout(advanceTimer.current);
        };
    }, []);

    const handleClose = () => {
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        onClose();
    };

    const handleCourtClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setCourtPos({ x, y });
        setCourtPulse(true);
        setTimeout(() => setCourtPulse(false), 150);
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        advanceTimer.current = setTimeout(() => setStep('outcome'), 350);
    };

    const handleOutcome = (o: Outcome) => {
        setOutcome(o);
        if (o === 'goal' || o === 'save') {
            setStep('goal');
        } else {
            commit(o, null);
        }
    };

    const handleGoalClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!outcome) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        commit(outcome, { x, y });
    };

    const commit = (o: Outcome, goalPos: { x: number; y: number } | null) => {
        if (!courtPos) return;
        const gx = (goalPos?.x ?? 0.5) * 100;
        const gy = (goalPos?.y ?? 0.5) * 100;
        onCommit(courtPos.x * 100, courtPos.y * 100, o, gx, gy);
        onClose();
    };

    const posLabel = courtPos
        ? (courtPos.x < 0.33 ? 'Venstre fløy' : courtPos.x > 0.66 ? 'Høyre fløy' : 'Midten') +
          (courtPos.y < 0.35 ? ' (6m-sone)' : courtPos.y < 0.65 ? ' (9m)' : ' (bakrom)')
        : '';

    const stepLabel =
        step === 'court' ? 'Steg 1 – Posisjon' :
        step === 'outcome' ? 'Steg 2 – Utfall' :
        'Steg 3 av 3 – Plassering i mål';

    const isGoalOutcome = outcome === 'goal';

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-end bg-black/90 backdrop-blur-sm sm:justify-center sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#0d1a2a] p-5 pb-8 shadow-2xl sm:rounded-3xl sm:pb-5">
                {/* Drag handle – mobile only */}
                <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-white/10 sm:hidden" />

                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                            {stepLabel}
                        </p>
                        <p className={clsx(
                            'mt-1 text-lg font-extrabold',
                            side === 'home' ? 'text-primary' : 'text-secondary',
                        )}>
                            {teamName} – Skudd
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                        aria-label="Lukk"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="mb-4 flex items-center gap-2">
                    <StepDot active={step === 'court'} done={step !== 'court'} side={side} />
                    <div className="h-0.5 max-w-8 flex-1 rounded bg-white/10" />
                    <StepDot active={step === 'outcome'} done={step === 'goal'} side={side} />
                    <div className={clsx('h-0.5 max-w-8 flex-1 rounded', step === 'goal' ? 'bg-white/10' : 'bg-white/[0.03]')} />
                    <StepDot active={step === 'goal'} done={false} side={side} dim={step !== 'goal'} />
                </div>

                {/* ── Step 1: Court ── */}
                {step === 'court' && (
                    <div className="flex flex-col gap-3">
                        <p className="text-center text-xs font-semibold text-gray-500">
                            Trykk på banen der skuddet ble avsluttet fra
                        </p>
                        <div
                            className="relative w-full cursor-crosshair overflow-hidden rounded-2xl border border-[#1a6a32] bg-[#0e5525] transition-colors hover:border-white/25"
                            style={{ aspectRatio: '300/210' }}
                            onClick={handleCourtClick}
                        >
                            <CourtSvg />
                            {courtPos && (
                                <div
                                    className={clsx(
                                        'pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-transform duration-150',
                                        courtPulse ? 'scale-150' : 'scale-100',
                                        side === 'home'
                                            ? 'border-primary shadow-[0_0_0_5px_rgba(0,243,255,0.15)]'
                                            : 'border-secondary shadow-[0_0_0_5px_rgba(255,102,0,0.15)]',
                                    )}
                                    style={{ left: `${courtPos.x * 100}%`, top: `${courtPos.y * 100}%` }}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* ── Step 2: Outcome ── */}
                {step === 'outcome' && (
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 text-xs">
                            <div className={clsx(
                                'h-3 w-3 shrink-0 rounded-full',
                                side === 'home' ? 'bg-primary' : 'bg-secondary',
                            )} />
                            <span className="font-bold text-gray-300">{posLabel}</span>
                            <span className="ml-auto text-gray-600">Steg 2</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                onClick={() => handleOutcome('goal')}
                                className="flex flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br from-green-600 to-green-800 py-5 font-black text-white shadow-lg shadow-green-900/30 transition active:scale-95"
                            >
                                <span className="text-2xl">⚽</span>
                                <span className="text-sm tracking-wide">MÅL</span>
                            </button>
                            <button
                                onClick={() => handleOutcome('save')}
                                className="flex flex-col items-center gap-1.5 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 py-5 font-black text-white shadow-lg shadow-red-900/30 transition active:scale-95"
                            >
                                <span className="text-2xl">🧤</span>
                                <span className="text-sm tracking-wide">REDNING</span>
                            </button>
                            <button
                                onClick={() => handleOutcome('miss')}
                                className="col-span-2 flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 py-4 font-black text-slate-200 shadow transition active:scale-95"
                            >
                                <span className="text-xl">💨</span>
                                <span className="text-sm tracking-wide">BOM</span>
                            </button>
                        </div>
                        <button
                            onClick={() => setStep('court')}
                            className="text-center text-xs font-semibold text-gray-600 transition hover:text-gray-400"
                        >
                            ← Tilbake til posisjon
                        </button>
                    </div>
                )}

                {/* ── Step 3: Goal placement ── */}
                {step === 'goal' && outcome && (
                    <div className="flex flex-col gap-3">
                        <div className={clsx(
                            'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs',
                            isGoalOutcome
                                ? 'border-green-500/20 bg-green-500/5'
                                : 'border-red-500/20 bg-red-500/5',
                        )}>
                            <span className="text-base">{isGoalOutcome ? '⚽' : '🧤'}</span>
                            <span className={clsx('font-bold', isGoalOutcome ? 'text-green-300' : 'text-red-300')}>
                                {isGoalOutcome ? 'MÅL – marker i målet' : 'REDNING – marker i målet'}
                            </span>
                            <span className="ml-auto text-gray-600">Steg 3</span>
                        </div>
                        <p className="text-center text-xs font-semibold text-gray-500">
                            {isGoalOutcome ? 'Trykk der ballen gikk inn' : 'Trykk der keeper tok ballen'}
                        </p>
                        <div
                            className={clsx(
                                'relative w-full cursor-crosshair overflow-hidden rounded-2xl border-2 bg-[#0a1215] transition-colors',
                                isGoalOutcome
                                    ? 'border-green-500/40 hover:border-green-500/70'
                                    : 'border-red-500/40 hover:border-red-500/70',
                            )}
                            style={{ aspectRatio: '3/2' }}
                            onClick={handleGoalClick}
                        >
                            <GoalSvg isGoal={isGoalOutcome} />
                        </div>
                        <button
                            onClick={() => commit(outcome, null)}
                            className="rounded-xl border border-dashed border-white/10 py-2 text-center text-xs font-semibold text-gray-600 transition hover:border-white/20 hover:text-gray-400"
                        >
                            Hopp over målplassering →
                        </button>
                        <button
                            onClick={() => setStep('outcome')}
                            className="text-center text-xs font-semibold text-gray-600 transition hover:text-gray-400"
                        >
                            ← Tilbake til utfall
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function StepDot({ active, done, side, dim }: { active: boolean; done: boolean; side: TeamSide; dim?: boolean }) {
    return (
        <div className={clsx(
            'h-2 w-2 shrink-0 rounded-full transition-all',
            active && side === 'home' && 'bg-primary',
            active && side === 'away' && 'bg-secondary',
            done && 'bg-white/30',
            !active && !done && (dim ? 'bg-white/5' : 'bg-white/10'),
        )} />
    );
}

function CourtSvg() {
    return (
        <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 300 210"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <clipPath id="court-clip">
                    <rect x="0" y="0" width="300" height="210" />
                </clipPath>
            </defs>
            <rect x="0" y="0" width="150" height="210" fill="rgba(0,0,0,0.05)" />
            <rect x="126" y="0" width="48" height="12" fill="rgba(255,255,255,0.12)" />
            <line x1="0" y1="0" x2="126" y2="0" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
            <line x1="174" y1="0" x2="300" y2="0" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
            <rect x="123" y="0" width="4" height="12" fill="white" />
            <rect x="173" y="0" width="4" height="12" fill="white" />
            <line x1="0" y1="12" x2="300" y2="12" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
            <line x1="0" y1="0" x2="0" y2="210" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
            <line x1="300" y1="0" x2="300" y2="210" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
            <line x1="0" y1="210" x2="300" y2="210" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="8,5" />
            <path
                d="M 36,12 A 90,90 0 0 1 126,102 L 174,102 A 90,90 0 0 1 264,12 Z"
                fill="rgba(255,255,255,0.05)"
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="1.5"
                clipPath="url(#court-clip)"
            />
            <path
                d="M -9,12 A 135,135 0 0 1 126,147 L 174,147 A 135,135 0 0 1 309,12"
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="1.5"
                strokeDasharray="7,4"
                clipPath="url(#court-clip)"
            />
            <circle cx="150" cy="117" r="3" fill="rgba(255,255,255,0.55)" />
            <text x="150" y="68" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.25)" fontFamily="sans-serif" fontWeight="600">6m</text>
            <text x="150" y="121" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">7m</text>
            <text x="150" y="152" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.18)" fontFamily="sans-serif">9m</text>
            <text x="18" y="200" fontSize="8" fill="rgba(255,255,255,0.28)" fontFamily="sans-serif" fontWeight="700">V.FLØY</text>
            <text x="282" y="200" textAnchor="end" fontSize="8" fill="rgba(255,255,255,0.28)" fontFamily="sans-serif" fontWeight="700">H.FLØY</text>
            <polygon points="146,18 154,18 150,10" fill="rgba(255,255,255,0.5)" />
        </svg>
    );
}

function GoalSvg({ isGoal }: { isGoal: boolean }) {
    const borderColor = isGoal ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)';
    return (
        <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 300 200"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <pattern id="goal-net" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                </pattern>
            </defs>
            <rect width="300" height="200" fill="url(#goal-net)" />
            <rect x="2" y="2" width="296" height="196" fill="none" stroke={borderColor} strokeWidth="3" />
            <line x1="0" y1="196" x2="300" y2="196" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
            <line x1="100" y1="0" x2="100" y2="200" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="200" y1="0" x2="200" y2="200" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        </svg>
    );
}
