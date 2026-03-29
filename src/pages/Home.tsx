import { Link } from 'react-router-dom';
import {
    Activity,
    ArrowRight,
    BarChart3,
    ClipboardList,
    ShieldCheck,
    TimerReset,
    Users,
} from 'lucide-react';
import { useAuth } from '../components/features/useAuth';

const benefits = [
    {
        icon: TimerReset,
        title: 'Rask registrering under kamp',
        description: 'Før mål, bom og tekniske feil uten å miste flyten på benken.',
    },
    {
        icon: ClipboardList,
        title: 'Kamper samlet per lag',
        description: 'Hold kampene ryddig organisert slik at trenerteamet finner igjen data senere.',
    },
    {
        icon: BarChart3,
        title: 'Bedre beslutninger i pausen',
        description: 'Se utvikling, trender og siste kamp på en måte som er enkel å bruke i praksis.',
    },
];

const workflow = [
    {
        step: '01',
        title: 'Velg lag og start kamp',
        description: 'Åpne livevisningen og få et tydelig arbeidsområde klart før avkast.',
    },
    {
        step: '02',
        title: 'Registrer hendelser løpende',
        description: 'Oppdater kampbildet fortløpende mens tiden går og situasjonene endrer seg.',
    },
    {
        step: '03',
        title: 'Følg opp i etterkant',
        description: 'Lagre kampen og bruk lagbildet til å sammenligne siste kamp mot tidligere prestasjoner.',
    },
];

export function Home() {
    const { currentUser } = useAuth();

    return (
        <div className="space-y-10">
            <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-card/80 shadow-2xl backdrop-blur-xl">
                <div className="grid gap-8 px-6 py-8 md:px-10 md:py-10 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
                            Handball-hjelpen
                        </p>
                        <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">
                            Kampstatistikk som faktisk fungerer live under kamp.
                        </h1>
                        <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
                            Handball-hjelpen er laget for trenere som trenger et raskt og oversiktlig verktøy på
                            benken. Registrer hendelser fortløpende, lagre kamper per lag og få et bedre grunnlag for
                            pausen og evalueringen etterpå.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                to={currentUser ? '/stats' : '/login'}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-black transition hover:bg-white"
                            >
                                {currentUser ? 'Start live kamp' : 'Logg inn og start'}
                                <ArrowRight size={18} />
                            </Link>
                            <Link
                                to={currentUser ? '/teams' : '/login'}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:border-primary/40 hover:bg-white/10"
                            >
                                {currentUser ? 'Gå til lagoversikt' : 'Se arbeidsflyten'}
                                <Users size={18} />
                            </Link>
                        </div>

                        <div className="mt-8 flex flex-wrap gap-3 text-sm text-gray-300">
                            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                                Live registrering
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                                Lagoversikt per trener
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                                Rask kampoppfølging
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        <div className="rounded-3xl border border-primary/20 bg-primary/10 p-6">
                            <div className="flex items-center gap-3 text-primary">
                                <Activity size={20} />
                                <span className="text-sm font-semibold uppercase tracking-[0.25em]">
                                    Bygget for benken
                                </span>
                            </div>
                            <p className="mt-4 text-3xl font-black text-white">Én app for kampflyt og lagoppfølging</p>
                            <p className="mt-3 text-sm leading-6 text-gray-300">
                                Appen samler live kampføring, lagoversikt og enkel analyse i ett arbeidsrom.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                                <p className="text-sm text-gray-400">Typisk brukssituasjon</p>
                                <p className="mt-3 text-xl font-bold text-white">Mobil eller nettbrett under kamp</p>
                            </div>
                            <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                                <p className="text-sm text-gray-400">Målet med flyten</p>
                                <p className="mt-3 text-xl font-bold text-white">Rask registrering, lav friksjon</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
                {benefits.map((benefit) => (
                    <article
                        key={benefit.title}
                        className="rounded-3xl border border-white/10 bg-black/20 p-6 shadow-xl"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-primary">
                            <benefit.icon size={22} />
                        </div>
                        <h2 className="mt-5 text-2xl font-bold text-white">{benefit.title}</h2>
                        <p className="mt-3 text-sm leading-6 text-gray-400">{benefit.description}</p>
                    </article>
                ))}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-black/20 px-6 py-8 md:px-10 md:py-10">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-secondary/80">
                            Arbeidsflyt
                        </p>
                        <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
                            Fra kampstart til oppfølging på lagssiden
                        </h2>
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-gray-400">
                        Førstegangsinntrykket skal være enkelt: forstå produktet, logg inn, registrer kamp og gå
                        videre til laget når kampen er lagret.
                    </p>
                </div>

                <div className="mt-8 grid gap-5 lg:grid-cols-3">
                    {workflow.map((item) => (
                        <article
                            key={item.step}
                            className="rounded-3xl border border-white/10 bg-card/70 p-6 shadow-xl"
                        >
                            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-secondary">
                                {item.step}
                            </p>
                            <h3 className="mt-4 text-xl font-bold text-white">{item.title}</h3>
                            <p className="mt-3 text-sm leading-6 text-gray-400">{item.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-gradient-to-r from-white/5 to-primary/10 px-6 py-8 md:px-10 md:py-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 text-primary">
                            <ShieldCheck size={20} />
                            <span className="text-xs font-semibold uppercase tracking-[0.35em]">
                                Tydelig neste steg
                            </span>
                        </div>
                        <h2 className="mt-4 text-3xl font-black text-white md:text-4xl">
                            Klar for å bruke Handball-hjelpen i neste kamp?
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-gray-300">
                            Gå rett til arbeidsflaten hvis du allerede er inne, eller logg inn for å sette opp lagene
                            dine og starte første kamp.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            to={currentUser ? '/stats' : '/login'}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
                        >
                            {currentUser ? 'Åpne live kamp' : 'Åpne innlogging'}
                            <ArrowRight size={18} />
                        </Link>
                        {currentUser && (
                            <Link
                                to="/teams"
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                            >
                                Gå til lag
                                <Users size={18} />
                            </Link>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
