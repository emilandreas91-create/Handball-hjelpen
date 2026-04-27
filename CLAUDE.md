# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Type check + production build (tsc && vite build)
npm run lint       # ESLint, zero warnings allowed
npm run preview    # Preview production build locally
```

No test suite exists.

## Stack

React 18 + TypeScript + Vite + Tailwind CSS + Firebase (Auth + Firestore). Deployed to GitHub Pages at `/Handball-hjelpen/` – this is why the app uses `HashRouter` (not `BrowserRouter`).

## Environment variables

All Firebase config is injected via Vite env vars. Copy `.env.example` to `.env.local` and fill in values from the Firebase console:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

For CI/CD (GitHub Actions), these are stored as repository secrets and injected at build time.

## Deploy

Push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. `npm install` + `npm run build`
2. Uploads `./dist` as a Pages artifact
3. Deploys to GitHub Pages

Only one deployment runs at a time (`concurrency: pages`). In-progress deployments are never cancelled.

## Architecture

### Provider tree

```
HashRouter
  AuthProvider        – Google Auth via Firebase, exposes currentUser
    MatchProvider     – live match state (hooks/useMatch.ts), wraps all routes
      Layout + Routes
```

`MatchProvider` is global and persists live match state across navigation. All pages inside `RequireAuth` can consume it via `useMatchContext()`.

### Pages and routing

All protected pages are lazy-loaded. Routes:

| Path | Page | Purpose |
|---|---|---|
| `/start` | Start | Dashboard / recent activity |
| `/stats` | Stats | Live match registration (largest file) |
| `/teams` | Teams | Team list |
| `/teams/:teamId` | TeamDetails | Per-team stats and match history |
| `/tactics` | Tactics | Tactic board editor |
| `/tactics/:tacticId/present` | TacticPresentation | Fullscreen tactic presentation |

### Data persistence – dual sync pattern

Every piece of user data is persisted in two layers simultaneously:

1. **localStorage** – immediate write, scoped to `{key}:{userId}` via `lib/persistence.ts`
2. **Firestore** – debounced write (1.2–4s depending on whether match is running)

On load, local storage is read first, then Firestore resolves and wins only if its `updatedAt` timestamp is newer. This makes the app work offline.

All reads/writes to localStorage go through `readScopedLocalStorage` / `writeScopedLocalStorage` in `lib/persistence.ts`. Never use `localStorage` directly.

### Firestore structure

```
users/{userId}/
  teams/{teamId}
  matches/{matchId}
  tactics/{tacticId}
  appState/liveMatchDraft       – live match in progress
  appState/liveStatsDefaults    – last used home/away team IDs
  appState/liveStatsUiDraft     – live stats UI state (active side, custom buttons, etc.)
```

Security rules enforce `request.auth.uid == userId` – users can only access their own data.

### Normalize functions

Every type that comes from Firestore or localStorage has a corresponding `normalize*` function (e.g. `normalizeTeamState`, `normalizeStoredMatchDocument`, `normalizeLiveStatsUiDraft`). These functions are the only safe entry points for external data – they validate shape, provide defaults, and prevent runtime crashes from stale or malformed data. Always use them when reading external data.

### Core types (`lib/matchData.ts`)

Central file for all match-related types and pure functions. Key types:
- `MatchEvent` – a single recorded event with `side`, `type`, `period`, `matchTime`
- `TeamState` – current score, stats, and shot/goal/save locations
- `MatchData` – full live match snapshot
- `StoredMatchDocument` / `NormalizedMatchDocument` – saved match in Firestore

### Live match state (`hooks/useMatch.ts`)

`MatchProvider` owns all live match state. Key points:
- `appendHistory` reads `matchTimeRef` and `periodRef` (not state directly) to avoid stale closures on rapid input
- `buildCurrentDraft` snapshots current state for persistence
- The cloud sync effect depends on all state values – changes to any piece of match state trigger a debounced Firestore write

`useMatchContext()` exposes the following API:

| Field / function | Type | Description |
|---|---|---|
| `matchTime` | `number` | Elapsed seconds |
| `isRunning` | `boolean` | Whether the clock is ticking |
| `period` | `number` | Current period (1-based) |
| `periodLabel` | `string` | Human-readable period label |
| `homeState` / `awayState` | `TeamState` | Score, stats, shot/goal/save locations |
| `canUndo` | `boolean` | True if there is history to undo |
| `draftRecovered` | `boolean` | True if a draft was recovered on load |
| `draftRecoveredFrom` | `string \| null` | Source of recovered draft |
| `lastDraftSavedAt` | `number \| null` | Timestamp of last local save |
| `cloudSyncState` | `'idle' \| 'saving' \| 'saved' \| 'error'` | Current Firestore sync status |
| `lastCloudSyncAt` | `number \| null` | Timestamp of last successful cloud sync |
| `history` | `MatchEvent[]` | Full event log |
| `toggleTimer()` | `() => void` | Start/stop the clock |
| `resetTimer()` | `() => void` | Reset clock to 0 without clearing events |
| `formatTime()` | `() => string` | Format current matchTime as MM:SS |
| `nextPeriod()` | `() => void` | Advance to next period |
| `updateStat()` | `(side, type, delta) => void` | Increment/decrement a stat counter |
| `addGoalLocation()` | `(side, location) => void` | Record a goal position |
| `addShotLocation()` | `(side, location) => void` | Record a shot position |
| `addSave()` | `(side, location) => void` | Record a save position |
| `addCombinedShot()` | `(side, shotLocation, outcome, ...) => void` | Record shot + outcome in one call |
| `undoLastStat()` | `() => void` | Undo the most recent event |
| `resetMatch()` | `() => void` | Full reset – clears all state and localStorage draft |
| `loadMatch()` | `(data: MatchData) => void` | Load a saved match into live state |

### Stats.tsx

Handles match setup UI (team names, custom buttons), live stat registration, cloud sync status display, and saving finished matches to Firestore. Delegates all localStorage/Firestore sync for UI draft and defaults to `hooks/useStatsSync.ts`.

Two phases controlled by `isLivePhase` (= `isMatchStarted || hasLiveMatchContent`):
- **Setup phase** – team selection, match name, start button
- **Live phase** – scoreboard, stat buttons, shot modal, save/undo/reset controls

### useStatsSync (`hooks/useStatsSync.ts`)

Handles the dual-sync pattern for Stats.tsx UI state and team defaults. Accepts the current UI values and two callbacks (`onUiDraftLoaded`, `onDefaultsLoaded`), and manages:
- Hydration from localStorage on mount / user change
- `onSnapshot` subscriptions to two Firestore docs (`liveStatsUiDraft`, `liveStatsDefaults`)
- Debounced writes back to localStorage + Firestore when values change (700ms delay)
- Cleanup (removes docs when state is empty)

Uses the callback-ref pattern internally so snapshot effects only re-subscribe when `currentUser` changes, not on every render.

Returns: `hasResolvedRemoteUiDraft`, `hasResolvedRemoteDefaults`, sync states and timestamps for both channels.

### FeedbackBanner (`components/ui/FeedbackBanner.tsx`)

Reusable inline feedback strip. Props: `type` (`'success' | 'error' | 'info' | 'warning'`) and `message`. Used in Stats.tsx for all transient user feedback.

### useTeamMatches

Fetches **all** matches for a user and filters client-side by team ID, name, and aliases. This is a known performance issue – tracked in todo as a future Firestore query optimization.
