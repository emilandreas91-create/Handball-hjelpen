import { useState } from 'react';
import { useTeams } from '../hooks/useTeams';
import { TeamCard } from '../components/features/TeamCard';
import { Plus, Loader2 } from 'lucide-react';

export function Teams() {
    const { teams, loading, error, addTeam, deleteTeam } = useTeams();
    const [newTeamName, setNewTeamName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;

        try {
            setIsAdding(true);
            await addTeam(newTeamName);
            setNewTeamName('');
        } catch (err) {
            alert('Feil ved lagring av lag');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Er du sikker på at du vil slette dette laget?')) {
            await deleteTeam(id);
        }
    }



    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
                    Mine Lag
                </h1>
            </div>

            {/* Add Team Form */}
            <div className="mb-12">
                <form onSubmit={handleSubmit} className="flex gap-4 max-w-xl">
                    <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Navn på nytt lag..."
                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-6 py-4 text-white focus:outline-none focus:border-primary transition-all"
                    />
                    <button
                        type="submit"
                        disabled={!newTeamName.trim() || isAdding}
                        className="bg-primary hover:bg-primary/80 text-black font-bold px-8 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAdding ? <Loader2 className="animate-spin" /> : <Plus />}
                        Legg til
                    </button>
                </form>
            </div>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-20">
                        <Loader2 className="animate-spin text-primary" size={48} />
                    </div>
                ) : teams.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                        <p className="text-gray-500 text-xl">Ingen lag registrert enda.</p>
                    </div>
                ) : (
                    teams.map(team => (
                        <TeamCard key={team.id} team={team} onDelete={handleDelete} />
                    ))
                )}
            </div>
        </div>
    );
}
