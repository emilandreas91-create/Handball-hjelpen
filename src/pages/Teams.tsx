import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FolderOpen, History, Loader2, Plus, ShieldAlert } from 'lucide-react';
import { useTeams } from '../hooks/useTeams';
import { TeamCard } from '../components/features/TeamCard';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';

export function Teams() {
    const { teams, loading, error, addTeam, updateTeamAliases, deleteTeam } = useTeams();
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamAliases, setNewTeamAliases] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [formError, setFormError] = useState('');
    const [pendingDeleteTeamId, setPendingDeleteTeamId] = useState<string | null>(null);
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editingAliases, setEditingAliases] = useState('');
    const [isSavingAliases, setIsSavingAliases] = useState(false);
    const teamNameInputRef = useRef<HTMLInputElement | null>(null);

    const parseAliases = (value: string) => (
        [...new Set(
            value
                .split(/[\n,;]+/g)
                .map((alias) => alias.trim())
                .filter(Boolean),
        )]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newTeamName.trim();

        if (!trimmedName) {
            return;
        }

        setFormError('');

        if (teams.some((team) => team.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
            setFormError('Du har allerede et lag med dette navnet.');
            return;
        }

        try {
            setIsAdding(true);
            await addTeam(trimmedName, parseAliases(newTeamAliases));
            setNewTeamName('');
            setNewTeamAliases('');
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Kunne ikke lagre laget.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        setPendingDeleteTeamId(id);
    };

    const handleEditAliases = (id: string) => {
        const team = teams.find((entry) => entry.id === id);
        if (!team) return;

        setEditingTeamId(id);
        setEditingAliases(team.aliases.join(', '));
        setFormError('');
    };

    const pendingDeleteTeam = pendingDeleteTeamId
        ? teams.find((team) => team.id === pendingDeleteTeamId)
        : null;
    const editingTeam = editingTeamId
        ? teams.find((team) => team.id === editingTeamId)
        : null;

    const handleConfirmDelete = async () => {
        if (!pendingDeleteTeamId) {
            return;
        }

        setFormError('');

        try {
            await deleteTeam(pendingDeleteTeamId);
            setPendingDeleteTeamId(null);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Kunne ikke slette laget.');
        }
    };

    const handleSaveAliases = async () => {
        if (!editingTeam) {
            return;
        }

        setFormError('');

        try {
            setIsSavingAliases(true);
            await updateTeamAliases(editingTeam.id, editingTeam.name, parseAliases(editingAliases));
            setEditingTeamId(null);
            setEditingAliases('');
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Kunne ikke oppdatere historiske navn.');
        } finally {
            setIsSavingAliases(false);
        }
    };

    return (
        <div className="space-y-8">
            <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">Lag</p>
                        <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
                            Hold kampene ryddig organisert per lag.
                        </h1>
                        <p className="mt-4 text-base leading-8 text-gray-300">
                            Laglisten gir deg en fast struktur for kampdataene dine. Opprett lag én gang, og bruk dem
                            videre når du starter nye kamper eller vil sammenligne tidligere prestasjoner.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
                            <p className="text-sm text-gray-400">Registrerte lag</p>
                            <p className="mt-2 text-3xl font-black text-white">{teams.length}</p>
                        </div>
                        <Link
                            to="/stats"
                            className="flex items-center justify-between rounded-3xl border border-primary/30 bg-primary/10 p-5 text-white transition hover:border-primary hover:bg-primary/15"
                        >
                            <div>
                                <p className="text-sm text-primary">Neste steg</p>
                                <p className="mt-2 text-lg font-bold">Åpne live kamp</p>
                            </div>
                            <ArrowRight className="text-primary" />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-black/20 p-6 shadow-xl md:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <h2 className="text-2xl font-bold text-white">Legg til nytt lag</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                            Bruk tydelige navn som årgang, nivå eller gruppe, slik at kampene blir enkle å finne
                            tilbake til senere.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="grid w-full max-w-2xl gap-3">
                        <input
                            ref={teamNameInputRef}
                            type="text"
                            value={newTeamName}
                            onChange={(e) => {
                                setNewTeamName(e.target.value);
                                if (formError) {
                                    setFormError('');
                                }
                            }}
                            placeholder="For eksempel G16, J15 eller Senior kvinner"
                            className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                                type="text"
                                value={newTeamAliases}
                                onChange={(e) => setNewTeamAliases(e.target.value)}
                                placeholder="Historiske navn / aliaser, separert med komma"
                                className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                                type="submit"
                                disabled={!newTeamName.trim() || isAdding}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isAdding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                Legg til lag
                            </button>
                        </div>
                    </form>
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
                    <History size={18} className="mt-0.5 shrink-0 text-primary" />
                    <span>
                        Legg gjerne inn tidligere lagnavn eller korte aliaser hvis eldre kamper ble lagret med et annet navn.
                    </span>
                </div>

                {(formError || error) && (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                        <span>{formError || error}</span>
                    </div>
                )}
            </section>

            <section>
                {loading ? (
                    <LoadingState title="Laster lag" message="Vi henter lagene dine og gjør oversikten klar." />
                ) : teams.length === 0 ? (
                    <EmptyState
                        icon={FolderOpen}
                        title="Ingen lag registrert ennå"
                        description="Opprett det første laget ditt for å samle kamper, lagre statistikk og få en ryddig inngang til analyse senere."
                        action={
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => teamNameInputRef.current?.focus()}
                                    className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-white"
                                >
                                    Opprett første lag
                                </button>
                                <Link
                                    to="/stats"
                                    className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                                >
                                    Gå til kampvisning
                                </Link>
                            </div>
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {teams.map((team) => (
                            <TeamCard key={team.id} team={team} onDelete={handleDelete} onEditAliases={handleEditAliases} />
                        ))}
                    </div>
                )}
            </section>

            <Dialog
                isOpen={Boolean(editingTeam)}
                title="Historiske navn"
                description={editingTeam ? `Legg inn tidligere navn eller aliaser for "${editingTeam.name}". Dette hjelper eldre kamper uten lag-ID å matches riktig.` : undefined}
                onClose={() => {
                    setEditingTeamId(null);
                    setEditingAliases('');
                }}
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingTeamId(null);
                                setEditingAliases('');
                            }}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            Avbryt
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAliases}
                            disabled={isSavingAliases}
                            className="rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSavingAliases ? 'Lagrer...' : 'Lagre navnmatch'}
                        </button>
                    </>
                }
            >
                <input
                    type="text"
                    value={editingAliases}
                    onChange={(e) => setEditingAliases(e.target.value)}
                    placeholder="For eksempel G15, G16 2024, Junior gutter"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-3 text-sm text-gray-400">
                    Bruk komma for å skille navn. Nåværende lagnavn trenger du ikke å legge inn.
                </p>
            </Dialog>

            <Dialog
                isOpen={Boolean(pendingDeleteTeam)}
                title="Slett lag"
                description={pendingDeleteTeam ? `Vil du slette laget "${pendingDeleteTeam.name}"? Dette fjerner laget fra oversikten din.` : undefined}
                onClose={() => setPendingDeleteTeamId(null)}
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => setPendingDeleteTeamId(null)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                        >
                            Behold lag
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmDelete}
                            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500"
                        >
                            Slett lag
                        </button>
                    </>
                }
            />
        </div>
    );
}
