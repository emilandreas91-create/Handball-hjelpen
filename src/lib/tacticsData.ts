import { formatDateLabel, getTimestampMs } from './matchData';

export type TacticCourtType = 'half' | 'full';
export type TacticTokenType = 'player' | 'ball';
export type TacticPathType = 'move' | 'pass';

export interface TacticToken {
    id: string;
    type: TacticTokenType;
    label: string;
    x: number;
    y: number;
}

export interface TacticPath {
    id: string;
    type: TacticPathType;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
}

export interface TacticFrame {
    id: string;
    title: string;
    durationMs: number;
    tokens: TacticToken[];
    paths: TacticPath[];
}

export interface TacticDraft {
    id?: string;
    name: string;
    teamId: string | null;
    teamName: string;
    courtType: TacticCourtType;
    frames: TacticFrame[];
    createdAt?: unknown;
    updatedAt?: unknown;
}

export interface StoredTacticDocument {
    dataVersion: number;
    name: string;
    teamId: string | null;
    teamName: string;
    courtType: TacticCourtType;
    frames: TacticFrame[];
    createdAt: unknown;
    updatedAt: unknown;
}

export interface NormalizedTacticDocument extends TacticDraft {
    id: string;
    dataVersion: number;
    createdAt: unknown;
    updatedAt: unknown;
    sortUpdatedAtMs: number;
    updatedAtLabel: string;
}

export const TACTICS_DATA_VERSION = 1;
export const MAX_TACTIC_PLAYERS = 8;
export const MIN_TACTIC_PLAYERS = 1;
export const DEFAULT_FRAME_DURATION_MS = 1400;

const BASE_PLAYER_POSITIONS = [
    { x: 18, y: 78 },
    { x: 34, y: 66 },
    { x: 50, y: 58 },
    { x: 66, y: 66 },
    { x: 82, y: 78 },
    { x: 50, y: 78 },
    { x: 28, y: 88 },
    { x: 72, y: 88 },
];

const clampCoordinate = (value: unknown, fallback: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.min(100, Math.max(0, value));
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return Math.min(100, Math.max(0, parsed));
        }
    }

    return fallback;
};

const clampDurationMs = (value: unknown, fallback: number) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.min(4000, Math.max(400, Math.round(value)));
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return Math.min(4000, Math.max(400, Math.round(parsed)));
        }
    }

    return fallback;
};

const toNonEmptyString = (value: unknown, fallback = '') => {
    if (typeof value !== 'string') {
        return fallback;
    }

    const trimmed = value.trim();
    return trimmed || fallback;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null && !Array.isArray(value)
);

const cloneToken = (token: TacticToken): TacticToken => ({ ...token });

const createEntityId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createBallToken = (): TacticToken => ({
    id: 'ball',
    type: 'ball',
    label: 'Ball',
    x: 58,
    y: 58,
});

export const createPlayerToken = (playerNumber: number, courtType: TacticCourtType): TacticToken => {
    const basePosition = BASE_PLAYER_POSITIONS[(playerNumber - 1) % BASE_PLAYER_POSITIONS.length];
    const verticalOffset = courtType === 'full' ? 8 : 0;

    return {
        id: `player_${playerNumber}`,
        type: 'player',
        label: String(playerNumber),
        x: basePosition.x,
        y: Math.min(95, basePosition.y + verticalOffset),
    };
};

export const createDefaultTokens = (courtType: TacticCourtType, playerCount = 6): TacticToken[] => [
    ...Array.from({ length: Math.min(MAX_TACTIC_PLAYERS, Math.max(MIN_TACTIC_PLAYERS, playerCount)) }, (_, index) => (
        createPlayerToken(index + 1, courtType)
    )),
    createBallToken(),
];

const normalizeToken = (value: unknown, index: number): TacticToken | null => {
    if (!isRecord(value)) {
        return null;
    }

    const type = value.type === 'ball' ? 'ball' : value.type === 'player' ? 'player' : null;
    if (!type) {
        return null;
    }

    const fallbackLabel = type === 'ball' ? 'Ball' : String(index + 1);

    return {
        id: toNonEmptyString(value.id, type === 'ball' ? 'ball' : `player_${index + 1}`),
        type,
        label: toNonEmptyString(value.label, fallbackLabel),
        x: clampCoordinate(value.x, type === 'ball' ? 58 : 50),
        y: clampCoordinate(value.y, type === 'ball' ? 58 : 70),
    };
};

const normalizePath = (value: unknown, index: number): TacticPath | null => {
    if (!isRecord(value)) {
        return null;
    }

    const type = value.type === 'pass' ? 'pass' : value.type === 'move' ? 'move' : null;
    if (!type) {
        return null;
    }

    return {
        id: toNonEmptyString(value.id, `path_${index}`),
        type,
        fromX: clampCoordinate(value.fromX, 50),
        fromY: clampCoordinate(value.fromY, 60),
        toX: clampCoordinate(value.toX, 50),
        toY: clampCoordinate(value.toY, 30),
    };
};

const normalizeTokens = (value: unknown, courtType: TacticCourtType) => {
    const fallbackTokens = createDefaultTokens(courtType);

    if (!Array.isArray(value)) {
        return fallbackTokens;
    }

    const normalizedTokens = value
        .map((token, index) => normalizeToken(token, index))
        .filter((token): token is TacticToken => token !== null);

    const players = normalizedTokens.filter((token) => token.type === 'player');
    const ball = normalizedTokens.find((token) => token.type === 'ball');

    const nextPlayers = players.length > 0
        ? players
            .slice(0, MAX_TACTIC_PLAYERS)
            .sort((left, right) => Number(left.label) - Number(right.label))
            .map((player, index) => ({
                ...player,
                id: `player_${index + 1}`,
                label: String(index + 1),
            }))
        : fallbackTokens.filter((token) => token.type === 'player');

    return [...nextPlayers, ball ? { ...ball, id: 'ball', label: 'Ball' } : createBallToken()];
};

