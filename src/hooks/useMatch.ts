import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useAuth } from '../components/features/useAuth';
import {
    addOrIncrementLocation,
    createEmptyTeamState,
    getPeriodLabel,
    normalizeHistory,
    normalizeTeamState,
    removeOrDecrementLocation,
    type MatchData,
    type MatchEvent,
    type ShotResult,
    type StatType,
    type TeamSide,
    type TeamState,
} from '../lib/matchData';
import { db } from '../lib/firebase';

interface MatchContextType {
    matchTime: number;
    isRunning: boolean;
    period: number;
    periodLabel: string;
    homeState: TeamState;
    awayState: TeamState;
    toggleTimer: () => void;
    resetTimer: () => void;
    formatTime: (seconds: number) => string;
    updateStat: (side: TeamSide, type: StatType | string) => void;
    addSave: (side: TeamSide, x: number, y: number) => void;
    addGoalLocation: (side: TeamSide, x: number, y: number) => void;
    addShotLocation: (side: TeamSide, x: number, y: number) => void;
    addCombinedShot: (side: TeamSide, courtX: number, courtY: number, goalX: number, goalY: number, result: ShotResult) => void;
    undoLastStat: () => void;
    canUndo: boolean;
    nextPeriod: () => void;
    resetMatch: () => void;
    loadMatch: (data: MatchData) => void;
    draftRecovered: boolean;
    lastDraftSavedAt: number | null;
    history: MatchEvent[];
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);
const LIVE_MATCH_STORAGE_KEY = 'handball-help-live-match:v1';
const LIVE_MATCH_REMOTE_DOC = 'liveMatchDraft';

interface StoredLiveMatchDraft extends MatchData {
    updatedAt?: number;
}

