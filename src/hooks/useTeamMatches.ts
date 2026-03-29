import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../components/features/useAuth';
import { db } from '../lib/firebase';
import {
    matchIncludesTeam,
    normalizeStoredMatchDocument,
    type MatchEvent,
    type NormalizedMatchDocument,
    type StoredTeamStats,
    type TeamLookup,
} from '../lib/matchData';

interface TeamFilter extends TeamLookup {}

export interface Match extends NormalizedMatchDocument {
    history: MatchEvent[];
    detailedStats: {
        home: StoredTeamStats;
        away: StoredTeamStats;
    };
}

export function useTeamMatches(team?: TeamFilter) {
    const { currentUser } = useAuth();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const teamId = team?.id || null;
        const teamName = team?.name?.trim() || null;
        const teamAliases = team?.aliases ?? [];

        if (!currentUser || (!teamId && !teamName && teamAliases.length === 0)) {
            setMatches([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = onSnapshot(
            collection(db, 'users', currentUser.uid, 'matches'),
            (snapshot) => {
                const nextMatches = snapshot.docs
                    .map((matchDoc) => normalizeStoredMatchDocument(matchDoc.id, matchDoc.data()))
                    .filter((match) => matchIncludesTeam(match, { id: teamId, name: teamName, aliases: teamAliases }))
                    .sort((a, b) => {
                        if (b.sortDateMs !== a.sortDateMs) {
                            return b.sortDateMs - a.sortDateMs;
                        }

                        return b.id.localeCompare(a.id);
                    });

                setMatches(nextMatches);
                setError(null);
                setLoading(false);
            },
            (snapshotError) => {
                console.error(snapshotError);
                setError('Kunne ikke laste kamper.');
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [currentUser, team?.aliases, team?.id, team?.name]);

    return { matches, loading, error };
}
