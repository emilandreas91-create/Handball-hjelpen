import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { clsx } from 'clsx';
import { ArrowRight, Copy, FolderOpen, Play, Plus, Save, ShieldAlert, Trash2, Users, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../components/features/useAuth';
import { TacticBoard, type TacticBoardTool } from '../components/features/TacticBoard';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useTactics } from '../hooks/useTactics';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { type Team, useTeams } from '../hooks/useTeams';
import { db } from '../lib/firebase';
import { getTeamLookupNames, normalizeTeamNameKey } from '../lib/matchData';
import { type CloudSyncState, prepareFirestorePayload, readScopedLocalStorage, removeScopedLocalStorage, writeScopedLocalStorage } from '../lib/persistence';
import { DEFAULT_FRAME_DURATION_MS, MAX_TACTIC_PLAYERS, MIN_TACTIC_PLAYERS, cloneFrame, createEmptyTacticDraft, createPlayerToken, duplicateTokensAcrossFrames, getPlayerTokens, normalizeStoredTacticDocument, removeTokenAcrossFrames, type NormalizedTacticDocument, type TacticDraft, type TacticFrame, type TacticPath } from '../lib/tacticsData';

const TACTICS_DRAFT_KEY = 'handball-help-tactics-draft:v1';
const TACTICS_DRAFT_REMOTE_DOC = 'tacticsDraft';
const FRAME_DURATION_OPTIONS = [800, DEFAULT_FRAME_DURATION_MS, 1800, 2600];
type PendingSwitchAction = { type: 'new' } | { type: 'open'; tactic: NormalizedTacticDocument };
const createPathId = () => `path_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const relabelFrames = (frames: TacticFrame[]) => frames.map((frame, index) => ({ ...frame, title: `Steg ${index + 1}` }));
const cloneDraft = <T extends TacticDraft>(tactic: T): T => ({ ...tactic, frames: tactic.frames.map((frame) => ({ ...frame, tokens: frame.tokens.map((token) => ({ ...token })), paths: frame.paths.map((path) => ({ ...path })) })) });
const buildDraftSignature = (draft: TacticDraft) => JSON.stringify({
    name: draft.name.trim(),
    teamId: draft.teamId ?? null,
    teamName: draft.teamName.trim(),
    courtType: draft.courtType,
    frames: draft.frames.map((frame) => ({
        title: frame.title,
        durationMs: frame.durationMs,
        tokens: frame.tokens.map((token) => ({ ...token })),
        paths: frame.paths.map((path) => ({ ...path })),
    })),
});
const formatTime = (value: number | null) => value
    ? new Date(value).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
    : null;
const normalizeStoredDraftPayload = (value: unknown) => {
    if (typeof value !== 'object' || value === null) {
        return null;
    }

    const source = value as Record<string, unknown>;
    const storedDraft = source.draft ?? source;
    const draftId = typeof storedDraft === 'object' && storedDraft && 'id' in storedDraft && typeof storedDraft.id === 'string'
        ? storedDraft.id
        : 'draft';
    const normalizedDraft = normalizeStoredTacticDocument(draftId, storedDraft);
    const recoveredDraft: TacticDraft = {
        ...normalizedDraft,
        id: draftId === 'draft' ? undefined : draftId,
    };

    return {
        draft: recoveredDraft,
        frameIndex: typeof source.frameIndex === 'number' ? source.frameIndex : 0,
        lastLocalSavedAt: typeof source.lastLocalSavedAt === 'number' ? source.lastLocalSavedAt : null,
        lastRemoteSavedAt: typeof source.lastRemoteSavedAt === 'number' ? source.lastRemoteSavedAt : null,
        lastSavedSignature: typeof source.lastSavedSignature === 'string' ? source.lastSavedSignature : buildDraftSignature(recoveredDraft),
    };
};

const buildStoredDraftPayload = (
    draft: TacticDraft,
    frameIndex: number,
    lastLocalSavedAt: number,
    lastRemoteSavedAt: number | null,
    lastSavedSignature: string,
) => {
    const normalizedDraft = normalizeStoredTacticDocument(draft.id ?? 'draft', {
        ...(draft.id ? { id: draft.id } : {}),
        ...draft,
    });

    return {
        draft: {
            ...(draft.id ? { id: draft.id } : {}),
            name: normalizedDraft.name,
            teamId: normalizedDraft.teamId,
            teamName: normalizedDraft.teamName,
            courtType: normalizedDraft.courtType,
            frames: normalizedDraft.frames,
            createdAt: normalizedDraft.createdAt,
            updatedAt: normalizedDraft.updatedAt,
        },
        frameIndex: Math.max(0, Math.min(frameIndex, Math.max(normalizedDraft.frames.length - 1, 0))),
        lastLocalSavedAt,
        lastRemoteSavedAt,
        lastSavedSignature,
    };
};
const findMatchingTeam = (teams: Team[], draft: Pick<TacticDraft, 'teamId' | 'teamName'>) => {
    if (draft.teamId) {
        const byId = teams.find((team) => team.id === draft.teamId);
        if (byId) return byId;
    }
    const teamNameKey = normalizeTeamNameKey(draft.teamName);
    if (!teamNameKey) return null;
    return teams.find((team) => getTeamLookupNames(team).some((name) => normalizeTeamNameKey(name) === teamNameKey)) ?? null;
};

export function Tactics() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const draftSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastLocalSavedAtRef = useRef<number | null>(null);
    const { teams, loading: teamsLoading, error: teamsError } = useTeams();
    const { tactics, loading: tacticsLoading, error: tacticsError, saveTactic, deleteTactic } = useTactics();
    const isOnline = useOnlineStatus();
    const [draft, setDraft] = useState<TacticDraft>(() => createEmptyTacticDraft());
    const [frameIndex, setFrameIndex] = useState(0);
    const [activeTool, setActiveTool] = useState<TacticBoardTool>('token');
    const [pendingPathStart, setPendingPathStart] = useState<{ x: number; y: number } | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [pendingSwitchAction, setPendingSwitchAction] = useState<PendingSwitchAction | null>(null);
    const [draftRecovered, setDraftRecovered] = useState(false);
    const [lastLocalSavedAt, setLastLocalSavedAt] = useState<number | null>(null);
    const [lastRemoteSavedAt, setLastRemoteSavedAt] = useState<number | null>(null);
    const [draftCloudSyncState, setDraftCloudSyncState] = useState<CloudSyncState>('idle');
    const [lastSavedSignature, setLastSavedSignature] = useState(() => buildDraftSignature(createEmptyTacticDraft()));
    const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
    const [hasResolvedRemoteDraft, setHasResolvedRemoteDraft] = useState(false);
    const selectedTeam = useMemo(() => findMatchingTeam(teams, draft), [teams, draft]);
    const currentFrame = draft.frames[frameIndex] ?? draft.frames[0];
    const currentPlayers = currentFrame ? getPlayerTokens(currentFrame) : [];
    const pendingDeleteTactic = pendingDeleteId ? tactics.find((tactic) => tactic.id === pendingDeleteId) ?? null : null;
    const hasDraftChanges = buildDraftSignature(draft) !== lastSavedSignature;
    const displayTeamName = selectedTeam?.name || draft.teamName || 'Uten lag';
    const formattedLocalTime = formatTime(lastLocalSavedAt);
    const formattedRemoteTime = formatTime(lastRemoteSavedAt);
    const localStatusTitle = lastLocalSavedAt ? 'Lokal kladd aktiv' : 'Klar';
    const localStatusText = formattedLocalTime
        ? `Sist lagret lokalt ${formattedLocalTime}.`
        : 'Kladden oppdateres automatisk mens du jobber.';
    const remoteStatusTitle = !lastLocalSavedAt
        ? 'Ikke lagret'
        : !currentUser || !isOnline
            ? 'Bare lokalt'
            : draftCloudSyncState === 'error'
                ? 'Kun lokalt akkurat nå'
                : draftCloudSyncState === 'saving'
                    ? 'Lagrer nå'
                    : formattedRemoteTime
                        ? `Bekreftet i sky ${formattedRemoteTime}`
                        : 'Bare lokalt';
    const remoteStatusText = !lastLocalSavedAt
        ? 'Kladden opprettes automatisk når du begynner å jobbe.'
        : !currentUser
            ? 'Logg inn for å synke kladden mellom enheter.'
            : !isOnline
                ? 'Kladden finnes lokalt og sendes til skyen når nettet er tilbake.'
                : draftCloudSyncState === 'error'
                    ? 'Forrige sky-synk feilet. Du kan fortsette, og den lokale kladden er beholdt.'
                    : draftCloudSyncState === 'saving'
                        ? 'Vi venter på backend-bekreftelse før kladden markeres som lagret i sky.'
                        : formattedRemoteTime
                            ? 'Denne kladden er bekreftet lagret for denne brukeren og kan hentes tilbake på andre enheter.'
                            : 'Denne taktikken finnes foreløpig bare som lokal kladd.';
    const saveButtonLabel = isSaving
        ? 'Lagrer...'
        : !isOnline
            ? 'Offline'
            : draft.id && hasDraftChanges
                ? 'Lagre endringer'
                : 'Lagre';

    const applyRecoveredDraft = (
        recoveredDraft: TacticDraft,
        nextFrameIndex: number,
        nextLastLocalSavedAt: number | null,
        nextLastRemoteSavedAt: number | null,
        nextLastSavedSignature: string,
        recovered: boolean,
    ) => {
        setDraft(recoveredDraft);
        setFrameIndex(Math.max(0, Math.min(nextFrameIndex, recoveredDraft.frames.length - 1)));
        setLastLocalSavedAt(nextLastLocalSavedAt);
        setLastRemoteSavedAt(nextLastRemoteSavedAt);
        setLastSavedSignature(nextLastSavedSignature);
        setDraftRecovered(recovered);
    };

    useEffect(() => {
        lastLocalSavedAtRef.current = lastLocalSavedAt;
    }, [lastLocalSavedAt]);

    useEffect(() => {
        if (draftSyncTimeoutRef.current) {
            clearTimeout(draftSyncTimeoutRef.current);
            draftSyncTimeoutRef.current = null;
        }

        setHasHydratedDraft(false);
        setDraft(createEmptyTacticDraft());
        setFrameIndex(0);
        setPendingPathStart(null);
        setDraftRecovered(false);
        setLastLocalSavedAt(null);
        setLastRemoteSavedAt(null);
        setDraftCloudSyncState('idle');
        setLastSavedSignature(buildDraftSignature(createEmptyTacticDraft()));

        if (typeof window === 'undefined') {
            setHasHydratedDraft(true);
            return;
        }

        try {
            const parsed = readScopedLocalStorage(
                TACTICS_DRAFT_KEY,
                currentUser?.uid,
                normalizeStoredDraftPayload,
            );
            if (!parsed) {
                return;
            }

            applyRecoveredDraft(
                parsed.draft,
                parsed.frameIndex,
                parsed.lastLocalSavedAt,
                parsed.lastRemoteSavedAt,
                parsed.lastSavedSignature,
                true,
            );
        } catch (draftError) {
            console.error('Kunne ikke gjenopprette lokal taktikk.', draftError);
            removeScopedLocalStorage(TACTICS_DRAFT_KEY, currentUser?.uid);
        } finally {
            setHasHydratedDraft(true);
        }
    }, [currentUser?.uid]);

    useEffect(() => {
        if (!currentUser) {
            setHasResolvedRemoteDraft(true);
            setDraftCloudSyncState('idle');
            return;
        }

        setHasResolvedRemoteDraft(false);

        const draftRef = doc(db, 'users', currentUser.uid, 'appState', TACTICS_DRAFT_REMOTE_DOC);
        const unsubscribe = onSnapshot(
            draftRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    setHasResolvedRemoteDraft(true);
                    return;
                }

                const parsed = normalizeStoredDraftPayload(snapshot.data());
                if (!parsed) {
                    setHasResolvedRemoteDraft(true);
                    return;
                }

                const remoteUpdatedAt = parsed.lastLocalSavedAt ?? 0;
                const localUpdatedAt = lastLocalSavedAtRef.current ?? 0;

                if (remoteUpdatedAt > localUpdatedAt) {
                    applyRecoveredDraft(
                        parsed.draft,
                        parsed.frameIndex,
                        parsed.lastLocalSavedAt,
                        parsed.lastRemoteSavedAt,
                        parsed.lastSavedSignature,
                        true,
                    );
                }

                if (remoteUpdatedAt > 0) {
                    setLastRemoteSavedAt(remoteUpdatedAt);
                    setDraftCloudSyncState('synced');
                }

                setHasResolvedRemoteDraft(true);
            },
            (draftError) => {
                console.error('Kunne ikke hente taktikk-kladd fra skyen.', draftError);
                setHasResolvedRemoteDraft(true);
            },
        );

        return unsubscribe;
    }, [currentUser]);

    useEffect(() => {
        if (!hasResolvedRemoteDraft) return;
        if (teams.length === 0) return;
        setDraft((current) => {
            const matchingTeam = findMatchingTeam(teams, current);
            if (matchingTeam) return current.teamId === matchingTeam.id && current.teamName === matchingTeam.name ? current : { ...current, teamId: matchingTeam.id, teamName: matchingTeam.name };
            if (current.teamId || current.teamName) return current;
            return { ...current, teamId: teams[0].id, teamName: teams[0].name };
        });
    }, [hasResolvedRemoteDraft, teams]);

    useEffect(() => {
        setFrameIndex((current) => Math.min(current, Math.max(draft.frames.length - 1, 0)));
    }, [draft.frames.length]);

    useEffect(() => {
        setPendingPathStart(null);
    }, [activeTool, frameIndex, draft.id]);

    useEffect(() => {
        if (typeof window === 'undefined' || !hasHydratedDraft) {
            return;
        }

        if (draftSyncTimeoutRef.current) {
            clearTimeout(draftSyncTimeoutRef.current);
            draftSyncTimeoutRef.current = null;
        }

        const savedAt = Date.now();
        const nextStoredDraft = buildStoredDraftPayload(
            draft,
            frameIndex,
            savedAt,
            lastRemoteSavedAt,
            lastSavedSignature,
        );

        writeScopedLocalStorage(TACTICS_DRAFT_KEY, currentUser?.uid, nextStoredDraft);
        setLastLocalSavedAt(savedAt);

        if (!currentUser || !hasResolvedRemoteDraft) {
            return;
        }

        setDraftCloudSyncState('saving');
        draftSyncTimeoutRef.current = setTimeout(() => {
            const nextRemoteDraft = normalizeStoredDraftPayload(prepareFirestorePayload(nextStoredDraft));
            if (!nextRemoteDraft) {
                console.error('Ugyldig taktikk-kladd ble stoppet før sky-synk.');
                setDraftCloudSyncState('error');
                return;
            }

            void setDoc(
                doc(db, 'users', currentUser.uid, 'appState', TACTICS_DRAFT_REMOTE_DOC),
                prepareFirestorePayload(buildStoredDraftPayload(
                    nextRemoteDraft.draft,
                    nextRemoteDraft.frameIndex,
                    nextRemoteDraft.lastLocalSavedAt ?? savedAt,
                    nextRemoteDraft.lastRemoteSavedAt,
                    nextRemoteDraft.lastSavedSignature,
                )),
            )
                .then(() => {
                    setLastRemoteSavedAt(savedAt);
                    setDraftCloudSyncState('synced');
                })
                .catch((draftError) => {
                    console.error('Kunne ikke synkronisere taktikk-kladd til skyen.', draftError);
                    setDraftCloudSyncState('error');
                });
        }, 700);

        return () => {
            if (draftSyncTimeoutRef.current) {
                clearTimeout(draftSyncTimeoutRef.current);
                draftSyncTimeoutRef.current = null;
            }
        };
    }, [currentUser, draft, frameIndex, hasHydratedDraft, hasResolvedRemoteDraft, lastRemoteSavedAt, lastSavedSignature]);

    useEffect(() => {
        if (!message || error) {
            return;
        }

        const timeout = window.setTimeout(() => setMessage(null), 4000);
        return () => window.clearTimeout(timeout);
    }, [error, message]);

    const setInfo = (nextMessage: string | null, nextError: string | null = null) => {
        setMessage(nextMessage);
        setError(nextError);
    };

    const updateCurrentFrame = (updater: (frame: TacticFrame) => TacticFrame) => {
        setDraft((current) => ({ ...current, frames: current.frames.map((frame, index) => index === frameIndex ? updater(frame) : frame) }));
    };

    const resetEditor = (nextDraft: TacticDraft) => {
        setDraft(nextDraft);
        setFrameIndex(0);
        setActiveTool('token');
        setPendingPathStart(null);
        setDraftRecovered(false);
        setDraftCloudSyncState('idle');
        setLastSavedSignature(buildDraftSignature(nextDraft));
        setInfo(null);
    };

    const handleCreateNew = () => {
        const fallbackTeam = selectedTeam ?? teams[0] ?? null;
        resetEditor(createEmptyTacticDraft({ teamId: fallbackTeam?.id ?? null, teamName: fallbackTeam?.name ?? '', courtType: draft.courtType }));
    };

    const handleOpenTactic = (tactic: NormalizedTacticDocument) => {
        const nextDraft = cloneDraft(tactic);
        resetEditor(nextDraft);
        setLastRemoteSavedAt(tactic.sortUpdatedAtMs || null);
        setDraftCloudSyncState(tactic.sortUpdatedAtMs ? 'synced' : 'idle');
        setMessage(`"${tactic.name}" er åpnet.`);
    };

    const runPendingSwitchAction = (action: PendingSwitchAction) => {
        if (action.type === 'new') {
            handleCreateNew();
            return;
        }

        handleOpenTactic(action.tactic);
    };

    const requestSwitchAction = (action: PendingSwitchAction) => {
        if (hasDraftChanges) {
            setPendingSwitchAction(action);
            return;
        }

        runPendingSwitchAction(action);
    };

    const handleBoardPoint = (x: number, y: number) => {
        if (!currentFrame || activeTool === 'token') return;
        setInfo(null);
        if (!pendingPathStart) return void setPendingPathStart({ x, y });
        updateCurrentFrame((frame) => ({ ...frame, paths: [...frame.paths, { id: createPathId(), type: activeTool, fromX: pendingPathStart.x, fromY: pendingPathStart.y, toX: x, toY: y }] }));
        setPendingPathStart(null);
    };

    const handleTokenMove = (tokenId: string, x: number, y: number) => {
        setInfo(null);
        setDraft((current) => ({
            ...current,
            frames: current.frames.map((frame, index) => {
                if (index !== frameIndex) return frame;

                const updatedTokens = frame.tokens.map((token) =>
                    token.id === tokenId ? { ...token, x, y } : token,
                );

                if (frameIndex === 0) {
                    return { ...frame, tokens: updatedTokens };
                }

                const prevFrame = current.frames[frameIndex - 1];
                const prevToken = prevFrame?.tokens.find((t) => t.id === tokenId);
                if (!prevToken) {
                    return { ...frame, tokens: updatedTokens };
                }

                const autoPathId = `auto_${tokenId}`;
                const autoPath: TacticPath = {
                    id: autoPathId,
                    type: 'move',
                    fromX: prevToken.x,
                    fromY: prevToken.y,
                    toX: x,
                    toY: y,
                };

                const updatedPaths = frame.paths.some((p) => p.id === autoPathId)
                    ? frame.paths.map((p) => p.id === autoPathId ? autoPath : p)
                    : [...frame.paths, autoPath];

                return { ...frame, tokens: updatedTokens, paths: updatedPaths };
            }),
        }));
    };

    const handleSave = async () => {
        const trimmedName = draft.name.trim();
        if (!trimmedName) return void setInfo(null, 'Gi taktikken et navn før du lagrer.');
        if (!selectedTeam) return void setInfo(null, 'Velg et aktivt lag før du lagrer taktikken.');
        if (!isOnline) return void setInfo(null, 'Ingen nettforbindelse. Lokal kladd er fortsatt aktiv.');
        setIsSaving(true);
        setError(null);
        try {
            const nextFrames = relabelFrames(draft.frames);
            const saveResult = await saveTactic({ ...draft, name: trimmedName, teamId: selectedTeam.id, teamName: selectedTeam.name, frames: nextFrames });
            const savedDraft = { ...draft, id: saveResult.id, name: trimmedName, teamId: selectedTeam.id, teamName: selectedTeam.name, frames: nextFrames, createdAt: saveResult.createdAt, updatedAt: saveResult.updatedAt };
            setDraft(savedDraft);
            setLastSavedSignature(buildDraftSignature(savedDraft));
            setDraftRecovered(false);
            setMessage('Taktikken er lagret.');
        } catch (saveError) {
            console.error(saveError);
            setError('Kunne ikke lagre taktikken akkurat nå.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            await deleteTactic(pendingDeleteId);
            if (draft.id === pendingDeleteId) handleCreateNew();
            setPendingDeleteId(null);
            setInfo('Taktikken ble slettet.');
        } catch (deleteError) {
            console.error(deleteError);
            setInfo(null, 'Kunne ikke slette taktikken.');
        }
    };

    if (!hasHydratedDraft || teamsLoading || tacticsLoading) return <LoadingState title="Laster taktikker" message="Vi henter tavler, steg og lag slik at trenervisningen blir klar." />;

    return (
        <div className="space-y-6 pb-24 sm:pb-0">
            <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Taktikk</h1>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl border border-white/10 bg-black/20 p-5"><p className="text-sm text-gray-400">Lagrede taktikker</p><p className="mt-2 text-3xl font-black text-white">{tactics.length}</p></div>
                        <div className="rounded-3xl border border-white/10 bg-black/20 p-5"><p className="text-sm text-gray-400">Tilgjengelige lag</p><p className="mt-2 text-3xl font-black text-white">{teams.length}</p></div>
                    </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Aktivt lag</p>
                        <p className="mt-2 text-sm font-semibold text-white">{displayTeamName}</p>
                        <p className="mt-1 text-xs text-gray-400">{draft.courtType === 'full' ? 'Hel bane' : 'Halv bane'}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                            {isOnline ? <Wifi size={14} className="text-primary" /> : <WifiOff size={14} className="text-yellow-300" />}
                            Lokal kladd
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white">{draftRecovered ? 'Gjenopprettet' : localStatusTitle}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-400">
                            {draftRecovered && formattedLocalTime ? `Kladd hentet tilbake kl. ${formattedLocalTime}.` : localStatusText}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Sky-kladd</p>
                        <p className="mt-2 text-sm font-semibold text-white">{remoteStatusTitle}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-400">{remoteStatusText}</p>
                    </div>
                </div>
            </section>

            {(teamsError || tacticsError) ? <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100"><ShieldAlert size={18} className="mt-0.5 shrink-0" /><span>{teamsError || tacticsError}</span></div> : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 shadow-xl sm:p-6">
                    {teams.length === 0 ? (
                        <EmptyState icon={Users} title="Opprett et lag før du bygger taktikk" description="Taktikker lagres per lag. Når laget først er på plass, kan du bruke tavla videre i kamp, pause og trening." action={<Link to="/teams" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-white">Gå til lag<ArrowRight size={16} /></Link>} className="border-white/10 bg-white/5" />
                    ) : (
                        <div className="space-y-5">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-2"><span className="text-sm font-semibold text-white">Navn på taktikk</span><input type="text" value={draft.name} onChange={(event) => { setDraft((current) => ({ ...current, name: event.target.value })); setInfo(null); }} placeholder="For eksempel 7 mot 6 kryss" className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" /></label>
                                <label className="grid gap-2"><span className="text-sm font-semibold text-white">Lag</span><select value={selectedTeam?.id ?? ''} onChange={(event) => { const nextTeam = teams.find((team) => team.id === event.target.value) ?? null; setDraft((current) => ({ ...current, teamId: nextTeam?.id ?? null, teamName: nextTeam?.name ?? current.teamName })); setInfo(null); }} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">{!selectedTeam ? <option value="">Velg lag</option> : null}{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                            </div>
                            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">{(['half', 'full'] as const).map((courtType) => <button key={courtType} type="button" onClick={() => { setDraft((current) => ({ ...current, courtType })); setInfo(null); }} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${draft.courtType === courtType ? 'bg-primary text-black' : 'bg-black/30 text-white hover:bg-white/10'}`}>{courtType === 'half' ? 'Halv bane' : 'Hel bane'}</button>)}</div>
                                <button type="button" onClick={() => requestSwitchAction({ type: 'new' })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">Ny tavle</button>
                                <button type="button" onClick={handleSave} disabled={!isOnline || isSaving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"><Save size={16} />{saveButtonLabel}</button>
                            </div>
                            {!selectedTeam && draft.teamName ? <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">Taktikken peker mot laget "{draft.teamName}", men laget finnes ikke lenger. Velg et aktivt lag før du lagrer.</div> : null}
                            <TacticBoard courtType={draft.courtType} tokens={currentFrame?.tokens ?? []} paths={currentFrame?.paths ?? []} activeTool={activeTool} pendingPathStart={pendingPathStart} onBoardPoint={handleBoardPoint} onTokenMove={handleTokenMove} interactive helperText={activeTool === 'token' ? 'Dra spillere og ball dit du vil ha dem i dette steget.' : pendingPathStart ? 'Trykk et nytt punkt for å fullføre pilen.' : 'Trykk startpunkt og deretter sluttpunkt for å tegne pilen.'} />
                            <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr_auto_auto]">
                                <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">{([['token', 'Flytt'], ['move', 'Bevegelse'], ['pass', 'Pass']] as Array<[TacticBoardTool, string]>).map(([tool, label]) => <button key={tool} type="button" onClick={() => setActiveTool(tool)} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${activeTool === tool ? 'bg-primary text-black' : 'text-white hover:bg-white/10'}`}>{label}</button>)}</div>
                                <div className="flex gap-2"><button type="button" onClick={() => { if (currentPlayers.length >= MAX_TACTIC_PLAYERS) return void setInfo(null, `Du kan ha maks ${MAX_TACTIC_PLAYERS} spillere i v1.`); setDraft((current) => ({ ...current, frames: duplicateTokensAcrossFrames(current.frames, createPlayerToken(currentPlayers.length + 1, draft.courtType)) })); setInfo(null); }} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"><Plus size={16} />Spiller</button><button type="button" onClick={() => { if (currentPlayers.length <= MIN_TACTIC_PLAYERS) return void setInfo(null, 'Det må være minst én spiller igjen på tavla.'); const lastPlayer = [...currentPlayers].sort((left, right) => Number(right.label) - Number(left.label))[0]; if (!lastPlayer) return; setDraft((current) => ({ ...current, frames: removeTokenAcrossFrames(current.frames, lastPlayer.id) })); setInfo(null); }} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">Fjern</button></div>
                                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"><span className="font-semibold text-white">Stegvarighet</span><select value={currentFrame?.durationMs ?? DEFAULT_FRAME_DURATION_MS} onChange={(event) => updateCurrentFrame((frame) => ({ ...frame, durationMs: Number(event.target.value) || DEFAULT_FRAME_DURATION_MS }))} className="min-w-[110px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">{FRAME_DURATION_OPTIONS.map((durationMs) => <option key={durationMs} value={durationMs}>{(durationMs / 1000).toFixed(1)} sek</option>)}</select></div>
                                <button type="button" onClick={() => updateCurrentFrame((frame) => ({ ...frame, paths: [] }))} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">Tøm piler</button>
                                <button type="button" onClick={() => draft.id && navigate(`/tactics/${draft.id}/present`)} disabled={!draft.id} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-white transition hover:border-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50"><Play size={16} />Presenter</button>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-white">Steg</h2><p className="text-sm text-gray-400">Dupliser for å bygge animasjonen steg for steg.</p></div><div className="flex gap-2"><button type="button" onClick={() => { if (!currentFrame) return; const nextFrame = cloneFrame(currentFrame, frameIndex + 1); setDraft((current) => { const nextFrames = [...current.frames]; nextFrames.splice(frameIndex + 1, 0, nextFrame); return { ...current, frames: relabelFrames(nextFrames) }; }); setFrameIndex((current) => current + 1); }} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:bg-white"><Copy size={16} />Dupliser steg</button><button type="button" onClick={() => { if (draft.frames.length <= 1) return void setInfo(null, 'Taktikken må ha minst ett steg.'); setDraft((current) => ({ ...current, frames: relabelFrames(current.frames.filter((_, index) => index !== frameIndex)) })); setFrameIndex((current) => Math.max(current - 1, 0)); }} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">Slett steg</button></div></div>
                                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">{draft.frames.map((frame, index) => <button key={frame.id} type="button" onClick={() => setFrameIndex(index)} className={`min-w-[120px] rounded-2xl border px-4 py-3 text-left transition ${frameIndex === index ? 'border-primary/40 bg-primary/10 text-white' : 'border-white/10 bg-black/20 text-gray-300 hover:bg-white/5'}`}><p className="text-sm font-bold">{frame.title}</p><p className="mt-1 text-xs text-white/50">{(frame.durationMs / 1000).toFixed(1)} sek</p></button>)}</div>
                            </div>
                            {(error || message) ? <div className={`rounded-2xl p-4 text-sm ${error ? 'border border-red-500/30 bg-red-500/10 text-red-100' : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>{error || message}</div> : null}
                        </div>
                    )}
                </section>

                <aside className="space-y-6">
                    <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 shadow-xl sm:p-6">
                        <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-white">Lagrede taktikker</h2></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-white">{tactics.length}</span></div>
                        {tactics.length === 0 ? <EmptyState icon={FolderOpen} title="Ingen taktikker lagret ennå" description="Når du lagrer første tavle, dukker den opp her med rask tilgang til redigering og presentasjon." className="mt-5 border-white/10 bg-white/5 p-6" /> : <div className="mt-5 space-y-3">{tactics.map((tactic) => <article key={tactic.id} className={`rounded-3xl border p-4 transition ${draft.id === tactic.id ? 'border-primary/30 bg-primary/10' : 'border-white/10 bg-white/5'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-base font-bold text-white">{tactic.name}</h3><p className="mt-1 text-sm text-gray-400">{tactic.teamName || 'Uten lag'} • {tactic.courtType === 'full' ? 'Hel bane' : 'Halv bane'}</p><p className="mt-1 text-xs text-white/50">{tactic.frames.length} steg • Oppdatert {tactic.updatedAtLabel}</p></div><button type="button" onClick={() => setPendingDeleteId(tactic.id)} className="rounded-xl border border-white/10 bg-black/20 p-2 text-white/60 transition hover:bg-red-500/10 hover:text-red-200" aria-label={`Slett ${tactic.name}`}><Trash2 size={16} /></button></div><div className="mt-4 grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => requestSwitchAction({ type: 'open', tactic })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">Åpne tavle</button><button type="button" onClick={() => navigate(`/tactics/${tactic.id}/present`)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:bg-white"><Play size={16} />Presenter</button></div></article>)}</div>}
                    </section>
                    <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 shadow-xl sm:p-6"><h2 className="text-xl font-bold text-white">Enkel arbeidsflyt</h2><div className="mt-4 space-y-3 text-sm leading-6 text-gray-300"><p>1. Velg lag, navn og bane.</p><p>2. Dra spillerne på plass i første steg.</p><p>3. Bytt til bevegelse eller pass og tegn piler.</p><p>4. Dupliser steget og flytt spillerne videre for neste frame.</p><p>5. Lagre og åpne presentasjon når laget skal se løsningen.</p></div></section>
                </aside>
            </div>

            <div className="fixed bottom-3 left-3 right-3 z-40 grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-black/85 p-3 shadow-2xl backdrop-blur-xl sm:hidden">
                <button type="button" onClick={() => requestSwitchAction({ type: 'new' })} className="rounded-2xl bg-white/5 px-3 py-3 text-sm font-semibold text-white">Ny</button>
                <button type="button" onClick={handleSave} disabled={!isOnline || isSaving} className={clsx('rounded-2xl px-3 py-3 text-sm font-semibold', isOnline ? 'bg-primary text-black' : 'bg-white/5 text-gray-300')}>{isSaving ? 'Lagrer' : 'Lagre'}</button>
                <button type="button" onClick={() => draft.id && navigate(`/tactics/${draft.id}/present`)} disabled={!draft.id} className="rounded-2xl bg-white/5 px-3 py-3 text-sm font-semibold text-white disabled:opacity-50">Presenter</button>
            </div>

            <Dialog isOpen={Boolean(pendingSwitchAction)} title="Bytte taktikk?" description="Du har endringer i kladden som ikke er lagret videre. Hvis du fortsetter, erstattes den aktive kladden." onClose={() => setPendingSwitchAction(null)} actions={<><button type="button" onClick={() => setPendingSwitchAction(null)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">Fortsett å redigere</button><button type="button" onClick={() => { if (!pendingSwitchAction) return; runPendingSwitchAction(pendingSwitchAction); setPendingSwitchAction(null); }} className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:bg-white">Bytt</button></>} />
            <Dialog isOpen={Boolean(pendingDeleteTactic)} title="Slett taktikk" description={pendingDeleteTactic ? `Vil du slette "${pendingDeleteTactic.name}"? Dette kan ikke angres.` : undefined} onClose={() => setPendingDeleteId(null)} actions={<><button type="button" onClick={() => setPendingDeleteId(null)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">Behold</button><button type="button" onClick={handleConfirmDelete} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500">Slett</button></>} />
        </div>
    );
}
