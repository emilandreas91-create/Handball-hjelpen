export type CloudSyncState = 'idle' | 'saving' | 'synced' | 'error';

const LOCAL_STORAGE_FALLBACK_SCOPE = 'guest';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

const sanitizeFirestoreValue = (value: unknown): unknown => {
    if (value === undefined) {
        return undefined;
    }

    if (Array.isArray(value)) {
        return value
            .map((entry) => sanitizeFirestoreValue(entry))
            .filter((entry) => entry !== undefined);
    }

    if (isPlainObject(value)) {
        return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, entry]) => {
            const sanitizedEntry = sanitizeFirestoreValue(entry);
            if (sanitizedEntry !== undefined) {
                acc[key] = sanitizedEntry;
            }
            return acc;
        }, {});
    }

    return value;
};

export const prepareFirestorePayload = <T>(value: T): T => (
    sanitizeFirestoreValue(value) as T
);

export const getScopedStorageKey = (key: string, ownerId: string | null | undefined) => (
    `${key}:${ownerId || LOCAL_STORAGE_FALLBACK_SCOPE}`
);

export const readScopedLocalStorage = <T>(
    key: string,
    ownerId: string | null | undefined,
    parser: (value: unknown) => T | null,
): T | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    const rawValue = window.localStorage.getItem(getScopedStorageKey(key, ownerId));
    if (!rawValue) {
        return null;
    }

    return parser(JSON.parse(rawValue));
};

export const writeScopedLocalStorage = (key: string, ownerId: string | null | undefined, value: unknown) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(getScopedStorageKey(key, ownerId), JSON.stringify(value));
};

export const removeScopedLocalStorage = (key: string, ownerId: string | null | undefined) => {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.removeItem(getScopedStorageKey(key, ownerId));
};
