import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/features/AuthProvider';

export interface MatchStat {
    goal?: number;
    miss?: number;
    tech?: number;
    history?: { side: string, type: string, data?: any }[];
    [key: string]: any;
}

export interface Match {
    id: string;
    name: string;
    date: any;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    period: string;
    detailedStats: {
        home: MatchStat;
        away: MatchStat;
    }
}

export function useTeamMatches(teamName?: string) {
    const { currentUser } = useAuth();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser || !teamName) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'users', currentUser.uid, 'matches'),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const matchesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Match[];

            // Filter matches where this team played
            const teamMatches = matchesData.filter(m => m.homeTeam === teamName || m.awayTeam === teamName);

            setMatches(teamMatches);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError('Kunne ikke laste kamper.');
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser, teamName]);

    return { matches, loading, error };
}
