import { useState, useEffect, useRef } from 'react';

export type TeamSide = 'home' | 'away';
export type StatType = 'goal' | 'miss' | 'save' | 'tech' | 'other';

export interface MatchStats {
    goal: number;
    miss: number;
    save: number;
    tech: number;
    [key: string]: number; // Allow custom stats
}

export interface SaveLocation {
    id: string;
    x: number;
    y: number;
    count: number;
}

export interface TeamState {
    score: number;
    stats: MatchStats;
    saves: SaveLocation[];
}

export function useMatch() {
    const [matchTime, setMatchTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [period, setPeriod] = useState(1);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [homeState, setHomeState] = useState<TeamState>({ score: 0, stats: { goal: 0, miss: 0, save: 0, tech: 0, other: 0 }, saves: [] });
    const [awayState, setAwayState] = useState<TeamState>({ score: 0, stats: { goal: 0, miss: 0, save: 0, tech: 0, other: 0 }, saves: [] });
    const [history, setHistory] = useState<{ side: TeamSide, type: StatType | string, data?: any }[]>([]);

    // Timer Logic
    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setMatchTime(prev => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning]);

    const toggleTimer = () => setIsRunning(!isRunning);
    const resetTimer = () => { setIsRunning(false); setMatchTime(0); };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const updateStat = (side: TeamSide, type: StatType | string) => {
        const setState = side === 'home' ? setHomeState : setAwayState;
        setState(prev => {
            const newStats = { ...prev.stats, [type]: (prev.stats[type] || 0) + 1 };
            let newScore = prev.score;
            if (type === 'goal') newScore += 1;
            return { ...prev, score: newScore, stats: newStats };
        });
        setHistory(prev => [...prev, { side, type }]);
    };

    const addSave = (side: TeamSide, x: number, y: number) => {
        const setState = side === 'home' ? setHomeState : setAwayState;

        setState(prev => {
            const newStats = { ...prev.stats, save: prev.stats.save + 1 };

            // Check for existing save near this location (5% tolerance)
            const tolerance = 5;
            const existingIndex = prev.saves.findIndex(s =>
                Math.abs(s.x - x) < tolerance && Math.abs(s.y - y) < tolerance
            );

            let newSaves = [...prev.saves];
            let saveId = `save_${Date.now()}`;

            if (existingIndex >= 0) {
                // Increment count of existing save
                const existing = newSaves[existingIndex];
                newSaves[existingIndex] = { ...existing, count: existing.count + 1 };
                saveId = existing.id; // Track which save was modified
            } else {
                // Add new save
                newSaves.push({ id: saveId, x, y, count: 1 });
            }

            return { ...prev, stats: newStats, saves: newSaves };
        });

        setHistory(prev => [...prev, { side, type: 'save', data: { x, y } }]);
    };

    const undoLastStat = () => {
        setHistory(prev => {
            if (prev.length === 0) return prev;
            const newHistory = [...prev];
            const lastAction = newHistory.pop();

            if (lastAction) {
                const { side, type } = lastAction;
                const setState = side === 'home' ? setHomeState : setAwayState;
                setState(currentState => {
                    const currentCount = currentState.stats[type] || 0;
                    const newStats = { ...currentState.stats, [type]: Math.max(0, currentCount - 1) };
                    let newScore = currentState.score;
                    if (type === 'goal') newScore = Math.max(0, newScore - 1);

                    let newSaves = currentState.saves;
                    if (type === 'save' && lastAction.data) {
                        // Find the save at this location and decrement/remove
                        const { x, y } = lastAction.data;
                        const tolerance = 5;
                        const existingIndex = newSaves.findIndex(s =>
                            Math.abs(s.x - x) < tolerance && Math.abs(s.y - y) < tolerance
                        );

                        if (existingIndex >= 0) {
                            const existing = newSaves[existingIndex];
                            newSaves = [...newSaves];
                            if (existing.count > 1) {
                                newSaves[existingIndex] = { ...existing, count: existing.count - 1 };
                            } else {
                                newSaves.splice(existingIndex, 1);
                            }
                        }
                    }

                    return { score: newScore, stats: newStats, saves: newSaves };
                });
            }
            return newHistory;
        });
    };

    const nextPeriod = () => {
        setPeriod(p => p < 4 ? p + 1 : 1);
        setIsRunning(false);
    };

    const getPeriodLabel = (p: number) => {
        switch (p) {
            case 1: return '1. OMG';
            case 2: return '2. OMG';
            case 3: return 'PAUSE';
            case 4: return 'SLUTT';
            default: return '1. OMG';
        }
    };

    return {
        matchTime,
        isRunning,
        period,
        periodLabel: getPeriodLabel(period),
        homeState,
        awayState,
        toggleTimer,
        resetTimer,
        formatTime,
        updateStat,
        addSave,
        undoLastStat,
        canUndo: history.length > 0,
        nextPeriod
    };
}
