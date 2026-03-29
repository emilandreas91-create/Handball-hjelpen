import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
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
    Wifi,
    WifiOff,
    X
} from 'lucide-react';
import { StatButton } from '../components/features/StatButton';
import { GoalVisualizer } from '../components/features/GoalVisualizer';
import { CourtVisualizer } from '../components/features/CourtVisualizer';
import { useAuth } from '../components/features/useAuth';
import { Dialog } from '../components/ui/Dialog';
import { useMatchContext } from '../hooks/useMatch';
import { useTeams } from '../hooks/useTeams';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { db } from '../lib/firebase';
import {
    buildStoredMatchDocument,
    type CustomStatDefinition,
    type MatchEvent,
    type TeamReference,
    type TeamSide,
} from '../lib/matchData';

const LIVE_STATS_UI_KEY = 'handball-help-live-ui:v2';

type SaveState = 'idle' | 'saving' | 'success' | 'error';

interface FeedbackState {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
}

export function Stats() {
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
        lastDraftSavedAt,
    } = useMatchContext();

    const { teams, loading: teamsLoading, error } = useTeams();
    const { currentUser } = useAuth();
    const isOnline = useOnlineStatus();

    const [activeSide, setActiveSide] = useState<TeamSide>('home');
    const [homeTeamId, setHomeTeamId] = useState('');
    const [awayTeamId, setAwayTeamId] = useState('');
    const [matchName, setMatchName] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [customButtons, setCustomButtons] = useState<{ id: string; label: string; color: string }[]>([]);
    const [pendingShot, setPendingShot] = useState<{ x: number; y: number } | null>(null);
    const [pendingGoalPlacement, setPendingGoalPlacement] = useState<{ x: number; y: number } | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);
    const [lastRemoteSaveAt, setLastRemoteSaveAt] = useState<number | null>(null);
    const [hasHydratedUiDraft, setHasHydratedUiDraft] = useState(false);
    const [editingButtonId, setEditingButtonId] = useState<string | null>(null);
    const [buttonLabelDraft, setButtonLabelDraft] = useState('');
    const [pendingDeleteButtonId, setPendingDeleteButtonId] = useState<string | null>(null);
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setHasHydratedUiDraft(true);
            return;
        }

        try {
            const rawDraft = window.localStorage.getItem(LIVE_STATS_UI_KEY);
            if (!rawDraft) {
                return;
            }

            const parsedDraft = JSON.parse(rawDraft) as {
                activeSide?: TeamSide;
                homeTeamId?: string;
                awayTeamId?: string;
                matchName?: string;
                customButtons?: { id: string; label: string; color: string }[];
            };

            setActiveSide(parsedDraft.activeSide === 'away' ? 'away' : 'home');
            setHomeTeamId(typeof parsedDraft.homeTeamId === 'string' ? parsedDraft.homeTeamId : '');
            setAwayTeamId(typeof parsedDraft.awayTeamId === 'string' ? parsedDraft.awayTeamId : '');
            setMatchName(typeof parsedDraft.matchName === 'string' ? parsedDraft.matchName : '');
            setCustomButtons(Array.isArray(parsedDraft.customButtons) ? parsedDraft.customButtons : []);
        } catch (draftError) {
            console.error('Kunne ikke gjenopprette lokalt kampoppsett.', draftError);
            window.localStorage.removeItem(LIVE_STATS_UI_KEY);
        } finally {
            setHasHydratedUiDraft(true);
        }
    }, []);

    useEffect(() => {
        if (!hasHydratedUiDraft || typeof window === 'undefined') {
            return;
        }

        const hasUiContent = (
            activeSide !== 'home' ||
            Boolean(homeTeamId) ||
            Boolean(awayTeamId) ||
            Boolean(matchName) ||
            customButtons.length > 0
        );

        if (!hasUiContent) {
            window.localStorage.removeItem(LIVE_STATS_UI_KEY);
            return;
        }

        window.localStorage.setItem(LIVE_STATS_UI_KEY, JSON.stringify({
            activeSide,
            homeTeamId,
            awayTeamId,
            matchName,
            customButtons,
        }));
    }, [activeSide, awayTeamId, customButtons, hasHydratedUiDraft, homeTeamId, matchName]);

    useEffect(() => {
        if (!feedback || feedback.type === 'error' || feedback.type === 'warning') {
            return;
        }

        const timeout = window.setTimeout(() => setFeedback(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [feedback]);

    useEffect(() => {
        if (teams.length > 0 && !homeTeamId) {
            setHomeTeamId(teams[0].name);
        }
    }, [teams, homeTeamId]);

    useEffect(() => {
        if (teams.length > 1 && !awayTeamId) {
            const fallbackAway = teams.find((team) => team.name !== homeTeamId);
            if (fallbackAway) {
                setAwayTeamId(fallbackAway.name);
            }
        }
    }, [awayTeamId, homeTeamId, teams]);

    const resolveTeamReference = (selectedName: string, fallbackName: string): TeamReference => {
        const matchingTeam = teams.find((team) => team.name === selectedName);
        return {
            id: matchingTeam?.id ?? null,
            name: selectedName || fallbackName,
        };
    };

    const handleCombinedShot = (result: 'goal' | 'save' | 'miss') => {
        if (!pendingShot || !pendingGoalPlacement) return;

        addCombinedShot(
            activeSide,
            pendingShot.x,
            pendingShot.y,
            pendingGoalPlacement.x,
            pendingGoalPlacement.y,
            result,
        );

        setPendingShot(null);
        setPendingGoalPlacement(null);
    };

    const cancelPendingShot = () => {
        setPendingShot(null);
        setPendingGoalPlacement(null);
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
    const canSaveMatch = Boolean(currentUser) && !sameTeamsSelected && !pendingShot && isOnline && saveState !== 'saving';
    const hasSavedToCloud = lastRemoteSaveAt !== null;
    const hasUnsavedChangesSinceSave = Boolean(
        lastRemoteSaveAt &&
        lastDraftSavedAt &&
        lastDraftSavedAt > lastRemoteSaveAt
    );
    const formattedDraftTime = lastDraftSavedAt
        ? new Date(lastDraftSavedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
        : null;
    const formattedRemoteSaveTime = lastRemoteSaveAt
        ? new Date(lastRemoteSaveAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
        : null;
    const localDraftTitle = draftRecovered ? 'Gjenopprettet' : lastDraftSavedAt ? 'Aktiv' : 'Klar';
    const localDraftText = draftRecovered && formattedDraftTime
        ? `Gjenopprettet kl. ${formattedDraftTime}.`
        : formattedDraftTime
            ? `Sist oppdatert ${formattedDraftTime}.`
            : 'Starter når du registrerer noe.';
    const localDraftHint = isOnline
        ? 'Beholder kampen hvis siden oppdateres.'
        : 'Fortsetter å sikre kampen lokalt uten nett.';
    const cloudStatusTitle = !isOnline
        ? 'Venter på nett'
        : saveState === 'saving'
            ? 'Lagrer nå...'
            : hasUnsavedChangesSinceSave
                ? 'Ikke oppdatert ennå'
                : hasSavedToCloud && formattedRemoteSaveTime
                    ? `Sist lagret ${formattedRemoteSaveTime}`
                    : 'Ikke lagret ennå';
    const cloudStatusHint = !isOnline
        ? 'Lagre til laghistorikken når forbindelsen er tilbake.'
        : saveState === 'saving'
            ? 'Sender kampen til laghistorikken nå.'
            : hasUnsavedChangesSinceSave
                ? 'Trykk Lagre kamp for å sende de siste endringene.'
                : hasSavedToCloud
                    ? 'Laghistorikken er oppdatert.'
                    : 'Første lagring sender kampen til laghistorikken.';
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

    const handleSaveMatch = async () => {
        const name = matchName.trim() || defaultMatchName;
        if (!currentUser) {
            setFeedback({ type: 'error', message: 'Du må være logget inn for å lagre kampen.' });
            return;
        }

        if (pendingShot) {
            setFeedback({
                type: 'warning',
                message: 'Fullfør eller avbryt skuddregistreringen før du lagrer.'
            });
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
            const customDefinitions: CustomStatDefinition[] = customButtons;

            await addDoc(collection(db, 'users', currentUser.uid, 'matches'), buildStoredMatchDocument({
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

            setSaveState('success');
            setLastRemoteSaveAt(Date.now());
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
        setMatchName('');
        setPendingShot(null);
        setPendingGoalPlacement(null);
        setSaveState('idle');
        setLastRemoteSaveAt(null);
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
                {error ? renderFeedback({ type: 'error', message: error }) : null}
                {sameTeamsSelected ? renderFeedback({
                    type: 'warning',
                    message: 'Velg ulike lag på hjemme- og bortesiden før du lagrer.'
                }) : null}
                {feedback ? renderFeedback(feedback) : null}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 sm:hidden">
                <button
                    type="button"
                    onClick={() => setActiveSide('home')}
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
                    onClick={() => setActiveSide('away')}
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
                        onClick={() => setActiveSide('home')}
                    >
                        <select
                            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-black/30 px-3 text-center text-sm font-bold uppercase text-white focus:outline-none focus:ring-1 focus:ring-primary sm:text-xl"
                            value={homeTeamId}
                            onChange={(e) => setHomeTeamId(e.target.value)}
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
                        onClick={() => setActiveSide('away')}
                    >
                        <select
                            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-black/30 px-3 text-center text-sm font-bold uppercase text-white focus:outline-none focus:ring-1 focus:ring-secondary sm:text-xl"
                            value={awayTeamId}
                            onChange={(e) => setAwayTeamId(e.target.value)}
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

            <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
                <div className="col-span-2 mb-4 flex justify-center">
                    <div className="w-full">
                        <CourtVisualizer
                            locations={activeState.shotLocations}
                            onAddLocation={(x, y) => setPendingShot({ x, y })}
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

            {pendingShot ? (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="relative w-full rounded-t-3xl border border-white/10 bg-card p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="shot-dialog-title">
                        <button
                            type="button"
                            onClick={cancelPendingShot}
                            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-gray-400 transition-colors hover:bg-white/20 hover:text-white"
                            aria-label="Lukk skuddregistrering"
                        >
                            <X size={20} />
                        </button>

                        <h2 id="shot-dialog-title" className="mb-2 mt-4 text-center text-2xl font-bold">
                            {!pendingGoalPlacement ? 'Hvor gikk skuddet?' : 'Hva ble resultatet?'}
                        </h2>
                        <p className="mb-6 text-center text-sm text-gray-400">
                            {!pendingGoalPlacement
                                ? 'Plasser skuddet i målet for å fullføre registreringen.'
                                : `Registrering gjelder ${activeTeamName}. Velg resultatet under.`}
                        </p>

                        {!pendingGoalPlacement ? (
                            <div className="mb-4">
                                <GoalVisualizer
                                    saves={[]}
                                    onAddSave={(x, y) => setPendingGoalPlacement({ x, y })}
                                    teamName={activeTeamName}
                                    type="goal"
                                    title="Plassering i mål"
                                />
                            </div>
                        ) : (
                            <div className="mt-4 flex flex-col gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleCombinedShot('goal')}
                                    className="w-full rounded-xl bg-gradient-to-br from-green-500 to-green-700 py-4 text-xl font-bold shadow-lg transition-transform hover:scale-[1.02]"
                                >
                                    Mål
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCombinedShot('save')}
                                    className="w-full rounded-xl bg-gradient-to-br from-red-500 to-red-700 py-4 text-xl font-bold shadow-lg transition-transform hover:scale-[1.02]"
                                >
                                    Redning
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCombinedShot('miss')}
                                    className="w-full rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 py-4 text-xl font-bold text-black shadow-lg transition-transform hover:scale-[1.02]"
                                >
                                    Skuddbom
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPendingGoalPlacement(null)}
                                    className="mt-2 w-full rounded-xl bg-white/5 py-3 text-sm font-semibold text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    Velg ny plassering i mål
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}

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
