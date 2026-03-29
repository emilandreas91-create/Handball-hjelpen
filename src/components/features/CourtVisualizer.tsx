import React from 'react';
import type { SaveLocation } from '../../lib/matchData';

interface CourtVisualizerProps {
    locations: SaveLocation[];
    onAddLocation: (x: number, y: number) => void;
    teamName: string;
}

export function CourtVisualizer({ locations, onAddLocation, teamName }: CourtVisualizerProps) {
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' && e.button !== 0) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onAddLocation(x, y);
    };

    return (
        <div className="flex w-full flex-col items-center">
            <h3 className="mb-2 text-center text-sm font-bold uppercase tracking-wider text-white/70 sm:text-base">
                Skuddposisjoner - {teamName}
            </h3>

            <div
                className="relative w-full max-w-[520px] aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 shadow-2xl touch-manipulation"
                style={{
                    background: 'radial-gradient(circle at 50% 0%, rgba(0, 243, 255, 0.15) 0%, rgba(0,0,0,0.8) 80%), #0f172a',
                    touchAction: 'manipulation'
                }}
                onPointerDown={handlePointerDown}
                aria-label={`Skuddkart for ${teamName}. Trykk på banen der avslutningen kom fra.`}
            >
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 -10 200 140" preserveAspectRatio="none">
                    <g stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                        <line x1="0" y1="0" x2="200" y2="0" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />

                        <rect x="85" y="-10" width="30" height="10" fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="2" />

                        <path
                            d="M 25 0 A 60 60 0 0 0 85 60 L 115 60 A 60 60 0 0 0 175 0 Z"
                            fill="rgba(0, 243, 255, 0.05)"
                            stroke="rgba(0, 243, 255, 0.6)"
                            strokeWidth="2"
                        />

                        <path
                            d="M -5 0 A 90 90 0 0 0 85 90 L 115 90 A 90 90 0 0 0 205 0"
                            fill="none"
                            strokeDasharray="4, 4"
                        />

                        <line x1="95" y1="70" x2="105" y2="70" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
                        <line x1="97" y1="40" x2="103" y2="40" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
                    </g>
                </svg>

                {locations.map((loc) => (
                    <div
                        key={loc.id}
                        className="absolute m-0 flex h-5 w-5 -ml-2.5 -mt-2.5 items-center justify-center rounded-full border-2 border-white bg-primary p-0 shadow-[0_0_15px_rgba(0,243,255,0.8)] duration-200 animate-in zoom-in sm:h-6 sm:w-6 sm:-ml-3 sm:-mt-3"
                        style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                    >
                        {loc.count > 1 && (
                            <span className="absolute -right-3 -top-3 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-md">
                                {loc.count}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <p className="mt-3 px-2 text-center text-xs text-white/50 sm:text-sm">
                Trykk på banen der skuddet kom fra. Angrep går mot toppen av skjermen.
            </p>
        </div>
    );
}
