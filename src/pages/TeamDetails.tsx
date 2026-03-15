import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTeams } from '../hooks/useTeams';
import { useTeamMatches, Match, MatchStat } from '../hooks/useTeamMatches';
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Minus, Shield, Activity } from 'lucide-react';
import { GoalVisualizer } from '../components/features/GoalVisualizer';

export function TeamDetails() {
    const { teamId } = useParams<{ teamId: string }>();
    const { teams, loading: teamsLoading } = useTeams();
    const [viewMode, setViewMode] = useState<'general' | 'goalkeeper'>('general');

    const team = teams.find(t => t.id === teamId);
    const { matches, loading: matchesLoading } = useTeamMatches(team?.name);

    if (teamsLoading || matchesLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-primary" size={48} />
            </div>
        );
    }

    if (!team) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold mb-4">Fant ikke laget</h2>
                <Link to="/teams" className="text-primary hover:underline">Tilbake til Mine Lag</Link>
            </div>
        );
    }

    // Helper to extract team stats from a match
    const getTeamStats = (match: Match): MatchStat => {
        return match.homeTeam === team.name ? match.detailedStats.home : match.detailedStats.away;
    }

    // Calculate quick stats (comparing the latest match vs the average of previous matches)
    const latestMatch = matches[0];
    const previousMatches = matches.slice(1);

    const calculateAverageStats = (matchesList: Match[]) => {
        if (matchesList.length === 0) return null;
        const total = matchesList.reduce((acc, m) => {
            const stats = getTeamStats(m);
            return {
                goal: acc.goal + (stats.goal || 0),
                miss: acc.miss + (stats.miss || 0),
                tech: acc.tech + (stats.tech || 0),
            };
        }, { goal: 0, miss: 0, tech: 0 });

        return {
            goal: total.goal / matchesList.length,
            miss: total.miss / matchesList.length,
            tech: total.tech / matchesList.length,
        };
    };

    const previousAvg = calculateAverageStats(previousMatches);
    const seasonAvg = calculateAverageStats(matches);
    const latestStats = latestMatch ? getTeamStats(latestMatch) : null;

    // Trend data for the last 5 matches
    const last5Matches = matches.slice(0, 5).reverse();
    const trendData = last5Matches.map(m => {
        const stats = getTeamStats(m);
        const goals = stats.goal || 0;
        const misses = stats.miss || 0;
        const totalShots = goals + misses;
        const percentage = totalShots > 0 ? Math.round((goals / totalShots) * 100) : 0;

        return {
            matchName: m.name,
            percentage
        };
    });

    const renderTrend = (current: number, previousAvg: number | null | undefined, invertGood: boolean = false) => {
        if (previousAvg === null || previousAvg === undefined) return <Minus className="text-gray-500" size={20} />;

        const diff = current - previousAvg;
        if (Math.abs(diff) < 0.1) return <Minus className="text-gray-500" size={20} />;

        const isGood = invertGood ? diff < 0 : diff > 0;
        return isGood ? <TrendingUp className="text-green-500" size={20} /> : <TrendingDown className="text-red-500" size={20} />;
    }

    // --- GOALKEEPER FOCUS LOGIC ---
    // Get all shots against this team
    const opponentShots = matches.flatMap(m => {
        const side = m.homeTeam === team?.name ? 'home' : 'away';
        const opponentSide = side === 'home' ? 'away' : 'home';
        const opponentStatsObject = opponentSide === 'home' ? m.detailedStats.home : m.detailedStats.away;

        return opponentStatsObject.history?.filter(h => h.type === 'combinedShot' && h.data) || [];
    });

    // Helper to get court zone
    const getCourtZone = (x: number, y: number) => {
        // Court visualizer has x: 0-100, y: 0-100
        // Top of court is y=0 (goal area). 9m line is roughly around y=65 in our court visualizer, but let's base it on typical bounds
        // In CourtVisualizer, goal is at top. 6m is around y=40, 9m is around y=65.
        // Let's make an approximation:
        if (x < 15 || x > 85) return 'Kant';
        if (y < 45) return '6m';
        return '9m';
    };

    // Helper to get goal zone (3x3 grid)
    const getGoalZone = (x: number, y: number) => {
        const col = x < 33.3 ? 0 : x < 66.6 ? 1 : 2;
        const row = y < 33.3 ? 0 : y < 66.6 ? 1 : 2;
        return { col, row };
    };

    const calculateHeatmapData = () => {
        const zones: Record<string, { saves: number, total: number }> = {};
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                zones[`${c}-${r}`] = { saves: 0, total: 0 };
            }
        }

        opponentShots.forEach(shot => {
            if (!shot.data) return;
            const { goalX, goalY, result } = shot.data;
            if (result !== 'goal' && result !== 'save') return;

            const { col, row } = getGoalZone(goalX, goalY);
            const key = `${col}-${row}`;
            if (zones[key]) {
                zones[key].total++;
                if (result === 'save') zones[key].saves++;
            }
        });

        return Object.entries(zones).map(([key, data]) => {
            const [zoneX, zoneY] = key.split('-').map(Number);
            return {
                zoneX,
                zoneY,
                savePercentage: data.total > 0 ? Math.round((data.saves / data.total) * 100) : 0
            };
        });
    };

    const calculateCourtZoneStats = () => {
        const courtZones = {
            '6m': { saves: 0, total: 0 },
            '9m': { saves: 0, total: 0 },
            'Kant': { saves: 0, total: 0 }
        };

        opponentShots.forEach(shot => {
            if (!shot.data) return;
            const { courtX, courtY, result } = shot.data;
            if (result !== 'goal' && result !== 'save') return;

            const zone = getCourtZone(courtX, courtY);
            // @ts-ignore
            if (courtZones[zone]) {
                // @ts-ignore
                courtZones[zone].total++;
                // @ts-ignore
                if (result === 'save') courtZones[zone].saves++;
            }
        });

        return [
            { name: '6 meter', data: courtZones['6m'] },
            { name: '9 meter', data: courtZones['9m'] },
            { name: 'Kant', data: courtZones['Kant'] }
        ];
    };

    const heatmapData = calculateHeatmapData();
    const courtZoneStats = calculateCourtZoneStats();
    // --- END GOALKEEPER LOGIC ---

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8 flex items-center gap-4">
                <Link to="/teams" className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                    {team.name}
                </h1>
            </div>

            <div className="flex justify-center mb-8 bg-black/20 p-1 rounded-xl w-fit mx-auto border border-white/5">
                <button
                    onClick={() => setViewMode('general')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'general' ? 'bg-primary text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Activity size={16} /> Generelt
                </button>
                <button
                    onClick={() => setViewMode('goalkeeper')}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'goalkeeper' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Shield size={16} /> Målvakts-fokus
                </button>
            </div>

            {viewMode === 'general' ? (
                <>
                    {/* Quick Menu / Dashboard */}
                    {latestStats ? (
                        <>
                            <div className="mb-12">
                                <h2 className="text-xl font-bold mb-4 text-gray-300 uppercase tracking-widest">Siste Kamp Form ({latestMatch?.name})</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-card border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-green-500/5 group-hover:bg-green-500/10 transition-colors" />
                                        <div className="relative z-10 flex flex-col items-center">
                                            <span className="text-sm text-gray-400 mb-1">Mål</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl font-black text-white">{latestStats.goal || 0}</span>
                                                {renderTrend(latestStats.goal || 0, previousAvg?.goal, false)}
                                            </div>
                                            {previousAvg && <span className="text-xs text-gray-500 mt-2">Snitt før: {previousAvg.goal.toFixed(1)}</span>}
                                        </div>
                                    </div>

                                    <div className="bg-card border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
                                        <div className="relative z-10 flex flex-col items-center">
                                            <span className="text-sm text-gray-400 mb-1">Skuddbom</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl font-black text-white">{latestStats.miss || 0}</span>
                                                {renderTrend(latestStats.miss || 0, previousAvg?.miss, true)}
                                            </div>
                                            {previousAvg && <span className="text-xs text-gray-500 mt-2">Snitt før: {previousAvg.miss.toFixed(1)}</span>}
                                        </div>
                                    </div>

                                    <div className="bg-card border border-white/5 p-6 rounded-2xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors" />
                                        <div className="relative z-10 flex flex-col items-center">
                                            <span className="text-sm text-gray-400 mb-1">Tekniske Feil</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-4xl font-black text-white">{latestStats.tech || 0}</span>
                                                {renderTrend(latestStats.tech || 0, seasonAvg?.tech, true)}
                                            </div>
                                            {seasonAvg && <span className="text-xs text-gray-500 mt-2">Sesongsnitt: {seasonAvg.tech.toFixed(1)}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Trend Analysis */}
                            {trendData.length > 1 && (
                                <div className="mb-12">
                                    <h2 className="text-xl font-bold mb-4 text-gray-300 uppercase tracking-widest">Trend: Uttellingsprosent (Siste 5 kamper)</h2>
                                    <div className="bg-card border border-white/5 p-6 rounded-2xl relative overflow-hidden">
                                        <div className="h-40 flex items-end gap-4 mt-6">
                                            {trendData.map((data, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                                                    <span className="text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 whitespace-nowrap z-20">
                                                        {data.percentage}%
                                                    </span>
                                                    <div
                                                        className="w-full bg-primary/60 group-hover:bg-primary transition-colors rounded-t-sm z-10"
                                                        style={{ height: `${data.percentage}%`, minHeight: '4px' }}
                                                    />
                                                    <span className="text-[10px] text-gray-500 truncate w-full text-center mt-2 px-1" title={data.matchName}>
                                                        {data.matchName.substring(0, 8)}{data.matchName.length > 8 ? '...' : ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-12 text-center text-gray-400">
                            Ingen kampdata registrert enda for dette laget. Gå til Statestikk for å registrere en kamp.
                        </div>
                    )}
                </>
            ) : (
                <div className="mb-12">
                    <h2 className="text-xl font-bold mb-4 text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <Shield size={24} /> Målvaktsanalyse (Sesong)
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card border border-white/5 p-6 rounded-2xl">
                            <h3 className="text-center font-bold mb-6 text-gray-300">Heatmap (Svarsprosent i Mål)</h3>
                            <GoalVisualizer
                                saves={[]}
                                teamName={team.name}
                                type="heatmap"
                                heatmapData={heatmapData}
                                title=""
                            />
                            <p className="text-xs text-center text-gray-500 mt-4">Prosentandelen viser redninger per totale skudd i hver sone.</p>
                        </div>

                        <div className="bg-card border border-white/5 p-6 rounded-2xl flex flex-col">
                            <h3 className="text-center font-bold mb-6 text-gray-300">Redningsprosent per Skuddposisjon</h3>

                            <div className="flex-1 flex flex-col justify-center gap-4">
                                {courtZoneStats.map(zone => {
                                    const percentage = zone.data.total > 0 ? Math.round((zone.data.saves / zone.data.total) * 100) : 0;
                                    return (
                                        <div key={zone.name} className="flex flex-col gap-2">
                                            <div className="flex justify-between items-end">
                                                <span className="font-bold">{zone.name}</span>
                                                <span className="text-2xl font-black">{percentage}%</span>
                                            </div>
                                            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-gray-500 text-right">{zone.data.saves} redninger / {zone.data.total} skudd</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Match History */}
            <div>
                <h2 className="text-xl font-bold mb-4 text-gray-300 uppercase tracking-widest">Tidligere Kamper</h2>
                <div className="space-y-4">
                    {matches.map(match => (
                        <div key={match.id} className="bg-card border border-white/5 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="text-center md:text-left">
                                <h3 className="font-bold text-lg">{match.name}</h3>
                                <p className="text-xs text-gray-500">
                                    {match.date ? new Date(match.date?.seconds * 1000).toLocaleDateString() : 'Ukjent dato'} • {match.homeTeam} vs {match.awayTeam}
                                </p>
                            </div>
                            <div className="text-2xl font-black tracking-widest bg-black px-4 py-2 rounded-lg border border-white/10">
                                {match.homeScore} - {match.awayScore}
                            </div>
                        </div>
                    ))}
                    {matches.length === 0 && (
                        <p className="text-gray-500">Ingen kamper spilt enda.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

