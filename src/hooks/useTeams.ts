import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, Timestamp, updateDoc } from 'firebase/firestore';
import { useAuth } from '../components/features/useAuth';
import { db } from '../lib/firebase';
import { getTeamAliases, getTimestampMs } from '../lib/matchData';

export interface Team {
    id: string;
    name: string;
    aliases: string[];
    createdAt: unknown;
    sortCreatedAtMs: number;
}

const normalizeTeam = (id: string, value: unknown): Team => {
    const source = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
    const rawName = typeof source.name === 'string' ? source.name.trim() : '';
    const createdAt = source.createdAt ?? null;

    return {
        id,
        name: rawName || 'Uten navn',
        aliases: getTeamAliases(source),
        createdAt,
        sortCreatedAtMs: getTimestampMs(createdAt),
    };
};

const sanitizeAliases = (teamName: string, aliases: string[]) => {
    const normalizedTeamName = teamName.trim().toLocaleLowerCase('nb-NO');

    return [...new Set(
        aliases
            .map((alias) => alias.trim())
            .filter(Boolean)
            .filter((alias) => alias.toLocaleLowerCase('nb-NO') !== normalizedTeamName),
    )];
};

export function useTeams() {
    const { currentUser } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser) {
            setTeams([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = onSnapshot(
            collection(db, 'users', currentUser.uid, 'teams'),
            (snapshot) => {
                const nextTeams = snapshot.docs
                    .map((teamDoc) => normalizeTeam(teamDoc.id, teamDoc.data()))
                    .sort((a, b) => {
                        if (b.sortCreatedAtMs !== a.sortCreatedAtMs) {
                            return b.sortCreatedAtMs - a.sortCreatedAtMs;
                        }

                        return a.name.localeCompare(b.name, 'nb');
                    });

                setTeams(nextTeams);
                setError(null);
                setLoading(false);
            },
            (snapshotError) => {
                console.error(snapshotError);
                setError('Kunne ikke laste lag.');
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [currentUser]);

    const addTeam = async (name: string, aliases: string[] = []) => {
        if (!currentUser) return;

        const trimmedName = name.trim();
        if (!trimmedName) return;

        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'teams'), {
                name: trimmedName,
                aliases: sanitizeAliases(trimmedName, aliases),
                createdAt: Timestamp.now(),
            });
        } catch (saveError) {
            console.error(saveError);
            throw new Error('Kunne ikke legge til lag.');
        }
    };

    const updateTeamAliases = async (id: string, name: string, aliases: string[]) => {
        if (!currentUser) return;

        try {
            await updateDoc(doc(db, 'users', currentUser.uid, 'teams', id), {
                aliases: sanitizeAliases(name, aliases),
            });
        } catch (updateError) {
            console.error(updateError);
            throw new Error('Kunne ikke oppdatere historiske navn.');
        }
    };

    const deleteTeam = async (id: string) => {
        if (!currentUser) return;

        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'teams', id));
        } catch (deleteError) {
            console.error(deleteError);
            throw new Error('Kunne ikke slette lag.');
        }
    };

    return { teams, loading, error, addTeam, updateTeamAliases, deleteTeam };
}
