import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CalendarPlus,
    CheckCircle2,
    ChevronRight,
    ClipboardList,
    ClipboardPaste,
    Minus,
    Shield,
    Target,
    TrendingDown,
    TrendingUp,
    X,
} from 'lucide-react';
import { GoalVisualizer } from '../components/features/GoalVisualizer';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useTeamMatches, type Match } from '../hooks/useTeamMatches';
import { useTeams } from '../hooks/useTeams';
import {
    formatDateLabel,
    formatMatchTimeLabel,
    getShootingPercentage,
    resolveMatchTeamSide,
    createEmptyTeamState,
    buildStoredMatchDocument,
    normalizeTeamNameKey,
    type MatchEvent,
    type StoredTeamStats,
} from '../lib/matchData';
import { parseScheduleText } from '../lib/icalParser';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/features/useAuth';


type ViewMode = 'general' | 'goalkeeper';
type CourtZoneKey = '6m' | '9m' | 'Kant';

interface CombinedShotData {
    courtX: number;
    courtY: number;
    goalX: number;
    goalY: number;
    result: 'goal' | 'save' | 'miss';
}

interface TrendCardProps {
    label: string;
    value: number;
    helper?: string;
    trendIcon: JSX.Element;
    accentClassName: string;
}

function TrendCard({ label, value, helper, trendIcon, accentClassName }: TrendCardProps) {
    return (
        <div className="rounded-3xl border border-white/10 bg-card/80 p-6 shadow-xl">
            <div className={`h-1 w-16 rounded-full ${accentClassName}`} />
            <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="mt-2 text-4xl font-black text-white">{value}</p>
                    {helper ? <p className="mt-3 text-xs text-gray-500">{helper}</p> : null}
                </div>
                <div className="rounded-2xl bg-white/5 p-3">{trendIcon}</div>
            </div>
        </div>
    );
}

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: { id: string; name: string; aliases?: string[] };
}

