export type TeamSide = 'home' | 'away';
export type StatType = 'goal' | 'miss' | 'save' | 'tech' | 'other';
export type ShotResult = 'goal' | 'save' | 'miss';

export interface MatchStats {
    goal: number;
    miss: number;
    save: number;
    tech: number;
    [key: string]: number;
}

export interface SaveLocation {
    id: string;
    x: number;
    y: number;
    count: number;
}

export interface MatchEvent {
    side: TeamSide;
    type: StatType | string;
    period: number;
    matchTime: number;
    createdAt: string;
    data?: Record<string, number | string | boolean | null>;
}

export type MatchHistoryEntry = MatchEvent;

export interface TeamState {
    score: number;
    stats: MatchStats;
    saves: SaveLocation[];
    goalLocations: SaveLocation[];
    shotLocations: SaveLocation[];
}

export interface MatchData {
    matchTime: number;
    period: number;
    homeState: TeamState;
    awayState: TeamState;
    history: MatchEvent[];
}

export interface TeamReference {
    id: string | null;
    name: string;
}

export interface CustomStatDefinition {
    id: string;
    label: string;
    color: string;
}

export interface CustomStatSnapshot {
    id: string;
    label: string;
    count: number;
}

export interface StoredTeamStats {
    score: number;
    goal: number;
    miss: number;
    save: number;
    tech: number;
    stats: MatchStats;
    history: MatchEvent[];
    shotLocations: SaveLocation[];
    goalLocations: SaveLocation[];
    saves: SaveLocation[];
    customStats: CustomStatSnapshot[];
}

export interface StoredMatchDocument {
    id?: string;
    dataVersion: number;
    name: string;
    status: 'saved' | 'completed';
    date: unknown;
    savedAt: unknown;
    updatedAt: unknown;
    matchTime: number;
    period: number;
    periodLabel: string;
    history: MatchEvent[];
    historyCount: number;
    homeTeam: string;
    awayTeam: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeScore: number;
    awayScore: number;
    detailedStats: {
        home: StoredTeamStats;
        away: StoredTeamStats;
    };
}

export interface NormalizedMatchDocument {
    id: string;
    dataVersion: number;
    name: string;
    status: 'saved' | 'completed';
    date: unknown;
    sortDateMs: number;
    savedAt: unknown;
    updatedAt: unknown;
    matchTime: number;
    period: number;
    periodLabel: string;
    history: MatchEvent[];
    historyCount: number;
    homeTeam: string;
    awayTeam: string;
    homeTeamId: string | null;
    awayTeamId: string | null;
    homeScore: number;
    awayScore: number;
    detailedStats: {
        home: StoredTeamStats;
        away: StoredTeamStats;
    };
}

export interface TeamLookup {
    id?: string | null;
    name?: string | null;
    aliases?: string[] | null;
}

export const MATCH_DATA_VERSION = 2;

export const BASE_STATS: MatchStats = {
    goal: 0,
    miss: 0,
    save: 0,
    tech: 0,
    other: 0,
};

const LOCATION_TOLERANCE = 5;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const toNonNegativeNumber = (value: unknown, fallback = 0) => {
    const parsed = toFiniteNumber(value);
    if (parsed === null) return fallback;
    return Math.max(0, parsed);
};

const clampPercentage = (value: unknown) => {
    const parsed = toFiniteNumber(value);
    if (parsed === null) return null;
    return Math.min(100, Math.max(0, parsed));
};

const toNonEmptyString = (value: unknown, fallback = '') => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
};

const normalizeStringArray = (value: unknown) => {
    if (!Array.isArray(value)) return [];

    return value.reduce<string[]>((acc, item) => {
        const normalized = toNonEmptyString(item);
        if (normalized) {
            acc.push(normalized);
        }
        return acc;
    }, []);
};

