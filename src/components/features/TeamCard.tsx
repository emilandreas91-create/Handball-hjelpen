import { Trash2, Users } from 'lucide-react';
import { Team } from '../../hooks/useTeams';

interface TeamCardProps {
    team: Team;
    onDelete: (id: string) => void;
}

export function TeamCard({ team, onDelete }: TeamCardProps) {
    return (
        <div className="bg-card border border-white/5 rounded-xl p-6 hover:border-primary/50 transition-all group relative overflow-hidden">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-full text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                        <Users size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{team.name}</h3>
                        <p className="text-xs text-gray-500">Opprettet: {new Date(team.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(team.id); }}
                    className="p-2 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Slett lag"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
    );
}
