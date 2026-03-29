import React from 'react';
import type { SaveLocation } from '../../lib/matchData';

interface GoalVisualizerProps {
    saves: SaveLocation[];
    onAddSave?: (x: number, y: number) => void;
    teamName: string;
    type?: 'save' | 'goal' | 'heatmap';
    title?: string;
    heatmapData?: { zoneX: number, zoneY: number, savePercentage: number }[];
}

export function GoalVisualizer({ saves, onAddSave, teamName, type = 'save', title = 'Redninger', heatmapData }: GoalVisualizerProps) {
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!onAddSave || type === 'heatmap') {
            return;
        }

        if (e.pointerType === 'mouse' && e.button !== 0) {
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onAddSave(x, y);
    };

    const getHeatmapColor = (percentage: number) => {
        if (percentage < 30) return 'rgba(255, 0, 0, 0.5)';
        if (percentage > 50) return 'rgba(0, 255, 0, 0.5)';
        return 'rgba(255, 165, 0, 0.4)';
    };

    const instructions = type === 'save' ? 'Trykk i målet for å registrere redning.' : 'Trykk i målet for å plassere skuddet.';
    const isInteractive = Boolean(onAddSave) && type !== 'heatmap';

    return (
        <div className="flex w-full flex-col items-center">
            <h3 className="mb-2 text-center text-sm font-bold uppercase tracking-wider text-white/70 sm:text-base">
                {title} - {teamName}
            </h3>
            <div
                className={`relative w-full aspect-[3/2] overflow-hidden rounded-xl border-4 bg-black/20 shadow-inner ${type === 'save' ? 'border-red-600' : type === 'heatmap' ? 'border-blue-500' : 'border-green-600'} ${isInteractive ? 'cursor-crosshair touch-manipulation' : 'cursor-default'}`}
                onPointerDown={handlePointerDown}
                aria-label={`${title} for ${teamName}${isInteractive ? `. ${instructions}` : ''}`}
                style={{ touchAction: isInteractive ? 'manipulation' : undefined }}
            >
                <div
                    className="pointer-events-none absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                        backgroundSize: '10px 10px'
                    }}
                />

                <div className="absolute bottom-0 left-0 top-0 z-20 w-2 bg-white/50" />
                <div className="absolute bottom-0 right-0 top-0 z-20 w-2 bg-white/50" />
                <div className="absolute left-0 right-0 top-0 z-20 h-2 bg-white/50" />

                {type === 'heatmap' && heatmapData && (
                    <div className="absolute inset-0 z-10 grid grid-cols-3 grid-rows-3">
                        {[0, 1, 2].map((row) => (
                            [0, 1, 2].map((col) => {
                                const data = heatmapData.find((entry) => entry.zoneX === col && entry.zoneY === row);
                                const percentage = data ? data.savePercentage : 0;

                                return (
                                    <div
                                        key={`${col}-${row}`}
                                        className="flex items-center justify-center border border-white/10 transition-opacity"
                                        style={{ backgroundColor: data ? getHeatmapColor(percentage) : 'transparent' }}
                                    >
                                        {data && percentage > 0 && (
                                            <span className="text-sm font-bold text-white drop-shadow-md">
                                                {percentage}%
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        ))}
                    </div>
                )}

                {type !== 'heatmap' && saves.map((save) => (
                    <div
                        key={save.id}
                        className={`absolute z-30 flex h-7 w-7 -ml-3.5 -mt-3.5 items-center justify-center rounded-full border-2 border-black text-[11px] font-bold text-black shadow-lg duration-200 animate-in zoom-in sm:h-8 sm:w-8 sm:-ml-4 sm:-mt-4 sm:text-xs ${type === 'save' ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ left: `${save.x}%`, top: `${save.y}%` }}
                    >
                        {save.count > 1 ? save.count : ''}
                    </div>
                ))}
            </div>
            {isInteractive && (
                <p className="mt-2 px-2 text-center text-xs text-white/50 sm:text-sm">
                    {instructions}
                </p>
            )}
        </div>
    );
}
