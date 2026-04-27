import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, ClipboardList, History, Play, Users, WifiOff, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../components/features/useAuth';
import { useTeams } from '../hooks/useTeams';
import { useTactics } from '../hooks/useTactics';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useMatchContext } from '../hooks/useMatch';
import { db } from '../lib/firebase';
import {
    LIVE_STATS_DEFAULTS_KEY,
    LIVE_STATS_DEFAULTS_REMOTE_DOC,
    normalizeLiveStatsDefaults,
    type LiveStatsDefaults,
} from '../lib/liveStatsState';
import { readScopedLocalStorage } from '../lib/persistence';

interface ActionCardProps {
    title: string;
    description: string;
    detail: string;
    to: string;
    icon: LucideIcon;
    highlight?: boolean;
    animationClass?: string;
}

function ActionCard({
    title,
    description,
    detail,
    to,
    icon: Icon,
    highlight = false,
    animationClass = 'home-fade-up-delay-1',
}: ActionCardProps) {
    return (
        <Link
            to={to}
            className={clsx(
                animationClass,
                'group relative flex min-h-[12.5rem] flex-col overflow-hidden rounded-[1.9rem] border p-5 text-left transition duration-300 ease-out hover:-translate-y-1',
                highlight
                    ? 'border-cyan-300/20 shadow-[0_26px_90px_rgba(10,32,56,0.42)] hover:border-cyan-300/40 hover:shadow-[0_30px_100px_rgba(34,211,238,0.16)]'
                    : 'border-white/10 shadow-[0_22px_72px_rgba(0,0,0,0.28)] hover:border-white/20 hover:shadow-[0_28px_90px_rgba(8,16,30,0.42)]',
            )}
            style={{
                background: highlight
                    ? 'linear-gradient(160deg, rgba(15, 30, 49, 0.98) 0%, rgba(13, 31, 48, 0.94) 44%, rgba(7, 16, 27, 0.98) 100%)'
                    : 'linear-gradient(180deg, rgba(14, 22, 35, 0.92) 0%, rgba(8, 14, 24, 0.88) 100%)',
            }}
        >
            <div
                aria-hidden="true"
                className={clsx(
                    'absolute inset-0 opacity-80 transition duration-300 group-hover:opacity-100',
                    highlight ? 'bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_42%)]' : 'bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.10),transparent_40%)]',
                )}
            />

            <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                    <div
                        className={clsx(
                            'flex h-12 w-12 items-center justify-center rounded-2xl border backdrop-blur-md transition duration-300 group-hover:scale-[1.03]',
                            highlight
                                ? 'border-cyan-300/25 bg-cyan-300/12 text-cyan-50'
                                : 'border-white/10 bg-white/[0.05] text-cyan-100',
                        )}
                    >
                        <Icon size={22} />
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/40 transition duration-300 group-hover:border-cyan-300/25 group-hover:bg-cyan-300/10 group-hover:text-cyan-100">
                        <ArrowRight size={16} />
                    </div>
                </div>

                <div className="mt-8">
                    <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-50">{title}</h2>
                    <p className="mt-2 text-sm font-medium text-slate-300">{description}</p>
                </div>

                <div className="mt-auto pt-5">
                    <span
                        className={clsx(
                            'inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.02em]',
                            highlight
                                ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-50'
                                : 'border-white/10 bg-white/[0.04] text-slate-300',
                        )}
                    >
                        {detail}
                    </span>
                </div>
            </div>
        </Link>
    );
}


interface ActivityCardProps {
    title: string;
    primary: string;
    secondary: string;
    actionLabel?: string;
    actionTo?: string;
}

function ActivityCard({ title, primary, secondary, actionLabel, actionTo }: ActivityCardProps) {
    return (
        <article className="rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-sm transition duration-300 hover:border-white/20 hover:bg-white/[0.05]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
            <h2 className="mt-3 text-base font-semibold tracking-[-0.02em] text-slate-100">{primary}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{secondary}</p>
            {actionLabel && actionTo ? (
                <Link
                    to={actionTo}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-white"
                >
                    {actionLabel}
                    <ArrowRight size={15} />
                </Link>
            ) : null}
        </article>
    );
}

interface StatusPillProps {
    icon: LucideIcon;
    label: string;
    detail: string;
    tone?: 'default' | 'warning';
}

