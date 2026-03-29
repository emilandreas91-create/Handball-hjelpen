import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { clsx } from 'clsx';
import type { TacticCourtType, TacticPath, TacticPathType, TacticToken } from '../../lib/tacticsData';

export type TacticBoardTool = 'token' | TacticPathType;

interface TacticBoardProps {
    courtType: TacticCourtType;
    tokens: TacticToken[];
    paths: TacticPath[];
    activeTool?: TacticBoardTool;
    pendingPathStart?: { x: number; y: number } | null;
    onBoardPoint?: (x: number, y: number) => void;
    onTokenMove?: (tokenId: string, x: number, y: number) => void;
    animateDurationMs?: number;
    title?: string;
    helperText?: string;
    interactive?: boolean;
    presentationMode?: boolean;
}

const pathStyles = {
    move: {
        stroke: '#00f3ff',
        dashArray: undefined,
        marker: 'url(#tactic-arrow-move)',
    },
    pass: {
        stroke: '#ffb020',
        dashArray: '6 6',
        marker: 'url(#tactic-arrow-pass)',
    },
} satisfies Record<TacticPathType, { stroke: string; dashArray?: string; marker: string }>;

export function TacticBoard({
    courtType,
    tokens,
    paths,
    activeTool = 'token',
    pendingPathStart = null,
    onBoardPoint,
    onTokenMove,
    animateDurationMs = 180,
    title,
    helperText,
    interactive = false,
    presentationMode = false,
}: TacticBoardProps) {
    const boardRef = useRef<HTMLDivElement | null>(null);
    const draggingTokenIdRef = useRef<string | null>(null);

    const sortedTokens = useMemo(() => {
        const players = tokens.filter((token) => token.type === 'player');
        const ball = tokens.find((token) => token.type === 'ball');
        return [...players, ...(ball ? [ball] : [])];
    }, [tokens]);

    const calculatePoint = (clientX: number, clientY: number) => {
        const board = boardRef.current;
        if (!board) {
            return null;
        }

        const rect = board.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        return {
            x: Math.min(100, Math.max(0, x)),
            y: Math.min(100, Math.max(0, y)),
        };
    };

    const handleBoardPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!interactive || activeTool === 'token' || !onBoardPoint) {
            return;
        }

        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        const point = calculatePoint(event.clientX, event.clientY);
        if (!point) {
            return;
        }

        onBoardPoint(point.x, point.y);
    };

    const handleTokenPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, tokenId: string) => {
        if (!interactive || activeTool !== 'token' || !onTokenMove) {
            return;
        }

        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        draggingTokenIdRef.current = tokenId;
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!draggingTokenIdRef.current || !onTokenMove) {
            return;
        }

        const point = calculatePoint(event.clientX, event.clientY);
        if (!point) {
            return;
        }

        onTokenMove(draggingTokenIdRef.current, point.x, point.y);
    };

    const stopDragging = () => {
        draggingTokenIdRef.current = null;
    };

    return (
        <div className="flex w-full flex-col items-center">
            {title ? (
                <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-wider text-white/70 sm:text-base">
                    {title}
                </h3>
            ) : null}

            <div
                ref={boardRef}
                className={clsx(
                    'relative w-full max-w-[560px] overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl touch-manipulation',
                    courtType === 'full' ? 'aspect-[4/7]' : 'aspect-[4/5]',
                    presentationMode ? 'bg-slate-950' : 'bg-slate-950/90',
                )}
                style={{
                    background: courtType === 'full'
                        ? 'linear-gradient(180deg, rgba(0,243,255,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(255,102,0,0.08) 100%), #0f172a'
                        : 'radial-gradient(circle at 50% 0%, rgba(0, 243, 255, 0.15) 0%, rgba(0,0,0,0.85) 82%), #0f172a',
                    touchAction: activeTool === 'token' ? 'none' : 'manipulation',
                }}
                onPointerDown={handleBoardPointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={stopDragging}
                onPointerCancel={stopDragging}
                onPointerLeave={() => {
                    if (draggingTokenIdRef.current && activeTool === 'token') {
                        stopDragging();
                    }
                }}
                aria-label={presentationMode ? 'Presentasjonsvisning av taktikk' : 'Taktikktavle'}
            >
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <marker id="tactic-arrow-move" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto">
                            <path d="M0,0 L6,3 L0,6 Z" fill="#00f3ff" />
                        </marker>
                        <marker id="tactic-arrow-pass" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto">
                            <path d="M0,0 L6,3 L0,6 Z" fill="#ffb020" />
                        </marker>
                    </defs>

                    <rect x="2" y="2" width="96" height="96" rx="4" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="1.2" />

                    {courtType === 'half' ? (
                        <>
                            <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
                            <rect x="42.5" y="0" width="15" height="4" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" />
                            <path d="M18 0 A32 32 0 0 0 82 0" fill="rgba(0,243,255,0.05)" stroke="rgba(0,243,255,0.55)" strokeWidth="1.8" />
                            <path d="M8 0 A42 42 0 0 0 92 0" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeDasharray="3 3" />
                            <line x1="47" y1="16" x2="53" y2="16" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" />
                            <line x1="48.5" y1="30" x2="51.5" y2="30" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" />
                        </>
                    ) : (
                        <>
                            <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
                            <circle cx="50" cy="50" r="9" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
                            <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
                            <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
                            <rect x="42.5" y="0" width="15" height="4" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" />
                            <rect x="42.5" y="96" width="15" height="4" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" />
                            <path d="M18 0 A32 32 0 0 0 82 0" fill="rgba(0,243,255,0.05)" stroke="rgba(0,243,255,0.55)" strokeWidth="1.8" />
                            <path d="M18 100 A32 32 0 0 1 82 100" fill="rgba(255,102,0,0.05)" stroke="rgba(255,102,0,0.55)" strokeWidth="1.8" />
                            <path d="M8 0 A42 42 0 0 0 92 0" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeDasharray="3 3" />
                            <path d="M8 100 A42 42 0 0 1 92 100" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeDasharray="3 3" />
                            <line x1="47" y1="16" x2="53" y2="16" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" />
                            <line x1="47" y1="84" x2="53" y2="84" stroke="rgba(255,255,255,0.75)" strokeWidth="1.6" />
                        </>
                    )}

                    {paths.map((path) => (
                        <line
                            key={path.id}
                            x1={path.fromX}
                            y1={path.fromY}
                            x2={path.toX}
                            y2={path.toY}
                            stroke={pathStyles[path.type].stroke}
                            strokeWidth="2.2"
                            strokeDasharray={pathStyles[path.type].dashArray}
                            markerEnd={pathStyles[path.type].marker}
                            opacity="0.95"
                        />
                    ))}

                    {pendingPathStart ? (
                        <circle
                            cx={pendingPathStart.x}
                            cy={pendingPathStart.y}
                            r="2.2"
                            fill={activeTool === 'pass' ? '#ffb020' : '#00f3ff'}
                            stroke="white"
                            strokeWidth="0.8"
                        />
                    ) : null}
                </svg>

                {sortedTokens.map((token) => {
                    const isBall = token.type === 'ball';
                    return (
                        <button
                            key={token.id}
                            type="button"
                            onPointerDown={(event) => handleTokenPointerDown(event, token.id)}
                            className={clsx(
                                'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-lg',
                                isBall
                                    ? 'h-7 w-7 border-orange-300 bg-orange-500 text-[10px] font-black text-black'
                                    : 'h-10 w-10 border-white/90 bg-primary text-sm font-black text-black',
                                interactive && activeTool === 'token' ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none',
                            )}
                            style={{
                                left: `${token.x}%`,
                                top: `${token.y}%`,
                                transitionProperty: 'left, top, transform, opacity',
                                transitionDuration: `${animateDurationMs}ms`,
                                transitionTimingFunction: 'ease-in-out',
                            }}
                            aria-label={isBall ? 'Ball' : `Spiller ${token.label}`}
                        >
                            {isBall ? 'B' : token.label}
                        </button>
                    );
                })}

                {!presentationMode ? (
                    <div className="pointer-events-none absolute bottom-3 right-3 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60">
                        {activeTool === 'token' ? 'Flytt' : activeTool === 'pass' ? 'Pass' : 'Bevegelse'}
                    </div>
                ) : null}
            </div>

            {helperText ? (
                <p className="mt-3 px-2 text-center text-xs text-white/50 sm:text-sm">
                    {helperText}
                </p>
            ) : null}
        </div>
    );
}