export function MatchProvider({ children }: { children: React.ReactNode }) {
    const { currentUser } = useAuth();
    const [matchTime, setMatchTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [period, setPeriod] = useState(1);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const remoteSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastRemoteSyncAtRef = useRef(0);
    const lastDraftSavedAtRef = useRef<number | null>(null);

    const [homeState, setHomeState] = useState<TeamState>(createEmptyTeamState());
    const [awayState, setAwayState] = useState<TeamState>(createEmptyTeamState());
    const [history, setHistory] = useState<MatchEvent[]>([]);
    const [draftRecovered, setDraftRecovered] = useState(false);
    const [lastDraftSavedAt, setLastDraftSavedAt] = useState<number | null>(null);
    const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
    const [hasResolvedRemoteDraft, setHasResolvedRemoteDraft] = useState(false);

    const appendHistory = (
        side: TeamSide,
        type: StatType | string,
        data?: Record<string, number | string | boolean | null | undefined>,
    ) => {
        setHistory((prev) => [
            ...prev,
            {
                side,
                type,
                period,
                matchTime,
                createdAt: new Date().toISOString(),
                data,
            },
        ]);
    };

    const applyStoredDraft = (draft: StoredLiveMatchDraft, recovered: boolean) => {
        setMatchTime(Math.max(0, Math.round(draft.matchTime || 0)));
        setPeriod(Math.max(1, Math.round(draft.period || 1)));
        setHomeState(normalizeTeamState(draft.homeState, draft.homeState?.score));
        setAwayState(normalizeTeamState(draft.awayState, draft.awayState?.score));
        setHistory(normalizeHistory(draft.history));
        setIsRunning(false);
        setDraftRecovered(recovered);
        setLastDraftSavedAt(typeof draft.updatedAt === 'number' ? draft.updatedAt : null);
    };

    useEffect(() => {
        lastDraftSavedAtRef.current = lastDraftSavedAt;
    }, [lastDraftSavedAt]);

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setMatchTime((prev) => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isRunning]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setHasHydratedDraft(true);
            return;
        }

        try {
            const rawDraft = window.localStorage.getItem(LIVE_MATCH_STORAGE_KEY);
            if (!rawDraft) {
                return;
            }

            const parsedDraft = JSON.parse(rawDraft) as StoredLiveMatchDraft;
            applyStoredDraft(parsedDraft, true);
        } catch (draftError) {
            console.error('Kunne ikke gjenopprette lokal kampkladd.', draftError);
            window.localStorage.removeItem(LIVE_MATCH_STORAGE_KEY);
        } finally {
            setHasHydratedDraft(true);
        }
    }, []);

    useEffect(() => {
        if (!currentUser) {
            setHasResolvedRemoteDraft(true);
            return;
        }

        setHasResolvedRemoteDraft(false);

        const draftRef = doc(db, 'users', currentUser.uid, 'appState', LIVE_MATCH_REMOTE_DOC);
        const unsubscribe = onSnapshot(
            draftRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setHasResolvedRemoteDraft(true);
                    return;
                }

                const remoteDraft = snapshot.data() as StoredLiveMatchDraft;
                const remoteUpdatedAt = typeof remoteDraft.updatedAt === 'number' ? remoteDraft.updatedAt : 0;
                const localUpdatedAt = lastDraftSavedAtRef.current ?? 0;

                if (remoteUpdatedAt > localUpdatedAt) {
                    applyStoredDraft(remoteDraft, true);
                }

                setHasResolvedRemoteDraft(true);
            },
            (draftError) => {
                console.error('Kunne ikke hente kampkladd fra skyen.', draftError);
                setHasResolvedRemoteDraft(true);
            },
        );

        return unsubscribe;
    }, [currentUser]);

    useEffect(() => {
        if (!hasHydratedDraft || typeof window === 'undefined') {
            return;
        }

        if (remoteSyncTimeoutRef.current) {
            clearTimeout(remoteSyncTimeoutRef.current);
            remoteSyncTimeoutRef.current = null;
        }

        const hasDraftContent = (
            matchTime > 0 ||
            period !== 1 ||
            history.length > 0 ||
            homeState.score > 0 ||
            awayState.score > 0 ||
            homeState.shotLocations.length > 0 ||
            awayState.shotLocations.length > 0
        );

        if (!hasDraftContent) {
            window.localStorage.removeItem(LIVE_MATCH_STORAGE_KEY);
            setLastDraftSavedAt(null);

            if (currentUser && hasResolvedRemoteDraft) {
                void deleteDoc(doc(db, 'users', currentUser.uid, 'appState', LIVE_MATCH_REMOTE_DOC)).catch((draftError) => {
                    console.error('Kunne ikke fjerne kampkladd fra skyen.', draftError);
                });
            }

            return;
        }

        const updatedAt = Date.now();
        const nextDraft: StoredLiveMatchDraft = {
            matchTime,
            period,
            homeState,
            awayState,
            history,
            updatedAt,
        };

        window.localStorage.setItem(LIVE_MATCH_STORAGE_KEY, JSON.stringify(nextDraft));
        setLastDraftSavedAt(updatedAt);

        if (!currentUser || !hasResolvedRemoteDraft) {
            return;
        }

        const syncDelayMs = isRunning ? 4000 : 1200;
        const elapsedSinceRemoteSync = Date.now() - lastRemoteSyncAtRef.current;
        const syncRemoteDraft = () => {
            lastRemoteSyncAtRef.current = Date.now();
            void setDoc(doc(db, 'users', currentUser.uid, 'appState', LIVE_MATCH_REMOTE_DOC), nextDraft).catch((draftError) => {
                console.error('Kunne ikke synkronisere kampkladd til skyen.', draftError);
            });
        };

        if (elapsedSinceRemoteSync >= syncDelayMs) {
            syncRemoteDraft();
            return;
        }

        remoteSyncTimeoutRef.current = setTimeout(syncRemoteDraft, syncDelayMs - elapsedSinceRemoteSync);

        return () => {
            if (remoteSyncTimeoutRef.current) {
                clearTimeout(remoteSyncTimeoutRef.current);
                remoteSyncTimeoutRef.current = null;
            }
        };
    }, [awayState, currentUser, hasHydratedDraft, hasResolvedRemoteDraft, history, homeState, isRunning, matchTime, period]);

    const toggleTimer = () => setIsRunning((current) => !current);

    const resetTimer = () => {
        setIsRunning(false);
        setMatchTime(0);
    };

    const formatTime = (seconds: number) => {
        const safeSeconds = Math.max(0, Math.round(seconds));
        const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
        const remainingSeconds = (safeSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${remainingSeconds}`;
    };

    const updateStat = (side: TeamSide, type: StatType | string) => {
        const setState = side === 'home' ? setHomeState : setAwayState;

        setState((prev) => {
            const nextStats = { ...prev.stats, [type]: (prev.stats[type] || 0) + 1 };
            const nextScore = type === 'goal' ? prev.score + 1 : prev.score;

            return { ...prev, score: nextScore, stats: nextStats };
        });

        appendHistory(side, type);
    };

    const addSave = (side: TeamSide, x: number, y: number) => {
        const setState = side === 'home' ? setHomeState : setAwayState;

        setState((prev) => ({
            ...prev,
            stats: { ...prev.stats, save: prev.stats.save + 1 },
            saves: addOrIncrementLocation(prev.saves, x, y),
        }));

        appendHistory(side, 'save', { x, y });
    };

    const addGoalLocation = (side: TeamSide, x: number, y: number) => {
        const setState = side === 'home' ? setHomeState : setAwayState;

        setState((prev) => ({
            ...prev,
            score: prev.score + 1,
            stats: { ...prev.stats, goal: prev.stats.goal + 1 },
            goalLocations: addOrIncrementLocation(prev.goalLocations, x, y),
        }));

        appendHistory(side, 'goalLocation', { x, y });
    };

    const addShotLocation = (side: TeamSide, x: number, y: number) => {
        const setState = side === 'home' ? setHomeState : setAwayState;

        setState((prev) => ({
            ...prev,
            shotLocations: addOrIncrementLocation(prev.shotLocations, x, y),
        }));

        appendHistory(side, 'shotLocation', { x, y });
    };

    const addCombinedShot = (
        side: TeamSide,
        courtX: number,
        courtY: number,
        goalX: number,
        goalY: number,
        result: ShotResult,
    ) => {
        const setState = side === 'home' ? setHomeState : setAwayState;

        setState((prev) => {
            const nextStats = { ...prev.stats, [result]: (prev.stats[result] || 0) + 1 };
            const nextScore = result === 'goal' ? prev.score + 1 : prev.score;

            return {
                ...prev,
                score: nextScore,
                stats: nextStats,
                shotLocations: addOrIncrementLocation(prev.shotLocations, courtX, courtY),
                goalLocations: result === 'goal'
                    ? addOrIncrementLocation(prev.goalLocations, goalX, goalY)
                    : prev.goalLocations,
                saves: result === 'save'
                    ? addOrIncrementLocation(prev.saves, goalX, goalY)
                    : prev.saves,
            };
        });

        appendHistory(side, 'combinedShot', { courtX, courtY, goalX, goalY, result });
    };

    const undoLastStat = () => {
        setHistory((prevHistory) => {
            if (prevHistory.length === 0) {
                return prevHistory;
            }

            const nextHistory = [...prevHistory];
            const lastAction = nextHistory.pop();

            if (!lastAction) {
                return prevHistory;
            }

            const setState = lastAction.side === 'home' ? setHomeState : setAwayState;

            setState((currentState) => {
                const nextStats = { ...currentState.stats };
                let nextScore = currentState.score;
                let nextSaves = currentState.saves;
                let nextGoalLocations = currentState.goalLocations;
                let nextShotLocations = currentState.shotLocations;

                if (lastAction.type === 'combinedShot' && lastAction.data) {
                    const { courtX, courtY, goalX, goalY, result } = lastAction.data;

                    if (typeof result === 'string') {
                        nextStats[result] = Math.max(0, (nextStats[result] || 0) - 1);
                    }

                    if (result === 'goal') {
                        nextScore = Math.max(0, nextScore - 1);
                    }

                    nextShotLocations = removeOrDecrementLocation(currentState.shotLocations, Number(courtX), Number(courtY));

                    if (result === 'goal') {
                        nextGoalLocations = removeOrDecrementLocation(currentState.goalLocations, Number(goalX), Number(goalY));
                    }

                    if (result === 'save') {
                        nextSaves = removeOrDecrementLocation(currentState.saves, Number(goalX), Number(goalY));
                    }
                } else {
                    nextStats[lastAction.type] = Math.max(0, (currentState.stats[lastAction.type] || 0) - 1);

                    if (lastAction.type === 'goal' || lastAction.type === 'goalLocation') {
                        nextScore = Math.max(0, nextScore - 1);
                    }

                    if (lastAction.type === 'goalLocation') {
                        nextStats.goal = Math.max(0, currentState.stats.goal - 1);
                    }

                    const x = typeof lastAction.data?.x === 'number' ? lastAction.data.x : Number(lastAction.data?.x);
                    const y = typeof lastAction.data?.y === 'number' ? lastAction.data.y : Number(lastAction.data?.y);

                    if (lastAction.type === 'save') {
                        nextSaves = removeOrDecrementLocation(currentState.saves, x, y);
                    }

                    if (lastAction.type === 'goalLocation') {
                        nextGoalLocations = removeOrDecrementLocation(currentState.goalLocations, x, y);
                    }

                    if (lastAction.type === 'shotLocation') {
                        nextShotLocations = removeOrDecrementLocation(currentState.shotLocations, x, y);
                    }
                }

                return {
                    score: nextScore,
                    stats: nextStats,
                    saves: nextSaves,
                    goalLocations: nextGoalLocations,
                    shotLocations: nextShotLocations,
                };
            });

            return nextHistory;
        });
    };

    const nextPeriod = () => {
        setPeriod((current) => current < 4 ? current + 1 : 1);
        setIsRunning(false);
    };

    const resetMatch = () => {
        setIsRunning(false);
        setMatchTime(0);
        setPeriod(1);
        setHomeState(createEmptyTeamState());
        setAwayState(createEmptyTeamState());
        setHistory([]);
        setDraftRecovered(false);
        setLastDraftSavedAt(null);

        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(LIVE_MATCH_STORAGE_KEY);
        }
    };

    const loadMatch = (data: MatchData) => {
        setMatchTime(Math.max(0, Math.round(data.matchTime || 0)));
        setPeriod(Math.max(1, Math.round(data.period || 1)));
        setHomeState(normalizeTeamState(data.homeState, data.homeState?.score));
        setAwayState(normalizeTeamState(data.awayState, data.awayState?.score));
        setHistory(normalizeHistory(data.history));
        setIsRunning(false);
    };

    const value: MatchContextType = {
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
        resetMatch,
        loadMatch,
        draftRecovered,
        lastDraftSavedAt,
        history,
    };

    return React.createElement(MatchContext.Provider, { value }, children);
}

export function useMatchContext() {
    const context = useContext(MatchContext);

    if (context === undefined) {
        throw new Error('useMatchContext must be used within a MatchProvider');
    }

    return context;
}

export type {
    MatchEvent as MatchHistoryEntry,
    MatchStats,
    TeamSide,
} from '../lib/matchData';
