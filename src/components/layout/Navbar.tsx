import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, LogIn, Menu, Play, Users, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../features/useAuth';

export function Navbar() {
    const { currentUser, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
        navigate('/login');
    };

    const isActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/';
        }

        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    const navLinks = currentUser
        ? [
            { path: '/', label: 'Oversikt' },
            { path: '/stats', label: 'Live kamp', icon: Activity },
            { path: '/tactics', label: 'Taktikk', icon: Play },
            { path: '/teams', label: 'Lag', icon: Users },
        ]
        : [
            { path: '/', label: 'Produkt' },
            { path: '/login', label: 'Logg inn', icon: LogIn },
        ];

    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/75 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-3 py-3 sm:px-4 md:gap-6 md:px-6">
                <Link to="/" className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/80">
                        Handball-hjelpen
                    </div>
                    <div className="truncate text-lg font-bold text-white md:text-xl">
                        Kampstatistikk for trenere
                    </div>
                </Link>

                <div className="hidden items-center gap-7 md:flex">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={clsx(
                                'text-sm font-medium transition-colors hover:text-primary',
                                isActive(link.path) ? 'text-white' : 'text-gray-400',
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}

                    {currentUser ? (
                        <div className="ml-2 flex items-center gap-4 border-l border-white/10 pl-5">
                            <span className="max-w-[220px] truncate text-sm font-medium text-gray-300">
                                {currentUser.displayName || currentUser.email}
                            </span>
                            <Link
                                to="/stats"
                                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-black transition hover:bg-white"
                            >
                                Start kamp
                                <ArrowRight size={16} />
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="text-sm font-semibold text-red-400 transition hover:text-red-300"
                            >
                                Logg ut
                            </button>
                        </div>
                    ) : (
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition hover:border-primary hover:bg-primary hover:text-black"
                        >
                            Åpne arbeidsflate
                            <ArrowRight size={16} />
                        </Link>
                    )}
                </div>

                <button
                    className="rounded-xl border border-white/10 bg-white/5 p-3 text-white transition hover:bg-white/10 md:hidden"
                    onClick={() => setIsOpen((open) => !open)}
                    aria-label={isOpen ? 'Lukk meny' : 'Åpne meny'}
                    aria-expanded={isOpen}
                    aria-controls="mobile-nav"
                    type="button"
                >
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {isOpen && (
                <div id="mobile-nav" className="absolute left-0 top-full w-full border-b border-white/10 bg-card/95 px-3 py-4 backdrop-blur-xl sm:px-4 md:hidden">
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsOpen(false)}
                                className={clsx(
                                    'flex items-center gap-3 rounded-2xl border px-4 py-3 text-base font-medium transition-colors',
                                    isActive(link.path)
                                        ? 'border-primary/40 bg-primary/10 text-white'
                                        : 'border-white/10 bg-white/5 text-gray-300',
                                )}
                            >
                                {link.icon ? <link.icon size={18} className="text-primary" /> : null}
                                {link.label}
                            </Link>
                        ))}

                        {!currentUser && (
                            <Link
                                to="/login"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-base font-bold text-black"
                            >
                                Åpne arbeidsflate
                                <ArrowRight size={18} />
                            </Link>
                        )}

                        {currentUser && (
                            <>
                                <div className="my-2 h-px bg-white/10" />
                                <span className="text-sm font-medium text-gray-300">
                                    {currentUser.displayName || currentUser.email}
                                </span>
                                <Link
                                    to="/stats"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-bold text-black"
                                >
                                    Start kamp
                                    <ArrowRight size={18} />
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="rounded-2xl border border-red-500/20 px-4 py-3 text-left font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                                    type="button"
                                >
                                    Logg ut
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
