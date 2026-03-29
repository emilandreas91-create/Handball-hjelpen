import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
    return (
        <div className="min-h-screen bg-background text-text selection:bg-primary/30 font-sans">
            <div className="fixed inset-0 -z-10 bg-hero-pattern opacity-80 pointer-events-none" />
            <div className="fixed inset-0 -z-10 bg-grid-pattern opacity-10 pointer-events-none" />
            <div className="fixed inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
            <div className="fixed bottom-0 right-0 -z-10 h-72 w-72 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">
                    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-10">
                        <Outlet />
                    </div>
                </main>

                <footer className="border-t border-white/10 bg-black/30 backdrop-blur-md">
                    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 text-sm text-gray-400 md:flex-row md:items-center md:justify-between md:px-6">
                        <div>
                            <p className="font-semibold text-white">Handball-hjelpen</p>
                            <p>Live kampstatistikk og lagoversikt for trenere som må ta raske valg.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <span>Kampflyt</span>
                            <span>Lagoversikt</span>
                            <span>Pausestøtte</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