function ImportScheduleModal({ isOpen, onClose, team }: ImportModalProps) {
    const [pastedText, setPastedText] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const [importedCount, setImportedCount] = useState(0);
    const [showGuide, setShowGuide] = useState(true);
    const { currentUser } = useAuth();

    if (!isOpen) return null;

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pastedText.trim() || !currentUser) return;

        setStatus('loading');
        setErrorMsg('');

        try {
            const parsedMatches = parseScheduleText(pastedText);

            if (parsedMatches.length === 0) {
                setStatus('error');
                setErrorMsg('Fant ingen kamper i teksten du limte inn. Sørg for at du har kopiert hele terminliste-tabellen fra handball.no (inkludert datoer og lagnavn).');
                return;
            }

            const teamLookupNames = new Set([
                normalizeTeamNameKey(team.name),
                ...(team.aliases || []).map(normalizeTeamNameKey)
            ]);

            const promises = parsedMatches.map(async (pm) => {
                const normHome = normalizeTeamNameKey(pm.homeTeam);
                const isHome = teamLookupNames.has(normHome);

                const matchDoc = buildStoredMatchDocument({
                    name: `${pm.homeTeam} - ${pm.awayTeam}`,
                    date: pm.date ? new Date(pm.date) : new Date(),
                    savedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    matchTime: 0,
                    period: 1,
                    periodLabel: '1. OMG',
                    homeTeam: { id: isHome ? team.id : null, name: pm.homeTeam },
                    awayTeam: { id: !isHome ? team.id : null, name: pm.awayTeam },
                    homeState: createEmptyTeamState(),
                    awayState: createEmptyTeamState(),
                    history: [],
                    customDefinitions: []
                });

                matchDoc.status = 'saved';

                await addDoc(collection(db, 'users', currentUser.uid, 'matches'), matchDoc);
            });

            await Promise.all(promises);
            setImportedCount(parsedMatches.length);
            setStatus('success');

        } catch (err: unknown) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : 'Klarte ikke importere terminlisten.');
        }
    };

    const detectedCount = (() => {
        try {
            if (!pastedText.trim()) return 0;
            return parseScheduleText(pastedText).length;
        } catch {
            return 0;
        }
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gray-900 p-6 shadow-2xl sm:p-8">
                <button
                    onClick={onClose}
                    className="absolute right-6 top-6 z-10 text-gray-400 transition hover:text-white"
                >
                    <X size={24} />
                </button>

                {status === 'success' ? (
                    <div className="flex flex-col items-center py-6 text-center">
                        <div className="mb-5 inline-flex rounded-full bg-green-500/20 p-4">
                            <CheckCircle2 size={48} className="text-green-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white">Import fullført!</h3>
                        <p className="mt-3 text-gray-400">
                            {importedCount} kamper ble importert og lagt til i listen din.
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                            Kampene ligger nå klare. Du kan starte live-registrering, eller legge inn resultat i ettertid.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-8 w-full rounded-2xl bg-white/10 px-6 py-4 font-bold text-white transition hover:bg-white/20"
                        >
                            Flott, lukk vinduet
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-2xl font-black text-white">Importer Terminliste</h2>
                        <p className="mt-2 text-sm leading-relaxed text-gray-400">
                            Kopier terminlisten fra lagets side på <span className="font-semibold text-gray-300">handball.no</span> og lim den inn her. Vi leser automatisk ut alle kampene.
                        </p>

                        {/* Steg-for-steg guide */}
                        <button
                            type="button"
                            onClick={() => setShowGuide(!showGuide)}
                            className="mt-4 flex w-full items-center gap-2 text-left text-sm font-semibold text-primary transition hover:text-white"
                        >
                            <ChevronRight size={16} className={`transition-transform ${showGuide ? 'rotate-90' : ''}`} />
                            {showGuide ? 'Skjul veiledning' : 'Slik gjør du det (vis veiledning)'}
                        </button>

                        {showGuide && (
                            <div className="mt-3 space-y-4 rounded-2xl border border-white/5 bg-white/5 p-5">
                                <div className="flex gap-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-black">1</div>
                                    <div>
                                        <p className="font-bold text-white">Gå til handball.no</p>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Åpne <a href="https://www.handball.no/system/kamper/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-white">Kampsøk på handball.no</a> i en ny fane.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-black">2</div>
                                    <div>
                                        <p className="font-bold text-white">Søk opp klubben din</p>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Skriv inn klubbnavnet (f.eks. «{team.name.split(' ')[0] || 'Bjarg'}») i søkefeltet og trykk Søk.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-black">3</div>
                                    <div>
                                        <p className="font-bold text-white">Åpne «Terminliste»</p>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Klikk på <span className="font-semibold text-gray-300">«Terminliste»</span>-overskriften for å vise alle kampene i en tabell.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-black">4</div>
                                    <div>
                                        <p className="font-bold text-white">Marker og kopier tabellen</p>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Marker alle radene i terminliste-tabellen (fra første dato til siste kamp). Bruk <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-gray-300">Ctrl+C</span> for å kopiere.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-black">5</div>
                                    <div>
                                        <p className="font-bold text-white">Lim inn og importer</p>
                                        <p className="mt-1 text-sm text-gray-400">
                                            Klikk i tekstfeltet under og lim inn med <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-gray-300">Ctrl+V</span>. Trykk deretter «Importer kamper».
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleImport} className="mt-6 flex flex-col gap-4">
                            <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                                    Lim inn terminlisten her
                                </label>
                                <textarea
                                    value={pastedText}
                                    onChange={(e) => setPastedText(e.target.value)}
                                    placeholder={"06.09.25 13:30\t95041615001\tOppsal Arena 1\tLarvik Turn\tBjarg\t17-25\n06.09.25 19:00\t95041615005\tOppsal Arena 1\tBjarg\tOppsal\t20-18\n..."}
                                    rows={6}
                                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-4 font-mono text-sm text-white placeholder-gray-600 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    required
                                />
                                {pastedText.trim() && (
                                    <p className={`mt-2 text-xs font-semibold ${detectedCount > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {detectedCount > 0
                                            ? `✓ ${detectedCount} kamper gjenkjent i teksten`
                                            : '⚠ Ingen kamper gjenkjent ennå. Sørg for at teksten inneholder datoer (f.eks. 06.09.25 13:30).'}
                                    </p>
                                )}
                            </div>

                            {status === 'error' && (
                                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                                    {errorMsg}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading' || detectedCount === 0}
                                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-black transition hover:bg-white disabled:opacity-50"
                            >
                                {status === 'loading' ? (
                                    'Importerer kamper...'
                                ) : (
                                    <>
                                        <ClipboardPaste size={18} />
                                        Importer {detectedCount > 0 ? `${detectedCount} kamper` : 'kamper'}
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export function TeamDetails() {
    const { teamId } = useParams<{ teamId: string }>();
    const { teams, loading: teamsLoading, error: teamsError } = useTeams();
    const [viewMode, setViewMode] = useState<ViewMode>('general');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const team = teams.find((entry) => entry.id === teamId);
    const { matches, loading: matchesLoading, error: matchesError } = useTeamMatches({
        id: team?.id,
        name: team?.name,
        aliases: team?.aliases,
    });

    if (teamsLoading || matchesLoading) {
        return (
            <LoadingState
                title="Laster lagoversikt"
                message="Vi samler laginformasjon og kampdata for denne siden."
            />
        );
    }

    if (!team) {
        return (
            <EmptyState
                icon={AlertTriangle}
                title="Fant ikke laget"
                description="Laget du prøvde å åpne finnes ikke lenger, eller du mangler tilgang til det."
                action={
                    <Link
                        to="/teams"
                        className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-white"
                    >
                        Tilbake til lagoversikt
                    </Link>
                }
            />
        );
    }

    const getTeamStats = (match: Match): StoredTeamStats => {
        const side = resolveMatchTeamSide(match, {
            id: team.id,
            name: team.name,
            aliases: team.aliases,
        }) ?? 'home';

        return side === 'home' ? match.detailedStats.home : match.detailedStats.away;
    };

    const getOpponentStats = (match: Match): StoredTeamStats => {
        const side = resolveMatchTeamSide(match, {
            id: team.id,
            name: team.name,
            aliases: team.aliases,
        }) ?? 'home';

        return side === 'home' ? match.detailedStats.away : match.detailedStats.home;
    };

    const latestMatch = matches[0];
    const previousMatches = matches.slice(1);

    const calculateAverageStats = (matchesList: Match[]) => {
        if (matchesList.length === 0) {
            return null;
        }

        const total = matchesList.reduce(
            (acc, match) => {
                const stats = getTeamStats(match);

                return {
                    goal: acc.goal + (stats.goal || 0),
                    miss: acc.miss + (stats.miss || 0),
                    tech: acc.tech + (stats.tech || 0),
                };
            },
            { goal: 0, miss: 0, tech: 0 },
        );

        return {
            goal: total.goal / matchesList.length,
            miss: total.miss / matchesList.length,
            tech: total.tech / matchesList.length,
        };
    };

    const previousAvg = calculateAverageStats(previousMatches);
    const seasonAvg = calculateAverageStats(matches);
    const latestStats = latestMatch ? getTeamStats(latestMatch) : null;

    const trendData = matches
        .slice(0, 5)
        .reverse()
        .map((match) => ({
            id: match.id,
            matchName: match.name,
            percentage: getShootingPercentage(getTeamStats(match)),
        }));

    const renderTrend = (current: number, previousAverage: number | null | undefined, invertGood = false) => {
        if (previousAverage === null || previousAverage === undefined) {
            return <Minus className="text-gray-500" size={20} />;
        }

        const diff = current - previousAverage;
        if (Math.abs(diff) < 0.1) {
            return <Minus className="text-gray-500" size={20} />;
        }

        const isGood = invertGood ? diff < 0 : diff > 0;
        return isGood ? <TrendingUp className="text-green-500" size={20} /> : <TrendingDown className="text-red-500" size={20} />;
    };

    const toCombinedShotData = (event: MatchEvent): CombinedShotData | null => {
        if (event.type !== 'combinedShot' || !event.data) {
            return null;
        }

        const courtX = typeof event.data.courtX === 'number' ? event.data.courtX : null;
        const courtY = typeof event.data.courtY === 'number' ? event.data.courtY : null;
        const goalX = typeof event.data.goalX === 'number' ? event.data.goalX : null;
        const goalY = typeof event.data.goalY === 'number' ? event.data.goalY : null;
        const result = event.data.result;

        if (
            courtX === null ||
            courtY === null ||
            goalX === null ||
            goalY === null ||
            (result !== 'goal' && result !== 'save' && result !== 'miss')
        ) {
            return null;
        }

        return { courtX, courtY, goalX, goalY, result };
    };

    const opponentShots = matches.flatMap((match) => {
        return getOpponentStats(match).history
            .map((event) => toCombinedShotData(event))
            .filter((item): item is CombinedShotData => item !== null);
    });

    const getCourtZone = (x: number, y: number): CourtZoneKey => {
        if (x < 15 || x > 85) {
            return 'Kant';
        }

        if (y < 45) {
            return '6m';
        }

        return '9m';
    };

    const getGoalZone = (x: number, y: number) => {
        const col = x < 33.3 ? 0 : x < 66.6 ? 1 : 2;
        const row = y < 33.3 ? 0 : y < 66.6 ? 1 : 2;
        return { col, row };
    };

    const calculateHeatmapData = () => {
        const zones: Record<string, { saves: number; total: number }> = {};

        for (let row = 0; row < 3; row += 1) {
            for (let col = 0; col < 3; col += 1) {
                zones[`${col}-${row}`] = { saves: 0, total: 0 };
            }
        }

        opponentShots.forEach((shot) => {
            if (shot.result !== 'goal' && shot.result !== 'save') {
                return;
            }

            const { col, row } = getGoalZone(shot.goalX, shot.goalY);
            const key = `${col}-${row}`;
            zones[key].total += 1;

            if (shot.result === 'save') {
                zones[key].saves += 1;
            }
        });

        return Object.entries(zones).map(([key, data]) => {
            const [zoneX, zoneY] = key.split('-').map(Number);
            return {
                zoneX,
                zoneY,
                savePercentage: data.total > 0 ? Math.round((data.saves / data.total) * 100) : 0,
            };
        });
    };

    const calculateCourtZoneStats = () => {
        const courtZones: Record<CourtZoneKey, { saves: number; total: number }> = {
            '6m': { saves: 0, total: 0 },
            '9m': { saves: 0, total: 0 },
            Kant: { saves: 0, total: 0 },
        };

        opponentShots.forEach((shot) => {
            if (shot.result !== 'goal' && shot.result !== 'save') {
                return;
            }

            const zone = getCourtZone(shot.courtX, shot.courtY);
            courtZones[zone].total += 1;

            if (shot.result === 'save') {
                courtZones[zone].saves += 1;
            }
        });

        return [
            { name: '6 meter', data: courtZones['6m'] },
            { name: '9 meter', data: courtZones['9m'] },
            { name: 'Kant', data: courtZones.Kant },
        ];
    };

    const heatmapData = calculateHeatmapData();
    const courtZoneStats = calculateCourtZoneStats();
    const hasGoalkeeperData = opponentShots.length > 0;

    return (
        <div className="space-y-8">
            <section className="rounded-[2rem] border border-white/10 bg-card/85 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex items-start gap-4">
                        <Link
                            to="/teams"
                            className="mt-1 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-primary/40 hover:bg-white/10"
                            aria-label="Tilbake til lag"
                        >
                            <ArrowLeft size={20} />
                        </Link>

                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                                {team.name}
                            </h1>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                            <p className="text-sm text-gray-400">Registrerte kamper</p>
                            <p className="mt-2 text-3xl font-black text-white">{matches.length}</p>
                        </div>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="flex flex-col justify-center rounded-3xl border border-white/10 bg-black/20 p-5 text-left text-white transition hover:border-gray-500 hover:bg-white/5"
                        >
                            <p className="text-sm text-gray-400">Verktøy</p>
                            <div className="mt-2 flex items-center justify-between">
                                <span className="text-lg font-bold">Importer Terminliste</span>
                                <CalendarPlus className="text-gray-400" size={20} />
                            </div>
                        </button>
                        <Link
                            to="/stats"
                            className="flex items-center justify-between rounded-3xl border border-primary/30 bg-primary/10 p-5 text-white transition hover:border-primary hover:bg-primary/15 lg:col-start-3"
                        >
                            <div>
                                <p className="text-sm text-primary">Neste steg</p>
                                <p className="mt-2 text-lg font-bold">Start ny kamp</p>
                            </div>
                            <ArrowRight className="text-primary" />
                        </Link>
                    </div>
                </div>
            </section>

            <ImportScheduleModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                team={team}
            />

            {(teamsError || matchesError) ? (
                <div className="flex items-start gap-3 rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                    <span>{teamsError || matchesError}</span>
                </div>
            ) : null}

            <div className="flex justify-center">
                <div className="inline-flex rounded-2xl border border-white/10 bg-black/20 p-1 shadow-lg">
                    <button
                        onClick={() => setViewMode('general')}
                        className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${viewMode === 'general' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Activity size={16} />
                        Generelt
                    </button>
                    <button
                        onClick={() => setViewMode('goalkeeper')}
                        className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition ${viewMode === 'goalkeeper' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Shield size={16} />
                        Målvakt
                    </button>
                </div>
            </div>

            {viewMode === 'general' ? (
                <>
                    {latestStats ? (
                        <>
                            <section className="space-y-5">
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-secondary/80">
                                            Siste kamp
                                        </p>
                                        <h2 className="mt-2 text-3xl font-black text-white">
                                            {latestMatch?.name || 'Siste registrerte kamp'}
                                        </h2>
                                    </div>
                                    <p className="text-sm text-gray-400">
                                        {latestMatch ? `${formatDateLabel(latestMatch.date)} · ${latestMatch.periodLabel} · ${formatMatchTimeLabel(latestMatch.matchTime)}` : ''}
                                    </p>
                                </div>

                                <div className="grid gap-5 md:grid-cols-3">
                                    <TrendCard
                                        label="Mål"
                                        value={latestStats.goal || 0}
                                        helper={
                                            previousAvg
                                                ? `Snitt tidligere: ${previousAvg.goal.toFixed(1)}`
                                                : 'Ingen tidligere snitt å sammenligne med ennå.'
                                        }
                                        trendIcon={renderTrend(latestStats.goal || 0, previousAvg?.goal, false)}
                                        accentClassName="bg-green-500"
                                    />
                                    <TrendCard
                                        label="Skuddbom"
                                        value={latestStats.miss || 0}
                                        helper={
                                            previousAvg
                                                ? `Snitt tidligere: ${previousAvg.miss.toFixed(1)}`
                                                : 'Ingen tidligere snitt å sammenligne med ennå.'
                                        }
                                        trendIcon={renderTrend(latestStats.miss || 0, previousAvg?.miss, true)}
                                        accentClassName="bg-red-500"
                                    />
                                    <TrendCard
                                        label="Tekniske feil"
                                        value={latestStats.tech || 0}
                                        helper={
                                            seasonAvg
                                                ? `Sesongsnitt: ${seasonAvg.tech.toFixed(1)}`
                                                : 'Ingen sesongsnitt å vise ennå.'
                                        }
                                        trendIcon={renderTrend(latestStats.tech || 0, seasonAvg?.tech, true)}
                                        accentClassName="bg-yellow-500"
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Resultat</p>
                                        <p className="mt-3 text-3xl font-black text-white">{latestMatch?.homeScore || 0} - {latestMatch?.awayScore || 0}</p>
                                    </div>
                                    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Registreringer</p>
                                        <p className="mt-3 text-3xl font-black text-white">{latestMatch?.historyCount || 0}</p>
                                    </div>
                                    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Kampklokke</p>
                                        <p className="mt-3 text-3xl font-black text-white">{latestMatch ? formatMatchTimeLabel(latestMatch.matchTime) : '00:00'}</p>
                                    </div>
                                </div>
                            </section>

                            {trendData.length > 1 ? (
                                <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-xl md:p-8">
                                    <div className="flex items-center gap-3">
                                        <Target className="text-primary" size={20} />
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">
                                                Uttellingsprosent, siste fem kamper
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex h-48 items-end gap-4">
                                        {trendData.map((item) => (
                                            <div key={item.id} className="group flex h-full flex-1 flex-col items-center justify-end">
                                                <span className="mb-3 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                                                    {item.percentage}%
                                                </span>
                                                <div
                                                    className="w-full rounded-t-lg bg-primary/70 transition group-hover:bg-primary"
                                                    style={{ height: `${Math.max(item.percentage, 4)}%` }}
                                                />
                                                <span
                                                    className="mt-3 w-full truncate text-center text-xs text-gray-500"
                                                    title={item.matchName}
                                                >
                                                    {item.matchName}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ) : null}
                        </>
                    ) : (
                        <EmptyState
                            icon={ClipboardList}
                            title="Ingen kampdata ennå"
                            description="Når du har lagret en kamp for dette laget, vises siste kamp, trender og historikk her."
                            action={
                                <Link
                                    to="/stats"
                                    className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-white"
                                >
                                    Start første kamp
                                </Link>
                            }
                        />
                    )}
                </>
            ) : (
                <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-xl md:p-8">
                    <div className="mb-6 flex items-center gap-3">
                        <Shield className="text-blue-400" size={22} />
                        <div>
                            <h2 className="text-2xl font-bold text-white">Målvaktsanalyse</h2>
                        </div>
                    </div>

                    {hasGoalkeeperData ? (
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="rounded-3xl border border-white/10 bg-card/70 p-6">
                                <h3 className="text-center font-bold text-gray-300">Heatmap i mål</h3>
                                <div className="mt-6">
                                    <GoalVisualizer
                                        saves={[]}
                                        teamName={team.name}
                                        type="heatmap"
                                        heatmapData={heatmapData}
                                        title=""
                                    />
                                </div>
                                <p className="mt-4 text-center text-xs text-gray-500">
                                    Prosenten viser redninger i sonen sett opp mot totale skudd i samme område.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-card/70 p-6">
                                <h3 className="font-bold text-gray-300">Redningsprosent per skuddposisjon</h3>
                                <div className="mt-6 space-y-5">
                                    {courtZoneStats.map((zone) => {
                                        const percentage =
                                            zone.data.total > 0
                                                ? Math.round((zone.data.saves / zone.data.total) * 100)
                                                : 0;

                                        return (
                                            <div key={zone.name}>
                                                <div className="flex items-end justify-between gap-3">
                                                    <span className="font-bold text-white">{zone.name}</span>
                                                    <span className="text-2xl font-black text-white">{percentage}%</span>
                                                </div>
                                                <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                                                    <div
                                                        className="h-full rounded-full bg-blue-500"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <p className="mt-2 text-right text-xs text-gray-500">
                                                    {zone.data.saves} redninger av {zone.data.total} skudd
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            icon={Shield}
                            title="Ingen målvaktsdata ennå"
                            description="Denne visningen blir nyttig når kampene inneholder registrerte skuddplasseringer og resultater mot mål."
                            action={
                                <Link
                                    to="/stats"
                                    className="rounded-full bg-blue-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-400"
                                >
                                    Registrer kamp med skudddata
                                </Link>
                            }
                        />
                    )}
                </section>
            )}

            <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-xl md:p-8">
                <div className="mb-6 flex items-center gap-3">
                    <ClipboardList className="text-primary" size={20} />
                    <div>
                        <h2 className="text-2xl font-bold text-white">Tidligere kamper</h2>
                    </div>
                </div>

                {matches.length === 0 ? (
                    <EmptyState
                        icon={ClipboardList}
                        title="Ingen kamper lagret ennå"
                        description="Når du lagrer første kamp for dette laget, dukker historikken opp her med resultat og dato."
                    />
                ) : (
                    <div className="space-y-4">
                        {matches.map((match) => (
                            <article
                                key={match.id}
                                className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-card/70 p-5 md:flex-row md:items-center md:justify-between"
                            >
                                <div>
                                    <h3 className="text-xl font-bold text-white">{match.name}</h3>
                                    <p className="mt-2 text-sm text-gray-400">
                                        {formatDateLabel(match.date)} · {match.homeTeam} vs {match.awayTeam}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {match.periodLabel} · {formatMatchTimeLabel(match.matchTime)} · {match.historyCount} registreringer
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-3 text-2xl font-black tracking-widest text-white">
                                    {match.status === 'saved' && match.historyCount === 0 ? (
                                        <span className="text-gray-500 text-lg">VS</span>
                                    ) : (
                                        `${match.homeScore} - ${match.awayScore}`
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
