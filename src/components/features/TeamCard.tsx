import { Link } from 'react-router-dom';
import { ChevronRight, History, Trash2, Users } from 'lucide-react';
import { Team } from '../../hooks/useTeams';
import { formatDateLabel } from '../../lib/matchData';

interface TeamCardProps {
    team: Team;
    onDelete: (id: string) => void;
    onEditAliases: (id: string) => void;
}

export function TeamCard({ team, onDelete, onEditAliases }: TeamCardProps) {
    const createdAt = team.createdAt ? formatDateLabel(team.createdAt) : 'Nylig opprettet';

    return (
        <Link
            to={`/teams/${team.id}`}
            className="group relative block overflow-hidden rounded-3xl border border-white/10 bg-card/80 p-6 shadow-xl transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-primary transition-colors group-hover:bg-primary group-hover:text-black">
                        <Users size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Lag</p>
                        <h3 className="mt-2 text-2xl font-bold text-white transition-colors group-hover:text-primary">
                            {team.name}
                        </h3>
                        <p className="mt-2 text-sm text-gray-400">Opprettet {createdAt}</p>
                        {team.aliases.length > 0 ? (
                            <p className="mt-2 text-xs text-gray-500">
                                Historiske navn: {team.aliases.join(', ')}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onEditAliases(team.id);
                        }}
                        className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-400 transition hover:border-primary/40 hover:text-primary md:opacity-0 md:group-hover:opacity-100"
                        title="Rediger historiske navn"
                    >
                        <History size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(team.id);
                        }}
                        className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-400 transition hover:border-red-500/40 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100"
                        title="Slett lag"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div className="relative z-10 mt-6 flex items-center justify-between text-sm">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300">
                    Åpne lagoversikt
                </span>
                <span className="flex items-center gap-1 text-primary">
                    Vis detaljer
                    <ChevronRight size={18} />
                </span>
            </div>
        </Link>
    );
}