const normalizePaths = (value: unknown) => {
    if (!Array.isArray(value)) {
        return [] as TacticPath[];
    }

    return value
        .map((path, index) => normalizePath(path, index))
        .filter((path): path is TacticPath => path !== null);
};

const normalizeFrame = (value: unknown, index: number, courtType: TacticCourtType): TacticFrame => {
    const source = isRecord(value) ? value : {};
    const duration = clampDurationMs(source.durationMs, DEFAULT_FRAME_DURATION_MS);

    return {
        id: toNonEmptyString(source.id, createEntityId('frame')),
        title: toNonEmptyString(source.title, `Steg ${index + 1}`),
        durationMs: duration,
        tokens: normalizeTokens(source.tokens, courtType),
        paths: normalizePaths(source.paths),
    };
};

export const cloneFrame = (frame: TacticFrame, index: number): TacticFrame => ({
    id: createEntityId('frame'),
    title: `Steg ${index + 1}`,
    durationMs: frame.durationMs,
    tokens: frame.tokens.map(cloneToken),
    paths: [],
});

export const createFrameFromTokens = (tokens: TacticToken[], index: number): TacticFrame => ({
    id: createEntityId('frame'),
    title: `Steg ${index + 1}`,
    durationMs: DEFAULT_FRAME_DURATION_MS,
    tokens: tokens.map(cloneToken),
    paths: [],
});

export const createEmptyTacticDraft = (params?: {
    name?: string;
    teamId?: string | null;
    teamName?: string;
    courtType?: TacticCourtType;
}): TacticDraft => {
    const courtType = params?.courtType === 'full' ? 'full' : 'half';
    const initialTokens = createDefaultTokens(courtType);

    return {
        name: params?.name?.trim() || '',
        teamId: params?.teamId ?? null,
        teamName: params?.teamName?.trim() || '',
        courtType,
        frames: [createFrameFromTokens(initialTokens, 0)],
    };
};

export const duplicateTokensAcrossFrames = (frames: TacticFrame[], token: TacticToken) => frames.map((frame) => ({
    ...frame,
    tokens: [...frame.tokens.filter((item) => item.id !== token.id), cloneToken(token)]
        .sort((left, right) => left.type === 'ball'
            ? 1
            : right.type === 'ball'
                ? -1
                : Number(left.label) - Number(right.label)),
}));

export const removeTokenAcrossFrames = (frames: TacticFrame[], tokenId: string) => frames.map((frame) => ({
    ...frame,
    tokens: frame.tokens.filter((token) => token.id !== tokenId),
    paths: frame.paths.filter((path) => path.id !== `auto_${tokenId}`),
}));

export const updateFrameTokenPosition = (
    frame: TacticFrame,
    tokenId: string,
    x: number,
    y: number,
): TacticFrame => ({
    ...frame,
    tokens: frame.tokens.map((token) => (
        token.id === tokenId
            ? { ...token, x: clampCoordinate(x, token.x), y: clampCoordinate(y, token.y) }
            : token
    )),
});

export const buildStoredTacticDocument = (draft: TacticDraft, createdAt: unknown, updatedAt: unknown): StoredTacticDocument => ({
    dataVersion: TACTICS_DATA_VERSION,
    name: draft.name.trim(),
    teamId: draft.teamId ?? null,
    teamName: draft.teamName.trim(),
    courtType: draft.courtType === 'full' ? 'full' : 'half',
    frames: (draft.frames.length > 0
        ? draft.frames
        : [createFrameFromTokens(createDefaultTokens(draft.courtType), 0)])
        .map((frame, index) => normalizeFrame(frame, index, draft.courtType)),
    createdAt,
    updatedAt,
});

export const normalizeStoredTacticDocument = (id: string, value: unknown): NormalizedTacticDocument => {
    const source = isRecord(value) ? value : {};
    const courtType = source.courtType === 'full' ? 'full' : 'half';
    const rawFrames = Array.isArray(source.frames) && source.frames.length > 0
        ? source.frames
        : [createFrameFromTokens(createDefaultTokens(courtType), 0)];
    const frames = rawFrames.map((frame, index) => normalizeFrame(frame, index, courtType));
    const createdAt = source.createdAt ?? source.updatedAt ?? null;
    const updatedAt = source.updatedAt ?? source.createdAt ?? null;

    return {
        id,
        dataVersion: typeof source.dataVersion === 'number' ? source.dataVersion : TACTICS_DATA_VERSION,
        name: toNonEmptyString(source.name, 'Uten navn'),
        teamId: typeof source.teamId === 'string' ? source.teamId : null,
        teamName: toNonEmptyString(source.teamName),
        courtType,
        frames,
        createdAt,
        updatedAt,
        sortUpdatedAtMs: getTimestampMs(updatedAt),
        updatedAtLabel: formatDateLabel(updatedAt),
    };
};

export const getPlayerTokens = (frame: TacticFrame) => (
    frame.tokens.filter((token) => token.type === 'player')
);

export const getBallToken = (frame: TacticFrame) => (
    frame.tokens.find((token) => token.type === 'ball') ?? createBallToken()
);
