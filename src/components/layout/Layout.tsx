import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function Layout() {
    return (
        <div className="min-h-screen bg-background text-text selection:bg-primary/30 font-sans">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                <Outlet />
            </main>

            {/* Background Decor */}
            <div className="fixed inset-0 -z-10 bg-hero-pattern opacity-80 pointer-events-none" />
            <div className="fixed inset-0 -z-10 bg-grid-pattern opacity-10 pointer-events-none" />
        </div>
    );
}