export const normalizeMatchEventData = (value: unknown): MatchEvent['data'] => {
    if (!isRecord(value)) return undefined;

    const normalized = Object.entries(value).reduce<Record<string, string | number | boolean | null>>(
        (acc, [key, rawValue]) => {
            if (
                typeof rawValue === 'string' ||
                typeof rawValue === 'number' ||
                typeof rawValue === 'boolean' ||
                rawValue === null
            ) {
                acc[key] = rawValue;
            }

            return acc;
        },
        {},
    );

    return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const getPeriodLabel = (period: number) => {
    switch (period) {
        case 1:
            return '1. OMG';
        case 2:
            return '2. OMG';
        case 3:
            return 'PAUSE';
        case 4:
            return 'SLUTT';
        default:
            return '1. OMG';
    }
};

export const normalizeTeamNameKey = (value: unknown) => {
    const teamName = toNonEmptyString(value).toLocaleLowerCase('nb-NO');

    if (!teamName) {
        return '';
    }

    return teamName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
};

export const getTeamLookupNames = (team?: TeamLookup) => {
    if (!team) return [];

    const candidates = [
        team.name ?? '',
        ...(team.aliases ?? []),
    ];

    return [...new Set(candidates
        .map((name) => toNonEmptyString(name))
        .filter(Boolean))];
};

export const resolveMatchTeamSide = (
    match: Pick<StoredMatchDocument, 'homeTeamId' | 'awayTeamId' | 'homeTeam' | 'awayTeam'>,
    team?: TeamLookup,
): TeamSide | null => {
    if (!team) return null;

    if (team.id) {
        if (match.homeTeamId === team.id) return 'home';
        if (match.awayTeamId === team.id) return 'away';
    }

    const teamNames = new Set(getTeamLookupNames(team).map((name) => normalizeTeamNameKey(name)));
    if (teamNames.size === 0) return null;

    const normalizedHomeName = normalizeTeamNameKey(match.homeTeam);
    const normalizedAwayName = normalizeTeamNameKey(match.awayTeam);

    if (teamNames.has(normalizedHomeName)) return 'home';
    if (teamNames.has(normalizedAwayName)) return 'away';

    return null;
};

export const matchIncludesTeam = (
    match: Pick<StoredMatchDocument, 'homeTeamId' | 'awayTeamId' | 'homeTeam' | 'awayTeam'>,
    team?: TeamLookup,
) => resolveMatchTeamSide(match, team) !== null;

export const createEmptyTeamState = (): TeamState => ({
    score: 0,
    stats: { ...BASE_STATS },
    saves: [],
    goalLocations: [],
    shotLocations: [],
});

export const addOrIncrementLocation = (locations: SaveLocation[], x: number, y: number) => {
    const safeX = clampPercentage(x);
    const safeY = clampPercentage(y);

    if (safeX === null || safeY === null) {
        return [...locations];
    }

    const existingIndex = locations.findIndex((location) => (
        Math.abs(location.x - safeX) < LOCATION_TOLERANCE &&
        Math.abs(location.y - safeY) < LOCATION_TOLERANCE
    ));

    const nextLocations = [...locations];

    if (existingIndex >= 0) {
        const existing = nextLocations[existingIndex];
        nextLocations[existingIndex] = { ...existing, count: existing.count + 1 };
        return nextLocations;
    }

    nextLocations.push({
        id: `loc_${Date.now()}_${Math.round(safeX)}_${Math.round(safeY)}`,
        x: safeX,
        y: safeY,
        count: 1,
    });

    return nextLocations;
};

export const removeOrDecrementLocation = (locations: SaveLocation[], x: number, y: number) => {
    const safeX = clampPercentage(x);
    const safeY = clampPercentage(y);

    if (safeX === null || safeY === null) {
        return [...locations];
    }

    const existingIndex = locations.findIndex((location) => (
        Math.abs(location.x - safeX) < LOCATION_TOLERANCE &&
        Math.abs(location.y - safeY) < LOCATION_TOLERANCE
    ));

    if (existingIndex < 0) {
        return [...locations];
    }

    const nextLocations = [...locations];
    const existing = nextLocations[existingIndex];

    if (existing.count > 1) {
        nextLocations[existingIndex] = { ...existing, count: existing.count - 1 };
    } else {
        nextLocations.splice(existingIndex, 1);
    }

    return nextLocations;
};

export const normalizeMatchStats = (value: unknown): MatchStats => {
    const source = isRecord(value) ? value : {};
    const normalized: MatchStats = {
        ...BASE_STATS,
    };

    Object.entries(source).forEach(([key, rawValue]) => {
        const parsed = toFiniteNumber(rawValue);
        if (parsed !== null) {
            normalized[key] = Math.max(0, parsed);
        }
    });

    normalized.goal = toNonNegativeNumber(source.goal, normalized.goal);
    normalized.miss = toNonNegativeNumber(source.miss, normalized.miss);
    normalized.save = toNonNegativeNumber(source.save, normalized.save);
    normalized.tech = toNonNegativeNumber(source.tech, normalized.tech);
    normalized.other = toNonNegativeNumber(source.other, normalized.other);

    return normalized;
};

export const normalizeLocations = (value: unknown): SaveLocation[] => {
    if (!Array.isArray(value)) return [];

    return value.reduce<SaveLocation[]>((acc, item, index) => {
        if (!isRecord(item)) return acc;

        const x = clampPercentage(item.x);
        const y = clampPercentage(item.y);

        if (x === null || y === null) {
            return acc;
        }

        acc.push({
            id: toNonEmptyString(item.id, `loc_${index}_${Math.round(x)}_${Math.round(y)}`),
            x,
            y,
            count: Math.max(1, Math.round(toNonNegativeNumber(item.count, 1))),
        });

        return acc;
    }, []);
};

export const normalizeHistory = (value: unknown): MatchEvent[] => {
    if (!Array.isArray(value)) return [];

    return value.reduce<MatchEvent[]>((acc, item) => {
        if (!isRecord(item)) return acc;

        const side = item.side === 'away' ? 'away' : item.side === 'home' ? 'home' : null;
        const type = toNonEmptyString(item.type);

        if (!side || !type) {
            return acc;
        }

        const period = Math.max(1, Math.round(toNonNegativeNumber(item.period, 1)));
        const matchTime = Math.round(toNonNegativeNumber(item.matchTime, 0));
        const createdAt = toNonEmptyString(item.createdAt, new Date(0).toISOString());
        const data = normalizeMatchEventData(item.data);

        acc.push({
            side,
            type,
            period,
            matchTime,
            createdAt,
            data,
        });

        return acc;
    }, []);
};

const normalizeCustomStats = (value: unknown): CustomStatSnapshot[] => {
    if (!Array.isArray(value)) return [];

    return value.reduce<CustomStatSnapshot[]>((acc, item) => {
        if (!isRecord(item)) return acc;

        const id = toNonEmptyString(item.id);
        const label = toNonEmptyString(item.label);

        if (!id || !label) {
            return acc;
        }

        acc.push({
            id,
            label,
            count: Math.max(0, Math.round(toNonNegativeNumber(item.count, 0))),
        });

        return acc;
    }, []);
};

const deriveLocationsFromHistory = (history: MatchEvent[]) => {
    return history.reduce((acc, event) => {
        if (event.type === 'combinedShot') {
            const courtX = clampPercentage(event.data?.courtX);
            const courtY = clampPercentage(event.data?.courtY);
            const goalX = clampPercentage(event.data?.goalX);
            const goalY = clampPercentage(event.data?.goalY);
            const result = event.data?.result;

            if (courtX !== null && courtY !== null) {
                acc.shotLocations = addOrIncrementLocation(acc.shotLocations, courtX, courtY);
            }

            if (goalX !== null && goalY !== null && result === 'goal') {
                acc.goalLocations = addOrIncrementLocation(acc.goalLocations, goalX, goalY);
            }

            if (goalX !== null && goalY !== null && result === 'save') {
                acc.saves = addOrIncrementLocation(acc.saves, goalX, goalY);
            }

            return acc;
        }

        const x = clampPercentage(event.data?.x);
        const y = clampPercentage(event.data?.y);

        if (x === null || y === null) {
            return acc;
        }

        if (event.type === 'shotLocation') {
            acc.shotLocations = addOrIncrementLocation(acc.shotLocations, x, y);
        }

        if (event.type === 'goalLocation') {
            acc.goalLocations = addOrIncrementLocation(acc.goalLocations, x, y);
        }

        if (event.type === 'save') {
            acc.saves = addOrIncrementLocation(acc.saves, x, y);
        }

        return acc;
    }, {
        shotLocations: [] as SaveLocation[],
        goalLocations: [] as SaveLocation[],
        saves: [] as SaveLocation[],
    });
};

export const normalizeStoredTeamStats = (value: unknown, fallbackScore = 0): StoredTeamStats => {
    const source = isRecord(value) ? value : {};
    const nestedStats = isRecord(source.stats) ? source.stats : {};
    const stats = normalizeMatchStats({ ...source, ...nestedStats });
    const history = normalizeHistory(source.history);
    const derivedLocations = deriveLocationsFromHistory(history);

    const shotLocations = normalizeLocations(source.shotLocations);
    const goalLocations = normalizeLocations(source.goalLocations);
    const saves = normalizeLocations(source.saves);
    const customStats = normalizeCustomStats(source.customStats);

    return {
        score: Math.max(
            fallbackScore,
            Math.round(toNonNegativeNumber(source.score, Math.max(fallbackScore, stats.goal))),
        ),
        goal: stats.goal,
        miss: stats.miss,
        save: stats.save,
        tech: stats.tech,
        stats,
        history,
        shotLocations: shotLocations.length > 0 ? shotLocations : derivedLocations.shotLocations,
        goalLocations: goalLocations.length > 0 ? goalLocations : derivedLocations.goalLocations,
        saves: saves.length > 0 ? saves : derivedLocations.saves,
        customStats,
    };
};

export const normalizeTeamState = (value: unknown, fallbackScore = 0): TeamState => {
    const storedStats = normalizeStoredTeamStats(value, fallbackScore);

    return {
        score: storedStats.score,
        stats: storedStats.stats,
        saves: storedStats.saves,
        goalLocations: storedStats.goalLocations,
        shotLocations: storedStats.shotLocations,
    };
};

export const buildTeamStatsPayload = (
    state: TeamState,
    history: MatchEvent[],
    customDefinitions: CustomStatDefinition[],
): StoredTeamStats => {
    const stats = normalizeMatchStats(state.stats);
    const customStats = customDefinitions
        .map((definition) => ({
            id: definition.id,
            label: definition.label.trim(),
            count: Math.max(0, Math.round(stats[definition.id] || 0)),
        }))
        .filter((definition) => definition.label);

    return {
        score: Math.max(0, Math.round(state.score)),
        goal: stats.goal,
        miss: stats.miss,
        save: stats.save,
        tech: stats.tech,
        stats,
        history: normalizeHistory(history),
        shotLocations: normalizeLocations(state.shotLocations),
        goalLocations: normalizeLocations(state.goalLocations),
        saves: normalizeLocations(state.saves),
        customStats,
    };
};

export const buildStoredMatchDocument = (params: {
    name: string;
    date: unknown;
    savedAt: unknown;
    updatedAt: unknown;
    matchTime: number;
    period: number;
    periodLabel: string;
    homeTeam: TeamReference;
    awayTeam: TeamReference;
    homeState: TeamState;
    awayState: TeamState;
    history: MatchEvent[];
    customDefinitions: CustomStatDefinition[];
}): StoredMatchDocument => {
    const history = normalizeHistory(params.history);
    const homeHistory = history.filter((event) => event.side === 'home');
    const awayHistory = history.filter((event) => event.side === 'away');

    return {
        dataVersion: MATCH_DATA_VERSION,
        name: params.name.trim(),
        status: params.period >= 4 ? 'completed' : 'saved',
        date: params.date,
        savedAt: params.savedAt,
        updatedAt: params.updatedAt,
        matchTime: Math.max(0, Math.round(params.matchTime)),
        period: Math.max(1, Math.round(params.period)),
        periodLabel: params.periodLabel || getPeriodLabel(params.period),
        history,
        historyCount: history.length,
        homeTeam: params.homeTeam.name,
        awayTeam: params.awayTeam.name,
        homeTeamId: params.homeTeam.id,
        awayTeamId: params.awayTeam.id,
        homeScore: Math.max(0, Math.round(params.homeState.score)),
        awayScore: Math.max(0, Math.round(params.awayState.score)),
        detailedStats: {
            home: buildTeamStatsPayload(params.homeState, homeHistory, params.customDefinitions),
            away: buildTeamStatsPayload(params.awayState, awayHistory, params.customDefinitions),
        },
    };
};

const parseStoredPeriod = (value: unknown, fallbackLabel?: string) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(1, Math.round(value));
    }

    const label = typeof value === 'string' && value.trim() ? value : fallbackLabel || '';

    if (label.includes('2.')) return 2;
    if (label.toUpperCase().includes('PAUSE')) return 3;
    if (label.toUpperCase().includes('SLUTT')) return 4;
    return 1;
};

