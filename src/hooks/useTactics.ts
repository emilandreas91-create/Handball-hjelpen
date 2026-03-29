import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../components/features/useAuth';
import { db } from '../lib/firebase';
import {
    buildStoredTacticDocument,
    normalizeStoredTacticDocument,
    type NormalizedTacticDocument,
    type TacticDraft,
} from '../lib/tacticsData';

export function useTactics() {
    const { currentUser } = useAuth();
    const [tactics, setTactics] = useState<NormalizedTacticDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser) {
            setTactics([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const unsubscribe = onSnapshot(
            collection(db, 'users', currentUser.uid, 'tactics'),
            (snapshot) => {
                const nextTactics = snapshot.docs
                    .map((tacticDoc) => normalizeStoredTacticDocument(tacticDoc.id, tacticDoc.data()))
                    .sort((left, right) => {
                        if (right.sortUpdatedAtMs !== left.sortUpdatedAtMs) {
                            return right.sortUpdatedAtMs - left.sortUpdatedAtMs;
                        }

                        return left.name.localeCompare(right.name, 'nb');
                    });

                setTactics(nextTactics);
                setError(null);
                setLoading(false);
            },
            (snapshotError) => {
                console.error(snapshotError);
                setError('Kunne ikke laste taktikker.');
                setLoading(false);
            },
        );

        return unsubscribe;
    }, [currentUser]);

    const saveTactic = async (draft: TacticDraft) => {
        if (!currentUser) {
            throw new Error('Du må være logget inn for å lagre taktikker.');
        }

        const tacticRef = draft.id
            ? doc(db, 'users', currentUser.uid, 'tactics', draft.id)
            : doc(collection(db, 'users', currentUser.uid, 'tactics'));
        const createdAt = draft.createdAt ?? Timestamp.now();
        const updatedAt = Timestamp.now();

        await setDoc(tacticRef, buildStoredTacticDocument(draft, createdAt, updatedAt));

        return {
            id: tacticRef.id,
            createdAt,
            updatedAt,
        };
    };

    const deleteTactic = async (id: string) => {
        if (!currentUser) {
            throw new Error('Du må være logget inn for å slette taktikker.');
        }

        await deleteDoc(doc(db, 'users', currentUser.uid, 'tactics', id));
    };

    return {
        tactics,
        loading,
        error,
        saveTactic,
        deleteTactic,
    };
}
