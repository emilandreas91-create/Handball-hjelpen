import { useParams, Link } from 'react-router-dom';
import { useTeams } from '../hooks/useTeams';
import { useTeamMatches, Match, MatchStat } from '../hooks/useTeamMatches';
import { Loader2, ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function TeamDetails() {
    const { teamId } = useParams<{ teamId: string }>();
    const { teams, loading: teamsLoading } = useTeams();

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
    const latestStats = latestMatch ? getTeamStats(latestMatch) : null;

    const renderTrend = (current: number, previousAvg: number | null | undefined, invertGood: boolean = false) => {
        if (previousAvg === null || previousAvg === undefined) return <Minus className="text-gray-500" size={20} />;

        const diff = current - previousAvg;
        if (Math.abs(diff) < 0.1) return <Minus className="text-gray-500" size={20} />;

        const isGood = invertGood ? diff < 0 : diff > 0;
        return isGood ? <TrendingUp className="text-green-500" size={20} /> : <TrendingDown className="text-red-500" size={20} />;
    }

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

            {/* Quick Menu / Dashboard */}
            {latestStats ? (
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
                                    {renderTrend(latestStats.tech || 0, previousAvg?.tech, true)}
                                </div>
                                {previousAvg && <span className="text-xs text-gray-500 mt-2">Snitt før: {previousAvg.tech.toFixed(1)}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-12 text-center text-gray-400">
                    Ingen kampdata registrert enda for dette laget. Gå til Statestikk for å registrere en kamp.
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