const migrateLegacyMatchSource = (source: Record<string, unknown>, dataVersion: number) => {
    if (dataVersion >= MATCH_DATA_VERSION) {
        return source;
    }

    const legacyPeriodLabel = toNonEmptyString(
        source.periodLabel,
        typeof source.period === 'string'
            ? source.period
            : getPeriodLabel(parseStoredPeriod(source.period)),
    );

    return {
        ...source,
        dataVersion,
        period: parseStoredPeriod(source.period, legacyPeriodLabel),
        periodLabel: legacyPeriodLabel,
        homeTeamId: typeof source.homeTeamId === 'string' ? source.homeTeamId : null,
        awayTeamId: typeof source.awayTeamId === 'string' ? source.awayTeamId : null,
        status: source.status === 'completed'
            ? 'completed'
            : parseStoredPeriod(source.period, legacyPeriodLabel) >= 4
                ? 'completed'
                : 'saved',
    };
};

export const normalizeStoredMatchDocument = (id: string, value: unknown): NormalizedMatchDocument => {
    const source = isRecord(value) ? value : {};
    const dataVersion = Math.max(1, Math.round(toNonNegativeNumber(source.dataVersion, 1)));
    const migratedSource = migrateLegacyMatchSource(source, dataVersion);
    const detailedStats = isRecord(migratedSource.detailedStats) ? migratedSource.detailedStats : {};

    const homeTeam = toNonEmptyString(migratedSource.homeTeam, 'Hjemme');
    const awayTeam = toNonEmptyString(migratedSource.awayTeam, 'Borte');
    const homeTeamId = typeof migratedSource.homeTeamId === 'string' ? migratedSource.homeTeamId : null;
    const awayTeamId = typeof migratedSource.awayTeamId === 'string' ? migratedSource.awayTeamId : null;

    const homeScoreFallback = Math.max(0, Math.round(toNonNegativeNumber(migratedSource.homeScore, 0)));
    const awayScoreFallback = Math.max(0, Math.round(toNonNegativeNumber(migratedSource.awayScore, 0)));
    const homeStats = normalizeStoredTeamStats(detailedStats.home, homeScoreFallback);
    const awayStats = normalizeStoredTeamStats(detailedStats.away, awayScoreFallback);

    const rootHistory = normalizeHistory(migratedSource.history);
    const history = rootHistory.length > 0
        ? rootHistory
        : [...homeStats.history, ...awayStats.history].sort((left, right) => {
            if (left.matchTime !== right.matchTime) {
                return left.matchTime - right.matchTime;
            }

            return left.createdAt.localeCompare(right.createdAt);
        });

    const date = migratedSource.updatedAt ?? migratedSource.savedAt ?? migratedSource.date ?? null;
    const periodLabel = toNonEmptyString(
        migratedSource.periodLabel,
        typeof migratedSource.period === 'string'
            ? migratedSource.period
            : getPeriodLabel(parseStoredPeriod(migratedSource.period)),
    );
    const period = parseStoredPeriod(migratedSource.period, periodLabel);

    return {
        id,
        dataVersion,
        name: toNonEmptyString(migratedSource.name, `${homeTeam} vs ${awayTeam}`),
        status: migratedSource.status === 'completed' ? 'completed' : 'saved',
        date,
        sortDateMs: getTimestampMs(date),
        savedAt: migratedSource.savedAt ?? migratedSource.date ?? null,
        updatedAt: migratedSource.updatedAt ?? migratedSource.savedAt ?? migratedSource.date ?? null,
        matchTime: Math.max(
            Math.round(toNonNegativeNumber(migratedSource.matchTime, 0)),
            ...history.map((event) => event.matchTime),
            0,
        ),
        period,
        periodLabel,
        history,
        historyCount: Math.max(history.length, Math.round(toNonNegativeNumber(migratedSource.historyCount, history.length))),
        homeTeam,
        awayTeam,
        homeTeamId,
        awayTeamId,
        homeScore: homeStats.score,
        awayScore: awayStats.score,
        detailedStats: {
            home: homeStats,
            away: awayStats,
        },
    };
};

