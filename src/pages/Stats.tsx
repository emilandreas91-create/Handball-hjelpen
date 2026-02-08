import { useState, useEffect } from 'react';
import { useMatch, TeamSide } from '../hooks/useMatch';
import { useTeams } from '../hooks/useTeams';
import { StatButton } from '../components/features/StatButton';
import { Play, Pause, Save as SaveIcon } from 'lucide-react';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/features/AuthProvider';
import { clsx } from 'clsx';

export function Stats() {
    const {
        matchTime, isRunning, periodLabel, homeState, awayState,
        toggleTimer, formatTime, updateStat, nextPeriod
    } = useMatch();

    const { teams } = useTeams();
    const { currentUser } = useAuth();

    const [activeSide, setActiveSide] = useState<TeamSide>('home');
    const [homeTeamId, setHomeTeamId] = useState('');
    const [awayTeamId, setAwayTeamId] = useState('');
    const [matchName, setMatchName] = useState('');

    // Auto-select first team if available
    useEffect(() => {
        if (teams.length > 0 && !homeTeamId) setHomeTeamId(teams[0].name);
    }, [teams]);

    const handleSaveMatch = async () => {
        const name = matchName || `Kamp ${new Date().toLocaleDateString()}`;
        if (!currentUser) return;

        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'matches'), {
                name,
                date: Timestamp.now(),
                homeTeam: homeTeamId || 'Hjemme',
                awayTeam: awayTeamId || 'Borte',
                homeScore: homeState.score,
                awayScore: awayState.score,
                period: periodLabel,
                detailedStats: {
                    home: homeState.stats,
                    away: awayState.stats
                }
            });
            alert('Kamp lagret!');
        } catch (e) {
            console.error(e);
            alert('Feil ved lagring');
        }
    };

    const activeState = activeSide === 'home' ? homeState : awayState;

    return (
        <div className="max-w-4xl mx-auto">
            {/* Scoreboard */}
            <div className="bg-card border border-white/10 rounded-3xl p-6 mb-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-white to-secondary" />

                <div className="flex justify-between items-center text-center">
                    {/* Home Team */}
                    <div
                        className={clsx("flex-1 p-4 rounded-xl transition-all cursor-pointer border-2",
                            activeSide === 'home' ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(0,243,255,0.2)]" : "border-transparent opacity-70 hover:opacity-100"
                        )}
                        onClick={() => setActiveSide('home')}
                    >
                        <select
                            className="bg-transparent text-xl font-bold uppercase text-center w-full focus:outline-none cursor-pointer"
                            value={homeTeamId}
                            onChange={(e) => setHomeTeamId(e.target.value)}
                        >
                            <option value="Hjemme">Hjemme</option>
                            {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                        <div className="text-7xl font-black mt-2 text-primary">{homeState.score}</div>
                    </div>

                    {/* Timer & Period */}
                    <div className="px-8 flex flex-col items-center gap-4">
                        <div
                            onClick={toggleTimer}
                            className="text-4xl font-mono font-bold bg-black px-6 py-2 rounded-lg border border-white/20 cursor-pointer hover:border-primary transition-colors select-none tabular-nums"
                        >
                            {formatTime(matchTime)}
                        </div>
                        <button
                            onClick={nextPeriod}
                            className="text-xs uppercase tracking-widest text-gray-400 hover:text-white border border-white/10 px-3 py-1 rounded"
                        >
                            {periodLabel}
                        </button>
                    </div>

                    {/* Away Team */}
                    <div
                        className={clsx("flex-1 p-4 rounded-xl transition-all cursor-pointer border-2",
                            activeSide === 'away' ? "border-secondary bg-secondary/10 shadow-[0_0_20px_rgba(255,102,0,0.2)]" : "border-transparent opacity-70 hover:opacity-100"
                        )}
                        onClick={() => setActiveSide('away')}
                    >
                        <select
                            className="bg-transparent text-xl font-bold uppercase text-center w-full focus:outline-none cursor-pointer"
                            value={awayTeamId}
                            onChange={(e) => setAwayTeamId(e.target.value)}
                        >
                            <option value="Borte">Borte</option>
                            {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                        </select>
                        <div className="text-7xl font-black mt-2 text-secondary">{awayState.score}</div>
                    </div>
                </div>
            </div>

            {/* Control Actions */}
            <div className="flex justify-center gap-4 mb-8">
                <button onClick={toggleTimer} className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    {isRunning ? <Pause /> : <Play />}
                </button>
                <div className="w-px bg-white/10 mx-2" />
                <button
                    onClick={() => { const n = prompt('Navn på kamp?'); if (n) setMatchName(n); }}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold uppercase tracking-wider text-sm transition-all"
                >
                    <SaveIcon size={18} /> Lagre (Navn)
                </button>
                {matchName && <button onClick={handleSaveMatch} className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded-lg font-bold">Lagre "{matchName}"</button>}
            </div>

            {/* Stat Grid */}
            <div className="grid grid-cols-2 gap-4 md:gap-6">
                <StatButton
                    type="goal"
                    label="Mål"
                    count={activeState.stats.goal}
                    onClick={() => updateStat(activeSide, 'goal')}
                    color="bg-gradient-to-br from-green-500 to-green-700"
                />
                <StatButton
                    type="miss"
                    label="Skuddbom"
                    count={activeState.stats.miss}
                    onClick={() => updateStat(activeSide, 'miss')}
                    color="bg-gradient-to-br from-red-500 to-red-700"
                />
                <StatButton
                    type="save"
                    label="Redning"
                    count={activeState.stats.save}
                    onClick={() => updateStat(activeSide, 'save')}
                    color="bg-gradient-to-br from-blue-500 to-blue-700"
                />
                <StatButton
                    type="tech"
                    label="Teknisk Feil"
                    count={activeState.stats.tech}
                    onClick={() => updateStat(activeSide, 'tech')}
                    color="bg-gradient-to-br from-yellow-500 to-yellow-700"
                />
            </div>

            <div className="mt-8 text-center text-gray-500 text-sm">
                Valgt lag: <span className={activeSide === 'home' ? "text-primary font-bold" : "text-secondary font-bold"}>
                    {activeSide === 'home' ? (homeTeamId || 'Hjemme') : (awayTeamId || 'Borte')}
                </span>
            </div>
        </div>
    );
}
