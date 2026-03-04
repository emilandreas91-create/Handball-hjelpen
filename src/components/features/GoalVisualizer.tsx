import React from 'react';

import { SaveLocation } from '../../hooks/useMatch';

interface GoalVisualizerProps {
    saves: SaveLocation[];
    onAddSave?: (x: number, y: number) => void;
    teamName: string;
    type?: 'save' | 'goal';
    title?: string;
}

export function GoalVisualizer({ saves, onAddSave, teamName, type = 'save', title = 'Redninger' }: GoalVisualizerProps) {
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!onAddSave) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        onAddSave(x, y);
    };

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-white/70 mb-2 text-sm font-bold uppercase tracking-wider">{title} - {teamName}</h3>
            <div
                className={`relative w-full aspect-[3/2] bg-black/20 border-4 rounded-lg overflow-hidden shadow-inner ${type === 'save' ? 'border-red-600' : 'border-green-600'} ${onAddSave ? 'cursor-crosshair' : 'cursor-default'}`}
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
                <div className="absolute top-0 bottom-0 left-0 w-2 bg-white/50" />
                <div className="absolute top-0 bottom-0 right-0 w-2 bg-white/50" />
                <div className="absolute top-0 left-0 right-0 h-2 bg-white/50" />

                {/* Saves / Goals */}
                {saves.map(save => (
                    <div
                        key={save.id}
                        className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full border-2 border-black flex items-center justify-center text-xs font-bold text-black shadow-lg animate-in zoom-in duration-200 ${type === 'save' ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ left: `${save.x}%`, top: `${save.y}%` }}
                    >
                        {save.count > 1 ? save.count : ''}
                    </div>
                ))}
            </div>
            {onAddSave && <p className="text-white/40 text-xs mt-2">Trykk i målet for å registrere {type === 'save' ? 'redning' : 'mål'}</p>}
        </div>
    );
}
