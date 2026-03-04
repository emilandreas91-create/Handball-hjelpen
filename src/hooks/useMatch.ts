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
    goalLocations: SaveLocation[];
    shotLocations: SaveLocation[];
}


export interface MatchData {
    matchTime: number;
    period: number;
    homeState: TeamState;
    awayState: TeamState;
    history: { side: TeamSide, type: StatType | string, data?: any }[];
}

export function useMatch() {
    const [matchTime, setMatchTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [period, setPeriod] = useState(1);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [homeState, setHomeState] = useState<TeamState>({ score: 0, stats: { goal: 0, miss: 0, save: 0, tech: 0, other: 0 }, saves: [], goalLocations: [], shotLocations: [] });
    const [awayState, setAwayState] = useState<TeamState>({ score: 0, stats: { goal: 0, miss: 0, save: 0, tech: 0, other: 0 }, saves: [], goalLocations: [], shotLocations: [] });
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
            const newSaves = _addLocation(prev.saves, x, y);
            return { ...prev, stats: newStats, saves: newSaves };
        });
        setHistory(prev => [...prev, { side, type: 'save', data: { x, y } }]);
    };

    const addGoalLocation = (side: TeamSide, x: number, y: number) => {
        const setState = side === 'home' ? setHomeState : setAwayState;
        setState(prev => {
            const newStats = { ...prev.stats, goal: prev.stats.goal + 1 };
            const newGoalLocations = _addLocation(prev.goalLocations, x, y);
            return { ...prev, score: prev.score + 1, stats: newStats, goalLocations: newGoalLocations };
        });
        setHistory(prev => [...prev, { side, type: 'goalLocation', data: { x, y } }]);
    };

    const addShotLocation = (side: TeamSide, x: number, y: number) => {
        const setState = side === 'home' ? setHomeState : setAwayState;
        setState(prev => {
            const newShotLocations = _addLocation(prev.shotLocations, x, y);
            return { ...prev, shotLocations: newShotLocations };
        });
        setHistory(prev => [...prev, { side, type: 'shotLocation', data: { x, y } }]);
    };

    const addCombinedShot = (side: TeamSide, courtX: number, courtY: number, goalX: number, goalY: number, result: 'goal' | 'save' | 'miss') => {
        const setState = side === 'home' ? setHomeState : setAwayState;

        setState(prev => {
            const newStats = { ...prev.stats, [result]: prev.stats[result] + 1 };
            let newScore = prev.score;
            if (result === 'goal') newScore += 1;

            const newShotLocations = _addLocation(prev.shotLocations, courtX, courtY);
            let newGoalLocations = prev.goalLocations;
            let newSaves = prev.saves;

            if (result === 'goal') {
                newGoalLocations = _addLocation(prev.goalLocations, goalX, goalY);
            } else if (result === 'save') {
                newSaves = _addLocation(prev.saves, goalX, goalY);
            }

            return {
                ...prev,
                score: newScore,
                stats: newStats,
                shotLocations: newShotLocations,
                goalLocations: newGoalLocations,
                saves: newSaves
            };
        });

        setHistory(prev => [...prev, {
            side,
            type: 'combinedShot',
            data: { courtX, courtY, goalX, goalY, result }
        }]);
    };

    // Helper to add location with tolerance group
    const _addLocation = (locations: SaveLocation[], x: number, y: number) => {
        const tolerance = 5;
        const existingIndex = locations.findIndex(s =>
            Math.abs(s.x - x) < tolerance && Math.abs(s.y - y) < tolerance
        );

        let newLocations = [...locations];
        let saveId = `loc_${Date.now()}`;

        if (existingIndex >= 0) {
            const existing = newLocations[existingIndex];
            newLocations[existingIndex] = { ...existing, count: existing.count + 1 };
        } else {
            newLocations.push({ id: saveId, x, y, count: 1 });
        }
        return newLocations;
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
                    let newScore = currentState.score;
                    let newStats = { ...currentState.stats };
                    let newSaves = currentState.saves;
                    let newGoalLocations = currentState.goalLocations;
                    let newShotLocations = currentState.shotLocations;

                    if (type === 'combinedShot' && lastAction.data) {
                        const { courtX, courtY, goalX, goalY, result } = lastAction.data;
                        newStats[result] = Math.max(0, newStats[result] - 1);
                        if (result === 'goal') newScore = Math.max(0, newScore - 1);

                        newShotLocations = _removeLocation(currentState.shotLocations, courtX, courtY);
                        if (result === 'goal') {
                            newGoalLocations = _removeLocation(currentState.goalLocations, goalX, goalY);
                        } else if (result === 'save') {
                            newSaves = _removeLocation(currentState.saves, goalX, goalY);
                        }
                    } else {
                        const currentCount = currentState.stats[type] || 0;
                        newStats[type] = Math.max(0, currentCount - 1);

                        if (type === 'goal' || type === 'goalLocation') newScore = Math.max(0, newScore - 1);
                        if (type === 'goalLocation') newStats.goal = Math.max(0, currentState.stats.goal - 1);

                        if ((type === 'save' || type === 'goalLocation' || type === 'shotLocation') && lastAction.data) {
                            const { x, y } = lastAction.data;

                            if (type === 'save') newSaves = _removeLocation(currentState.saves, x, y);
                            if (type === 'goalLocation') newGoalLocations = _removeLocation(currentState.goalLocations, x, y);
                            if (type === 'shotLocation') newShotLocations = _removeLocation(currentState.shotLocations, x, y);
                        }
                    }

                    return {
                        score: newScore,
                        stats: newStats,
                        saves: newSaves,
                        goalLocations: newGoalLocations,
                        shotLocations: newShotLocations
                    };
                });
            }
            return newHistory;
        });
    };

    // Helper to remove location
    const _removeLocation = (locations: SaveLocation[], x: number, y: number) => {
        const tolerance = 5;
        const existingIndex = locations.findIndex(s =>
            Math.abs(s.x - x) < tolerance && Math.abs(s.y - y) < tolerance
        );

        if (existingIndex >= 0) {
            const existing = locations[existingIndex];
            const newLocations = [...locations];
            if (existing.count > 1) {
                newLocations[existingIndex] = { ...existing, count: existing.count - 1 };
            } else {
                newLocations.splice(existingIndex, 1);
            }
            return newLocations;
        }
        return locations;
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

    const loadMatch = (data: MatchData) => {
        setMatchTime(data.matchTime);
        setPeriod(data.period);
        setHomeState(data.homeState);
        setAwayState(data.awayState);
        setHistory(data.history);
        setIsRunning(false);
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
        addGoalLocation,
        addShotLocation,
        addCombinedShot,
        undoLastStat,
        canUndo: history.length > 0,
        nextPeriod,
        loadMatch,
        history // Expose history for export
    };
}