function StatusPill({ icon: Icon, label, detail, tone = 'default' }: StatusPillProps) {
    return (
        <div
            className={clsx(
                'inline-flex min-w-[10rem] items-center gap-3 rounded-full border px-4 py-3 text-sm shadow-[0_14px_40px_rgba(0,0,0,0.16)] backdrop-blur-sm',
                tone === 'warning'
                    ? 'border-yellow-400/20 bg-yellow-400/10 text-yellow-50'
                    : 'border-white/10 bg-white/[0.04] text-slate-200',
            )}
        >
            <div
                className={clsx(
                    'flex h-9 w-9 items-center justify-center rounded-full border',
                    tone === 'warning'
                        ? 'border-yellow-300/20 bg-yellow-300/10 text-yellow-100'
                        : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100',
                )}
            >
                <Icon size={16} />
            </div>
            <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-white/60">{label}</p>
                <p className="truncate text-sm font-medium text-current">{detail}</p>
            </div>
        </div>
    );
}

const formatClock = (value: number | null) => (
    value
        ? new Date(value).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
        : null
);

export function Start() {
    const { currentUser } = useAuth();
    const { teams, loading: teamsLoading } = useTeams();
    const { tactics, loading: tacticsLoading } = useTactics();
    const isOnline = useOnlineStatus();
    const [recentMatchDefaults, setRecentMatchDefaults] = useState<LiveStatsDefaults | null>(null);
    const [recentMatchDefaultsSource, setRecentMatchDefaultsSource] = useState<'local' | 'cloud' | null>(null);
    const {
        matchTime,
        formatTime,
        periodLabel,
        homeState,
        awayState,
        history,
        draftRecovered,
        draftRecoveredFrom,
        lastDraftSavedAt,
    } = useMatchContext();

    useEffect(() => {
        setRecentMatchDefaults(null);
        setRecentMatchDefaultsSource(null);

        if (typeof window === 'undefined') {
            return;
        }

        try {
            const parsedDefaults = readScopedLocalStorage(
                LIVE_STATS_DEFAULTS_KEY,
                currentUser?.uid,
                normalizeLiveStatsDefaults,
            );
            if (parsedDefaults) {
                setRecentMatchDefaults(parsedDefaults);
                setRecentMatchDefaultsSource('local');
            }
        } catch (error) {
            console.error('Kunne ikke lese sist brukte kampvalg.', error);
        }
    }, [currentUser?.uid]);

    useEffect(() => {
        if (!currentUser) {
            return;
        }

        const defaultsRef = doc(db, 'users', currentUser.uid, 'appState', LIVE_STATS_DEFAULTS_REMOTE_DOC);
        const unsubscribe = onSnapshot(
            defaultsRef,
            (snapshot) => {
                if (!snapshot.exists()) {
                    return;
                }

                const remoteDefaults = normalizeLiveStatsDefaults(snapshot.data());
                if (!remoteDefaults) {
                    return;
                }

                setRecentMatchDefaults((current) => {
                    const currentUpdatedAt = current?.updatedAt ?? 0;
                    const remoteUpdatedAt = remoteDefaults.updatedAt ?? 0;
                    if (remoteUpdatedAt >= currentUpdatedAt) {
                        setRecentMatchDefaultsSource('cloud');
                        return remoteDefaults;
                    }

                    return current;
                });
            },
            (error) => {
                console.error('Kunne ikke hente sist brukte kampvalg fra skyen.', error);
            },
        );

        return unsubscribe;
    }, [currentUser]);

    const hasLiveDraft = (
        matchTime > 0 ||
        history.length > 0 ||
        homeState.score > 0 ||
        awayState.score > 0 ||
        homeState.shotLocations.length > 0 ||
        awayState.shotLocations.length > 0
    );

    const latestTactic = tactics[0] ?? null;
    const recentTeamFromMatch = [recentMatchDefaults?.homeTeamId, recentMatchDefaults?.awayTeamId]
        .map((teamId) => typeof teamId === 'string' ? teams.find((team) => team.id === teamId) : undefined)
        .find((team) => team !== undefined) ?? null;
    const recentTeamName = recentTeamFromMatch?.name || latestTactic?.teamName || teams[0]?.name || null;
    const recentTeamDetail = recentTeamFromMatch
        ? recentMatchDefaultsSource === 'cloud'
            ? 'Sist valgt i kampoppsettet og bekreftet i sky.'
            : 'Sist valgt i kampoppsettet på denne enheten.'
        : latestTactic?.teamName
            ? `Fra taktikken "${latestTactic.name}".`
            : teams.length > 0
                ? 'Sist registrerte lag i oversikten.'
                : 'Ingen lag ennå.';
    const formattedDraftTime = formatClock(lastDraftSavedAt);

    return (
        <div className="relative isolate space-y-5 pb-4 pt-2 md:space-y-6 md:pt-4">
            <section
                className="home-fade-up relative overflow-hidden rounded-[2.25rem] border border-white/10 px-6 py-8 shadow-[0_32px_100px_rgba(3,8,18,0.46)] backdrop-blur-xl md:px-8 md:py-10"
                style={{
                    background: 'linear-gradient(145deg, rgba(13, 24, 40, 0.98) 0%, rgba(11, 23, 38, 0.95) 42%, rgba(7, 14, 24, 0.99) 100%)',
                }}
            >
                <div
                    aria-hidden="true"
                    className="absolute -right-16 top-0 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl"
                />
                <div className="relative max-w-2xl">
                    <h1 className="text-4xl font-black tracking-[-0.05em] text-slate-50 md:text-5xl">
                        Handball-hjelpen
                    </h1>
                    <p className="mt-4 max-w-xl text-base font-medium leading-7 text-slate-300">
                        Velg hva du vil gjøre nå.
                    </p>
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ActionCard
                    title="Start ny kamp"
                    description="Åpne kampvisning"
                    detail="Klar til ny registrering."
                    to="/stats"
                    icon={Activity}
                    highlight
                />
                <ActionCard
                    title="Fortsett siste kamp"
                    description={hasLiveDraft ? 'Klar til å fortsette' : 'Ingen kampkladd ennå'}
                    detail={hasLiveDraft
                        ? `${periodLabel} • ${formatTime(matchTime)} • ${homeState.score}-${awayState.score}${formattedDraftTime ? ` • oppdatert ${formattedDraftTime}` : ''}`
                        : 'Gå til kampvisning for å starte.'}
                    to="/stats"
                    icon={Play}
                />
                <ActionCard
                    title="Åpne lag"
                    description={teamsLoading ? 'Henter lag' : teams.length > 0 ? `${teams.length} lag klare` : 'Ingen lag ennå'}
                    detail={teams.length > 0 ? 'Gå til lagoversikten.' : 'Opprett første lag.'}
                    to="/teams"
                    icon={Users}
                    animationClass="home-fade-up-delay-2"
                />
                <ActionCard
                    title="Taktikk"
                    description={tacticsLoading ? 'Henter taktikker' : latestTactic ? latestTactic.name : 'Ingen taktikker ennå'}
                    detail={latestTactic?.teamName || 'Åpne taktikktavla.'}
                    to="/tactics"
                    icon={ClipboardList}
                    animationClass="home-fade-up-delay-2"
                />
            </section>

            <section
                className="home-fade-up-delay-2 rounded-[1.9rem] border border-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-6"
                style={{
                    background: 'linear-gradient(180deg, rgba(12, 20, 33, 0.84) 0%, rgba(8, 14, 24, 0.72) 100%)',
                }}
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-100">
                        <History size={18} />
                    </div>
                    <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-50">Siste aktivitet</h2>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <ActivityCard
                        title="Sist brukte lag"
                        primary={teamsLoading ? 'Henter lag' : recentTeamName || 'Ingen lag ennå'}
                        secondary={teamsLoading ? 'Vi gjør oversikten klar.' : recentTeamDetail}
                        actionLabel="Åpne lag"
                        actionTo="/teams"
                    />
                    <ActivityCard
                        title="Sist redigerte taktikk"
                        primary={tacticsLoading ? 'Henter taktikker' : latestTactic?.name || 'Ingen taktikk ennå'}
                        secondary={tacticsLoading
                            ? 'Vi henter siste taktikk.'
                            : latestTactic
                                ? `${latestTactic.teamName || 'Uten lag'} • ${latestTactic.updatedAtLabel}`
                                : 'Åpne taktikk for å lage første oppsett.'}
                        actionLabel="Åpne taktikk"
                        actionTo="/tactics"
                    />
                </div>
            </section>

            {(!isOnline || hasLiveDraft || draftRecovered) ? (
                <section className="home-fade-up-delay-3 flex flex-wrap gap-2.5">
                    {hasLiveDraft || draftRecovered ? (
                        <StatusPill
                            icon={Activity}
                            label="Lokal kladd"
                            detail={formattedDraftTime
                                ? `${draftRecoveredFrom === 'cloud' ? 'Skykladd' : 'Lokal kladd'} ${formattedDraftTime}`
                                : 'Kampkladd aktiv'}
                        />
                    ) : null}

                    {!isOnline ? (
                        <StatusPill
                            icon={WifiOff}
                            label="Status"
                            detail="Offline"
                            tone="warning"
                        />
                    ) : null}
                </section>
            ) : null}
        </div>
    );
}
