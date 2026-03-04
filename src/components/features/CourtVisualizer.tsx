import React from 'react';
import { SaveLocation } from '../../hooks/useMatch';

interface CourtVisualizerProps {
    locations: SaveLocation[];
    onAddLocation: (x: number, y: number) => void;
    teamName: string;
}

export function CourtVisualizer({ locations, onAddLocation, teamName }: CourtVisualizerProps) {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onAddLocation(x, y);
    };

    return (
        <div className="flex flex-col items-center w-full">
            <h3 className="text-white/70 mb-2 text-sm font-bold uppercase tracking-wider">Skuddposisjoner - {teamName}</h3>

            <div
                className="relative w-full aspect-[4/3] max-w-[500px] rounded-xl overflow-hidden cursor-crosshair shadow-2xl border border-white/10"
                style={{ background: 'radial-gradient(circle at 50% 0%, rgba(0, 243, 255, 0.15) 0%, rgba(0,0,0,0.8) 80%), #0f172a' }}
                onClick={handleClick}
            >
                {/* Court Markings SVG */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 -10 200 140" preserveAspectRatio="none">
                    <g stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                        {/* Court bounds (if needed to see edges) */}
                        <line x1="0" y1="0" x2="200" y2="0" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />

                        {/* Goal Net */}
                        <rect x="85" y="-10" width="30" height="10" fill="rgba(255, 255, 255, 0.1)" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="2" />

                        {/* 6m Area Fill & Line */}
                        <path
                            d="M 25 0 A 60 60 0 0 0 85 60 L 115 60 A 60 60 0 0 0 175 0 Z"
                            fill="rgba(0, 243, 255, 0.05)"
                            stroke="rgba(0, 243, 255, 0.6)"
                            strokeWidth="2"
                        />

                        {/* 9m Line (Dashed) */}
                        <path
                            d="M -5 0 A 90 90 0 0 0 85 90 L 115 90 A 90 90 0 0 0 205 0"
                            fill="none"
                            strokeDasharray="4, 4"
                        />

                        {/* 7m mark */}
                        <line x1="95" y1="70" x2="105" y2="70" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />

                        {/* 4m goalkeeper limit */}
                        <line x1="97" y1="40" x2="103" y2="40" stroke="rgba(255,255,255,0.8)" strokeWidth="2" />
                    </g>
                </svg>

                {/* Locations */}
                {locations.map(loc => (
                    <div
                        key={loc.id}
                        className="absolute w-4 h-4 -ml-2 -mt-2 bg-primary rounded-full border-2 border-white shadow-[0_0_15px_rgba(0,243,255,0.8)] animate-in zoom-in duration-200 flex items-center justify-center p-0 m-0"
                        style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                    >
                        {loc.count > 1 && (
                            <span className="absolute -top-3 -right-3 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md z-10">
                                {loc.count}
                            </span>
                        )}
                    </div>
                ))}
            </div>

            <p className="text-white/40 text-xs mt-3 text-center">
                Trykk på banen der skuddet kom fra (angrep mot toppen av skjermen)
            </p>
        </div>
    );
}

