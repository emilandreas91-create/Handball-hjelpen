import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/AuthProvider';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

export function Navbar() {
    const { currentUser, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    const navLinks = [
        { path: '/', label: 'Hjem' },
        { path: '/stats', label: 'Statistikk' },
        { path: '/teams', label: 'Lag' },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link to="/" className="text-2xl font-extrabold tracking-widest text-primary uppercase">
                    Team Håndball
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex gap-8 items-center">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={clsx(
                                "text-sm font-medium transition-colors hover:text-primary",
                                isActive(link.path) ? "text-secondary font-bold" : "text-text"
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}

                    {currentUser && (
                        <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/10">
                            <span className="text-primary font-bold text-sm">
                                {currentUser.displayName || currentUser.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="text-red-500 hover:text-red-400 text-sm font-semibold"
                            >
                                Logg ut
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-white"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-card border-b border-white/10 px-4 py-4 absolute w-full top-16 left-0">
                    <div className="flex flex-col gap-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsOpen(false)}
                                className={clsx(
                                    "text-lg font-medium transition-colors",
                                    isActive(link.path) ? "text-secondary" : "text-text"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {currentUser && (
                            <>
                                <div className="h-px bg-white/10 my-2" />
                                <span className="text-primary font-bold">
                                    {currentUser.displayName || currentUser.email}
                                </span>
                                <button
                                    onClick={() => { handleLogout(); setIsOpen(false); }}
                                    className="text-red-500 hover:text-red-400 font-semibold text-left"
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
