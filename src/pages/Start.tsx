import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, ClipboardList, History, Play, Users, WifiOff, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useTeams } from '../hooks/useTeams';
import { useTactics } from '../hooks/useTactics';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useMatchContext } from '../hooks/useMatch';

const LIVE_STATS_DEFAULTS_KEY = 'handball-help-live-defaults:v1';

interface LiveStatsDefaults {
    homeTeamId?: string;
    awayTeamId?: string;
    updatedAt?: number;
}

interface ActionCardProps {
    title: string;
    description: string;
    detail: string;
    to: string;
    icon: LucideIcon;
    highlight?: boolean;
}

function ActionCard({ title, description, detail, to, icon: Icon, highlight = false }: ActionCardProps) {
    return (
        <Link
            to={to}
            className={clsx(
                'group rounded-[2rem] border p-5 shadow-xl transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/10',
                highlight ? 'border-primary/30 bg-primary/10' : 'border-white/10 bg-black/20',
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className={clsx(
                    'flex h-12 w-12 items-center justify-center rounded-2xl',
                    highlight ? 'bg-primary text-black' : 'bg-white/10 text-primary',
                )}>
                    <Icon size={22} />
                </div>
                <ArrowRight className="mt-1 text-white/30 transition group-hover:text-primary" size={18} />
            </div>
            <h2 className="mt-5 text-xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-sm font-medium text-gray-300">{description}</p>
            <p className="mt-1 text-sm text-white/50">{detail}</p>
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
        <article className="rounded-3xl border border-white/10 bg-black/20 p-5 shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{title}</p>
            <h2 className="mt-3 text-lg font-bold text-white">{primary}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">{secondary}</p>
            {actionLabel && actionTo ? (
                <Link
                    to={actionTo}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-white"
                >
                    {actionLabel}
                    <ArrowRight size={16} />
                </Link>
            ) : null}
        </article>
    );
}

const formatClock = (value: number | null) => (
    value
        ? new Date(value).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
        : null
);

export function Start() {
    const { teams, loading: teamsLoading } = useTeams();
    const { tactics, loading: tacticsLoading } = useTactics();
    const isOnline = useOnlineStatus();
    const [recentMatchDefaults, setRecentMatchDefaults] = useState<LiveStatsDefaults | null>(null);
    const {
        matchTime,
        formatTime,
        periodLabel,
        homeState,
        awayState,
        history,
        draftRecovered,
        lastDraftSavedAt,
    } = useMatchContext();

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const rawDefaults = window.localStorage.getItem(LIVE_STATS_DEFAULTS_KEY);
            if (!rawDefaults) {
                return;
            }

            const parsedDefaults = JSON.parse(rawDefaults) as LiveStatsDefaults;
            setRecentMatchDefaults({
                homeTeamId: typeof parsedDefaults.homeTeamId === 'string' ? parsedDefaults.homeTeamId : undefined,
                awayTeamId: typeof parsedDefaults.awayTeamId === 'string' ? parsedDefaults.awayTeamId : undefined,
                updatedAt: typeof parsedDefaults.updatedAt === 'number' ? parsedDefaults.updatedAt : undefined,
            });
        } catch (error) {
            console.error('Kunne ikke lese sist brukte kampvalg.', error);
        }
    }, []);

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
        .find((teamName) => typeof teamName === 'string' && teams.some((team) => team.name === teamName)) ?? null;
    const recentTeamName = recentTeamFromMatch || latestTactic?.teamName || teams[0]?.name || null;
    const recentTeamDetail = recentTeamFromMatch
        ? 'Sist valgt i kampoppsettet.'
        : latestTactic?.teamName
            ? `Fra taktikken "${latestTactic.name}".`
            : teams.length > 0
                ? 'Sist registrerte lag i oversikten.'
                : 'Ingen lag ennå.';
    const formattedDraftTime = formatClock(lastDraftSavedAt);

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">Handball-hjelpen</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
                    Handball-hjelpen
                </h1>
                <p className="mt-3 text-base text-gray-300">Velg hva du vil gjøre nå.</p>
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
                />
                <ActionCard
                    title="Taktikk"
                    description={tacticsLoading ? 'Henter taktikker' : latestTactic ? latestTactic.name : 'Ingen taktikker ennå'}
                    detail={latestTactic?.teamName || 'Åpne taktikktavla.'}
                    to="/tactics"
                    icon={ClipboardList}
                />
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 shadow-xl sm:p-6">
                <div className="flex items-center gap-3">
                    <History size={18} className="text-primary" />
                    <h2 className="text-xl font-bold text-white">Siste aktivitet</h2>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <ActivityCard
                        title="Siste kamp"
                        primary={hasLiveDraft ? 'Siste kamp kan fortsette' : 'Ingen kamp ennå'}
                        secondary={hasLiveDraft
                            ? `${periodLabel} • ${formatTime(matchTime)} • ${homeState.score}-${awayState.score}${formattedDraftTime ? ` • lagret ${formattedDraftTime}` : ''}`
                            : 'Start ny kamp når du er klar.'}
                        actionLabel="Fortsett kamp"
                        actionTo="/stats"
                    />
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

            {(!isOnline || hasLiveDraft || teams.length > 0 || draftRecovered) ? (
                <section className="grid gap-3 sm:grid-cols-3">
                    {hasLiveDraft || draftRecovered ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200">
                            <p className="font-semibold text-white">Lokal kladd</p>
                            <p className="mt-1 text-white/60">
                                {formattedDraftTime ? `Sist oppdatert ${formattedDraftTime}.` : 'Kampkladd aktiv.'}
                            </p>
                        </div>
                    ) : null}

                    {!isOnline ? (
                        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
                            <div className="flex items-center gap-2 font-semibold">
                                <WifiOff size={16} />
                                Offline
                            </div>
                            <p className="mt-1 text-yellow-50/80">Du kan fortsatt jobbe videre i lokal kladd.</p>
                        </div>
                    ) : null}

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-200">
                        <p className="font-semibold text-white">Lag</p>
                        <p className="mt-1 text-white/60">{teamsLoading ? 'Henter lag...' : `${teams.length} registrert`}</p>
                    </div>
                </section>
            ) : null}
        </div>
    );
}
