import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/features/AuthProvider';

export interface Team {
    id: string;
    name: string;
    createdAt: any;
}

export function useTeams() {
    const { currentUser } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'users', currentUser.uid, 'teams'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const teamsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Team[];
            setTeams(teamsData);
            setLoading(false);
        }, (err) => {
            console.error(err);
            setError('Kunne ikke laste lag.');
            setLoading(false);
        });

        return unsubscribe;
    }, [currentUser]);

    const addTeam = async (name: string) => {
        if (!currentUser) return;
        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'teams'), {
                name,
                createdAt: Timestamp.now()
            });
        } catch (err) {
            console.error(err);
            throw new Error('Kunne ikke legge til lag.');
        }
    };

    const deleteTeam = async (id: string) => {
        if (!currentUser) return;
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'teams', id));
        } catch (err) {
            console.error(err);
            throw new Error('Kunne ikke slette lag.');
        }
    }

    return { teams, loading, error, addTeam, deleteTeam };
}
