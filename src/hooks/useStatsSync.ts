import { useEffect, useRef, useState } from 'react';
import { deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
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
import {
    type CloudSyncState,
    prepareFirestorePayload,
    readScopedLocalStorage,
    removeScopedLocalStorage,
    writeScopedLocalStorage,
} from '../lib/persistence';
import type { TeamSide } from '../lib/matchData';

interface UseStatsSyncInput {
    currentUser: User | null;
    activeSide: TeamSide;
    homeTeamId: string;
    awayTeamId: string;
    matchName: string;
    isMatchStarted: boolean;
    customButtons: LiveStatsButtonDefinition[];
    onUiDraftLoaded: (draft: LiveStatsUiDraft) => void;
    onDefaultsLoaded: (defaults: LiveStatsDefaults) => void;
}

export interface UseStatsSyncReturn {
    hasResolvedRemoteUiDraft: boolean;
    hasResolvedRemoteDefaults: boolean;
    uiCloudSyncState: CloudSyncState;
    lastUiCloudSyncAt: number | null;
    defaultsCloudSyncState: CloudSyncState;
    lastDefaultsCloudSyncAt: number | null;
    lastUiDraftSavedAt: number | null;
    lastDefaultsSavedAt: number | null;
}

export function useStatsSync({
    currentUser,
    activeSide,
    homeTeamId,
    awayTeamId,
    matchName,
    isMatchStarted,
    customButtons,
    onUiDraftLoaded,
    onDefaultsLoaded,
}: UseStatsSyncInput): UseStatsSyncReturn {
    const uiDraftSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const defaultsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastUiDraftSavedAtRef = useRef<number | null>(null);
    const lastDefaultsSavedAtRef = useRef<number | null>(null);
    const homeTeamIdRef = useRef('');
    const awayTeamIdRef = useRef('');
    const onUiDraftLoadedRef = useRef(onUiDraftLoaded);
    const onDefaultsLoadedRef = useRef(onDefaultsLoaded);

    const [hasHydratedUiDraft, setHasHydratedUiDraft] = useState(false);
    const [hasResolvedRemoteUiDraft, setHasResolvedRemoteUiDraft] = useState(false);
    const [hasResolvedRemoteDefaults, setHasResolvedRemoteDefaults] = useState(false);
    const [lastUiDraftSavedAt, setLastUiDraftSavedAt] = useState<number | null>(null);
    const [lastDefaultsSavedAt, setLastDefaultsSavedAt] = useState<number | null>(null);
    const [uiCloudSyncState, setUiCloudSyncState] = useState<CloudSyncState>('idle');
    const [defaultsCloudSyncState, setDefaultsCloudSyncState] = useState<CloudSyncState>('idle');
    const [lastUiCloudSyncAt, setLastUiCloudSyncAt] = useState<number | null>(null);
    const [lastDefaultsCloudSyncAt, setLastDefaultsCloudSyncAt] = useState<number | null>(null);

    useEffect(() => { onUiDraftLoadedRef.current = onUiDraftLoaded; }, [onUiDraftLoaded]);
    useEffect(() => { onDefaultsLoadedRef.current = onDefaultsLoaded; }, [onDefaultsLoaded]);

    useEffect(() => {
        lastUiDraftSavedAtRef.current = lastUiDraftSavedAt;
    }, [lastUiDraftSavedAt]);

    useEffect(() => {
        lastDefaultsSavedAtRef.current = lastDefaultsSavedAt;
    }, [lastDefaultsSavedAt]);

    useEffect(() => {
        homeTeamIdRef.current = homeTeamId;
        awayTeamIdRef.current = awayTeamId;
    }, [homeTeamId, awayTeamId]);

    // Hydrate from localStorage when user changes
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
        setLastUiDraftSavedAt(null);
        setLastDefaultsSavedAt(null);
        setUiCloudSyncState('idle');
        setDefaultsCloudSyncState('idle');
        setLastUiCloudSyncAt(null);
        setLastDefaultsCloudSyncAt(null);

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
                onUiDraftLoadedRef.current(parsedDraft);
                setLastUiDraftSavedAt(typeof parsedDraft.updatedAt === 'number' ? parsedDraft.updatedAt : null);
                return;
            }

            const parsedDefaults = readScopedLocalStorage(
                LIVE_STATS_DEFAULTS_KEY,
                currentUser?.uid,
                normalizeLiveStatsDefaults,
            );
            if (parsedDefaults) {
                onDefaultsLoadedRef.current(parsedDefaults);
                setLastDefaultsSavedAt(typeof parsedDefaults.updatedAt === 'number' ? parsedDefaults.updatedAt : null);
            }
        } catch (draftError) {
            console.error('Kunne ikke gjenopprette lokalt kampoppsett.', draftError);
            removeScopedLocalStorage(LIVE_STATS_UI_KEY, currentUser?.uid);
            removeScopedLocalStorage(LIVE_STATS_DEFAULTS_KEY, currentUser?.uid);
        } finally {
            setHasHydratedUiDraft(true);
        }
    }, [currentUser?.uid]);

    // Subscribe to remote uiDraft
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
                    onUiDraftLoadedRef.current(remoteDraft);
                    setLastUiDraftSavedAt(remoteUpdatedAt);
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

    // Subscribe to remote defaults
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
                    onDefaultsLoadedRef.current(remoteDefaults);
                    setLastDefaultsSavedAt(remoteUpdatedAt);
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

    // Write uiDraft to localStorage + debounced Firestore
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

    // Write defaults to localStorage + debounced Firestore
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

    return {
        hasResolvedRemoteUiDraft,
        hasResolvedRemoteDefaults,
        uiCloudSyncState,
        lastUiCloudSyncAt,
        defaultsCloudSyncState,
        lastDefaultsCloudSyncAt,
        lastUiDraftSavedAt,
        lastDefaultsSavedAt,
    };
}
