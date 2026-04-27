import React, { useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { LoadingState } from '../ui/LoadingState';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getRedirectResult(auth).catch((err) => {
            console.error('Google redirect-feil:', err);
        });

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ currentUser, loading, logout }}>
            {loading ? (
                <LoadingState
                    fullScreen
                    title="Kobler til kontoen"
                    message="Vi sjekker innloggingen din og gjør appen klar."
                />
            ) : children}
        </AuthContext.Provider>
    );
}
