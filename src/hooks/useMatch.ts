import { useState, useEffect, useRef } from 'react';

export type TeamSide = 'home' | 'away';
export type StatType = 'goal' | 'miss' | 'save' | 'tech';

export interface MatchStats {
    goal: number;
    miss: number;
    save: number;
    tech: number;
    [key: string]: number; // Allow custom stats
}

export interface TeamState {
    score: number;
    stats: MatchStats;
}

export function useMatch() {
    const [matchTime, setMatchTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [period, setPeriod] = useState(1);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const [homeState, setHomeState] = useState<TeamState>({ score: 0, stats: { goal: 0, miss: 0, save: 0, tech: 0 } });
    const [awayState, setAwayState] = useState<TeamState>({ score: 0, stats: { goal: 0, miss: 0, save: 0, tech: 0 } });

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
            return { score: newScore, stats: newStats };
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
        nextPeriod
    };
}
