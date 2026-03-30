import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BarChart3,
    ClipboardList,
    ShieldCheck,
    TimerReset,
    Users,
} from 'lucide-react';
import { useAuth } from '../components/features/useAuth';

const capabilities = [
    {
        icon: TimerReset,
        label: 'Live kamp',
        title: 'Lav friksjon pa benken',
        description: 'Registrer hendelser raskt nok til at du holder rytmen i kampen.',
    },
    {
        icon: ClipboardList,
        label: 'Lagoversikt',
        title: 'Alt samlet per lag',
        description: 'Finn igjen kamper, utvikling og siste status uten ekstra leiting.',
    },
    {
        icon: BarChart3,
        label: 'Analyse',
        title: 'Klar til pauseprat',
        description: 'Fa de viktigste signalene i et format som er lett a bruke i praksis.',
    },
];

const workflow = [
    {
        step: '01',
        title: 'Start kamp',
        description: 'Velg lag og ga rett inn i live-flyten.',
    },
    {
        step: '02',
        title: 'For lopende',
        description: 'Fang hendelser mens kampen faktisk skjer.',
    },
    {
        step: '03',
        title: 'Folg opp',
        description: 'Bruk lagbildet nar kampen er lagret.',
    },
];

const previewBars = [62, 78, 54, 84, 68, 74];

