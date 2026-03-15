import React from 'react';

import { SaveLocation } from '../../hooks/useMatch';

interface GoalVisualizerProps {
    saves: SaveLocation[];
    onAddSave?: (x: number, y: number) => void;
    teamName: string;
    type?: 'save' | 'goal' | 'heatmap';
    title?: string;
    heatmapData?: { zoneX: number, zoneY: number, savePercentage: number }[];
}

export function GoalVisualizer({ saves, onAddSave, teamName, type = 'save', title = 'Redninger', heatmapData }: GoalVisualizerProps) {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onAddSave || type === 'heatmap') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onAddSave(x, y);
    };

    const getHeatmapColor = (percentage: number) => {
        if (percentage < 30) return 'rgba(255, 0, 0, 0.5)'; // Low save % = red
        if (percentage > 50) return 'rgba(0, 255, 0, 0.5)'; // High save % = green
        return 'rgba(255, 165, 0, 0.4)'; // Mid save % = orange
    };

    return (
        <div className="flex flex-col items-center w-full">
            <h3 className="text-white/70 mb-2 text-sm font-bold uppercase tracking-wider">{title} - {teamName}</h3>
            <div
                className={`relative w-full aspect-[3/2] bg-black/20 border-4 rounded-lg overflow-hidden shadow-inner ${type === 'save' ? 'border-red-600' : type === 'heatmap' ? 'border-blue-500' : 'border-green-600'} ${onAddSave && type !== 'heatmap' ? 'cursor-crosshair' : 'cursor-default'}`}
                onClick={handleClick}
            >
                {/* Goal Frame/Net Visualization */}
                <div className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                        backgroundSize: '10px 10px'
                    }}
                />

                {/* Goal Posts (Visual Only) */}
                <div className="absolute top-0 bottom-0 left-0 w-2 bg-white/50 z-20" />
                <div className="absolute top-0 bottom-0 right-0 w-2 bg-white/50 z-20" />
                <div className="absolute top-0 left-0 right-0 h-2 bg-white/50 z-20" />

                {/* Heatmap Grid Overlay */}
                {type === 'heatmap' && heatmapData && (
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 z-10">
                        {[0, 1, 2].map(row => (
                            [0, 1, 2].map(col => {
                                const data = heatmapData.find(d => d.zoneX === col && d.zoneY === row);
                                const percentage = data ? data.savePercentage : 0;
                                return (
                                    <div
                                        key={`${col}-${row}`}
                                        className="border border-white/10 flex flex-col justify-center items-center transition-opacity"
                                        style={{ backgroundColor: data ? getHeatmapColor(percentage) : 'transparent' }}
                                    >
                                        {data && percentage > 0 && (
                                            <span className="text-white font-bold text-sm drop-shadow-md">
                                                {percentage}%
                                            </span>
                                        )}
                                    </div>
                                )
                            })
                        ))}
                    </div>
                )}

                {/* Saves / Goals */}
                {type !== 'heatmap' && saves.map(save => (
                    <div
                        key={save.id}
                        className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-black flex items-center justify-center text-xs font-bold text-black shadow-lg animate-in zoom-in duration-200 z-30 ${type === 'save' ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ left: `${save.x}%`, top: `${save.y}%` }}
                    >
                        {save.count > 1 ? save.count : ''}
                    </div>
                ))}
            </div>
            {onAddSave && type !== 'heatmap' && <p className="text-white/40 text-xs mt-2 text-center">Trykk i målet for å registrere {type === 'save' ? 'redning' : 'mål'}</p>}
        </div>
    );
}
