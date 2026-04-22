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

### Stats.tsx

The largest and most complex file. It handles: match setup UI (team names, custom buttons), live stat registration, cloud sync status display, and saving finished matches to Firestore. The todo tracks splitting this into smaller pieces.

### useTeamMatches

Fetches **all** matches for a user and filters client-side by team ID, name, and aliases. This is a known performance issue – tracked in todo as a future Firestore query optimization.
