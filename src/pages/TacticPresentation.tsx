import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { TacticBoard } from '../components/features/TacticBoard';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { useTactics } from '../hooks/useTactics';

export function TacticPresentation() {
    const { tacticId = '' } = useParams();
    const { tactics, loading, error } = useTactics();
    const [frameIndex, setFrameIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const tactic = useMemo(() => tactics.find((entry) => entry.id === tacticId) ?? null, [tactics, tacticId]);
    const currentFrame = tactic?.frames[frameIndex] ?? tactic?.frames[0] ?? null;

    useEffect(() => {
        setFrameIndex(0);
        setIsPlaying(false);
    }, [tacticId]);

    useEffect(() => {
        if (!tactic) {
            return;
        }

        setFrameIndex((previousIndex) => Math.min(previousIndex, Math.max(tactic.frames.length - 1, 0)));
    }, [tactic]);

    useEffect(() => {
        if (!tactic || !isPlaying || !currentFrame) {
            return;
        }

        if (frameIndex >= tactic.frames.length - 1) {
            setIsPlaying(false);
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setFrameIndex((previousIndex) => Math.min(previousIndex + 1, tactic.frames.length - 1));
        }, currentFrame.durationMs);

        return () => window.clearTimeout(timeoutId);
    }, [currentFrame, frameIndex, isPlaying, tactic]);

    if (loading) {
        return <LoadingState title="Laster presentasjon" message="Vi gjør klart taktikkvisningen for laget." />;
    }

    if (error) {
        return (
            <EmptyState
                icon={Play}
                title="Kunne ikke åpne taktikken"
                description={error}
                action={
                    <Link
                        to="/tactics"
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-white"
                    >
                        Tilbake til taktikk
                        <ArrowLeft size={16} />
                    </Link>
                }
            />
        );
    }

    if (!tactic || !currentFrame) {
        return (
            <EmptyState
                icon={Play}
                title="Fant ikke taktikken"
                description="Taktikken kan ha blitt slettet eller ikke lastet inn ennå."
                action={
                    <Link
                        to="/tactics"
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-white"
                    >
                        Tilbake til taktikk
                        <ArrowLeft size={16} />
                    </Link>
                }
            />
        );
    }

    const isFirstFrame = frameIndex === 0;
    const isLastFrame = frameIndex === tactic.frames.length - 1;
    const handleTogglePlay = () => {
        if (isLastFrame) {
            setFrameIndex(0);
        }

        setIsPlaying((previousState) => !previousState || isLastFrame);
    };

    return (
        <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-card/80 p-6 shadow-2xl backdrop-blur-xl md:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <Link to="/tactics" className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-white">
                            <ArrowLeft size={16} />
                            Tilbake til taktikk
                        </Link>
                        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">Presentasjon</p>
                        <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">{tactic.name}</h1>
                        <p className="mt-4 text-base leading-8 text-gray-300">
                            {tactic.teamName || 'Uten lag'} • {tactic.courtType === 'full' ? 'Hel bane' : 'Halv bane'} • {tactic.frames.length} steg
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <button
                            type="button"
                            onClick={() => {
                                setIsPlaying(false);
                                setFrameIndex((previousIndex) => Math.max(previousIndex - 1, 0));
                            }}
                            disabled={isFirstFrame}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ChevronLeft size={18} />
                            Forrige
                        </button>
                        <button
                            type="button"
                            onClick={handleTogglePlay}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-bold text-black transition hover:bg-white"
                        >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                            {isPlaying ? 'Pause' : isLastFrame ? 'Start på nytt' : 'Spill av'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsPlaying(false);
                                setFrameIndex((previousIndex) => Math.min(previousIndex + 1, tactic.frames.length - 1));
                            }}
                            disabled={isLastFrame}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Neste
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-black/20 p-5 shadow-xl sm:p-6">
                <TacticBoard
                    courtType={tactic.courtType}
                    tokens={currentFrame.tokens}
                    paths={currentFrame.paths}
                    animateDurationMs={Math.min(Math.max(currentFrame.durationMs - 120, 250), 1200)}
                    helperText={`Steg ${frameIndex + 1} av ${tactic.frames.length} • Varighet ${(currentFrame.durationMs / 1000).toFixed(1)} sek`}
                    presentationMode
                />

                <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
                    {tactic.frames.map((frame, index) => (
                        <button
                            key={frame.id}
                            type="button"
                            onClick={() => {
                                setIsPlaying(false);
                                setFrameIndex(index);
                            }}
                            className={`min-w-[140px] rounded-2xl border px-4 py-3 text-left transition ${frameIndex === index
                                ? 'border-primary/40 bg-primary/10 text-white'
                                : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                                }`}
                        >
                            <p className="text-sm font-bold">{frame.title}</p>
                            <p className="mt-1 text-xs text-white/50">{(frame.durationMs / 1000).toFixed(1)} sek</p>
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}