export const getTotalShots = (stats: Pick<MatchStats, 'goal' | 'miss' | 'save'>) => (
    Math.max(0, stats.goal) + Math.max(0, stats.miss) + Math.max(0, stats.save)
);

export const getShootingPercentage = (stats: Pick<MatchStats, 'goal' | 'miss' | 'save'>) => {
    const totalShots = getTotalShots(stats);
    if (totalShots === 0) return 0;
    return Math.round((Math.max(0, stats.goal) / totalShots) * 100);
};

export const getSavePercentage = (saves: number, totalShots: number) => {
    if (totalShots <= 0) return 0;
    return Math.round((Math.max(0, saves) / totalShots) * 100);
};

export const getTimestampMs = (value: unknown) => {
    if (isRecord(value) && typeof value.toMillis === 'function') {
        try {
            return value.toMillis() as number;
        } catch {
            return 0;
        }
    }

    if (isRecord(value) && typeof value.seconds === 'number') {
        return value.seconds * 1000;
    }

    if (value instanceof Date) {
        return value.getTime();
    }

    const parsed = Date.parse(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

export const formatDateLabel = (value: unknown, locale = 'nb-NO') => {
    const timestamp = getTimestampMs(value);
    if (!timestamp) return 'Ukjent dato';
    return new Date(timestamp).toLocaleDateString(locale);
};

export const formatMatchTimeLabel = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
    const remainingSeconds = (safeSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
};

export const getTeamAliases = (value: unknown) => {
    const source = isRecord(value) ? value : {};
    return [...new Set([
        ...normalizeStringArray(source.aliases),
        ...normalizeStringArray(source.previousNames),
    ])];
};
