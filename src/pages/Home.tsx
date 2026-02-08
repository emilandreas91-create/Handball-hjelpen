import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            <h1 className="text-5xl md:text-7xl font-black mb-6 uppercase tracking-tighter bg-gradient-to-r from-primary via-white to-secondary bg-clip-text text-transparent animate-pulse">
                Fremtidens Håndball
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mb-12">
                Ta laget ditt til neste nivå med våre digitale verktøy.
                Full kontroll på statistikk, kamper og spillere.
            </p>

            <Link
                to="/stats"
                className="group relative px-8 py-4 bg-transparent border-2 border-secondary text-secondary font-bold text-xl uppercase tracking-widest rounded transition-all hover:bg-secondary hover:text-white hover:shadow-[0_0_30px_rgba(255,102,0,0.6)] flex items-center gap-3"
            >
                Start Statistikkføring
                <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
        </div>
    );
}