export function Home() {
    const { currentUser } = useAuth();

    return (
        <div className="relative isolate space-y-6 md:space-y-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[840px] overflow-hidden rounded-[2.75rem]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_82%_16%,rgba(45,212,191,0.14),transparent_20%),linear-gradient(180deg,rgba(11,18,32,0.98)_0%,rgba(11,18,32,0.82)_58%,rgba(11,18,32,0)_100%)]" />
                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(148,163,184,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.35) 1px, transparent 1px)',
                        backgroundSize: '36px 36px',
                    }}
                />
            </div>

            <section className="home-fade-up relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#0B1220]/92 shadow-[0_30px_90px_rgba(2,8,23,0.48)] backdrop-blur-xl">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(45,212,191,0.09),transparent_22%)]" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                <div className="relative grid gap-8 px-5 py-6 sm:px-7 sm:py-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-center lg:px-10 lg:py-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9CCFF8]">
                            <span className="h-2 w-2 rounded-full bg-[#2DD4BF] shadow-[0_0_16px_rgba(45,212,191,0.45)] motion-safe:animate-pulse" />
                            Bench-ready
                        </div>

                        <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.04em] text-[#F3F4F6] sm:text-5xl lg:text-6xl">
                            Et rolig, raskt arbeidsrom for trenere som ma ta gode valg live.
                        </h1>

                        <p className="mt-5 max-w-2xl text-base leading-7 text-[#9CA3AF] sm:text-lg sm:leading-8">
                            Live kamp, lagoversikt og oppfolging samlet i en mork, ryddig flate som holder fokus der kampen faktisk avgjores.
                        </p>

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <Link
                                to={currentUser ? '/stats' : '/login'}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#38BDF8] px-6 py-3 text-sm font-bold text-[#07111D] shadow-[0_12px_30px_rgba(56,189,248,0.22)] transition hover:bg-[#7DD3FC]"
                            >
                                {currentUser ? 'Start live kamp' : 'Logg inn og start'}
                                <ArrowRight size={18} />
                            </Link>
                            <Link
                                to={currentUser ? '/teams' : '/login'}
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-[#E5E7EB] transition hover:border-[#38BDF8]/35 hover:bg-white/[0.08]"
                            >
                                {currentUser ? 'Ga til lagoversikt' : 'Se arbeidsflyten'}
                                <Users size={18} />
                            </Link>
                        </div>

                        <div className="mt-8 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9CA3AF]">Brukssituasjon</p>
                                <p className="mt-2 text-base font-bold text-[#F3F4F6]">Mobil eller nettbrett</p>
                            </div>
                            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9CA3AF]">Fokus</p>
                                <p className="mt-2 text-base font-bold text-[#F3F4F6]">Lav friksjon live</p>
                            </div>
                            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9CA3AF]">Resultat</p>
                                <p className="mt-2 text-base font-bold text-[#F3F4F6]">Bedre pauser og oppfolging</p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-[#C7D2FE]">
                            <span className="rounded-full border border-[#22304A] bg-[#10192B] px-4 py-2">Live kamp</span>
                            <span className="rounded-full border border-[#22304A] bg-[#10192B] px-4 py-2">Lagoversikt</span>
                            <span className="rounded-full border border-[#22304A] bg-[#10192B] px-4 py-2">Pauseklar analyse</span>
                        </div>
                    </div>

                    <div className="home-fade-up-delay-1 home-float relative">
                        <div className="rounded-[2rem] border border-[#1E2A3E] bg-[#111827]/88 p-4 shadow-[0_24px_60px_rgba(2,8,23,0.56)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                                </div>
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">
                                    Coach view
                                </span>
                            </div>

                            <div className="mt-4 rounded-[1.6rem] border border-[#1D2A41] bg-[#0F1728]/88 p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9CA3AF]">Live kamp</p>
                                        <p className="mt-2 text-sm font-semibold text-[#E5E7EB]">G16 vs Haslum</p>
                                    </div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-[#1C3C54] bg-[#0E2030] px-3 py-1 text-xs font-semibold text-[#7DD3FC]">
                                        <span className="h-2 w-2 rounded-full bg-[#2DD4BF] motion-safe:animate-pulse" />
                                        1. omg
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-center">
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#9CA3AF]">Hjemme</p>
                                        <p className="mt-2 text-4xl font-black text-[#F3F4F6]">24</p>
                                    </div>
                                    <div className="text-sm font-semibold uppercase tracking-[0.3em] text-[#6B7280]">27:41</div>
                                    <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-center">
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-[#9CA3AF]">Borte</p>
                                        <p className="mt-2 text-4xl font-black text-[#F3F4F6]">22</p>
                                    </div>
                                </div>

                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#9CA3AF]">Avslutning</p>
                                        <p className="mt-2 text-lg font-bold text-[#F3F4F6]">61%</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#9CA3AF]">Teknisk</p>
                                        <p className="mt-2 text-lg font-bold text-[#F3F4F6]">5</p>
                                    </div>
                                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#9CA3AF]">Redninger</p>
                                        <p className="mt-2 text-lg font-bold text-[#F3F4F6]">8</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[1.5rem] border border-white/8 bg-[#0E1626] p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9CA3AF]">Lagform</p>
                                        <span className="text-xs font-semibold text-[#2DD4BF]">+8%</span>
                                    </div>
                                    <div className="mt-4 flex h-20 items-end gap-2">
                                        {previewBars.map((bar, index) => (
                                            <div
                                                key={index}
                                                className="flex-1 rounded-full bg-gradient-to-t from-[#38BDF8] to-[#2DD4BF]/90"
                                                style={{ height: `${bar}%` }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[1.5rem] border border-white/8 bg-[#0E1626] p-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9CA3AF]">Arbeidsrom</p>
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-[#E5E7EB]">
                                            <span>Taktikk klar</span>
                                            <span className="text-[#7DD3FC]">4 steg</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-[#E5E7EB]">
                                            <span>Lagoversikt</span>
                                            <span className="text-[#2DD4BF]">8 kamper</span>
                                        </div>
                                        <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-[#E5E7EB]">
                                            <span>Klar til pause</span>
                                            <span className="text-[#F3F4F6]">Nå</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
                <div className="home-fade-up-delay-1 rounded-[2rem] border border-white/10 bg-[#111827]/78 p-5 shadow-[0_18px_50px_rgba(2,8,23,0.34)] backdrop-blur-xl sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#93C5FD]">Kjerneflyt</p>
                            <h2 className="mt-3 text-3xl font-black tracking-tight text-[#F3F4F6]">Det viktigste pakket stramt.</h2>
                        </div>
                        <p className="max-w-lg text-sm leading-6 text-[#9CA3AF]">
                            Ingen stoy, bare de flatene treneren faktisk trenger i og rundt kamp.
                        </p>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        {capabilities.map((item) => (
                            <article
                                key={item.title}
                                className="rounded-[1.75rem] border border-white/10 bg-[#0F1728]/78 p-5"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#7DD3FC]">
                                    <item.icon size={20} />
                                </div>
                                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#93C5FD]">
                                    {item.label}
                                </p>
                                <h3 className="mt-3 text-xl font-bold text-[#F3F4F6]">{item.title}</h3>
                                <p className="mt-3 text-sm leading-6 text-[#9CA3AF]">{item.description}</p>
                            </article>
                        ))}
                    </div>
                </div>

                <div className="home-fade-up-delay-2 rounded-[2rem] border border-white/10 bg-[#0F1728]/78 p-5 shadow-[0_18px_50px_rgba(2,8,23,0.34)] backdrop-blur-xl sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#5EEAD4]">Flyt</p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-[#F3F4F6]">Fra avkast til oppfolging.</h2>

                    <div className="relative mt-6 space-y-4">
                        <div className="absolute left-[18px] top-4 bottom-4 w-px bg-gradient-to-b from-[#38BDF8]/70 via-[#2DD4BF]/45 to-transparent" />
                        {workflow.map((item) => (
                            <article
                                key={item.step}
                                className="relative flex gap-4 rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4"
                            >
                                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#294161] bg-[#0D182A] text-[11px] font-bold tracking-[0.18em] text-[#93C5FD]">
                                    {item.step}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-[#F3F4F6]">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-6 text-[#9CA3AF]">{item.description}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="home-fade-up-delay-2 rounded-[2rem] border border-white/10 bg-[#0E1628]/88 px-5 py-6 shadow-[0_18px_50px_rgba(2,8,23,0.34)] backdrop-blur-xl sm:px-7 sm:py-7">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 text-[#7DD3FC]">
                            <ShieldCheck size={18} />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.3em]">Neste steg</span>
                        </div>
                        <h2 className="mt-4 text-3xl font-black tracking-tight text-[#F3F4F6]">
                            Klar for neste kamp?
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-[#9CA3AF]">
                            Ga rett til arbeidsflaten hvis du allerede er inne, eller logg inn og sett opp laget for forste kamp.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link
                            to={currentUser ? '/stats' : '/login'}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2DD4BF] px-6 py-3 text-sm font-bold text-[#07111D] transition hover:brightness-110"
                        >
                            {currentUser ? 'Apne live kamp' : 'Apne innlogging'}
                            <ArrowRight size={18} />
                        </Link>
                        {currentUser && (
                            <Link
                                to="/teams"
                                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-[#F3F4F6] transition hover:bg-white/[0.08]"
                            >
                                Ga til lag
                                <Users size={18} />
                            </Link>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
