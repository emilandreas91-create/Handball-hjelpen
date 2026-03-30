import type { TeamSide } from './matchData';

export const LIVE_STATS_UI_KEY = 'handball-help-live-ui:v2';
export const LIVE_STATS_DEFAULTS_KEY = 'handball-help-live-defaults:v1';
export const LIVE_STATS_UI_REMOTE_DOC = 'liveStatsUiDraft';
export const LIVE_STATS_DEFAULTS_REMOTE_DOC = 'liveStatsDefaults';

export interface LiveStatsButtonDefinition {
    id: string;
    label: string;
    color: string;
}

export interface LiveStatsUiDraft {
    activeSide?: TeamSide;
    homeTeamId?: string;
    awayTeamId?: string;
    matchName?: string;
    isMatchStarted?: boolean;
    customButtons?: LiveStatsButtonDefinition[];
    updatedAt?: number;
}

export interface LiveStatsDefaults {
    homeTeamId?: string;
    awayTeamId?: string;
    updatedAt?: number;
}

export const normalizeLiveStatsUiDraft = (value: unknown): LiveStatsUiDraft | null => {
    if (typeof value !== 'object' || value === null) {
        return null;
    }

    const source = value as Record<string, unknown>;

    return {
        activeSide: source.activeSide === 'away' ? 'away' : 'home',
        homeTeamId: typeof source.homeTeamId === 'string' ? source.homeTeamId : '',
        awayTeamId: typeof source.awayTeamId === 'string' ? source.awayTeamId : '',
        matchName: typeof source.matchName === 'string' ? source.matchName : '',
        isMatchStarted: Boolean(source.isMatchStarted),
        customButtons: Array.isArray(source.customButtons)
            ? source.customButtons
                .map((button) => {
                    if (typeof button !== 'object' || button === null) {
                        return null;
                    }

                    const entry = button as Record<string, unknown>;
                    return {
                        id: typeof entry.id === 'string' ? entry.id : '',
                        label: typeof entry.label === 'string' ? entry.label : '',
                        color: typeof entry.color === 'string' ? entry.color : '',
                    };
                })
                .filter((button): button is LiveStatsButtonDefinition => Boolean(button?.id))
            : [],
        updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : undefined,
    };
};

export const normalizeLiveStatsDefaults = (value: unknown): LiveStatsDefaults | null => {
    if (typeof value !== 'object' || value === null) {
        return null;
    }

    const source = value as Record<string, unknown>;

    return {
        homeTeamId: typeof source.homeTeamId === 'string' ? source.homeTeamId : '',
        awayTeamId: typeof source.awayTeamId === 'string' ? source.awayTeamId : '',
        updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : undefined,
    };
};
