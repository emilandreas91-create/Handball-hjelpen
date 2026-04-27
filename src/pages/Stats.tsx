import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { clsx } from 'clsx';
import {
    CheckCircle2,
    Edit2,
    Info,
    Loader2,
    Pause,
    Play,
    Plus,
    RefreshCcw,
    RotateCcw,
    Save as SaveIcon,
    Trash2,
    Users,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { StatButton } from '../components/features/StatButton';
import { GoalVisualizer } from '../components/features/GoalVisualizer';
import { CourtVisualizer } from '../components/features/CourtVisualizer';
import { ShotRegistrationModal } from '../components/features/ShotRegistrationModal';
import { useAuth } from '../components/features/useAuth';
import { Dialog } from '../components/ui/Dialog';
import { useMatchContext } from '../hooks/useMatch';
import { useTeams } from '../hooks/useTeams';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { db } from '../lib/firebase';
import {
    LIVE_STATS_DEFAULTS_KEY,
    LIVE_STATS_DEFAULTS_REMOTE_DOC,
    LIVE_STATS_UI_KEY,
    LIVE_STATS_UI_REMOTE_DOC,
    normalizeLiveStatsDefaults,
    normalizeLiveStatsUiDraft,
    type LiveStatsButtonDefinition,
    type LiveStatsDefaults,
    type LiveStatsUiDraft,
} from '../lib/liveStatsState';
import { type CloudSyncState, prepareFirestorePayload, readScopedLocalStorage, removeScopedLocalStorage, writeScopedLocalStorage } from '../lib/persistence';
import {
    buildStoredMatchDocument,
    type CustomStatDefinition,
    type MatchEvent,
    type TeamReference,
    type TeamSide,
} from '../lib/matchData';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

interface FeedbackState {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

export function Stats() {
    const navigate = useNavigate();
    const uiDraftSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const defaultsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastUiDraftSavedAtRef = useRef<number | null>(null);
    const lastDefaultsSavedAtRef = useRef<number | null>(null);
    const homeTeamIdRef = useRef('');
    const awayTeamIdRef = useRef('');
    const {
        matchTime,
        isRunning,
        period,
        periodLabel,
        homeState,
        awayState,
        toggleTimer,
        formatTime,
        updateStat,
        nextPeriod,
        undoLastStat,
        canUndo,
        addCombinedShot,
        history,
        resetMatch,
        draftRecovered,
        draftRecoveredFrom,
        lastDraftSavedAt,
        cloudSyncState: matchCloudSyncState,
        lastCloudSyncAt: lastMatchCloudSyncAt,
    } = useMatchContext();

    const { teams, loading: teamsLoading, error } = useTeams();
    const { currentUser } = useAuth();
    const isOnline = useOnlineStatus();

    const [activeSide, setActiveSide] = useState<TeamSide>('home');
    const [homeTeamId, setHomeTeamId] = useState('');
    const [awayTeamId, setAwayTeamId] = useState('');
    const [matchName, setMatchName] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [customButtons, setCustomButtons] = useState<LiveStatsButtonDefinition[]>([]);
    const [shotModalSide, setShotModalSide] = useState<TeamSide | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [lastHistorySaveAt, setLastHistorySaveAt] = useState<number | null>(null);
    const [hasHydratedUiDraft, setHasHydratedUiDraft] = useState(false);
    const [isMatchStarted, setIsMatchStarted] = useState(false);
    const [showSetupPanel, setShowSetupPanel] = useState(false);
    const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
    const [buttonLabelDraft, setButtonLabelDraft] = useState('');
    const [pendingDeleteButtonId, setPendingDeleteButtonId] = useState<string | null>(null);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
    const [savedMatchName, setSavedMatchName] = useState('');
    const [isSaveSuccessDialogOpen, setIsSaveSuccessDialogOpen] = useState(false);
    const [lastUiDraftSavedAt, setLastUiDraftSavedAt] = useState<number | null>(null);
    const [lastDefaultsSavedAt, setLastDefaultsSavedAt] = useState<number | null>(null);
    const [uiCloudSyncState, setUiCloudSyncState] = useState<CloudSyncState>('idle');
    const [defaultsCloudSyncState, setDefaultsCloudSyncState] = useState<CloudSyncState>('idle');
    const [lastUiCloudSyncAt, setLastUiCloudSyncAt] = useState<number | null>(null);
    const [lastDefaultsCloudSyncAt, setLastDefaultsCloudSyncAt] = useState<number | null>(null);
    const [hasResolvedRemoteUiDraft, setHasResolvedRemoteUiDraft] = useState(false);
    const [hasResolvedRemoteDefaults, setHasResolvedRemoteDefaults] = useState(false);

    const applyUiDraft = (draft: LiveStatsUiDraft) => {
        setActiveSide(draft.activeSide === 'away' ? 'away' : 'home');
        setHomeTeamId(typeof draft.homeTeamId === 'string' ? draft.homeTeamId : '');
        setAwayTeamId(typeof draft.awayTeamId === 'string' ? draft.awayTeamId : '');
        setMatchName(typeof draft.matchName === 'string' ? draft.matchName : '');
        setIsMatchStarted(Boolean(draft.isMatchStarted));
        setCustomButtons(Array.isArray(draft.customButtons) ? draft.customButtons : []);
        setLastUiDraftSavedAt(typeof draft.updatedAt === 'number' ? draft.updatedAt : null);
    };

    const applyDefaults = (defaults: LiveStatsDefaults) => {
        setHomeTeamId(typeof defaults.homeTeamId === 'string' ? defaults.homeTeamId : '');
        setAwayTeamId(typeof defaults.awayTeamId === 'string' ? defaults.awayTeamId : '');
        setLastDefaultsSavedAt(typeof defaults.updatedAt === 'number' ? defaults.updatedAt : null);
    };

    const resetUiDraftState = () => {
        setActiveSide('home');
        setHomeTeamId('');
        setAwayTeamId('');
        setMatchName('');
        setIsEditMode(false);
        setCustomButtons([]);
        setShotModalSide(null);
        setSaveState('idle');
        setFeedback(null);
        setLastHistorySaveAt(null);
        setIsMatchStarted(false);
        setShowSetupPanel(false);
        setEditingButtonId(null);
        setButtonLabelDraft('');
        setPendingDeleteButtonId(null);
        setIsResetDialogOpen(false);
        setSavedMatchName('');
        setIsSaveSuccessDialogOpen(false);
        setLastUiDraftSavedAt(null);
        setLastDefaultsSavedAt(null);
        setUiCloudSyncState('idle');
        setDefaultsCloudSyncState('idle');
        setLastUiCloudSyncAt(null);
        setLastDefaultsCloudSyncAt(null);
    };

    useEffect(() => {
        lastUiDraftSavedAtRef.current = lastUiDraftSavedAt;
    }, [lastUiDraftSavedAt]);

    useEffect(() => {
        lastDefaultsSavedAtRef.current = lastDefaultsSavedAt;
    }, [lastDefaultsSavedAt]);

    useEffect(() => {
        homeTeamIdRef.current = homeTeamId;
        awayTeamIdRef.current = awayTeamId;
    }, [awayTeamId, homeTeamId]);

    useEffect(() => {
        if (uiDraftSyncTimeoutRef.current) {
            clearTimeout(uiDraftSyncTimeoutRef.current);
            uiDraftSyncTimeoutRef.current = null;
        }

        if (defaultsSyncTimeoutRef.current) {
            clearTimeout(defaultsSyncTimeoutRef.current);
            defaultsSyncTimeoutRef.current = null;
        }

        setHasHydratedUiDraft(false);
        resetUiDraftState();

        if (typeof window === 'undefined') {
            setHasHydratedUiDraft(true);
            return;
        }

        try {
            const parsedDraft = readScopedLocalStorage(
                LIVE_STATS_UI_KEY,
                currentUser?.uid,
                normalizeLiveStatsUiDraft,
            );
            if (parsedDraft) {
                applyUiDraft(parsedDraft);
                return;
            }

            const parsedDefaults = readScopedLocalStorage(
                LIVE_STATS_DEFAULTS_KEY,
                currentUser?.uid,
                normalizeLiveStatsDefaults,
            );
            if (parsedDefaults) {
                applyDefaults(parsedDefaults);
            }
        } catch (draftError) {
            console.error('Kunne ikke gjenopprette lokalt kampoppsett.', draftError);
            removeScopedLocalStorage(LIVE_STATS_UI_KEY, currentUser?.uid);
            removeScopedLocalStorage(LIVE_STATS_DEFAULTS_KEY, currentUser?.uid);
        } finally {
            setHasHydratedUiDraft(true);
        }
    }, [currentUser?.uid]);

    useEffect(() => {
        if (!currentUser) {
            setHasResolvedRemoteUiDraft(true);
            setUiCloudSyncState('idle');
            setLastUiCloudSyncAt(null);
            return;
        }

        setHasResolvedRemoteUiDraft(false);

        const uiDraftRef = doc(db, 'users', currentUser.uid, 'appState', LIVE_STATS_UI_REMOTE_DOC);
        const unsubscribe = onSnapshot(
            uiDraftRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setHasResolvedRemoteUiDraft(true);
                    return;
                }

                const remoteDraft = normalizeLiveStatsUiDraft(snapshot.data());
                const remoteUpdatedAt = remoteDraft?.updatedAt ?? 0;
                const localUpdatedAt = lastUiDraftSavedAtRef.current ?? 0;

                if (remoteDraft && remoteUpdatedAt > localUpdatedAt) {
                    applyUiDraft(remoteDraft);
                }

                if (remoteDraft && remoteUpdatedAt > 0) {
                    setLastUiCloudSyncAt(remoteUpdatedAt);
                    setUiCloudSyncState('synced');
                }

                setHasResolvedRemoteUiDraft(true);
            },
            (draftError) => {
                console.error('Kunne ikke hente kampoppsett fra skyen.', draftError);
                setHasResolvedRemoteUiDraft(true);
            },
        );

        return unsubscribe;
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) {
            setHasResolvedRemoteDefaults(true);
            setDefaultsCloudSyncState('idle');
            setLastDefaultsCloudSyncAt(null);
            return;
        }

        setHasResolvedRemoteDefaults(false);

        const defaultsRef = doc(db, 'users', currentUser.uid, 'appState', LIVE_STATS_DEFAULTS_REMOTE_DOC);
        const unsubscribe = onSnapshot(
            defaultsRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setHasResolvedRemoteDefaults(true);
                    return;
                }

                const remoteDefaults = normalizeLiveStatsDefaults(snapshot.data());
                const remoteUpdatedAt = remoteDefaults?.updatedAt ?? 0;
                const localUpdatedAt = lastDefaultsSavedAtRef.current ?? 0;

                if (remoteDefaults && remoteUpdatedAt > localUpdatedAt && !homeTeamIdRef.current && !awayTeamIdRef.current) {
                    applyDefaults(remoteDefaults);
                }

                if (remoteDefaults && remoteUpdatedAt > 0) {
                    setLastDefaultsCloudSyncAt(remoteUpdatedAt);
                    setDefaultsCloudSyncState('synced');
                }

                setHasResolvedRemoteDefaults(true);
            },
            (defaultsError) => {
                console.error('Kunne ikke hente lagvalg fra skyen.', defaultsError);
                setHasResolvedRemoteDefaults(true);
            },
        );

        return unsubscribe;
    }, [currentUser]);

    useEffect(() => {
        if (!hasHydratedUiDraft || typeof window === 'undefined') {
            return;
        }

        if (uiDraftSyncTimeoutRef.current) {
            clearTimeout(uiDraftSyncTimeoutRef.current);
            uiDraftSyncTimeoutRef.current = null;
        }

        const hasUiContent = (
            activeSide !== 'home' ||
            Boolean(homeTeamId) ||
            Boolean(awayTeamId) ||
            Boolean(matchName) ||
            isMatchStarted ||
            customButtons.length > 0
        );

        if (!hasUiContent) {
            removeScopedLocalStorage(LIVE_STATS_UI_KEY, currentUser?.uid);
            setLastUiDraftSavedAt(null);
            setUiCloudSyncState('idle');
            setLastUiCloudSyncAt(null);

            if (currentUser && hasResolvedRemoteUiDraft) {
                void deleteDoc(doc(db, 'users', currentUser.uid, 'appState', LIVE_STATS_UI_REMOTE_DOC))
                    .catch((draftError) => {
                        console.error('Kunne ikke fjerne kampoppsett fra skyen.', draftError);
                        setUiCloudSyncState('error');
                    });
            }

            return;
        }

        const updatedAt = Date.now();
        const nextUiDraft = normalizeLiveStatsUiDraft({
            activeSide,
            homeTeamId,
            awayTeamId,
            matchName,
            isMatchStarted,
            customButtons,
            updatedAt,
        });

        if (!nextUiDraft) {
            console.error('Ugyldig kampoppsett ble stoppet før lagring.');
            setUiCloudSyncState('error');
            return;
        }

        writeScopedLocalStorage(LIVE_STATS_UI_KEY, currentUser?.uid, nextUiDraft);
        setLastUiDraftSavedAt(nextUiDraft.updatedAt ?? null);

        if (!currentUser || !hasResolvedRemoteUiDraft) {
            return;
        }

        setUiCloudSyncState('saving');
        uiDraftSyncTimeoutRef.current = setTimeout(() => {
            const nextRemoteUiDraft = normalizeLiveStatsUiDraft(prepareFirestorePayload(nextUiDraft));
            if (!nextRemoteUiDraft) {
                console.error('Ugyldig kampoppsett ble stoppet før sky-synk.');
                setUiCloudSyncState('error');
                return;
            }

            void setDoc(doc(db, 'users', currentUser.uid, 'appState', LIVE_STATS_UI_REMOTE_DOC), nextRemoteUiDraft)
                .then(() => {
                    setLastUiCloudSyncAt(updatedAt);
                    setUiCloudSyncState('synced');
                })
                .catch((draftError) => {
                    console.error('Kunne ikke synkronisere kampoppsett til skyen.', draftError);
                    setUiCloudSyncState('error');
                });
        }, 700);

        return () => {
            if (uiDraftSyncTimeoutRef.current) {
                clearTimeout(uiDraftSyncTimeoutRef.current);
                uiDraftSyncTimeoutRef.current = null;
            }
        };
    }, [activeSide, awayTeamId, currentUser, customButtons, hasHydratedUiDraft, hasResolvedRemoteUiDraft, homeTeamId, isMatchStarted, matchName]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (defaultsSyncTimeoutRef.current) {
            clearTimeout(defaultsSyncTimeoutRef.current);
            defaultsSyncTimeoutRef.current = null;
        }

        if (!homeTeamId && !awayTeamId) {
            removeScopedLocalStorage(LIVE_STATS_DEFAULTS_KEY, currentUser?.uid);
            setLastDefaultsSavedAt(null);
            setDefaultsCloudSyncState('idle');
            setLastDefaultsCloudSyncAt(null);

            if (currentUser && hasResolvedRemoteDefaults) {
                void deleteDoc(doc(db, 'users', currentUser.uid, 'appState', LIVE_STATS_DEFAULTS_REMOTE_DOC))
                    .catch((defaultsError) => {
                        console.error('Kunne ikke fjerne lagvalg fra skyen.', defaultsError);
                        setDefaultsCloudSyncState('error');
                    });
            }

            return;
        }

        const nextDefaults = normalizeLiveStatsDefaults({
            homeTeamId,
            awayTeamId,
            updatedAt: Date.now(),
        });

        if (!nextDefaults) {
            console.error('Ugyldig lagvalg ble stoppet før lagring.');
            setDefaultsCloudSyncState('error');
            return;
        }

        writeScopedLocalStorage(LIVE_STATS_DEFAULTS_KEY, currentUser?.uid, nextDefaults);
        setLastDefaultsSavedAt(nextDefaults.updatedAt ?? null);

        if (!currentUser || !hasResolvedRemoteDefaults) {
            return;
        }

        setDefaultsCloudSyncState('saving');
        defaultsSyncTimeoutRef.current = setTimeout(() => {
            const nextRemoteDefaults = normalizeLiveStatsDefaults(prepareFirestorePayload(nextDefaults));
            if (!nextRemoteDefaults) {
                console.error('Ugyldig lagvalg ble stoppet før sky-synk.');
                setDefaultsCloudSyncState('error');
                return;
            }

            void setDoc(doc(db, 'users', currentUser.uid, 'appState', LIVE_STATS_DEFAULTS_REMOTE_DOC), nextRemoteDefaults)
                .then(() => {
                    setLastDefaultsCloudSyncAt(nextDefaults.updatedAt ?? Date.now());
                    setDefaultsCloudSyncState('synced');
                })
                .catch((defaultsError) => {
                    console.error('Kunne ikke synkronisere lagvalg til skyen.', defaultsError);
                    setDefaultsCloudSyncState('error');
                });
        }, 700);

        return () => {
            if (defaultsSyncTimeoutRef.current) {
                clearTimeout(defaultsSyncTimeoutRef.current);
                defaultsSyncTimeoutRef.current = null;
            }
        };
    }, [awayTeamId, currentUser, hasResolvedRemoteDefaults, homeTeamId]);

    useEffect(() => {
        if (!feedback || feedback.type === 'error' || feedback.type === 'warning') {
            return;
        }

        const timeout = window.setTimeout(() => setFeedback(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    useEffect(() => {
        if (!hasResolvedRemoteUiDraft || !hasResolvedRemoteDefaults) {
            return;
        }

        if (teams.length > 0 && !homeTeamId) {
            setHomeTeamId(teams[0].name);
        }
    }, [hasResolvedRemoteDefaults, hasResolvedRemoteUiDraft, teams, homeTeamId]);

    useEffect(() => {
        if (!hasResolvedRemoteUiDraft || !hasResolvedRemoteDefaults) {
            return;
        }

        if (teams.length > 1 && !awayTeamId) {
            const fallbackAway = teams.find((team) => team.name !== homeTeamId);
            if (fallbackAway) {
                setAwayTeamId(fallbackAway.name);
            }
        }
    }, [awayTeamId, hasResolvedRemoteDefaults, hasResolvedRemoteUiDraft, homeTeamId, teams]);

    const resolveTeamReference = (selectedName: string, fallbackName: string): TeamReference => {
        const matchingTeam = teams.find((team) => team.name === selectedName);
        return {
            id: matchingTeam?.id ?? null,
            name: selectedName || fallbackName,
        };
    };

    const handleSelectActiveSide = (nextSide: TeamSide) => {
        setActiveSide(nextSide);
    };

    const handleTeamSelectionChange = (side: TeamSide, value: string) => {
        if (side === 'home') {
            setHomeTeamId(value);
            return;
        }

        setAwayTeamId(value);
    };

    const handleShotModalCommit = (
        courtX: number,
        courtY: number,
        outcome: 'goal' | 'save' | 'miss',
        goalX: number,
        goalY: number,
    ) => {
        if (!shotModalSide) return;
        addCombinedShot(shotModalSide, courtX, courtY, goalX, goalY, outcome);
        setShotModalSide(null);
    };

    const addCustomButton = () => {
        if (customButtons.length >= 8) {
            setFeedback({
                type: 'warning',
                message: 'Maks åtte egendefinerte knapper per kampoppsett.'
            });
            return;
        }

        const id = `custom_${Date.now()}`;
        setCustomButtons((prev) => [
            ...prev,
            {
                id,
                label: 'Ny Stat',
                color: 'bg-gradient-to-br from-purple-500 to-purple-700',
            },
        ]);
    };

    const updateCustomButtonLabel = (id: string, newLabel: string) => {
        const trimmedLabel = newLabel.trim();
        if (!trimmedLabel) {
            return;
        }

        setCustomButtons((prev) => prev.map((button) => (
            button.id === id ? { ...button, label: trimmedLabel } : button
        )));
    };

    const openCustomButtonEditor = (id: string, currentLabel: string) => {
        setEditingButtonId(id);
        setButtonLabelDraft(currentLabel);
    };

    const closeCustomButtonEditor = () => {
        setEditingButtonId(null);
        setButtonLabelDraft('');
    };

    const handleSaveCustomButtonLabel = () => {
        if (!editingButtonId) {
            return;
        }

        const trimmedLabel = buttonLabelDraft.trim();
        if (!trimmedLabel) {
            setFeedback({
                type: 'warning',
                message: 'Knappen må ha et navn før du lagrer endringen.'
            });
            return;
        }

        updateCustomButtonLabel(editingButtonId, trimmedLabel);
        closeCustomButtonEditor();
        setFeedback({
            type: 'info',
            message: 'Knappen ble oppdatert.'
        });
    };

    const removeCustomButton = (id: string) => {
        const hasRecordedValues = (homeState.stats[id] || 0) > 0 || (awayState.stats[id] || 0) > 0;
        if (hasRecordedValues) {
            setFeedback({
                type: 'warning',
                message: 'Denne knappen har allerede registrerte tall i kampen og kan ikke slettes nå.'
            });
            return;
        }

        setPendingDeleteButtonId(id);
    };

    const handleConfirmDeleteCustomButton = () => {
        if (!pendingDeleteButtonId) {
            return;
        }

        setCustomButtons((prev) => prev.filter((button) => button.id !== pendingDeleteButtonId));
        setPendingDeleteButtonId(null);
        setFeedback({
            type: 'info',
            message: 'Knappen ble fjernet fra kampoppsettet.'
        });
    };

    const lastAction = history[history.length - 1] as MatchEvent | undefined;
    const defaultMatchName = useMemo(() => {
        const dateLabel = new Date().toLocaleDateString('nb-NO', {
            day: '2-digit',
            month: '2-digit'
        });

        return `${homeTeamId || 'Hjemme'} vs ${awayTeamId || 'Borte'} - ${dateLabel}`;
    }, [awayTeamId, homeTeamId]);

    const activeState = activeSide === 'home' ? homeState : awayState;
    const activeTeamName = activeSide === 'home' ? homeTeamId || 'Hjemme' : awayTeamId || 'Borte';
    const editingButton = editingButtonId ? customButtons.find((button) => button.id === editingButtonId) : null;
    const pendingDeleteButton = pendingDeleteButtonId
        ? customButtons.find((button) => button.id === pendingDeleteButtonId)
        : null;
    const lastActionLabel = useMemo(() => {
        if (!lastAction) {
            return 'Ingen registreringer ennå.';
        }

        const sideLabel = lastAction.side === 'home' ? homeTeamId || 'Hjemme' : awayTeamId || 'Borte';

        switch (lastAction.type) {
            case 'combinedShot':
                if (lastAction.data?.result === 'goal') return `Mål registrert for ${sideLabel}.`;
                if (lastAction.data?.result === 'save') return `Redning registrert for ${sideLabel}.`;
                return `Skuddbom registrert for ${sideLabel}.`;
            case 'miss':
                return `Skuddbom registrert for ${sideLabel}.`;
            case 'tech':
                return `Teknisk feil registrert for ${sideLabel}.`;
            default: {
                const customButton = customButtons.find((button) => button.id === lastAction.type);
                return customButton
                    ? `${customButton.label} registrert for ${sideLabel}.`
                    : `Registrering lagret for ${sideLabel}.`;
            }
        }
    }, [awayTeamId, customButtons, homeTeamId, lastAction]);

    const sameTeamsSelected = homeTeamId && awayTeamId && homeTeamId === awayTeamId;
    const hasUiDraftContent = (
        activeSide !== 'home' ||
        Boolean(homeTeamId) ||
        Boolean(awayTeamId) ||
        Boolean(matchName) ||
        isMatchStarted ||
        customButtons.length > 0
    );
    const hasDefaultSelections = Boolean(homeTeamId) || Boolean(awayTeamId);
    const hasLiveMatchContent = (
        matchTime > 0 ||
        history.length > 0 ||
        homeState.score > 0 ||
        awayState.score > 0 ||
        homeState.shotLocations.length > 0 ||
        awayState.shotLocations.length > 0
    );
    const hasAnyPersistedContent = hasLiveMatchContent || hasUiDraftContent || hasDefaultSelections;
    const isLivePhase = isMatchStarted || hasLiveMatchContent;
    const canSaveMatch = Boolean(currentUser) && !sameTeamsSelected && isOnline && saveState !== 'saving';
    const hasHistorySave = lastHistorySaveAt !== null;
    const hasUnsavedChangesSinceHistorySave = Boolean(
        lastHistorySaveAt &&
        lastDraftSavedAt &&
        lastDraftSavedAt > lastHistorySaveAt
    );
    const formattedDraftTime = lastDraftSavedAt
        ? new Date(lastDraftSavedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
        : null;
    const formattedHistorySaveTime = lastHistorySaveAt
        ? new Date(lastHistorySaveAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
        : null;
    const hasSavedToCloud = hasHistorySave;
    const hasUnsavedChangesSinceSave = hasUnsavedChangesSinceHistorySave;
    const formattedRemoteSaveTime = formattedHistorySaveTime;
    const lastConfirmedCloudSyncAt = Math.max(
        lastMatchCloudSyncAt ?? 0,
        lastUiCloudSyncAt ?? 0,
        lastDefaultsCloudSyncAt ?? 0,
    ) || null;
    const formattedCloudSyncTime = lastConfirmedCloudSyncAt
        ? new Date(lastConfirmedCloudSyncAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
        : null;
    const isAnyCloudSyncSaving = [matchCloudSyncState, uiCloudSyncState, defaultsCloudSyncState].includes('saving');
    const hasAnyCloudSyncError = [matchCloudSyncState, uiCloudSyncState, defaultsCloudSyncState].includes('error');
    const localDraftTitle = draftRecovered ? 'Gjenopprettet' : lastDraftSavedAt ? 'Lagret lokalt' : 'Ikke lagret';
    const localDraftText = draftRecovered && formattedDraftTime
        ? `Gjenopprettet fra ${draftRecoveredFrom === 'cloud' ? 'skyen' : 'denne enheten'} kl. ${formattedDraftTime}.`
        : formattedDraftTime
            ? `Sist lagret lokalt ${formattedDraftTime}.`
            : 'Starter når du registrerer noe.';
    const localDraftHint = isOnline
        ? 'Kladden beholdes lokalt hvis siden oppdateres.'
        : 'Fortsetter å sikre kampen lokalt uten nett.';
    const legacyCloudStatusTitle = !isOnline
        ? 'Venter på nett'
        : saveState === 'saving'
            ? 'Lagrer nå...'
            : hasUnsavedChangesSinceSave
                ? 'Ikke oppdatert ennå'
                : hasSavedToCloud && formattedRemoteSaveTime
                    ? `Sist lagret ${formattedRemoteSaveTime}`
                    : 'Ikke lagret ennå';
    const legacyCloudStatusHint = !isOnline
        ? 'Lagre til laghistorikken når forbindelsen er tilbake.'
        : saveState === 'saving'
            ? 'Sender kampen til laghistorikken nå.'
            : hasUnsavedChangesSinceSave
                ? 'Trykk Lagre kamp for å sende de siste endringene.'
                : hasSavedToCloud
                    ? 'Laghistorikken er oppdatert.'
                    : 'Første lagring sender kampen til laghistorikken.';
    void legacyCloudStatusTitle;
    void legacyCloudStatusHint;
    const cloudStatusTitle = !hasAnyPersistedContent
        ? 'Ikke lagret'
        : !currentUser || !isOnline
            ? 'Bare lokalt'
            : hasAnyCloudSyncError
                ? 'Kun lokalt akkurat nå'
                : isAnyCloudSyncSaving
                    ? 'Lagrer nå'
                    : formattedCloudSyncTime
                        ? `Bekreftet i sky ${formattedCloudSyncTime}`
                        : 'Bare lokalt';
    const cloudStatusHint = !hasAnyPersistedContent
        ? 'Sky-synk starter når du har en aktiv kladd eller et lagvalg.'
        : !currentUser
            ? 'Logg inn for å synke kladd og kampoppsett mellom enheter.'
            : !isOnline
                ? 'Endringene ligger trygt lokalt og sendes når nettet er tilbake.'
                : hasAnyCloudSyncError
                    ? 'Forrige sky-synk feilet. Du kan fortsette uten at siden stopper, og lokal kladd er beholdt.'
                    : isAnyCloudSyncSaving
                        ? 'Vi venter på backend-bekreftelse før kladden merkes som lagret i sky.'
                        : formattedCloudSyncTime
                            ? 'Kladd, kampoppsett og sist brukte lagvalg er bekreftet lagret for denne brukeren.'
                            : 'Du har lokale endringer, men ingenting er bekreftet lagret i sky ennå.';
    const saveButtonLabel = saveState === 'saving'
        ? 'Lagrer kamp...'
        : !isOnline
            ? 'Offline'
            : hasUnsavedChangesSinceSave
                ? 'Lagre endringer'
                : 'Lagre kamp';
    const mobileSaveLabel = saveState === 'saving'
        ? 'Lagrer'
        : !isOnline
            ? 'Offline'
            : 'Lagre';

    useEffect(() => {
        if (saveState === 'success' && hasUnsavedChangesSinceSave) {
            setSaveState('idle');
        }
    }, [hasUnsavedChangesSinceSave, saveState]);

    const handleStartMatch = () => {
        if (sameTeamsSelected) {
            setFeedback({
                type: 'warning',
                message: 'Velg ulike lag på hjemme- og bortesiden før du starter kampen.'
            });
            return;
        }

        setIsMatchStarted(true);
        setShowSetupPanel(false);
        setFeedback({
            type: 'info',
            message: hasLiveMatchContent ? 'Fortsetter siste kamp.' : 'Kampen er klar for live-registrering.'
        });
    };

    const handleSaveMatch = async () => {
        const name = matchName.trim() || defaultMatchName;
        if (!currentUser) {
            setFeedback({ type: 'error', message: 'Du må være logget inn for å lagre kampen.' });
            return;
        }

        if (!isOnline) {
            setFeedback({
                type: 'warning',
                message: 'Ingen nettforbindelse. Kampen ligger fortsatt trygt i lokal kladd.'
            });
            return;
        }

        if (sameTeamsSelected) {
            setFeedback({
                type: 'warning',
                message: 'Hjemme- og bortelag må være ulike før du lagrer kampen.'
            });
            return;
        }

        try {
            setSaveState('saving');
            const saveTimestamp = Timestamp.now();
            const customDefinitions: CustomStatDefinition[] = customButtons.map((button) => ({
                id: button.id,
                label: button.label.trim(),
                color: button.color,
            }));
            const nextMatchDocument = prepareFirestorePayload(buildStoredMatchDocument({
                name,
                date: saveTimestamp,
                savedAt: saveTimestamp,
                updatedAt: saveTimestamp,
                matchTime,
                period,
                periodLabel,
                homeTeam: resolveTeamReference(homeTeamId, 'Hjemme'),
                awayTeam: resolveTeamReference(awayTeamId, 'Borte'),
                homeState,
                awayState,
                history,
                customDefinitions,
            }));

            await addDoc(collection(db, 'users', currentUser.uid, 'matches'), nextMatchDocument);

            setSaveState('success');
            setLastHistorySaveAt(Date.now());
            setSavedMatchName(name);
            setIsSaveSuccessDialogOpen(true);
            setFeedback({
                type: 'success',
                message: `Kampen ble lagret som "${name}".`
            });
        } catch (saveError) {
            console.error(saveError);
            setSaveState('error');
            setFeedback({
                type: 'error',
                message: 'Kunne ikke lagre kampen. Lokal kladd er beholdt.'
            });
        }
    };

    const handleResetMatch = () => {
        resetMatch();
        setIsMatchStarted(false);
        setShowSetupPanel(false);
        setMatchName('');
        setShotModalSide(null);
        setSaveState('idle');
        setLastHistorySaveAt(null);
        setSavedMatchName('');
        setIsSaveSuccessDialogOpen(false);
        setIsResetDialogOpen(false);
        setFeedback({
            type: 'info',
            message: 'Ny kamp er klar. Lagvalg og egendefinerte knapper er beholdt.'
        });
    };

    const renderFeedback = (state: FeedbackState) => {
        const styles = {
            success: 'border-green-500/30 bg-green-500/10 text-green-100',
            error: 'border-red-500/30 bg-red-500/10 text-red-100',
            info: 'border-primary/30 bg-primary/10 text-primary',
            warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-100'
        } satisfies Record<FeedbackState['type'], string>;

        return (
            <div className={clsx('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm', styles[state.type])} aria-live="polite">
                {state.type === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : null}
                {state.type === 'info' ? <Info size={18} className="mt-0.5 shrink-0" /> : null}
                {state.type === 'warning' ? <WifiOff size={18} className="mt-0.5 shrink-0" /> : null}
                {state.type === 'error' ? <Info size={18} className="mt-0.5 shrink-0" /> : null}
                <span>{state.message}</span>
            </div>
        );
    };

    if (!isLivePhase) {
        return (
            <div className="mx-auto max-w-4xl pb-28 sm:pb-0">
                <div className="mb-4 space-y-3">
                    {teamsLoading ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">
                            <Loader2 size={18} className="animate-spin text-primary" />
                            Henter lag og klargjør kampoppsettet...
                        </div>
                    ) : null}
                    {!isOnline ? renderFeedback({
                        type: 'warning',
                        message: 'Offline. Du kan fortsatt forberede oppsettet før kamp.'
                    }) : null}
                    {error ? renderFeedback({ type: 'error', message: error }) : null}
                    {sameTeamsSelected ? renderFeedback({
                        type: 'warning',
                        message: 'Velg ulike lag på hjemme- og bortesiden før du starter.'
                    }) : null}
                    {feedback ? renderFeedback(feedback) : null}
                </div>

                <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                    <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                        Klargjør kampen
                    </h1>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-white">Hjemmelag</span>
                            <select
                                className="min-h-[56px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                value={homeTeamId}
                                onChange={(e) => handleTeamSelectionChange('home', e.target.value)}
                            >
                                <option value="Hjemme">Hjemme</option>
                                {teams.map((team) => (
                                    <option key={team.id} value={team.name}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-white">Bortelag</span>
                            <select
                                className="min-h-[56px] w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-white focus:outline-none focus:ring-1 focus:ring-secondary"
                                value={awayTeamId}
                                onChange={(e) => handleTeamSelectionChange('away', e.target.value)}
                            >
                                <option value="Borte">Borte</option>
                                {teams.map((team) => (
                                    <option key={team.id} value={team.name}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="mt-4">
                        <label htmlFor="match-name-setup" className="mb-2 block text-sm font-semibold text-white">
                            Kampnavn
                        </label>
                        <input
                            id="match-name-setup"
                            type="text"
                            value={matchName}
                            onChange={(e) => setMatchName(e.target.value)}
                            placeholder={defaultMatchName}
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-white transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            Tomt felt lagrer automatisk som "{defaultMatchName}".
                        </p>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Lagvalg</p>
                            <p className="mt-2 text-sm font-semibold text-white">
                                {homeTeamId || 'Hjemme'} mot {awayTeamId || 'Borte'}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Knapper</p>
                            <p className="mt-2 text-sm font-semibold text-white">{customButtons.length} egendefinerte</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Status</p>
                            <p className="mt-2 text-sm font-semibold text-white">{isOnline ? 'Klar til start' : 'Forbereder offline'}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={handleStartMatch}
                            className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-white"
                        >
                            <Play size={18} />
                            Start kamp
                        </button>
                        <Link
                            to="/teams"
                            className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            <Users size={18} />
                            Åpne lag
                        </Link>
                        <Link
                            to="/tactics"
                            className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            <Info size={18} />
                            Taktikk
                        </Link>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl pb-28 sm:pb-0">
            <div className="mb-4 space-y-3">
                {teamsLoading ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">
                        <Loader2 size={18} className="animate-spin text-primary" />
                        Henter lag og klargjør kampoppsettet...
                    </div>
                ) : null}
                {!isOnline ? renderFeedback({
                    type: 'warning',
                    message: 'Offline. Kampen fortsetter lokalt og kan lagres til laghistorikken når nettet er tilbake.'
                }) : null}
                {draftRecovered && hasLiveMatchContent ? renderFeedback({
                    type: 'info',
                    message: formattedDraftTime
                        ? `Siste kamp er gjenopptatt fra ${draftRecoveredFrom === 'cloud' ? 'skykladd' : 'lokal kladd'} kl. ${formattedDraftTime}.`
                        : `Siste kamp er gjenopptatt fra ${draftRecoveredFrom === 'cloud' ? 'skykladd' : 'lokal kladd'}.`
                }) : null}
                {error ? renderFeedback({ type: 'error', message: error }) : null}
                {sameTeamsSelected ? renderFeedback({
                    type: 'warning',
                    message: 'Velg ulike lag på hjemme- og bortesiden før du lagrer.'
                }) : null}
                {feedback ? renderFeedback(feedback) : null}
            </div>

            <div className="mb-4 rounded-3xl border border-white/10 bg-card/70 p-4 shadow-xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Pågående kamp</p>
                        <h2 className="mt-2 text-xl font-bold text-white">{matchName.trim() || defaultMatchName}</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            {homeTeamId || 'Hjemme'} mot {awayTeamId || 'Borte'}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => setShowSetupPanel((value) => !value)}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            <Info size={16} />
                            {showSetupPanel ? 'Skjul oppsett' : 'Kampoppsett'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEditMode((value) => !value)}
                            className={clsx(
                                'flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors',
                                isEditMode ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20',
                            )}
                        >
                            <Edit2 size={16} />
                            {isEditMode ? 'Ferdig' : 'Rediger knapper'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsResetDialogOpen(true)}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            <RefreshCcw size={16} />
                            Ny kamp
                        </button>
                    </div>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:hidden">
                <button
                    type="button"
                    onClick={() => handleSelectActiveSide('home')}
                    className={clsx(
                        'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all',
                        activeSide === 'home'
                            ? 'border-primary bg-primary/15 text-white'
                            : 'border-white/10 bg-white/5 text-gray-300'
                    )}
                >
                    <span className="block text-[11px] uppercase tracking-[0.2em] text-gray-400">Hjemme</span>
                    <span className="mt-1 block">{homeTeamId || 'Hjemme'}</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleSelectActiveSide('away')}
                    className={clsx(
                        'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all',
                        activeSide === 'away'
                            ? 'border-secondary bg-secondary/15 text-white'
                            : 'border-white/10 bg-white/5 text-gray-300'
                    )}
                >
                    <span className="block text-[11px] uppercase tracking-[0.2em] text-gray-400">Borte</span>
                    <span className="mt-1 block">{awayTeamId || 'Borte'}</span>
                </button>
            </div>

            <div className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-card p-4 shadow-2xl sm:p-6">
                <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-white to-secondary" />

                <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 text-center sm:gap-4">
                    <div
                        className={clsx(
                            'cursor-pointer rounded-2xl border-2 p-3 transition-all sm:p-4',
                            activeSide === 'home'
                                ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(0,243,255,0.2)]'
                                : 'border-transparent opacity-70 hover:opacity-100',
                        )}
                        onClick={() => handleSelectActiveSide('home')}
                    >
                        <select
                            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-black/30 px-3 text-center text-sm font-bold uppercase text-white focus:outline-none focus:ring-1 focus:ring-primary sm:text-xl"
                            value={homeTeamId}
                            onChange={(e) => handleTeamSelectionChange('home', e.target.value)}
                        >
                            <option value="Hjemme">Hjemme</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.name}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                        <div className="mt-3 text-4xl font-black text-primary sm:text-5xl md:text-7xl">{homeState.score}</div>
                    </div>

                    <div className="flex min-w-[96px] flex-col items-center justify-center gap-3 px-1 sm:min-w-[144px] sm:px-3">
                        <div
                            onClick={toggleTimer}
                            className="min-h-[56px] w-full cursor-pointer select-none rounded-2xl border border-white/20 bg-black px-3 py-2 font-mono text-xl font-bold tabular-nums transition-colors hover:border-primary sm:px-4 sm:text-3xl md:text-4xl"
                        >
                            {formatTime(matchTime)}
                        </div>
                        <button
                            onClick={nextPeriod}
                            className="rounded border border-white/10 px-3 py-1 text-xs uppercase tracking-widest text-gray-400 hover:text-white"
                        >
                            {periodLabel}
                        </button>
                    </div>

                    <div
                        className={clsx(
                            'cursor-pointer rounded-2xl border-2 p-3 transition-all sm:p-4',
                            activeSide === 'away'
                                ? 'border-secondary bg-secondary/10 shadow-[0_0_20px_rgba(255,102,0,0.2)]'
                                : 'border-transparent opacity-70 hover:opacity-100',
                        )}
                        onClick={() => handleSelectActiveSide('away')}
                    >
                        <select
                            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-black/30 px-3 text-center text-sm font-bold uppercase text-white focus:outline-none focus:ring-1 focus:ring-secondary sm:text-xl"
                            value={awayTeamId}
                            onChange={(e) => handleTeamSelectionChange('away', e.target.value)}
                        >
                            <option value="Borte">Borte</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.name}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                        <div className="mt-3 text-4xl font-black text-secondary sm:text-5xl md:text-7xl">{awayState.score}</div>
                    </div>
                </div>
            </div>

            <div className="mb-4 grid hidden gap-3 sm:grid-cols-3 sm:grid">
                <button
                    type="button"
                    onClick={toggleTimer}
                    className="flex min-h-[64px] flex-col justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:bg-white/10"
                >
                    <span className="inline-flex items-center gap-2 text-base font-semibold text-white">
                        {isRunning ? <Pause size={18} /> : <Play size={18} />}
                        {isRunning ? 'Pause klokke' : 'Start klokke'}
                    </span>
                    <span className="mt-1 text-xs text-gray-400">{formatTime(matchTime)}</span>
                </button>
                <button
                    type="button"
                    onClick={undoLastStat}
                    disabled={!canUndo}
                    className="flex min-h-[64px] flex-col justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <span className="inline-flex items-center gap-2 text-base font-semibold text-white">
                        <RotateCcw size={18} />
                        Angre siste
                    </span>
                    <span className="mt-1 text-xs text-gray-400">{lastActionLabel}</span>
                </button>
                <button
                    type="button"
                    onClick={handleSaveMatch}
                    disabled={!canSaveMatch}
                    className={clsx(
                        'flex min-h-[64px] flex-col justify-center rounded-2xl px-4 py-3 text-left font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50',
                        canSaveMatch ? 'bg-green-600 text-white hover:bg-green-500' : 'border border-white/10 bg-white/5 text-gray-300'
                    )}
                >
                    <span className="inline-flex items-center gap-2 text-base font-semibold">
                        {saveState === 'saving' ? <Loader2 size={18} className="animate-spin" /> : <SaveIcon size={18} />}
                        {saveButtonLabel}
                    </span>
                    <span className="mt-1 text-xs text-white/80">
                        {!isOnline ? 'Lokal kladd er fortsatt aktiv.' : matchName.trim() || defaultMatchName}
                    </span>
                </button>
            </div>

            {showSetupPanel ? (
            <div className="mb-4 rounded-3xl border border-white/10 bg-card/70 p-4 shadow-xl">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                    <div className="flex-1">
                        <label htmlFor="match-name" className="mb-2 block text-sm font-medium text-gray-300">
                            Kampnavn
                        </label>
                        <input
                            id="match-name"
                            type="text"
                            value={matchName}
                            onChange={(e) => setMatchName(e.target.value)}
                            placeholder={defaultMatchName}
                            className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            Tomt felt lagrer automatisk som "{defaultMatchName}".
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => setIsEditMode((value) => !value)}
                            className={clsx(
                                'flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors',
                                isEditMode ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'
                            )}
                        >
                            <Edit2 size={16} />
                            {isEditMode ? 'Ferdig' : 'Rediger knapper'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsResetDialogOpen(true)}
                            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            <RefreshCcw size={16} />
                            Ny kamp
                        </button>
                    </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Siste registrering</p>
                        <p className="mt-2 text-sm text-white">{lastActionLabel}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                            {isOnline ? <Wifi size={14} className="text-primary" /> : <WifiOff size={14} className="text-yellow-300" />}
                            Lokal kladd
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white">{localDraftTitle}</p>
                        <p className="mt-1 text-sm text-gray-300">{localDraftText}</p>
                        <p className="mt-1 text-xs text-gray-500">{localDraftHint}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Sky-lagring</p>
                        <p className="mt-2 text-sm font-semibold text-white">{cloudStatusTitle}</p>
                        <p className="mt-1 text-xs text-gray-400">{cloudStatusHint}</p>
                    </div>
                </div>
            </div>
            ) : null}

            <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
                <div className="col-span-2 mb-2 grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setShotModalSide('home')}
                        className="flex items-center justify-between rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 px-4 py-4 text-sm font-black text-white transition active:scale-[0.97] hover:from-primary/25 hover:to-primary/10"
                    >
                        <span>🎯 Skudd</span>
                        <span className="text-xl font-black text-primary">{homeState.score + homeState.shotLocations.length}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShotModalSide('away')}
                        className="flex items-center justify-between rounded-2xl border border-secondary/30 bg-gradient-to-br from-secondary/15 to-secondary/5 px-4 py-4 text-sm font-black text-white transition active:scale-[0.97] hover:from-secondary/25 hover:to-secondary/10"
                    >
                        <span>🎯 Skudd</span>
                        <span className="text-xl font-black text-secondary">{awayState.score + awayState.shotLocations.length}</span>
                    </button>
                </div>

                <div className="col-span-2 mb-4 flex justify-center">
                    <div className="w-full">
                        <CourtVisualizer
                            locations={activeState.shotLocations}
                            onAddLocation={() => {}}
                            teamName={activeTeamName}
                        />
                    </div>
                </div>

                <div className="col-span-2 mb-4 flex flex-col justify-center gap-4 sm:flex-row">
                    <div className="w-full sm:w-1/2">
                        <GoalVisualizer
                            saves={activeState.saves}
                            teamName={activeTeamName}
                            type="save"
                            title="Redninger"
                        />
                    </div>
                    <div className="w-full sm:w-1/2">
                        <GoalVisualizer
                            saves={activeState.goalLocations}
                            teamName={activeTeamName}
                            type="goal"
                            title="Mål"
                        />
                    </div>
                </div>

                <div className="col-span-2 grid grid-cols-2 gap-4">
                    <StatButton
                        type="miss"
                        label="Skuddbom"
                        count={activeState.stats.miss}
                        onClick={() => updateStat(activeSide, 'miss')}
                        color="bg-gradient-to-br from-red-500 to-red-700"
                    />

                    <StatButton
                        type="tech"
                        label="Teknisk Feil"
                        count={activeState.stats.tech}
                        onClick={() => updateStat(activeSide, 'tech')}
                        color="bg-gradient-to-br from-yellow-500 to-yellow-700"
                    />
                </div>

                {customButtons.map((button) => (
                    <div key={button.id} className="relative col-span-2 md:col-span-1">
                        <StatButton
                            type="other"
                            label={button.label}
                            count={activeState.stats[button.id] || 0}
                            onClick={() => {
                                if (isEditMode) {
                                    openCustomButtonEditor(button.id, button.label);
                                    return;
                                }

                                updateStat(activeSide, button.id);
                            }}
                            color={button.color}
                        />
                        {isEditMode ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeCustomButton(button.id);
                                }}
                                className="absolute -right-2 -top-2 rounded-full bg-red-600 p-2 shadow-lg hover:bg-red-500"
                            >
                                <Trash2 size={16} />
                            </button>
                        ) : null}
                    </div>
                ))}

                {isEditMode ? (
                    <button
                        onClick={addCustomButton}
                        className="col-span-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 py-4 font-bold uppercase tracking-wider text-gray-400 transition-all hover:border-white/40 hover:bg-white/5"
                    >
                        <Plus size={20} />
                        Legg til knapp
                    </button>
                ) : null}
            </div>

            <div className="mt-8 text-center text-sm text-gray-500">
                Aktiv registrering går til{' '}
                <span className={activeSide === 'home' ? 'font-bold text-primary' : 'font-bold text-secondary'}>
                    {activeTeamName}
                </span>
            </div>

            <div className="fixed bottom-3 left-3 right-3 z-40 rounded-3xl border border-white/10 bg-black/85 p-3 shadow-2xl backdrop-blur-xl sm:hidden">
                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={toggleTimer}
                        className="flex min-h-[64px] flex-col items-center justify-center rounded-2xl bg-white/5 px-2 text-white"
                    >
                        {isRunning ? <Pause size={18} /> : <Play size={18} />}
                        <span className="mt-1 text-xs font-semibold">{isRunning ? 'Pause' : 'Start'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={undoLastStat}
                        disabled={!canUndo}
                        className="flex min-h-[64px] flex-col items-center justify-center rounded-2xl bg-white/5 px-2 text-white disabled:opacity-40"
                    >
                        <RotateCcw size={18} />
                        <span className="mt-1 text-xs font-semibold">Angre</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleSaveMatch}
                        disabled={!canSaveMatch}
                        className={clsx(
                            'flex min-h-[64px] flex-col items-center justify-center rounded-2xl px-2 font-semibold transition-all disabled:opacity-50',
                            canSaveMatch ? 'bg-green-600 text-white' : 'bg-white/5 text-gray-300'
                        )}
                    >
                        {saveState === 'saving' ? <Loader2 size={18} className="animate-spin" /> : <SaveIcon size={18} />}
                        <span className="mt-1 text-xs">{mobileSaveLabel}</span>
                    </button>
                </div>
            </div>

            <ShotRegistrationModal
                isOpen={shotModalSide !== null}
                side={shotModalSide ?? 'home'}
                teamName={shotModalSide === 'home' ? homeTeamId || 'Hjemme' : awayTeamId || 'Borte'}
                onCommit={handleShotModalCommit}
                onClose={() => setShotModalSide(null)}
            />

            <Dialog
                isOpen={isSaveSuccessDialogOpen}
                title="Kampen er lagret"
                description={savedMatchName
                    ? `"${savedMatchName}" er lagret i laghistorikken. Hva vil du gjøre nå?`
                    : 'Kampen er lagret i laghistorikken. Hva vil du gjøre nå?'}
                onClose={() => setIsSaveSuccessDialogOpen(false)}
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => setIsSaveSuccessDialogOpen(false)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            Fortsett kampen
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSaveSuccessDialogOpen(false);
                                handleResetMatch();
                            }}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            Ny kamp
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSaveSuccessDialogOpen(false);
                                navigate('/teams');
                            }}
                            className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:bg-white"
                        >
                            Åpne lag
                        </button>
                    </>
                }
            />

            <Dialog
                isOpen={Boolean(editingButton)}
                title="Rediger knapp"
                description="Oppdater navnet på den egendefinerte knappen. Endringen gjelder bare dette kampoppsettet."
                onClose={closeCustomButtonEditor}
                actions={
                    <>
                        <button
                            type="button"
                            onClick={closeCustomButtonEditor}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            Avbryt
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveCustomButtonLabel}
                            className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:bg-white"
                        >
                            Lagre navn
                        </button>
                    </>
                }
            >
                <div>
                    <label htmlFor="custom-button-label" className="mb-2 block text-sm font-medium text-gray-300">
                        Knappnavn
                    </label>
                    <input
                        id="custom-button-label"
                        type="text"
                        value={buttonLabelDraft}
                        onChange={(event) => setButtonLabelDraft(event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Skriv inn knappnavn"
                        autoFocus
                    />
                </div>
            </Dialog>

            <Dialog
                isOpen={Boolean(pendingDeleteButton)}
                title="Slett knapp"
                description={pendingDeleteButton ? `Vil du fjerne "${pendingDeleteButton.label}" fra dette kampoppsettet?` : undefined}
                onClose={() => setPendingDeleteButtonId(null)}
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => setPendingDeleteButtonId(null)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            Behold knapp
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDeleteCustomButton}
                            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500"
                        >
                            Slett knapp
                        </button>
                    </>
                }
            />

            <Dialog
                isOpen={isResetDialogOpen}
                title="Start ny kamp"
                description="Dette nullstiller den pågående kampen, men beholder lagvalg og egendefinerte knapper."
                onClose={() => setIsResetDialogOpen(false)}
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => setIsResetDialogOpen(false)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            Avbryt
                        </button>
                        <button
                            type="button"
                            onClick={handleResetMatch}
                            className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:bg-white"
                        >
                            Nullstill kamp
                        </button>
                    </>
                }
            />
        </div>
    );
}
